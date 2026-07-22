const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);

// Limite aumentato a 30 MB sul server
const io = new Server(server, {
  maxHttpBufferSize: 3e7 // 30 MB
});

const CHAT_PASSWORD = '25062';

app.use(express.static(__dirname));
app.use(express.static('public'));

io.on('connection', (socket) => {
  let userNickname = '';
  let isAuthenticated = false;

  socket.on('join', (data) => {
    if (data.password === CHAT_PASSWORD) {
      isAuthenticated = true;
      userNickname = data.nickname || 'Anonimo';
      
      socket.emit('login_success', userNickname);

      io.emit('chat message', {
        user: 'Sistema',
        text: `${userNickname} si è unito alla chat.`
      });
    } else {
      socket.emit('login_error', 'Password errata!');
    }
  });

  socket.on('chat message', (msgData) => {
    if (!isAuthenticated || !userNickname) return;
    
    io.emit('chat message', {
      user: userNickname,
      type: msgData.type,
      content: msgData.content
    });
  });

  socket.on('disconnect', () => {
    if (isAuthenticated && userNickname) {
      io.emit('chat message', {
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
