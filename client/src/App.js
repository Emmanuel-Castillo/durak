// src/App.js
import React from 'react';
import Game from './components/Game';
import "./css/App.css"

const App = () => {
  return (
    <div className='app'>
      <h1 className='app_title'>Durak</h1>
      <Game/>
    </div>
  );
};

export default App;
