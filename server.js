const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// Password di accesso
const CHAT_PASSWORD = '25062';

// Serve i file statici dalla cartella principale o 'public'
app.use(express.static(__dirname));
app.use(express.static('public'));

io.on('connection', (socket) => {
  let userNickname = '';
  let isAuthenticated = false;

  // Gestione tentativo di accesso
  socket.on('join', (data) => {
    if (data.password === CHAT_PASSWORD) {
      isAuthenticated = true;
      userNickname = data.nickname || 'Anonimo';
      
      // Conferma l'accesso all'utente
      socket.emit('login_success', userNickname);

      // Avvisa gli altri che è entrato
      io.emit('chat message', {
        user: 'Sistema',
        text: `${userNickname} si è unito alla chat.`
      });
    } else {
      // Notifica password errata
      socket.emit('login_error', 'Password errata!');
    }
  });

  // Gestione invio messaggi (solo se autenticato)
  socket.on('chat message', (msgText) => {
    if (!isAuthenticated || !userNickname) return;
    
    io.emit('chat message', {
      user: userNickname,
      text: msgText
    });
  });

  // Disconnessione
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
