import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { v4 as uuidv4 } from 'uuid';
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
import { defaultData, loadAppData, persistAppData, markSeededFlag } from '../database';

interface AppContextType {
  data: AppData;
  loading: boolean;

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
  const dataRef = useRef<AppData>(defaultData);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    dataRef.current = data;
  }, [data]);

  useEffect(() => {
    loadAppData()
      .then((loaded) => {
        dataRef.current = loaded;
        setData(loaded);
      })
      .catch((e) => {
        console.error('Falha ao carregar dados:', e);
      })
      .finally(() => setLoading(false));
  }, []);

  const persistChain = useRef(Promise.resolve());

  /** Atualiza estado + SQLite a partir do último snapshot; fila gravações para evitar condição de corrida. */
  const commit = useCallback(async (updater: (prev: AppData) => AppData) => {
    await new Promise<void>((resolve, reject) => {
      persistChain.current = persistChain.current
        .then(async () => {
          const next = updater(dataRef.current);
          dataRef.current = next;
          await persistAppData(next);
          setData(next);
        })
        .then(() => resolve())
        .catch(reject);
    });
  }, []);

  const addUser = useCallback(async (user: Omit<User, 'id' | 'createdAt'>): Promise<User> => {
    const newItem: User = {
      ...user,
      id: uuidv4(),
      createdAt: new Date().toISOString(),
    };
    await commit((prev) => ({
      ...prev,
      users: [...prev.users, newItem],
    }));
    return newItem;
  }, [commit]);

  const updateUser = useCallback(
    async (id: string, user: Partial<User>) => {
      await commit((prev) => ({
        ...prev,
        users: prev.users.map((u) => (u.id === id ? { ...u, ...user } : u)),
      }));
    },
    [commit]
  );

  const deleteUser = useCallback(
    async (id: string) => {
      await commit((prev) => ({
        ...prev,
        users: prev.users.filter((u) => u.id !== id),
      }));
    },
    [commit]
  );

  const addService = useCallback(async (service: Omit<Service, 'id' | 'createdAt'>) => {
    const newItem: Service = {
      ...service,
      id: uuidv4(),
      createdAt: new Date().toISOString(),
    };
    await commit((prev) => ({
      ...prev,
      services: [...prev.services, newItem],
    }));
  }, [commit]);

  const updateService = useCallback(
    async (id: string, service: Partial<Service>) => {
      await commit((prev) => ({
        ...prev,
        services: prev.services.map((s) => (s.id === id ? { ...s, ...service } : s)),
      }));
    },
    [commit]
  );

  const deleteService = useCallback(
    async (id: string) => {
      await commit((prev) => ({
        ...prev,
        services: prev.services.filter((s) => s.id !== id),
      }));
    },
    [commit]
  );

  const addProfessional = useCallback(async (professional: Omit<Professional, 'id' | 'createdAt'>): Promise<Professional> => {
    const newItem: Professional = {
      ...professional,
      id: uuidv4(),
      createdAt: new Date().toISOString(),
    };
    await commit((prev) => ({
      ...prev,
      professionals: [...prev.professionals, newItem],
    }));
    return newItem;
  }, [commit]);

  const updateProfessional = useCallback(
    async (id: string, professional: Partial<Professional>) => {
      await commit((prev) => ({
        ...prev,
        professionals: prev.professionals.map((p) => (p.id === id ? { ...p, ...professional } : p)),
      }));
    },
    [commit]
  );

  const deleteProfessional = useCallback(
    async (id: string) => {
      await commit((prev) => ({
        ...prev,
        professionals: prev.professionals.filter((p) => p.id !== id),
        users: prev.users.filter((u) => u.professionalId !== id),
      }));
    },
    [commit]
  );

  const addProduct = useCallback(async (product: Omit<Product, 'id' | 'createdAt'>) => {
    const newItem: Product = {
      ...product,
      id: uuidv4(),
      createdAt: new Date().toISOString(),
    };
    await commit((prev) => ({
      ...prev,
      products: [...prev.products, newItem],
    }));
  }, [commit]);

  const updateProduct = useCallback(
    async (id: string, product: Partial<Product>) => {
      await commit((prev) => ({
        ...prev,
        products: prev.products.map((p) => (p.id === id ? { ...p, ...product } : p)),
      }));
    },
    [commit]
  );

  const deleteProduct = useCallback(
    async (id: string) => {
      await commit((prev) => ({
        ...prev,
        products: prev.products.filter((p) => p.id !== id),
      }));
    },
    [commit]
  );

  const addAppointment = useCallback(async (appointment: Omit<Appointment, 'id' | 'createdAt'>) => {
    const newItem: Appointment = { ...appointment, id: uuidv4(), createdAt: new Date().toISOString() };
    await commit((prev) => ({
      ...prev,
      appointments: [...prev.appointments, newItem],
    }));
  }, [commit]);

  const updateAppointment = useCallback(
    async (id: string, appointment: Partial<Appointment>) => {
      await commit((prev) => {
        const existing = prev.appointments.find((a) => a.id === id);
        let transactions = prev.transactions;

        if (appointment.status === 'completed' && existing?.status !== 'completed') {
          const updated: Appointment = { ...existing!, ...appointment };
          const tx: Transaction = {
            id: uuidv4(),
            type: 'income',
            category: 'service',
            description: `Atendimento - ${updated.clientName}`,
            amount: updated.totalValue,
            date: updated.date,
            paymentMethod: updated.paymentMethod,
            appointmentId: id,
            createdAt: new Date().toISOString(),
          };
          transactions = [...prev.transactions, tx];
        }

        return {
          ...prev,
          transactions,
          appointments: prev.appointments.map((a) => (a.id === id ? { ...a, ...appointment } : a)),
        };
      });
    },
    [commit]
  );

  const deleteAppointment = useCallback(
    async (id: string) => {
      await commit((prev) => ({
        ...prev,
        appointments: prev.appointments.filter((a) => a.id !== id),
      }));
    },
    [commit]
  );

  const addTransaction = useCallback(async (transaction: Omit<Transaction, 'id' | 'createdAt'>) => {
    const newItem: Transaction = {
      ...transaction,
      id: uuidv4(),
      createdAt: new Date().toISOString(),
    };
    await commit((prev) => ({
      ...prev,
      transactions: [...prev.transactions, newItem],
    }));
  }, [commit]);

  const updateTransaction = useCallback(
    async (id: string, transaction: Partial<Transaction>) => {
      await commit((prev) => ({
        ...prev,
        transactions: prev.transactions.map((t) => (t.id === id ? { ...t, ...transaction } : t)),
      }));
    },
    [commit]
  );

  const deleteTransaction = useCallback(
    async (id: string) => {
      await commit((prev) => ({
        ...prev,
        transactions: prev.transactions.filter((t) => t.id !== id),
      }));
    },
    [commit]
  );

  const addCampaign = useCallback(
    async (campaign: Omit<Campaign, 'id' | 'createdAt'>): Promise<Campaign> => {
      const newItem: Campaign = {
        ...campaign,
        id: uuidv4(),
        createdAt: new Date().toISOString(),
      };
      await commit((prev) => ({
        ...prev,
        campaigns: [newItem, ...(prev.campaigns ?? [])],
      }));
      return newItem;
    },
    [commit]
  );

  const updateCampaign = useCallback(
    async (id: string, campaign: Partial<Campaign>) => {
      await commit((prev) => ({
        ...prev,
        campaigns: (prev.campaigns ?? []).map((c) =>
          c.id === id ? { ...c, ...campaign } : c
        ),
      }));
    },
    [commit]
  );

  const deleteCampaign = useCallback(
    async (id: string) => {
      await commit((prev) => ({
        ...prev,
        campaigns: (prev.campaigns ?? []).filter((c) => c.id !== id),
      }));
    },
    [commit]
  );

  const clearAllData = useCallback(async () => {
    await markSeededFlag();
    await commit(() => defaultData);
  }, [commit]);

  return (
    <AppContext.Provider
      value={{
        data,
        loading,
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
