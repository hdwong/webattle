class Scene2 extends Phaser.Scene {
  constructor() {
    super({ key: 'Scene2' });
  }

  create() {
    // 随机位置生成一个蓝色的正方形
    const x = Math.random() * 800;
    const y = Math.random() * 600;
    this.add.rectangle(x, y, 100, 100, 0x0000ff);

    console.log('create Scene2');

    this.cameras.main.fadeIn(1000, 0, 0, 0);

    // 2s 后跳转到 Scene1
    this.time.delayedCall(2000, () => {
      this.cameras.main.fadeOut(1000, 0, 0, 0)
          .once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
            this.scene.start('Scene1');
          });
    });
  }
}

export default Scene2;
