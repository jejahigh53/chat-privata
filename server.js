const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http);
const path = require('path');

// Password gestita tramite variabile d'ambiente (es. impostata su Render)
const PASSWORD_CORRETTA = process.env.CHAT_PASSWORD;

const connectedUsers = {};

// Serviamo il file index.html posizionato nella stessa cartella di server.js
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Permette di servire eventuali altri file statici presenti nella radice
app.use(express.static(__dirname));

io.on('connection', (socket) => {

socket.on('join', ({ nickname, password }) => {
    // 1. Pulisce il nickname da spazi bianchi inutili
    const cleanNickname = nickname ? nickname.trim() : '';

    // 2. Controllo password d'accesso e nickname vuoto
    if (!cleanNickname || password !== PASSWORD_CORRETTA) {
      socket.emit('login_error');
      return;
    }

    // 3. Controllo se il nickname è già stato preso da un altro utente online
    const isNameTaken = Object.values(connectedUsers).some(
      u => u.toLowerCase() === cleanNickname.toLowerCase()
    );

    if (isNameTaken) {
      socket.emit('login_error'); // Rifiuta il login se il nome esiste già
      return;
    }

    // Se tutto è ok, salva l'utente
    socket.nickname = cleanNickname;
    connectedUsers[socket.id] = cleanNickname;

    socket.emit('login_success', cleanNickname);

    // Notifica ingresso
    io.emit('chat message', { 
      type: 'system', 
      text: `${cleanNickname} si è unito alla chat.` 
    });

    // Invia la lista aggiornata degli utenti online
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

      // Notifica uscita
      io.emit('chat message', { 
        type: 'system', 
        text: `${socket.nickname} ha lasciato la chat.` 
      });

      // Aggiorna la lista utenti per i rimasti
      io.emit('update_users', Object.values(connectedUsers));
    }
  });
});

const PORT = process.env.PORT || 3000;
http.listen(PORT, () => {
  console.log(`Server avviato sulla porta ${PORT}`);
});
