const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  maxHttpBufferSize: 3e7 // 30 MB
});

// Recupera la password dalle variabili d'ambiente di Render (fallback '25062' se non impostata)
const CHAT_PASSWORD = process.env.CHAT_PASSWORD || '25062';
const ROOM_NAME = 'stanza_segreta';

app.use(express.static(__dirname));
app.use(express.static('public'));

io.on('connection', (socket) => {
  let userNickname = '';
  let isAuthenticated = false;
  let lastMessageTime = 0; // Per il Rate Limiting

  socket.on('join', (data) => {
    if (data && data.password === CHAT_PASSWORD) {
      isAuthenticated = true;
      userNickname = (data.nickname || 'Anonimo').trim().substring(0, 20); // Taglia nickname troppo lunghi
      
      socket.join(ROOM_NAME);
      socket.emit('login_success', userNickname);

      io.to(ROOM_NAME).emit('chat message', {
        user: 'Sistema',
        type: 'system',
        text: `${userNickname} si è unito alla chat.`
      });
    } else {
      socket.emit('login_error', 'Password errata!');
    }
  });

  socket.on('chat message', (msgData) => {
    if (!isAuthenticated || !userNickname) return;

    // Anti-Spam (Rate Limit): Almeno 500ms tra un messaggio e l'altro
    const now = Date.now();
    if (now - lastMessageTime < 500) {
      return; 
    }
    lastMessageTime = now;

    if (!msgData || !msgData.content) return;

    // Se è un messaggio di testo, limita la lunghezza massima a 1000 caratteri
    let content = msgData.content;
    if (msgData.type === 'text') {
      content = content.trim().substring(0, 1000);
      if (content.length === 0) return;
    }

    io.to(ROOM_NAME).emit('chat message', {
      user: userNickname,
      type: msgData.type,
      content: content
    });
  });

  socket.on('disconnect', () => {
    if (isAuthenticated && userNickname) {
      io.to(ROOM_NAME).emit('chat message', {
        user: 'Sistema',
        type: 'system',
        text: `${userNickname} ha lasciato la chat.`
      });
    }
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server attivo sulla porta ${PORT}`);
});
