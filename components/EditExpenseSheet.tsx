import { useState, useRef, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Pressable,
  TextInput,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Animated,
  Dimensions,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { X, ChevronLeft, ChevronRight, Trash2 } from 'lucide-react-native';
import { format, parseISO, subDays, addDays, isAfter, startOfDay } from 'date-fns';
import { es } from 'date-fns/locale';
import { useAppStore } from '../store/useAppStore';
import { colors, spacing, radius, typography } from '../lib/theme';
import type { Expense } from '../types';

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatDisplay(digits: string): string {
  if (!digits) return '';
  const n = parseInt(digits, 10);
  return isNaN(n) ? '' : new Intl.NumberFormat('es-AR').format(n);
}

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

function yesterdayISO(): string {
  return subDays(new Date(), 1).toISOString().slice(0, 10);
}

// ── Component ─────────────────────────────────────────────────────────────────

type Props = {
  visible: boolean;
  expense: Expense | null;
  onClose: () => void;
};

const { height: SCREEN_H } = Dimensions.get('window');

export function EditExpenseSheet({ visible, expense, onClose }: Props) {
  const insets = useSafeAreaInsets();
  const categories     = useAppStore((s) => s.categories);
  const paymentMethods = useAppStore((s) => s.paymentMethods);
  const updateExpense  = useAppStore((s) => s.updateExpense);
  const deleteExpense  = useAppStore((s) => s.deleteExpense);

  const [digits,     setDigits]     = useState('');
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [methodId,   setMethodId]   = useState<string | null>(null);
  const [date,       setDate]       = useState(todayISO());
  const [note,       setNote]       = useState('');
  const [saving,     setSaving]     = useState(false);

  const slideAnim    = useRef(new Animated.Value(SCREEN_H)).current;
  const backdropAnim = useRef(new Animated.Value(0)).current;

  const activeCategories = categories.filter((c) => !c.archived);
  const activeMethods    = paymentMethods.filter((m) => !m.archived);

  // Pre-fill from expense whenever the sheet opens
  useEffect(() => {
    if (visible && expense) {
      setDigits(String(expense.amount));
      setCategoryId(expense.categoryId);
      setMethodId(expense.paymentMethodId);
      setDate(expense.date);
      setNote(expense.note ?? '');

      Animated.parallel([
        Animated.spring(slideAnim, {
          toValue: 0,
          useNativeDriver: true,
          damping: 20,
          stiffness: 260,
        }),
        Animated.timing(backdropAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible, expense]);

  const dismiss = useCallback(() => {
    Animated.parallel([
      Animated.timing(slideAnim, { toValue: SCREEN_H, duration: 260, useNativeDriver: true }),
      Animated.timing(backdropAnim, { toValue: 0, duration: 200, useNativeDriver: true }),
    ]).start(onClose);
  }, [onClose, slideAnim, backdropAnim]);

  function handleAmountChange(text: string) {
    const d = text.replace(/\D/g, '');
    if (parseInt(d || '0', 10) <= 100_000_000) setDigits(d);
  }

  function shiftDate(delta: number) {
    const next = addDays(parseISO(date), delta);
    if (isAfter(startOfDay(next), startOfDay(new Date()))) return;
    setDate(next.toISOString().slice(0, 10));
  }

  async function handleSave() {
    if (!canSave || saving || !expense) return;
    setSaving(true);
    try {
      await updateExpense(expense.id, {
        amount: parseInt(digits, 10),
        categoryId: categoryId!,
        paymentMethodId: methodId!,
        date,
        note: note.trim() || undefined,
      });
      dismiss();
    } finally {
      setSaving(false);
    }
  }

  function handleDelete() {
    if (!expense) return;
    Alert.alert(
      'Eliminar gasto',
      '¿Seguro que querés eliminar este gasto?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            await deleteExpense(expense.id);
            dismiss();
          },
        },
      ],
    );
  }

  const canSave    = digits.length > 0 && parseInt(digits, 10) > 0 && !!categoryId && !!methodId;
  const isToday    = date === todayISO();
  const isYesterday = date === yesterdayISO();

  return (
    <Modal
      transparent
      visible={visible}
      animationType="none"
      onRequestClose={dismiss}
      statusBarTranslucent
    >
      <View style={styles.root}>
        <Animated.View style={[StyleSheet.absoluteFill, styles.backdrop, { opacity: backdropAnim }]} />
        <Pressable style={StyleSheet.absoluteFill} onPress={dismiss} />

        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.kav}
          pointerEvents="box-none"
        >
          <Animated.View
            style={[
              styles.sheet,
              { paddingBottom: Math.max(insets.bottom, spacing.md) },
              { transform: [{ translateY: slideAnim }] },
            ]}
          >
            <View style={styles.handle} />

            {/* Header row: title + close */}
            <View style={styles.header}>
              <Text style={styles.headerTitle}>Editar gasto</Text>
              <Pressable onPress={dismiss} hitSlop={12}>
                <X size={20} color={colors.inkMuted} strokeWidth={2} />
              </Pressable>
            </View>

            <ScrollView
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.scrollContent}
            >
              {/* ── Amount ──────────────────────────────────────────────── */}
              <View style={styles.amountRow}>
                <Text style={[styles.currencySymbol, !!digits && styles.currencyFilled]}>$</Text>
                <TextInput
                  style={styles.amountInput}
                  value={formatDisplay(digits)}
                  onChangeText={handleAmountChange}
                  keyboardType="numeric"
                  placeholder="0"
                  placeholderTextColor={colors.border}
                  selectionColor={colors.primary}
                  returnKeyType="done"
                />
              </View>

              {/* ── Category ────────────────────────────────────────────── */}
              <Text style={styles.label}>Categoría</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.hScroll}
              >
                {activeCategories.map((cat) => {
                  const sel = categoryId === cat.id;
                  return (
                    <Pressable key={cat.id} style={styles.catChip} onPress={() => setCategoryId(cat.id)}>
                      <View style={[
                        styles.catCircle,
                        { backgroundColor: sel ? cat.color : colors.surfaceAlt },
                        sel && styles.catCircleSelected,
                      ]}>
                        <Text style={styles.catEmoji}>{cat.icon}</Text>
                      </View>
                      <Text
                        style={[styles.catName, sel && styles.catNameSelected]}
                        numberOfLines={2}
                      >
                        {cat.name}
                      </Text>
                    </Pressable>
                  );
                })}
              </ScrollView>

              {/* ── Payment method ───────────────────────────────────────── */}
              <Text style={styles.label}>Medio de pago</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.hScroll}
              >
                {activeMethods.map((pm) => {
                  const sel = methodId === pm.id;
                  const shortIcon = pm.icon.length > 4 ? pm.icon.slice(0, 2) : pm.icon;
                  return (
                    <Pressable
                      key={pm.id}
                      style={[
                        styles.pmChip,
                        { borderColor: sel ? pm.color : colors.border },
                        sel && { backgroundColor: pm.color + '15' },
                      ]}
                      onPress={() => setMethodId(pm.id)}
                    >
                      <View style={[styles.pmDot, { backgroundColor: pm.color }]}>
                        <Text style={styles.pmIcon}>{shortIcon}</Text>
                      </View>
                      <Text
                        style={[styles.pmName, sel && styles.pmNameSelected]}
                        numberOfLines={1}
                      >
                        {pm.name}
                      </Text>
                    </Pressable>
                  );
                })}
              </ScrollView>

              {/* ── Date ────────────────────────────────────────────────── */}
              <Text style={styles.label}>Fecha</Text>
              <View style={styles.dateRow}>
                <Pressable
                  style={[styles.datePill, isToday && styles.datePillActive]}
                  onPress={() => setDate(todayISO())}
                >
                  <Text style={[styles.datePillText, isToday && styles.datePillActiveText]}>Hoy</Text>
                </Pressable>
                <Pressable
                  style={[styles.datePill, isYesterday && styles.datePillActive]}
                  onPress={() => setDate(yesterdayISO())}
                >
                  <Text style={[styles.datePillText, isYesterday && styles.datePillActiveText]}>Ayer</Text>
                </Pressable>
                <View style={[styles.dateNav, !isToday && !isYesterday && styles.dateNavActive]}>
                  <Pressable onPress={() => shiftDate(-1)} hitSlop={8}>
                    <ChevronLeft size={15} color={colors.inkMuted} strokeWidth={2} />
                  </Pressable>
                  <Text style={styles.dateNavText}>
                    {format(parseISO(date), "d 'de' MMM.", { locale: es })}
                  </Text>
                  <Pressable onPress={() => shiftDate(1)} hitSlop={8} disabled={isToday}>
                    <ChevronRight
                      size={15}
                      color={isToday ? colors.border : colors.inkMuted}
                      strokeWidth={2}
                    />
                  </Pressable>
                </View>
              </View>

              {/* ── Note ────────────────────────────────────────────────── */}
              <Text style={styles.label}>
                Nota <Text style={styles.optional}>(opcional)</Text>
              </Text>
              <TextInput
                style={styles.noteInput}
                value={note}
                onChangeText={setNote}
                placeholder="Ej: almuerzo de trabajo"
                placeholderTextColor={colors.inkFaint}
                returnKeyType="done"
                maxLength={120}
                selectionColor={colors.primary}
              />

              <View style={{ height: spacing.lg }} />
            </ScrollView>

            {/* ── Actions ─────────────────────────────────────────────── */}
            <View style={styles.footer}>
              <Pressable
                style={[styles.saveBtn, !canSave && styles.saveBtnDisabled]}
                onPress={handleSave}
                disabled={!canSave || saving}
              >
                <Text style={styles.saveBtnText}>
                  {saving ? 'Guardando...' : 'Guardar cambios'}
                </Text>
              </Pressable>
              <Pressable style={styles.deleteBtn} onPress={handleDelete}>
                <Trash2 size={15} color={colors.error} strokeWidth={2} />
                <Text style={styles.deleteBtnText}>Eliminar gasto</Text>
              </Pressable>
            </View>
          </Animated.View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: { flex: 1 },
  backdrop: { backgroundColor: 'rgba(0,0,0,0.45)' },
  kav: { flex: 1, justifyContent: 'flex-end' },

  sheet: {
    backgroundColor: colors.background,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: SCREEN_H * 0.88,
  },
  handle: {
    width: 36, height: 4, borderRadius: 2,
    backgroundColor: colors.border,
    alignSelf: 'center',
    marginTop: spacing.md,
    marginBottom: spacing.xs,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  headerTitle: {
    fontFamily: typography.displayBold,
    fontSize: typography.size.lg,
    color: colors.ink,
  },
  scrollContent: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xs,
  },

  amountRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: spacing.lg, gap: 4,
  },
  currencySymbol: {
    fontFamily: typography.display, fontSize: 40,
    color: colors.border, lineHeight: 52,
  },
  currencyFilled: { color: colors.inkMuted },
  amountInput: {
    fontFamily: typography.displayBold, fontSize: 48,
    color: colors.ink, flex: 1, padding: 0, lineHeight: 56,
  },

  label: {
    fontFamily: typography.bodySemibold, fontSize: typography.size.xs,
    color: colors.inkMuted, textTransform: 'uppercase',
    letterSpacing: 0.7, marginBottom: spacing.sm, marginTop: spacing.md,
  },
  optional: {
    fontFamily: typography.body, color: colors.inkFaint,
    textTransform: 'none', letterSpacing: 0,
  },
  hScroll: { gap: spacing.sm, paddingBottom: spacing.xs, paddingRight: spacing.lg },

  catChip: { alignItems: 'center', gap: spacing.xs, width: 64 },
  catCircle: {
    width: 52, height: 52, borderRadius: 26,
    alignItems: 'center', justifyContent: 'center',
  },
  catCircleSelected: {
    shadowColor: '#000', shadowOpacity: 0.15,
    shadowRadius: 6, shadowOffset: { width: 0, height: 2 }, elevation: 3,
  },
  catEmoji: { fontSize: 22 },
  catName: {
    fontFamily: typography.body, fontSize: typography.size.xs,
    color: colors.inkMuted, textAlign: 'center', lineHeight: 14,
  },
  catNameSelected: { color: colors.ink, fontFamily: typography.bodyMedium },

  pmChip: {
    flexDirection: 'row', alignItems: 'center',
    gap: spacing.xs, borderWidth: 1, borderRadius: radius.full,
    paddingVertical: 6, paddingHorizontal: spacing.sm,
    backgroundColor: colors.surface,
  },
  pmDot: { width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  pmIcon: { fontFamily: typography.bodySemibold, fontSize: 10, color: colors.white },
  pmName: {
    fontFamily: typography.body, fontSize: typography.size.sm,
    color: colors.inkMuted, maxWidth: 80,
  },
  pmNameSelected: { color: colors.ink, fontFamily: typography.bodyMedium },

  dateRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  datePill: {
    paddingVertical: 7, paddingHorizontal: spacing.md,
    borderRadius: radius.full, borderWidth: 1,
    borderColor: colors.border, backgroundColor: colors.surface,
  },
  datePillActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  datePillText: { fontFamily: typography.bodyMedium, fontSize: typography.size.sm, color: colors.inkMuted },
  datePillActiveText: { color: colors.white },
  dateNav: {
    flex: 1, flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', paddingVertical: 7,
    paddingHorizontal: spacing.sm, borderRadius: radius.full,
    borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface,
  },
  dateNavActive: { borderColor: colors.primary, backgroundColor: colors.primary + '12' },
  dateNavText: { fontFamily: typography.bodyMedium, fontSize: typography.size.sm, color: colors.ink },

  noteInput: {
    fontFamily: typography.body, fontSize: typography.size.md, color: colors.ink,
    backgroundColor: colors.surface, borderRadius: radius.lg, borderWidth: 1,
    borderColor: colors.border, paddingHorizontal: spacing.md, paddingVertical: spacing.sm + 2,
  },

  footer: { paddingHorizontal: spacing.lg, paddingTop: spacing.sm, gap: spacing.xs },
  saveBtn: {
    backgroundColor: colors.primary, borderRadius: radius.full,
    paddingVertical: spacing.md, alignItems: 'center',
  },
  saveBtnDisabled: { opacity: 0.35 },
  saveBtnText: { fontFamily: typography.bodySemibold, fontSize: typography.size.lg, color: colors.white },
  deleteBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: spacing.xs, paddingVertical: spacing.sm,
  },
  deleteBtnText: {
    fontFamily: typography.bodyMedium, fontSize: typography.size.sm, color: colors.error,
  },
});
