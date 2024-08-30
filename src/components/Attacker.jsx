import "../css/Player.css"
import React, { useEffect, useState } from "react";
import { usePlayer } from "../context/PlayerContext";
import { useSocket } from "../context/SocketContext";
import Card from "./Card";

function Attacker({ tsarCard, attackingCards, counteredCards }) {
  const {socket} = useSocket();
  const {player} = usePlayer();
  const [pressedEndTurn, setPressedEndTurn] = useState(false)
  const [numDefenderCards, setNumDefenderCards] = useState(6);

  // Will run once for all attackers once this component mounts
  useEffect(() => {
    if (!socket?.instance) return 
    socket.instance.emit("numDefCards");
  }, []);

  useEffect(() => {
    if (!socket?.instance) return
    socket.instance.on("numDefenderCards", (num) => {
      setNumDefenderCards(num);
    });

    socket.instance.on("resetStates", () => {
      setPressedEndTurn(false)
    })

  }, [socket]);

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

  function checkToDraw(card) {
    const maxCardsToFace = numDefenderCards < 6 ? numDefenderCards : 6;
    if (
      attackingCards.find((attackingCard) => attackingCard.rank === card.rank) ||
      (counteredCards.find(
          (cards) =>
            cards.attackerCard.rank === card.rank ||
            cards.defenderCard.rank === card.rank
        ) &&
      attackingCards.length < maxCardsToFace)
    ) {
      socket.instance.emit("updateAttackingCards", attackingCards, card, 1, player.name);
      socket.instance.emit("updateHand", player.id, card, -1);
    }
  }

  return (
    <div className="player-container">
      <div className="player-hand">
        {player.hand.map((card, index) => (
          <div
            key={index}
            onClick={() => checkToDraw(card)}
          >
            <Card card={card} />
          </div>
        ))}
      </div>
      <div className="player_button-list">
        <button className="button_margin-right" onClick={() => sortCards(tsarCard)}>Sort Cards</button>
        {(attackingCards.length === 0 && !pressedEndTurn) && (
        <button onClick={() => {socket.instance.emit("endAttackerTurn", player.name)
          setPressedEndTurn(true)
        }}>End Turn</button>
      )}
      </div>
      
    </div>
  );
}

export default Attacker;
