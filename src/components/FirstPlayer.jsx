import React from "react";
import { usePlayer } from "../context/PlayerContext";
import { useSocket } from "../context/SocketContext";
import Card from "./Card";

function FirstPlayer({ attackingCards }) {
  const socket = useSocket();
  const { player } = usePlayer();

  return (
    <div>
      <h2>FIRST PLAY! {player.name}, you're the attacker</h2>
      <div style={{ display: "flex", flexDirection: "row" }}>
        {player.hand.map((card, index) => (
          <div
            key={index}
            onClick={() => {
              socket.emit("updateAttackingCards", attackingCards, card, 1);
              socket.emit("updateHand", player.id, card, -1);
              socket.emit("updateRole", player.id, "attacker");
            }}
          >
            <Card card={card} />
          </div>
        ))}
      </div>
    </div>
  );
}

export default FirstPlayer;
