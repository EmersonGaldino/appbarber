import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppData } from '../types';

export const STORAGE_KEY = '@appBarber:data';

export const defaultData: AppData = {
  users: [],
  services: [],
  professionals: [],
  products: [],
  appointments: [],
  transactions: [],
  campaigns: [],
};

export async function loadData(): Promise<AppData> {
  try {
    const json = await AsyncStorage.getItem(STORAGE_KEY);
    if (json) {
      return JSON.parse(json);
    }
    return defaultData;
  } catch {
    return defaultData;
  }
}

export async function saveData(data: AppData): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (e) {
    console.error('Erro ao salvar dados:', e);
  }
}
