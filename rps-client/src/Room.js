import React, { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { io } from 'socket.io-client';
import html2canvas from 'html2canvas';
import GameHand from './GameHand';

const SERVER = process.env.REACT_APP_SERVER || 'http://localhost:4000';

export default function Room(){
  const { code } = useParams();
  const navigate = useNavigate();
  const [socket, setSocket] = useState(null);
  const [match, setMatch] = useState(null);
  const [status, setStatus] = useState('connecting...');
  const [myChoice, setMyChoice] = useState(null);
  const [roundInfo, setRoundInfo] = useState(null);
  const [final, setFinal] = useState(null);
  const roomRef = useRef();
  const name = localStorage.getItem('rps_name') || `You`;

  useEffect(() => {
    const s = io(SERVER);
    setSocket(s);

    s.on('connect', () => {
      setStatus('connected');
      if (code === 'quick') {
        s.emit('quickJoin', { name }, (res) => {
          if (res) setStatus(res.waiting ? 'waiting for opponent...' : 'matched!');
        });
      } else {
        s.emit('joinRoom', { code, name }, (res) => {
          if (res && res.error) { alert(res.error); navigate('/'); }
        });
      }
    });

    s.on('roomUpdate', (m) => {
      setMatch(m);
      if (m.status === 'waiting') setStatus('Waiting for opponent...');
      else if (m.status === 'playing') setStatus('Playing — pick a hand');
    });

    s.on('playerPlayed', () => setStatus('Opponent played'));
    s.on('roundResult', ({ roundResult, scores }) => {
      setRoundInfo({ roundResult, scores });
      setMyChoice(null);
      setStatus('Round finished');
      setTimeout(()=> setRoundInfo(null), 2200);
    });

    s.on('gameOver', (data) => {
      setFinal(data);
      setMatch(prev => prev ? ({ ...prev, status: 'finished' }) : prev);
      setStatus('Game over');
    });

    s.on('playerLeft', () => setStatus('Opponent left'));
    s.on('disconnect', () => setStatus('disconnected'));

    return () => { s.disconnect(); setSocket(null); };
  }, [code, name, navigate]);

  function actualCode() {
    if (!match) return (code === 'quick' ? null : code);
    return code === 'quick' ? match.code : code;
  }

  function onSelect(choice) {
    const c = actualCode();
    if (!c) return alert('Room code not ready yet.');
    setMyChoice(choice);
    setStatus('You played — waiting for opponent...');
    socket.emit('play', { code: c, choice }, (res) => { if (res && res.error) alert(res.error); });
  }

  function copyLink() {
    const url = window.location.href;
    navigator.clipboard.writeText(url).then(()=> alert('Link copied'));
  }
  function shareLink() {
    const url = window.location.href;
    if (navigator.share) navigator.share({ title:'Play RPS', text:'Join my RPS room', url }).catch(()=>{});
    else window.open(`https://wa.me/?text=${encodeURIComponent('Join my RPS room: ' + url)}`, '_blank');
  }
  async function saveResult(){
    if (!roomRef.current) return;
    const canvas = await html2canvas(roomRef.current);
    const a = document.createElement('a');
    a.href = canvas.toDataURL('image/jpeg', 0.92);
    a.download = 'rps-result.jpg';
    a.click();
  }
  function leave(){
    if (socket && actualCode()) socket.emit('leaveRoom', { code: actualCode() });
    navigate('/');
  }

  const players = (match && match.players) || [];
  const mySocketId = socket && socket.id;
  const myScore = match && match.scores ? (match.scores[mySocketId] || 0) : 0;
  const other = players.find(p => p.socketId !== mySocketId);
  const otherScore = other ? (match && match.scores ? (match.scores[other.socketId] || 0) : 0) : 0;
  const playing = match && match.status === 'playing';
  const finished = (match && match.status === 'finished') || final;

  return (
    <div className="card" ref={roomRef}>
      <div style={{display:'flex', justifyContent:'space-between', alignItems:'center'}}>
        <div>
          <h3 style={{margin:'0 0 6px 0'}}>Room: { actualCode() || '...' }</h3>
          <div className="small">{status}</div>
        </div>
        <div style={{display:'flex', gap:8}}>
          <button className="btn" onClick={copyLink}>Copy Link</button>
          <button className="btn" onClick={shareLink}>Share</button>
          <button className="btn" onClick={leave}>Leave</button>
        </div>
      </div>

      <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginTop:12}}>
        <div className="players">
          <div className="player-pill">{ players[0] ? players[0].name : 'Waiting...' } { players[0] && players[0].socketId === mySocketId ? '(you)' : '' }</div>
          <div className="small">vs</div>
          <div className="player-pill">{ players[1] ? players[1].name : 'Waiting...' } { players[1] && players[1].socketId === mySocketId ? '(you)' : '' }</div>
        </div>

        <div style={{display:'flex', gap:8, alignItems:'center'}}>
          <div style={{textAlign:'center'}}><div className="small">You</div><div style={{fontWeight:700, fontSize:18}}>{myScore}</div></div>
          <div style={{textAlign:'center'}}><div className="small">Opponent</div><div style={{fontWeight:700, fontSize:18}}>{otherScore}</div></div>
        </div>
      </div>

      <div style={{marginTop:16}}>
        { playing && (
          <>
            <div style={{textAlign:'center'}} className="small">Round {(match && match.round) || 1} — first to 2 wins</div>
            <div className="choices">
              <GameHand type="rock" onSelect={onSelect} disabled={!!myChoice} />
              <GameHand type="paper" onSelect={onSelect} disabled={!!myChoice} />
              <GameHand type="scissors" onSelect={onSelect} disabled={!!myChoice} />
            </div>
            <div style={{textAlign:'center', marginTop:10}} className="small">
              { myChoice ? `You chose ${myChoice}. Waiting for opponent...` : 'Click a hand to play. It will shake then reveal.' }
            </div>
          </>
        )}

        { roundInfo && (
          <div className="result-box">
            <div style={{fontWeight:700}}>Round {roundInfo.roundResult.round} result</div>
            <div style={{display:'flex', gap:10, marginTop:10, alignItems:'center'}}>
              <div style={{textAlign:'center'}}>
                <div className="small">{ roundInfo.roundResult.players[0].name }</div>
                <img src={`/images/${roundInfo.roundResult.players[0].choice}.png`} alt="" style={{width:72, height:72}} className="hand-img reveal" />
              </div>
              <div style={{flex:1}}>
                <div style={{fontWeight:700}}>
                  { roundInfo.roundResult.winner ? ((roundInfo.roundResult.winner === mySocketId) ? 'You won the round!' : (players.find(p=>p.socketId===roundInfo.roundResult.winner)||{}).name + ' won the round!') : 'Round draw' }
                </div>
                <div className="small">Scores — You: {roundInfo.scores[mySocketId] || 0} · Opponent: {roundInfo.scores[other && other.socketId] || 0}</div>
              </div>
              <div style={{textAlign:'center'}}>
                <div className="small">{ roundInfo.roundResult.players[1].name }</div>
                <img src={`/images/${roundInfo.roundResult.players[1].choice}.png`} alt="" style={{width:72, height:72}} className="hand-img reveal" />
              </div>
            </div>
          </div>
        )}

        { finished && (
          <div className="result-box" style={{marginTop:12}}>
            <h3>Game Over</h3>
            { final && final.finalWinner ? (
              <div style={{fontWeight:700}}>
                { final.finalWinner === mySocketId ? 'You won the game!' : (final.players.find(p=>p.socketId===final.finalWinner)||{}).name + ' won the game.'}
              </div>
            ) : <div style={{fontWeight:700}}>Game ended in a draw.</div> }

            <div style={{marginTop:10}}>
              <div className="small">Rounds summary:</div>
              <div style={{marginTop:8}}>
                { (final && final.rounds || (match && match.roundsHistory) || []).map(r => (
                  <div key={r.round} style={{padding:8, borderBottom:'1px solid rgba(255,255,255,0.03)'}}>
                    <div style={{fontSize:14}}>Round {r.round}</div>
                    <div className="small">{r.players[0].name} — {r.players[0].choice} vs {r.players[1].name} — {r.players[1].choice}</div>
                    <div style={{marginTop:6, fontWeight:600}}>
                      { r.winner ? ((r.winner === mySocketId) ? 'You won the round' : (players.find(p=>p.socketId===r.winner)||{}).name + ' won the round') : 'Round draw' }
                    </div>
                  </div>
                )) }
              </div>

              <div style={{marginTop:12, display:'flex', gap:8}}>
                <button className="btn" onClick={saveResult}>Save Result (JPG)</button>
                <button className="btn" onClick={()=>navigate('/')}>Back to Home</button>
              </div>
            </div>
          </div>
        ) }
      </div>
    </div>
  );
}
