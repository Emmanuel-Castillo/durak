// src/components/Card.js
import React from 'react';

function Card({card}) {
  if (!card) return null;
  
  return (
    <img 
        src={`../assets/${card.value}_of_${card.suit}.png`} 
        alt={`${card.value} of ${card.suit}`} 
        style={{ width: 75, cursor: 'pointer'}}
  />
  )
};

export default Card;
