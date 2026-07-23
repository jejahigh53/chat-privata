const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const fs = require('fs');
const multer = require('multer');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  maxHttpBufferSize: 1e8 // 100 MB per evitare limiti di connessione
});

const PORT = process.env.PORT || 3000;
const ACCESS_PASSWORD = process.env.CHAT_PASSWORD || "1234";

// Assicurati che la cartella uploads esista
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir);
}

// Configurazione di Multer per salvare i file cifrati
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + '.enc'); // Salva con estensione .enc (encrypted)
  }
});

const upload = multer({ 
  storage: storage,
  limits: { fileSize: 50 * 1024 * 1024 } // Limite massimo 50MB per video
});

// Middleware
app.use(express.static(__dirname));
app.use('/uploads', express.static(uploadDir)); // Serve la cartella uploads

// Rotta POST per caricare il video cifrato
app.post('/upload', upload.single('encryptedFile'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'Nessun file caricato.' });
  }
  // Restituisce l'URL pubblico del file cifrato
  res.json({ fileUrl: `/uploads/${req.file.filename}` });
});

// Gestione utenti Socket.IO
const users = {};

io.on('connection', (socket) => {
  socket.on('join', ({ nickname, password }) => {
    if (password !== ACCESS_PASSWORD) {
      socket.emit('login_error');
      return;
    }

    users[socket.id] = nickname;
    socket.emit('login_success', nickname);
    
    io.emit('update_users', Object.values(users));
    io.emit('chat message', {
      type: 'system',
      text: `${nickname} si è unito alla chat.`
    });
  });

  socket.on('chat message', (msgData) => {
    const nickname = users[socket.id];
    if (nickname) {
      io.emit('chat message', {
        user: nickname,
        ...msgData
      });
    }
  });

  socket.on('disconnect', () => {
    const nickname = users[socket.id];
    if (nickname) {
      delete users[socket.id];
      io.emit('update_users', Object.values(users));
      io.emit('chat message', {
        type: 'system',
        text: `${nickname} ha lasciato la chat.`
      });
    }
  });
});

server.listen(PORT, () => {
  console.log(`Server attivo sulla porta ${PORT}`);
});
