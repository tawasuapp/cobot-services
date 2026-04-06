const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');

let io = null;

function initializeSocket(httpServer) {
  const allowedOrigins = (process.env.ALLOWED_ORIGINS || 'https://admin.cobot.qa,https://app.cobot.qa').split(',');

  io = new Server(httpServer, {
    cors: {
      origin: allowedOrigins,
      methods: ['GET', 'POST'],
    },
  });

  // Authenticate socket connections via JWT
  io.use((socket, next) => {
    const token = socket.handshake.auth?.token || socket.handshake.query?.token;
    if (!token) {
      return next(new Error('Authentication required'));
    }
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      socket.userId = decoded.id;
      socket.userRole = decoded.role;
      next();
    } catch {
      next(new Error('Invalid token'));
    }
  });

  io.on('connection', (socket) => {
    // Auto-join user's own room
    socket.join(`user:${socket.userId}`);

    // Only admins/supervisors can join dashboard room
    socket.on('join:dashboard', () => {
      if (['admin', 'supervisor'].includes(socket.userRole)) {
        socket.join('dashboard');
      }
    });

    // Operators can only join their own room
    socket.on('join:operator', ({ operatorId }) => {
      if (socket.userId === operatorId || ['admin', 'supervisor'].includes(socket.userRole)) {
        socket.join(`operator:${operatorId}`);
      }
    });

    socket.on('leave:operator', ({ operatorId }) => {
      socket.leave(`operator:${operatorId}`);
    });

    socket.on('location:update', (data) => {
      io.to('dashboard').emit('vehicle:location', {
        vehicleId: data.entityId,
        lat: data.lat,
        lng: data.lng,
        speed: data.speed,
        heading: data.heading,
        timestamp: new Date(),
      });
    });

    socket.on('disconnect', () => {});
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
