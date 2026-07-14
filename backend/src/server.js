import http from 'http';
import dotenv from 'dotenv';

import { createApp } from './app.js';
import { initSocket } from './config/socket.js';

dotenv.config();

const app = createApp();
const server = http.createServer(app);
const PORT = process.env.PORT || 3001;

initSocket(server);

server.listen(PORT, '0.0.0.0', () => {
  console.log(`Servidor Valma Inventario corriendo en puerto ${PORT}`);
});
