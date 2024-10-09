import { useGameContext } from "@/GameContext";
import { useCallback, useEffect, useRef, useState } from "react";
import styles from 'css/game.module.scss';

const Chat = () => {
  const { socket } = useGameContext();

  const [ messages, setMessages ] = useState<Array<string>>([]);

  const refMessages = useRef<HTMLDivElement>(null);
  const refInput = useRef<HTMLInputElement>(null);

  const sendMessage = useCallback((_msg: string | undefined) => {
    const msg = _msg?.trim();
    if (! socket || typeof msg !== 'string' || msg === '') {
      return;
    }
    socket.emit('chat', msg);
  }, [ socket ]);

  const scrollBottom = useCallback(() => {
    setTimeout(() => {
      refMessages.current?.scrollTo(0, refMessages.current.scrollHeight);
    }, 100);
  }, [ refMessages ]);

  useEffect(() => {
    scrollBottom();
  }, [ messages, scrollBottom ]);

  useEffect(() => {
    if (! socket) {
      return;
    }
    socket.on('chat', (msg: string) => {
      setMessages(messages => [ ...messages, msg ]);
    });
    socket.on('messages', (messages: Array<string>) => {
      setMessages(messages);
    });

    return () => {
      socket.off('chat');
      socket.off('messages');
    };
  }, [ socket ]);

  return (
    <div className={styles.chat}>
      <div ref={refMessages} className={styles.messages}>
        {messages.map((message, index) => (
          <div key={index}>{message}</div>
        ))}
      </div>
      <div className={styles.form}>
        <input ref={refInput} type="text"
            onKeyDown={e => {
              if (e.key === 'Enter') {
                sendMessage(refInput.current?.value);
                // 清空输入框
                refInput.current!.value = '';
              }
            }} />
        <button onClick={() => {
          sendMessage(refInput.current?.value);
          // 清空输入框
          refInput.current!.value = '';
        }}>发送</button>
      </div>
    </div>
  );
};

export default Chat;
