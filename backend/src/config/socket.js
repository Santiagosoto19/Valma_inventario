import { Server } from 'socket.io';

let io = null;

export function initSocket(httpServer) {
  io = new Server(httpServer, {
    cors: {
      origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
      methods: ['GET', 'POST'],
    },
  });

  io.on('connection', (socket) => {
    console.log(`Cliente conectado: ${socket.id}`);
    socket.on('disconnect', () => {
      console.log(`Cliente desconectado: ${socket.id}`);
    });
  });

  return io;
}

export function getIO() {
  if (!io) throw new Error('Socket.io no inicializado');
  return io;
}

export function emitStockAlert(product) {
  if (io) {
    io.emit('stock:alert', {
      type: 'stock_critical',
      product,
      message: `Stock crítico: ${product.name} (${product.stock} unidades restantes)`,
      timestamp: new Date().toISOString(),
    });
  }
}
