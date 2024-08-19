// src/SocketContext.js
import React, { createContext, useContext, useEffect, useState } from 'react';
import io from 'socket.io-client';

// Create a Context for the socket
const SocketContext = createContext();

// Custom hook to use the Socket context
export const useSocket = () => {
  return useContext(SocketContext);
};

// Provider component that wraps your app and makes the socket intance available to any child component that calls useSocket()
export const SocketProvider = ({ children }) => {
  const [socket, setSocket] = useState({
    instance: null,
    room: null
  });

  useEffect(() => {
     
    // Create a socket connection to the server
    const serverURL = process.env.REACT_APP_SERVER_URL || 'http://localhost:4000';
    const newSocket = io(serverURL);

    // Update state with the new socket instance
    setSocket((prevState) => ({
      ...prevState,
      instance: newSocket,
    }));

    // Clean up the socket connection when the component unmounts
    return () => newSocket.close();
  }, []);

  const joinRoom = (newRoom) => {
    setSocket((prevState) => ({
      ...prevState, 
      room: newRoom
    }))
  }

  return (
    // Make the socket instance available to any nested component that calls useSocket(). The children prop contains the components wrapped by the provider
    <SocketContext.Provider value={{socket, joinRoom}}>
      {children}
    </SocketContext.Provider>
  );
};
