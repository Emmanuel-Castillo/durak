import { ReactFlow, Controls, Background } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import React, { useEffect, useState } from "react";
import { useSocket } from "../context/SocketContext";

function PlayerGraph() {
  const [players, setPlayers] = useState([]);

  const [nodes, setNodes] = useState([]);
  const [edges, setEdges] = useState([]);

  const {socket} = useSocket();

  useEffect(() => {
    if (!socket.instance) return

    socket.instance.emit("hasGameStarted")
  }, [])

  useEffect(() => {
    if (!socket?.instance) return;

    socket.instance.on("updatePlayers", (players) => {
      setPlayers(players);
    });

    socket.instance.on("joiningMidGame", (gameData) => {
      const playersNames = gameData.players.map((player) => {return player.name})
      setPlayers(playersNames)
    })
  }, [socket]);

  useEffect(() => {
    const playerCount = players.length;
    const nodeStyles = {
      width: 100,
      border: "1px solid black",
      textAlign: "center",
      padding: 8,
      whiteSpace: "nowrap",
      overflow: "hidden",
      textOverflow: "ellipsis",
    };

    let calculatedNodes = [];
    let calculatedEdges = [];

    if (playerCount === 2) {
      // Vertical Line
      const verticalLinePositions = [
        { x: 250, y: 50 },
        { x: 250, y: 200 },
      ];
      calculatedNodes = players.map((player, index) => ({
        id: `player-${index}`,
        position: verticalLinePositions[index],
        data: { label: player },
        style: nodeStyles,
      }));
    } else if (playerCount === 3) {
      // Triangle
      const trianglePositions = [
        { x: 250, y: 50 },
        { x: 150, y: 200 },
        { x: 350, y: 200 },
      ];
      calculatedNodes = players.map((player, index) => ({
        id: `player-${index}`,
        position: trianglePositions[index],
        data: { label: player },
        style: nodeStyles,
      }));

    } else if (playerCount === 4) {
      // Square
      const squarePositions = [
        { x: 150, y: 50 },
        { x: 350, y: 50 },
        { x: 350, y: 200 },
        { x: 150, y: 200 },
      ];

      calculatedNodes = players.map((player, index) => ({
        id: `player-${index}`,
        position: squarePositions[index],
        data: { label: player },
        style: nodeStyles,
      }));
    }
    calculatedEdges = players.map((_, index) => ({
      id: `edge-${index}`,
      source: `player-${index}`,
      target: `player-${(index + 1) % playerCount}`,
      style: {}
    }));

    setNodes(calculatedNodes);
    setEdges(calculatedEdges);
  }, [players]);

  return (
    <div style={{width: 500}}>
        <div style={{height: "100%", border: "1px solid black" }}>
          <ReactFlow
            nodes={nodes}
            edges={edges}
            fitView={true}
            nodesDraggable={false}
            elementsSelectable={false}
            panOnDrag={false}
            zoomOnScroll={false}
            zoomOnDoubleClick={false}
            >
            <Background />
          </ReactFlow>
        </div></div>
      );
}

export default PlayerGraph;
