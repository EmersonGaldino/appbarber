import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { AppState, type AppStateStatus } from 'react-native';
import {
  AppData,
  Campaign,
  Service,
  Professional,
  Product,
  Appointment,
  Transaction,
  User,
} from '../types';
import { defaultData } from '../utils/storage';
import { appApi } from '../services/appApi';

const FOREGROUND_REFRESH_INTERVAL_MS = 15_000;

interface AppContextType {
  data: AppData;
  loading: boolean;
  refreshData: () => Promise<void>;

  addUser: (user: Omit<User, 'id' | 'createdAt'>) => Promise<User>;
  updateUser: (id: string, user: Partial<User>) => Promise<void>;
  deleteUser: (id: string) => Promise<void>;

  addService: (service: Omit<Service, 'id' | 'createdAt'>) => Promise<void>;
  updateService: (id: string, service: Partial<Service>) => Promise<void>;
  deleteService: (id: string) => Promise<void>;

  addProfessional: (professional: Omit<Professional, 'id' | 'createdAt'>) => Promise<Professional>;
  updateProfessional: (id: string, professional: Partial<Professional>) => Promise<void>;
  deleteProfessional: (id: string) => Promise<void>;

  addProduct: (product: Omit<Product, 'id' | 'createdAt'>) => Promise<void>;
  updateProduct: (id: string, product: Partial<Product>) => Promise<void>;
  deleteProduct: (id: string) => Promise<void>;

  addAppointment: (appointment: Omit<Appointment, 'id' | 'createdAt'>) => Promise<void>;
  updateAppointment: (id: string, appointment: Partial<Appointment>) => Promise<void>;
  deleteAppointment: (id: string) => Promise<void>;

  addTransaction: (transaction: Omit<Transaction, 'id' | 'createdAt'>) => Promise<void>;
  updateTransaction: (id: string, transaction: Partial<Transaction>) => Promise<void>;
  deleteTransaction: (id: string) => Promise<void>;

  addCampaign: (campaign: Omit<Campaign, 'id' | 'createdAt'>) => Promise<Campaign>;
  updateCampaign: (id: string, campaign: Partial<Campaign>) => Promise<void>;
  deleteCampaign: (id: string) => Promise<void>;

  clearAllData: () => Promise<void>;
}

const AppContext = createContext<AppContextType | null>(null);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [data, setData] = useState<AppData>(defaultData);
  const [loading, setLoading] = useState(true);
  const refreshInFlight = useRef<Promise<void> | null>(null);

  const refreshData = useCallback(async () => {
    if (refreshInFlight.current) return refreshInFlight.current;
    const promise = appApi
      .getAppData()
      .then((loaded) => {
        setData(loaded);
      })
      .catch((e) => {
        console.warn('Falha ao sincronizar com a API:', e);
      })
      .finally(() => {
        refreshInFlight.current = null;
      });
    refreshInFlight.current = promise;
    return promise;
  }, []);

  useEffect(() => {
    refreshData().finally(() => setLoading(false));
  }, [refreshData]);

  useEffect(() => {
    const handleAppStateChange = (state: AppStateStatus) => {
      if (state === 'active') {
        refreshData();
      }
    };
    const sub = AppState.addEventListener('change', handleAppStateChange);
    return () => sub.remove();
  }, [refreshData]);

  useEffect(() => {
    const id = setInterval(() => {
      if (AppState.currentState === 'active') {
        refreshData();
      }
    }, FOREGROUND_REFRESH_INTERVAL_MS);
    return () => clearInterval(id);
  }, [refreshData]);

  const addUser = useCallback(async (user: Omit<User, 'id' | 'createdAt'>): Promise<User> => {
    const created = await appApi.createUser(user);
    setData((prev) => ({ ...prev, users: [...prev.users, created] }));
    refreshData();
    return created;
  }, [refreshData]);

  const updateUser = useCallback(
    async (id: string, user: Partial<User>) => {
      const updated = await appApi.updateUser(id, user);
      setData((prev) => ({
        ...prev,
        users: prev.users.map((u) => (u.id === id ? updated : u)),
      }));
      refreshData();
    },
    [refreshData]
  );

  const deleteUser = useCallback(
    async (id: string) => {
      await appApi.deleteUser(id);
      setData((prev) => ({
        ...prev,
        users: prev.users.filter((u) => u.id !== id),
      }));
      refreshData();
    },
    [refreshData]
  );

  const addService = useCallback(async (service: Omit<Service, 'id' | 'createdAt'>) => {
    const created = await appApi.createService(service);
    setData((prev) => ({
      ...prev,
      services: [...prev.services, created],
    }));
    refreshData();
  }, [refreshData]);

  const updateService = useCallback(
    async (id: string, service: Partial<Service>) => {
      const updated = await appApi.updateService(id, service);
      setData((prev) => ({
        ...prev,
        services: prev.services.map((s) => (s.id === id ? updated : s)),
      }));
      refreshData();
    },
    [refreshData]
  );

  const deleteService = useCallback(
    async (id: string) => {
      await appApi.deleteService(id);
      setData((prev) => ({
        ...prev,
        services: prev.services.filter((s) => s.id !== id),
      }));
      refreshData();
    },
    [refreshData]
  );

  const addProfessional = useCallback(async (professional: Omit<Professional, 'id' | 'createdAt'>): Promise<Professional> => {
    const created = await appApi.createProfessional(professional);
    setData((prev) => ({
      ...prev,
      professionals: [...prev.professionals, created],
    }));
    refreshData();
    return created;
  }, [refreshData]);

  const updateProfessional = useCallback(
    async (id: string, professional: Partial<Professional>) => {
      const updated = await appApi.updateProfessional(id, professional);
      setData((prev) => ({
        ...prev,
        professionals: prev.professionals.map((p) => (p.id === id ? updated : p)),
      }));
      refreshData();
    },
    [refreshData]
  );

  const deleteProfessional = useCallback(
    async (id: string) => {
      await appApi.deleteProfessional(id);
      setData((prev) => ({
        ...prev,
        professionals: prev.professionals.filter((p) => p.id !== id),
        users: prev.users.filter((u) => u.professionalId !== id),
      }));
      refreshData();
    },
    [refreshData]
  );

  const addProduct = useCallback(async (product: Omit<Product, 'id' | 'createdAt'>) => {
    const created = await appApi.createProduct(product);
    setData((prev) => ({
      ...prev,
      products: [...prev.products, created],
    }));
    refreshData();
  }, [refreshData]);

  const updateProduct = useCallback(
    async (id: string, product: Partial<Product>) => {
      const updated = await appApi.updateProduct(id, product);
      setData((prev) => ({
        ...prev,
        products: prev.products.map((p) => (p.id === id ? updated : p)),
      }));
      refreshData();
    },
    [refreshData]
  );

  const deleteProduct = useCallback(
    async (id: string) => {
      await appApi.deleteProduct(id);
      setData((prev) => ({
        ...prev,
        products: prev.products.filter((p) => p.id !== id),
      }));
      refreshData();
    },
    [refreshData]
  );

  const addAppointment = useCallback(async (appointment: Omit<Appointment, 'id' | 'createdAt'>) => {
    const created = await appApi.createAppointment(appointment);
    setData((prev) => ({
      ...prev,
      appointments: [...prev.appointments, created],
    }));
    refreshData();
  }, [refreshData]);

  const updateAppointment = useCallback(
    async (id: string, appointment: Partial<Appointment>) => {
      await appApi.updateAppointment(id, appointment);
      await refreshData();
    },
    [refreshData]
  );

  const deleteAppointment = useCallback(
    async (id: string) => {
      await appApi.deleteAppointment(id);
      setData((prev) => ({
        ...prev,
        appointments: prev.appointments.filter((a) => a.id !== id),
      }));
      refreshData();
    },
    [refreshData]
  );

  const addTransaction = useCallback(async (transaction: Omit<Transaction, 'id' | 'createdAt'>) => {
    const created = await appApi.createTransaction(transaction);
    setData((prev) => ({
      ...prev,
      transactions: [...prev.transactions, created],
    }));
    refreshData();
  }, [refreshData]);

  const updateTransaction = useCallback(
    async (id: string, transaction: Partial<Transaction>) => {
      const updated = await appApi.updateTransaction(id, transaction);
      setData((prev) => ({
        ...prev,
        transactions: prev.transactions.map((t) => (t.id === id ? updated : t)),
      }));
      refreshData();
    },
    [refreshData]
  );

  const deleteTransaction = useCallback(
    async (id: string) => {
      await appApi.deleteTransaction(id);
      setData((prev) => ({
        ...prev,
        transactions: prev.transactions.filter((t) => t.id !== id),
      }));
      refreshData();
    },
    [refreshData]
  );

  const addCampaign = useCallback(
    async (campaign: Omit<Campaign, 'id' | 'createdAt'>): Promise<Campaign> => {
      const created = await appApi.createCampaign(campaign);
      setData((prev) => ({
        ...prev,
        campaigns: [created, ...(prev.campaigns ?? [])],
      }));
      refreshData();
      return created;
    },
    [refreshData]
  );

  const updateCampaign = useCallback(
    async (id: string, campaign: Partial<Campaign>) => {
      const updated = await appApi.updateCampaign(id, campaign);
      setData((prev) => ({
        ...prev,
        campaigns: (prev.campaigns ?? []).map((c) =>
          c.id === id ? updated : c
        ),
      }));
      refreshData();
    },
    [refreshData]
  );

  const deleteCampaign = useCallback(
    async (id: string) => {
      await appApi.deleteCampaign(id);
      setData((prev) => ({
        ...prev,
        campaigns: (prev.campaigns ?? []).filter((c) => c.id !== id),
      }));
      refreshData();
    },
    [refreshData]
  );

  const clearAllData = useCallback(async () => {
    const cleared = await appApi.clearAppData();
    setData(cleared);
  }, []);

  return (
    <AppContext.Provider
      value={{
        data,
        loading,
        refreshData,
        addUser, updateUser, deleteUser,
        addService, updateService, deleteService,
        addProfessional, updateProfessional, deleteProfessional,
        addProduct, updateProduct, deleteProduct,
        addAppointment, updateAppointment, deleteAppointment,
        addTransaction, updateTransaction, deleteTransaction,
        addCampaign, updateCampaign, deleteCampaign,
        clearAllData,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useAppContext() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useAppContext must be used within AppProvider');
  return ctx;
}
