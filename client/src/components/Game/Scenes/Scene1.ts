import Scene2 from "./Scene2";

class Scene1 extends Phaser.Scene {
  constructor() {
    super({ key: 'Scene1' });
  }

  create() {
    // 随机位置生成一个红色的正方形
    const x = Math.random() * 800;
    const y = Math.random() * 600;
    this.add.rectangle(x, y, 100, 100, 0xff0000);

    console.log('create Scene1');

    this.cameras.main.fadeIn(1000, 0, 0, 0);

    // 2s 后跳转到 Scene2
    this.time.delayedCall(2000, () => {
      this.cameras.main.fadeOut(1000, 0, 0, 0)
          .once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
            this.scene.add('Scene2', Scene2, true);
          });
    });
  }

  destroy() {
    console.log('destroy Scene1');
  }
}

export default Scene1;
