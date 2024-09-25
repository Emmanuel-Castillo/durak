import "../css/Room.css"
import { useSocket } from "../context/SocketContext";
import { useRoom } from "../context/RoomContext";
import { useEffect } from "react";

function Room() {

  const {socket} = useSocket()
  const {room, setRoom} = useRoom()

  useEffect(() => {
    if (!socket && !socket.instance) return

    socket.instance.on("updateRoomUsers", (newUsers) => {
      setRoom((prevRoom) => ({
        ...prevRoom,
        users: newUsers
      }))
    })
  }, [socket])

  return (
    <div className="room_container">
      <div className="room_header">
        <div>
          <h1 className="h1_left-justified">{room.roomName}</h1>
          <h4>
            {room.users.length} {room.users.length === 1 ? "user" : "users"}
          </h4>
        </div>
        <button
          onClick={() => {socket.instance.emit("leaveRoom", room.roomName)}}
        >Leave Room</button>
      </div>
      <hr />
      <div className="room_users-list">
        {room.users.map((user, index) => 
          {if (room.gameData.players.find(player => player.id === user.id))
            return <p key={index}><span>{user.name}</span> - Playing</p>
          else return <p key={index}><span>{user.name}</span></p>}
        )}
      </div>
    </div>
  );
}

export default Room;
