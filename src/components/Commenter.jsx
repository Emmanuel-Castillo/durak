import "../css/Commenter.css";
import React, { useEffect, useRef, useState } from "react";
import { useSocket } from "../context/SocketContext";

function Commenter() {
  const { socket } = useSocket();
  const [comments, setComments] = useState([]);
  const [message, setMessage] = useState();
  const commentsEndRef = useRef(null);
  const [toggleRef, setToggleRef] = useState(true);

  useEffect(() => {
    if (!socket?.instance) return;
    socket.instance.on("updateComments", (comment) => {
      setComments((prevComments) => [...prevComments, comment]);
    });

    return () => {
      socket.instance.off("updateComments");
    };
  }, [socket]);

  useEffect(() => {
    commentsEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [comments]);

  return (
    <div className="commenter-wrapper">
      <div className="comments-list">
        {comments.map((comment, index) => (
          <p key={index} className="comment">
            {comment}
          </p>
        ))}
        {toggleRef && <div ref={commentsEndRef} />}
      </div>
      <div className="user-input_box">
        <div className="commenter-options">
          <button className="button_margin-bottom" onClick={() => setComments([])}>Clear</button>
          <button className={toggleRef && "btn_selected"} onClick={() => setToggleRef(!toggleRef)}>Lock</button>
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (message === "") return
            socket.instance.emit("sendMessage", message);
            setMessage("");
          }}
        >
          <input
            className="user_form-input"
            type="text"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
          />
          <button>Submit</button>
        </form>
      </div>
    </div>
  );
}

export default Commenter;
