import "./css/App.css";
import React, { useEffect, useState } from "react";
import { useSocket } from "./context/SocketContext";
import Game from "./components/Game";
import Commenter from "./components/Commenter";
import Modal from "./components/Modal";
import { useRoom } from "./context/RoomContext";

const App = () => {
  const {socket, setSocket} = useSocket();
  const {room, setRoom} = useRoom()
  const [name, setName] = useState('');
  const [rooms, setRooms] = useState([]);
  const [toggleModal, setToggleModal] = useState(false);
  const [toggleRoomBox, setToggleRoomBox] = useState(false);

  useEffect(() => {
    if (!socket && !socket?.instance) return;

    socket.instance.on("initialRooms", (rooms) => {
      setRooms(rooms);
    });

    socket.instance.on("updateRoom", (room) => {
      setRoom(room);
    });

    socket.instance.on("updateRooms", (rooms) => {
      setRooms(rooms);
    });

    socket.instance.on("changeName", (newName) => {
      setSocket((prevSocket) => ({
        ...prevSocket,
        name: newName
      }))
    })

    // Clean up listeners when the component unmounts
    return () => {
      socket.instance.off("initialRooms");
      socket.instance.off("updateRoom");
      socket.instance.off("updateRooms");
      socket.instance.off("changeName")
    };
  }, [socket]);

  useEffect(() => {
    switch (room?.gameData.gameStatus) {
      case "started":
      case "ended":
        setToggleRoomBox(true)
        break;
      default:
        setToggleRoomBox(false)
        break;
    }
  }, [room?.gameData.gameStatus])

  return (
    <div className="app">
      <div className="app_header">
          <h1>Durak</h1>
          <form
            className="app_name-form"
            onSubmit={(e) => {
              e.preventDefault();
              if (name === "") return
              socket?.instance.emit("updateName", name);
              setName("");
            }}
          >
            <label>Enter Name:</label>
            <input
              type="text"
              value={name}
              maxLength="10"
              onChange={(e) => setName(e.target.value)}
            />
            <button>Submit</button>
          </form>
      </div>
      <div className="app_content-wrapper">
        <div className="app_comments-wrapper">
          {toggleRoomBox && (
            <div className="app_comments-wrapper_room-tag">
              <h3>Room: {room.roomName}</h3>
              <button
                onClick={() => {
                  socket?.instance.emit("leaveRoom", room.roomName)
                  setToggleRoomBox(false)
                }}
              >Leave Room</button>
            </div>
          )}
          <div style={{height: toggleRoomBox ? "90%" : "100%"}}><Commenter /></div>
        </div>
        <div className="app_game-wrapper">
          {room ? <Game/> : (
            <div className="app_room-wrapper">
              <h1 className="h1_left-justified">{rooms.length === 0 ? "There are no rooms... Create a room to begin a game!" : "Rooms"}</h1>
              <div className="app_rooms">
                {rooms.map((room, index) => (
                  <div
                    key={index}
                    className="app_room"
                  >
                    <h1>{room.roomName}</h1>
                    <p>{room.numUsers} {room.numUsers === 1 ? "user" : "users"}</p>
                    <button onClick={() => socket?.instance.emit("joinRoom", room.roomName)}>
                      Join Room
                    </button>
                  </div>
                ))}
              </div>
              <button onClick={() => {setToggleModal(true);}}>
                Create Room
              </button>
            </div>
          )}
        </div>
        {toggleModal && <Modal setToggleModal={setToggleModal}/>}
      </div>
    </div>
  );
};

export default App;
