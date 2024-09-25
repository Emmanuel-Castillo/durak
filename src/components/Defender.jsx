import "../css/Player.css"
import React, { useState, useEffect } from "react";
import { usePlayer } from "../context/PlayerContext";
import { useSocket } from "../context/SocketContext";
import { useRoom } from "../context/RoomContext"
import Card from "./Card";

function Defender({attackerCard, setAttackerCard}) {
  const {player} = usePlayer();
  const {socket} = useSocket();
  const {room} = useRoom()
  const [defenderCard, setDefenderCard] = useState(null);
  const [cardWidth, setCardWidth] = useState()
  const [cardMargin, setCardMargin] = useState(4)
  const playerHandWidth = 750
  const [pressedSortCards, setPressedSortCards] = useState(false)

  useEffect(() => {
    if (!socket && !socket.instance) return
    socket.instance.on("sortedHand", () => {
      setPressedSortCards(true)
    })

    socket.instance.on("resetStates", () => {
      setPressedSortCards(false)
    })
  }, [socket])

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
    if (attackerCard && defenderCard)       counterAttackingCards();
    else if (!attackerCard && defenderCard) passOverCards();
  }, [attackerCard, defenderCard]);
  
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
  
  // Sets defenderCard if card is selected from defenders hand
  function handleDefenderCardClick(card) {
    setDefenderCard((prevCard) => (prevCard === card ? null : card));
  }
  
  // If defender fails to defend, add all cards on attackingCards and/or counteredCards array to their hand and assign role to attacker for the next turn
  // Emit signal to server to prepare for next turn
  function failedDefEndTurn() {
    socket.instance.emit("failedDefense");
  }
  
  // Called when either attackingCard or defenderCard is selected/deselected by the defender
  const counterAttackingCards = () => {
    let successfulCounter = false;
    
    const {tsarCard} = room.gameData
    // Case if attackerCard suit is same as tsar suit
    if (attackerCard.suit === tsarCard.suit) {
      // If defender card suit is also the same and has higher rank than attacker's
      if (
        defenderCard.suit === tsarCard.suit &&
        defenderCard.rank > attackerCard.rank
      ) {
        successfulCounter = true;
      }
    }

    // Case if attackerCard suit is other than tsar suit
    else {
      // If defender card suit is tsar suit
      if (defenderCard.suit === tsarCard.suit) {
        successfulCounter = true;
      }

      // Or if defender card suit is same as attacker card suit and rank is higher
      else if (
        defenderCard.suit === attackerCard.suit &&
        defenderCard.rank > attackerCard.rank
      ) {
        // Successful counter
        successfulCounter = true;
      }
    }

    // If defender has sucessfully countered an attackerCard, the procedure follows:
    // Add both attackerCard and defenderCard as an object to the array counteredCards, emitting the change to all clients
    // Also update the attackingCards array to remove attackerCard, emitting that change to all clients as well
    // Remove defender card from their hand
    // Reset both defenderCard and attackerCard
    // Emit change in number of defender cards to all other clients
    if (successfulCounter) {
      socket.instance.emit("updateCounteredCards", attackerCard, defenderCard);
      socket.instance.emit( "updateAttackingCards", attackerCard, -1);
      socket.instance.emit("updateHand", defenderCard, -1);
      setDefenderCard(null);
      setAttackerCard(null);
    }
  };

  function passOverCards() {
    var {players, attackingCards, counteredCards} = room.gameData
    const playerIndex = players.findIndex((findPlayer) => findPlayer.id === player.id)
    const nextPlayer = players[((playerIndex + 1) % players.length)]
    
    // To pass cards to next player, three conditions must past:
    // 1. Defender must not have countered any attacking cards
    // 2. The defender's card must have the same rank as the attacking cards'
    // 3. The next player must have their hand length be greater or equal to the number of attacking cards + defender card passed by defender
    if ((counteredCards.length === 0) && (attackingCards.length < nextPlayer.handLength) && (attackingCards.find((c) => c.rank === defenderCard.rank))) {
          socket.instance.emit("updateAttackingCards", defenderCard, 1);
          socket.instance.emit("updateHand", defenderCard, 0);
          socket.instance.emit("passDefenderRole", socket.id);
          setDefenderCard(null);
    }
  }

  return (
    <div className="player-container">
      <div className="player-hand" style={{maxWidth: playerHandWidth}}>
        {player.hand.map((card, index) => (
          <div
            key={index}
            className="player-card"
            style={{
              width: cardWidth,
              marginLeft: index === 0 ? 0 : cardMargin,
              marginRight:  index === player.hand.length - 1 ? 0 : cardMargin
            }}
          >
            <div className="card-wrapper"
            style={{border: card === defenderCard && "2px solid blue"}}onClick={() => handleDefenderCardClick(card)}>
              <Card card={card}/>
            </div>
          </div>
        ))}
      </div>
      <div className="player_button-list">
        <button className={pressedSortCards && "btn_selected"} onClick={() => !pressedSortCards && sortCards()}>Sort Cards</button>
        {room.gameData.attackingCards.length > 0 ? (
          <button className="button_margin-left" onClick={() => {failedDefEndTurn();}}>Fail Defense</button>
        ) : (<></>)}
      </div>
    </div>
  );
}
export default Defender;
