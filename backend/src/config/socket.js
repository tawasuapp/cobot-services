const { Server } = require('socket.io');

let io = null;

function initializeSocket(httpServer) {
  io = new Server(httpServer, {
    cors: {
      origin: process.env.SOCKET_CORS_ORIGIN || 'http://localhost:5173',
      methods: ['GET', 'POST'],
    },
  });

  io.on('connection', (socket) => {
    console.log(`Client connected: ${socket.id}`);

    // Join dashboard room for supervisors/admins
    socket.on('join:dashboard', () => {
      socket.join('dashboard');
      console.log(`${socket.id} joined dashboard room`);
    });

    // Join operator-specific room
    socket.on('join:operator', ({ operatorId }) => {
      socket.join(`operator:${operatorId}`);
      console.log(`${socket.id} joined operator:${operatorId} room`);
    });

    socket.on('leave:operator', ({ operatorId }) => {
      socket.leave(`operator:${operatorId}`);
    });

    // Handle location updates from IVD/mobile
    socket.on('location:update', (data) => {
      // Broadcast to dashboard
      io.to('dashboard').emit('vehicle:location', {
        vehicleId: data.entityId,
        lat: data.lat,
        lng: data.lng,
        speed: data.speed,
        heading: data.heading,
        timestamp: new Date(),
      });
    });

    socket.on('disconnect', () => {
      console.log(`Client disconnected: ${socket.id}`);
    });
  });

  return io;
}

function getIO() {
  if (!io) {
    throw new Error('Socket.io not initialized');
  }
  return io;
}

module.exports = { initializeSocket, getIO };
