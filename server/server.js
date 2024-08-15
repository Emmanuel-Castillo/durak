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
      "http://localhost:3000" || "https://durak-a6f8ab3ff9e1.herokuapp.com", // Allow requests from this origin
    methods: ["GET", "POST"],
  },
});

// Adding the deck to server.js
const createDeck = require("./deck");

// Array of rooms
var rooms = [];

// // Array of players
// var players = [];
// var firstPlayer;
// var defender;
// var winners = [];

// // Count of attackers
// var numAttackers = 0;

// Deck
var deck;

// Game started
// var gameStarted = false;

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

// Update players names
function updatePlayersNames(socketRoom) {
  const playersNames = socketRoom.players.map((player) => {
    return player.name;
  });
  io.to(socketRoom.roomName).emit("updatePlayers", playersNames);
}

// First player is determined before calling function
function mapRoleInPlayers(socketRoom) {
  socketRoom.players = socketRoom.players.map((player) => {
    let newRole = player.role; // Copy the current role
    if (player.id === socketRoom.firstPlayer.id) {
      newRole = "firstPlayer";
    } else if (player.id === socketRoom.firstPlayer.nextPlayer) {
      newRole = "defender";
      socketRoom.defender = player;
    } else {
      newRole = "attacker";
    }

    player.role = newRole;
    io.to(player.id).emit("changeRole", player.role);
    io.to(socketRoom.roomName).emit(
      "updateComments",
      `${player.name} is now the ${player.role}`
    );
    return player;
  });
}

function checkIfDeckEmpty(socketRoom) {
  if (socketRoom.deck.length === 0) {
    io.to(socketRoom.roomName).emit("numCardsDeck", socketRoom.deck.length);
    return true;
  }
  return false;
}

function handCards(socketRoom) {
  // Check in beginning if deck empty
  if (checkIfDeckEmpty(socketRoom)) return;

  // All players with < 6 cards must draw from deck until they have 6 again
  // In sequential order: firstPlayer, attackers, defender
  const firstPlayerHandSize = socketRoom.firstPlayer.hand.length;
  if (firstPlayerHandSize < 6) {
    // Deck may not have 6+ cards left for each player, starting with firstPlayer
    // Must check if deck has reached zero, if so, return
    const playerCards = socketRoom.deck.slice(0, 6 - firstPlayerHandSize);
    socketRoom.deck = socketRoom.deck.slice(6 - firstPlayerHandSize);
    socketRoom.firstPlayer.hand.push(...playerCards);
    io.to(socketRoom.firstPlayer.id).emit(
      "changeHand",
      socketRoom.firstPlayer.hand
    );
  }

  socketRoom.players.forEach((player) => {
    if (
      player.id !== socketRoom.firstPlayer.id &&
      player.id !== socketRoom.defender.id
    ) {
      const attackerHandSize = player.hand.length;
      if (attackerHandSize < 6) {
        const playerCards = socketRoom.deck.slice(0, 6 - attackerHandSize);
        socketRoom.deck = socketRoom.deck.slice(6 - attackerHandSize);
        player.hand.push(...playerCards);
        io.to(player.id).emit("changeHand", player.hand);
      }
    }
  });

  const defenderHandSize = socketRoom.defender.hand.length;
  if (defenderHandSize < 6) {
    const playerCards = socketRoom.deck.slice(0, 6 - defenderHandSize);
    socketRoom.deck = socketRoom.deck.slice(6 - defenderHandSize);
    socketRoom.defender.hand.push(...playerCards);
    io.to(socketRoom.defender.id).emit("changeHand", socketRoom.defender.hand);
  }

  io.to(socketRoom.roomName).emit("numCardsDeck", socketRoom.deck.length);
}

// Assume all players are present before the game starts
io.on("connection", (socket) => {
  socket.name = `User #${socket.id}`;
  console.log(socket.name, "connected");

  // Emit only to the newly connected client
  socket.emit("updateComments", `Welcome ${socket.name}!`);

  // if (gameStarted) {
  //   console.log(`game has started for ${socket.name}`);
  //   // io.to(socket.id).emit("gameCanStart")
  //   // io.to(socket.id).emit("gameStarted")
  //   io.to(socket.id).emit("updateRole", "spectator");
  //   io.emit(
  //     "updateComments",
  //     `${socket.name} is spectating the current game...`
  //   );
  // }

  // Socket joins room that are already created
  socket.on("joinRoom", (roomName) => {
    socket.join(roomName);
    socket.room = roomName;

    var socketRoom;

    // Check if room already exists in array. If it doesn't append to rooms and emit update to sockets
    // If it does, update numPlayers and emit update to sockets
    const foundRoom = rooms.find((room) => room.roomName === roomName);
    const user = {
      id: socket.id,
      name: socket.name,
    };
    if (!foundRoom) {
      socketRoom = {
        roomName: roomName,
        numUsers: 1,
        users: [user],
        players: [],
        winners: []
      };
      rooms.push(socketRoom);
    } else {
      rooms = rooms.map((room) => {
        if (room.roomName === roomName) {
          room.users.push(user);
          room.numUsers = room.users.length;
          socketRoom = room;
        }
        return room;
      });
    }
    io.emit("updateRooms", rooms);
    io.to(roomName).emit("updateRoom", socketRoom);
    io.to(roomName).emit("updateComments", `Welcome to the room, ${socket.name}!`)
  });

  socket.on("leaveRoom", (roomName) => {
    socket.leave(roomName);
    socket.room = null;

    var leftRoom = rooms.find((room) => room.roomName === roomName);
    console.log(leftRoom)
    leftRoom.users = leftRoom.users.filter((user) => user.id !== socket.id);
    leftRoom.numUsers = leftRoom.users.length;

    if (leftRoom.numUsers === 0)
      rooms = rooms.filter((room) => room.roomName !== roomName);

    socket.emit("updateRoom", null);
    io.emit("updateRooms", rooms);
    io.to(roomName).emit("updateRoom", leftRoom);
  });

  socket.on("getRooms", () => {
    socket.emit("initialRooms", rooms);
  });

  socket.on("joinPlayers", () => {
    const socketRoom = rooms.find((room) => room.roomName === socket.room);
    if (socketRoom.players.length === 4) {
      io.to(socketRoom.roomName).emit(
        "updateComments",
        "Players list is maxed out!"
      );
      return;
    }

    const foundPlayer = socketRoom.players.find(
      (player) => player?.id === socket.id
    );
    if (foundPlayer) {
      io.to(socketRoom.roomName).emit(
        "updateComments",
        `${foundPlayer.name} has already joined the game!`
      );
      return;
    }

    socketRoom.players.push({
      id: socket.id,
      name: socket.name,
      hand: [],
      role: "",
      nextPlayer: "",
      index: socketRoom.players.length,
    });

    socket.emit("changeRole", "player");
    io.to(socketRoom.roomName).emit(
      "updateComments",
      `${socket.name} has joined the game!`
    );

    updatePlayersNames(socketRoom);

    if (socketRoom.players.length >= 2 && socketRoom.players.length <= 4)
      io.to(socketRoom.roomName).emit("gameCanStart");
  });

  socket.on("joinSpectators", () => {
    const socketRoom = rooms.find((room) => room.roomName === socket.room);
    // IF in players array, remove it and hand the player the spectator role
    const foundPlayer = socketRoom.players.find(
      (player) => player?.id === socket.id
    );
    if (foundPlayer) {
      socketRoom.players = socketRoom.players.filter(
        (player) => player.id !== socket.id
      );
      updatePlayersNames(socketRoom);
    }
    socket.emit("changeRole", "spectator");
    io.to(socketRoom.roomName).emit(
      "updateComments",
      `${socket.name} is now a spectator!`
    );
  });

  // Server receives 'startGame' signal from any client socket
  socket.on("startGame", () => {
    const socketRoom = rooms.find((room) => room.roomName === socket.room);
    // Case if not enough players
    if (socketRoom.players.length < 2 || socketRoom.players.length > 4) {
      io.to(socketRoom.roomName).emit(
        "updateComments",
        `Game must be played with 2-4 players. Right now, there are currently ${socketRoom.players.length} players`
      );
    } else {
      // Send 'gameStarted' signal to each client so that their Board renders
      io.to(socketRoom.roomName).emit("gameStarted");
      io.to(socketRoom.roomName).emit("updateComments", "Game has started!!!");

      // 1. Create and shuffle the deck
      socketRoom.deck = shuffleDeck(createDeck());

      // 2. Deal 6 cards to the connected player
      socketRoom.players.forEach((player) => {
        const playerCards = socketRoom.deck.slice(0, 6);
        player.hand = playerCards;
        socketRoom.deck = socketRoom.deck.slice(6);
      });

      // 3. Tsarcard & tsar suit determined
      const tsarCard = socketRoom.deck.pop();
      io.to(socketRoom.roomName).emit("tsarCard", tsarCard);

      // 4. Place tsarcard at bottom of deck
      socketRoom.deck.push(tsarCard);

      // 5. Choose starting defender (first game)
      // Find player with lowest card of tsar suit in hand
      var maxRank = 14;
      var firstPlayerIndex = 0;
      socketRoom.players.forEach((player, index) => {
        player.hand.forEach((card) => {
          if (card.suit === tsarCard.suit) {
            if (card.rank < maxRank) {
              maxRank = card.rank;
              firstPlayerIndex = index; // Assign the index of the first play player
            }
          }
        });
      });

      socketRoom.players.forEach((player, index) => {
        if (index === firstPlayerIndex) {
          player.role = "firstPlayer";
          socketRoom.firstPlayer = player;
        } else if (index === (firstPlayerIndex + 1) % socketRoom.players.length) {
          player.role = "defender";
          socketRoom.defender = player;
        } else {
          player.role = "attacker";
        }

        player.nextPlayer = socketRoom.players[(index + 1) % socketRoom.players.length].id;
        io.to(player.id).emit("startingStats", player);
        io.emit("updateComments", `${player.name} is the ${player.role}`);
      });

      socketRoom.numAttackers = socketRoom.players.length - 1;
      io.to(socketRoom.roomName).emit("numCardsDeck", socketRoom.deck.length);
      updatePlayersNames(socketRoom);
    }
  });

  socket.on("nextGame", () => {
    const socketRoom = rooms.find((room) => room.roomName === socket.room);
    if (socketRoom.winners.length < 2 || socketRoom.winners.length > 4) {
      console.log("Game must be played with 2-4 players.");
      io.to(socketRoom.roomName).emit(
        "updateComments",
        `Game must be played with 2-4 players. Right now, there are currently ${socketRoom.players.length} players`
      );
    } else {
      // Send 'gameStarted' signal to each client so that their Board renders
      io.to(socketRoom.roomName).emit("gameStarted");
      io.to(socketRoom.roomName).emit(
        "updateComments",
        "Next game is beginning..."
      );

      // 1. Create and shuffle the deck
      socketRoom.deck = shuffleDeck(createDeck());

      socketRoom.players = socketRoom.winners.sort((a, b) => {
        if (a.index < b.index) return -1;
      });
      const playersNames = socketRoom.players.map((player) => {
        return player.name;
      });
      io.to(socketRoom.roomName).emit("updatePlayers", playersNames);

      // 2. Deal 6 cards to the connected player
      socketRoom.players.forEach((player) => {
        const playerCards = socketRoom.deck.slice(0, 6);
        player.hand = playerCards;
        socketRoom.deck = socketRoom.deck.slice(6);
      });

      // 3. Tsarcard & tsar suit determined
      const tsarCard = socketRoom.deck.pop();
      io.emit("tsarCard", tsarCard);

      // 4. Place tsarcard at bottom of deck
      socketRoom.deck.push(tsarCard);

      // Find the index of the player with the role "durak"
      const durakIndex = socketRoom.players.findIndex(
        (player) => player.role === "durak"
      );

      // Update the roles
      socketRoom.players.forEach((player, index) => {
        if (index === durakIndex) {
          socketRoom.defender = player;
          player.role = "defender";
        } else if (
          index ===
          (durakIndex - 1 + socketRoom.players.length) %
            socketRoom.players.length
        ) {
          socketRoom.firstPlayer = player;
          player.role = "firstPlayer";
        } else {
          player.role = "attacker";
        }

        player.nextPlayer =
          socketRoom.players[(index + 1) % socketRoom.players.length].id;
        io.to(player.id).emit("startingStats", player);
        io.to(socketRoom.roomName).emit(
          "updateComments",
          `${player.name} is the ${player.role}`
        );
      });

      socketRoom.numAttackers = socketRoom.players.length - 1;
      io.to(socketRoom.roomName).emit("resetStates");
      io.to(socketRoom.roomName).emit("numCardsDeck", socketRoom.deck.length);
      updatePlayersNames(socketRoom);

      socketRoom.winners = [];
      io.to(socketRoom.roomName).emit("leaderBoard", socketRoom.winners);
    }
  });

  // Emits signal to all clients to perform operation with card onto attackingCards state array depending on operation
  socket.on(
    "updateAttackingCards",
    (attackingCards, card, operation, sender) => {
      const socketRoom = rooms.find((room) => room.roomName === socket.room);
      // Check if number of attacking cards <= defenders hand length or 6
      // If adding card
      if (operation === 1) {
        const defenderHandSize = socketRoom.defender.hand.length;
        const atkCardLimit = defenderHandSize < 6 ? defenderHandSize : 6;
        if (attackingCards.length < atkCardLimit) {
          attackingCards.push(card);
          io.to(socketRoom.roomName).emit(
            "updateComments",
            `${sender} has dealt the ${card.value} of ${card.suit}`
          );
        }
      } else if (operation === -1) {
        attackingCards = attackingCards.filter(
          (c) => c.rank !== card.rank || c.suit !== card.suit
        );
      } else if (operation === 0) {
        attackingCards = [];
      }
      io.to(socketRoom.roomName).emit("attackingCards", attackingCards);
    }
  );

  // Emits signal to clients to add both cards as one object in the counteredCards state array
  socket.on(
    "updateCounteredCards",
    (counteredCards, attackerCard, defenderCard, operation) => {
      const socketRoom = rooms.find((room) => room.roomName === socket.room);
      if (operation === 1) {
        counteredCards.push({ attackerCard, defenderCard });
        io.to(socketRoom.roomName).emit(
          "updateComments",
          `${socketRoom.defender.name} has countered with the ${defenderCard.value} of ${defenderCard.suit}!`
        );
      } else if (operation === 0) {
        counteredCards = [];
      }
      io.to(socketRoom.roomName).emit("counteredCards", counteredCards);
    }
  );

  function exitGame(winner) {
    const socketRoom = rooms.find((room) => room.roomName === socket.room);
    // if attacker, turn resumes
    // else turn ends
    const prevPlayer = socketRoom.players.find(
      (player) => player.nextPlayer === winner.id
    );
    prevPlayer.nextPlayer = winner.nextPlayer;

    io.to(winner.id).emit("changeRole", "winner");
    io.to(socketRoom.roomName).emit(
      "updateComments",
      `${winner.name} has exited the game!`
    );
    socketRoom.winners.push(winner);
    io.to(socketRoom.roomName).emit("leaderBoard", socketRoom.winners);

    socketRoom.players = socketRoom.players.filter(
      (player) => player.id !== winner.id
    );
    socketRoom.numAttackers = socketRoom.players.length - 1;

    if (winner.role === "defender") {
      socketRoom.firstPlayer = socketRoom.players.find(
        (player) => player.id === winner.nextPlayer
      );
      mapRoleInPlayers(socketRoom);
      io.to(socketRoom.roomName).emit("resetStates");
    }

    if (socketRoom.players.length === 1) {
      const durak = socketRoom.players[0];
      durak.role = "durak";
      io.to(durak.id).emit("changeRole", "durak");
      io.to(socketRoom.roomName).emit(
        "updateComments",
        `${durak.name} is the durak! Game has ended...`
      );
      socketRoom.winners.push(durak);
      io.to(socketRoom.roomName).emit("leaderBoard", socketRoom.winners);
      socketRoom.players = [];
      io.to(socketRoom.roomName).emit("gameEnded");
    }
  }

  socket.on("updateHand", (playerId, card, operation) => {
    const socketRoom = rooms.find((room) => room.roomName === socket.room);
    let winner;
    socketRoom.players = socketRoom.players.map((player) => {
      if (player.id === playerId) {
        switch (operation) {
          case 1:
            player.hand = card;
            break;
          case -1:
            player.hand = player.hand.filter(
              (c) => c.rank !== card.rank || c.suit !== card.suit
            );
            break;
          default:
            break;
        }
        if (player.id === socketRoom.defender.nextPlayer) {
          io.to(socketRoom.defender.id).emit(
            "numNextPlayerCards",
            player.hand.length
          );
        } else if (player.id === socketRoom.defender.id) {
          socketRoom.defender.hand = player.hand;
          io.to(socketRoom.roomName).emit("numDefenderCards", player.hand.length);
        } else if (player.id === socketRoom.firstPlayer.id) {
          socketRoom.firstPlayer.hand = player.hand;
        }
        io.to(playerId).emit("changeHand", player.hand);
      }
      if (player.hand.length === 0 && socketRoom.deck.length === 0)
        winner = player;
      return player;
    });
    winner && exitGame(winner);
  });

  socket.on("updateRole", (playerId, role) => {
    const socketRoom = rooms.find((room) => room.roomName === socket.room);
    socketRoom.players = socketRoom.players.map((player, index) => {
      if (player.id === playerId) {
        player.role = role;
        io.to(playerId).emit("changeRole", player.role);

        if (role === "defender") {
          const nextPlayerNumCards =
            socketRoom.players[(index + 1) % socketRoom.players.length].hand
              .length;

          io.to(socketRoom.roomName).emit(
            "numDefenderCards",
            socketRoom.player.hand.length
          );
          io.to(playerId).emit("numNextPlayerCards", nextPlayerNumCards);
        }
      }
      return player;
    });
  });

  socket.on("updateName", (name) => {
    if (!name) return;
    let temp = socket.name;
    socket.name = name;
    if (socket.room) {
      const socketRoom = rooms.find((room) => room.roomName === socket.room);
      socketRoom.users = socketRoom.users.map((user) => {
        if (user.id === socket.id) {
          user.name = name;
          socket.emit("changeName", user.name);
        }
        return user;
      });
      socketRoom.players = socketRoom.players.map((player) => {
        if (player.id === socket.id) {
          player.name = name;
          socket.emit("changeName", player.name);
        }
        return player;
      });
      updatePlayersNames(socketRoom);
      io.to(socketRoom.roomName).emit("updateRoom", socketRoom)
      io.to(socketRoom.roomName).emit("updateComments", `${temp} is now ${name}!`);
    }
    else {
      socket.emit("updateComments", `You changed your name to ${socket.name}!`)
    }
  });

  // Emit signal to all clients about length of defenders hand
  // Used for validation to face attackingCard
  socket.on("numDefCards", () => {
    const socketRoom = rooms.find((room) => room.roomName === socket.room);
    io.to(socketRoom.roomName).emit(
      "numDefenderCards",
      socketRoom.defender.hand.length
    );
  });

  // Emit signal to defender about next players hand
  // Used for validation when passing over defender role to next player
  socket.on("numNPCards", () => {
    const socketRoom = rooms.find((room) => room.roomName === socket.room);
    const nextPlayer = socketRoom.players.find(
      (player) => player.id === socketRoom.defender.nextPlayer
    );
    socket.emit("numNextPlayerCards", nextPlayer.hand.length);
  });

  // Case when defender passes card of same rank to attacking cards, passing over said cards to a determined defender (the next player)
  socket.on("passDefenderRole", () => {
    const socketRoom = rooms.find((room) => room.roomName === socket.room);
    const nextDefender = socketRoom.players.find(
      (player) => player.id === socketRoom.defender.nextPlayer
    );
    socketRoom.players = socketRoom.players.map((player) => {
      if (player.id === socket.id) {
        player.role = "attacker";
        socket.emit("changeRole", player.role);
      } else if (player.id === nextDefender.id) {
        io.to(socketRoom.roomName).emit(
          "updateComments",
          `${socketRoom.defender.name} has passed the cards to ${player.name}!`
        );
        player.role = "defender";
        io.to(player.id).emit("changeRole", player.role);
        socketRoom.defender = nextDefender;
      }
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
      `${socketRoom.defender.name} has failed their defense! Beginning next turn...`
    );
    handCards(socketRoom);

    socketRoom.firstPlayer = socketRoom.players.find(
      (player) => player.id === socketRoom.defender.nextPlayer
    );

    mapRoleInPlayers(socketRoom);

    io.to(socketRoom.roomName).emit("resetStates");
  });

  // Case when attacker decides to end their turn
  // Keep count of all attackers; they all need to emit this signal for the turn to end
  socket.on("endAttackerTurn", (player) => {
    const socketRoom = rooms.find((room) => room.roomName === socket.room);
    socketRoom.numAttackers--;
    io.to(socketRoom.roomName).emit(
      "updateComments",
      `${player} has ended their turn...`
    );
    if (socketRoom.numAttackers === 0) {
      // All players with < 6 cards must draw from deck until they have 6 again
      // In sequential order: firstPlayer, attackers, defender
      io.to(socketRoom.roomName).emit(
        "updateComments",
        "Turn has ended! Beginning next turn..."
      );
      handCards(socketRoom);

      // Assign current defender as next first player
      // Assign player next to current defender as next defender
      socketRoom.firstPlayer = socketRoom.defender;

      mapRoleInPlayers(socketRoom);

      io.to(socketRoom.roomName).emit("resetStates");
      socketRoom.numAttackers = socketRoom.players.length - 1;
    }
  });

  socket.on("sendMessage", (sender, message) => {
    const socketRoom = rooms.find((room) => room.roomName === socket.room);
    const player = socketRoom.players.find((player) => player.id === sender);
    io.to(socketRoom.roomName).emit(
      "updateComments",
      `[${player.name || socket.name}]: ${message}`
    );
  });

  socket.on("disconnect", () => {
    if (socket.room) {
      const socketRoom = rooms.find((room) => room.roomName === socket.room);
      socketRoom.users = socketRoom.users.filter(
        (user) => user.id !== socket.id
      );
      socketRoom.numUsers = socketRoom.users.length
      socketRoom.players = socketRoom.players.filter(
        (player) => player.id !== socket.id
      );
      socketRoom.numAttackers = socketRoom.users.length - 1;
      const playersNames = socketRoom.players.map((player) => {
        return player.name;
      });
      io.to(socketRoom.roomName).emit("updateRoom", socketRoom)
      io.to(socketRoom.roomName).emit("updatePlayers", playersNames);
    }
    console.log(`${socket.name} disconnected`);
  });
});

server.listen(4000 || process.env.PORT, () => {
  console.log("listening on server");
});
