import { v4 as uuidv4 } from 'uuid';
import { addDays, format, subDays, subMonths } from 'date-fns';
import type {
  AppData,
  Appointment,
  PaymentMethod,
  Product,
  Professional,
  Service,
  Transaction,
  User,
  WorkingHours,
  TransactionCategory,
} from '../types';
import { hashPassword } from '../utils/token';

/** Senha default para profissionais criados pelo seed/migração. */
export const DEFAULT_PROFESSIONAL_PASSWORD = 'barber123';
/** Senha default para o admin do seed. */
export const DEFAULT_ADMIN_PASSWORD = 'admin123';
export const DEFAULT_ADMIN_USERNAME = 'admin';

/**
 * Gera um username sugerido a partir do nome (slug, sem acentos).
 * Se já estiver em uso na lista `taken`, anexa sufixo numérico até ficar único.
 */
export function buildUsernameFromName(name: string, taken: Set<string> = new Set()): string {
  const base = (name ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '')
    .slice(0, 16) || 'user';

  let candidate = base;
  let i = 2;
  while (taken.has(candidate)) {
    candidate = `${base}${i++}`;
  }
  taken.add(candidate);
  return candidate;
}

/**
 * Garante que admin/profissional tenham `username` e `passwordHash` válidos.
 * Útil em migrações de bancos antigos (criados antes da feature de credenciais).
 */
export function ensureStaffCredentials(users: User[]): User[] {
  const taken = new Set<string>(
    users
      .map((u) => u.username?.toLowerCase())
      .filter((u): u is string => Boolean(u))
  );

  return users.map((u) => {
    if (u.role !== 'admin' && u.role !== 'professional') return u;
    if (u.username && u.passwordHash) return u;

    const username =
      u.username ??
      (u.role === 'admin'
        ? (taken.has(DEFAULT_ADMIN_USERNAME)
            ? buildUsernameFromName('admin', taken)
            : (taken.add(DEFAULT_ADMIN_USERNAME), DEFAULT_ADMIN_USERNAME))
        : buildUsernameFromName(u.name, taken));

    const passwordHash =
      u.passwordHash ??
      hashPassword(u.role === 'admin' ? DEFAULT_ADMIN_PASSWORD : DEFAULT_PROFESSIONAL_PASSWORD);

    return { ...u, username, passwordHash };
  });
}

const dateStr = (d: Date) => format(d, 'yyyy-MM-dd');

const standardWorkingHours: WorkingHours = {
  monday: { start: '09:00', end: '19:00', active: true },
  tuesday: { start: '09:00', end: '19:00', active: true },
  wednesday: { start: '09:00', end: '19:00', active: true },
  thursday: { start: '09:00', end: '20:00', active: true },
  friday: { start: '09:00', end: '20:00', active: true },
  saturday: { start: '08:00', end: '18:00', active: true },
  sunday: { start: '09:00', end: '14:00', active: false },
};

const lateWorkingHours: WorkingHours = {
  monday: { start: '12:00', end: '21:00', active: true },
  tuesday: { start: '12:00', end: '21:00', active: true },
  wednesday: { start: '12:00', end: '21:00', active: true },
  thursday: { start: '12:00', end: '21:00', active: true },
  friday: { start: '12:00', end: '22:00', active: true },
  saturday: { start: '10:00', end: '20:00', active: true },
  sunday: { start: '09:00', end: '14:00', active: false },
};

export function buildExampleData(): AppData {
  const now = new Date();
  const nowIso = now.toISOString();
  const olderIso = subMonths(now, 2).toISOString();
  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  const toMinutes = (t: string) => {
    const [h, m] = t.split(':').map(Number);
    return h * 60 + m;
  };
  const pickPayment = (i: number): PaymentMethod => {
    const opts: PaymentMethod[] = ['pix', 'card_credit', 'card_debit', 'cash'];
    return opts[i % opts.length];
  };

  // ========== Serviços ==========
  const services: Service[] = [
    { id: uuidv4(), name: 'Corte Masculino', description: 'Corte clássico, máquina e tesoura.', price: 45, duration: 30, active: true, createdAt: olderIso },
    { id: uuidv4(), name: 'Barba', description: 'Modelagem completa com toalha quente e finalização.', price: 35, duration: 25, active: true, createdAt: olderIso },
    { id: uuidv4(), name: 'Corte + Barba', description: 'Pacote combinado com desconto.', price: 70, duration: 50, active: true, createdAt: olderIso },
    { id: uuidv4(), name: 'Pezinho', description: 'Acabamento de nuca e pé do cabelo.', price: 15, duration: 10, active: true, createdAt: olderIso },
    { id: uuidv4(), name: 'Sobrancelha', description: 'Design masculino na navalha.', price: 20, duration: 15, active: true, createdAt: olderIso },
    { id: uuidv4(), name: 'Coloração', description: 'Coloração / disfarce de fios brancos.', price: 90, duration: 60, active: true, createdAt: olderIso },
    { id: uuidv4(), name: 'Hidratação Capilar', description: 'Tratamento intensivo para fios e couro cabeludo.', price: 55, duration: 40, active: false, createdAt: olderIso },
  ];

  const sCorte = services[0];
  const sBarba = services[1];
  const sCombo = services[2];
  const sPezinho = services[3];
  const sSobrancelha = services[4];
  const sColoracao = services[5];

  // ========== Profissionais ==========
  const professionals: Professional[] = [
    {
      id: uuidv4(),
      name: 'André Ribeiro',
      phone: '(11) 99999-1111',
      email: 'andre@barberstudio.com',
      specialties: ['Corte', 'Barba', 'Sobrancelha'],
      active: true,
      workingHours: standardWorkingHours,
      createdAt: olderIso,
    },
    {
      id: uuidv4(),
      name: 'Lucas Almeida',
      phone: '(11) 98888-2222',
      email: 'lucas@barberstudio.com',
      specialties: ['Corte', 'Coloração', 'Hidratação'],
      active: true,
      workingHours: lateWorkingHours,
      createdAt: olderIso,
    },
    {
      id: uuidv4(),
      name: 'Paulo Mendes',
      phone: '(11) 97777-3333',
      email: 'paulo@barberstudio.com',
      specialties: ['Barba', 'Pezinho', 'Sobrancelha'],
      active: true,
      workingHours: standardWorkingHours,
      createdAt: olderIso,
    },
    {
      id: uuidv4(),
      name: 'Rafael Souza',
      phone: '(11) 96666-4444',
      email: 'rafael@barberstudio.com',
      specialties: ['Corte'],
      active: false,
      workingHours: standardWorkingHours,
      createdAt: olderIso,
    },
  ];

  const pAndre = professionals[0];
  const pLucas = professionals[1];
  const pPaulo = professionals[2];

  // ========== Produtos ==========
  const products: Product[] = [
    { id: uuidv4(), name: 'Pomada Modeladora', description: 'Fixação forte, brilho médio. 120g.', price: 49.9, costPrice: 22, stock: 14, category: 'Pomada', active: true, createdAt: olderIso },
    { id: uuidv4(), name: 'Cera Matte', description: 'Efeito seco, sem brilho. 80g.', price: 42.0, costPrice: 19, stock: 8, category: 'Pomada', active: true, createdAt: olderIso },
    { id: uuidv4(), name: 'Shampoo Anticaspa', description: 'Limpeza profunda. 250ml.', price: 38.5, costPrice: 16, stock: 6, category: 'Shampoo', active: true, createdAt: olderIso },
    { id: uuidv4(), name: 'Óleo para Barba', description: 'Hidratação e perfume. 30ml.', price: 59.9, costPrice: 24, stock: 4, category: 'Barba', active: true, createdAt: olderIso },
    { id: uuidv4(), name: 'Balm pós-barba', description: 'Hidrata e acalma a pele. 100ml.', price: 45.0, costPrice: 20, stock: 3, category: 'Barba', active: true, createdAt: olderIso },
    { id: uuidv4(), name: 'Perfume "Studio"', description: 'Fragrância exclusiva da casa. 100ml.', price: 129.0, costPrice: 55, stock: 2, category: 'Perfume', active: true, createdAt: olderIso },
    { id: uuidv4(), name: 'Navalha Descartável', description: 'Pacote com 5 unidades.', price: 18.0, costPrice: 7, stock: 30, category: 'Acessórios', active: true, createdAt: olderIso },
  ];

  const prodPomada = products[0];
  const prodCera = products[1];
  const prodOleo = products[3];
  const prodPerfume = products[5];

  // ========== Agendamentos ==========
  const clients: { id: string; name: string; phone: string }[] = [
    { id: uuidv4(), name: 'João Silva', phone: '(11) 95555-1010' },
    { id: uuidv4(), name: 'Pedro Henrique', phone: '(11) 94444-2020' },
    { id: uuidv4(), name: 'Rodrigo Costa', phone: '(11) 93333-3030' },
    { id: uuidv4(), name: 'Felipe Martins', phone: '(11) 92222-4040' },
    { id: uuidv4(), name: 'Carlos Andrade', phone: '(11) 91111-5050' },
    { id: uuidv4(), name: 'Bruno Oliveira', phone: '(11) 98765-1234' },
    { id: uuidv4(), name: 'Marcos Vinicius', phone: '(11) 91234-5678' },
    { id: uuidv4(), name: 'Diego Pereira', phone: '(11) 99876-4321' },
    { id: uuidv4(), name: 'Eduardo Lima', phone: '(11) 97654-3210' },
    { id: uuidv4(), name: 'Thiago Ramos', phone: '(11) 96543-2109' },
    { id: uuidv4(), name: 'Vinícius Castro', phone: '(11) 95432-1098' },
    { id: uuidv4(), name: 'Gabriel Nunes', phone: '(11) 94321-0987' },
  ];

  function makeAppt(opts: {
    daysOffset: number;
    startTime: string;
    professionalId: string;
    serviceIds: string[];
    productIds?: string[];
    clientIdx: number;
    status: Appointment['status'];
    paymentMethod?: PaymentMethod;
    notes?: string;
  }): Appointment {
    const date = dateStr(addDays(now, opts.daysOffset));
    const services_ = opts.serviceIds.map((id) => services.find((s) => s.id === id)!);
    const products_ = (opts.productIds ?? []).map((id) => products.find((p) => p.id === id)!);
    const totalDuration = services_.reduce((sum, s) => sum + s.duration, 0);
    const total =
      services_.reduce((sum, s) => sum + s.price, 0) +
      products_.reduce((sum, p) => sum + p.price, 0);

    const [h, m] = opts.startTime.split(':').map(Number);
    const endMin = h * 60 + m + totalDuration;
    const endTime = `${String(Math.floor(endMin / 60)).padStart(2, '0')}:${String(endMin % 60).padStart(2, '0')}`;

    const client = clients[opts.clientIdx % clients.length];
    return {
      id: uuidv4(),
      professionalId: opts.professionalId,
      clientName: client.name,
      clientPhone: client.phone,
      clientUserId: client.id,
      serviceIds: opts.serviceIds,
      productIds: opts.productIds ?? [],
      date,
      startTime: opts.startTime,
      endTime,
      status: opts.status,
      totalValue: total,
      paymentMethod: opts.paymentMethod,
      notes: opts.notes,
      createdAt: subDays(now, Math.max(1, Math.abs(opts.daysOffset))).toISOString(),
    };
  }

  const appointments: Appointment[] = [
    // ========= Passados (concluídos) =========
    makeAppt({ daysOffset: -14, startTime: '09:30', professionalId: pAndre.id, serviceIds: [sCorte.id], clientIdx: 0, status: 'completed', paymentMethod: 'pix' }),
    makeAppt({ daysOffset: -13, startTime: '14:00', professionalId: pPaulo.id, serviceIds: [sBarba.id, sSobrancelha.id], clientIdx: 1, status: 'completed', paymentMethod: 'card_credit' }),
    makeAppt({ daysOffset: -12, startTime: '16:00', professionalId: pAndre.id, serviceIds: [sCombo.id], productIds: [prodPomada.id], clientIdx: 2, status: 'completed', paymentMethod: 'card_debit' }),
    makeAppt({ daysOffset: -10, startTime: '11:00', professionalId: pLucas.id, serviceIds: [sCorte.id, sColoracao.id], clientIdx: 3, status: 'completed', paymentMethod: 'pix', notes: 'Cliente fidelidade — disfarce completo.' }),
    makeAppt({ daysOffset: -9, startTime: '15:30', professionalId: pPaulo.id, serviceIds: [sPezinho.id], clientIdx: 4, status: 'completed', paymentMethod: 'cash' }),
    makeAppt({ daysOffset: -7, startTime: '10:00', professionalId: pAndre.id, serviceIds: [sCombo.id], productIds: [prodOleo.id], clientIdx: 5, status: 'completed', paymentMethod: 'pix' }),
    makeAppt({ daysOffset: -6, startTime: '17:00', professionalId: pLucas.id, serviceIds: [sCorte.id], clientIdx: 6, status: 'completed', paymentMethod: 'card_credit' }),
    makeAppt({ daysOffset: -5, startTime: '13:30', professionalId: pPaulo.id, serviceIds: [sBarba.id], productIds: [prodPerfume.id], clientIdx: 7, status: 'completed', paymentMethod: 'card_credit' }),
    makeAppt({ daysOffset: -4, startTime: '09:00', professionalId: pAndre.id, serviceIds: [sCorte.id, sSobrancelha.id], clientIdx: 8, status: 'completed', paymentMethod: 'pix' }),
    makeAppt({ daysOffset: -3, startTime: '18:00', professionalId: pLucas.id, serviceIds: [sCombo.id], productIds: [prodCera.id], clientIdx: 9, status: 'completed', paymentMethod: 'pix' }),
    makeAppt({ daysOffset: -2, startTime: '14:30', professionalId: pPaulo.id, serviceIds: [sBarba.id, sPezinho.id], clientIdx: 10, status: 'completed', paymentMethod: 'cash' }),
    makeAppt({ daysOffset: -1, startTime: '10:30', professionalId: pAndre.id, serviceIds: [sCombo.id], clientIdx: 11, status: 'completed', paymentMethod: 'card_debit' }),
    makeAppt({ daysOffset: -1, startTime: '15:00', professionalId: pLucas.id, serviceIds: [sCorte.id], clientIdx: 0, status: 'completed', paymentMethod: 'pix' }),

    // ========= Cancelado e falta =========
    makeAppt({ daysOffset: -8, startTime: '13:00', professionalId: pAndre.id, serviceIds: [sCorte.id], clientIdx: 2, status: 'cancelled' }),
    makeAppt({ daysOffset: -2, startTime: '17:30', professionalId: pPaulo.id, serviceIds: [sBarba.id], clientIdx: 5, status: 'no_show' }),

    // ========= Hoje (auto: passado = completed, futuro = scheduled) =========
    ...[
      { startTime: '08:30', professionalId: pAndre.id, serviceIds: [sCorte.id], productIds: [], clientIdx: 6 },
      { startTime: '09:30', professionalId: pPaulo.id, serviceIds: [sBarba.id, sSobrancelha.id], productIds: [], clientIdx: 7 },
      { startTime: '10:30', professionalId: pAndre.id, serviceIds: [sCombo.id], productIds: [prodPomada.id], clientIdx: 8 },
      { startTime: '11:30', professionalId: pLucas.id, serviceIds: [sCorte.id], productIds: [prodOleo.id], clientIdx: 1 },
      { startTime: '14:00', professionalId: pPaulo.id, serviceIds: [sPezinho.id, sBarba.id], productIds: [], clientIdx: 9 },
      { startTime: '15:30', professionalId: pLucas.id, serviceIds: [sCorte.id, sColoracao.id], productIds: [], clientIdx: 3 },
      { startTime: '17:00', professionalId: pAndre.id, serviceIds: [sCombo.id], productIds: [], clientIdx: 4 },
      { startTime: '18:00', professionalId: pPaulo.id, serviceIds: [sBarba.id], productIds: [prodPerfume.id], clientIdx: 10 },
      { startTime: '19:00', professionalId: pLucas.id, serviceIds: [sCorte.id], productIds: [], clientIdx: 11 },
    ].map((slot, i) => {
      const hasPassed = toMinutes(slot.startTime) <= nowMinutes;
      return makeAppt({
        daysOffset: 0,
        startTime: slot.startTime,
        professionalId: slot.professionalId,
        serviceIds: slot.serviceIds,
        productIds: slot.productIds,
        clientIdx: slot.clientIdx,
        status: hasPassed ? 'completed' : 'scheduled',
        paymentMethod: hasPassed ? pickPayment(i) : undefined,
      });
    }),

    // ========= Futuros =========
    makeAppt({ daysOffset: 1, startTime: '10:00', professionalId: pAndre.id, serviceIds: [sCombo.id], clientIdx: 0, status: 'scheduled' }),
    makeAppt({ daysOffset: 1, startTime: '14:30', professionalId: pLucas.id, serviceIds: [sCorte.id], clientIdx: 11, status: 'scheduled' }),
    makeAppt({ daysOffset: 2, startTime: '11:30', professionalId: pPaulo.id, serviceIds: [sBarba.id], clientIdx: 4, status: 'scheduled' }),
    makeAppt({ daysOffset: 2, startTime: '16:00', professionalId: pAndre.id, serviceIds: [sCorte.id, sSobrancelha.id], clientIdx: 1, status: 'scheduled' }),
    makeAppt({ daysOffset: 3, startTime: '09:00', professionalId: pLucas.id, serviceIds: [sCombo.id], productIds: [prodOleo.id], clientIdx: 10, status: 'scheduled' }),
    makeAppt({ daysOffset: 4, startTime: '15:00', professionalId: pAndre.id, serviceIds: [sCorte.id], clientIdx: 2, status: 'scheduled' }),
    makeAppt({ daysOffset: 5, startTime: '13:00', professionalId: pPaulo.id, serviceIds: [sBarba.id, sSobrancelha.id], clientIdx: 5, status: 'scheduled' }),
  ];

  // ========== Transações ==========
  // Receitas dos atendimentos concluídos
  const incomeFromAppts: Transaction[] = appointments
    .filter((a) => a.status === 'completed')
    .map((a) => ({
      id: uuidv4(),
      type: 'income' as const,
      category: 'service' as TransactionCategory,
      description: `Atendimento - ${a.clientName}`,
      amount: a.totalValue,
      date: a.date,
      paymentMethod: a.paymentMethod,
      appointmentId: a.id,
      createdAt: a.createdAt,
    }));

  // Despesas fixas do mês
  const today = new Date();
  const expenses: Transaction[] = [
    {
      id: uuidv4(),
      type: 'expense',
      category: 'rent',
      description: 'Aluguel da loja',
      amount: 2800,
      date: dateStr(new Date(today.getFullYear(), today.getMonth(), 5)),
      paymentMethod: 'transfer',
      createdAt: nowIso,
    },
    {
      id: uuidv4(),
      type: 'expense',
      category: 'utilities',
      description: 'Energia elétrica',
      amount: 380.5,
      date: dateStr(new Date(today.getFullYear(), today.getMonth(), 8)),
      paymentMethod: 'pix',
      createdAt: nowIso,
    },
    {
      id: uuidv4(),
      type: 'expense',
      category: 'utilities',
      description: 'Internet + telefone',
      amount: 150,
      date: dateStr(new Date(today.getFullYear(), today.getMonth(), 8)),
      paymentMethod: 'card_credit',
      createdAt: nowIso,
    },
    {
      id: uuidv4(),
      type: 'expense',
      category: 'product_purchase',
      description: 'Reposição de pomadas e ceras',
      amount: 620,
      date: dateStr(subDays(today, 12)),
      paymentMethod: 'card_credit',
      createdAt: nowIso,
    },
    {
      id: uuidv4(),
      type: 'expense',
      category: 'supplies',
      description: 'Lâminas e descartáveis',
      amount: 215,
      date: dateStr(subDays(today, 6)),
      paymentMethod: 'pix',
      createdAt: nowIso,
    },
    {
      id: uuidv4(),
      type: 'expense',
      category: 'salary',
      description: 'Comissão dos profissionais',
      amount: 1900,
      date: dateStr(new Date(today.getFullYear(), today.getMonth(), 10)),
      paymentMethod: 'transfer',
      createdAt: nowIso,
    },
  ];

  // Vendas avulsas de produtos
  const productSales: Transaction[] = [
    {
      id: uuidv4(),
      type: 'income',
      category: 'product_sale',
      description: 'Venda balcão - Perfume Studio',
      amount: 129,
      date: dateStr(subDays(today, 4)),
      paymentMethod: 'pix',
      createdAt: nowIso,
    },
    {
      id: uuidv4(),
      type: 'income',
      category: 'product_sale',
      description: 'Venda balcão - Pomada + Óleo',
      amount: 109.8,
      date: dateStr(subDays(today, 2)),
      paymentMethod: 'card_credit',
      createdAt: nowIso,
    },
  ];

  const transactions: Transaction[] = [...incomeFromAppts, ...productSales, ...expenses];

  // ========== Usuários ==========
  const usernameTaken = new Set<string>();
  const adminUsername = DEFAULT_ADMIN_USERNAME;
  usernameTaken.add(adminUsername);

  const users: User[] = [
    {
      id: uuidv4(),
      name: 'Administrador',
      phone: '(11) 90000-0000',
      role: 'admin',
      username: adminUsername,
      passwordHash: hashPassword(DEFAULT_ADMIN_PASSWORD),
      createdAt: olderIso,
    },
    ...professionals
      .filter((p) => p.active)
      .map<User>((p) => ({
        id: uuidv4(),
        name: p.name,
        phone: p.phone,
        role: 'professional',
        professionalId: p.id,
        username: buildUsernameFromName(p.name, usernameTaken),
        passwordHash: hashPassword(DEFAULT_PROFESSIONAL_PASSWORD),
        createdAt: olderIso,
      })),
    ...clients.map<User>((c) => ({
      id: c.id,
      name: c.name,
      phone: c.phone,
      role: 'client',
      createdAt: olderIso,
    })),
  ];

  return { users, services, professionals, products, appointments, transactions, campaigns: [] };
}

/**
 * Constrói usuários a partir de dados existentes (cenário de upgrade do schema antigo
 * que não tinha tabela `users`). Cria 1 admin e 1 user por profissional ativo, mais
 * usuários cliente com base nos appointments existentes (deduplicados por telefone).
 */
export function buildUsersForExistingData(data: AppData): User[] {
  const nowIso = new Date().toISOString();
  const usernameTaken = new Set<string>();
  usernameTaken.add(DEFAULT_ADMIN_USERNAME);

  const admin: User = {
    id: uuidv4(),
    name: 'Administrador',
    phone: '(11) 90000-0000',
    role: 'admin',
    username: DEFAULT_ADMIN_USERNAME,
    passwordHash: hashPassword(DEFAULT_ADMIN_PASSWORD),
    createdAt: nowIso,
  };

  const professionalUsers: User[] = data.professionals
    .filter((p) => p.active)
    .map((p) => ({
      id: uuidv4(),
      name: p.name,
      phone: p.phone || `pro-${p.id.slice(0, 6)}`,
      role: 'professional' as const,
      professionalId: p.id,
      username: buildUsernameFromName(p.name, usernameTaken),
      passwordHash: hashPassword(DEFAULT_PROFESSIONAL_PASSWORD),
      createdAt: nowIso,
    }));

  const clientByPhone = new Map<string, User>();
  for (const a of data.appointments) {
    const phone = (a.clientPhone || '').trim();
    if (!phone) continue;
    if (!clientByPhone.has(phone)) {
      clientByPhone.set(phone, {
        id: uuidv4(),
        name: a.clientName,
        phone,
        role: 'client',
        createdAt: nowIso,
      });
    }
  }

  return [admin, ...professionalUsers, ...Array.from(clientByPhone.values())];
}
