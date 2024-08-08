// src/Chat.js (or create a new component like src/Game.js)
import React, { useState, useEffect } from "react";
import { useSocket } from "../context/SocketContext.js";
import { usePlayer } from "../context/PlayerContext.js";
import Board from "./Board.jsx";
import LeaderBoard from "./LeaderBoard.jsx";

const Game = () => {
  const socket = useSocket();
  const { player, setPlayer } = usePlayer();
  const [name, setName] = useState(null);
  const [gameStarted, setGameStarted] = useState(false);
  const [gameEnded, setGameEnded] = useState(false)
  const [leaderBoard, setLeaderBoard] = useState([]);

  // socket effects to each player
  useEffect(() => {
    if (socket == null) return;

    // player gets their stats beginning of game
    socket.on("startingStats", (newPlayer) => {
      setPlayer(newPlayer);
    });

    socket.on("changeName", (name) => {
      setPlayer((prevPlayer) => ({ ...prevPlayer, name: name }));
    });

    socket.on("changeHand", (cards) => {
      setPlayer((prevPlayer) => ({ ...prevPlayer, hand: cards }));
    });

    socket.on("changeRole", (role) => {
      setPlayer((prevPlayer) => ({ ...prevPlayer, role: role }));
      console.log("new role", player.role)
    });

    socket.on("leaderBoard", (board) => {
      setLeaderBoard(board);
    });
    // start game for everyone; renders the Board
    socket.on("gameStarted", () => {
      setGameStarted(true);
      setGameEnded(false)
    });

    socket.on("gameEnded", () => {
      setGameEnded(true)
      setGameStarted(false);
    });

    return () => {
      socket.off("startingStats");
      socket.off("changeName");
      socket.off("changeHand");
      socket.off("changeRole");
      socket.off("gameStarted");
      socket.off("leaderBoard");
    };
  }, [socket]);

  // function called to emit 'startGame' to server
  function startGame() {
    socket.emit("startGame");
  }

  function startNextGame() {
    socket.emit("nextGame")
  }

  return (
    <>
      <form
        style={{ marginBottom: 8 }}
        onSubmit={(e) => {
          e.preventDefault();
          socket.emit("updateName", socket.id, name);
        }}
      >
        <label htmlFor="name">Enter Name: </label>
        <input
          type="text"
          id="name"
          onChange={(e) => setName(e.target.value)}
        />
        <button style={{ marginLeft: 8 }}>Submit</button>
      </form>
      {gameStarted ? (
        <>
          <Board />
          <button onClick={() => startGame()}>Restart Game</button>
        </>
      ) : (
        <>
          <button onClick={() => startGame()}>Start Game</button>
        </>
      )}
      {gameEnded && <button onClick={() => startNextGame()}>New Game</button>}
      {leaderBoard.length > 0 && (
        <div style={gameStarted ? leaderBoardCorner : leaderBoardCenter}>
          <LeaderBoard leaderBoard={leaderBoard} gameStarted={gameStarted} />
        </div>
      )}
    </>
  );
};

export default Game;

const leaderBoardCorner = {
  position: "absolute",
  top: 50,
  right: 50,
  border: "1px solid black",
  padding: 16,
  justifyContent: "center",
  alignItems: "center"
};

const leaderBoardCenter = {
  position: "absolute",
  top: "50%",
  left: "50%",
  transform: "translate(-50%, -50%)",
  border: "1px solid black",
  padding: 16,
  backgroundColor: "white",
  width: "30%",
  height: "fit-content%",
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
  fontSize: 24
};
