const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http);
const path = require('path');

const PASSWORD_CORRETTA = "la_tua_password"; // Inserisci la tua password
const connectedUsers = {};

// Invece di express.static('public'), serviamo direttamente index.html dalla radice
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Se hai altri file statici nella radice (es. CSS o immagini locali), abilita questo:
app.use(express.static(__dirname));

io.on('connection', (socket) => {

  socket.on('join', ({ nickname, password }) => {
    if (password !== PASSWORD_CORRETTA) {
      socket.emit('login_error');
      return;
    }

    socket.nickname = nickname;
    connectedUsers[socket.id] = nickname;

    socket.emit('login_success', nickname);

    io.emit('chat message', { 
      type: 'system', 
      text: `${nickname} si è unito alla chat.` 
    });

    // Invia la lista utenti aggiornata a tutti
    io.emit('update_users', Object.values(connectedUsers));
  });

  socket.on('chat message', (data) => {
    if (!socket.nickname) return;
    io.emit('chat message', {
      user: socket.nickname,
      type: data.type,
      content: data.content
    });
  });

  socket.on('disconnect', () => {
    if (socket.nickname) {
      delete connectedUsers[socket.id];

      io.emit('chat message', { 
        type: 'system', 
        text: `${socket.nickname} ha lasciato la chat.` 
      });

      io.emit('update_users', Object.values(connectedUsers));
    }
  });
});

// Render e molti altri hosting passano la porta tramite variabile d'ambiente
const PORT = process.env.PORT || 3000;
http.listen(PORT, () => {
  console.log(`Server avviato sulla porta ${PORT}`);
});
