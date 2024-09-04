import "../css/Player.css"
import React, { useEffect, useState } from "react";
import { usePlayer } from "../context/PlayerContext";
import { useSocket } from "../context/SocketContext";
import Card from "./Card";

function FirstPlayer({ tsarCard, attackingCards }) {
  const {socket} = useSocket();
  const { player } = usePlayer();
  const [cardWidth, setCardWidth] = useState()
  const [cardMargin, setCardMargin] = useState(4)
  const playerHandWidth = 750

  useEffect(() => {
    if (player.hand.length > 8){
      setCardWidth(playerHandWidth  / player.hand.length)
      setCardMargin()
    }
    else {
      setCardWidth()
      setCardMargin(4)
    }
  },[player])

  // Function sorts cards, accessible to all players
  // Sorts by rank (tsarCard suit has higher priority than all other suits)
  function sortCards(tsarCard) {
    const sortedCards = [...player.hand].sort((a, b) => {
      if (a.suit === tsarCard.suit && b.suit !== tsarCard.suit) return 1;
      else if (a.suit !== tsarCard.suit && b.suit === tsarCard.suit) return -1;
      else return a.rank - b.rank;
    });
    socket.instance.emit("updateHand", sortedCards, 1);
  }

  return (
    <div className="player-container">
      <div className="player-hand">
        {player.hand.map((card, index) => (
          <div
            key={index}
            className="player-card"
            style={{
              width: cardWidth,
              marginLeft: index === 0 ? 0 : cardMargin,
              marginRight:  index === player.hand.length - 1 ? 0 : cardMargin
            }}
            onClick={() => {
              socket.instance.emit("updateAttackingCards", attackingCards, card, 1, player.name);
              socket.instance.emit("updateHand", card, -1);
              socket.instance.emit("updateRole","attacker");
              socket.instance.emit("tellOthersFirstPlayDone")
            }}
          >
            <Card card={card} />
          </div>
        ))}
      </div>
      <div className="player_button-list"><button onClick={() => sortCards(tsarCard)}>Sort Cards</button></div>
      
    </div>
  );
}

export default FirstPlayer;
