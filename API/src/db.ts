import { MongoClient, type Collection, type Db } from 'mongodb';
import { config } from './config.js';
import { buildInitialSeed } from './seed.js';
import { RESOURCE_NAMES, type AppData, type ResourceName } from './types.js';

let client: MongoClient | null = null;
let db: Db | null = null;

export async function connectMongo(): Promise<Db> {
  if (db) return db;
  client = new MongoClient(config.mongoUri);
  await client.connect();
  db = client.db(config.mongoDbName);
  await ensureSeedData();
  return db;
}

export async function disconnectMongo(): Promise<void> {
  if (!client) return;
  await client.close();
  client = null;
  db = null;
}

function ensureDb(): Db {
  if (!db) throw new Error('MongoDB ainda não conectado');
  return db;
}

export function getCollection<T extends { id: string }>(name: ResourceName): Collection<T> {
  return ensureDb().collection<T>(name);
}

export async function getAppData(): Promise<AppData> {
  const collections = RESOURCE_NAMES.map((name) => getCollection<any>(name));
  const [users, services, professionals, products, appointments, transactions, campaigns] =
    await Promise.all(collections.map((c) => c.find({}, { projection: { _id: 0 } }).toArray()));

  return {
    users,
    services,
    professionals,
    products,
    appointments,
    transactions,
    campaigns,
  };
}

export async function clearAppData(): Promise<void> {
  await Promise.all(
    RESOURCE_NAMES.map((name) => getCollection(name).deleteMany({}))
  );
}

async function ensureSeedData(): Promise<void> {
  const usersCol = getCollection<{ id: string }>('users');
  const count = await usersCol.countDocuments();
  if (count > 0) return;

  const seed = buildInitialSeed();
  await Promise.all(
    RESOURCE_NAMES.map(async (name) => {
      const docs = seed[name];
      if (docs.length > 0) {
        await getCollection<any>(name).insertMany(docs);
      }
    })
  );
}
