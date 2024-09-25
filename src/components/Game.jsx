import React, { useState, useEffect } from "react";
import { useSocket } from "../context/SocketContext.js";
import { usePlayer } from "../context/PlayerContext.js";
import { useRoom } from "../context/RoomContext";
import Board from "./Board.jsx";
import LeaderBoard from "./LeaderBoard.jsx";
import Room from "./Room.jsx";

const Game = () => {
  const { socket } = useSocket();
  const { player, setPlayer } = usePlayer();
  const { room, setRoom } = useRoom();

  // socket effects to each player
  useEffect(() => {
    if (!socket?.instance) return;

    socket.instance.on("setPlayer", (player) => {
      setPlayer(player)
    })

    // player gets their stats beginning of game
    socket.instance.on("startingStats", (newPlayer) => {
      setPlayer(newPlayer);
    });

    socket.instance.on("updateRoomUsers", (newUsers) => {
      setRoom((prevRoom) => ({
        ...prevRoom,
        users: newUsers
      }))
    } )

    socket.instance.on("updateGameDataPlayers", (newPlayers) => {
      setRoom((prevRoom) => ({
        ...prevRoom,
        gameData: {
          ...prevRoom.gameData,
          players: newPlayers
        }
      }))
    })

    socket.instance.on("updateGameStatus", (status) => {
      setRoom((prevRoom) => ({
        ...prevRoom,
        gameData: {
          ...prevRoom.gameData,
          gameStatus: status
        }
      }))
    });

    socket.instance.on("updateGameData", (newGameData) => {
      setRoom((prevRoom) => ({
        ...prevRoom,
        gameData: newGameData
      }))
    })

    return () => {
      socket.instance.off("startingStats");
      socket.instance.off("changeName");
      socket.instance.off("updateRoomUsers");
      socket.instance.off("updateGameDataPlayers");
      socket.instance.off("updateGameState");
      socket.instance.off("updateGameData");
    };
  }, [socket]);

  function joinPlayersButton() {
    if (room?.gameData.players.length < 4)
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
    if (player)
      return <p>You will be playing the game...</p>
    return <p>You will be spectating the game...</p>
  }

  function renderStartGameBtn() {
    return (
      room.gameData.players.length >= 2 &&
      room.gameData.players.length <= 4 &&
      player && (
        <button onClick={() => socket.instance.emit("startGame")}>
          Start Game
        </button>
      )
    );
  }

  function renderGame() {
    switch (room.gameData.gameStatus) {
      case "crashed":
        return (
          <>
            <Room />
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
        return <Board/>;
      case "ended":
        return (
          <div className="leaderboard">
            <LeaderBoard/>
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
            <Room />
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
