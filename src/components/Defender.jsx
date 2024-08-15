import React, { useState, useEffect } from "react";
import { usePlayer } from "../context/PlayerContext";
import { useSocket } from "../context/SocketContext";
import Card from "./Card";

function Defender({
  tsarCard,
  attackerCard,
  setAttackerCard,
  attackingCards,
  counteredCards,
}) {
  const { player } = usePlayer();
  const { socket } = useSocket();

  const [defenderCard, setDefenderCard] = useState(null);
  const [nextPlayerNumCards, setNextPlayerNumCards] = useState(6);

  useEffect(() => {
    if (!socket?.instance) return;
    socket.instance.emit("numNPCards", player.id);
  }, []);

  useEffect(() => {
    if (!socket?.instance) return;
    socket.instance.on("numNextPlayerCards", (num) => {
      setNextPlayerNumCards(num);
    });
  }, [socket]);

  useEffect(() => {
    if (attackerCard && defenderCard) counterAttackingCards();
    else if (!attackerCard && defenderCard) passOverCards();
  }, [attackerCard, defenderCard]);

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

    socket.instance.emit("updateHand", player.id, addingCards, 1);
    socket.instance.emit("failedDefense", player.id);
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
      socket.instance.emit(
        "updateCounteredCards",
        counteredCards,
        attackerCard,
        defenderCard,
        1
      );
      socket.instance.emit(
        "updateAttackingCards",
        attackingCards,
        attackerCard,
        -1
      );
      socket.instance.emit("updateHand", player.id, defenderCard, -1);
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
        socket.instance.emit(
          "updateAttackingCards",
          attackingCards,
          defenderCard,
          1,
          player.name
        );
        socket.instance.emit("updateHand", player.id, defenderCard, -1);
        socket.instance.emit("passDefenderRole", socket.id);
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
      <div style={{display: "flex", flexDirection: "column", width: 100, height: 50, justifyContent: "space-between", marginTop: 8}}>
        <button onClick={() => sortCards(tsarCard)}>Sort Cards</button>
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
      </div>
    </>
  );
}

export default Defender;
