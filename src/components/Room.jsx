import "../css/Room.css"
import { useSocket } from "../context/SocketContext";

function Room() {

  const {socket} = useSocket()

  return (
    <div className="room_container">
      <div className="room_header">
        <div>
          <h1>{socket.room.roomName}</h1>
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
        {socket.room.users.map((user, index) => (
          <p key={index} >{user.name}</p>
        ))}
      </div>
    </div>
  );
}

export default Room;
