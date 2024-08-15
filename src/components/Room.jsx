import React from "react";
import { useSocket } from "../context/SocketContext";

function Room() {

  const {socket} = useSocket()

  return (
    <div style={{ width: 500, border: "1px solid black", borderRight: "hidden" , padding: 8 }}>
      <div style={{display: "flex", justifyContent: "space-between"}}>
        <div>
          <h1 style={{ margin: 0 }}>{socket.room.roomName}</h1>
          <h4 style={{ margin: 0 }}>
            {socket.room.numUsers} {socket.room.numUsers === 1 ? "user" : "users"}
          </h4>
        </div>
        <button
          onClick={() => {socket.instance.emit("leaveRoom", socket.room.roomName)}}
        >Leave Room</button>
      </div>
      <hr />
      <div style={{ overflowY: "auto" }}>
        {socket.room.users.map((user, index) => (
          <p index={index} style={{ margin: 0, marginBottom: 8 }}>{user.name}</p>
        ))}
      </div>
    </div>
  );
}

export default Room;
