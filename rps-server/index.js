// rps-server/index.js
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');

const app = express();
app.use(cors());
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });

const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:3000';
const PORT = process.env.PORT || 4000;

const matches = {}; // in-memory room store

function generateCode() {
  return uuidv4().slice(0,6).toUpperCase();
}

app.get('/create', (req, res) => {
  const code = generateCode();
  matches[code] = {
    code,
    players: [],
    scores: {},
    round: 1,
    choices: {},
    roundsHistory: [],
    status: 'waiting'
  };
  res.json({ code, url: `${CLIENT_URL}/room/${code}` });
});

function decideWinner(cA, cB, idA, idB) {
  if (cA === cB) return null;
  if (
    (cA === 'rock' && cB === 'scissors') ||
    (cA === 'scissors' && cB === 'paper') ||
    (cA === 'paper' && cB === 'rock')
  ) return idA;
  return idB;
}

io.on('connection', (socket) => {
  console.log('socket connected', socket.id);

  socket.on('joinRoom', ({ code, name }, cb) => {
    const match = matches[code];
    if (!match) return cb && cb({ error: 'Room not found' });
    if (match.players.length >= 2) return cb && cb({ error: 'Room full' });

    match.players.push({ socketId: socket.id, name: name || `Player-${socket.id.slice(0,4)}` });
    match.scores[socket.id] = 0;
    socket.join(code);
    if (match.players.length === 2) match.status = 'playing';
    io.to(code).emit('roomUpdate', match);
    cb && cb({ ok: true, match });
  });

  socket.on('quickJoin', ({ name }, cb) => {
    const waitingCode = Object.keys(matches).find(c => matches[c].players.length === 1 && matches[c].status !== 'finished');
    if (waitingCode) {
      const m = matches[waitingCode];
      m.players.push({ socketId: socket.id, name: name || `Player-${socket.id.slice(0,4)}` });
      m.scores[socket.id] = 0;
      m.status = 'playing';
      socket.join(waitingCode);
      io.to(waitingCode).emit('roomUpdate', m);
      return cb && cb({ ok: true, code: waitingCode, match: m });
    }
    const code = generateCode();
    matches[code] = {
      code,
      players: [{ socketId: socket.id, name: name || `Player-${socket.id.slice(0,4)}` }],
      scores: { [socket.id]: 0 },
      round: 1,
      choices: {},
      roundsHistory: [],
      status: 'waiting'
    };
    socket.join(code);
    io.to(code).emit('roomUpdate', matches[code]);
    cb && cb({ ok: true, code, waiting: true, match: matches[code] });
  });

  socket.on('play', ({ code, choice }, cb) => {
    const match = matches[code];
    if (!match) return cb && cb({ error: 'Match not found' });
    if (match.status !== 'playing') return cb && cb({ error: 'Match not ready' });

    match.choices[socket.id] = choice;
    io.to(code).emit('playerPlayed', { socketId: socket.id });

    if (Object.keys(match.choices).length === match.players.length) {
      const [p0, p1] = match.players;
      const c0 = match.choices[p0.socketId];
      const c1 = match.choices[p1.socketId];

      const winnerSocketId = decideWinner(c0, c1, p0.socketId, p1.socketId);
      const roundResult = {
        round: match.round,
        players: [
          { socketId: p0.socketId, name: p0.name, choice: c0 },
          { socketId: p1.socketId, name: p1.name, choice: c1 }
        ],
        winner: winnerSocketId
      };

      match.roundsHistory.push(roundResult);
      if (winnerSocketId) match.scores[winnerSocketId] = (match.scores[winnerSocketId] || 0) + 1;

      io.to(code).emit('roundResult', { roundResult, scores: match.scores });

      match.choices = {};
      match.round++;

      const s0 = match.scores[p0.socketId] || 0;
      const s1 = match.scores[p1.socketId] || 0;
      const someoneReached2 = s0 >= 2 || s1 >= 2;
      const roundsDone = match.roundsHistory.length >= 3;
      if (someoneReached2 || roundsDone) {
        match.status = 'finished';
        let finalWinner = null;
        if (s0 > s1) finalWinner = p0.socketId;
        else if (s1 > s0) finalWinner = p1.socketId;

        io.to(code).emit('gameOver', {
          finalWinner,
          scores: match.scores,
          rounds: match.roundsHistory,
          players: match.players
        });
      } else {
        io.to(code).emit('roomUpdate', match);
      }
    }

    cb && cb({ ok: true });
  });

  socket.on('leaveRoom', ({ code }, cb) => {
    const match = matches[code];
    if (!match) return cb && cb({ error: 'Match not found' });
    match.players = match.players.filter(p => p.socketId !== socket.id);
    delete match.scores[socket.id];
    delete match.choices[socket.id];
    socket.leave(code);
    if (match.players.length === 0) delete matches[code];
    else {
      match.status = 'waiting';
      io.to(code).emit('roomUpdate', match);
      io.to(code).emit('playerLeft', { socketId: socket.id });
    }
    cb && cb({ ok: true });
  });

  socket.on('disconnect', () => {
    for (const code of Object.keys(matches)) {
      const m = matches[code];
      const idx = m.players.findIndex(p => p.socketId === socket.id);
      if (idx !== -1) {
        m.players.splice(idx, 1);
        delete m.scores[socket.id];
        delete m.choices[socket.id];
        if (m.players.length === 0) delete matches[code];
        else {
          m.status = 'waiting';
          io.to(code).emit('playerLeft', { socketId: socket.id });
          io.to(code).emit('roomUpdate', m);
        }
      }
    }
    console.log('socket disconnected', socket.id);
  });
});

server.listen(PORT, () => {
  console.log(`RPS server running on port ${PORT}`);
  console.log(`Client link base (for /create) is ${CLIENT_URL}`);
});
