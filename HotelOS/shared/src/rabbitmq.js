const amqp = require('amqplib');
const { EXCHANGE, DEAD_LETTER_EXCHANGE } = require('./events');

async function connectRabbitMQ(url, logger) {
  const connection = await amqp.connect(url);
  connection.on('error', (err) => logger.error('RabbitMQ connection error', err.message));
  connection.on('close', () => logger.warn('RabbitMQ connection closed'));
  return connection;
}

async function createChannel(connection, logger) {
  const channel = await connection.createChannel();
  await channel.assertExchange(EXCHANGE, 'topic', { durable: true });
  await channel.assertExchange(DEAD_LETTER_EXCHANGE, 'topic', { durable: true });
  await channel.prefetch(10);
  return channel;
}

async function publishEvent(channel, routingKey, payload, headers = {}) {
  const buffer = Buffer.from(JSON.stringify(payload));
  return channel.publish(EXCHANGE, routingKey, buffer, {
    persistent: true,
    contentType: 'application/json',
    headers,
    timestamp: Date.now(),
  });
}

async function assertQueueWithBinding(channel, queueName, routingKeys) {
  await channel.assertQueue(queueName, {
    durable: true,
    arguments: {
      'x-dead-letter-exchange': DEAD_LETTER_EXCHANGE,
      'x-dead-letter-routing-key': 'dead',
    },
  });
  for (const key of routingKeys) {
    await channel.bindQueue(queueName, EXCHANGE, key);
  }
}

module.exports = {
  connectRabbitMQ,
  createChannel,
  publishEvent,
  assertQueueWithBinding,
};
