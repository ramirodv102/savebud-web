// Data access layer — all AsyncStorage reads/writes go through here.
// Implements the Repository interface from types/index.ts.
// Swap this file for an expo-sqlite or remote implementation without touching any screen.
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Expense, Category, PaymentMethod, Settings, Repository } from '../types';

const KEYS = {
  expenses: 'savebud:expenses',
  categories: 'savebud:categories',
  paymentMethods: 'savebud:paymentMethods',
  settings: 'savebud:settings',
} as const;

const EXPORT_VERSION = 'savebud_export_v1';

// ── Generic helpers ──────────────────────────────────────────────────────────

async function readJSON<T>(key: string, fallback: T): Promise<T> {
  try {
    const raw = await AsyncStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

async function writeJSON<T>(key: string, value: T): Promise<void> {
  await AsyncStorage.setItem(key, JSON.stringify(value));
}

// Generates a locally-unique ID — sufficient for local-only V1 storage
function generateId(): string {
  return `${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 9)}`;
}

// ── Default settings ─────────────────────────────────────────────────────────

const DEFAULT_SETTINGS: Settings = {
  totalMonthlyBudget: 0,
  currency: 'ARS',
  onboardingComplete: false,
};

// ── Expenses ─────────────────────────────────────────────────────────────────

export async function getExpenses(): Promise<Expense[]> {
  return readJSON<Expense[]>(KEYS.expenses, []);
}

export async function addExpense(
  e: Omit<Expense, 'id' | 'createdAt'>,
): Promise<Expense> {
  const expense: Expense = {
    ...e,
    id: generateId(),
    createdAt: new Date().toISOString(),
  };
  const all = await getExpenses();
  await writeJSON(KEYS.expenses, [...all, expense]);
  return expense;
}

export async function updateExpense(
  id: string,
  patch: Partial<Expense>,
): Promise<void> {
  const all = await getExpenses();
  await writeJSON(
    KEYS.expenses,
    all.map((e) => (e.id === id ? { ...e, ...patch } : e)),
  );
}

export async function deleteExpense(id: string): Promise<void> {
  const all = await getExpenses();
  await writeJSON(KEYS.expenses, all.filter((e) => e.id !== id));
}

// ── Categories ───────────────────────────────────────────────────────────────

export async function getCategories(): Promise<Category[]> {
  return readJSON<Category[]>(KEYS.categories, []);
}

export async function upsertCategory(category: Category): Promise<void> {
  const all = await getCategories();
  const exists = all.some((c) => c.id === category.id);
  const next = exists
    ? all.map((c) => (c.id === category.id ? category : c))
    : [...all, category];
  await writeJSON(KEYS.categories, next);
}

export async function deleteCategory(id: string): Promise<void> {
  const all = await getCategories();
  await writeJSON(KEYS.categories, all.filter((c) => c.id !== id));
}

// Internal helper — used only by store bulk-save (onboarding, import)
export async function replaceAllCategories(categories: Category[]): Promise<void> {
  await writeJSON(KEYS.categories, categories);
}

// ── Payment Methods ──────────────────────────────────────────────────────────

export async function getPaymentMethods(): Promise<PaymentMethod[]> {
  return readJSON<PaymentMethod[]>(KEYS.paymentMethods, []);
}

export async function upsertPaymentMethod(method: PaymentMethod): Promise<void> {
  const all = await getPaymentMethods();
  const exists = all.some((m) => m.id === method.id);
  const next = exists
    ? all.map((m) => (m.id === method.id ? method : m))
    : [...all, method];
  await writeJSON(KEYS.paymentMethods, next);
}

export async function deletePaymentMethod(id: string): Promise<void> {
  const all = await getPaymentMethods();
  await writeJSON(KEYS.paymentMethods, all.filter((m) => m.id !== id));
}

// Internal helper — used only by store bulk-save (onboarding, import)
export async function replaceAllPaymentMethods(methods: PaymentMethod[]): Promise<void> {
  await writeJSON(KEYS.paymentMethods, methods);
}

// ── Settings ──────────────────────────────────────────────────────────────────

export async function getSettings(): Promise<Settings> {
  return readJSON<Settings>(KEYS.settings, DEFAULT_SETTINGS);
}

export async function updateSettings(patch: Partial<Settings>): Promise<void> {
  const current = await getSettings();
  await writeJSON(KEYS.settings, { ...current, ...patch });
}

// ── Export / Import ───────────────────────────────────────────────────────────

export async function exportAllData(): Promise<string> {
  const [expenses, categories, paymentMethods, settings] = await Promise.all([
    getExpenses(),
    getCategories(),
    getPaymentMethods(),
    getSettings(),
  ]);
  return JSON.stringify(
    { version: EXPORT_VERSION, exportedAt: new Date().toISOString(), expenses, categories, paymentMethods, settings },
    null,
    2,
  );
}

export async function importAllData(json: string): Promise<void> {
  const data = JSON.parse(json) as {
    expenses: Expense[];
    categories: Category[];
    paymentMethods: PaymentMethod[];
    settings: Settings;
  };
  await Promise.all([
    writeJSON(KEYS.expenses, data.expenses ?? []),
    writeJSON(KEYS.categories, data.categories ?? []),
    writeJSON(KEYS.paymentMethods, data.paymentMethods ?? []),
    writeJSON(KEYS.settings, { ...DEFAULT_SETTINGS, ...(data.settings ?? {}) }),
  ]);
}

// ── Clear ────────────────────────────────────────────────────────────────────

export async function clearAllData(): Promise<void> {
  await Promise.all(Object.values(KEYS).map((k) => AsyncStorage.removeItem(k)));
}

// Re-export version constant so backup.ts can validate imports
export { EXPORT_VERSION };
