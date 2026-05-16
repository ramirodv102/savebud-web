import { useRef, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, Modal, Pressable,
  ScrollView, Animated, Dimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { X, AlertTriangle, ChevronRight } from 'lucide-react-native';
import { categoryAlert } from '../lib/compute';
import { formatARSShort, dateLabel } from '../lib/format';
import { ProgressBar } from './ui/ProgressBar';
import { colors, spacing, radius, typography } from '../lib/theme';
import type { Category, Expense } from '../types';

const BAR_COLOR: Record<string, string> = {
  none:   '#8C8880',
  soft:   '#8C8880',
  strong: colors.error,
};

type Props = {
  visible: boolean;
  category: Category | null;
  expenses: Expense[];
  onClose: () => void;
  onExpensePress: (e: Expense) => void;
};

const { height: SCREEN_H } = Dimensions.get('window');

export function CategoryDetailSheet({ visible, category, expenses, onClose, onExpensePress }: Props) {
  const insets       = useSafeAreaInsets();
  const slideAnim    = useRef(new Animated.Value(SCREEN_H)).current;
  const backdropAnim = useRef(new Animated.Value(0)).current;
  const pendingExp   = useRef<Expense | null>(null);

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

  if (!category) return null;

  const spent     = expenses.reduce((sum, e) => sum + e.amount, 0);
  const hasBudget = category.monthlyBudget !== null && category.monthlyBudget > 0;
  const pct       = hasBudget ? (spent / category.monthlyBudget!) * 100 : 0;
  const alert     = categoryAlert(spent, category.monthlyBudget);
  const barColor  = BAR_COLOR[alert];
  const exceeded  = alert === 'strong';

  const sorted = [...expenses].sort((a, b) => b.date.localeCompare(a.date));

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

          {/* ── Header ─────────────────────────────────────────────────────── */}
          <View style={styles.header}>
            <View style={[styles.headerDot, { backgroundColor: category.color }]}>
              <Text style={styles.headerEmoji}>{category.icon}</Text>
            </View>
            <View style={styles.headerInfo}>
              <View style={styles.headerNameRow}>
                <Text style={styles.headerName}>{category.name}</Text>
                {exceeded && (
                  <>
                    <AlertTriangle size={14} color={colors.error} strokeWidth={2.5} />
                    <Text style={styles.exceededBadge}>
                      +{formatARSShort(spent - category.monthlyBudget!)}
                    </Text>
                  </>
                )}
              </View>
              <Text style={[styles.headerSpent, exceeded && { color: colors.error }]}>
                {exceeded
                  ? `Te excediste ${formatARSShort(spent - category.monthlyBudget!)}`
                  : `${formatARSShort(spent)} este mes`}
              </Text>
            </View>
            <Pressable onPress={dismiss} hitSlop={12}>
              <X size={20} color={colors.inkMuted} strokeWidth={2} />
            </Pressable>
          </View>

          {/* ── Budget bar ─────────────────────────────────────────────────── */}
          {hasBudget && (
            <View style={styles.budgetSection}>
              <ProgressBar value={pct} color={barColor} height={6} />
              <View style={styles.budgetMeta}>
                <Text style={styles.budgetText}>{Math.round(pct)}% del límite</Text>
                <Text style={styles.budgetText}>
                  {exceeded
                    ? `${formatARSShort(spent - category.monthlyBudget!)} excedido`
                    : `${formatARSShort(category.monthlyBudget! - spent)} restante`}
                </Text>
              </View>
            </View>
          )}

          {/* ── Expense list ───────────────────────────────────────────────── */}
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.listContent}
          >
            {sorted.length === 0 ? (
              <Text style={styles.emptyText}>Sin gastos este mes</Text>
            ) : (
              sorted.map((e) => (
                <Pressable
                  key={e.id}
                  style={({ pressed }) => [styles.expRow, pressed && styles.expRowPressed]}
                  onPress={() => { pendingExp.current = e; dismiss(); }}
                >
                  <View style={styles.expInfo}>
                    {e.note
                      ? <Text style={styles.expNote} numberOfLines={1}>{e.note}</Text>
                      : <Text style={styles.expDateMain}>{dateLabel(e.date)}</Text>
                    }
                    {e.note && <Text style={styles.expDateSub}>{dateLabel(e.date)}</Text>}
                  </View>
                  <Text style={styles.expAmount}>{formatARSShort(e.amount)}</Text>
                  <ChevronRight size={14} color={colors.inkFaint} strokeWidth={2} />
                </Pressable>
              ))
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
    maxHeight: SCREEN_H * 0.85,
  },
  handle: {
    width: 36, height: 4, borderRadius: 2,
    backgroundColor: colors.border, alignSelf: 'center',
    marginTop: spacing.md, marginBottom: spacing.xs,
  },

  header: {
    flexDirection: 'row', alignItems: 'center',
    gap: spacing.md, paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  headerDot: {
    width: 48, height: 48, borderRadius: 24,
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  headerEmoji: { fontSize: 22 },
  headerInfo: { flex: 1 },
  headerNameRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  headerName: {
    fontFamily: typography.displayBold, fontSize: typography.size.lg, color: colors.ink,
  },
  headerSpent: {
    fontFamily: typography.body, fontSize: typography.size.sm, color: colors.inkMuted,
    marginTop: 2,
  },
  exceededBadge: {
    fontFamily: typography.bodySemibold, fontSize: typography.size.xs,
    color: colors.error, backgroundColor: colors.error + '18',
    borderRadius: radius.sm, paddingHorizontal: 5, paddingVertical: 1,
  },

  budgetSection: {
    paddingHorizontal: spacing.lg, paddingVertical: spacing.md,
    borderBottomWidth: 1, borderBottomColor: colors.border, gap: spacing.xs,
  },
  budgetMeta: { flexDirection: 'row', justifyContent: 'space-between' },
  budgetText: {
    fontFamily: typography.body, fontSize: typography.size.xs, color: colors.inkFaint,
  },

  listContent: { paddingHorizontal: spacing.lg, paddingTop: spacing.xs },

  expRow: {
    flexDirection: 'row', alignItems: 'center',
    gap: spacing.sm, paddingVertical: spacing.md,
    borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  expRowPressed: { opacity: 0.6 },
  expInfo:    { flex: 1, gap: 2 },
  expNote:    { fontFamily: typography.body, fontSize: typography.size.md, color: colors.ink },
  expDateMain: { fontFamily: typography.body, fontSize: typography.size.md, color: colors.inkMuted },
  expDateSub:  { fontFamily: typography.body, fontSize: typography.size.xs, color: colors.inkFaint },
  expAmount: {
    fontFamily: typography.display, fontSize: typography.size.md, color: colors.ink, flexShrink: 0,
  },

  emptyText: {
    fontFamily: typography.body, fontSize: typography.size.md,
    color: colors.inkFaint, textAlign: 'center', paddingVertical: spacing.xl,
  },
});
