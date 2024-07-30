const express = require("express");
const http = require("http");
const socketIo = require("socket.io");
const cors = require("cors");

const app = express();
app.use(cors());

// Serve static files from the React app
app.use(express.static(path.join(__dirname, "../client/build")));

// For any other route, serve the React app's index.html
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, "../client/build", "index.html"));
});

const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "https://durak-a6f8ab3ff9e1.herokuapp.com", // Allow requests from this origin
    methods: ["GET", "POST"],
  },
});

// Adding the deck to server.js
const createDeck = require("./deck");
 
// Array of players
let players = [];
var firstPlayer;
var defender;
let winners = [];

// Count of attackers
let numAttackers = 0;

// Deck
var deck;

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
function mapRoleInPlayers() {
  players = players.map((player) => {
    let newRole = player.role; // Copy the current role
    if (player.id === firstPlayer.id) {
      newRole = "firstPlayer";
    } else if (player.id === firstPlayer.nextPlayer) {
      newRole = "defender";
      defender = player;
    } else {
      newRole = "attacker";
    }

    player.role = newRole;
    io.to(player.id).emit("changeRole", player.role);
    return player;
  });
}

function checkIfDeckEmpty() {
  if (deck.length === 0) {
    io.emit("numCardsDeck", deck.length);
    return true;
  }
  return false;
}

function handCards() {
  // Check in beginning if deck empty
  if (checkIfDeckEmpty()) return;

  // All players with < 6 cards must draw from deck until they have 6 again
  // In sequential order: firstPlayer, attackers, defender
  const firstPlayerHandSize = firstPlayer.hand.length;
  if (firstPlayerHandSize < 6) {
    // Deck may not have 6+ cards left for each player, starting with firstPlayer
    // Must check if deck has reached zero, if so, return
    const playerCards = deck.slice(0, 6 - firstPlayerHandSize);
    console.log(
      "Handing first player ",
      firstPlayer.name,
      " ",
      playerCards.length,
      " cards"
    );
    deck = deck.slice(6 - firstPlayerHandSize);
    firstPlayer.hand.push(...playerCards);
    io.to(firstPlayer.id).emit("changeHand", firstPlayer.hand);
  }

  players.forEach((player) => {
    if (player.id !== firstPlayer.id && player.id !== defender.id) {
      const attackerHandSize = player.hand.length;
      if (attackerHandSize < 6) {
        const playerCards = deck.slice(0, 6 - attackerHandSize);
        console.log("Handing", player.name, " ", playerCards.length, " cards");
        deck = deck.slice(6 - attackerHandSize);
        player.hand.push(...playerCards);
        io.to(player.id).emit("changeHand", player.hand);
      }
    }
  });

  const defenderHandSize = defender.hand.length;
  if (defenderHandSize < 6) {
    const playerCards = deck.slice(0, 6 - defenderHandSize);
    console.log("Handing", defender.name, " ", playerCards.length, " cards");
    deck = deck.slice(6 - defenderHandSize);
    defender.hand.push(...playerCards);
    io.to(defender.id).emit("changeHand", defender.hand);
  }

  io.emit("numCardsDeck", deck.length);
}

// Assume all players are present before the game starts
io.on("connection", (socket) => {
  console.log("user connected");
  players.push({
    id: socket.id,
    name: "User #" + socket.id,
    hand: [],
    role: "",
    nextPlayer: "",
    index: players.length,
  });

  // Server receives 'startGame' signal from any client socket
  socket.on("startGame", () => {
    // Case if not enough players
    if (players.length < 2 || players.length > 4)
      console.log("Game must be played with 2-4 players.");
    else {
      // Send 'gameStarted' signal to each client so that their Board renders
      io.emit("gameStarted");

      // 1. Create and shuffle the deck
      deck = shuffleDeck(createDeck());

      // 2. Deal 6 cards to the connected player
      players.forEach((player) => {
        const playerCards = deck.slice(0, 6);
        player.hand = playerCards;
        deck = deck.slice(6);
      });

      // 3. Tsarcard & tsar suit determined
      const tsarCard = deck.pop();
      io.emit("tsarCard", tsarCard);

      // 4. Place tsarcard at bottom of deck
      deck.push(tsarCard);

      // 5. Choose starting defender (first game)
      // Find player with lowest card of tsar suit in hand
      var maxRank = 14;
      var firstPlayerIndex = 0;
      players.forEach((player, index) => {
        player.hand.forEach((card) => {
          if (card.suit === tsarCard.suit) {
            if (card.rank < maxRank) {
              maxRank = card.rank;
              firstPlayerIndex = index; // Assign the index of the first play player
            }
          }
        });
      });

      players.forEach((player, index) => {
        if (index === firstPlayerIndex) {
          player.role = "firstPlayer";
          firstPlayer = player;
        } else if (index === (firstPlayerIndex + 1) % players.length) {
          player.role = "defender";
          defender = player;
        } else {
          player.role = "attacker";
        }

        player.nextPlayer = players[(index + 1) % players.length].id;
        io.to(player.id).emit("startingStats", player);
      });

      numAttackers = players.length - 1;
      io.emit("resetStates");
      io.emit("numCardsDeck", deck.length);

      winners = [];
      io.emit("leaderBoard", winners);
    }
  });

  socket.on("nextGame", () => {
    if (winners.length < 2 || winners.length > 4)
      console.log("Game must be played with 2-4 players.");
    else {
      // Send 'gameStarted' signal to each client so that their Board renders
      io.emit("gameStarted");
      
      // 1. Create and shuffle the deck
      deck = shuffleDeck(createDeck());
      
      console.log("winners ===========================", winners)
      
      players = winners.sort((a, b) => {
        if (a.index < b.index) return -1;
      });
      
      // 2. Deal 6 cards to the connected player
      players.forEach((player) => {
        const playerCards = deck.slice(0, 6);
        player.hand = playerCards;
        deck = deck.slice(6);
      });
      
      // 3. Tsarcard & tsar suit determined
      const tsarCard = deck.pop();
      io.emit("tsarCard", tsarCard);
      
      // 4. Place tsarcard at bottom of deck
      deck.push(tsarCard);
      
      // Find the index of the player with the role "durak"
      const durakIndex = players.findIndex((player) => player.role === "durak");
      
      // Update the roles
      players.forEach((player, index) => {
        if (index === durakIndex) {
          defender = player;
          player.role = "defender";
        } else if (
          index ===
          (durakIndex - 1 + players.length) % players.length
        ) {
          firstPlayer = player;
          player.role = "firstPlayer";
        } else {
          player.role = "attacker";
        }
        
        player.nextPlayer = players[(index + 1) % players.length].id;
        io.to(player.id).emit("startingStats", player);
      });
      
      console.log("PLAYERS given roles -------------------------------", players);
      console.log("DEFENDER: ", defender);
      console.log("FIRSTPLAYER:", firstPlayer);

      numAttackers = players.length - 1;
      io.emit("resetStates");
      io.emit("numCardsDeck", deck.length);

      winners = [];
      io.emit("leaderBoard", winners);
    }
  });

  // Emits signal to all clients to perform operation with card onto attackingCards state array depending on operation
  socket.on("updateAttackingCards", (attackingCards, card, operation) => {
    // Check if number of attacking cards <= defenders hand length or 6
    // If adding card
    if (operation === 1) {
      const defenderHandSize = defender.hand.length;
      const atkCardLimit = defenderHandSize < 6 ? defenderHandSize : 6;
      if (attackingCards.length < atkCardLimit) {
        attackingCards.push(card);
      }
    } else if (operation === -1) {
      attackingCards = attackingCards.filter(
        (c) => c.rank !== card.rank || c.suit !== card.suit
      );
    } else if (operation === 0) {
      attackingCards = [];
    }
    io.emit("attackingCards", attackingCards);
  });

  // Emits signal to clients to add both cards as one object in the counteredCards state array
  socket.on(
    "updateCounteredCards",
    (counteredCards, attackerCard, defenderCard, operation) => {
      if (operation === 1) {
        counteredCards.push({ attackerCard, defenderCard });
      } else if (operation === 0) {
        counteredCards = [];
      }
      io.emit("counteredCards", counteredCards);
    }
  );

  function exitGame(winner) {
    // if attacker, turn resumes
    // else turn ends
    const prevPlayer = players.find(
      (player) => player.nextPlayer === winner.id
    );
    prevPlayer.nextPlayer = winner.nextPlayer;
    
    io.to(winner.id).emit("changeRole", "winner");
    winners.push(winner);
    io.emit("leaderBoard", winners);
    
    players = players.filter((player) => player.id !== winner.id);
    numAttackers = players.length - 1

    if (winner.role === "defender") {
      firstPlayer = players.find((player) => player.id === winner.nextPlayer);
      console.log(
        "winner was defender. turn ended and now firstPlayer is ",
        firstPlayer
      );
      mapRoleInPlayers();
      io.emit("resetStates");
    }
    
    if (players.length === 1) {
      const durak = players[0];
      durak.role = "durak";
      io.to(durak.id).emit("changeRole", "durak");
      winners.push(durak);
      io.emit("leaderBoard", winners);
      players = [];
      io.emit("gameEnded");
    }
  }

  socket.on("updateHand", (playerId, card, operation) => {
    let winner;
    players = players.map((player, index) => {
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
        if (player.id === defender.nextPlayer) {
          io.to(defender.id).emit("numNextPlayerCards", player.hand.length);
        } else if (player.id === defender.id) {
          defender.hand = player.hand;
          io.emit("numDefenderCards", player.hand.length);
        } else if (player.id === firstPlayer.id) {
          firstPlayer.hand = player.hand;
        }
        io.to(playerId).emit("changeHand", player.hand);
      }
      if (player.hand.length === 0 && deck.length === 0) winner = player;
      return player;
    });
    winner && exitGame(winner);
  });

  socket.on("updateRole", (playerId, role) => {
    players = players.map((player, index) => {
      if (player.id === playerId) {
        player.role = role;
        io.to(playerId).emit("changeRole", player.role);

        if (role === "defender") {
          const nextPlayerNumCards =
            players[(index + 1) % players.length].hand.length;

          io.emit("numDefenderCards", player.hand.length);
          io.to(playerId).emit("numNextPlayerCards", nextPlayerNumCards);
        }
      }
      return player;
    });
  });

  socket.on("updateName", (socketId, name) => {
    if (!name) return;
    players = players.map((player) => {
      if (player.id === socketId) {
        player.name = name;
        io.to(socketId).emit("changeName", player.name);
      }
      return player;
    });
  });

  // Emit signal to all clients about length of defenders hand
  // Used for validation to face attackingCard
  socket.on("numDefCards", () => {
    io.emit("numDefenderCards", defender.hand.length);
  });

  // Emit signal to defender about next players hand
  // Used for validation when passing over defender role to next player
  socket.on("numNPCards", (socketId) => {
    const nextPlayer = players.find(
      (player) => player.id === defender.nextPlayer
    );
    io.to(socketId).emit("numNextPlayerCards", nextPlayer.hand.length);
  });

  // Case when defender passes card of same rank to attacking cards, passing over said cards to a determined defender (the next player)
  socket.on("passDefenderRole", (socketId) => {
    const nextDefender = players.find(
      (player) => player.id === defender.nextPlayer
    );
    players = players.map((player) => {
      if (player.id === socketId) {
        player.role = "attacker";
        io.to(socketId).emit("changeRole", player.role);
      } else if (player.id === nextDefender.id) {
        player.role = "defender";
        io.to(player.id).emit("changeRole", player.role);
        defender = nextDefender;
      }
      return player;
    });
  });

  // Case when defender fails to counter, assign firstPlayer with player next to defender, and the player after him as new defender
  // Also considered end of turn, so reset states for all clients
  socket.on("failedDefense", (socketId) => {
    // All players with < 6 cards must draw from deck until they have 6 again
    handCards();

    firstPlayer = players.find((player) => player.id === defender.nextPlayer);

    mapRoleInPlayers();

    io.emit("resetStates");
  });

  // Case when attacker decides to end their turn
  // Keep count of all attackers; they all need to emit this signal for the turn to end
  socket.on("endAttackerTurn", () => {
    numAttackers--;
    if (numAttackers === 0) {
      // All players with < 6 cards must draw from deck until they have 6 again
      // In sequential order: firstPlayer, attackers, defender
      handCards();

      // Assign current defender as next first player
      // Assign player next to current defender as next defender
      firstPlayer = defender;

      mapRoleInPlayers();

      io.emit("resetStates");
      numAttackers = players.length - 1;
    }
  });

  socket.on("disconnect", (socketId) => {
    players = players.filter((player) => player.id !== socketId);
    numAttackers = players.length - 1;
    console.log("user disconnected");
  });
});

server.listen(process.env.PORT || 4000, () => {
  console.log("listening on server");
});
