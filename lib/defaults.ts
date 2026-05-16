// Pre-loaded Argentine defaults shown during onboarding.
// These are the starting data — users can add/edit/archive from Settings later.
import type { PaymentMethod, Category } from '../types';

export const DEFAULT_PAYMENT_METHODS: PaymentMethod[] = [
  // ── Generic ──────────────────────────────────────────────────────────────
  { id: 'efectivo',     name: 'Efectivo',     icon: '💵',  color: '#2D9C5A', archived: false },
  { id: 'tarjeta',     name: 'Tarjeta',      icon: '💳',  color: '#3D3D5C', archived: false },
  // ── Top 9 billeteras virtuales Argentina ─────────────────────────────────
  { id: 'mercadopago', name: 'Mercado Pago', icon: 'MP',  color: '#3483FA', archived: false },
  { id: 'uala',        name: 'Ualá',         icon: 'ualá',color: '#7B3FE4', archived: false },
  { id: 'naranjax',    name: 'Naranja X',    icon: 'nX',  color: '#FF6900', archived: false },
  { id: 'personalpay', name: 'Personal Pay', icon: 'pay', color: '#E5007D', archived: false },
  { id: 'cuentadni',   name: 'Cuenta DNI',   icon: 'DNI', color: '#0033A0', archived: false },
  { id: 'modo',        name: 'Modo',         icon: 'modo',color: '#5046E4', archived: false },
  { id: 'brubank',     name: 'Brubank',      icon: 'bru', color: '#1E3A8A', archived: false },
  { id: 'lemon',       name: 'Lemon',        icon: '🍋',  color: '#FFD426', archived: false },
  { id: 'bbva',        name: 'BBVA',         icon: 'BBVA',color: '#004699', archived: false },
  // ── Comodín ──────────────────────────────────────────────────────────────
  { id: 'otro',        name: 'Otro',         icon: '+',   color: '#9E9E9E', archived: false },
];

export const DEFAULT_CATEGORIES: Category[] = [
  { id: 'verduleria',    name: 'Verdulería',    icon: '🥬', color: '#4CAF50', monthlyBudget: null, archived: false },
  { id: 'carniceria',    name: 'Carnicería',    icon: '🥩', color: '#EF5350', monthlyBudget: null, archived: false },
  { id: 'supermercado',  name: 'Supermercado',  icon: '🛒', color: '#2196F3', monthlyBudget: null, archived: false },
  { id: 'viandas',       name: 'Viandas',       icon: '🍱', color: '#FF9800', monthlyBudget: null, archived: false },
  { id: 'alquiler',      name: 'Alquiler',      icon: '🏠', color: '#795548', monthlyBudget: null, archived: false },
  { id: 'servicios',     name: 'Servicios',     icon: '💡', color: '#FFC107', monthlyBudget: null, archived: false },
  { id: 'suscripciones', name: 'Suscripciones', icon: '📺', color: '#9C27B0', monthlyBudget: null, archived: false },
  { id: 'transporte',    name: 'Transporte',    icon: '🚇', color: '#00BCD4', monthlyBudget: null, archived: false },
  { id: 'salidas',       name: 'Salidas',       icon: '🍷', color: '#E91E63', monthlyBudget: null, archived: false },
  { id: 'gimnasio',      name: 'Gimnasio',      icon: '🏋️', color: '#F44336', monthlyBudget: null, archived: false },
  { id: 'personal',      name: 'Personal',      icon: '✨', color: '#FF4081', monthlyBudget: null, archived: false },
  { id: 'otros',         name: 'Otros',         icon: '📦', color: '#9E9E9E', monthlyBudget: null, archived: false },
];
