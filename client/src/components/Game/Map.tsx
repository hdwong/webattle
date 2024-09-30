import styles from 'css/map.module.scss';
import { AUTO, Game, Scale, Types } from 'phaser';
import { useLayoutEffect, useRef } from 'react';
import MapScene from './Scenes/MapScene';
import { useGameContext } from '@/GameContext';
import Preload from './Scenes/Preload';
import { EventEmitter } from './EventEmitter';

const config: Types.Core.GameConfig = {
  type: AUTO,
  backgroundColor: '#fff',
  pixelArt: true,
  roundPixels: true,
  physics: {
    default: 'arcade',
    arcade: {
      debug: true,
    },
  },
  scale: {
    mode: Scale.RESIZE,
    autoCenter: Scale.CENTER_BOTH,
    width: '100%',
    height: '100%',
  },
  scene: [
    Preload,
    MapScene,
  ],
};

const Map = () => {
  const refGame = useRef<Game | null>(null);
  const refMap = useRef<HTMLDivElement>(null);

  const { account } = useGameContext();

  useLayoutEffect(() => {
    if (! refMap.current) {
      return;
    }
    const rect = refMap.current.getBoundingClientRect();
    refGame.current = new Game({
      ...config,
      width: rect.width,
      height: rect.height,
      parent: refMap.current,
    });

    // 侦听 game ready 事件
    EventEmitter.on('game-ready', () => {
      // 发送用户信息
      EventEmitter.emit('account', account);
    }, this);

    return () => {
      if (refGame.current) {
        refGame.current.destroy(true);
        EventEmitter.removeAllListeners();
      }
    };
  }, [ refMap, account ]);

  return (
    <div ref={refMap} className={styles.map} />
  );
};

export default Map;
