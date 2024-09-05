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

// First player is determined before calling function
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
      `${player.name} is now the ${player.role}`
    );
    return player;
  });
}

function checkIfDeckEmpty(socketRoom) {
  if (socketRoom.gameData.deck.length === 0) {
    io.to(socketRoom.roomName).emit(
      "numCardsDeck",
      socketRoom.gameData.deck.length
    );
    return true;
  }
  return false;
}

function handCards(socketRoom) {
  // Check in beginning if deck empty
  if (checkIfDeckEmpty(socketRoom)) return;

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

  io.to(socketRoom.roomName).emit(
    "numCardsDeck",
    socketRoom.gameData.deck.length
  );
}

// Assume all players are present before the game starts
io.on("connection", (socket) => {
  socket.name = `User #${socket.id}`;
  console.log(socket.name, "connected");

  // Emit only to the newly connected client
  socket.emit("updateComments", `Welcome ${socket.name}!`);

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
        gameData: {
          gameStatus: null,
          deck: [],
          players: [],
          winners: [],
          tsarCard: null,
          attackingCards: [],
          counteredCards: [],
        },
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
    io.to(roomName).emit(
      "updateComments",
      `Welcome to the room, ${socket.name}!`
    );
  });

  socket.on("hasGameStarted", () => {
    const socketRoom = rooms.find((room) => room.roomName === socket.room);
    // If game has started, user is a spectator. Send game data over
    switch (socketRoom.gameData.gameStatus) {
      case "started":
        socket.emit("updateRole", "spectator")
        socket.emit("joiningMidGame", socketRoom.gameData);
        break;

      case "ended":
        socket.emit("joiningEndGame", socketRoom.gameData.winners);
        break;

      default:
        break;
    }
  });

  socket.on("leaveRoom", (roomName) => {
    socket.leave(roomName);
    socket.room = null;

    var leftRoom = rooms.find((room) => room.roomName === roomName);
    leftRoom.users = leftRoom.users.filter((user) => user.id !== socket.id);
    leftRoom.numUsers = leftRoom.users.length;

    if (leftRoom.numUsers === 0)
      rooms = rooms.filter((room) => room.roomName !== leftRoom.roomName);

    // ifPlayer indicates the game is currently active
    const ifPlayer = leftRoom.gameData.players.find(
      (player) => player.id === socket.id
    );

    if (ifPlayer && leftRoom.gameData.gameStatus === "started") {
      leftRoom.gameData.gameStatus = "crashed";
      leftRoom.gameData.players = [];
      leftRoom.gameData.winners = [];
      leftRoom.gameData.deck = [];
      leftRoom.gameData.tsarCard = null;
      leftRoom.gameData.attackingCards = [];
      leftRoom.gameData.counteredCards = [];
      io.to(leftRoom.roomName).emit(
        "updateGameState",
        leftRoom.gameData.gameStatus
      );
    }

    socket.emit("updateRoom", null);
    io.emit("updateRooms", rooms);
    io.to(leftRoom.roomName).emit("updateRoom", leftRoom);
  });

  socket.on("getRooms", () => {
    socket.emit("initialRooms", rooms);
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

    const foundPlayer = socketRoom.gameData.players.find((player) => player?.id === socket.id);
    if (foundPlayer) {
      io.to(socketRoom.roomName).emit(
        "updateComments",
        `${foundPlayer.name} has already joined the game!`
      );
      return;
    }

    socketRoom.gameData.players.push({
      id: socket.id,
      name: socket.name,
      hand: [],
      role: "",
      nextPlayer: "",
      index: socketRoom.gameData.players.length,
    });
    socket.emit("changeRole", "player");
    io.to(socketRoom.roomName).emit(
      "updateComments",
      `${socket.name} has joined the game!`
    );

    io.to(socketRoom.roomName).emit("updateRoom", socketRoom)
  });
  
  socket.on("joinSpectators", () => {
    const socketRoom = rooms.find((room) => room.roomName === socket.room);

    // IF in players array, remove it and hand the player the spectator role
    socketRoom.gameData.players = socketRoom.gameData.players.filter(
      (player) => player.id !== socket.id
    );
    socket.emit("changeRole", "spectator");
    io.to(socketRoom.roomName).emit(
      "updateComments",
      `${socket.name} is now a spectator!`
    );
    io.to(socketRoom.roomName).emit("updateRoom", socketRoom)
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
      // Send 'gameStarted' signal to each client so that their Board renders
      socketRoom.gameData.gameStatus = "started";
      io.to(socketRoom.roomName).emit(
        "updateGameState",
        socketRoom.gameData.gameStatus
      );
      io.to(socketRoom.roomName).emit("updateComments", "Game has started!!!");

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
      io.to(socketRoom.roomName).emit("tsarCard", tsarCard);

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
          `${player.name} is the ${player.role}`
        );
      });

      socketRoom.gameData.numAttackers = socketRoom.gameData.players.length - 1;
      io.to(socketRoom.roomName).emit(
        "numCardsDeck",
        socketRoom.gameData.deck.length
      );

      io.to(socketRoom.roomName).emit("otherPlayers", socketRoom.gameData.players)
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
      // Send 'gameStarted' signal to each client so that their Board renders
      socketRoom.gameData.gameStatus = "started";
      io.to(socketRoom.roomName).emit(
        "updateGameState",
        socketRoom.gameData.gameStatus
      );
      io.to(socketRoom.roomName).emit(
        "updateComments",
        "Next game is beginning..."
      );

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
      io.emit("tsarCard", tsarCard);

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
          `${player.name} is the ${player.role}`
        );
      });

      socketRoom.gameData.numAttackers = socketRoom.gameData.players.length - 1;
      io.to(socketRoom.roomName).emit("resetStates");
      io.to(socketRoom.roomName).emit(
        "numCardsDeck",
        socketRoom.gameData.deck.length
      );

      socketRoom.gameData.winners = [];
      io.to(socketRoom.roomName).emit(
        "leaderBoard",
        socketRoom.gameData.winners
      );

      io.to(socketRoom.roomName).emit("otherPlayers", socketRoom.gameData.players)
    }
  });

  socket.on("newGame", () => {
    // Reset ALL game data and reset the game status to null. Send status to client
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

    io.to(socketRoom.roomName).emit(
      "updateGameState",
      socketRoom.gameData.gameStatus
    );
    io.to(socketRoom.roomName).emit("otherPlayers", socketRoom.gameData.players)
  });

  // Emits signal to all clients to perform operation with card onto attackingCards state array depending on operation
  socket.on(
    "updateAttackingCards",
    (attackingCards, card, operation, sender) => {
      const socketRoom = rooms.find((room) => room.roomName === socket.room);
      // Check if number of attacking cards <= defenders hand length or 6
      // If adding card
      if (operation === 1) {
        const defenderHandSize = socketRoom.gameData.defender.hand.length;
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
      socketRoom.gameData.attackingCards = attackingCards;
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
          `${socketRoom.gameData.defender.name} has countered with the ${defenderCard.value} of ${defenderCard.suit}!`
        );
      } else if (operation === 0) {
        counteredCards = [];
      }
      socketRoom.gameData.counteredCards = counteredCards;
      io.to(socketRoom.roomName).emit("counteredCards", counteredCards);
    }
  );

  function exitGame(winner, winnerPassedCards) {
    const socketRoom = rooms.find((room) => room.roomName === socket.room);
    // if attacker, turn resumes
    // else turn ends
    const prevPlayer = socketRoom.gameData.players.find(
      (player) => player.nextPlayer === winner.id
    );
    prevPlayer.nextPlayer = winner.nextPlayer;

    io.to(winner.id).emit("changeRole", "winner");
    io.to(socketRoom.roomName).emit(
      "updateComments",
      `${winner.name} has exited the game!`
    );
    socketRoom.gameData.winners.push(winner);
    io.to(socketRoom.roomName).emit("leaderBoard", socketRoom.gameData.winners);

    socketRoom.gameData.players = socketRoom.gameData.players.filter(
      (player) => player.id !== winner.id
    );
    socketRoom.gameData.numAttackers = socketRoom.gameData.players.length - 1;

    // Case if defender passed cards to nextPlayer, turn doesn't end. Otherwise, turn ends
    if (winner.role === "defender") {
      if (!winnerPassedCards) {
        console.log(winner.passedCards, "turn ends");
        socketRoom.gameData.firstPlayer = socketRoom.gameData.players.find(
          (player) => player.id === winner.nextPlayer
        );
        mapRoleInPlayers(socketRoom);
        io.to(socketRoom.roomName).emit("resetStates");
      } else winner.passedCards = null;
    }

    io.to(socketRoom.roomName).emit("otherPlayers", socketRoom.gameData.players)
    

    if (socketRoom.gameData.players.length === 1) {
      const durak = socketRoom.gameData.players[0];
      durak.role = "durak";
      io.to(durak.id).emit("changeRole", "durak");
      io.to(socketRoom.roomName).emit(
        "updateComments",
        `${durak.name} is the durak! Game has ended...`
      );
      socketRoom.gameData.winners.push(durak);
      io.to(socketRoom.roomName).emit(
        "leaderBoard",
        socketRoom.gameData.winners
      );
      socketRoom.gameData.gameStatus = "ended";
      socketRoom.gameData.tsarCard = null;
      socketRoom.gameData.attackingCards = [];
      socketRoom.gameData.counteredCards = [];

      io.to(socketRoom.roomName).emit(
        "updateGameState",
        socketRoom.gameData.gameStatus
      );
    }
  }

  socket.on("updateHand", (card, operation) => {
    const socketRoom = rooms.find((room) => room.roomName === socket.room);
    var winner;
    var winnerPassedCards = false
    socketRoom.gameData.players = socketRoom.gameData.players.map((player) => {
      if (player.id === socket.id) {
        switch (operation) {
          case 1:
            player.hand = card;
            player.role === "defender" && console.log("adding cards: ", card, " to defender hand: ", player.hand)
            break;
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
        if (player.id === socketRoom.gameData.defender.nextPlayer) {
          io.to(socketRoom.gameData.defender.id).emit(
            "numNextPlayerCards",
            player.hand.length
          );
        } else if (player.id === socketRoom.gameData.defender.id) {
          socketRoom.gameData.defender.hand = player.hand;
          io.to(socketRoom.roomName).emit(
            "numDefenderCards",
            player.hand.length
          );
        } else if (player.id === socketRoom.gameData.firstPlayer.id) {
          socketRoom.gameData.firstPlayer.hand = player.hand;
        }
        socket.emit("changeHand", player.hand);
      }
      if (player.hand.length === 0 && socketRoom.gameData.deck.length === 0)
        winner = player;
      return player;
    });
    io.to(socketRoom.roomName).emit("otherPlayers", socketRoom.gameData.players)
    winner && exitGame(winner, winnerPassedCards);
  });

  socket.on("updateRole", (role) => {
    const socketRoom = rooms.find((room) => room.roomName === socket.room);
    socketRoom.gameData.players = socketRoom.gameData.players.map(
      (player, index) => {
        if (player.id === socket.id) {
          player.role = role;
          socket.emit("changeRole", player.role);

          if (role === "defender") {
            const nextPlayerNumCards =
              socketRoom.gameData.players[
                (index + 1) % socketRoom.gameData.players.length
              ].hand.length;

            io.to(socketRoom.roomName).emit(
              "numDefenderCards",
              player.hand.length
            );
            socket.emit("numNextPlayerCards", nextPlayerNumCards);
          }
        }
        return player;
      }
    );
    io.to(socketRoom.roomName).emit("otherPlayers", socketRoom.gameData.players)
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
      socketRoom.gameData.players = socketRoom.gameData.players.map(
        (player) => {
          if (player.id === socket.id)
            player.name = name;
          return player;
        }
      );
      io.to(socketRoom.roomName).emit("otherPlayers", socketRoom.gameData.players)
      io.to(socketRoom.roomName).emit(
        "updateComments",
        `${temp} is now ${name}!`
      );
      io.to(socketRoom.roomName).emit("updateRoom", socketRoom)
    } else {
      socket.emit("updateComments", `You changed your name to ${socket.name}!`);
    }
  });


  // Emit signal to all clients about length of defenders hand
  // Used for validation to face attackingCard
  socket.on("numDefCards", () => {
    const socketRoom = rooms.find((room) => room.roomName === socket.room);
    io.to(socketRoom.roomName).emit(
      "numDefenderCards",
      socketRoom.gameData.defender.hand.length
    );
  });

  // Emit signal to defender about next players hand
  // Used for validation when passing over defender role to next player
  socket.on("numNPCards", () => {
    const socketRoom = rooms.find((room) => room.roomName === socket.room);
    const nextPlayer = socketRoom.gameData.players.find(
      (player) => player.id === socketRoom.gameData.defender.nextPlayer
    );
    socket.emit("numNextPlayerCards", nextPlayer.hand.length);
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
          `${socketRoom.gameData.defender.name} has passed the cards to ${player.name}!`
        );
        player.role = "defender";
        io.to(player.id).emit("changeRole", player.role);
        socketRoom.gameData.defender = nextDefender;
      }
      return player;
    });
    io.to(socketRoom.roomName).emit("otherPlayers", socketRoom.gameData.players)
  });

  // Case when defender fails to counter, assign firstPlayer with player next to defender, and the player after him as new defender
  // Also considered end of turn, so reset states for all clients
  socket.on("failedDefense", () => {
    const socketRoom = rooms.find((room) => room.roomName === socket.room);
    // All players with < 6 cards must draw from deck until they have 6 again
    io.to(socketRoom.roomName).emit(
      "updateComments",
      `${socketRoom.gameData.defender.name} has failed their defense!`
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
  
      io.to(socketRoom.roomName).emit("resetStates");
      io.to(socketRoom.roomName).emit("otherPlayers", socketRoom.gameData.players)
    }, 2000) 
  });

  // Case when attacker decides to end their turn
  // Keep count of all attackers; they all need to emit this signal for the turn to end
  socket.on("endAttackerTurn", (player) => {
    const socketRoom = rooms.find((room) => room.roomName === socket.room);
    socketRoom.gameData.numAttackers--;
    io.to(socketRoom.roomName).emit(
      "updateComments",
      `${player} has ended their turn...`
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

      io.to(socketRoom.roomName).emit("resetStates");
      socketRoom.gameData.numAttackers = socketRoom.gameData.players.length - 1;
      io.to(socketRoom.roomName).emit("otherPlayers", socketRoom.gameData.players)
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

      if (socketRoom.numUsers === 0) {
        rooms = rooms.filter(room => room.roomName !== socketRoom.roomName)
        io.emit("updateRooms", rooms)
        return
      }

      // ifPlayer indicates the game is currently active
      const ifPlayer = socketRoom.gameData.players.find(player => player.id === socket.id);

      if (ifPlayer && socketRoom.gameData.gameStatus === "started") {
        socketRoom.gameData.gameStatus = "crashed";
        socketRoom.gameData.players = [];
        socketRoom.gameData.winners = [];
        socketRoom.gameData.deck = [];
        socketRoom.gameData.tsarCard = null;
        socketRoom.gameData.attackingCards = [];
        socketRoom.gameData.counteredCards = [];
        io.to(socketRoom.roomName).emit(
          "updateGameState",
          socketRoom.gameData.gameStatus
        );
      }
      io.to(socketRoom.roomName).emit("updateRoom", socketRoom);
    }
    console.log(`${socket.name} disconnected`);
  });
});

server.listen(process.env.PORT || 4000, () => {
  console.log("listening on server");
});
