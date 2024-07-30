import React, { useEffect, useState } from "react";
import { usePlayer } from "../context/PlayerContext";
import { useSocket } from "../context/SocketContext";
import Card from "./Card";

function Attacker({ attackingCards, counteredCards }) {
  const socket = useSocket();
  const { player } = usePlayer();
  const [pressedEndTurn, setPressedEndTurn] = useState(false)

  const [numDefenderCards, setNumDefenderCards] = useState(6);

  // Will run once for all attackers once this component mounts
  useEffect(() => {
    socket.emit("numDefCards");
  }, []);

  useEffect(() => {
    socket.on("numDefenderCards", (num) => {
      setNumDefenderCards(num);
    });

    socket.on("resetStates", () => {
      setPressedEndTurn(false)
    })
  }, socket);

  return (
    <div>
      <h2>{player.name}, you're the attacker!</h2>
      <div style={{ display: "flex", flexDirection: "row" }}>
        {player.hand.map((card, index) => (
          <div
            key={index}
            onClick={() => {
              const maxCardsToFace =
                numDefenderCards < 6 ? numDefenderCards : 6;
              if (
                attackingCards.find(
                  (attackingCard) => attackingCard.rank === card.rank
                ) ||
                (counteredCards.find(
                  (cards) =>
                    cards.attackerCard.rank === card.rank ||
                    cards.defenderCard.rank === card.rank
                ) &&
                  attackingCards.length < maxCardsToFace)
              ) {
                socket.emit("updateAttackingCards", attackingCards, card, 1);
                socket.emit("updateHand", player.id, card, -1);
              }
            }}
          >
            <Card card={card} />
          </div>
        ))}
      </div>
      {attackingCards.length === 0 && !pressedEndTurn && (
        <button onClick={() => {socket.emit("endAttackerTurn")
          setPressedEndTurn(true)
        }}>End Turn</button>
      )}
    </div>
  );
}

export default Attacker;
