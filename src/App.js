// src/App.js
import React, { useEffect, useState } from "react";
import Game from "./components/Game";
import "./css/App.css";
import Commenter from "./components/Commenter";
import { useSocket } from "./context/SocketContext";

const App = () => {
  const socket = useSocket();
  const [name, setName] = useState();

  return (
    <div className="app">
      <div style={{ display: "flex", height: 225 }}>
        <div style={{ width: "100%" }}>
          <h1
            style={{
              fontSize: 70,
              textAlign: "center",
              textDecoration: "underline",
            }}
          >
            Durak
          </h1>
          <form
            style={{ display: "flex", justifyContent: "center" }}
            onSubmit={(e) => {
              e.preventDefault();
              socket.emit("updateName", socket.id, name);
              setName("");
            }}
          >
            <label style={{ marginRight: 4 }} htmlFor="name">
              Enter Name:{" "}
            </label>
            <input
              type="text"
              value={name}
              maxLength="10"
              onChange={(e) => setName(e.target.value)}
            />
            <button style={{ marginLeft: 8 }}>Submit</button>
          </form>
        </div>
        <Commenter />
      </div>
      <hr />
      <Game />
    </div>
  );
};

export default App;
