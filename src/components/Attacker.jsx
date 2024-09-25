import "../css/Player.css"
import React, { useEffect, useState } from "react";
import { usePlayer } from "../context/PlayerContext";
import { useSocket } from "../context/SocketContext";
import Card from "./Card";
import { useRoom } from "../context/RoomContext";

function Attacker() {
  const {socket} = useSocket();
  const {player} = usePlayer();
  const {room} = useRoom()
  const [pressedEndTurn, setPressedEndTurn] = useState(false)
  const [pressedSortCards, setPressedSortCards] = useState(false)
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
  
  useEffect(() => {
    if (!socket && !socket.instance) return
    socket.instance.on("resetStates", () => {
      setPressedEndTurn(false)
      setPressedSortCards(false)
    })
    
    socket.instance.on("sortedHand", () => {
      setPressedSortCards(true)
    })
  }, [socket]);
  
  // Function sorts cards, accessible to all players
  // Sorts by rank (tsarCard suit has higher priority than all other suits)
  function sortCards() {
    const { tsarCard } = room.gameData 
    const sortedCards = [...player.hand].sort((a, b) => {
      if (a.suit === tsarCard.suit && b.suit !== tsarCard.suit) return 1;
      else if (a.suit !== tsarCard.suit && b.suit === tsarCard.suit) return -1;
      else return a.rank - b.rank;
    });
    socket.instance.emit("updateHand", sortedCards, 10)
  }

  function checkToDraw(card) {
    const { attackingCards, counteredCards } = room.gameData
    const defender = room.gameData.players.find((player) => player.role === "defender")

    if ((attackingCards.length < defender.handLength) && (attackingCards.length + counteredCards.length < 6) && (
      attackingCards.find((attackingCard) => attackingCard.rank === card.rank) ||
      (counteredCards.find(
          (cards) =>
            cards.attackerCard.rank === card.rank ||
            cards.defenderCard.rank === card.rank
        ))
    )) {
      socket.instance.emit("updateAttackingCards", card, 1);
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
        <button className={pressedSortCards && "btn_selected"} onClick={() => !pressedSortCards && sortCards()}>Sort Cards</button>
        {(room.gameData.attackingCards.length === 0 && !pressedEndTurn) && (
        <button className="button_margin-left" onClick={() => {socket.instance.emit("endAttackerTurn", player.name)
          setPressedEndTurn(true)
        }}>End Turn</button>
      )}
      </div>
      
    </div>
  );
}

export default Attacker;
