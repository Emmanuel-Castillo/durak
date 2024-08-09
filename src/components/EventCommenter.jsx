import React, { useEffect, useState } from 'react'
import { useSocket } from '../context/SocketContext'

function EventCommenter() {

  const socket = useSocket()
  const [comments, setComments] = useState([])
  useEffect(() => {
    socket.on("addComment", (comment) => {
      setComments([...comments, comments.length + ".) "+ comment])
    })
  }, socket)
  return (
    <><h2 style={{margin: 0, padding: 8}}>EventCommenter</h2>
    <div style={{height: "100%", overflowY: 'auto', padding: 8, boxSizing: "border-box" }}>
      {comments.map((comment, index) => {
        return (
          <p key={index} style={{borderTop: "1px solid black", 
            borderBottom: "1px solid black", 
            margin: 0 }}>{comment}</p>
        )
      })}
      </div></>
    
  )
}

export default EventCommenter