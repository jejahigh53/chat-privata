const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http);

app.use(express.static('public')); // O la tua cartella con index.html

const PASSWORD_CORRETTA = "la_tua_password"; // Modifica con la tua password
const connectedUsers = {}; // Salviamo socket.id -> nickname

io.on('connection', (socket) => {

  socket.on('join', ({ nickname, password }) => {
    if (password !== PASSWORD_CORRETTA) {
      socket.emit('login_error');
      return;
    }

    // Salviamo l'utente connesso
    socket.nickname = nickname;
    connectedUsers[socket.id] = nickname;

    socket.emit('login_success', nickname);

    // Notifica di sistema a tutti
    io.emit('chat message', { 
      type: 'system', 
      text: `${nickname} si è unito alla chat.` 
    });

    // Invia la lista aggiornata di tutti gli utenti online
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

      // Notifica di disconnessione
      io.emit('chat message', { 
        type: 'system', 
        text: `${socket.nickname} ha lasciato la chat.` 
      });

      // Aggiorna la lista utenti per tutti i rimasti
      io.emit('update_users', Object.values(connectedUsers));
    }
  });
});

http.listen(3000, () => {
  console.log('Server avviato sulla porta 3000');
});
