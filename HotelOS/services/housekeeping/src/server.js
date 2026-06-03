require('dotenv').config();
const express = require('express');
const { createLogger } = require('@hotelos/shared');
const { testConnection, closePool } = require('./config/database');
const { initPublisher } = require('./messaging/publisher');
const { startConsumer } = require('./messaging/consumer');
const routes = require('./routes/housekeepingRoutes');

const logger = createLogger('housekeeping');
const app = express();
app.use(express.json());
app.get('/health', (_req, res) => res.json({ status: 'ok', service: 'housekeeping' }));
app.use('/', routes);
app.use((err, _req, res) => res.status(err.status || 500).json({ error: err.message }));

let rabbitConnection;

async function start() {
  await testConnection();
  const { connection } = await initPublisher(process.env.RABBITMQ_URL, logger);
  rabbitConnection = connection;
  await startConsumer(logger);
  app.listen(process.env.PORT || 3002, () => logger.info('READY on port', process.env.PORT || 3002));
}

process.on('SIGTERM', async () => { await closePool(); if (rabbitConnection) await rabbitConnection.close(); process.exit(0); });
start().catch((e) => { logger.error(e.message); process.exit(1); });

module.exports = { app };
