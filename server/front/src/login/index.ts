import express from 'express';
import cors from 'cors';
import { Singleton } from '../utils/singleton';
import { Client } from 'pg';
import crypto from 'crypto';
import { RedisClientType, RedisFunctions, RedisModules, RedisScripts } from 'redis';
import { TAccount } from '../typings';
import config from '../../config/config';
import path from 'node:path';

class LoginServer extends Singleton {
  protected port: number;

  protected hashPassword(password: string) {
    const md5 = crypto.createHash('md5');
    return md5.update(password).digest('hex');
  }

  async start(db: Client, redis: RedisClientType<RedisModules, RedisFunctions, RedisScripts>) {
    const app = express();
    app.use(cors());
    app.use(express.json());

    app.post('/api/register', async (req, res) => {
      // MD5 加密密码
      const password = this.hashPassword(req.body.password);
      try {
        const result = await db.query('INSERT INTO accounts (username, password) VALUES ($1, $2)', [
          req.body.username.trim(),
          password
        ]);
        // 获取注册结果
        res.send({
          status: 'ok',
          data: {
            username: req.body.username,
          },
        });
      } catch (err) {
        return res.send({
          status: 'error',
          message: '注册失败, 帐号已存在',
        });
      }
    });

    app.post('/api/login', async (req, res) => {
      try {
        const result = await db.query('SELECT * FROM accounts WHERE username = $1 AND password = $2', [
          req.body.username.trim(),
          this.hashPassword(req.body.password),
        ]);
        if (result.rowCount === 0) {
          throw new Error('用户名或密码错误');
        }
        // 登录成功
        const account = result.rows[0] as TAccount;
        // 生成 token
        const token = crypto.randomBytes(16).toString('hex');
        // 保存 token 到 redis
        await redis.setEx(`token:${token}`, 7200, account.account.toString());

        res.send({
          status: 'ok',
          data: {
            username: req.body.username,
            token,
            gateway: {
              host: config.gateway.io.host,
              port: config.gateway.io.port,
            },
          },
        });
      } catch (err) {
        console.log(err);
        return res.send({
          status: 'error',
          message: '登录失败, 用户名或密码错误',
        });
      }
    });

    // 代理 /maps/map.json
    app.get('/map.json', (_, res) => {
      res.sendFile('map.json', { root: path.join(__dirname, '../../maps') });
    });

    app.use((_, res) => {
      // 返回 404
      res.status(404).send('Not Found');
    });

    const port = config.login.api.port;
    app.listen(port, () => {
      console.log(`Login server listening on port ${port}`);
    });
  }

  async stop() {
    // 关闭服务器
  }
};

export { LoginServer };
