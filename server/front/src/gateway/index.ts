import { Client } from 'pg';
import config from '../../config/config';
import { Singleton } from '../utils/singleton';
import { RedisClientType, RedisFunctions, RedisModules, RedisScripts } from 'redis';
import { Server } from 'socket.io';
import { TemplatedApp, App as uWsApp } from 'uWebSockets.js';

import { TAccount, TPlayerData } from '../typings';
import ChatHandler from './handlers/chat';
import { forEach } from 'lodash-es';

const playerDataSet: { [username: string]: TPlayerData } = {};
let timerSavePlayerData: NodeJS.Timeout | null = null;

class GatewayServer extends Singleton {
  protected db: Client;
  protected redis: RedisClientType<RedisModules, RedisFunctions, RedisScripts>;

  protected uWs: TemplatedApp;
  protected online = 0;
  protected messages: Array<string> = [];

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
      socket.emit('account_data', {
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

      socket.on('player-position', (data: { x: number; y: number }) => {
        const account = socket.data.account;
        playerDataSet[account.username] = { ...data, socketid: socket.id, online: true };
        // 广播 player-position 事件
        socket.broadcast.emit('player-position', {
          username: account.username,
          x: data.x,
          y: data.y,
        });
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
    // 清除定时器
    if (timerSavePlayerData) {
      clearInterval(timerSavePlayerData);
    }
    // 保存玩家数据到 redis
    await this.savePlayerData();
  }
}

export { GatewayServer };
