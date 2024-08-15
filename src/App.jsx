// src/App.js
import React, { useEffect, useState } from "react";
import Game from "./components/Game";
import "./css/App.css";
import Commenter from "./components/Commenter";
import { useSocket } from "./context/SocketContext";
import Modal from "./components/Modal";
import Room from "./components/Room";

const App = () => {
  const {socket, joinRoom} = useSocket();
  const [name, setName] = useState();
  const [rooms, setRooms] = useState([])
  const [toggleModal, setToggleModal] = useState(false)

  useEffect(() => {
    if (!socket?.instance) return 
    socket.instance.emit("getRooms")

    socket.instance.on("initialRooms", (rooms) => {
      setRooms(rooms)
    })

    socket.instance.on("updateRoom", (room) => {
      joinRoom(room)
    })

    socket.instance.on("updateRooms", (rooms) => {
      setRooms(rooms)
    })

    // Clean up listeners when the component unmounts
    return () => {
      socket.instance.off("initialRooms");
      socket.instance.off("updateRoom");
      socket.instance.off("updateRooms");
    };
  }, [socket])

  return (
    <div className="app">
      <div style={{ display: "flex", height: 225 }}>
        <div style={{ width: "100%" }}>
          <h1
            style={{
              fontSize: 70,
              textAlign: "center",
              textDecoration: "underline",
            }}
          >
            Durak
          </h1>
          <form
            style={{ display: "flex", justifyContent: "center" }}
            onSubmit={(e) => {
              e.preventDefault();
              if (name?.length > 0)
                socket.instance.emit("updateName", name);
              setName("");
            }}
          >
            <label style={{ marginRight: 4 }} htmlFor="name">
              Enter Name:{" "}
            </label>
            <input
              type="text"
              value={name}
              maxLength="10"
              onChange={(e) => setName(e.target.value)}
            />
            <button style={{ marginLeft: 8 }}>Submit</button>
          </form>
        </div>
        {socket && socket.room && <Room/>}
        <Commenter />
      </div>
      <hr />
      {socket && socket.room ? <Game /> : <>
        {rooms.map((room, index) => (
          <div key={index}>
            <h1>{room.roomName}</h1>
            <p>{room.numUsers} {room.numUsers === 1 ? "user" : "users"}</p>
            <button onClick={() => socket.instance.emit("joinRoom", room.roomName)}>Join Room</button>
          </div>
        ))}
        <button onClick={() => {setToggleModal(true)}}>Create Room</button>
      </>}
      {toggleModal && <Modal setToggleModal={setToggleModal}/>}
    </div>
  );
};

export default App;
