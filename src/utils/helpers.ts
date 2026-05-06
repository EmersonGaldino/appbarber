import { format, parseISO, isValid } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { PaymentMethod, TransactionCategory } from '../types';

export function maskPhoneBR(value: string): string {
  const digits = (value ?? '').replace(/\D/g, '').slice(0, 11);
  if (digits.length === 0) return '';
  if (digits.length <= 2) return `(${digits}`;
  if (digits.length <= 6) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  }
  if (digits.length <= 10) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  }
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
}

export function unmaskPhone(value: string): string {
  return (value ?? '').replace(/\D/g, '');
}

export function formatPhoneBR(value: string): string {
  return maskPhoneBR(value);
}

export const PHONE_MASK_MAX_LENGTH = 15;

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
}

export function formatDate(dateStr: string): string {
  try {
    const date = parseISO(dateStr);
    if (!isValid(date)) return dateStr;
    return format(date, 'dd/MM/yyyy', { locale: ptBR });
  } catch {
    return dateStr;
  }
}

export function formatDateTime(dateStr: string, timeStr: string): string {
  return `${formatDate(dateStr)} às ${timeStr}`;
}

export function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h}h ${m}min` : `${h}h`;
}

export function paymentMethodLabel(method: PaymentMethod): string {
  const labels: Record<PaymentMethod, string> = {
    cash: 'Dinheiro',
    card_credit: 'Cartão de Crédito',
    card_debit: 'Cartão de Débito',
    pix: 'PIX',
    transfer: 'Transferência',
  };
  return labels[method] ?? method;
}

export function categoryLabel(category: TransactionCategory): string {
  const labels: Record<TransactionCategory, string> = {
    service: 'Serviço',
    product_sale: 'Venda de Produto',
    product_purchase: 'Compra de Produto',
    rent: 'Aluguel',
    utilities: 'Contas (água/luz/etc)',
    salary: 'Salário',
    supplies: 'Suprimentos',
    equipment: 'Equipamentos',
    other: 'Outros',
  };
  return labels[category] ?? category;
}

export function generateTimeSlots(start: string, end: string, intervalMin = 30): string[] {
  const slots: string[] = [];
  const [sh, sm] = start.split(':').map(Number);
  const [eh, em] = end.split(':').map(Number);
  let current = sh * 60 + sm;
  const endMinutes = eh * 60 + em;
  while (current < endMinutes) {
    const h = Math.floor(current / 60).toString().padStart(2, '0');
    const m = (current % 60).toString().padStart(2, '0');
    slots.push(`${h}:${m}`);
    current += intervalMin;
  }
  return slots;
}

export function addMinutesToTime(time: string, minutes: number): string {
  const [h, m] = time.split(':').map(Number);
  const total = h * 60 + m + minutes;
  const nh = Math.floor(total / 60) % 24;
  const nm = total % 60;
  return `${nh.toString().padStart(2, '0')}:${nm.toString().padStart(2, '0')}`;
}

export const DAYS_OF_WEEK = [
  { key: 'monday', label: 'Segunda-feira' },
  { key: 'tuesday', label: 'Terça-feira' },
  { key: 'wednesday', label: 'Quarta-feira' },
  { key: 'thursday', label: 'Quinta-feira' },
  { key: 'friday', label: 'Sexta-feira' },
  { key: 'saturday', label: 'Sábado' },
  { key: 'sunday', label: 'Domingo' },
];

export const PAYMENT_METHODS: { value: PaymentMethod; label: string }[] = [
  { value: 'cash', label: 'Dinheiro' },
  { value: 'card_credit', label: 'Cartão de Crédito' },
  { value: 'card_debit', label: 'Cartão de Débito' },
  { value: 'pix', label: 'PIX' },
  { value: 'transfer', label: 'Transferência' },
];

export const TRANSACTION_CATEGORIES: { value: TransactionCategory; label: string; type: 'income' | 'expense' | 'both' }[] = [
  { value: 'service', label: 'Serviço', type: 'income' },
  { value: 'product_sale', label: 'Venda de Produto', type: 'income' },
  { value: 'product_purchase', label: 'Compra de Produto', type: 'expense' },
  { value: 'rent', label: 'Aluguel', type: 'expense' },
  { value: 'utilities', label: 'Contas', type: 'expense' },
  { value: 'salary', label: 'Salário', type: 'expense' },
  { value: 'supplies', label: 'Suprimentos', type: 'expense' },
  { value: 'equipment', label: 'Equipamentos', type: 'both' },
  { value: 'other', label: 'Outros', type: 'both' },
];
