import { Button, Input } from 'com/Form';
import styles from './login.module.scss';
import { useCallback, useEffect, useState } from 'react';
import { useGameContext } from '@/GameContext';

const Login = () => {
  const [ mode, setMode ] = useState<'login' | 'register'>('login');
  const [ username, _setUsername ] = useState('');
  const [ password, setPassword ] = useState('');
  const [ confirmPassword, setConfirmPassword ] = useState('');

  const { setToken, setAccount, setGateway } = useGameContext();

  const setUsername = useCallback((value: string) => {
    // 只允许输入字母数字
    if (/^[A-Za-z0-9]*$/.test(value)) {
      _setUsername(value);
    }
  }, []);

  /* 登录 */
  const _login = useCallback(async () => {
    if (username.trim().length === 0) {
      alert('帐号无效');
      return;
    }
    if (password.length === 0) {
      alert('密码无效');
      return;
    }
    const loginUrl = `${import.meta.env.VITE_LOGIN_SERVER}/api/login`;
    const result = await fetch(loginUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        username,
        password,
      }),
    });
    if (result.status !== 200) {
      alert('登录失败');
      return;
    }
    const body = await result.json();
    if (body.status !== 'ok') {
      alert(body.message);
      return;
    }
    setToken && setToken(body.data.token);
    setAccount && setAccount({
      username: body.data.username,
    });
    setGateway && setGateway(`//${body.data.gateway.host}:${body.data.gateway.port}`);
  }, [ username, password, setToken, setAccount, setGateway ]);

  /* 创建新帐号 */
  const _register = useCallback(async () => {
    if (username.trim().length === 0) {
      alert('帐号无效');
      return;
    }
    if (password.length === 0 || password !== confirmPassword) {
      alert('密码无效或密码不一致');
      return;
    }
    const loginUrl = `${import.meta.env.VITE_LOGIN_SERVER}/api/register`;
    const result = await fetch(loginUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        username,
        password,
      }),
    });
    if (result.status !== 200) {
      alert('注册失败');
      return;
    }
    const body = await result.json();
    if (body.status !== 'ok') {
      alert(body.message);
      return;
    }
    setMode('login');
  }, [ username, password, confirmPassword ]);

  useEffect(() => {
    // 切换时清除密码
    setPassword('');
    setConfirmPassword('');
  }, [ mode ]);

  return (
    <div className={styles['login-wrapper']}>
      {/* <div className={styles.logo} /> */}
      <div className={styles.login}>
        <div className={styles.form}>
          {
            mode === 'login' ? (
              <>
                <Input label="帐号" className={styles.username} value={username} onChange={setUsername} />
                <Input label="密码" type="password" value={password} onChange={setPassword} />
                <Button type="primary" onClick={_login}>登录</Button>
                <Button onClick={() => setMode('register')}>创建新帐号</Button>
              </>
            ) : (
              <>
                <Input label="帐号" className={styles.username} value={username} onChange={setUsername} />
                <Input label="密码" type="password" value={password} onChange={setPassword} />
                <Input label="确认密码" type="password" value={confirmPassword} onChange={setConfirmPassword} />
                <Button type="primary" onClick={_register}>创建新帐号</Button>
                <Button onClick={() => setMode('login')}>返回登录</Button>
              </>
            )
          }
        </div>
      </div>
    </div>
  );
};

export default Login;
