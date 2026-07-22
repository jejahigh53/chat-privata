const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static(__dirname));

io.on('connection', (socket) => {
  let userNickname = '';

  socket.on('join', (nickname) => {
    userNickname = nickname || 'Anonimo';
    io.emit('chat message', {
      user: 'Sistema',
      text: `${userNickname} si è unito alla chat.`
    });
  });

  socket.on('chat message', (msgText) => {
    if (!userNickname) return;
    io.emit('chat message', {
      user: userNickname,
      text: msgText
    });
  });

  socket.on('disconnect', () => {
    if (userNickname) {
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
