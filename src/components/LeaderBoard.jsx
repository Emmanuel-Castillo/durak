import { useRoom } from "../context/RoomContext";
import "../css/LeaderBoard.css"
import React from "react";

function LeaderBoard() {
  const places = ["1st", "2nd", "3rd"]
  const {room} = useRoom()
  return (
    <> 
      <h2>Leaderboard:</h2>
      {room.gameData.winners.map((player, index) => {
        const place = index === room.gameData.winners.length - 1 ? "Durak" : places[index]
        return (
            <p key={index}><span className="winner-place">{place}</span> - {player.name}</p>
        );
      })}
    </>
  );
}

export default LeaderBoard;
