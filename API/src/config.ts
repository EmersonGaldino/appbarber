import 'dotenv/config';

export const config = {
  port: Number(process.env.PORT ?? 3333),
  mongoUri: process.env.MONGODB_URI ?? 'mongodb://127.0.0.1:27017',
  mongoDbName: process.env.MONGODB_DB ?? 'appbarber',
};
