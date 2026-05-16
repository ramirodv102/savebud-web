import { useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Plus, AlertTriangle, Target, ChevronRight } from 'lucide-react-native';
import { useAppStore } from '../../store/useAppStore';
import {
  computeMonthStats,
  totalBudgetAlert,
  categoryAlert,
  isPaceAlarm,
  filterCurrentMonth,
} from '../../lib/compute';
import { formatARS, formatARSShort, currentMonthName } from '../../lib/format';
import { ProgressBar } from '../../components/ui/ProgressBar';
import { CategoryDot } from '../../components/ui/CategoryDot';
import { AlertBanner } from '../../components/AlertBanner';
import { AddExpenseSheet } from '../../components/AddExpenseSheet';
import { EditExpenseSheet } from '../../components/EditExpenseSheet';
import { CategoryDetailSheet } from '../../components/CategoryDetailSheet';
import { MonthExpensesSheet } from '../../components/MonthExpensesSheet';
import { StatDetailSheet, StatMode } from '../../components/StatDetailSheet';
import { colors, spacing, radius, typography, shadows } from '../../lib/theme';
import type { Category, Expense, PaymentMethod } from '../../types';

// ── Helpers ───────────────────────────────────────────────────────────────────

function heroBarColor(percentUsed: number, monthProgress: number): string {
  if (percentUsed > 100) return '#FF8C00';
  if (percentUsed > monthProgress * 100 + 10) return '#FFD426';
  return colors.white;
}

// ── Empty state ───────────────────────────────────────────────────────────────

function EmptyState() {
  return (
    <View style={emptyStyles.container}>
      <Text style={emptyStyles.emoji}>🌱</Text>
      <Text style={emptyStyles.title}>Todavía no hay gastos</Text>
      <Text style={emptyStyles.body}>
        Tocá el botón + para registrar tu primer gasto.{'\n'}¡Va a ser rápido!
      </Text>
    </View>
  );
}

const emptyStyles = StyleSheet.create({
  container: { alignItems: 'center', paddingVertical: spacing.xxl, gap: spacing.md },
  emoji: { fontSize: 48 },
  title: { fontFamily: typography.displayBold, fontSize: typography.size.xl, color: colors.ink },
  body: {
    fontFamily: typography.body,
    fontSize: typography.size.md,
    color: colors.inkMuted,
    textAlign: 'center',
    lineHeight: 22,
  },
});

// ── Category row ──────────────────────────────────────────────────────────────

const BAR_COLOR: Record<string, string> = {
  none:   '#8C8880',
  soft:   colors.warning,
  limit:  colors.alert,
  strong: colors.error,
};


function CategoryRow({
  category, spent, onPress,
}: {
  category: Category;
  spent: number;
  onPress: () => void;
}) {
  const hasBudget = category.monthlyBudget !== null && category.monthlyBudget > 0;
  const pct       = hasBudget ? (spent / category.monthlyBudget!) * 100 : 0;
  const alert     = categoryAlert(spent, category.monthlyBudget);
  const barColor  = BAR_COLOR[alert];
  return (
    <Pressable
      style={({ pressed }) => [catStyles.row, pressed && catStyles.rowPressed]}
      onPress={onPress}
    >
      <CategoryDot icon={category.icon} size={38} />
      <View style={catStyles.info}>
        <View style={catStyles.labelRow}>
          <View style={catStyles.nameRow}>
            <Text style={catStyles.name}>{category.name}</Text>
            {alert === 'strong' && <AlertTriangle size={13} color={colors.error} strokeWidth={2.5} />}
            {alert === 'limit'  && <Target size={13} color={colors.alert} strokeWidth={2.5} />}
            {alert === 'strong' && (
              <Text style={catStyles.exceededBadge}>
                +{formatARSShort(spent - category.monthlyBudget!)}
              </Text>
            )}
          </View>
          <View style={catStyles.rightRow}>
            <Text style={[catStyles.spent, alert === 'strong' && { color: colors.error }, alert === 'limit' && { color: colors.alert }]}>
              {formatARSShort(spent)}
            </Text>
            <ChevronRight size={14} color={colors.inkFaint} strokeWidth={2} />
          </View>
        </View>

        {hasBudget ? (
          <>
            <ProgressBar value={pct} color={barColor} height={5} />
            <Text style={catStyles.budget}>
              {formatARSShort(category.monthlyBudget!)} por mes
            </Text>
          </>
        ) : (
          <View style={catStyles.noLimitBar} />
        )}
      </View>
    </Pressable>
  );
}

const catStyles = StyleSheet.create({
  row: {
    flexDirection: 'row', alignItems: 'flex-start',
    gap: spacing.md, paddingVertical: spacing.md,
    borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  rowPressed: { opacity: 0.6 },
  info: { flex: 1, gap: 6 },
  labelRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  rightRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  name:   { fontFamily: typography.bodyMedium, fontSize: typography.size.md, color: colors.ink },
  spent:  { fontFamily: typography.display, fontSize: typography.size.md, color: colors.ink },
  budget: { fontFamily: typography.body, fontSize: typography.size.xs, color: colors.inkFaint },
  noLimitBar: { height: 5, backgroundColor: colors.border, borderRadius: 3 },
  exceededBadge: {
    fontFamily: typography.bodySemibold, fontSize: typography.size.xs,
    color: colors.error, backgroundColor: colors.error + '18',
    borderRadius: radius.sm, paddingHorizontal: 5, paddingVertical: 1,
  },
});

// ── Payment method chip ───────────────────────────────────────────────────────

function PaymentChip({ method, spent }: { method: PaymentMethod; spent: number }) {
  const shortIcon = method.icon.length > 4 ? method.icon.slice(0, 2) : method.icon;
  return (
    <View style={[chipStyles.chip, { borderColor: method.color + '40' }]}>
      <View style={[chipStyles.dot, { backgroundColor: method.color }]}>
        <Text style={chipStyles.icon}>{shortIcon}</Text>
      </View>
      <Text style={chipStyles.name} numberOfLines={1}>{method.name}</Text>
      <Text style={chipStyles.amount}>{formatARSShort(spent)}</Text>
    </View>
  );
}

const chipStyles = StyleSheet.create({
  chip: {
    alignItems: 'center', gap: spacing.xs,
    backgroundColor: colors.surface, borderRadius: radius.lg,
    borderWidth: 1, padding: spacing.md, minWidth: 90, ...shadows.sm,
  },
  dot: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  icon: { fontFamily: typography.bodySemibold, fontSize: 13, color: colors.white },
  name: { fontFamily: typography.body, fontSize: typography.size.xs, color: colors.inkMuted, textAlign: 'center' },
  amount: { fontFamily: typography.displayBold, fontSize: typography.size.sm, color: colors.ink },
});

// ── Screen ────────────────────────────────────────────────────────────────────

export default function DashboardScreen() {
  const expenses       = useAppStore((s) => s.expenses);
  const categories     = useAppStore((s) => s.categories);
  const paymentMethods = useAppStore((s) => s.paymentMethods);
  const settings       = useAppStore((s) => s.settings);

  const stats = useMemo(() => computeMonthStats(expenses, settings), [expenses, settings]);
  const [sheetOpen,           setSheetOpen]           = useState(false);
  const [editingExpense,      setEditingExpense]       = useState<Expense | null>(null);
  const [selectedCategoryId,  setSelectedCategoryId]  = useState<string | null>(null);
  const [allExpensesOpen,     setAllExpensesOpen]      = useState(false);
  const [statMode,            setStatMode]             = useState<StatMode | null>(null);

  const expensesByCatId = useMemo(() => {
    const map: Record<string, Expense[]> = {};
    for (const e of filterCurrentMonth(expenses)) {
      if (!map[e.categoryId]) map[e.categoryId] = [];
      map[e.categoryId].push(e);
    }
    return map;
  }, [expenses]);

  const selectedCategory = useMemo(
    () => categories.find((c) => c.id === selectedCategoryId) ?? null,
    [categories, selectedCategoryId],
  );

  const budgetAlert  = totalBudgetAlert(stats);
  const paceAlarm    = isPaceAlarm(stats);
  const hasBudget    = settings.totalMonthlyBudget > 0;
  const hasExpenses  = expenses.length > 0;
  const pct          = Math.min(stats.percentUsed, 100);

  const today         = new Date();
  const daysInMonth   = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
  const monthProgress = today.getDate() / daysInMonth;
  const barColor      = heroBarColor(stats.percentUsed, monthProgress);

  const categoryRows = useMemo(() =>
    categories
      .filter((c) => !c.archived)
      .map((c) => ({ ...c, spent: stats.byCategory[c.id] ?? 0 }))
      .filter((c) => c.spent > 0 || (c.monthlyBudget !== null && c.monthlyBudget > 0))
      .sort((a, b) => b.spent - a.spent),
    [categories, stats.byCategory],
  );

  const pmRows = useMemo(() =>
    paymentMethods
      .filter((m) => !m.archived && (stats.byPaymentMethod[m.id] ?? 0) > 0)
      .map((m) => ({ ...m, spent: stats.byPaymentMethod[m.id] }))
      .sort((a, b) => b.spent - a.spent),
    [paymentMethods, stats.byPaymentMethod],
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

        {/* ── Alerts ──────────────────────────────────────────────────────── */}
        {paceAlarm && (
          <AlertBanner
            variant="warning"
            message="Ritmo acelerado: estás gastando más rápido de lo esperado para este punto del mes."
          />
        )}
        {budgetAlert === 'exceeded' && (
          <AlertBanner
            variant="error"
            message={`Te pasaste del presupuesto mensual por ${formatARS(stats.totalSpent - settings.totalMonthlyBudget)}.`}
          />
        )}

        {/* ── Header ──────────────────────────────────────────────────────── */}
        <View style={styles.header}>
          <Text style={styles.monthLabel}>{currentMonthName()}</Text>
        </View>

        {/* ── Hero card ───────────────────────────────────────────────────── */}
        <Pressable
          style={({ pressed }) => [styles.heroCard, shadows.md, pressed && styles.heroCardPressed]}
          onPress={() => setAllExpensesOpen(true)}
        >
          <Text style={styles.heroLabel}>Gastado este mes</Text>

          <View style={styles.heroAmountRow}>
            <Text style={styles.heroAmount}>{formatARS(stats.totalSpent)}</Text>
            {hasBudget && stats.percentUsed > 100 && (
              <AlertTriangle size={22} color={colors.white} strokeWidth={2.5} />
            )}
          </View>

          {hasBudget ? (
            <>
              <Text style={styles.heroBudgetLine}>
                de {formatARS(settings.totalMonthlyBudget)} presupuestados
              </Text>
              <ProgressBar value={pct} color={barColor} height={5} backgroundColor="rgba(255,255,255,0.2)" />
              <View style={styles.heroMeta}>
                <Text style={styles.heroMetaText}>Día {today.getDate()} de {daysInMonth}</Text>
                <Text style={styles.heroMetaText}>{Math.round(stats.percentUsed)}% usado</Text>
              </View>
            </>
          ) : (
            <View style={styles.heroMeta}>
              <Text style={styles.heroMetaText}>Día {today.getDate()} de {daysInMonth}</Text>
              <Pressable onPress={() => router.push('/(tabs)/settings')} hitSlop={8}>
                <Text style={styles.heroDefinirLink}>Definir presupuesto →</Text>
              </Pressable>
            </View>
          )}
        </Pressable>

        {/* ── Stats row ───────────────────────────────────────────────────── */}
        <View style={styles.statsRow}>
          <Pressable
            style={({ pressed }) => [styles.statCard, shadows.sm, pressed && styles.statCardPressed]}
            onPress={() => setStatMode('average')}
          >
            <Text style={styles.statLabel}>Promedio diario</Text>
            <Text style={styles.statValue}>{formatARSShort(stats.dailyAverage)}</Text>
            <Text style={styles.statSub}>según días transcurridos</Text>
          </Pressable>
          <Pressable
            style={({ pressed }) => [styles.statCard, shadows.sm, pressed && styles.statCardPressed]}
            onPress={() => setStatMode('projection')}
          >
            <Text style={styles.statLabel}>Proyección</Text>
            <Text style={styles.statValue}>{formatARSShort(stats.projectedMonthTotal)}</Text>
            <Text style={styles.statSub}>
              {hasBudget
                ? `vs ${formatARSShort(settings.totalMonthlyBudget)} presup.`
                : 'a fin de mes'}
            </Text>
          </Pressable>
        </View>

        {/* ── Pace indicator ──────────────────────────────────────────────── */}
        {hasBudget && hasExpenses && (() => {
          const pct2 = Math.round(Math.abs(stats.paceRatio - 1) * 100);
          const above = stats.paceRatio > 1;
          return (
            <View style={[styles.paceRow, above ? styles.paceAbove : styles.paceBelow]}>
              <Text style={[styles.paceText, above ? styles.paceTextAbove : styles.paceTextBelow]}>
                {above
                  ? `A prestar atención — gastás un ${pct2}% más rápido de lo esperado`
                  : `Vas bien — gastás un ${pct2}% más lento de lo esperado`}
              </Text>
            </View>
          );
        })()}

        {/* ── Content or empty state ───────────────────────────────────────── */}
        {!hasExpenses ? (
          <EmptyState />
        ) : (
          <>
            {categoryRows.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Por categoría</Text>
                <View style={styles.categoryList}>
                  {categoryRows.map((cat) => (
                    <CategoryRow
                      key={cat.id}
                      category={cat}
                      spent={cat.spent}
                      onPress={() => setSelectedCategoryId(cat.id)}
                    />
                  ))}
                </View>
              </View>
            )}

            {pmRows.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Cómo pagaste</Text>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.pmScroll}
                >
                  {pmRows.map((pm) => (
                    <PaymentChip key={pm.id} method={pm} spent={pm.spent} />
                  ))}
                </ScrollView>
              </View>
            )}
          </>
        )}

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* ── FAB ─────────────────────────────────────────────────────────── */}
      <Pressable
        style={({ pressed }) => [styles.fab, pressed && styles.fabPressed]}
        onPress={() => setSheetOpen(true)}
      >
        <Plus size={28} color={colors.white} strokeWidth={2.5} />
      </Pressable>

      <AddExpenseSheet visible={sheetOpen} onClose={() => setSheetOpen(false)} />
      <EditExpenseSheet
        visible={editingExpense !== null}
        expense={editingExpense}
        onClose={() => setEditingExpense(null)}
      />
      <CategoryDetailSheet
        visible={selectedCategoryId !== null}
        category={selectedCategory}
        expenses={expensesByCatId[selectedCategoryId ?? ''] ?? []}
        onClose={() => setSelectedCategoryId(null)}
        onExpensePress={setEditingExpense}
      />
      <StatDetailSheet
        visible={statMode !== null}
        mode={statMode ?? 'average'}
        dailyAverage={stats.dailyAverage}
        projectedTotal={stats.projectedMonthTotal}
        dayOfMonth={today.getDate()}
        daysInMonth={daysInMonth}
        budget={settings.totalMonthlyBudget}
        expenses={filterCurrentMonth(expenses)}
        onClose={() => setStatMode(null)}
      />
      <MonthExpensesSheet
        visible={allExpensesOpen}
        expenses={filterCurrentMonth(expenses)}
        totalSpent={stats.totalSpent}
        budget={settings.totalMonthlyBudget}
        onClose={() => setAllExpensesOpen(false)}
        onExpensePress={setEditingExpense}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  scroll: { paddingHorizontal: spacing.lg, paddingTop: spacing.md },

  header: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', marginBottom: spacing.lg,
  },
  monthLabel: { fontFamily: typography.displayBold, fontSize: typography.size.xl, color: colors.ink },

  heroCard: {
    backgroundColor: colors.primary, borderRadius: radius.xl,
    padding: spacing.xl, gap: spacing.md, marginBottom: spacing.lg,
  },
  heroCardPressed: { opacity: 0.92 },
  heroLabel: {
    fontFamily: typography.body, fontSize: typography.size.sm,
    color: 'rgba(255,255,255,0.65)', letterSpacing: 0.3,
  },
  heroAmountRow: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
  },
  heroAmount: {
    fontFamily: typography.displayBold, fontSize: typography.size.hero,
    color: colors.white, lineHeight: typography.size.hero * 1.05,
  },
  heroBudgetLine: {
    fontFamily: typography.body, fontSize: typography.size.sm,
    color: 'rgba(255,255,255,0.60)', marginTop: -spacing.xs,
  },
  heroMeta: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    marginTop: spacing.xs,
  },
  heroMetaText: {
    fontFamily: typography.body, fontSize: typography.size.xs,
    color: 'rgba(255,255,255,0.55)',
  },
  heroDefinirLink: {
    fontFamily: typography.bodyMedium, fontSize: typography.size.xs,
    color: 'rgba(255,255,255,0.80)',
  },

  statsRow: { flexDirection: 'row', gap: spacing.md, marginBottom: spacing.sm },
  statCard: {
    flex: 1, backgroundColor: colors.surface,
    borderRadius: radius.lg, padding: spacing.sm + 2, gap: 1,
  },
  statCardPressed: { opacity: 0.7 },
  statLabel: {
    fontFamily: typography.body, fontSize: 10,
    color: colors.inkFaint, textTransform: 'uppercase', letterSpacing: 0.5,
  },
  statValue: { fontFamily: typography.displayBold, fontSize: typography.size.lg, color: colors.ink },
  statSub: { fontFamily: typography.body, fontSize: 10, color: colors.inkMuted },

  paceRow: {
    borderRadius: radius.lg, paddingVertical: spacing.sm, paddingHorizontal: spacing.md,
    marginBottom: spacing.lg,
  },
  paceAbove: { backgroundColor: colors.error + '14' },
  paceBelow: { backgroundColor: colors.primary + '14' },
  paceText: { fontFamily: typography.body, fontSize: typography.size.xs, lineHeight: 17 },
  paceTextAbove: { color: colors.error },
  paceTextBelow: { color: colors.primary },

  section: { marginBottom: spacing.xl },
  sectionTitle: {
    fontFamily: typography.bodySemibold, fontSize: typography.size.sm,
    color: colors.inkMuted, textTransform: 'uppercase',
    letterSpacing: 0.8, marginBottom: spacing.md,
  },
  categoryList: { borderTopWidth: 1, borderTopColor: colors.border },
  pmScroll: { gap: spacing.sm, paddingBottom: spacing.xs },

  fab: {
    position: 'absolute', bottom: spacing.xl, right: spacing.lg,
    width: 60, height: 60, borderRadius: 30,
    backgroundColor: colors.primary,
    alignItems: 'center', justifyContent: 'center', ...shadows.md,
  },
  fabPressed: { opacity: 0.85, transform: [{ scale: 0.96 }] },
});
