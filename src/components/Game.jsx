// src/Chat.js (or create a new component like src/Game.js)
import React, { useState, useEffect } from "react";
import { useSocket } from "../context/SocketContext.js";
import { usePlayer } from "../context/PlayerContext.js";
import Board from "./Board.jsx";
import LeaderBoard from "./LeaderBoard.jsx";

const Game = () => {
  const {socket} = useSocket();
  const { player, setPlayer } = usePlayer();
  const [players, setPlayers] = useState([]);
  const [gamePlayable, setGamePlayable] = useState(false);
  const [gameStarted, setGameStarted] = useState(false);
  const [gameEnded, setGameEnded] = useState(false);
  const [leaderBoard, setLeaderBoard] = useState([]);

  // socket effects to each player
  useEffect(() => {
    if (!socket?.instance) return;

    // player gets their stats beginning of game
    socket.instance.on("startingStats", (newPlayer) => {
      setPlayer(newPlayer);
    });

    socket.instance.on("changeName", (name) => {
      setPlayer((prevPlayer) => ({ ...prevPlayer, name: name }));
    });

    socket.instance.on("changeHand", (cards) => {
      setPlayer((prevPlayer) => ({ ...prevPlayer, hand: cards }));
    });

    socket.instance.on("changeRole", (role) => {
      setPlayer((prevPlayer) => ({ ...prevPlayer, role: role }));
    });

    socket.instance.on("leaderBoard", (board) => {
      setLeaderBoard(board);
    });

    socket.instance.on("gameCanStart", () => {
      setGamePlayable(true);
    });

    socket.instance.on("updatePlayers", (playersNames) => {
      setPlayers(playersNames);
    });

    // start game for everyone; renders the Board
    socket.instance.on("gameStarted", () => {
      setGameStarted(true);
      setGameEnded(false);
    });

    socket.instance.on("gameEnded", () => {
      setGameEnded(true);
      setGameStarted(false);
    });

    return () => {
      socket.instance.off("startingStats");
      socket.instance.off("changeName");
      socket.instance.off("changeHand");
      socket.instance.off("changeRole");
      socket.instance.off("gameStarted");
      socket.instance.off("leaderBoard");
    };
  }, [socket]);

  // function called to emit 'startGame' to server
  function startGame() {
    socket.instance.emit("startGame");
  }

  function startNextGame() {
    socket.instance.emit("nextGame");
  }

  function joinPlayersDiv() {
    if (players.length < 4)
      return <button onClick={() => socket.instance.emit("joinPlayers")}>Join Game</button>;
    else return <p>Player list is maxed out</p>;
  }
  
  function joinSpectatorsDiv() {
    return (
      <button onClick={() => socket.instance.emit("joinSpectators")}>
        Spectate Game
      </button>
    );
  }
  
  function renderWaitForGameDiv() {
    switch (player.role) {
      case "player":
        return <p>You will be playing the game...</p>;
        case "spectator":
          return <p>You will be spectating the game...</p>;
          default:
            return (
              <p>
            Select whether to play or spectate. If game starts without a
            decision made, you will turn into a spectator.
          </p>
        );
      }
    }
    
    function renderStartGameBtn() {
      return (
        players.length >= 2 &&
        players.length <= 4 &&
        player.role === "player" && (
          <button onClick={() => startGame()}>Start Game</button>
        )
      );
    }
    
    return (
      <>
      {gamePlayable ? (
        <>
          {gameStarted ? (
            <>
              <Board />
              {/* <button onClick={() => startGame()}>Restart Game</button> */}
            </>
          ) : (
            <>
              {joinPlayersDiv()}
              {joinSpectatorsDiv()}
              {renderStartGameBtn()}
              {renderWaitForGameDiv()}
            </>
          )}
        </>
      ) : (
        <>
          {joinPlayersDiv()}
          {joinSpectatorsDiv()}
          {renderWaitForGameDiv()}
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
  alignItems: "center",
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
  fontSize: 24,
};
