import { createContext, useContext } from "react";
import { Socket } from "socket.io-client";
import { TAccount } from "./typings";

export interface IGameContext {
  token?: string;
  setToken?: (token: string) => void;
  gateway?: string;
  setGateway?: (gateway: string) => void;
  socket?: Socket;
  setSocket?: (socket: Socket) => void;
  getSocket?: () => Socket | undefined;
  account?: TAccount;
  setAccount?: (account: TAccount) => void;
}

export const GameContext = createContext<IGameContext>({});

export const useGameContext = () => {
  return useContext(GameContext);
}
