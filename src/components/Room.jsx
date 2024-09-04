import "../css/Room.css"
import { useSocket } from "../context/SocketContext";

function Room() {

  const {socket} = useSocket()

  return (
    <div className="room_container">
      <div className="room_header">
        <div>
          <h1 className="h1_left-justified">{socket.room.roomName}</h1>
          <h4>
            {socket.room.numUsers} {socket.room.numUsers === 1 ? "user" : "users"}
          </h4>
        </div>
        <button
          onClick={() => {socket.instance.emit("leaveRoom", socket.room.roomName)}}
        >Leave Room</button>
      </div>
      <hr />
      <div className="room_users-list">
        {socket.room.users.map((user, index) => 
          {if (socket.room.gameData.players.find(player => player.id === user.id))
            return <p key={index}><span>{user.name}</span> - Playing</p>
          else return <p key={index}><span>{user.name}</span></p>}
        )}
      </div>
    </div>
  );
}

export default Room;
