export type UserRole = 'admin' | 'professional' | 'client';

export interface User {
  id: string;
  name: string;
  phone: string;
  role: UserRole;
  /** Se role === 'professional', referencia o registro em professionals. */
  professionalId?: string;
  /** Login de admin/profissional. Cliente loga só com nome + telefone. */
  username?: string;
  /** Hash determinístico da senha (apenas para admin/profissional). */
  passwordHash?: string;
  /** Expo Push Token registrado no dispositivo deste usuário. */
  pushToken?: string;
  createdAt: string;
}

// ===================== Campanhas / Notificações =====================

export type CampaignType = 'promo' | 'price_update' | 'news' | 'schedule' | 'new_service';
export type CampaignStatus = 'draft' | 'sent' | 'failed';

export interface Campaign {
  id: string;
  type: CampaignType;
  title: string;
  message: string;
  /** Data limite (ISO date) para promoções, opcional. */
  validUntil?: string;
  status: CampaignStatus;
  /** ISO datetime do envio efetivo. */
  sentAt?: string;
  /** Quantos clientes foram alvo do envio. */
  recipientsCount?: number;
  /** Quantos tokens retornaram OK na Expo Push API. */
  deliveredCount?: number;
  /** Mensagem do último erro (se status === 'failed'). */
  errorMessage?: string;
  createdAt: string;
}

export interface AuthSession {
  token: string;
  user: User;
}

export interface Service {
  id: string;
  name: string;
  description: string;
  price: number;
  duration: number; // em minutos
  active: boolean;
  createdAt: string;
}

export interface Professional {
  id: string;
  name: string;
  phone: string;
  email: string;
  specialties: string[];
  photo?: string;
  active: boolean;
  workingHours: WorkingHours;
  createdAt: string;
}

export interface WorkingHours {
  [day: string]: {
    start: string;
    end: string;
    active: boolean;
  };
}

export interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  costPrice: number;
  stock: number;
  category: string;
  active: boolean;
  createdAt: string;
}

export interface Appointment {
  id: string;
  professionalId: string;
  clientName: string;
  clientPhone: string;
  /** Vincula o agendamento a um usuário cliente quando feito pelo próprio (opcional). */
  clientUserId?: string;
  serviceIds: string[];
  productIds: string[];
  date: string; // YYYY-MM-DD
  startTime: string; // HH:mm
  endTime: string; // HH:mm
  status: 'scheduled' | 'completed' | 'cancelled' | 'no_show';
  totalValue: number;
  paymentMethod?: PaymentMethod;
  notes?: string;
  createdAt: string;
}

export type PaymentMethod = 'cash' | 'card_credit' | 'card_debit' | 'pix' | 'transfer';

export interface Transaction {
  id: string;
  type: 'income' | 'expense';
  category: TransactionCategory;
  description: string;
  amount: number;
  date: string; // YYYY-MM-DD
  paymentMethod?: PaymentMethod;
  appointmentId?: string;
  createdAt: string;
}

export type TransactionCategory =
  | 'service'
  | 'product_sale'
  | 'product_purchase'
  | 'rent'
  | 'utilities'
  | 'salary'
  | 'supplies'
  | 'equipment'
  | 'other';

export interface AppData {
  users: User[];
  services: Service[];
  professionals: Professional[];
  products: Product[];
  appointments: Appointment[];
  transactions: Transaction[];
  campaigns: Campaign[];
}

// ===================== Navegação =====================

// --- Auth ---
export type AuthStackParamList = {
  Login: undefined;
  Register: undefined;
};

// --- Admin (mantém o que já existe) ---
export type AdminTabParamList = {
  Home: undefined;
  Schedule: undefined;
  Services: undefined;
  Professionals: undefined;
  Products: undefined;
  Financial: undefined;
  Campaigns: undefined;
  Account: undefined;
};

export type CampaignsStackParamList = {
  CampaignsList: undefined;
  CampaignForm: { campaign?: Campaign };
};

export type ServicesStackParamList = {
  ServicesList: undefined;
  ServiceForm: { service?: Service };
};

export type ProfessionalsStackParamList = {
  ProfessionalsList: undefined;
  ProfessionalForm: { professional?: Professional };
};

export type ProductsStackParamList = {
  ProductsList: undefined;
  ProductForm: { product?: Product };
};

export type ScheduleStackParamList = {
  ScheduleMain: undefined;
  AppointmentForm: { appointment?: Appointment; date?: string; professionalId?: string };
  AppointmentDetail: { appointment: Appointment };
};

export type FinancialStackParamList = {
  FinancialMain: undefined;
  TransactionForm: { transaction?: Transaction };
};

// --- Profissional ---
export type ProfessionalTabParamList = {
  MySchedule: undefined;
  Account: undefined;
};

export type ProfessionalScheduleStackParamList = {
  ProfessionalScheduleMain: undefined;
  AppointmentDetail: { appointment: Appointment };
  AppointmentForm: { appointment?: Appointment; date?: string; professionalId?: string };
};

// --- Cliente ---
export type ClientTabParamList = {
  ClientHome: undefined;
  ClientBook: undefined;
  Account: undefined;
};

export type ClientHomeStackParamList = {
  ClientHomeMain: undefined;
  ClientAppointmentDetail: { appointment: Appointment };
};

export type ClientBookStackParamList = {
  ClientProfessionalsList: undefined;
  ClientBookingForm: { professionalId?: string };
};
