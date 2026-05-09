import { v4 as uuidv4 } from 'uuid';
import type { AppData, Professional, Service, User, WorkingHours } from './types.js';

const PASSWORD_PEPPER = 'appbarber.pwd.pepper.v1';

function localHash(s: string): string {
  let h1 = 0xdeadbeef ^ 0;
  let h2 = 0x41c6ce57 ^ 0;
  for (let i = 0; i < s.length; i++) {
    const ch = s.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 =
    Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^
    Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 =
    Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^
    Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return (
    (h2 >>> 0).toString(16).padStart(8, '0') +
    (h1 >>> 0).toString(16).padStart(8, '0')
  );
}

function hashPassword(plain: string): string {
  return localHash(`${PASSWORD_PEPPER}.${plain}`);
}

export const emptyAppData: AppData = {
  users: [],
  services: [],
  professionals: [],
  products: [],
  appointments: [],
  transactions: [],
  campaigns: [],
};

export function buildInitialSeed(): AppData {
  const now = new Date().toISOString();

  const workingHours: WorkingHours = {
    monday: { start: '09:00', end: '19:00', active: true },
    tuesday: { start: '09:00', end: '19:00', active: true },
    wednesday: { start: '09:00', end: '19:00', active: true },
    thursday: { start: '09:00', end: '19:00', active: true },
    friday: { start: '09:00', end: '19:00', active: true },
    saturday: { start: '09:00', end: '15:00', active: true },
    sunday: { start: '09:00', end: '12:00', active: false },
  };

  const professional: Professional = {
    id: uuidv4(),
    name: 'Profissional Exemplo',
    phone: '(11) 98888-8888',
    email: 'profissional@barber.local',
    specialties: ['Corte', 'Barba'],
    active: true,
    workingHours,
    createdAt: now,
  };

  const services: Service[] = [
    {
      id: uuidv4(),
      name: 'Corte Masculino',
      description: 'Corte clássico com tesoura e máquina.',
      price: 45,
      duration: 30,
      active: true,
      createdAt: now,
    },
    {
      id: uuidv4(),
      name: 'Barba',
      description: 'Modelagem completa com toalha quente.',
      price: 35,
      duration: 25,
      active: true,
      createdAt: now,
    },
  ];

  const users: User[] = [
    {
      id: uuidv4(),
      name: 'Administrador',
      phone: '(11) 90000-0000',
      role: 'admin',
      username: 'admin',
      passwordHash: hashPassword('admin123'),
      createdAt: now,
    },
    {
      id: uuidv4(),
      name: professional.name,
      phone: professional.phone,
      role: 'professional',
      professionalId: professional.id,
      username: 'profissional',
      passwordHash: hashPassword('barber123'),
      createdAt: now,
    },
  ];

  return {
    ...emptyAppData,
    users,
    services,
    professionals: [professional],
  };
}
