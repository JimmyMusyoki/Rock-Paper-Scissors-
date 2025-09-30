import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
const SERVER = process.env.REACT_APP_SERVER || 'http://localhost:4000';

export default function Home(){
  const [name, setName] = useState(localStorage.getItem('rps_name') || '');
  const navigate = useNavigate();
  async function createRoom(){
    localStorage.setItem('rps_name', name);
    try {
      const res = await fetch(`${SERVER}/create`);
      const data = await res.json();
      navigate(`/room/${data.code}`);
    } catch (e) {
      alert('Could not create room — is server running?');
    }
  }
  function quick(){
    localStorage.setItem('rps_name', name);
    navigate('/room/quick');
  }
  function single(){ localStorage.setItem('rps_name', name); navigate('/single'); }

  return (
    <div style={{display:'grid', gap:12}}>
      <div className="card">
        <h2 style={{margin:'0 0 8px 0'}}>Start Playing</h2>
        <div className="small">Enter display name (optional)</div>
        <div style={{marginTop:10}}>
          <input value={name} onChange={e=>setName(e.target.value)} placeholder="Your name" style={{width:'100%', padding:10, borderRadius:8, border:'1px solid rgba(255,255,255,0.06)'}} />
        </div>
        <div style={{marginTop:12, display:'flex', gap:8}}>
          <button className="btn primary" onClick={createRoom}>Get Started & Create Link</button>
          <button className="btn" onClick={quick}>Quick Play</button>
          <button className="btn" onClick={single}>Play vs Computer</button>
        </div>
      </div>

      <div className="card">
        <h4 style={{marginTop:0}}>How it works</h4>
        <ul className="small">
          <li>Create a link and share it with a friend.</li>
          <li>Each round: click a hand (it shakes) → reveal happens after shake.</li>
          <li>Best of 3 — after game you can Save Result (JPG).</li>
        </ul>
      </div>
    </div>
  );
}
