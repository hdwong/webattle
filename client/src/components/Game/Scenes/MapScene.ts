import { TAccount } from "@/typings";
import { EventEmitter } from "../EventEmitter";

class MapScene extends Phaser.Scene {
  protected collisionLayer: Phaser.Tilemaps.TilemapLayer | null = null;
  protected camera: Phaser.Cameras.Scene2D.Camera | undefined;
  protected cursors: Phaser.Types.Input.Keyboard.CursorKeys | undefined;
  protected player: Phaser.Physics.Arcade.Sprite | null = null;
  protected playerName: Phaser.GameObjects.Text | null = null;
  protected timerRefollow: number | null = null;
  protected account: TAccount | undefined;
  protected moving = false;
  protected targetPosition: { x: number, y: number } | null = null;
  protected timerMoving: Phaser.Time.TimerEvent | null = null;

  constructor() {
    super({ key: 'MapScene' });
  }

  create() {
    const map = this.make.tilemap({ key: 'map' });
    map.tilesets.forEach(tileset => {
      const { name } = tileset;
      if (name) {
        map.addTilesetImage(name, name);
      }
    });
    this.physics.world.setBounds(0, 0, map.widthInPixels, map.heightInPixels);
    // layers
    const json = this.cache.tilemap.get('map');
    json.data.layers.forEach((layer: any) => {
      if (layer.type === 'objectgroup') {
        // 对象层
        if (layer.name === 'Player') {
          // 玩家层
          const startPoints = layer.objects.filter((v: any) => v.name === 'StartPoint');
          if (startPoints.length > 0) {
            // 获取随机开始点
            const StartPoint = startPoints[Math.floor(Math.random() * startPoints.length)];
            // 创建玩家精灵
            this.player = this.physics.add.sprite(StartPoint.x, StartPoint.y, 'sprite', 0)
                .setOrigin(0, 0)
                .setCollideWorldBounds(true);
          }
        }
        return;
      } else if (layer.type !== 'tilelayer') {
        // 非 tilelayer
        return;
      }
      if (layer.name === 'Path') {
        // 路径层, 添加碰撞
        this.collisionLayer = map.createLayer(layer.name, map.tilesets.map(ts => ts.name));
        if (this.collisionLayer) {
          // 设置碰撞属性 cost 为 -1 表示不可通过
          this.collisionLayer.setCollisionByProperty({ cost: -1 }).setAlpha(0);
          if (this.game.config.physics.arcade?.debug) {
            // 设置碰撞调试信息，确保看到 tile 的碰撞框
            this.collisionLayer.renderDebug(this.add.graphics(), {
              tileColor: null,
              collidingTileColor: new Phaser.Display.Color(255, 0, 0, 100),
              faceColor: new Phaser.Display.Color(255, 127, 0, 255)
            });
          }
        }
        return;
      }
      if (! layer.visible) {
        return;
      }
      let { x, y } = layer;
      if (layer.name === 'Fringe' || layer.name === 'Over') {
        y -= 64;
      }
      map.createLayer(layer.name, map.tilesets.map(ts => ts.name), x, y);
    });
    // 绑定碰撞
    this.physics.add.collider(this.player!, this.collisionLayer!, this.collideCallback, undefined, this);

    // 增加鼠标拖拽移动浏览地图事件
    this.camera = this.cameras.main;
    this.camera.setBounds(0, 0, map.widthInPixels, map.heightInPixels)
        .startFollow(this.player!, true);

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
          duration: 300,
          onComplete: () => {
            this.camera!.startFollow(this.player!, true);
          },
        });
      }, 3000);
    });
    // 侦听 account 事件
    EventEmitter.on('account', (account: TAccount) => {
      this.account = account;
      // 在玩家头顶显示用户名
      if (this.player) {
        this.playerName = this.add.text(this.player!.x + 16, this.player!.y - 16, this.account.username, {
              fontSize: 14,
              color: '#fff',
              padding: {
                x: 4,
                y: 2,
              },
            })
            .setShadow(0, 0, '#000', 3, false, true)
            .setOrigin(0.5, 0)
            .setName('username');
      }
    }, this);

    this.cursors = this.input.keyboard?.createCursorKeys();

    // 游戏准备好, 发送 game-ready
    EventEmitter.emit('game-ready');
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
        this.player?.setFrame(0);
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

  move(direction: string) {
    if (! this.player) {
      return;
    }
    const distance = 32;
    const duration = 100;
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

    // velocity
    if (deltaX) {
      this.player.setVelocityX(deltaX * 1000 / duration);
    } else if (deltaY) {
      this.player.setVelocityY(deltaY * 1000 / duration);
    }

    // stop moving after duration
    this.timerMoving = this.time.delayedCall(duration, () => {
      if (this.targetPosition) {
        this.stopMoving(this.targetPosition.x, this.targetPosition.y);
        this.targetPosition = null;
      }
    });
  }

  collideCallback(player: any) {
    if (this.timerMoving) {
      this.timerMoving.destroy();
      this.timerMoving = null;
    }
    this.stopMoving(player.x, player.y);
  }

  stopMoving(x: number, y: number) {
    this.moving = false;
    this.player!.setVelocity(0);
    // set position
    this.player!.x = x;
    this.player!.y = y;
  }
}

export default MapScene;
