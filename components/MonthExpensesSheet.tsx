import { useRef, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, Modal, Pressable,
  ScrollView, Animated, Dimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { X, ChevronRight } from 'lucide-react-native';
import { CategoryDot } from './ui/CategoryDot';
import { useAppStore } from '../store/useAppStore';
import { currentMonthName, formatARS, formatARSShort, dateLabel } from '../lib/format';
import { colors, spacing, radius, typography } from '../lib/theme';
import type { Expense } from '../types';


type Props = {
  visible: boolean;
  expenses: Expense[];
  totalSpent: number;
  budget: number;
  onClose: () => void;
  onExpensePress: (e: Expense) => void;
};

const { height: SCREEN_H } = Dimensions.get('window');

export function MonthExpensesSheet({ visible, expenses, totalSpent, budget, onClose, onExpensePress }: Props) {
  const insets       = useSafeAreaInsets();
  const categories   = useAppStore((s) => s.categories);
  const slideAnim    = useRef(new Animated.Value(SCREEN_H)).current;
  const backdropAnim = useRef(new Animated.Value(0)).current;
  const pendingExp   = useRef<Expense | null>(null);

  const catMap = new Map(categories.map((c) => [c.id, c]));

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(slideAnim, { toValue: 0, useNativeDriver: true, damping: 20, stiffness: 260 }),
        Animated.timing(backdropAnim, { toValue: 1, duration: 200, useNativeDriver: true }),
      ]).start();
    }
  }, [visible]);

  const dismiss = useCallback(() => {
    Animated.parallel([
      Animated.timing(slideAnim, { toValue: SCREEN_H, duration: 260, useNativeDriver: true }),
      Animated.timing(backdropAnim, { toValue: 0, duration: 200, useNativeDriver: true }),
    ]).start(() => {
      const pending = pendingExp.current;
      pendingExp.current = null;
      onClose();
      if (pending) onExpensePress(pending);
    });
  }, [onClose, onExpensePress, slideAnim, backdropAnim]);

  // Group by date descending
  const sorted = [...expenses].sort((a, b) => b.date.localeCompare(a.date));
  const days: string[] = [];
  const byDay: Record<string, Expense[]> = {};
  for (const e of sorted) {
    if (!byDay[e.date]) { byDay[e.date] = []; days.push(e.date); }
    byDay[e.date].push(e);
  }

  return (
    <Modal transparent visible={visible} animationType="none" onRequestClose={dismiss} statusBarTranslucent>
      <View style={styles.root}>
        <Animated.View style={[StyleSheet.absoluteFill, styles.backdrop, { opacity: backdropAnim }]} />
        <Pressable style={StyleSheet.absoluteFill} onPress={dismiss} />

        <Animated.View
          style={[
            styles.sheet,
            { paddingBottom: Math.max(insets.bottom, spacing.md) },
            { transform: [{ translateY: slideAnim }] },
          ]}
        >
          <View style={styles.handle} />

          {/* ── Header ──────────────────────────────────────────────────────── */}
          <View style={styles.header}>
            <View style={styles.headerInfo}>
              <Text style={styles.headerTitle}>{currentMonthName()}</Text>
              <Text style={styles.headerSpent}>{formatARS(totalSpent)} gastados</Text>
              {budget > 0 && (
                <Text style={styles.headerBudget}>de {formatARS(budget)} presupuestados</Text>
              )}
            </View>
            <Pressable onPress={dismiss} hitSlop={12}>
              <X size={20} color={colors.inkMuted} strokeWidth={2} />
            </Pressable>
          </View>

          {/* ── List ────────────────────────────────────────────────────────── */}
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.list}>
            {days.length === 0 ? (
              <Text style={styles.emptyText}>Sin gastos este mes</Text>
            ) : (
              days.map((day) => {
                const dayTotal = byDay[day].reduce((s, e) => s + e.amount, 0);
                return (
                  <View key={day}>
                    <View style={styles.dayHeader}>
                      <Text style={styles.dayLabel}>{dateLabel(day)}</Text>
                      <Text style={styles.dayTotal}>{formatARSShort(dayTotal)}</Text>
                    </View>
                    {byDay[day].map((e) => {
                      const cat = catMap.get(e.categoryId);
                      return (
                        <Pressable
                          key={e.id}
                          style={({ pressed }) => [styles.expRow, pressed && styles.expRowPressed]}
                          onPress={() => { pendingExp.current = e; dismiss(); }}
                        >
                          <CategoryDot icon={cat?.icon ?? '?'} size={34} />
                          <View style={styles.expInfo}>
                            <Text style={styles.expCat}>{cat?.name ?? '—'}</Text>
                            {e.note && <Text style={styles.expNote} numberOfLines={1}>{e.note}</Text>}
                          </View>
                          <Text style={styles.expAmount}>{formatARSShort(e.amount)}</Text>
                          <ChevronRight size={14} color={colors.inkFaint} strokeWidth={2} />
                        </Pressable>
                      );
                    })}
                  </View>
                );
              })
            )}
            <View style={{ height: spacing.md }} />
          </ScrollView>
        </Animated.View>
      </View>
    </Modal>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root:    { flex: 1 },
  backdrop: { backgroundColor: 'rgba(0,0,0,0.45)' },

  sheet: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: colors.background,
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    maxHeight: SCREEN_H * 0.88,
  },
  handle: {
    width: 36, height: 4, borderRadius: 2,
    backgroundColor: colors.border, alignSelf: 'center',
    marginTop: spacing.md, marginBottom: spacing.xs,
  },

  header: {
    flexDirection: 'row', alignItems: 'flex-start',
    gap: spacing.md, paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  headerInfo: { flex: 1, gap: 2 },
  headerTitle: {
    fontFamily: typography.displayBold, fontSize: typography.size.lg, color: colors.ink,
  },
  headerSpent: {
    fontFamily: typography.bodySemibold, fontSize: typography.size.md, color: colors.ink,
  },
  headerBudget: {
    fontFamily: typography.body, fontSize: typography.size.sm, color: colors.inkMuted,
  },

  list: { paddingHorizontal: spacing.lg, paddingTop: spacing.xs },

  dayHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: spacing.sm, marginTop: spacing.sm,
  },
  dayLabel: {
    fontFamily: typography.bodySemibold, fontSize: typography.size.xs,
    color: colors.inkMuted, textTransform: 'uppercase', letterSpacing: 0.5,
  },
  dayTotal: {
    fontFamily: typography.body, fontSize: typography.size.xs, color: colors.inkFaint,
  },

  expRow: {
    flexDirection: 'row', alignItems: 'center',
    gap: spacing.sm, paddingVertical: spacing.sm,
    borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  expRowPressed: { opacity: 0.6 },
  expInfo:   { flex: 1, gap: 1 },
  expCat:    { fontFamily: typography.bodyMedium, fontSize: typography.size.md, color: colors.ink },
  expNote:   { fontFamily: typography.body, fontSize: typography.size.xs, color: colors.inkFaint },
  expAmount: {
    fontFamily: typography.display, fontSize: typography.size.md, color: colors.ink, flexShrink: 0,
  },

  emptyText: {
    fontFamily: typography.body, fontSize: typography.size.md,
    color: colors.inkFaint, textAlign: 'center', paddingVertical: spacing.xl,
  },
});
