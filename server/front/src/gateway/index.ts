import { Client } from 'pg';
import config from '../../config/config';
import { Singleton } from '../utils/singleton';
import { RedisClientType, RedisFunctions, RedisModules, RedisScripts } from 'redis';
import { Server } from 'socket.io';
import { TemplatedApp, App as uWsApp } from 'uWebSockets.js';

import { TAccount } from '../typings';
import ChatHandler from './handlers/chat';

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

      // 发送 account_connected 事件
      ++this.online;
      io.emit('account_connected', account.username, this.online);

      // 还原消息
      socket.emit('messages', this.messages);

      socket.on('disconnect', () => {
        console.log(`Disconnect: [${account.account}:${account.username}] disconnected`);
        // 发送 account_disconnected 事件
        --this.online;
        io.emit('account_disconnected', account.username, this.online);
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
  }

  async stop() {
    // 关闭服务器
    this.uWs.close();
  }
}

export { GatewayServer };
