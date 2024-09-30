import Login from "com/Login";
import { GameContext } from "./GameContext";
import { useState } from "react";
import Game from "com/Game";
import { Socket } from "socket.io-client";
import { useGetState } from "ahooks";
import { TAccount } from "./typings";

const App = () => {
  const [ gateway, setGateway ] = useState<string | undefined>('ws://localhost:9001');
  const [ token, setToken ] = useState<string | undefined>('');
  const [ socket, setSocket, getSocket ] = useGetState<Socket | undefined>();
  const [ account, setAccount ] = useState<TAccount | undefined>();

  return (
    <GameContext.Provider value={{
      token,
      setToken,
      gateway,
      setGateway,
      socket,
      setSocket,
      getSocket,
      account,
      setAccount,
    }}>
      {
        ! token ? (
          // 未登录
          <Login />
        ) : (
          // 已登录
          <Game />
        )
      }
    </GameContext.Provider>
  );
};

export default App;
