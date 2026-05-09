export type UserRole = 'admin' | 'professional' | 'client';

export interface User {
  id: string;
  name: string;
  phone: string;
  role: UserRole;
  professionalId?: string;
  username?: string;
  passwordHash?: string;
  pushToken?: string;
  createdAt: string;
}

export type CampaignType = 'promo' | 'price_update' | 'news' | 'schedule' | 'new_service';
export type CampaignStatus = 'draft' | 'sent' | 'failed';

export interface Campaign {
  id: string;
  type: CampaignType;
  title: string;
  message: string;
  validUntil?: string;
  status: CampaignStatus;
  sentAt?: string;
  recipientsCount?: number;
  deliveredCount?: number;
  errorMessage?: string;
  createdAt: string;
}

export interface Service {
  id: string;
  name: string;
  description: string;
  price: number;
  duration: number;
  active: boolean;
  createdAt: string;
}

export interface WorkingHours {
  [day: string]: {
    start: string;
    end: string;
    active: boolean;
  };
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

export type PaymentMethod = 'cash' | 'card_credit' | 'card_debit' | 'pix' | 'transfer';

export interface Appointment {
  id: string;
  professionalId: string;
  clientName: string;
  clientPhone: string;
  clientUserId?: string;
  serviceIds: string[];
  productIds: string[];
  productQuantities?: Record<string, number>;
  date: string;
  startTime: string;
  endTime: string;
  status: 'scheduled' | 'completed' | 'cancelled' | 'no_show';
  totalValue: number;
  paymentMethod?: PaymentMethod;
  notes?: string;
  clientFeedback?: string;
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

export interface Transaction {
  id: string;
  type: 'income' | 'expense';
  category: TransactionCategory;
  description: string;
  amount: number;
  date: string;
  paymentMethod?: PaymentMethod;
  appointmentId?: string;
  createdAt: string;
}

export interface AppData {
  users: User[];
  services: Service[];
  professionals: Professional[];
  products: Product[];
  appointments: Appointment[];
  transactions: Transaction[];
  campaigns: Campaign[];
}

export type ResourceName =
  | 'users'
  | 'services'
  | 'professionals'
  | 'products'
  | 'appointments'
  | 'transactions'
  | 'campaigns';

export const RESOURCE_NAMES: ResourceName[] = [
  'users',
  'services',
  'professionals',
  'products',
  'appointments',
  'transactions',
  'campaigns',
];
