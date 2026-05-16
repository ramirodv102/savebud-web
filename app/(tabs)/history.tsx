import { useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { ChevronRight } from 'lucide-react-native';
import { useAppStore } from '../../store/useAppStore';
import { formatARS } from '../../lib/format';
import { colors, spacing, radius, typography, shadows } from '../../lib/theme';

// ── Empty state ───────────────────────────────────────────────────────────────

function EmptyState() {
  return (
    <View style={styles.empty}>
      <Text style={styles.emptyEmoji}>📭</Text>
      <Text style={styles.emptyTitle}>Sin historial todavía</Text>
      <Text style={styles.emptyBody}>
        Tus gastos anteriores van a aparecer acá agrupados por año.
      </Text>
    </View>
  );
}

// ── Screen ────────────────────────────────────────────────────────────────────

export default function HistoryScreen() {
  const expenses = useAppStore((s) => s.expenses);

  const years = useMemo(() => {
    const map = new Map<number, { total: number; count: number }>();
    for (const e of expenses) {
      const y = new Date(e.date).getFullYear();
      const cur = map.get(y) ?? { total: 0, count: 0 };
      map.set(y, { total: cur.total + e.amount, count: cur.count + 1 });
    }
    return Array.from(map.entries())
      .map(([year, s]) => ({ year, ...s }))
      .sort((a, b) => b.year - a.year);
  }, [expenses]);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <Text style={styles.heading}>Historial</Text>

        {years.length === 0 ? (
          <EmptyState />
        ) : (
          <View style={styles.list}>
            {years.map(({ year, total, count }) => (
              <Pressable
                key={year}
                style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
                onPress={() => router.push(`/history/${year}`)}
              >
                <View style={styles.rowLeft}>
                  <Text style={styles.year}>{year}</Text>
                  <Text style={styles.count}>{count} gasto{count !== 1 ? 's' : ''}</Text>
                </View>
                <View style={styles.rowRight}>
                  <Text style={styles.total}>{formatARS(total)}</Text>
                  <ChevronRight size={18} color={colors.inkFaint} strokeWidth={2} />
                </View>
              </Pressable>
            ))}
          </View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  scroll: { paddingHorizontal: spacing.lg, paddingTop: spacing.md },

  heading: {
    fontFamily: typography.displayBold,
    fontSize: typography.size.xxl,
    color: colors.ink,
    marginBottom: spacing.xl,
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
  year: {
    fontFamily: typography.displayBold,
    fontSize: typography.size.xl,
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

  empty: {
    alignItems: 'center',
    paddingVertical: spacing.xxl,
    gap: spacing.md,
  },
  emptyEmoji: { fontSize: 48 },
  emptyTitle: {
    fontFamily: typography.displayBold,
    fontSize: typography.size.xl,
    color: colors.ink,
  },
  emptyBody: {
    fontFamily: typography.body,
    fontSize: typography.size.md,
    color: colors.inkMuted,
    textAlign: 'center',
    lineHeight: 22,
  },
});
