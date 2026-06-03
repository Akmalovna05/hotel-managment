require('dotenv').config();
const express = require('express');
const { createLogger } = require('@hotelos/shared');
const { testConnection, closePool } = require('./config/database');
const { initPublisher } = require('./messaging/publisher');
const { startConsumer } = require('./messaging/consumer');
const receptionRoutes = require('./routes/receptionRoutes');

const logger = createLogger('reception');
const app = express();

app.use(express.json());
app.get('/health', (_req, res) => res.json({ status: 'ok', service: 'reception' }));
app.use('/', receptionRoutes);

app.use((err, _req, res, _next) => {
  logger.error(err.message);
  res.status(err.status || 500).json({ error: err.message || 'Internal server error' });
});

let rabbitConnection;

async function start() {
  if (!process.env.DATABASE_URL || !process.env.RABBITMQ_URL) {
    throw new Error('Missing DATABASE_URL or RABBITMQ_URL');
  }
  await testConnection();
  const { connection } = await initPublisher(process.env.RABBITMQ_URL, logger);
  rabbitConnection = connection;
  await startConsumer(logger);

  const port = process.env.PORT || 3001;
  app.listen(port, () => logger.info(`READY on port ${port}`));
}

async function shutdown() {
  await closePool();
  if (rabbitConnection) await rabbitConnection.close();
  process.exit(0);
}

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

start().catch((err) => {
  logger.error('Startup failed', err.message);
  process.exit(1);
});

module.exports = { app };
