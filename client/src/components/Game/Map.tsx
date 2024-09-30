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

  const { account, socket } = useGameContext();

  useLayoutEffect(() => {
    if (! refMap.current || ! socket) {
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
      // 请求还原玩家位置
      socket.emit('restore-players', (data: any) => {
        data.forEach((player: any) => {
          EventEmitter.emit('player-update', {
            username: player.username,
            x: player.x << 5,
            y: player.y << 5,
          });
        });
      });
    }, this);
    // 侦听 player-position 事件
    EventEmitter.on('player-position', ({ x, y }: { x: number; y: number }) => {
      // 更新玩家位置
      socket.emit('player-position', { x: x >> 5, y: y >> 5 }); // 32px -> 1
    }, this);
    socket.on('player-position', ({ username, x, y }: { username: string; x: number; y: number }) => {
      // 更新玩家位置
      EventEmitter.emit('player-update', { username, x: x << 5, y: y << 5 }); // 1 -> 32px
    });

    return () => {
      if (refGame.current) {
        refGame.current.destroy(true);
        EventEmitter.removeAllListeners();
      }
    };
  }, [ refMap, account, socket ]);

  return (
    <div ref={refMap} className={styles.map} />
  );
};

export default Map;
