import { create } from 'zustand';
import type { Expense, Category, PaymentMethod, Settings } from '../types';
import * as repo from './repository';

type AppState = {
  // Persisted data
  expenses: Expense[];
  categories: Category[];
  paymentMethods: PaymentMethod[];
  settings: Settings;

  // True once AsyncStorage has been read on app start
  hydrated: boolean;

  // Expense actions
  hydrate: () => Promise<void>;
  addExpense: (e: Omit<Expense, 'id' | 'createdAt'>) => Promise<Expense>;
  updateExpense: (id: string, patch: Partial<Expense>) => Promise<void>;
  deleteExpense: (id: string) => Promise<void>;

  // Category actions
  saveCategories: (categories: Category[]) => Promise<void>;  // bulk replace (onboarding)
  upsertCategory: (category: Category) => Promise<void>;
  deleteCategory: (id: string) => Promise<void>;

  // Payment method actions
  savePaymentMethods: (methods: PaymentMethod[]) => Promise<void>; // bulk replace (onboarding)
  upsertPaymentMethod: (method: PaymentMethod) => Promise<void>;
  deletePaymentMethod: (id: string) => Promise<void>;

  // Settings
  updateSettings: (patch: Partial<Settings>) => Promise<void>;

  // Data management
  rehydrate: () => Promise<void>;
  clearAllData: () => Promise<void>;
};

const DEFAULT_SETTINGS: Settings = {
  totalMonthlyBudget: 0,
  currency: 'ARS',
  onboardingComplete: false,
  tutorialSeen: false,
};

export const useAppStore = create<AppState>((set) => ({
  expenses: [],
  categories: [],
  paymentMethods: [],
  settings: DEFAULT_SETTINGS,
  hydrated: false,

  hydrate: async () => {
    const [expenses, categories, paymentMethods, settings] = await Promise.all([
      repo.getExpenses(),
      repo.getCategories(),
      repo.getPaymentMethods(),
      repo.getSettings(),
    ]);
    set({ expenses, categories, paymentMethods, settings, hydrated: true });
  },

  // Re-read everything from storage (used after import)
  rehydrate: async () => {
    const [expenses, categories, paymentMethods, settings] = await Promise.all([
      repo.getExpenses(),
      repo.getCategories(),
      repo.getPaymentMethods(),
      repo.getSettings(),
    ]);
    set({ expenses, categories, paymentMethods, settings });
  },

  // ── Expenses ────────────────────────────────────────────────────────────

  addExpense: async (e) => {
    const expense = await repo.addExpense(e);
    set((state) => ({ expenses: [...state.expenses, expense] }));
    return expense;
  },

  updateExpense: async (id, patch) => {
    await repo.updateExpense(id, patch);
    set((state) => ({
      expenses: state.expenses.map((e) => (e.id === id ? { ...e, ...patch } : e)),
    }));
  },

  deleteExpense: async (id) => {
    await repo.deleteExpense(id);
    set((state) => ({ expenses: state.expenses.filter((e) => e.id !== id) }));
  },

  // ── Categories ───────────────────────────────────────────────────────────

  saveCategories: async (categories) => {
    await repo.replaceAllCategories(categories);
    set({ categories });
  },

  upsertCategory: async (category) => {
    await repo.upsertCategory(category);
    set((state) => {
      const exists = state.categories.some((c) => c.id === category.id);
      return {
        categories: exists
          ? state.categories.map((c) => (c.id === category.id ? category : c))
          : [...state.categories, category],
      };
    });
  },

  deleteCategory: async (id) => {
    await repo.deleteCategory(id);
    set((state) => ({ categories: state.categories.filter((c) => c.id !== id) }));
  },

  // ── Payment Methods ───────────────────────────────────────────────────────

  savePaymentMethods: async (methods) => {
    await repo.replaceAllPaymentMethods(methods);
    set({ paymentMethods: methods });
  },

  upsertPaymentMethod: async (method) => {
    await repo.upsertPaymentMethod(method);
    set((state) => {
      const exists = state.paymentMethods.some((m) => m.id === method.id);
      return {
        paymentMethods: exists
          ? state.paymentMethods.map((m) => (m.id === method.id ? method : m))
          : [...state.paymentMethods, method],
      };
    });
  },

  deletePaymentMethod: async (id) => {
    await repo.deletePaymentMethod(id);
    set((state) => ({ paymentMethods: state.paymentMethods.filter((m) => m.id !== id) }));
  },

  // ── Settings ─────────────────────────────────────────────────────────────

  updateSettings: async (patch) => {
    await repo.updateSettings(patch);
    set((state) => ({ settings: { ...state.settings, ...patch } }));
  },

  // ── Data management ──────────────────────────────────────────────────────

  clearAllData: async () => {
    await repo.clearAllData();
    set({ expenses: [], categories: [], paymentMethods: [], settings: DEFAULT_SETTINGS });
  },
}));
