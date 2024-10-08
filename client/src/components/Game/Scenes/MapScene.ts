import { TAccount } from "@/typings";
import { EventEmitter } from "../EventEmitter";
import { forEach } from "lodash-es";

const MOVE_DURATION = 100;

class MapScene extends Phaser.Scene {
  protected map: Phaser.Tilemaps.Tilemap | null = null;
  protected cursors: Phaser.Types.Input.Keyboard.CursorKeys | undefined;
  protected player: Phaser.GameObjects.Sprite | null = null;
  protected playerName: Phaser.GameObjects.Text | null = null;
  protected timerRefollow: number | null = null;
  protected account: TAccount | undefined;
  protected moving = false;
  protected targetPosition: { x: number, y: number } | null = null;
  protected otherPlayers: { [username: string]: Phaser.GameObjects.Sprite } = {};
  protected otherPlayerNames: { [username: string]: Phaser.GameObjects.Text } = {};
  protected timerAnims: { [username: string]: number | null } = {};
  protected currentCursorPosition: Phaser.Math.Vector2 = new Phaser.Math.Vector2();
  protected moveCursor: Phaser.GameObjects.Rectangle;
  protected timerMoveCursor: Phaser.Tweens.Tween | null = null;
  protected pathGraphics: Phaser.GameObjects.Graphics | null = null;

  constructor() {
    super({ key: 'MapScene' });
  }

  create() {
    // 侦听 account 事件
    EventEmitter.on('account', (account: TAccount) => {
      this.account = account;
      this.renderMap(account);
    }, this);

    this.cursors = this.input.keyboard?.createCursorKeys();

    // 增加 moveCursor
    this.moveCursor = this.add.rectangle(0, 0, 32, 32, undefined, 0.5)
        .setDepth(200)
        .setOrigin(0, 0)
        .setVisible(false);

    // 增加鼠标移动事件, 以在 tilemap 上显示一个闪烁的光标
    this.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
      if (! this.map) {
        return;
      }
      const worldPoint = pointer.positionToCamera(this.cameras.main) as Phaser.Math.Vector2;
      const tileXY = this.map.worldToTileXY(worldPoint.x, worldPoint.y, true);
      if (! tileXY) {
        return;
      }
      if (this.currentCursorPosition.x === tileXY.x && this.currentCursorPosition.y === tileXY.y) {
        return;
      }
      this.currentCursorPosition = tileXY;
      const x = tileXY.x << 5;
      const y = tileXY.y << 5;
      // 显示光标
      this.moveCursor?.setPosition(x, y).setVisible(true);
      // 如果 tile 的 properties.cost = -1, 则不可移动, 显示红色
      const tile = this.map.getTileAt(tileXY.x, tileXY.y, true, 'Path');
      // 取消闪烁
      if (this.timerMoveCursor) {
        this.timerMoveCursor.destroy();
        this.timerMoveCursor = null;
      }
      // 不可移动显示红色
      if (tile?.properties.cost === -1) {
        this.moveCursor?.setFillStyle(0xff0000, 0.5);
        return;
      } else {
        this.moveCursor?.setFillStyle(0xffff00, 0.5);
      }
      // 闪烁显示
      this.moveCursor.setAlpha(1);
      this.timerMoveCursor = this.tweens.add({
        targets: this.moveCursor,
        alpha: 0.4,
        duration: 800,
        yoyo: true,
        repeat: -1,
      });
    });
    // 点击移动
    this.input.on('pointerdown', () => {
      // 发送移动请求
      EventEmitter.emit('player-move', {
        x: this.currentCursorPosition.x,
        y: this.currentCursorPosition.y,
      });
    });
    // 游戏准备好, 发送 game-ready
    EventEmitter.emit('game-ready');

    // 玩家状态同步
    EventEmitter.on('player-state-sync', ({ username, x, y }: { username: string; x: number; y: number }) => {
      // 更新玩家位置
      const isPlayer = this.account?.username === username;
      let target = isPlayer ? this.player! : this.otherPlayers[username];
      let targetName = isPlayer ? this.playerName! : this.otherPlayerNames[username];
      if (target) {
        // 计算方向
        let direction = '';
        if (target.x > x) {
          direction = 'left';
        } else if (target.x < x) {
          direction = 'right';
        } else if (target.y > y) {
          direction = 'up';
        } else if (target.y < y) {
          direction = 'down';
        }
        // 停止动画
        this.tweens.add({
          targets: target,
          x,
          y,
          duration: MOVE_DURATION,
          onComplete: () => {
            if (this.timerAnims[username]) {
              clearTimeout(this.timerAnims[username]);
            }
            this.timerAnims[username] = setTimeout(() => {
              target.anims?.stop(); // 停止动画
              target.setFrame(0);   // 回到正面
            }, 200);
          },
        });
        target.play(`move-${direction || 'down'}`, true);
        // 更新玩家名位置
        this.tweens.add({
          targets: targetName,
          x: x + 16,
          y: y - 16,
          duration: MOVE_DURATION,
        });
      } else if (! isPlayer) {
        // 创建 otherPlayer 玩家精灵
        target = this.add.sprite(x, y, 'sprite', 0)
            .setOrigin(0, 0)
            .setDepth(0);
        this.otherPlayers[username] = target;
        targetName = this.add.text(x + 16, y - 16, username, {
              fontSize: 12,
              color: '#fff',
              padding: {
                x: 4,
                y: 2,
              },
            })
            .setStroke('#000', 3)
            .setOrigin(0.5, 0)
            .setDepth(200);
        this.otherPlayerNames[username] = targetName;
      }
    }, this);

    // 侦听 player-remove 事件
    EventEmitter.on('player-remove', (username: string) => {
      if (this.otherPlayers[username]) {
        this.otherPlayers[username].destroy();
        delete this.otherPlayers[username];
      }
      if (this.otherPlayerNames[username]) {
        this.otherPlayerNames[username].destroy();
        delete this.otherPlayerNames[username];
      }
    }, this);

    // 侦听 player-path 事件
    EventEmitter.on('player-path', (path: Array<[ number, number ]>) => {
      // 显示路径
      if (this.pathGraphics) {
        this.pathGraphics.destroy();
      }
      const graphics = this.add.graphics()
          .setDepth(100);
      this.pathGraphics = graphics;
      graphics.lineStyle(2, 0x00ff00, 1);
      for (let i = 0; i < path.length; ++i) {
        const [ x, y ] = path[i];
        const world = this.map?.tileToWorldXY(x, y);
        if (world) {
          graphics.strokeRect(world.x, world.y, 32, 32);
        }
      }
    }, this);
  }

  update() {
  }

  destroy() {
    if (this.timerRefollow) {
      clearTimeout(this.timerRefollow);
      this.timerRefollow = null;
    }
    if (this.timerMoveCursor) {
      this.timerMoveCursor.destroy();
      this.timerMoveCursor = null;
    }
  }

  renderMap(account: TAccount) {
    const map = this.make.tilemap({ key: 'map' });
    this.map = map;
    map.tilesets.forEach(tileset => {
      const { name } = tileset;
      if (name) {
        map.addTilesetImage(name, `tile-${name}`);
      }
    });
    // layers
    let depth = -100;
    const json = this.cache.tilemap.get('map');
    forEach(json.data.layers, (layer: any, index: number) => {
      if (layer.type === 'objectgroup') {
        // 对象层
        if (layer.name === 'Player') {
          // 玩家层
          let StartPoint = { x: 0, y: 0 };
          if (typeof account.x !== 'number' || typeof account.y !== 'number') {
            // 未设置玩家位置
            const startPoints = layer.objects.filter((v: any) => v.name === 'StartPoint');
            if (startPoints.length > 0) {
              // 获取随机开始点
              StartPoint = startPoints[Math.floor(Math.random() * startPoints.length)];
            }
          } else {
            // 已设置玩家位置
            StartPoint = { x: account.x << 5, y: account.y << 5 };
          }
          // 创建玩家精灵
          this.player = this.add.sprite(StartPoint.x, StartPoint.y, 'sprite', 0)
              .setOrigin(0, 0)
              .setDepth(1);
          depth = 100;
        }
        return;
      } else if (layer.type !== 'tilelayer') {
        // 非 tilelayer
        return;
      }
      if (! layer.visible) {
        return;
      }
      let { x, y } = layer;
      let opacity = 1;
      if (layer.name === 'Fringe' || layer.name === 'Over') {
        y -= 64;
      } else if (layer.name === 'Path') {
        opacity = 0.25;
      }

      map.createLayer(layer.name, map.tilesets.map(ts => ts.name), x, y)
          ?.setDepth(depth + index)
          ?.setAlpha(opacity);
    });
    // 在玩家头顶显示用户名
    this.playerName = this.add.text(this.player!.x + 16, this.player!.y - 16, account.username, {
          fontSize: 12,
          color: '#ff0',
          padding: {
            x: 4,
            y: 2,
          },
        })
        .setStroke('#000', 3)
        .setOrigin(0.5, 0)
        .setDepth(201);
    // 设置镜头跟随
    this.cameras.main.setBounds(0, 0, map.widthInPixels, map.heightInPixels)
        .startFollow(this.player!, true);
  }
}

export default MapScene;
