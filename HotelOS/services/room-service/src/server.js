require('dotenv').config();
const express = require('express');
const { createLogger } = require('@hotelos/shared');
const { testConnection } = require('./config/database');
const { initMessaging } = require('./messaging/messaging');
const routes = require('./routes/orderRoutes');

const logger = createLogger('room-service');
const app = express();
app.use(express.json());
app.get('/health', (_req, res) => res.json({ status: 'ok', service: 'room-service' }));
app.use('/', routes);
app.use((err, _req, res) => res.status(err.status || 500).json({ error: err.message }));

let rabbitConnection;

async function start() {
  await testConnection();
  const { connection } = await initMessaging(process.env.RABBITMQ_URL, logger);
  rabbitConnection = connection;
  app.listen(process.env.PORT || 3004, () => logger.info('READY on port', process.env.PORT || 3004));
}

process.on('SIGTERM', async () => {
  if (rabbitConnection) await rabbitConnection.close();
  process.exit(0);
});

start().catch((e) => { logger.error(e.message); process.exit(1); });

module.exports = { app };
