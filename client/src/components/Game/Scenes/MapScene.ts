import { TAccount } from "@/typings";
import { EventEmitter } from "../EventEmitter";
import { forEach } from "lodash-es";

const MOVE_DURATION = 100;

class MapScene extends Phaser.Scene {
  protected collisionLayer: Phaser.Tilemaps.TilemapLayer | null = null;
  protected camera: Phaser.Cameras.Scene2D.Camera | undefined;
  protected cursors: Phaser.Types.Input.Keyboard.CursorKeys | undefined;
  protected player: Phaser.GameObjects.Sprite | null = null;
  protected playerName: Phaser.GameObjects.Text | null = null;
  protected timerRefollow: number | null = null;
  protected account: TAccount | undefined;
  protected moving = false;
  protected targetPosition: { x: number, y: number } | null = null;
  protected timerMoving: Phaser.Time.TimerEvent | null = null;
  protected otherPlayers: { [username: string]: Phaser.GameObjects.Sprite } = {};
  protected otherPlayerNames: { [username: string]: Phaser.GameObjects.Text } = {};
  protected timerAnims: { [username: string]: number | null } = {};

  constructor() {
    super({ key: 'MapScene' });
  }

  create() {
    // 增加鼠标拖拽移动浏览地图事件
    this.camera = this.cameras.main;
    this.input.on('pointerdown', (_: Phaser.Input.Pointer) => {
      // 停止镜头跟随玩家
      this.camera?.stopFollow();
      // 清除定时器
      if (this.timerRefollow) {
        clearTimeout(this.timerRefollow);
        this.timerRefollow = null;
      }
      this.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
        this.camera!.scrollX += pointer.prevPosition.x - pointer.position.x;
        this.camera!.scrollY += pointer.prevPosition.y - pointer.position.y;
      }, this);
    }, this);
    // 添加 window 全局鼠标释放事件
    window.addEventListener('mouseup', () => {
      this.input.off('pointermove');
      // 定时 3s 后恢复跟随玩家, 并添加动画平移
      this.timerRefollow = setTimeout(() => {
        this.tweens.add({
          targets: this.camera!,
          scrollX: this.player!.x - this.camera!.width / 2,
          scrollY: this.player!.y - this.camera!.height / 2,
          duration: 500,
          onComplete: () => {
            this.camera!.startFollow(this.player!, true);
          },
        });
      }, 3000);
    });
    // 侦听 account 事件
    EventEmitter.on('account', (account: TAccount) => {
      this.account = account;
      this.renderMap(account);
    }, this);

    this.cursors = this.input.keyboard?.createCursorKeys();

    // 游戏准备好, 发送 game-ready
    EventEmitter.emit('game-ready');

    // 侦听 player-position 事件
    EventEmitter.on('player-update', ({ username, x, y }: { username: string; x: number; y: number }) => {
      // 更新玩家位置
      if (this.otherPlayers[username]) {
        const target = this.otherPlayers[username];
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
              target.anims.stop();
              // target.setFrame(0);
            }, 200);
          },
        });
        target.play(`move-${direction}`, true);
      } else {
        this.otherPlayers[username] = this.add.sprite(x, y, 'sprite', 0)
            .setOrigin(0, 0)
            .setDepth(0);
      }
      // 更新玩家名位置
      if (this.otherPlayerNames[username]) {
        this.tweens.add({
          targets: this.otherPlayerNames[username],
          x: x + 16,
          y: y - 16,
          duration: MOVE_DURATION,
        });
      } else {
        this.otherPlayerNames[username] = this.add.text(x + 16, y - 16, username, {
              fontSize: 12,
              color: '#fff',
              padding: {
                x: 4,
                y: 2,
              },
            })
            .setShadow(0, 0, '#000', 3, false, true)
            .setOrigin(0.5, 0)
            .setDepth(200);
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
  }

  update() {
    // 移动
    if (! this.moving && this.cursors) {
      if (this.cursors.left.isDown) {
        this.move('left');
      } else if (this.cursors.right.isDown) {
        this.move('right');
      } else if (this.cursors.up.isDown) {
        this.move('up');
      } else if (this.cursors.down.isDown) {
        this.move('down');
      } else {
        this.player?.anims.stop();
        // this.player?.setFrame(0);
      }
    }
    // 更新玩家名位置
    if (this.playerName) {
      this.playerName.x = this.player!.x + 16;
      this.playerName.y = this.player!.y - 16;
    }
  }

  destroy() {
    if (this.timerRefollow) {
      clearTimeout(this.timerRefollow);
      this.timerRefollow = null;
    }
    if (this.timerMoving) {
      this.timerMoving.destroy();
      this.timerMoving = null;
    }
  }

  renderMap(account: TAccount) {
    const map = this.make.tilemap({ key: 'map' });
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
          // 发送玩家位置
          EventEmitter.emit('player-position', {
            // 计算出玩家格子坐标
            x: StartPoint.x,
            y: StartPoint.y,
          });
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
      if (layer.name === 'Fringe' || layer.name === 'Over') {
        y -= 64;
      }
      map.createLayer(layer.name, map.tilesets.map(ts => ts.name), x, y)
          ?.setDepth(depth + index);
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
        .setShadow(0, 0, '#000', 3, false, true)
        .setOrigin(0.5, 0)
        .setDepth(201);
    // 设置镜头跟随
    this.camera!.setBounds(0, 0, map.widthInPixels, map.heightInPixels)
        .startFollow(this.player!, true);
  }

  move(direction: string) {
    if (! this.player) {
      return;
    }
    if (this.timerRefollow) {
      clearTimeout(this.timerRefollow);
      this.timerRefollow = null;
      this.camera!.startFollow(this.player, true);
    }
    const distance = 32;
    let deltaX = 0, deltaY = 0;
    if (direction === 'left') {
      deltaX = -distance;
    } else if (direction === 'right') {
      deltaX = distance;
    } else if (direction === 'up') {
      deltaY = -distance;
    } else if (direction === 'down') {
      deltaY = distance;
    }
    this.targetPosition = {
      x: this.player.x + deltaX,
      y: this.player.y + deltaY,
    };
    this.moving = true;
    this.player.play(`move-${direction}`, true);

    this.tweens.add({
      targets: this.player,
      x: this.targetPosition.x,
      y: this.targetPosition.y,
      duration: MOVE_DURATION,
      onComplete: () => {
        this.stopMoving(this.targetPosition!.x, this.targetPosition!.y);
      },
    });
  }

  stopMoving(x: number, y: number) {
    this.moving = false;
    // set position
    this.player!.x = x;
    this.player!.y = y;
    // 触发 player-position 事件
    EventEmitter.emit('player-position', { x, y });
  }
}

export default MapScene;
