import React, { useState, useEffect } from "react";
import { usePlayer } from "../PlayerContext";
import { useSocket } from "../SocketContext";
import Card from "./Card";

function Defender({
  tsarCard,
  attackerCard,
  setAttackerCard,
  attackingCards,
  counteredCards,
}) {
  const { player } = usePlayer();
  const socket = useSocket();

  const [defenderCard, setDefenderCard] = useState(null);
  const [nextPlayerNumCards, setNextPlayerNumCards] = useState(6);

  useEffect(() => {
    socket.emit("numNPCards", player.id);
  }, []);

  useEffect(() => {
    socket.on("numNextPlayerCards", (num) => {
      setNextPlayerNumCards(num);
    });
  }, [socket]);

  useEffect(() => {
    if (attackerCard && defenderCard) counterAttackingCards();
    else if (!attackerCard && defenderCard) passOverCards();
  }, [attackerCard, defenderCard]);

  // Sets defenderCard if card is selected from defenders hand
  function handleDefenderCardClick(card) {
    setDefenderCard((prevCard) => (prevCard === card ? null : card));
  }

  // If defender fails to defend, add all cards on attackingCards and/or counteredCards array to their hand and assign role to attacker for the next turn
  // Emit signal to server to prepare for next turn
  function failedDefEndTurn() {
    const addingCards = player.hand.concat(
      attackingCards.concat(
        counteredCards.flatMap((cards) => [
          cards.attackerCard,
          cards.defenderCard,
        ])
      )
    );

    socket.emit("updateHand", player.id, addingCards, 1);
    socket.emit("failedDefense", player.id);
  }

  // Called when either attackingCard or defenderCard is selected/deselected by the defender
  const counterAttackingCards = () => {
    let successfulCounter = false;

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
      socket.emit(
        "updateCounteredCards",
        counteredCards,
        attackerCard,
        defenderCard,
        1
      );
      socket.emit("updateAttackingCards", attackingCards, attackerCard, -1);
      socket.emit("updateHand", player.id, defenderCard, -1);
      setDefenderCard(null);
      setAttackerCard(null);
    }
  };

  function passOverCards() {
    // Planning to pass over attacking cards to next player would assume not selecting an attacking card at all
    // Also check if player has not countered at all
    if (attackingCards.find((c) => c.rank === defenderCard?.rank)) {
      if (
        counteredCards.length === 0 &&
        attackingCards.length < nextPlayerNumCards
      ) {
        socket.emit("updateAttackingCards", attackingCards, defenderCard, 1);
        socket.emit("updateHand", player.id, defenderCard, -1);
        socket.emit("passDefenderRole", socket.id);
        setDefenderCard(null);
      }
    }
  }

  return (
    <>
      <h2>{player.name}, you're the defender!</h2>
      <div
        style={{
          display: "flex",
          flexDirection: "row",
          width: "70%",
          flexWrap: "wrap",
        }}
      >
        {player.hand.map((card, index) => (
          <div
            key={index}
            className={defenderCard === card ? "selected" : ""}
            onClick={() => handleDefenderCardClick(card)}
          >
            <Card card={card} />
          </div>
        ))}
      </div>
      {attackingCards.length > 0 ? (
        <button
          onClick={() => {
            failedDefEndTurn();
          }}
        >
          Fail Defense
        </button>
      ) : (
        <></>
      )}
    </>
  );
}

export default Defender;
