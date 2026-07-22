const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  maxHttpBufferSize: 3e7 // 30 MB
});

const CHAT_PASSWORD = '25062';
const ROOM_NAME = 'stanza_segreta';

app.use(express.static(__dirname));
app.use(express.static('public'));

io.on('connection', (socket) => {
  let userNickname = '';
  let isAuthenticated = false;

  socket.on('join', (data) => {
    if (data.password === CHAT_PASSWORD) {
      isAuthenticated = true;
      userNickname = data.nickname || 'Anonimo';
      
      // BLINDASTERIA: L'utente viene inserito nella stanza riservata SOLO se la password è corretta
      socket.join(ROOM_NAME);

      socket.emit('login_success', userNickname);

      // Invia il messaggio SOLO a chi si trova dentro la stanza
      io.to(ROOM_NAME).emit('chat message', {
        user: 'Sistema',
        text: `${userNickname} si è unito alla chat.`
      });
    } else {
      socket.emit('login_error', 'Password errata!');
    }
  });

  socket.on('chat message', (msgData) => {
    // Se l'utente non è autenticato o non è nella stanza, il messaggio viene ignorato
    if (!isAuthenticated || !userNickname) return;
    
    // Invia il messaggio ESCLUSIVAMENTE ai membri della stanza
    io.to(ROOM_NAME).emit('chat message', {
      user: userNickname,
      type: msgData.type,
      content: msgData.content
    });
  });

  socket.on('disconnect', () => {
    if (isAuthenticated && userNickname) {
      io.to(ROOM_NAME).emit('chat message', {
        user: 'Sistema',
        text: `${userNickname} ha lasciato la chat.`
      });
    }
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server attivo sulla porta ${PORT}`);
});
