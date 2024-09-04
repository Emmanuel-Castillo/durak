import "../css/LeaderBoard.css"
import React from "react";

function LeaderBoard({ leaderBoard }) {
  const places = ["1st", "2nd", "3rd"]
  return (
    <> 
      <h2>Leaderboard:</h2>
      {leaderBoard.map((player, index) => {
        const place = index === leaderBoard.length - 1 ? "Durak" : places[index]
        return (
            <p key={index}><span className="winner-place">{place}</span> - {player.name}</p>
        );
      })}
    </>
  );
}

export default LeaderBoard;
