import React, { useState, useRef } from 'react';
import html2canvas from 'html2canvas';
import { useNavigate } from 'react-router-dom';
import GameHand from './GameHand';

export default function SinglePlayer(){
  const [round, setRound] = useState(1);
  const [myScore, setMyScore] = useState(0);
  const [botScore, setBotScore] = useState(0);
  const [last, setLast] = useState(null);
  const roomRef = useRef();
  const navigate = useNavigate();

  function botChoice(){
    const arr = ['rock','paper','scissors'];
    return arr[Math.floor(Math.random()*3)];
  }
  function decide(a,b){
    if (a===b) return 'draw';
    if ((a==='rock' && b==='scissors') || (a==='scissors' && b==='paper') || (a==='paper' && b==='rock')) return 'you';
    return 'bot';
  }

  function play(c){
    const b = botChoice();
    const r = decide(c,b);
    if (r==='you') setMyScore(s=>s+1);
    if (r==='bot') setBotScore(s=>s+1);
    setLast({ your:c, bot:b, result:r });
    setRound(rnd=>rnd+1);
  }

  async function saveResult(){
    if (!roomRef.current) return;
    const canvas = await html2canvas(roomRef.current);
    const link = document.createElement('a');
    link.download = 'rps-result.jpg';
    link.href = canvas.toDataURL('image/jpeg', 0.92);
    link.click();
  }

  const finished = myScore >= 2 || botScore >= 2 || round > 3;

  return (
    <div className="card" ref={roomRef}>
      <div style={{display:'flex', justifyContent:'space-between', alignItems:'center'}}>
        <div>
          <h3 style={{margin:'0 0 6px 0'}}>Play vs Computer</h3>
          <div className="small">Best of 3</div>
        </div>
        <div>
          <button className="btn" onClick={()=>navigate('/')}>Back</button>
        </div>
      </div>

      <div style={{marginTop:12}}>
        <div style={{display:'flex', gap:12}}>
          <div style={{textAlign:'center'}} className="score-card"><div className="small">You</div><div style={{fontWeight:700}}>{myScore}</div></div>
          <div style={{textAlign:'center'}} className="score-card"><div className="small">Computer</div><div style={{fontWeight:700}}>{botScore}</div></div>
        </div>

        {!finished && (
          <>
            <div className="choices" style={{marginTop:12}}>
              <GameHand type="rock" onSelect={play} />
              <GameHand type="paper" onSelect={play} />
              <GameHand type="scissors" onSelect={play} />
            </div>
            <div className="small" style={{marginTop:10}}>Round {round}</div>
          </>
        )}

        { last && (
          <div className="result-box" style={{marginTop:12}}>
            <div style={{fontWeight:700}}>
              { last.result === 'you' ? 'You won the round!' : last.result === 'bot' ? 'Computer won the round' : 'Round draw' }
            </div>
            <div className="small" style={{marginTop:6}}>{`You: ${last.your} — Bot: ${last.bot}`}</div>
          </div>
        )}

        { finished && (
          <div className="result-box" style={{marginTop:12}}>
            <h3>Game Over</h3>
            <div style={{fontWeight:700}}>
              { myScore > botScore ? 'You win!' : myScore < botScore ? 'Computer wins' : "It's a draw" }
            </div>
            <div style={{marginTop:8}}>
              <button className="btn" onClick={saveResult}>Save Result (JPG)</button>
              <button className="btn" onClick={()=>{ setRound(1); setMyScore(0); setBotScore(0); setLast(null); }}>Play again</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
