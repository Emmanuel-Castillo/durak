import "../css/LeaderBoard.css"
import React from "react";

function LeaderBoard({ leaderBoard }) {
  const places = ["1st", "2nd", "3rd", "4th"]
  return (
    <div>
      <h2>Leaderboard:</h2>
      {leaderBoard.map((player, index) => {
        return (
          <div className="player-container" key={index}>
            <p className="player_place">{places[index]}</p>
            <p>{player.name}</p>
          </div>
        );
      })}
    </div>
  );
}

export default LeaderBoard;
