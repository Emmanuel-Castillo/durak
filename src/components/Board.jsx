import React, { useEffect, useState } from "react";
import Card from "./Card";
import { useSocket } from "../context/SocketContext";
import { usePlayer } from "../context/PlayerContext";
import FirstPlayer from "./FirstPlayer";
import Attacker from "./Attacker";
import Defender from "./Defender";
import PlayerGraph from "./PlayerGraph";

function Board() {
  // Client socket that receives emitted signals from server
  const { socket } = useSocket();
  const { player } = usePlayer();

  // Deck information
  const [tsarCard, setTsarCard] = useState(null);

  // Attacking cards presented by server
  const [attackingCards, setAttackingCards] = useState([]);

  // Selected cards from attackingCards and client's cards, respectively
  const [attackerCard, setAttackerCard] = useState(null);

  // Card countered by client emitted by the server to every client
  const [counteredCards, setCounteredCards] = useState([]);

  // Keep track of num cards in board
  const [numCardsDeck, setNumCardsDeck] = useState(36);

  useEffect(() => {
    if (!socket?.instance) return;

    socket.instance.on("attackingCards", (cards) => {
      setAttackingCards(cards);
    });

    socket.instance.on("counteredCards", (cards) => {
      setCounteredCards(cards);
    });

    socket.instance.on("tsarCard", (card) => {
      setTsarCard(card);
    });

    socket.instance.on("numCardsDeck", (num) => {
      setNumCardsDeck(num);
    });

    socket.instance.on("resetStates", () => {
      setAttackingCards([]);
      setCounteredCards([]);
      setAttackerCard(null);
    });

    return () => {
      socket.instance.off("attackingCards");
      socket.instance.off("counteredCards");
      socket.instance.off("tsarCard");
      socket.instance.off("resetStates");
    };
  }, [socket]);

  // If defender, this function sets attackerCard when one is clicked
  function handleAttackerCardClick(card) {
    if (player.role === "defender")
      setAttackerCard((prevCard) => (prevCard === card ? null : card));
  }

  // Renders all countered cards made by defender to all clients
  function showCounteredCards() {
    return (
      <div
        style={{
          borderLeft: "1px solid black",
          padding: "8px",
        }}
      >
        <h1>Countered Cards:</h1>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            overflowY: "auto",
          }}
        >
          {counteredCards.map((cards, index) => {
            return (
              <div
                style={{
                  display: "flex",
                  scale: ".65",
                  width: "fit-content",
                }}
                key={index}
              >
                <Card card={cards.attackerCard} />
                <Card card={cards.defenderCard} />
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  function renderHand() {
    switch (player.role) {
      case "firstPlayer":
        return (
            <FirstPlayer tsarCard={tsarCard} attackingCards={attackingCards} />
        );
      case "attacker":
        return (
            <Attacker
              tsarCard={tsarCard}
              attackingCards={attackingCards}
              counteredCards={counteredCards}
            />
        );

      case "defender":
        return (
            <Defender
              tsarCard={tsarCard}
              attackerCard={attackerCard}
              setAttackerCard={setAttackerCard}
              attackingCards={attackingCards}
              counteredCards={counteredCards}
            />
        );

      case "winner":
      case "durak":
        return <></>;

      default:
        break;
    }
  }

  // Render Board to all players
  // Renders appropriate hands to specifically assigned players
  return (
    <div
      style={{
        border: "1px solid black",
        display: "flex",
      }}
    >
      <div style={{ width: "100%", padding: 8 }}>
        <div style={{ display: "flex" }}>
          <div>
            <h2>TsarCard:</h2>
            <Card card={tsarCard} />
          </div>
          <div style={{ position: "relative", marginLeft: 40 }}>
            <h2>Deck:</h2>
            <img
              src="../../assets/backside_card.jpg"
              alt=""
              style={{ margin: "0 10px", width: "100px", height: "145.20px" }}
            />
            <h1
              style={{
                position: "absolute",
                top: 100,
                left: 40,
                color: "white",
              }}
            >
              {numCardsDeck}
            </h1>
          </div>
          <PlayerGraph />
        </div>
        <div>
          <h2>Attacking Cards:</h2>
          <div style={{ display: "flex", flexDirection: "row" }}>
            {attackingCards.map((card, index) => (
              <div
                key={index}
                //Card given CSS class 'selected' when set as attackerCard
                className={attackerCard === card ? "selected" : ""}
                onClick={() => {
                  handleAttackerCardClick(card);
                }}
              >
                <Card card={card} />
              </div>
            ))}
          </div>
        </div>
        {renderHand()}
      </div>
      {counteredCards.length > 0 && showCounteredCards()}
    </div>
  );
}

export default Board;
