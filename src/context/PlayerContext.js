import React, { createContext, useContext, useState } from 'react';

const PlayerContext = createContext();

export const usePlayer = () => useContext(PlayerContext);

export const PlayerProvider = ({ children }) => {
  const [player, setPlayer] = useState({
    id: null,
    name: null,
    hand: null,
    role: null,
    // other player-specific state
  });

  return (
    <PlayerContext.Provider value={{ player, setPlayer }}>
      {children}
    </PlayerContext.Provider>
  );
};
