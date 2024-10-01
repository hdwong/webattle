class Preload extends Phaser.Scene {
  constructor() {
    super({ key: 'Preload' });
  }

  preload() {
    this.load.tilemapTiledJSON('map', '//localhost:9000/map.json');
    this.load.on('filecomplete-tilemapJSON-map', (_: string, __: string, data: any) => {
      // load tileset images
      data.tilesets.forEach((tileset: any) => {
        const { name, image } = tileset;
        if (name && image) {
          // load image
          this.load.image(`tile-${name}`, `/map/${image}`);
        }
      });
    }, this);

    this.load.spritesheet('sprite', '/sprites/default.png', {
      frameWidth: 32,
      frameHeight: 32,
    });
  }

  create() {
    // add sprite animations
    this.anims.create({
      key: 'move-down',
      frames: this.anims.generateFrameNumbers('sprite', { start: 0, end: 3 }),
      frameRate: 10,
      repeat: -1,
    });
    this.anims.create({
      key: 'move-right',
      frames: this.anims.generateFrameNumbers('sprite', { start: 4, end: 7 }),
      frameRate: 10,
      repeat: -1,
    });
    this.anims.create({
      key: 'move-up',
      frames: this.anims.generateFrameNumbers('sprite', { start: 8, end: 11 }),
      frameRate: 10,
      repeat: -1,
    });
    this.anims.create({
      key: 'move-left',
      frames: this.anims.generateFrameNumbers('sprite', { start: 12, end: 15 }),
      frameRate: 10,
      repeat: -1,
    });

    this.scene.start('MapScene');
  }
}

export default Preload;
