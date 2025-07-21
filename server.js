const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');
const dotenv = require('dotenv');
const authRoutes = require('./routes/auth');
const taskRoutes = require('./routes/tasks');
const actionRoutes = require('./routes/actions');
const connectDB = require('./config/db');

dotenv.config();
const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: 'http://localhost:5173',
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
  },
});

app.use(cors());
app.use(express.json());
app.use('/api/auth', authRoutes);
app.use('/api/tasks', taskRoutes(io)); // Pass io to taskRoutes
app.use('/api/actions', actionRoutes);

connectDB();

io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  socket.on('taskUpdate', (task) => {
    socket.broadcast.emit('taskUpdated', task);
  });

  socket.on('actionLog', (log) => {
    socket.broadcast.emit('actionLogged', log);
  });

  socket.on('conflictDetected', ({ taskId, versions }) => {
    socket.broadcast.emit('resolveConflict', { taskId, versions });
  });

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
  });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));