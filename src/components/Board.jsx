import "../css/Board.css"
import React, { useEffect, useState } from "react";
import Card from "./Card";
import { useSocket } from "../context/SocketContext";
import { usePlayer } from "../context/PlayerContext";
import FirstPlayer from "./FirstPlayer";
import Attacker from "./Attacker";
import Defender from "./Defender";
import LeaderBoard from "./LeaderBoard";

function Board({ leaderBoard }) {
  // Client socket that receives emitted signals from server
  const { socket } = useSocket();
  const { player } = usePlayer();

  const [otherPlayers, setOtherPlayers] = useState([]);

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
    if (!socket.instance) return;

    if (!player.role) socket.instance.emit("hasGameStarted");
  }, []);

  useEffect(() => {
    if (!socket?.instance) return;

    // Grab other players in the game when it begins
    // Must implement seperate fnx in for small changes in the players array, not recopy everything over
    socket.instance.on("otherPlayers", (players) => {
      const ifPlayer = players.find(
        (player) => player.id === socket.instance.id
      );
      if (ifPlayer) {
        var greaterIndex = players.filter(
          (player) => player.index > ifPlayer.index
        );
        var lowerIndex = players.filter(
          (player) => player.index < ifPlayer.index
        );

        var playersExcludingSelf = greaterIndex.concat(lowerIndex);
        setOtherPlayers(playersExcludingSelf);
      } else {
        setOtherPlayers(players);
      }
    });

    socket.instance.on("attackingCards", (cards) => {
      setAttackingCards(cards);
    });

    socket.instance.on("counteredCards", (cards) => {
      console.log(counteredCards);
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

    // SPECTATORS ONLY: When connecting to room mid-game, set states using current game data
    socket.instance.on("joiningMidGame", (gameData) => {
      setOtherPlayers(gameData.players);
      setTsarCard(gameData.tsarCard);
      setAttackingCards(gameData.attackingCards);
      setCounteredCards(gameData.counteredCards);
      setNumCardsDeck(gameData.deck.length);
    });

    return () => {
      socket.instance.off("attackingCards");
      socket.instance.off("counteredCards");
      socket.instance.off("tsarCard");
      socket.instance.off("resetStates");
      socket.instance.off("joiningMidGame");
      socket.instance.off("otherPlayers");
    };
  }, [socket]);

  // If defender, this function sets attackerCard when one is clicked
  function handleAttackerCardClick(card) {
    if (player.role === "defender")
      setAttackerCard((prevCard) => (prevCard === card ? null : card));
  }

  // Dynamically render the player's hand depending on role
  function renderHand() {
    switch (player.role) {
      case "firstPlayer":
      case "defender":
      case "attacker":
        return (
          <div className="row-container">
            <div className="player-info">
              <p className="player-name white-text">{player.name}</p>
              <p>{player.role}</p>
              <p>{player.hand.length} cards</p>
            </div>
            {player.role === "firstPlayer" && (
              <FirstPlayer
                tsarCard={tsarCard}
                attackingCards={attackingCards}
              />
            )}
            {player.role === "attacker" && (
              <Attacker
                tsarCard={tsarCard}
                attackingCards={attackingCards}
                counteredCards={counteredCards}
              />
            )}
            {player.role === "defender" && (
              <Defender
                tsarCard={tsarCard}
                attackerCard={attackerCard}
                setAttackerCard={setAttackerCard}
                attackingCards={attackingCards}
                counteredCards={counteredCards}
              />
            )}
          </div>
        );
      case "spectator":
      case "winner":
      case "durak":
        return <></>;
      default:
        break;
    }
  }

  // Render the other player on the column HTML element
  function returnColumnPlayer(player) {
    return (
      <div className="column-container">
        <div className="player-info">
          <p className="player-name">{player?.name}</p>
          <p>{player?.role}</p>
          <p>{player?.hand.length} cards</p>
        </div>
        <div className="column_card-hand">
          {player?.hand.map(() => (
            <div className="column_card-container">
              <img
                src="../../assets/backside_card.jpg"
                className="column_card-img"
              />
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Render the other player on the horizontal HTML element
  function returnHorizontalPlayer(player) {
    return (
      <div className="row-container">
        <div className="player-info">
          <p className="player-name">{player?.name}</p>
          <p>{player?.role}</p>
          <p>{player?.hand.length} cards</p>
        </div>
        <div className="horizontal-hand_container">
          {player?.hand.map(() => (
            <img
              src="../../assets/backside_card.jpg"
              className="horizontal-hand_img"
            />
          ))}
        </div>
      </div>
    );
  }

  // Dynamically render board depending on number of players in-game
  function renderBoard() {
    const ifPlayer = player.role === null ? 0 : 1;
    switch (otherPlayers.length + ifPlayer) {
      case 2:
        return twoPlayerBoard();
      case 3:
        return threePlayerBoard();
      case 4:
        return fourPlayerBoard();
      default:
        break;
    }
  }

  function renderAtkCntCards() {
    return (
      <div className="atk-cnt-cards_container">
        <h4 style={{ margin: 8 }}>Attacking Cards:</h4>
        <div className="atk-cnt-cards_list">
          {counteredCards.map((cards, index) => (
            <div key={index} className="cnt-cards_pair-container">
              <Card card={cards.attackerCard} />
              <div className="cnt-cards-pair_second-card">
                <Card card={cards.defenderCard} />
              </div>
            </div>
          ))}
          {attackingCards.map((card, index) => (
            <div
              key={index}
              className={attackerCard === card ? "selected-atk-card" : "atk-card"}
              onClick={() => {
                handleAttackerCardClick(card);
              }}
            >
              <Card card={card} />
            </div>
          ))}
        </div>
      </div>
    );
  }

  function renderDeckAndTsarCard() {
    return (
      <div className="stack-container">
        <div className="stack_tsar-card">
          <Card card={tsarCard} />
        </div>
        <div className="stack-deck">
          <img src="../../assets/backside_card.jpg" className="column_card-img"/>
          <h2 className="stack_deck-length">{numCardsDeck}</h2>
        </div>
    </div>
    )
  }

  function twoPlayerBoard() {
    return (
      <div className="whole_two-player_board">
        <div className="horizontal-player_container">
          {returnHorizontalPlayer(otherPlayers[0])}
        </div>
        <div className="two-player_board-middle">
          {renderDeckAndTsarCard()}
          {renderAtkCntCards()}
        </div>
        <div className="horizontal-player_container">
          {player.role ? renderHand() : returnHorizontalPlayer(otherPlayers[1])}
        </div>
      </div>
    );
  }

  function threePlayerBoard() {
    return (
      <div className="mult_player-board-container">
        <div className="column-player_container">
          {returnColumnPlayer(otherPlayers[0])}
        </div>
        <div className="mult_player-board_middle-col">
          <div className="three_player-board_middle">
            {renderDeckAndTsarCard()}
            {renderAtkCntCards()}
          </div>
          <div className="horizontal-player_container">
            {player.role
              ? renderHand()
              : returnHorizontalPlayer(otherPlayers[2])}
          </div>
        </div>
        <div className="column-player_container">
          {returnColumnPlayer(otherPlayers[1])}
        </div>
      </div>
    );
  }

  function fourPlayerBoard() {
    return (
      <div className="mult_player-board-container">
        <div className="column-player_container">
          {returnColumnPlayer(otherPlayers[0])}
        </div>
        <div className="mult_player-board_middle-col">
          <div className="horizontal-player_container">
            {returnHorizontalPlayer(otherPlayers[1])}
          </div>
          <div className="four_player-board_middle">
            {renderDeckAndTsarCard()}
            {renderAtkCntCards()}
          </div>
          <div className="horizontal-player_container">
            {player.role
              ? renderHand()
              : returnHorizontalPlayer(otherPlayers[3])}
          </div>
        </div>
        <div className="column-player_container">
          {returnColumnPlayer(otherPlayers[2])}
        </div>
      </div>
    );
  }

  return renderBoard();
}
export default Board;
