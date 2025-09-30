import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Home from './Home';
import Room from './Room';
import SinglePlayer from './SinglePlayer';

export default function App(){
  return (
    <BrowserRouter>
      <div className="app">
        <div className="header">
          <div style={{display:'flex', gap:12, alignItems:'center'}}>
            <div className="logo">RPS</div>
            <div>
              <div style={{fontWeight:700}}>Rock · Paper · Scissors</div>
              <div className="small">Shareable link · Best of 3 · Save result</div>
            </div>
          </div>
          <div className="small">No accounts</div>
        </div>

        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/room/:code" element={<Room />} />
          <Route path="/room/quick" element={<Room />} />
          <Route path="/single" element={<SinglePlayer />} />
        </Routes>
      </div>
    </BrowserRouter>
  );
}
