import React from 'react';
import ReactDOM from 'react-dom/client';
import './css/index.css';
import App from './App';
import { SocketProvider } from './SocketContext';
import { PlayerProvider } from './PlayerContext';

// Import the SDK
// import { DiscordSDK } from "@discord/embedded-app-sdk";

// const DISCORD_CLIENT_ID = "1253789860364550144"

// // Instantiate the SDK
// const discordSdk = new DiscordSDK(DISCORD_CLIENT_ID);
// setupDiscordSdk().then(() => {
//   console.log("Discord SDK is ready");
// });

// async function setupDiscordSdk() {
//   await discordSdk.ready();
// }

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <SocketProvider>
    <PlayerProvider>
    <App />
    </PlayerProvider>
  </SocketProvider>,
);

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
