const express = require("express");
const http = require("http");
const socketIo = require("socket.io");
const cors = require("cors");
const path = require("path");

const app = express();
app.use(cors());

// Serve static files from the React app
app.use(express.static(path.join(__dirname, "../build")));

// For any other route, serve the React app's index.html
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "../build", "index.html"));
});

const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin:
      "https://durak-a6f8ab3ff9e1.herokuapp.com" || "http://localhost:3000", // Allow requests from this origin
    methods: ["GET", "POST"],
  },
});

// Adding the deck to server.js
const createDeck = require("./deck");

// Array of rooms
var rooms = [];

// Shuffling deck function
function shuffleDeck(deck) {
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    // Swap deck[i] and deck[j]
    const temp = deck[i];
    deck[i] = deck[j];
    deck[j] = temp;
  }
  return deck;
}

// First player is determined before calling function for the next turn
function mapRoleInPlayers(socketRoom) {
  socketRoom.gameData.players = socketRoom.gameData.players.map((player) => {
    let newRole = player.role; // Copy the current role
    if (player.id === socketRoom.gameData.firstPlayer.id) {
      newRole = "firstPlayer";
    } else if (player.id === socketRoom.gameData.firstPlayer.nextPlayer) {
      newRole = "defender";
      socketRoom.gameData.defender = player;
    } else {
      newRole = "attacker";
    }

    player.role = newRole;
    io.to(player.id).emit("changeRole", player.role);
    io.to(socketRoom.roomName).emit(
      "updateComments",
      `[${player.name}]: Changed role to ${player.role}!`
    );
    return player;
  });
}

// Handing cards to all players with hand length < 6 before next turn begins
function handCards(socketRoom) {
  // Check in beginning if deck empty
  if (socketRoom.gameData.deck.length === 0) return;

  // All players with < 6 cards must draw from deck until they have 6 again
  // In sequential order: firstPlayer, attackers, defender
  const firstPlayerHandSize = socketRoom.gameData.firstPlayer.hand.length;
  if (firstPlayerHandSize < 6) {
    // Deck may not have 6+ cards left for each player, starting with firstPlayer
    // Must check if deck has reached zero, if so, return
    const playerCards = socketRoom.gameData.deck.slice(
      0,
      6 - firstPlayerHandSize
    );
    socketRoom.gameData.deck = socketRoom.gameData.deck.slice(
      6 - firstPlayerHandSize
    );
    socketRoom.gameData.firstPlayer.hand.push(...playerCards);
    io.to(socketRoom.gameData.firstPlayer.id).emit(
      "changeHand",
      socketRoom.gameData.firstPlayer.hand
    );
  }

  // Handing cards to all attackers (exclude firstPlayer)
  socketRoom.gameData.players.forEach((player) => {
    if (
      player.id !== socketRoom.gameData.firstPlayer.id &&
      player.id !== socketRoom.gameData.defender.id
    ) {
      const attackerHandSize = player.hand.length;
      if (attackerHandSize < 6) {
        const playerCards = socketRoom.gameData.deck.slice(
          0,
          6 - attackerHandSize
        );
        socketRoom.gameData.deck = socketRoom.gameData.deck.slice(
          6 - attackerHandSize
        );
        player.hand.push(...playerCards);
        io.to(player.id).emit("changeHand", player.hand);
      }
    }
  });

  // Finally handing cards to defender
  const defenderHandSize = socketRoom.gameData.defender.hand.length;
  if (defenderHandSize < 6) {
    const playerCards = socketRoom.gameData.deck.slice(0, 6 - defenderHandSize);
    socketRoom.gameData.deck = socketRoom.gameData.deck.slice(
      6 - defenderHandSize
    );
    socketRoom.gameData.defender.hand.push(...playerCards);
    io.to(socketRoom.gameData.defender.id).emit(
      "changeHand",
      socketRoom.gameData.defender.hand
    );
  }
  
  // Emitting change in length of deck to all clients
  io.to(socketRoom.roomName).emit(
    "numCardsDeck",
    socketRoom.gameData.deck.length
  );
}

// Utility Function: Listing all rooms
// Called whenever there is an update to rooms array:
// - Room is created/deleted
// - Number of users in a room is updated
// Purpose: Return list of rooms to all clients
function updateListRooms(socket) {
  const listRooms = rooms.map((room) => {
    return {roomName: room.roomName, numUsers: room.users.length}
  })

  if (socket) {
    socket.emit("initialRooms", listRooms)
  }
  // Update to client page change in room arrays
  io.emit("updateRooms", listRooms);
}

// Utility Function: Delivering all game data to the room
// Called whenever all game data is updated depending on certain game states or moves made by clients
function deliverAllGameData(room) {
  const newGameData = {
      gameStatus: room.gameData.gameStatus,
      deckLength: room.gameData.deck.length,
      players: room.gameData.players.map((player) => {return {id: player.id, name: player.name, handLength: player.hand.length, nextPlayer: player.nextPlayer, role: player.role}}),
      winners: room.gameData.winners,
      tsarCard: room.gameData.tsarCard,
      attackingCards: room.gameData.attackingCards,
      counteredCards: room.gameData.counteredCards
  }
  io.to(room.roomName).emit("updateGameData", newGameData)
}

function deliverUpdatedPlayersData(room, updatedPlayers) {
  var sendPlayersData
  if (room.gameData.gameStatus === "started") {
    sendPlayersData = updatedPlayers.map((player) => {
      return {
        handLength: player.hand.length,
        id: player.id,
        name: player.name,
        nextPlayer: player.nextPlayer,
        role: player.role
      }
    })
  }
  else {
    sendPlayersData = updatedPlayers.map((player) => {
      return {
        id: player.id,
        name: player.name,
      }
    })
  }

  io.to(room.roomName).emit("updateGameDataPlayers", sendPlayersData)
}

// Assume all players are present before the game starts
io.on("connection", (socket) => {
  socket.name = `User #${socket.id}`;
  console.log(socket.name, "connected");
  socket.emit("changeName", socket.name)
  
  // Emit only to the newly connected client:
  // Comment that welcomes the client to the webpage
  socket.emit("updateComments", `Welcome to Durak, ${socket.name}!`);
  // List of available rooms to join
  updateListRooms(socket)
  
  // Socket joins room that is already created
  socket.on("joinRoom", (roomName) => {
    socket.join(roomName);
    socket.room = roomName

    // Check if room already exists in array. If it doesn't, create new room and append to rooms
    // Emit update in rooms array to all clients
    var foundRoom = rooms.find((room) => room.roomName === roomName);
    const user = {
      id: socket.id,
      name: socket.name,
    };
    if (!foundRoom) {
      foundRoom = {
        roomName: roomName,
        users: [user],
        gameData: {
          gameStatus: null,
          players: [],
        },
      };
      rooms.push(foundRoom);

      socket.emit("updateRoom", foundRoom)
    } else {
      foundRoom.users.push(user);
      // Update to clients in the room about new user joining
      io.to(foundRoom.roomName).emit("updateRoomUsers", foundRoom.users);

      // Connected user receives current room data
      // Initally, send minimal gameData in case room has been made, but game hasn't started
      var socketRoom = {
        roomName: foundRoom.roomName,
        users: foundRoom.users,
        gameData: {
          gameStatus: foundRoom.gameData.gameStatus,
          players: foundRoom.gameData.players.map((player) => {return {id: player.id, name: player.name}}),
        }
      };
      
      // If game has started, send the rest of the existing game data to the new user
      if (foundRoom.gameData.gameStatus === "started") {
        socketRoom.gameData.players = foundRoom.gameData.players.map((player) => {return {name: player.name, handLength: player.hand.length, role: player.role}}),
        socketRoom.gameData.deckLength = foundRoom.gameData.deck.length
        socketRoom.gameData.winners = foundRoom.gameData.winners
        socketRoom.gameData.tsarCard = foundRoom.gameData.tsarCard
        socketRoom.gameData.attackingCards = foundRoom.gameData.attackingCards
        socketRoom.gameData.counteredCards = foundRoom.gameData.counteredCards
      }

      // Update room in client who joined
      socket.emit("updateRoom", socketRoom)
    }

    // Comment to all clients in room about new user
    io.to(roomName).emit(
      "updateComments",
      `Welcome to the room, ${socket.name}!`
    );

    // Update all clients about rooms update
    updateListRooms()
  });

  socket.on("leaveRoom", (roomName) => {
    socket.leave(roomName);
    socket.room = null;
    socket.emit("updateRoom", socket.room);

    var leftRoom = rooms.find((room) => room.roomName === roomName);
    leftRoom.users = leftRoom.users.filter((user) => user.id !== socket.id);
    if (leftRoom.users.length === 0) {
      rooms = rooms.filter((room) => room.roomName !== leftRoom.roomName);
      updateListRooms()
      return
    }

    io.to(leftRoom.roomName).emit("updateRoomUsers", leftRoom.users);
    updateListRooms()
    
    // ifPlayer may indicate the game is currently in the starting state, and could crash
    const ifPlayer = leftRoom.gameData.players.find(
      (player) => player.id === socket.id
    );

    if (ifPlayer) {
      if (leftRoom.gameData.gameStatus === "started") {
        leftRoom.gameData.gameStatus = "crashed";
        leftRoom.gameData.deck = [];
        leftRoom.gameData.players = [];
        leftRoom.gameData.winners = [];
        leftRoom.gameData.tsarCard = null;
        leftRoom.gameData.attackingCards = [];
        leftRoom.gameData.counteredCards = [];
        
        deliverAllGameData(leftRoom)
      }
      else {
        leftRoom.gameData.players = leftRoom.gameData.players.filter((player) => player.id === socket.id)
        deliverUpdatedPlayersData(leftRoom, leftRoom.gameData.players)
      }
    }
  });

  socket.on("joinPlayers", () => {
    const socketRoom = rooms.find((room) => room.roomName === socket.room);
    if (socketRoom.gameData.players.length === 4) {
      io.to(socketRoom.roomName).emit(
        "updateComments",
        "Players list is maxed out!"
      );
      return;
    }

    const foundPlayer = socketRoom.gameData.players.find((player) => player.id === socket.id);
    if (foundPlayer) {
      io.to(socketRoom.roomName).emit(
        "updateComments",
        `[${foundPlayer.name}]: Already joined the game!`
      );
      return;
    }

    const newPlayer = {
      id: socket.id,
      name: socket.name
    }
    socket.emit("setPlayer", newPlayer);

    socketRoom.gameData.players.push(newPlayer);
    io.to(socketRoom.roomName).emit("updateGameDataPlayers", socketRoom.gameData.players)
    
    io.to(socketRoom.roomName).emit(
      "updateComments",
      `[${socket.name}]: Joining game!`
    );
  });
  
  socket.on("joinSpectators", () => {
    const socketRoom = rooms.find((room) => room.roomName === socket.room);
    
    socket.emit("setPlayer", null);

    socketRoom.gameData.players = socketRoom.gameData.players.filter(
      (player) => player.id !== socket.id
    );
    io.to(socketRoom.roomName).emit("updateGameDataPlayers", socketRoom.gameData.players)

    io.to(socketRoom.roomName).emit(
      "updateComments",
      `[${socket.name}]: Am now a spectator!`
    );
  });
  
  // Server receives 'startGame' signal from any client socket
  socket.on("startGame", () => {
    const socketRoom = rooms.find((room) => room.roomName === socket.room);
    // Case if not enough players
    if (
      socketRoom.gameData.players.length < 2 ||
      socketRoom.gameData.players.length > 4
    ) {
      io.to(socketRoom.roomName).emit(
        "updateComments",
        `Game must be played with 2-4 players. Right now, there are currently ${socketRoom.gameData.players.length} players`
      );
    } else {
      io.to(socketRoom.roomName).emit("updateComments", "Game has started!!!");

      // Send 'gameStarted' signal to each client so that their Board renders
      socketRoom.gameData.gameStatus = "started";

      // 1. Create and shuffle the deck
      socketRoom.gameData.deck = shuffleDeck(createDeck());

      // 2. Deal 6 cards to the connected player
      socketRoom.gameData.players.forEach((player) => {
        const playerCards = socketRoom.gameData.deck.slice(0, 6);
        player.hand = playerCards;
        socketRoom.gameData.deck = socketRoom.gameData.deck.slice(6);
      });

      // 3. Tsarcard & tsar suit determined
      const tsarCard = socketRoom.gameData.deck.pop();
      socketRoom.gameData.tsarCard = tsarCard;
      
      // 4. Place tsarcard at bottom of deck
      socketRoom.gameData.deck.push(tsarCard);

      // 5. Choose starting defender (first game)
      // Find player with lowest card of tsar suit in hand
      var maxRank = 14;
      var firstPlayerIndex = 0;
      socketRoom.gameData.players.forEach((player, index) => {
        player.hand.forEach((card) => {
          if (card.suit === tsarCard.suit) {
            if (card.rank < maxRank) {
              maxRank = card.rank;
              firstPlayerIndex = index; // Assign the index of the first play player
            }
          }
        });
      });

      socketRoom.gameData.players.forEach((player, index) => {
        if (index === firstPlayerIndex) {
          player.role = "firstPlayer";
          socketRoom.gameData.firstPlayer = player;
        } else if (
          index ===
          (firstPlayerIndex + 1) % socketRoom.gameData.players.length
        ) {
          player.role = "defender";
          socketRoom.gameData.defender = player;
        } else {
          player.role = "attacker";
        }

        player.nextPlayer =
          socketRoom.gameData.players[
            (index + 1) % socketRoom.gameData.players.length
          ].id;

        io.to(player.id).emit("startingStats", player);
        io.to(socketRoom.roomName).emit(
          "updateComments",
          `[${player.name}]: Starting role is the ${player.role}`
        );
      });

      socketRoom.gameData.numAttackers = socketRoom.gameData.players.length - 1;
      socketRoom.gameData.attackingCards = []
      socketRoom.gameData.counteredCards = []
      socketRoom.gameData.winners = []

      deliverAllGameData(socketRoom)
    }
  });

  socket.on("nextGame", () => {
    const socketRoom = rooms.find((room) => room.roomName === socket.room);
    if (
      socketRoom.gameData.winners.length < 2 ||
      socketRoom.gameData.winners.length > 4
    ) {
      console.log("Game must be played with 2-4 players.");
      io.to(socketRoom.roomName).emit(
        "updateComments",
        `Game must be played with 2-4 players. Right now, there are currently ${socketRoom.gameData.players.length} players`
      );
    } else {
      io.to(socketRoom.roomName).emit(
        "updateComments",
        "Next game is beginning..."
      );

      // Send 'gameStarted' signal to each client so that their Board renders
      socketRoom.gameData.gameStatus = "started";

      // 1. Create and shuffle the deck
      socketRoom.gameData.deck = shuffleDeck(createDeck());

      socketRoom.gameData.players = socketRoom.gameData.winners.sort((a, b) => {
        if (a.index < b.index) return -1;
      });

      // 2. Deal 6 cards to the connected player
      socketRoom.gameData.players.forEach((player) => {
        const playerCards = socketRoom.gameData.deck.slice(0, 6);
        player.hand = playerCards;
        socketRoom.gameData.deck = socketRoom.gameData.deck.slice(6);
      });

      // 3. Tsarcard & tsar suit determined
      const tsarCard = socketRoom.gameData.deck.pop();
      socketRoom.gameData.tsarCard = tsarCard;

      // 4. Place tsarcard at bottom of deck
      socketRoom.gameData.deck.push(tsarCard);

      // Find the index of the player with the role "durak"
      const durakIndex = socketRoom.gameData.players.findIndex(
        (player) => player.role === "durak"
      );

      // Update the roles
      socketRoom.gameData.players.forEach((player, index) => {
        if (index === durakIndex) {
          socketRoom.gameData.defender = player;
          player.role = "defender";
        } else if (
          index ===
          (durakIndex - 1 + socketRoom.gameData.players.length) %
            socketRoom.gameData.players.length
        ) {
          socketRoom.gameData.firstPlayer = player;
          player.role = "firstPlayer";
        } else {
          player.role = "attacker";
        }

        player.nextPlayer =
          socketRoom.gameData.players[
            (index + 1) % socketRoom.gameData.players.length
          ].id;
        io.to(player.id).emit("startingStats", player);
        io.to(socketRoom.roomName).emit(
          "updateComments",
          `[${player.name}]: Starting role is the ${player.role}`
        );
      });

      socketRoom.gameData.numAttackers = socketRoom.gameData.players.length - 1; 
      socketRoom.gameData.winners = [];
      socketRoom.gameData.attackingCards = []
      socketRoom.gameData.counteredCards = []

      deliverAllGameData(socketRoom)
    }
  });

  socket.on("newGame", () => {
    // Reset ALL game data and reset the game status to null. Send status to all clients
    const socketRoom = rooms.find((room) => room.roomName === socket.room);

    socketRoom.gameData = {
      gameStatus: null,
      deck: [],
      players: [],
      winners: [],
      tsarCard: null,
      attackingCards: [],
      counteredCards: [],
    };

    deliverAllGameData(socketRoom)
  });

  // Emits signal to all clients to perform operation with card onto attackingCards state array depending on operation
  socket.on("updateAttackingCards", (card, operation) => {
      const socketRoom = rooms.find((room) => room.roomName === socket.room);

      var { attackingCards } = socketRoom.gameData

      // Check if number of attacking cards <= defenders hand length or 6
      // If adding card
      if (operation === 1) {
        attackingCards.push(card);
        io.to(socketRoom.roomName).emit(
          "updateComments",
          `[${socket.name}]: Dealing the ${card.value} of ${card.suit}!`
        );
      } else if (operation === -1) {
        const cardIndex = attackingCards.findIndex(
          (c) => c.rank === card.rank && c.suit === card.suit
        );
        
        if (cardIndex !== -1) {
          attackingCards.splice(cardIndex, 1);
        }
      }
      io.to(socketRoom.roomName).emit("attackingCards", attackingCards);
    }
  );

  // Emits signal to clients to add both cards as one object in the counteredCards state array
  socket.on("updateCounteredCards", (attackerCard, defenderCard) => {
      const socketRoom = rooms.find((room) => room.roomName === socket.room);

      var { counteredCards } = socketRoom.gameData
      counteredCards.push({ attackerCard, defenderCard });
      io.to(socketRoom.roomName).emit(
        "updateComments",
        `[${socketRoom.gameData.defender.name}]:</Countered with the ${defenderCard.value} of ${defenderCard.suit}!`
      );

      io.to(socketRoom.roomName).emit("counteredCards", counteredCards);
    }
  );

  function exitGame(winner, winnerPassedCards) {
    const socketRoom = rooms.find((room) => room.roomName === socket.room);

    // Set previous player's next player to current winner's next player
    const prevPlayer = socketRoom.gameData.players.find(
      (player) => player.nextPlayer === winner.id
    );
    prevPlayer.nextPlayer = winner.nextPlayer;

    io.to(winner.id).emit("setPlayer", null);
    socketRoom.gameData.winners.push(winner);
    io.to(socketRoom.roomName).emit("updateWinners", socketRoom.gameData.winners);
    io.to(socketRoom.roomName).emit(
    "updateComments",
      `[${winner.name}]: Exiting the game!`
    );

    socketRoom.gameData.players = socketRoom.gameData.players.filter(
      (player) => player.id !== winner.id
    );
    
    socketRoom.gameData.numAttackers = socketRoom.gameData.players.length - 1;
    
    if (socketRoom.gameData.players.length === 1) {
      var durak = socketRoom.gameData.players[0];
      durak.role = "durak";
      io.to(durak.id).emit("changeRole", "durak");
      io.to(socketRoom.roomName).emit(
        "updateComments",
        `[${durak.name}]: Durak! Game has ended...`
      );

      socketRoom.gameData.winners.push(durak);
      io.to(socketRoom.roomName).emit(
        "updateWinners",
        socketRoom.gameData.winners
      );
      
      socketRoom.gameData.gameStatus = "ended";
      io.to(socketRoom.roomName).emit(
        "updateGameStatus",
        socketRoom.gameData.gameStatus
      );
    }
    
    // Case if defender passed cards to nextPlayer, turn doesn't end. Otherwise, turn ends
    if (winner.role === "defender") {
      if (!winnerPassedCards) {
        socketRoom.gameData.firstPlayer = socketRoom.gameData.players.find(
          (player) => player.id === winner.nextPlayer
        );
        mapRoleInPlayers(socketRoom);
        socketRoom.gameData.attackingCards = []
        socketRoom.gameData.counteredCards = []
        deliverAllGameData(socketRoom)
      }
    }
    deliverUpdatedPlayersData(socketRoom, socketRoom.gameData.players)

  }

  socket.on("updateHand", (card, operation) => {
    const socketRoom = rooms.find((room) => room.roomName === socket.room);
    var winner;
    var winnerPassedCards = false
    socketRoom.gameData.players = socketRoom.gameData.players.map((player) => {
      if (player.id === socket.id) {
        switch (operation) {
          // Case if player sorts his cards
          case 10:
            player.hand = card
            socket.emit("sortedHand")
          // Happens if defender passes cards to nextPlayer
          // Needed to see if defender exits game in this scenario -> turn continues
          case 0:
            winnerPassedCards = true;
          case -1:
            player.hand = player.hand.filter(
              (c) => c.rank !== card.rank || c.suit !== card.suit
            );
            break;
          default:
            break;
        }
        socket.emit("changeHand", player.hand);
      }
      deliverUpdatedPlayersData(socketRoom, socketRoom.gameData.players)
      if (player.hand.length === 0 && socketRoom.gameData.deck.length === 0)
        winner = player;
      return player;
    });
    winner && exitGame(winner, winnerPassedCards);
  });

  socket.on("updateRole", (role) => {
    const socketRoom = rooms.find((room) => room.roomName === socket.room);
    socketRoom.gameData.players = socketRoom.gameData.players.map(
      (player) => {
        if (player.id === socket.id) {
          player.role = role;
          socket.emit("changeRole", player.role);
        }
        return player;
      }
    );
    deliverUpdatedPlayersData(socketRoom, socketRoom.gameData.players)
  });
  
  socket.on("updateName", (name) => {
    let temp = socket.name;
    socket.name = name;
    socket.emit("changeName", name);
    
    //check if player in a room
    if (socket.room) {
      const socketRoom = rooms.find((room) => room.roomName === socket.room);
      socketRoom.users = socketRoom.users.map((user) => {
        if (user.id === socket.id) {
          user.name = name;
        }
        return user;
      });

      // Broadcast the entire updated users array
      io.to(socketRoom.roomName).emit("updateRoomUsers", socketRoom.users);

      socketRoom.gameData.players = socketRoom.gameData.players.map(
        (player) => {
          if (player.id === socket.id)
            player.name = name;
          return player;
        }
      );
      deliverUpdatedPlayersData(socketRoom, socketRoom.gameData.players)

      io.to(socketRoom.roomName).emit(
        "updateComments",
        `[${temp}]: Change name to ${name}!`
      );
    } else {
      socket.emit("updateComments", `[${temp}]: Changed name to ${name}!`);
    }
  });

  // Case when defender passes card of same rank to attacking cards, passing over said cards to a determined defender (the next player)
  socket.on("passDefenderRole", () => {
    const socketRoom = rooms.find((room) => room.roomName === socket.room);
    const nextDefender = socketRoom.gameData.players.find(
      (player) => player.id === socketRoom.gameData.defender.nextPlayer
    );
    socketRoom.gameData.players = socketRoom.gameData.players.map((player) => {
      if (player.id === socket.id) {
        player.role = "attacker";
        socket.emit("changeRole", player.role);
      } else if (player.id === nextDefender.id) {
        io.to(socketRoom.roomName).emit(
          "updateComments",
          `[${socketRoom.gameData.defender.name}]: Passing the cards to [{player.name}]!$`
        );
        player.role = "defender";
        io.to(player.id).emit("changeRole", player.role);
        socketRoom.gameData.defender = nextDefender;
      }
      deliverUpdatedPlayersData(socketRoom, socketRoom.gameData.players)
      // io.to(socketRoom.roomName).emit("otherPlayersRoles", player.id, player.role)
      return player;
    });
  });

  // Case when defender fails to counter, assign firstPlayer with player next to defender, and the player after him as new defender
  // Also considered end of turn, so reset states for all clients
  socket.on("failedDefense", () => {
    const socketRoom = rooms.find((room) => room.roomName === socket.room);
    // All players with < 6 cards must draw from deck until they have 6 again
    io.to(socketRoom.roomName).emit(
      "updateComments",
      `[${socketRoom.gameData.defender.name}]: Failed defense!`
    );

    // Notify clients to start a 2-second timer
    io.emit("startTimer", 2)

    // Set a 2-second delay before starting the next turn
    setTimeout(() => {
      const addingCards = socketRoom.gameData.defender.hand.concat(
        socketRoom.gameData.attackingCards.concat(
          socketRoom.gameData.counteredCards.flatMap((cards) => [
            cards.attackerCard,
            cards.defenderCard,
          ])
        )
      )
      socketRoom.gameData.defender.hand = addingCards
      socket.emit("changeHand", addingCards)
      handCards(socketRoom);

      socketRoom.gameData.firstPlayer = socketRoom.gameData.players.find(
        (player) => player.id === socketRoom.gameData.defender.nextPlayer
      );
      
      mapRoleInPlayers(socketRoom);
      
      socketRoom.gameData.attackingCards = [];
      socketRoom.gameData.counteredCards = [];
      io.to(socketRoom.roomName).emit("resetStates");

      deliverAllGameData(socketRoom)
    }, 2000) 
  });

  // Case when attacker decides to end their turn
  // Keep count of all attackers; they all need to emit this signal for the turn to end
  socket.on("endAttackerTurn", (player) => {
    const socketRoom = rooms.find((room) => room.roomName === socket.room);
    socketRoom.gameData.numAttackers--;
    io.to(socketRoom.roomName).emit(
      "updateComments",
      `[${player}]: Ending their turn...`
    );
    if (socketRoom.gameData.numAttackers === 0) {
      // All players with < 6 cards must draw from deck until they have 6 again
      // In sequential order: firstPlayer, attackers, defender
      io.to(socketRoom.roomName).emit(
        "updateComments",
        "Turn has ended!"
      );
      handCards(socketRoom);
      
      // Assign current defender as next first player
      // Assign player next to current defender as next defender
      socketRoom.gameData.firstPlayer = socketRoom.gameData.defender;
      
      mapRoleInPlayers(socketRoom);
      
      socketRoom.gameData.attackingCards = []
      socketRoom.gameData.counteredCards = []
      io.to(socketRoom.roomName).emit("resetStates");
      socketRoom.gameData.numAttackers = socketRoom.gameData.players.length - 1;
      deliverAllGameData(socketRoom)
    }
  });

  socket.on("sendMessage", (message) => {
    io.to(socket.room || socket.id).emit("updateComments", `[${socket.name}]: ${message}`);
  });

  socket.on("disconnect", () => {
    if (socket.room) {
      const socketRoom = rooms.find((room) => room.roomName === socket.room);
      socketRoom.users = socketRoom.users.filter(
        (user) => user.id !== socket.id
      );
      socketRoom.numUsers = socketRoom.users.length;
      io.to(socketRoom.roomName).emit("updateRoomUsers", socketRoom.users);

      if (socketRoom.numUsers === 0) {
        rooms = rooms.filter(room => room.roomName !== socketRoom.roomName)
        
        updateListRooms()
        return
      }

      updateListRooms()

      // ifPlayer could indicate the game is currently active
      const ifPlayer = socketRoom.gameData.players.find(player => player.id === socket.id);

      if (ifPlayer) {
        socketRoom.gameData.players = socketRoom.gameData.players.filter(player => player.id !== socket.id)
        if (socketRoom.gameData.gameStatus === "started") {
          socketRoom.gameData.gameStatus = "crashed";
          socketRoom.gameData.players = [];
          socketRoom.gameData.winners = [];
          socketRoom.gameData.deck = [];
          socketRoom.gameData.tsarCard = null;
          socketRoom.gameData.attackingCards = [];
          socketRoom.gameData.counteredCards = [];
  
          deliverAllGameData(socketRoom)
        }
        else {

          updatedPlayers = socketRoom.gameData.players.map((player) => {return {id: player.id, name: player.name, handLength: player.hand.length, role: player.role}})
          
          deliverUpdatedPlayersData(socketRoom, socketRoom.gameData.players)
        }
      }
    }
    console.log(`${socket.name} disconnected`);
  });
});

server.listen(process.env.PORT || 4000, () => {
  console.log("listening on server");
});
