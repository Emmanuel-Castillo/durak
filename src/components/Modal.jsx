import "../css/Modal.css"
import React, { useState } from "react";
import { useSocket } from "../context/SocketContext";

function Modal({ setToggleModal }) {
  const { socket } = useSocket();
  const [roomName, setRoomName] = useState("");
  return (
    <div className="modal-background">
      <div className="modal">
        <form
          className="modal-form"
          onSubmit={(e) => {
            e.preventDefault();
            if (roomName === "") return;
            socket.instance.emit("joinRoom", roomName);
            setRoomName("");
            setToggleModal(false);
          }}
        >
          <label className="modal-form_label">Enter room name:</label>
          <input
            type="text"
            maxLength={10}
            value={roomName}
            onChange={(e) => setRoomName(e.target.value)}
            style={{marginBottom: 16}}
          />
          <button className="modal-form_button">Create Room</button>
        </form>
        <button className="modal-form_button" onClick={() => setToggleModal(false)}>Exit</button>
      </div>
    </div>
  );
}

export default Modal;
