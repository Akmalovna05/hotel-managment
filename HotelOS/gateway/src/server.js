require('dotenv').config();
const http = require('http');
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const { Server } = require('socket.io');
const { createLogger } = require('@hotelos/shared');

const { getPool, testConnection, closePool } = require('./config/database');
const { correlationId } = require('./middleware/correlationId');
const { authenticate, authenticateSocket } = require('./middleware/auth');
const { errorHandler } = require('./middleware/errorHandler');
const authRoutes = require('./routes/authRoutes');
const { createServiceProxy } = require('./proxy/serviceProxy');
const { startRealtimeConsumer } = require('./messaging/realtimeConsumer');
const { seedStaffUsers } = require('./seed');

const logger = createLogger('gateway');
const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: { origin: process.env.CORS_ORIGIN || '*', methods: ['GET', 'POST'] },
});

io.use((socket, next) => {
  try {
    const token = socket.handshake.auth?.token;
    socket.user = authenticateSocket(token);
    next();
  } catch {
    next(new Error('Authentication failed'));
  }
});

io.on('connection', (socket) => {
  socket.join('property-default');
  logger.info('Socket connected', socket.user.username);
  socket.on('disconnect', () => logger.info('Socket disconnected', socket.user.username));
});

app.use(helmet());
app.use(cors({ origin: process.env.CORS_ORIGIN || '*', credentials: true }));
app.use(express.json());
app.use(correlationId);

app.get('/health', (_req, res) => res.json({ status: 'ok', service: 'gateway' }));

app.use('/api/auth', authRoutes);

app.use('/api/reception', authenticate, createServiceProxy(process.env.RECEPTION_SERVICE_URL, '/api/reception'));
app.use('/api/housekeeping', authenticate, createServiceProxy(process.env.HOUSEKEEPING_SERVICE_URL, '/api/housekeeping'));
app.use('/api/maintenance', authenticate, createServiceProxy(process.env.MAINTENANCE_SERVICE_URL, '/api/maintenance'));
app.use('/api/roomservice', authenticate, createServiceProxy(process.env.ROOM_SERVICE_URL, '/api/roomservice'));

app.use(errorHandler);

let rabbitResources;

async function start() {
  const required = ['JWT_SECRET', 'DATABASE_URL', 'RABBITMQ_URL', 'RECEPTION_SERVICE_URL'];
  for (const key of required) {
    if (!process.env[key]) throw new Error(`Missing env: ${key}`);
  }

  await testConnection();
  await seedStaffUsers();
  rabbitResources = await startRealtimeConsumer(io, process.env.RABBITMQ_URL, logger);

  const port = process.env.PORT || 3000;
  server.listen(port, () => logger.info(`READY on port ${port}`));
}

async function shutdown() {
  logger.info('Shutting down...');
  if (rabbitResources) {
    await rabbitResources.channel.close();
    await rabbitResources.connection.close();
  }
  await closePool();
  server.close();
  process.exit(0);
}

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

start().catch((err) => {
  logger.error('Startup failed', err.message);
  process.exit(1);
});

module.exports = { app, io };