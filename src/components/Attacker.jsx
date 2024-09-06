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
    socket.instance.emit("updateHand", sortedCards, 1);
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
      (attackingCards.length + counteredCards.length) < maxCardsToFace)
    ) {
      socket.instance.emit("updateAttackingCards", attackingCards, card, 1, player.name);
      socket.instance.emit("updateHand", card, -1);
    }
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
            onClick={() => checkToDraw(card)}
          >
            <Card card={card} />
          </div>
        ))}
      </div>
      <div className="player_button-list">
        <button onClick={() => sortCards(tsarCard)}>Sort Cards</button>
        {(attackingCards.length === 0 && !pressedEndTurn) && (
        <button className="button_left-margin" onClick={() => {socket.instance.emit("endAttackerTurn", player.name)
          setPressedEndTurn(true)
        }}>End Turn</button>
      )}
      </div>
      
    </div>
  );
}

export default Attacker;
