import { useGameContext } from "@/GameContext";
import { useEffect, useState } from "react";

const State = () => {
  const { socket } = useGameContext();

  const [ online, setOnline ] = useState(0);

  useEffect(() => {
    if (! socket) {
      return;
    }
    socket.on('account_connected', (_, count: number) => {
      setOnline(count);
    });
    socket.on('account_disconnected', (_, count: number) => {
      setOnline(count);
    });

    return () => {
      socket.off('account_connected');
      socket.off('account_disconnected');
    };
  }, [ socket ]);

  return (
    <>
      <div>Online: {online}</div>
    </>
  );
};

export default State;
