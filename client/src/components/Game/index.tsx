import { useGameContext } from "@/GameContext";
import { useEffect, useState } from "react";
import { io } from "socket.io-client";
import Map from "./Map"
import Chat from "./Chat";
import styles from 'css/game.module.scss';
import { EventEmitter } from "./EventEmitter";

const Game = () => {
  const { gateway, token, setToken, getSocket, socket, setSocket, setAccount } = useGameContext();

  const [ online, setOnline ] = useState(0);

  useEffect(() => {
    if (! gateway || ! token || ! setToken || ! getSocket || ! setSocket) {
      return;
    }
    if (getSocket()) {
      // 已经连接
      return;
    }

    const _socket = io(gateway, {
      auth: { token },  // 身份验证信息
    });
    _socket.on('auth_error', () => {
      alert('身份验证失败');
      setToken && setToken('');
    });
    _socket.on('account_connected', (data: any) => {
      setOnline(data.online);
    });
    _socket.on('account_disconnected', (data: any) => {
      const { username, online } = data;
      setOnline(online);
      // 移除玩家
      EventEmitter.emit('player-remove', username);
    });
    _socket.on('account-data', (data: any) => {
      setAccount && setAccount(data.account);
    });

    setSocket(_socket);

    return () => {
      const socket = getSocket();
      if (socket) {
        socket.removeAllListeners();
        socket.disconnect();
      }
    };
  }, [ gateway, token, setToken, getSocket, setSocket, setAccount ]);

  return socket ? (
    <>
      <Map />
      <Chat />
      <div className={styles.online}>Online:<b>{online}</b></div>
    </>
  ) : (
    <div>Connecting...</div>
  );
};

export default Game;
