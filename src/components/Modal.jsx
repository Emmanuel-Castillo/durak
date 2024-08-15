import React, { useState } from "react";
import { useSocket } from "../context/SocketContext";

function Modal({ setToggleModal }) {
  const { socket } = useSocket();
  const [roomName, setRoomName] = useState("");
  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        width: "100%",
        height: "100%",
        background: "rgba(0, 0, 0, 0.5)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <div
        style={{
          background: "white",
          height: 150,
          width: 240,
          margin: "auto",
          padding: "2%",
          border: "2px solid #000",
          borderRadius: "10px",
          boxShadow: "2px solid black",
        }}
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (roomName === "") return;

            socket.instance.emit("joinRoom", roomName);
            setRoomName("");
            setToggleModal(false);
          }}
        >
          <input
            type="text"
            maxLength={10}
            value={roomName}
            onChange={(e) => setRoomName(e.target.value)}
          />
          <button>Create Room</button>
        </form>
        <button onClick={() => setToggleModal(false)}>Exit</button>
      </div>
    </div>
  );
}

export default Modal;
