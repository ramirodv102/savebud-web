import { useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, router, Stack } from 'expo-router';
import { ChevronRight } from 'lucide-react-native';
import { useAppStore } from '../../../store/useAppStore';
import { formatARS } from '../../../lib/format';
import { colors, spacing, radius, typography, shadows } from '../../../lib/theme';

const MONTH_NAMES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];

export default function YearScreen() {
  const { year } = useLocalSearchParams<{ year: string }>();
  const yearNum = parseInt(year, 10);
  const expenses = useAppStore((s) => s.expenses);

  const months = useMemo(() => {
    const map = new Map<number, { total: number; count: number }>();
    for (const e of expenses) {
      const d = new Date(e.date);
      if (d.getFullYear() !== yearNum) continue;
      const m = d.getMonth();
      const cur = map.get(m) ?? { total: 0, count: 0 };
      map.set(m, { total: cur.total + e.amount, count: cur.count + 1 });
    }
    return Array.from(map.entries())
      .map(([month, s]) => ({ month, ...s }))
      .sort((a, b) => b.month - a.month);
  }, [expenses, yearNum]);

  const yearTotal = useMemo(
    () => months.reduce((sum, m) => sum + m.total, 0),
    [months],
  );

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <Stack.Screen options={{ title: String(yearNum) }} />
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Year summary */}
        <View style={[styles.summaryCard, shadows.sm]}>
          <Text style={styles.summaryLabel}>Total {yearNum}</Text>
          <Text style={styles.summaryAmount}>{formatARS(yearTotal)}</Text>
        </View>

        {/* Months list */}
        <View style={styles.list}>
          {months.map(({ month, total, count }) => (
            <Pressable
              key={month}
              style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
              onPress={() => router.push(`/history/${yearNum}/${month + 1}`)}
            >
              <View style={styles.rowLeft}>
                <Text style={styles.monthName}>{MONTH_NAMES[month]}</Text>
                <Text style={styles.count}>{count} gasto{count !== 1 ? 's' : ''}</Text>
              </View>
              <View style={styles.rowRight}>
                <Text style={styles.total}>{formatARS(total)}</Text>
                <ChevronRight size={18} color={colors.inkFaint} strokeWidth={2} />
              </View>
            </Pressable>
          ))}
        </View>

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
    marginBottom: spacing.lg,
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

  list: {
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    overflow: 'hidden',
    ...shadows.sm,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  rowPressed: { backgroundColor: colors.surfaceAlt },
  rowLeft: { gap: 2 },
  rowRight: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  monthName: {
    fontFamily: typography.bodyMedium,
    fontSize: typography.size.md,
    color: colors.ink,
  },
  count: {
    fontFamily: typography.body,
    fontSize: typography.size.xs,
    color: colors.inkFaint,
  },
  total: {
    fontFamily: typography.display,
    fontSize: typography.size.lg,
    color: colors.ink,
  },
});
