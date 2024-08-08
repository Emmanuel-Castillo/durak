// src/deck.js
const suits = ['hearts', 'diamonds', 'clubs', 'spades'];
const values = [
  { value: '6', rank: 6 },
  { value: '7', rank: 7 },
  { value: '8', rank: 8 },
  { value: '9', rank: 9 },
  { value: '10', rank: 10 },
  { value: 'J', rank: 11 },
  { value: 'Q', rank: 12 },
  { value: 'K', rank: 13 },
  { value: 'A', rank: 14 },
];

const createDeck = () => {
  let deck = [];
  for (let suit of suits) {
    for (let val of values) {
      deck.push({ suit, value: val.value, rank: val.rank });
    }
  }
  return deck;
};

module.exports = createDeck;
