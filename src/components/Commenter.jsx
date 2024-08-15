import React, { useEffect, useRef, useState } from 'react'
import { useSocket } from '../context/SocketContext'
import { usePlayer } from '../context/PlayerContext'

function Commenter() {
    const {socket} = useSocket()
    const [comments, setComments] = useState([])
    const [message, setMessage] = useState()
    const commentsEndRef = useRef(null)
    // const [lockEndScroll, setLockEndScroll] = useState(false) 

    useEffect(() => {
        if (!socket?.instance) return
        socket.instance.on("updateComments", (comment) => {
            setComments(prevComments => [...prevComments, comment])
        })

        return () => {
            socket.instance.off("updateComments")
        }
    }, [socket])

    // useEffect(() => {
    //     if (lockEndScroll) return
    //     commentsEndRef.current?.scrollIntoView({ behavior: "smooth" });
    // },[comments])

    return (
        <div style={{ border: "1px solid black", height: "100%" }}>
            <div
                style={{ borderBottom: "1px solid black", height: "80%", width: 400, overflowY: "auto" }}>
                {comments.map((comment, index) => (
                    <p key={index} style={{ fontSize: 12, borderBottom: "1px solid black", marginTop: 8, paddingLeft: 4, display: "flex", flexWrap: "wrap" }}>{comment}</p>
                ))}
                <div ref={commentsEndRef}/>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", padding: 8 }}>
                <div>{/* <button onClick={() => setLockEndScroll(!lockEndScroll)}>{lockEndScroll ? "Lock" : "Unlock"}</button> */}
                <button style={{marginLeft: 4}} onClick={() => setComments([])}>Clear</button></div>
                
                <form onSubmit={(e) => {
                    e.preventDefault()
                    if (message && message.length >= 0) {
                        socket.instance.emit("sendMessage", socket.instance.id, message)
                        setMessage("")
                    }
                }}><input type="text" value={message} onChange={(e) => setMessage(e.target.value)} />
                    <button style={{ marginLeft: 4 }}>Submit</button></form>

            </div>
        </div>

    )
}

export default Commenter