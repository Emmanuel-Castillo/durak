import "../css/Board.css"
import React, { useEffect, useState } from "react";
import Card from "./Card";
import { useSocket } from "../context/SocketContext";
import { usePlayer } from "../context/PlayerContext";
import FirstPlayer from "./FirstPlayer";
import Attacker from "./Attacker";
import Defender from "./Defender";
import { useRoom } from "../context/RoomContext";

function Board() {
  // Client socket that receives emitted signals from server
  const { socket } = useSocket();
  const { player, setPlayer } = usePlayer();
  const {room, setRoom} = useRoom()

  const [attackerCard, setAttackerCard] = useState(null);

  const [otherPlayers, setOtherPlayers] = useState([]);

  const [timer, setTimer] = useState()

  // Grab other players in the game when it begins
  // Must implement seperate fnx in for small changes in the players array, not recopy everything over
  function createOtherPlayers() {
    if (player) {
      const playerIndex = room.gameData.players.findIndex((findPlayer) => findPlayer.id === player.id)
      var greaterIndex = room.gameData.players.slice(playerIndex + 1, room.gameData.players.length)
      var lowerIndex = room.gameData.players.slice(0, playerIndex)

      var playersExcludingSelf = greaterIndex.concat(lowerIndex);
      setOtherPlayers(playersExcludingSelf)
    } else {
      setOtherPlayers(room.gameData.players)
    }
  };

  useEffect(() => {
    room.gameData.players && createOtherPlayers()
  }, [])

  useEffect(() => {
    createOtherPlayers()
  }, [room.gameData.players])

  useEffect(() => {
    if (!socket?.instance) return;
    
    socket.instance.on("startTimer", (sec) => {
      let timeLeft = sec
      setTimer(sec)
      
      const interval = setInterval(() => {
        timeLeft -= 1
        setTimer(timeLeft)
        
        if (timeLeft <= 0) {
          clearInterval(interval)
          setTimer(null)
        }
      }, 1000)
    })

    socket.instance.on("changeName", (newName) => {
      player && setPlayer((prevPlayer) => ({ ...prevPlayer, name: newName }));
    });
    
    socket.instance.on("changeHand", (cards) => {
      setPlayer((prevPlayer) => ({ ...prevPlayer, hand: cards }));
    });
    
    socket.instance.on("changeRole", (newRole) => {
      setPlayer((prevPlayer) => ({ ...prevPlayer, role: newRole }));
    });

    socket.instance.on("attackingCards", (cards) => {
      setRoom((prevRoom) => ({
        ...prevRoom,
        gameData: {
          ...prevRoom.gameData,
          attackingCards: cards,
        }
      }))

    });

    socket.instance.on("counteredCards", (cards) => {
      setRoom((prevRoom) => ({
        ...prevRoom,
        gameData: {
          ...prevRoom.gameData,
          counteredCards: cards,
        }
      }))
    });

    socket.instance.on("numCardsDeck", (length) => {
      setRoom((prevRoom) => ({
        ...prevRoom,
        gameData: {
          ...prevRoom.gameData,
          deckLength: length
        }
      }))
    });

    socket.instance.on("resetStates", () => {
      setAttackerCard(null);
    });

    socket.instance.on("updateWinners", (newWinners) => {
      setRoom((prevRoom) => ({
        ...prevRoom,
        gameData: {
          ...prevRoom.gameData,
          winners: newWinners
        }
      }))
    })

    return () => {
      socket.instance.off("attackingCards");
      socket.instance.off("counteredCards");
      socket.instance.off("resetStates");
      socket.instance.off("numCardsDeck");
      socket.instance.off("startTimer")
      socket.instance.off("changeHand")
      socket.instance.off("changeRole")
      socket.instance.off("updateGameDataPlayers")
      socket.instance.off("updateGameDataPlayersNames")
      socket.instance.off("updateGameDataPlayersHandLength")
      socket.instance.off("updateGameDataPlayersRoles")
    };
  }, [socket]);

  // If defender, this function sets attackerCard when one is clicked
  function handleAttackerCardClick(card) {
    if (player.role === "defender")
      setAttackerCard((prevCard) => (prevCard === card ? null : card));
  }

  // Dynamically render the player's hand depending on role
  function renderHand() {
    return (
      <div className="row-container">
        <div className="player-info">
          <p className="player-name white-text">{player.name}</p>
          <p>{player.role}</p>
          <p>{player.hand.length} cards</p>
        </div>
        {player.role === "firstPlayer" && (
          <FirstPlayer/>
        )}
        {player.role === "attacker" && (
          <Attacker/>
        )}
        {player.role === "defender" && (
          <Defender
          attackerCard={attackerCard}
          setAttackerCard={setAttackerCard}/>
        )}
      </div>
    );
  }

  // Render the other player on the column HTML element
  function returnColumnPlayer(player) {
    var cardHeight = 45
    if (player.handLength > 8)
      cardHeight = 450 / player.handLength
    return (
      <div className="column-container">
        <div className="player-info">
          <p className="player-name">{player.name}</p>
          <p>{player.role}</p>
          <p>{player.handLength} cards</p>
        </div>
        <div className="column_card-hand">
          {Array.from({ length: player.handLength }).map((_, index) => (
            <div className="column_card-container"
            style={{height: cardHeight}}>
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
    var cardWidth
    if (player.handLength > 8)
      cardWidth = 750 / player.handLength
    return (
      <div className="row-container">
        <div className="player-info">
          <p className="player-name">{player?.name}</p>
          <p>{player.role}</p>
          <p>{player.handLength} cards</p>
        </div>
        <div className="horizontal-hand_container">
          {Array.from({ length: player.handLength }).map((_, index) => (
            <div
            className="other-player_card"
            style={{
              width: cardWidth,
            }}
          >
            <img
              src="../../assets/backside_card.jpg"
              className="horizontal-hand_img"
            />
          </div>
            
          ))}
        </div>
      </div>
    );
  }

  // Dynamically render board depending on number of players in-game
  function renderBoard() {
    const ifPlayer = player ? 1 : 0;
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
    const { attackingCards, counteredCards } = room.gameData
    return (
      <div className="atk-cnt-cards_container">
        {timer && renderTimer()}
        <h4 style={{ margin: 8 }}>Attacking Cards:</h4>
        <div className="atk-cnt-cards_list">
          {counteredCards.map((cards, index) => (
            <div className="cnt-cards_pair-container">
              <Card card={cards.attackerCard} />
              <div className="cnt-cards-pair_second-card">
                <Card card={cards.defenderCard} />
              </div>
            </div>
          ))}
          {attackingCards.map((card, index) => (
            <div
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
    const { tsarCard, deckLength } = room.gameData
    return (
      <div className="stack-container">
        <div className="stack_tsar-card">
          <Card card={tsarCard} />
        </div>
        <div className="stack-deck">
          <img src="../../assets/backside_card.jpg" className="column_card-img"/>
          <h2 className="stack_deck-length">{deckLength}</h2>
        </div>
    </div>
    )
  }

  function renderTimer() {
    return (
      <div className="timer">
        <h1 className="timer_time">{timer} {timer === 1 ? "second" : "seconds"}</h1>
        <h2 className="timer_description"> Defender has failed their turn!</h2>
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
          {player ? renderHand() : returnHorizontalPlayer(otherPlayers[1])}
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
            {player
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
            {player
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
