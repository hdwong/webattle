import { Server, Socket } from "socket.io";

const ChatHandler = (io: Server, socket: Socket, messages: Array<string>) => {
  const account = socket.data.account;

  socket.on('chat', (_msg: string) => {
    const msg = `[${account.username}]: ${_msg}`;
    messages.push(msg);
    if (messages.length > 10) {
      // 只保留最新的 10 条消息
      messages.shift();
    }
    io.emit('chat', msg);
  });
};

export default ChatHandler;
