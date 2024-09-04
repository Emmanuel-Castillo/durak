import React, { useState, useEffect } from "react";
import { useSocket } from "../context/SocketContext.js";
import { usePlayer } from "../context/PlayerContext.js";
import Board from "./Board.jsx";
import LeaderBoard from "./LeaderBoard.jsx";
import Room from "./Room.jsx";

const Game = () => {
  const { socket } = useSocket();
  const { player, setPlayer } = usePlayer();
  const [gameState, setGameState] = useState(null);
  const [leaderBoard, setLeaderBoard] = useState([]);

  // Called when mounted once. Intended for spectators to check server if game has started
  useEffect(() => {
    if (!socket.instance) return;

    socket.instance.emit("hasGameStarted");
  }, []);

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

    socket.instance.on("leaderBoard", (winners) => {
      setLeaderBoard(winners);
    });

    socket.instance.on("updateGameState", (state) => {
      setGameState(state);
    });

    // if spectator connects to room mid-game, set gamePlayable and gameStarted to true
    socket.instance.on("joiningMidGame", (gameData) => {
      setGameState("started");
      setLeaderBoard(gameData.winners);
    });

    socket.instance.on("joiningEndGame", (winners) => {
      setGameState("ended");
      setLeaderBoard(winners);
    });

    return () => {
      socket.instance.off("startingStats");
      socket.instance.off("changeName");
      socket.instance.off("changeHand");
      socket.instance.off("changeRole");
      socket.instance.off("updateGameStatus");
      socket.instance.off("leaderBoard");
      socket.instance.off("joiningMidGame");
      socket.instance.off("joiningEndGame");
    };
  }, [socket]);

  function joinPlayersButton() {
    if (socket.room.gameData.players.length < 4)
      return (
        <button
          className="button_margin-right"
          onClick={() => socket.instance.emit("joinPlayers")}
        >
          Join Game
        </button>
      );
    else return <p>Player list is maxed out</p>;
  }

  function joinSpectatorsButton() {
    return (
      <button
        className="button_margin-right"
        onClick={() => socket.instance.emit("joinSpectators")}
      >
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
      socket.room.gameData.players.length >= 2 &&
      socket.room.gameData.players.length <= 4 &&
      player.role === "player" && (
        <button onClick={() => socket.instance.emit("startGame")}>
          Start Game
        </button>
      )
    );
  }

  function renderGame() {
    switch (gameState) {
      case "crashed":
        return (
          <>
            {socket && socket.room && <Room />}
            <div style={{ padding: 8 }}>
              <h1 className="h1_left-justified">
                Game Crashed because a player left! Must restart game...
              </h1>
              {joinPlayersButton()}
              {joinSpectatorsButton()}
              {renderStartGameBtn()}
              {renderWaitForGameDiv()}
            </div>
          </>
        );
      case "started":
        return <Board leaderBoard={leaderBoard} />;
      case "ended":
        return (
          <div className="leaderboard">
            <LeaderBoard leaderBoard={leaderBoard} />
            <div>
              <button onClick={() => socket.instance.emit("nextGame")}>
                Next Game
              </button>
              <button className="button_margin-left" onClick={() => socket.instance.emit("newGame")}>
                New Game
              </button>
            </div>
            
          </div>
        );
      default:
        return (
          <>
            {socket && socket.room && <Room />}
            <div style={{ padding: 8 }}>
              {joinPlayersButton()}
              {joinSpectatorsButton()}
              {renderStartGameBtn()}
              {renderWaitForGameDiv()}
            </div>
          </>
        );
    }
  }

  return renderGame();
};

export default Game;
