import type {
  AppData,
  Appointment,
  Campaign,
  Product,
  Professional,
  Service,
  Transaction,
  User,
} from '../types';
import { apiRequest } from './apiClient';

type ResourceName =
  | 'users'
  | 'services'
  | 'professionals'
  | 'products'
  | 'appointments'
  | 'transactions'
  | 'campaigns';

type ResourceMap = {
  users: User;
  services: Service;
  professionals: Professional;
  products: Product;
  appointments: Appointment;
  transactions: Transaction;
  campaigns: Campaign;
};

async function createResource<K extends ResourceName>(
  resource: K,
  payload: Omit<ResourceMap[K], 'id' | 'createdAt'>
): Promise<ResourceMap[K]> {
  return apiRequest<ResourceMap[K]>(`/${resource}`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

async function updateResource<K extends ResourceName>(
  resource: K,
  id: string,
  payload: Partial<ResourceMap[K]>
): Promise<ResourceMap[K]> {
  return apiRequest<ResourceMap[K]>(`/${resource}/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

async function deleteResource(resource: ResourceName, id: string): Promise<void> {
  await apiRequest<{ ok: true }>(`/${resource}/${id}`, {
    method: 'DELETE',
  });
}

export const appApi = {
  getAppData() {
    return apiRequest<AppData>('/app-data');
  },
  clearAppData() {
    return apiRequest<AppData>('/app-data', { method: 'DELETE' });
  },

  createUser(payload: Omit<User, 'id' | 'createdAt'>) {
    return createResource('users', payload);
  },
  updateUser(id: string, payload: Partial<User>) {
    return updateResource('users', id, payload);
  },
  deleteUser(id: string) {
    return deleteResource('users', id);
  },

  createService(payload: Omit<Service, 'id' | 'createdAt'>) {
    return createResource('services', payload);
  },
  updateService(id: string, payload: Partial<Service>) {
    return updateResource('services', id, payload);
  },
  deleteService(id: string) {
    return deleteResource('services', id);
  },

  createProfessional(payload: Omit<Professional, 'id' | 'createdAt'>) {
    return createResource('professionals', payload);
  },
  updateProfessional(id: string, payload: Partial<Professional>) {
    return updateResource('professionals', id, payload);
  },
  deleteProfessional(id: string) {
    return deleteResource('professionals', id);
  },

  createProduct(payload: Omit<Product, 'id' | 'createdAt'>) {
    return createResource('products', payload);
  },
  updateProduct(id: string, payload: Partial<Product>) {
    return updateResource('products', id, payload);
  },
  deleteProduct(id: string) {
    return deleteResource('products', id);
  },

  createAppointment(payload: Omit<Appointment, 'id' | 'createdAt'>) {
    return createResource('appointments', payload);
  },
  updateAppointment(id: string, payload: Partial<Appointment>) {
    return updateResource('appointments', id, payload);
  },
  deleteAppointment(id: string) {
    return deleteResource('appointments', id);
  },

  createTransaction(payload: Omit<Transaction, 'id' | 'createdAt'>) {
    return createResource('transactions', payload);
  },
  updateTransaction(id: string, payload: Partial<Transaction>) {
    return updateResource('transactions', id, payload);
  },
  deleteTransaction(id: string) {
    return deleteResource('transactions', id);
  },

  createCampaign(payload: Omit<Campaign, 'id' | 'createdAt'>) {
    return createResource('campaigns', payload);
  },
  updateCampaign(id: string, payload: Partial<Campaign>) {
    return updateResource('campaigns', id, payload);
  },
  deleteCampaign(id: string) {
    return deleteResource('campaigns', id);
  },
};
