// import { GatewayManager } from "./gateway/manager";
import { LoginServer } from "./login";
import { GatewayServer } from "./gateway";
import { Client as pgClient } from 'pg';
import { createClient as createRedisClient } from 'redis';
import config from '../config/config';

(async () => {
  // const gatewayManager = GatewayManager.getInstance<GatewayManager>();
  // gatewayManager.start();

  // 连接数据库
  const db = new pgClient(config.database);
  await db.connect();
  console.log('db connected');

  // 连接 redis
  const redis = await createRedisClient(config.redis)
      .on('error', err => {
        console.error('redis error:', err);
      })
      .on('connect', () => {
        console.log('redis connected');
      })
      .connect();

  console.log('==============================================================\n');

  // 打开 login server
  const loginServer = LoginServer.getInstance<LoginServer>();
  await loginServer.start(db, redis);

  // 打开 gateway server
  const gatewayServer = GatewayServer.getInstance<GatewayServer>();
  await gatewayServer.start(db, redis);

  // 程序关闭时关闭数据库连接
  process.on('exit', async () => {
    await db.end();
    console.log('db closed');
    await redis.disconnect();
    console.log('redis closed');

    loginServer.stop();
    gatewayServer.stop();
  });
})();
