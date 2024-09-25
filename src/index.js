import React from "react";
import ReactDOM from "react-dom/client";
import "./css/index.css";
import App from "./App";
import { SocketProvider } from "./context/SocketContext";
import { PlayerProvider } from "./context/PlayerContext";
import { RoomProvider } from "./context/RoomContext";

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(
  <SocketProvider>
    <RoomProvider>
      <PlayerProvider>
        <App />
      </PlayerProvider>
    </RoomProvider>
  </SocketProvider>
);

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
