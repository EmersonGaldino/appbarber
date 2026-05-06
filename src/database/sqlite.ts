import { openDatabaseAsync, type SQLiteDatabase } from 'expo-sqlite';
import type {
  AppData,
  Campaign,
  CampaignStatus,
  CampaignType,
  Service,
  Professional,
  Product,
  Appointment,
  Transaction,
  User,
  UserRole,
} from '../types';

const DB_NAME = 'appbarber.db';

let dbInstance: Promise<SQLiteDatabase> | null = null;

function getDb(): Promise<SQLiteDatabase> {
  if (!dbInstance) {
    dbInstance = (async () => {
      const db = await openDatabaseAsync(DB_NAME);
      try {
        await runMigrations(db);
      } catch (e) {
        // Não cachear instância em estado inválido — próxima chamada tenta de novo.
        dbInstance = null;
        throw e;
      }
      return db;
    })();
  }
  return dbInstance;
}

async function runMigrations(db: SQLiteDatabase): Promise<void> {
  await db.execAsync(`
    PRAGMA journal_mode = WAL;
    PRAGMA foreign_keys = ON;

    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY NOT NULL,
      name TEXT NOT NULL,
      phone TEXT NOT NULL,
      role TEXT NOT NULL,
      professional_id TEXT,
      username TEXT,
      password_hash TEXT,
      created_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_users_phone ON users(phone);

    CREATE TABLE IF NOT EXISTS services (
      id TEXT PRIMARY KEY NOT NULL,
      name TEXT NOT NULL,
      description TEXT NOT NULL DEFAULT '',
      price REAL NOT NULL,
      duration INTEGER NOT NULL,
      active INTEGER NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS professionals (
      id TEXT PRIMARY KEY NOT NULL,
      name TEXT NOT NULL,
      phone TEXT NOT NULL DEFAULT '',
      email TEXT NOT NULL DEFAULT '',
      specialties_json TEXT NOT NULL,
      working_hours_json TEXT NOT NULL,
      active INTEGER NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS products (
      id TEXT PRIMARY KEY NOT NULL,
      name TEXT NOT NULL,
      description TEXT NOT NULL DEFAULT '',
      price REAL NOT NULL,
      cost_price REAL NOT NULL,
      stock INTEGER NOT NULL,
      category TEXT NOT NULL DEFAULT '',
      active INTEGER NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS appointments (
      id TEXT PRIMARY KEY NOT NULL,
      professional_id TEXT NOT NULL,
      client_name TEXT NOT NULL,
      client_phone TEXT NOT NULL DEFAULT '',
      client_user_id TEXT,
      service_ids_json TEXT NOT NULL,
      product_ids_json TEXT NOT NULL,
      date TEXT NOT NULL,
      start_time TEXT NOT NULL,
      end_time TEXT NOT NULL,
      status TEXT NOT NULL,
      total_value REAL NOT NULL,
      payment_method TEXT,
      notes TEXT,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS transactions (
      id TEXT PRIMARY KEY NOT NULL,
      type TEXT NOT NULL,
      category TEXT NOT NULL,
      description TEXT NOT NULL,
      amount REAL NOT NULL,
      date TEXT NOT NULL,
      payment_method TEXT,
      appointment_id TEXT,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS campaigns (
      id TEXT PRIMARY KEY NOT NULL,
      type TEXT NOT NULL,
      title TEXT NOT NULL,
      message TEXT NOT NULL,
      valid_until TEXT,
      status TEXT NOT NULL,
      sent_at TEXT,
      recipients_count INTEGER,
      delivered_count INTEGER,
      error_message TEXT,
      created_at TEXT NOT NULL
    );
  `);

  // Migrations idempotentes para bases já existentes (não falham se a coluna já existir).
  await tryAddColumn(db, 'appointments', 'client_user_id', 'TEXT');
  await tryAddColumn(db, 'users', 'username', 'TEXT');
  await tryAddColumn(db, 'users', 'password_hash', 'TEXT');
  await tryAddColumn(db, 'users', 'push_token', 'TEXT');
  try {
    await db.execAsync(`CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);`);
  } catch (e) {
    console.warn('Migration idx_users_username:', e);
  }
}

async function tryAddColumn(
  db: SQLiteDatabase,
  table: string,
  column: string,
  type: string
): Promise<void> {
  try {
    const cols = await db.getAllAsync<{ name: string }>(
      `PRAGMA table_info(${table})`
    );
    if (!cols.some((c) => c.name === column)) {
      await db.execAsync(`ALTER TABLE ${table} ADD COLUMN ${column} ${type};`);
    }
  } catch (e) {
    console.warn(`Migration ${table}.${column}:`, e);
  }
}

type UserRow = {
  id: string;
  name: string;
  phone: string;
  role: string;
  professional_id: string | null;
  username: string | null;
  password_hash: string | null;
  push_token: string | null;
  created_at: string;
};

type CampaignRow = {
  id: string;
  type: string;
  title: string;
  message: string;
  valid_until: string | null;
  status: string;
  sent_at: string | null;
  recipients_count: number | null;
  delivered_count: number | null;
  error_message: string | null;
  created_at: string;
};

type ServiceRow = {
  id: string;
  name: string;
  description: string;
  price: number;
  duration: number;
  active: number;
  created_at: string;
};

type ProfessionalRow = {
  id: string;
  name: string;
  phone: string;
  email: string;
  specialties_json: string;
  working_hours_json: string;
  active: number;
  created_at: string;
};

type ProductRow = {
  id: string;
  name: string;
  description: string;
  price: number;
  cost_price: number;
  stock: number;
  category: string;
  active: number;
  created_at: string;
};

type AppointmentRow = {
  id: string;
  professional_id: string;
  client_name: string;
  client_phone: string;
  client_user_id: string | null;
  service_ids_json: string;
  product_ids_json: string;
  date: string;
  start_time: string;
  end_time: string;
  status: string;
  total_value: number;
  payment_method: string | null;
  notes: string | null;
  created_at: string;
};

type TransactionRow = {
  id: string;
  type: string;
  category: string;
  description: string;
  amount: number;
  date: string;
  payment_method: string | null;
  appointment_id: string | null;
  created_at: string;
};

function rowToUser(r: UserRow): User {
  return {
    id: r.id,
    name: r.name,
    phone: r.phone,
    role: r.role as UserRole,
    professionalId: r.professional_id ?? undefined,
    username: r.username ?? undefined,
    passwordHash: r.password_hash ?? undefined,
    pushToken: r.push_token ?? undefined,
    createdAt: r.created_at,
  };
}

function rowToCampaign(r: CampaignRow): Campaign {
  return {
    id: r.id,
    type: r.type as CampaignType,
    title: r.title,
    message: r.message,
    validUntil: r.valid_until ?? undefined,
    status: r.status as CampaignStatus,
    sentAt: r.sent_at ?? undefined,
    recipientsCount: r.recipients_count ?? undefined,
    deliveredCount: r.delivered_count ?? undefined,
    errorMessage: r.error_message ?? undefined,
    createdAt: r.created_at,
  };
}

function rowToService(r: ServiceRow): Service {
  return {
    id: r.id,
    name: r.name,
    description: r.description ?? '',
    price: r.price,
    duration: r.duration,
    active: r.active === 1,
    createdAt: r.created_at,
  };
}

function rowToProfessional(r: ProfessionalRow): Professional {
  let specialties: string[] = [];
  let workingHours: Professional['workingHours'] = {};
  try {
    specialties = JSON.parse(r.specialties_json ?? '[]');
  } catch {
    specialties = [];
  }
  try {
    workingHours = JSON.parse(r.working_hours_json ?? '{}');
  } catch {
    workingHours = {};
  }
  return {
    id: r.id,
    name: r.name,
    phone: r.phone ?? '',
    email: r.email ?? '',
    specialties,
    active: r.active === 1,
    workingHours,
    createdAt: r.created_at,
  };
}

function rowToProduct(r: ProductRow): Product {
  return {
    id: r.id,
    name: r.name,
    description: r.description ?? '',
    price: r.price,
    costPrice: r.cost_price,
    stock: r.stock,
    category: r.category ?? '',
    active: r.active === 1,
    createdAt: r.created_at,
  };
}

function rowToAppointment(r: AppointmentRow): Appointment {
  let serviceIds: string[] = [];
  let productIds: string[] = [];
  try {
    serviceIds = JSON.parse(r.service_ids_json ?? '[]');
  } catch {
    serviceIds = [];
  }
  try {
    productIds = JSON.parse(r.product_ids_json ?? '[]');
  } catch {
    productIds = [];
  }
  return {
    id: r.id,
    professionalId: r.professional_id,
    clientName: r.client_name,
    clientPhone: r.client_phone ?? '',
    clientUserId: r.client_user_id ?? undefined,
    serviceIds,
    productIds,
    date: r.date,
    startTime: r.start_time,
    endTime: r.end_time,
    status: r.status as Appointment['status'],
    totalValue: r.total_value,
    paymentMethod: (r.payment_method as Appointment['paymentMethod']) ?? undefined,
    notes: r.notes ?? undefined,
    createdAt: r.created_at,
  };
}

function rowToTransaction(r: TransactionRow): Transaction {
  return {
    id: r.id,
    type: r.type as Transaction['type'],
    category: r.category as Transaction['category'],
    description: r.description,
    amount: r.amount,
    date: r.date,
    paymentMethod: (r.payment_method as Transaction['paymentMethod']) ?? undefined,
    appointmentId: r.appointment_id ?? undefined,
    createdAt: r.created_at,
  };
}

export async function loadAllFromSqlite(): Promise<AppData> {
  const db = await getDb();
  const userRows = await db.getAllAsync<UserRow>('SELECT * FROM users ORDER BY name');
  const servicesRows = await db.getAllAsync<ServiceRow>('SELECT * FROM services ORDER BY name');
  const profRows = await db.getAllAsync<ProfessionalRow>('SELECT * FROM professionals ORDER BY name');
  const productRows = await db.getAllAsync<ProductRow>('SELECT * FROM products ORDER BY name');
  const apptRows = await db.getAllAsync<AppointmentRow>('SELECT * FROM appointments ORDER BY date, start_time');
  const txRows = await db.getAllAsync<TransactionRow>('SELECT * FROM transactions ORDER BY date DESC');
  const campaignRows = await db.getAllAsync<CampaignRow>('SELECT * FROM campaigns ORDER BY created_at DESC');

  return {
    users: userRows.map(rowToUser),
    services: servicesRows.map(rowToService),
    professionals: profRows.map(rowToProfessional),
    products: productRows.map(rowToProduct),
    appointments: apptRows.map(rowToAppointment),
    transactions: txRows.map(rowToTransaction),
    campaigns: campaignRows.map(rowToCampaign),
  };
}

export async function saveAllToSqlite(data: AppData): Promise<void> {
  const db = await getDb();

  await db.withTransactionAsync(async () => {
    await db.execAsync(`
      DELETE FROM campaigns;
      DELETE FROM transactions;
      DELETE FROM appointments;
      DELETE FROM products;
      DELETE FROM professionals;
      DELETE FROM services;
      DELETE FROM users;
    `);

    for (const u of data.users) {
      await db.runAsync(
        `INSERT INTO users (id, name, phone, role, professional_id, username, password_hash, push_token, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        u.id,
        u.name,
        u.phone,
        u.role,
        u.professionalId ?? null,
        u.username ?? null,
        u.passwordHash ?? null,
        u.pushToken ?? null,
        u.createdAt
      );
    }

    for (const s of data.services) {
      await db.runAsync(
        `INSERT INTO services (id, name, description, price, duration, active, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        s.id,
        s.name,
        s.description,
        s.price,
        s.duration,
        s.active ? 1 : 0,
        s.createdAt
      );
    }

    for (const p of data.professionals) {
      await db.runAsync(
        `INSERT INTO professionals (id, name, phone, email, specialties_json, working_hours_json, active, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        p.id,
        p.name,
        p.phone,
        p.email,
        JSON.stringify(p.specialties ?? []),
        JSON.stringify(p.workingHours ?? {}),
        p.active ? 1 : 0,
        p.createdAt
      );
    }

    for (const p of data.products) {
      await db.runAsync(
        `INSERT INTO products (id, name, description, price, cost_price, stock, category, active, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        p.id,
        p.name,
        p.description,
        p.price,
        p.costPrice,
        p.stock,
        p.category,
        p.active ? 1 : 0,
        p.createdAt
      );
    }

    for (const a of data.appointments) {
      await db.runAsync(
        `INSERT INTO appointments (
          id, professional_id, client_name, client_phone, client_user_id, service_ids_json, product_ids_json,
          date, start_time, end_time, status, total_value, payment_method, notes, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        a.id,
        a.professionalId,
        a.clientName,
        a.clientPhone,
        a.clientUserId ?? null,
        JSON.stringify(a.serviceIds),
        JSON.stringify(a.productIds),
        a.date,
        a.startTime,
        a.endTime,
        a.status,
        a.totalValue,
        a.paymentMethod ?? null,
        a.notes ?? null,
        a.createdAt
      );
    }

    for (const t of data.transactions) {
      await db.runAsync(
        `INSERT INTO transactions (id, type, category, description, amount, date, payment_method, appointment_id, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        t.id,
        t.type,
        t.category,
        t.description,
        t.amount,
        t.date,
        t.paymentMethod ?? null,
        t.appointmentId ?? null,
        t.createdAt
      );
    }

    for (const c of data.campaigns ?? []) {
      await db.runAsync(
        `INSERT INTO campaigns (
          id, type, title, message, valid_until, status, sent_at,
          recipients_count, delivered_count, error_message, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        c.id,
        c.type,
        c.title,
        c.message,
        c.validUntil ?? null,
        c.status,
        c.sentAt ?? null,
        c.recipientsCount ?? null,
        c.deliveredCount ?? null,
        c.errorMessage ?? null,
        c.createdAt
      );
    }
  });
}
