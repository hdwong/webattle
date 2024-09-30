import { useGameContext } from "@/GameContext";
import { useEffect } from "react";
import { io } from "socket.io-client";
import Map from "./Map"
import Chat from "./Chat";

const Game = () => {
  const { gateway, token, setToken, getSocket, setSocket, setAccount } = useGameContext();

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

    setSocket(_socket);

    return () => {
      const socket = getSocket();
      if (socket) {
        socket.removeAllListeners();
        socket.disconnect();
      }
    };
  }, [ gateway, token, setToken, getSocket, setSocket, setAccount ]);

  return (
    <>
      <Map />
      <Chat />
    </>
  );
};

export default Game;
