import "../css/Player.css"
import React, { useEffect, useState } from "react";
import { usePlayer } from "../context/PlayerContext";
import { useSocket } from "../context/SocketContext";
import Card from "./Card";
import { useRoom } from "../context/RoomContext";

function FirstPlayer() {
  const {socket} = useSocket();
  const {room} = useRoom()
  const {player} = usePlayer();
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

  // Function sorts cards, accessible to all players
  // Sorts by rank (tsarCard suit has higher priority than all other suits)
  function sortCards() {
    const {tsarCard} = room.gameData
    const sortedCards = [...player.hand].sort((a, b) => {
      if (a.suit === tsarCard.suit && b.suit !== tsarCard.suit) return 1;
      else if (a.suit !== tsarCard.suit && b.suit === tsarCard.suit) return -1;
      else return a.rank - b.rank;
    });
    socket.instance.emit("updateHand", sortedCards, 10)
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
            onClick={() => {
              socket.instance.emit("updateAttackingCards", card, 1);
              socket.instance.emit("updateHand", card, -1);
              socket.instance.emit("updateRole","attacker");
            }}
          >
            <Card card={card} />
          </div>
        ))}
      </div>
      <div className="player_button-list"><button className={pressedSortCards && "btn_selected"} onClick={() => !pressedSortCards && sortCards()}>Sort Cards</button></div>
      
    </div>
  );
}

export default FirstPlayer;
