import { Client } from 'pg';
import config from '../../config/config';
import { Singleton } from '../utils/singleton';
import { RedisClientType, RedisFunctions, RedisModules, RedisScripts } from 'redis';
import { Server } from 'socket.io';
import { TemplatedApp, App as uWsApp } from 'uWebSockets.js';

import { TAccount, TPlayerData } from '../typings';
import ChatHandler from './handlers/chat';
import { forEach } from 'lodash-es';
import AStar from '../utils/astar';
import { GameMove } from '../game';

const playerDataSet: { [username: string]: TPlayerData } = {};
let timerSavePlayerData: NodeJS.Timeout | null = null;
const MOVE_DURATION = 200;

class GatewayServer extends Singleton {
  protected db: Client;
  protected redis: RedisClientType<RedisModules, RedisFunctions, RedisScripts>;

  protected uWs: TemplatedApp;
  protected online = 0;
  protected messages: Array<string> = [];
  protected pathFinder: AStar;
  protected gameMove: GameMove;

  protected init(): void {
    // 读取地图数据, /maps/map.json
    const mapJson = require('../../maps/map.json');
    const mapLayer = mapJson.layers.find((layer: any) => layer.name === 'Path');
    const { width, height, data: mapData } = mapLayer;
    const tileset = mapJson.tilesets.find((tileset: any) => tileset.name === 'pathfinding_cost');
    const { firstgid, tiles } = tileset;
    const tileCosts: Record<number, number> = {};
    tiles.forEach((tile: any) => {
      tileCosts[tile.id] = tile.properties.find((prop: any) => prop.name === 'cost')?.value || 0;
    });
    // 把 mapData 的值都减去 firstgid, 找到对应的 tile 的 cost 设置后, 生成成 2D 数组
    const mapGrid: number[][] = [];
    for (let y = 0, i = 0; y < height; ++y) {
      const row: number[] = [];
      for (let x = 0; x < width; ++x, ++i) {
        if (mapData[i] <= 0) {
          // 默认值 0.5
          row.push(0.5);
        } else {
          const index = mapData[i] - firstgid;
          row.push(tileCosts[index] || 0.5);
        }
      }
      mapGrid.push(row);
    }
    // 生成寻路器
    this.pathFinder = new AStar(mapGrid);
    this.gameMove = GameMove.getInstance();
  }

  async start(db: Client, redis: RedisClientType<RedisModules, RedisFunctions, RedisScripts>) {
    this.db = db;
    this.redis = redis;

    const io = new Server({
      cors: {
        origin: 'http://localhost:8080',
      },
      serveClient: false,
    });
    this.uWs = uWsApp();
    io.attachApp(this.uWs);

    // 连接
    io.on('connection', async (socket) => {
      // 验证 auth.token 是否存在
      if (typeof socket.handshake.auth.token !== 'string') {
        socket.disconnect();
        return;
      }
      // 验证 token
      const accountId = await this.redis.get(`token:${socket.handshake.auth.token}`);
      if (! accountId) {
        // 不存在
        socket.emit('auth_error');
        socket.disconnect();
        return;
      }
      // 读取 account
      const result = await db.query('SELECT account, username FROM accounts WHERE account = $1', [ accountId ]);
      if (! result.rows.length) {
        // 不存在
        socket.emit('auth_error');
        socket.disconnect();
        return;
      }
      const account = result.rows[0] as TAccount;
      socket.data = {
        account,
      };
      console.log(`Connect: [${account.account}:${account.username}] connected`);

      // 获取玩家数据
      let playerData = playerDataSet[account.username];
      if (playerData) {
        playerData.online = true;
      } else {
        // 从 redis 读取玩家数据
        const playerDataStr = await redis.get(`player:${account.username}`);
        if (playerDataStr) {
          playerData = { ...JSON.parse(playerDataStr), socketid: socket.id, online: true };
          playerDataSet[account.username] = playerData;
        }
      }
      // 发送 account_connected 事件
      ++this.online;
      io.emit('account_connected', {
        online: this.online,
      });
      // 广播 player-state-sync 事件
      socket.broadcast.emit('player-state-sync', {
        username: account.username,
        x: playerData?.x,
        y: playerData?.y,
      });
      socket.emit('account-data', {
        account: {
          username: account.username,
          x: playerData?.x,
          y: playerData?.y,
        },
      });

      // 还原消息
      socket.emit('messages', this.messages);

      socket.on('disconnect', () => {
        console.log(`Disconnect: [${account.account}:${account.username}] disconnected`);
        // 发送 account_disconnected 事件
        --this.online;
        io.emit('account_disconnected', {
          username: account.username,
          online: this.online,
        });
        // 更新玩家数据
        playerDataSet[account.username] = { ...playerDataSet[account.username], online: false };
      });

      socket.on('player-move', (data: { x: number; y: number }) => {
        const account = socket.data.account;
        if (typeof playerDataSet[account.username] === 'undefined' || ! playerDataSet[account.username].online) {
          // 玩家不存在或离线
          return;
        }
        const { x: ox, y: oy } = playerDataSet[account.username];
        if (typeof ox === 'undefined' || typeof oy === 'undefined') {
          // 位置不存在, 直接使用当前位置
          playerDataSet[account.username] = { ...playerDataSet[account.username], x: data.x, y: data.y };
          return;
        }
        if (ox === data.x && oy === data.y) {
          // 位置相同
          return;
        }
        console.log(`Player move: [${account.account}:${account.username}], from (${ox},${oy}) to (${data.x},${data.y})`);
        // 调用寻路器
        const path = this.pathFinder.findPath([ox, oy], [data.x, data.y]);
        // 返回路径, just for test
        // socket.emit('player-path', path);
        // 设置玩家路径
        this.gameMove.setPath(account.username, path);
      });

      socket.on('restore-players', (cb: (data: any) => void) => {
        // 还原玩家位置
        const players: any = [];
        forEach(playerDataSet, (playerData, username) => {
          if (username === account.username || ! playerData.online) {
            // 不发送给自己, 不发送离线玩家
            return;
          }
          players.push({
            username,
            x: playerData.x,
            y: playerData.y,
          });
        });
        cb(players);
      });

      ChatHandler(io, socket, this.messages);
    });

    // 连接错误
    io.on('connect_error', err => {
      console.log(err);
    });

    io.on('error', err => {
      console.log(err);
    });

    this.uWs.listen(config.gateway.io.port, (listenSocket) => {
      if (listenSocket) {
        console.log(`Gateway ws server listening on port ${config.gateway.io.port}`);
      } else {
        console.log('Failed to listen to port', config.gateway.io.port);
      }
    });

    this.gameMove.duration = MOVE_DURATION;
    this.gameMove.addListener((username, x, y) => {
      if (x === -1 && y === -1) {
        // 移动结束
        console.log(`GameMove: [${username}] move end`);
        // 广播 player-state-sync 事件
        io.emit('player-state-sync', { username, state: 'idle' });
        return;
      }
      console.log(`GameMove: [${username}] move to (${x},${y})`);
      const playerData = playerDataSet[username];
      if (! playerData) {
        return;
      }
      // 更新玩家数据
      playerDataSet[username] = { ...playerData, x, y };
      if (playerData.online) {
        // 如果玩家在线, 广播 player-state-sync 事件
        io.emit('player-state-sync', { username, x, y });
      }
    });

    // 每 5s 保存玩家数据到 redis
    timerSavePlayerData = setInterval(() => {
      this.savePlayerData();
    }, 5000);
  }

  async savePlayerData() {
    // 保存玩家数据 (x,y) 到 redis
    forEach(playerDataSet, async (playerData, username) => {
      if (! playerData.online) {
        return;
      }
      await this.redis.set(`player:${username}`, JSON.stringify({
        x: playerData.x,
        y: playerData.y,
      }));
    });
  }

  async stop() {
    // 关闭服务器
    this.uWs.close();
    // 移除所有移动回调
    this.gameMove.removeAllListeners();
    // 清除定时器
    if (timerSavePlayerData) {
      clearInterval(timerSavePlayerData);
    }
    // 保存玩家数据到 redis
    await this.savePlayerData();
  }
}

export { GatewayServer };
