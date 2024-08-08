import React from "react";

function LeaderBoard({ leaderBoard }) {
  console.log(leaderBoard);
  return (
    <div>
      <h2>Leaderboard:</h2>
      {leaderBoard.map((player, index) => {
        return (
          <div style={{ display: "flex" }} key={index}>
            <p style={{marginRight: 20}}>{index + 1}</p>
            <p>{player.name}</p>
          </div>
        );
      })}
    </div>
  );
}

export default LeaderBoard;
