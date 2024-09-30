import { Events } from 'phaser';

// Used to emit events between React components and Phaser scenes
// https://newdocs.phaser.io/docs/3.85.2/Phaser.Events.EventEmitter
export const EventEmitter = new Events.EventEmitter();
