import { useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, Stack } from 'expo-router';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { useAppStore } from '../../../store/useAppStore';
import { formatARS } from '../../../lib/format';
import { colors, spacing, radius, typography, shadows } from '../../../lib/theme';
import type { Expense, Category, PaymentMethod } from '../../../types';

// ── Helpers ───────────────────────────────────────────────────────────────────

function dayHeader(isoDate: string): string {
  const d = parseISO(isoDate);
  const label = format(d, "EEEE d 'de' MMMM", { locale: es });
  return label.charAt(0).toUpperCase() + label.slice(1);
}

// ── Expense row ───────────────────────────────────────────────────────────────

function ExpenseRow({
  expense,
  category,
  method,
}: {
  expense: Expense;
  category: Category | undefined;
  method: PaymentMethod | undefined;
}) {
  return (
    <View style={rowStyles.row}>
      <View style={[rowStyles.dot, { backgroundColor: category?.color ?? colors.border }]}>
        <Text style={rowStyles.emoji}>{category?.icon ?? '?'}</Text>
      </View>
      <View style={rowStyles.info}>
        <Text style={rowStyles.name}>{category?.name ?? 'Sin categoría'}</Text>
        {expense.note ? (
          <Text style={rowStyles.note} numberOfLines={1}>{expense.note}</Text>
        ) : (
          <Text style={rowStyles.method}>{method?.name ?? '—'}</Text>
        )}
      </View>
      <Text style={rowStyles.amount}>{formatARS(expense.amount)}</Text>
    </View>
  );
}

const rowStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  dot: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  emoji: { fontSize: 17 },
  info: { flex: 1, gap: 2 },
  name: {
    fontFamily: typography.bodyMedium,
    fontSize: typography.size.md,
    color: colors.ink,
  },
  note: {
    fontFamily: typography.body,
    fontSize: typography.size.xs,
    color: colors.inkMuted,
  },
  method: {
    fontFamily: typography.body,
    fontSize: typography.size.xs,
    color: colors.inkFaint,
  },
  amount: {
    fontFamily: typography.display,
    fontSize: typography.size.md,
    color: colors.ink,
    flexShrink: 0,
  },
});

// ── Screen ────────────────────────────────────────────────────────────────────

const MONTH_NAMES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];

export default function MonthScreen() {
  const { year, month } = useLocalSearchParams<{ year: string; month: string }>();
  const yearNum  = parseInt(year, 10);
  const monthNum = parseInt(month, 10) - 1; // 0-indexed

  const expenses       = useAppStore((s) => s.expenses);
  const categories     = useAppStore((s) => s.categories);
  const paymentMethods = useAppStore((s) => s.paymentMethods);

  const catMap = useMemo(
    () => new Map(categories.map((c) => [c.id, c])),
    [categories],
  );
  const pmMap = useMemo(
    () => new Map(paymentMethods.map((m) => [m.id, m])),
    [paymentMethods],
  );

  // Filter + sort desc by date
  const monthExpenses = useMemo(() =>
    expenses
      .filter((e) => {
        const d = new Date(e.date);
        return d.getFullYear() === yearNum && d.getMonth() === monthNum;
      })
      .sort((a, b) => b.date.localeCompare(a.date)),
    [expenses, yearNum, monthNum],
  );

  // Group by date string
  const groups = useMemo(() => {
    const map = new Map<string, Expense[]>();
    for (const e of monthExpenses) {
      const existing = map.get(e.date) ?? [];
      existing.push(e);
      map.set(e.date, existing);
    }
    return Array.from(map.entries()).map(([date, items]) => ({ date, items }));
  }, [monthExpenses]);

  const monthTotal = useMemo(
    () => monthExpenses.reduce((sum, e) => sum + e.amount, 0),
    [monthExpenses],
  );

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <Stack.Screen options={{ title: `${MONTH_NAMES[monthNum]} ${yearNum}` }} />
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Month summary */}
        <View style={[styles.summaryCard, shadows.sm]}>
          <Text style={styles.summaryLabel}>
            {MONTH_NAMES[monthNum]} {yearNum}
          </Text>
          <Text style={styles.summaryAmount}>{formatARS(monthTotal)}</Text>
          <Text style={styles.summaryCount}>
            {monthExpenses.length} gasto{monthExpenses.length !== 1 ? 's' : ''}
          </Text>
        </View>

        {/* Day groups */}
        {groups.map(({ date, items }) => {
          const dayTotal = items.reduce((sum, e) => sum + e.amount, 0);
          return (
            <View key={date} style={styles.group}>
              <View style={styles.dayHeader}>
                <Text style={styles.dayLabel}>{dayHeader(date)}</Text>
                <Text style={styles.dayTotal}>{formatARS(dayTotal)}</Text>
              </View>
              <View style={styles.dayList}>
                {items.map((e) => (
                  <ExpenseRow
                    key={e.id}
                    expense={e}
                    category={catMap.get(e.categoryId)}
                    method={pmMap.get(e.paymentMethodId)}
                  />
                ))}
              </View>
            </View>
          );
        })}

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  scroll: { padding: spacing.lg },

  summaryCard: {
    backgroundColor: colors.primary,
    borderRadius: radius.xl,
    padding: spacing.xl,
    marginBottom: spacing.xl,
    gap: spacing.xs,
  },
  summaryLabel: {
    fontFamily: typography.body,
    fontSize: typography.size.sm,
    color: 'rgba(255,255,255,0.65)',
    letterSpacing: 0.3,
  },
  summaryAmount: {
    fontFamily: typography.displayBold,
    fontSize: typography.size.xxl,
    color: colors.white,
  },
  summaryCount: {
    fontFamily: typography.body,
    fontSize: typography.size.sm,
    color: 'rgba(255,255,255,0.55)',
  },

  group: { marginBottom: spacing.xl },
  dayHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  dayLabel: {
    fontFamily: typography.bodySemibold,
    fontSize: typography.size.sm,
    color: colors.inkMuted,
    textTransform: 'capitalize',
  },
  dayTotal: {
    fontFamily: typography.display,
    fontSize: typography.size.sm,
    color: colors.inkMuted,
  },
  dayList: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.md,
    overflow: 'hidden',
    ...shadows.sm,
  },
});
