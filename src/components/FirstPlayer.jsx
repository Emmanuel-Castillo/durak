import "../css/Player.css"
import React from "react";
import { usePlayer } from "../context/PlayerContext";
import { useSocket } from "../context/SocketContext";
import Card from "./Card";

function FirstPlayer({ tsarCard, attackingCards }) {
  const {socket} = useSocket();
  const { player } = usePlayer();

  // Function sorts cards, accessible to all players
  // Sorts by rank (tsarCard suit has higher priority than all other suits)
  function sortCards(tsarCard) {
    const sortedCards = [...player.hand].sort((a, b) => {
      if (a.suit === tsarCard.suit && b.suit !== tsarCard.suit) return 1;
      else if (a.suit !== tsarCard.suit && b.suit === tsarCard.suit) return -1;
      else return a.rank - b.rank;
    });
    socket.instance.emit("updateHand", player.id, sortedCards, 1);
  }

  return (
    <div className="player-container">
      <div className="player-hand">
        {player.hand.map((card, index) => (
          <div
            key={index}
            onClick={() => {
              socket.instance.emit("updateAttackingCards", attackingCards, card, 1, player.name);
              socket.instance.emit("updateHand", player.id, card, -1);
              socket.instance.emit("updateRole", player.id, "attacker");
              socket.instance.emit("tellOthersFirstPlayDone")
            }}
          >
            <Card card={card} />
          </div>
        ))}
      </div>
      <button onClick={() => sortCards(tsarCard)}>Sort Cards</button>
    </div>
  );
}

export default FirstPlayer;
