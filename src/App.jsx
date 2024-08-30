import "./css/App.css";
import React, { useEffect, useState } from "react";
import { useSocket } from "./context/SocketContext";
import Game from "./components/Game";
import Commenter from "./components/Commenter";
import Modal from "./components/Modal";

const App = () => {
  const { socket, joinRoom } = useSocket();
  const [name, setName] = useState();
  const [rooms, setRooms] = useState([]);
  const [toggleModal, setToggleModal] = useState(false);
  const [toggleRoomBox, setToggleRoomBox] = useState(false);

  useEffect(() => {
    if (!socket?.instance) return;

    socket.instance.emit("getRooms")

    socket.instance.on("initialRooms", (rooms) => {
      setRooms(rooms);
    });

    socket.instance.on("updateRoom", (room) => {
      joinRoom(room);
    });

    socket.instance.on("updateRooms", (rooms) => {
      setRooms(rooms);
    });

    socket.instance.on("updateGameState", (status) => {
      status === "started" ? setToggleRoomBox(true) : setToggleRoomBox(false);
    });

    // Next two event listeners are for spectators joining game
    // Assumption: Game has started
    socket.instance.on("joiningMidGame", () => {
      setToggleRoomBox(true)
    })

    socket.instance.on("joiningEndGame", () => {
      setToggleRoomBox(true)
    })

    // Clean up listeners when the component unmounts
    return () => {
      socket.instance.off("initialRooms");
      socket.instance.off("updateRoom");
      socket.instance.off("updateRooms");
      socket.instance.off("updateGameState")
      socket.instance.off("joiningMidGame")
      socket.instance.off("joiningEndGame")
    };
  }, [socket]);

  return (
    <div className="app">
      <div className="app_header">
          <h1>Durak</h1>
          <form
            className="app_name-form"
            onSubmit={(e) => {
              e.preventDefault();
              if (name?.length > 0) socket.instance.emit("updateName", name);
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
              <h3>Room: {socket.room.roomName}</h3>
              <button style={{height: "fit-content", padding: 4}}
                onClick={() => {
                  socket.instance.emit("leaveRoom", socket?.room?.roomName)
                  setToggleRoomBox(false)
                }}
              >Leave Room</button>
            </div>
          )}
          <div style={{height: toggleRoomBox ? "90%" : "100%"}}><Commenter /></div>
        </div>
        <div className="app_game-wrapper">
          {socket && socket.room ? <Game /> : (
            <div className="app_room-wrapper">
              <h1 className="h1_left-justified">{rooms.length === 0 ? "There are no rooms...\nCreate a room to begin a game!" : "Rooms"}</h1>
              <div className="app_rooms">
                {rooms.map((room, index) => (
                  <div
                    key={index}
                    className="app_room"
                  >
                    <h1>{room.roomName}</h1>
                    <p>{room.numUsers} {room.numUsers === 1 ? "user" : "users"}</p>
                    <button onClick={() => socket.instance.emit("joinRoom", room.roomName)}>
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
