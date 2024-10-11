/**
 * 城市场景
 */

class City extends Phaser.Scene {
  protected name: string;

  constructor() {
    super({
      key: 'city',
    });
  }

  init(data: { name: string }) {
    this.name = data.name;
  }

  create() {
    // 显示 name
    this.add.text(50, 50, this.name, {
      fontSize: '32px',
      color: '#ff0',
    }).setOrigin(0, 0);

    // 添加一个蓝色的正方形在中心
    this.add.rectangle(400, 300, 100, 100, 0x0000ff);

    console.log('city start');

    this.cameras.main.fadeIn(1000, 0, 0, 0);

    // 5s 后跳转回主场景
    this.time.delayedCall(2000, () => {
      this.cameras.main.fadeOut(1000, 0, 0, 0)
          .once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
            this.scene.start('main');
          });
    });
  }

  update() {
  }
}

export default City;
