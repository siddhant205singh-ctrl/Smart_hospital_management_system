const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
require('dotenv').config();
const http = require('http');
const { Server } = require('socket.io');
const app = require('./app');
const connectDB = require('./config/db');
const { initSocketIO } = require('./sockets/socketHandler');

const PORT = process.env.PORT || 5000;

// Connect to MongoDB
connectDB();

const server = http.createServer(app);

// Initialize Socket.IO with flexible CORS for Vercel & local dev
const io = new Server(server, {
  cors: {
    origin: (origin, callback) => {
      callback(null, true); // Allow incoming web socket handshakes from Vercel & local
    },
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    credentials: true
  }
});

// Attach io instance to express app so controllers can emit real-time events
app.set('io', io);

// Initialize socket rooms and listeners
initSocketIO(io);

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`\n❌ [SmartCare Error] Port ${PORT} is already in use by another running process.`);
    console.error(`To free port ${PORT} on Windows PowerShell, run:`);
    console.error(`  Stop-Process -Id (Get-NetTCPConnection -LocalPort ${PORT}).OwningProcess -Force\n`);
  } else {
    console.error('\n❌ Server error:', err);
  }
  process.exit(1);
});

server.listen(PORT, () => {
  console.log(`\n🏥 [SmartCare Server] Running on http://localhost:${PORT}`);
  console.log(`⚡ [Socket.IO] Gateway ready for real-time queue streaming\n`);
});
