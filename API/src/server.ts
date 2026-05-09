import Fastify from 'fastify';
import cors from '@fastify/cors';
import { config } from './config.js';
import { connectMongo, disconnectMongo } from './db.js';
import { registerRoutes } from './routes.js';

const app = Fastify({ logger: true });

await app.register(cors, { origin: true });
await registerRoutes(app);

const start = async () => {
  await connectMongo();
  await app.listen({ port: config.port, host: '0.0.0.0' });
};

const stop = async () => {
  await app.close();
  await disconnectMongo();
};

process.on('SIGINT', async () => {
  await stop();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  await stop();
  process.exit(0);
});

start().catch(async (err) => {
  app.log.error(err);
  try {
    await stop();
  } finally {
    process.exit(1);
  }
});
