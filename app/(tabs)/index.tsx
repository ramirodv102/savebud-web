import { useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, LayoutAnimation, Platform, UIManager } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Plus, AlertTriangle, ChevronDown, ChevronUp, ChevronRight } from 'lucide-react-native';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}
import { useAppStore } from '../../store/useAppStore';
import {
  computeMonthStats,
  totalBudgetAlert,
  categoryAlert,
  isPaceAlarm,
  filterCurrentMonth,
} from '../../lib/compute';
import { formatARS, formatARSShort, currentMonthName, dateLabel } from '../../lib/format';
import { ProgressBar } from '../../components/ui/ProgressBar';
import { AlertBanner } from '../../components/AlertBanner';
import { AddExpenseSheet } from '../../components/AddExpenseSheet';
import { EditExpenseSheet } from '../../components/EditExpenseSheet';
import { colors, spacing, radius, typography, shadows } from '../../lib/theme';
import type { Category, Expense, PaymentMethod } from '../../types';

// ── Helpers ───────────────────────────────────────────────────────────────────

function progressColor(pct: number): string {
  if (pct > 100) return colors.error;
  if (pct >= 80) return colors.warning;
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
  none:   '#B0ADA6',       // neutral gray — uniform regardless of category
  soft:   colors.warning,
  strong: colors.error,
};

function CategoryRow({
  category, spent, monthExpenses, expanded, onToggle, onExpensePress,
}: {
  category: Category;
  spent: number;
  monthExpenses: Expense[];
  expanded: boolean;
  onToggle: () => void;
  onExpensePress: (e: Expense) => void;
}) {
  const hasBudget  = category.monthlyBudget !== null && category.monthlyBudget > 0;
  const pct        = hasBudget ? (spent / category.monthlyBudget!) * 100 : 0;
  const alert      = categoryAlert(spent, category.monthlyBudget);
  const barColor   = BAR_COLOR[alert];
  const exceeded   = alert === 'strong';
  const hasExpenses = monthExpenses.length > 0;

  const sorted = [...monthExpenses].sort((a, b) => b.date.localeCompare(a.date));

  return (
    <View style={catStyles.row}>
      <View style={[catStyles.dot, { backgroundColor: category.color }]}>
        <Text style={catStyles.emoji}>{category.icon}</Text>
      </View>
      <View style={catStyles.info}>
        {/* Header row — tappable to expand */}
        <Pressable
          onPress={hasExpenses ? onToggle : undefined}
          style={catStyles.labelRow}
        >
          <View style={catStyles.nameRow}>
            <Text style={catStyles.name}>{category.name}</Text>
            {exceeded && <AlertTriangle size={13} color={colors.error} strokeWidth={2.5} />}
            {hasExpenses && (
              expanded
                ? <ChevronUp   size={12} color={colors.inkFaint} strokeWidth={2.5} />
                : <ChevronDown size={12} color={colors.inkFaint} strokeWidth={2.5} />
            )}
          </View>
          <Text style={[catStyles.spent, alert !== 'none' && { color: barColor }]}>
            {formatARSShort(spent)}
          </Text>
        </Pressable>

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

        {/* Expanded expense list */}
        {expanded && (
          <View style={catStyles.expList}>
            {sorted.map((e) => (
              <Pressable
                key={e.id}
                style={({ pressed }) => [catStyles.expRow, pressed && catStyles.expRowPressed]}
                onPress={() => onExpensePress(e)}
              >
                <View style={catStyles.expInfo}>
                  {e.note
                    ? <Text style={catStyles.expNote} numberOfLines={1}>{e.note}</Text>
                    : <Text style={catStyles.expDateMain}>{dateLabel(e.date)}</Text>
                  }
                  {e.note && <Text style={catStyles.expDateSub}>{dateLabel(e.date)}</Text>}
                </View>
                <Text style={catStyles.expAmount}>{formatARSShort(e.amount)}</Text>
                <ChevronRight size={13} color={colors.inkFaint} strokeWidth={2} />
              </Pressable>
            ))}
          </View>
        )}
      </View>
    </View>
  );
}

const catStyles = StyleSheet.create({
  row: {
    flexDirection: 'row', alignItems: 'flex-start',
    gap: spacing.md, paddingVertical: spacing.md,
    borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  dot: {
    width: 38, height: 38, borderRadius: 19,
    alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 2,
  },
  emoji: { fontSize: 18 },
  info: { flex: 1, gap: 6 },
  labelRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  name: { fontFamily: typography.bodyMedium, fontSize: typography.size.md, color: colors.ink },
  spent: { fontFamily: typography.display, fontSize: typography.size.md, color: colors.ink },
  budget: { fontFamily: typography.body, fontSize: typography.size.xs, color: colors.inkFaint },
  noLimitBar: { height: 5, backgroundColor: colors.border, borderRadius: 3 },

  // Expanded expense list
  expList: {
    marginTop: spacing.xs,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  expRow: {
    flexDirection: 'row', alignItems: 'center',
    gap: spacing.sm, paddingVertical: spacing.sm,
    borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  expRowPressed: { opacity: 0.6 },
  expInfo: { flex: 1, gap: 1 },
  expNote: {
    fontFamily: typography.body, fontSize: typography.size.sm, color: colors.ink,
  },
  expDateMain: {
    fontFamily: typography.body, fontSize: typography.size.sm, color: colors.inkMuted,
  },
  expDateSub: {
    fontFamily: typography.body, fontSize: typography.size.xs, color: colors.inkFaint,
  },
  expAmount: {
    fontFamily: typography.display, fontSize: typography.size.sm, color: colors.ink, flexShrink: 0,
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
  const [sheetOpen,          setSheetOpen]          = useState(false);
  const [editingExpense,     setEditingExpense]      = useState<Expense | null>(null);
  const [expandedCategoryId, setExpandedCategoryId] = useState<string | null>(null);

  const expensesByCatId = useMemo(() => {
    const map: Record<string, Expense[]> = {};
    for (const e of filterCurrentMonth(expenses)) {
      if (!map[e.categoryId]) map[e.categoryId] = [];
      map[e.categoryId].push(e);
    }
    return map;
  }, [expenses]);

  function toggleCategory(id: string) {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpandedCategoryId((prev) => (prev === id ? null : id));
  }

  const budgetAlert = totalBudgetAlert(stats);
  const paceAlarm   = isPaceAlarm(stats);
  const hasBudget   = settings.totalMonthlyBudget > 0;
  const hasExpenses = expenses.length > 0;
  const pct         = Math.min(stats.percentUsed, 100);
  const barColor    = progressColor(stats.percentUsed);

  const today        = new Date();
  const daysInMonth  = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();

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
          <Text style={styles.appName}>SaveBud</Text>
        </View>

        {/* ── Hero card ───────────────────────────────────────────────────── */}
        <View style={[styles.heroCard, shadows.md]}>
          <Text style={styles.heroLabel}>Gastado este mes</Text>

          {/* Total spent vs budget */}
          <View style={styles.heroAmountRow}>
            <Text style={styles.heroAmount}>{formatARS(stats.totalSpent)}</Text>
            {hasBudget && (
              <Text style={styles.heroBudget}>
                {'/ '}{formatARSShort(settings.totalMonthlyBudget)}
              </Text>
            )}
          </View>

          {/* Filling progress bar */}
          {hasBudget && (
            <ProgressBar
              value={pct}
              color={barColor}
              height={8}
              backgroundColor="rgba(255,255,255,0.2)"
            />
          )}

          {/* Meta row */}
          <View style={styles.heroMeta}>
            {hasBudget && (
              <Text style={styles.heroMetaText}>
                {Math.round(stats.percentUsed)}% del presupuesto
              </Text>
            )}
            <Text style={styles.heroMetaText}>
              Día {today.getDate()} de {daysInMonth}
            </Text>
          </View>
        </View>

        {/* ── Stats row ───────────────────────────────────────────────────── */}
        <View style={styles.statsRow}>
          <View style={[styles.statCard, shadows.sm]}>
            <Text style={styles.statLabel}>Promedio diario</Text>
            <Text style={styles.statValue}>{formatARSShort(stats.dailyAverage)}</Text>
            <Text style={styles.statSub}>proyectado sobre el mes</Text>
          </View>
          <View style={[styles.statCard, shadows.sm]}>
            <Text style={styles.statLabel}>Gastos</Text>
            <Text style={styles.statValue}>{stats.expenseCount}</Text>
            <Text style={styles.statSub}>este mes</Text>
          </View>
        </View>

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
                      monthExpenses={expensesByCatId[cat.id] ?? []}
                      expanded={expandedCategoryId === cat.id}
                      onToggle={() => toggleCategory(cat.id)}
                      onExpensePress={setEditingExpense}
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
  appName: {
    fontFamily: typography.body, fontSize: typography.size.sm,
    color: colors.inkFaint, letterSpacing: 1.5, textTransform: 'uppercase',
  },

  heroCard: {
    backgroundColor: colors.primary, borderRadius: radius.xl,
    padding: spacing.xl, gap: spacing.md, marginBottom: spacing.lg,
  },
  heroLabel: {
    fontFamily: typography.body, fontSize: typography.size.sm,
    color: 'rgba(255,255,255,0.65)', letterSpacing: 0.3,
  },
  heroAmountRow: {
    flexDirection: 'row', alignItems: 'flex-end', gap: spacing.sm,
  },
  heroAmount: {
    fontFamily: typography.displayBold, fontSize: typography.size.hero,
    color: colors.white, lineHeight: typography.size.hero * 1.05,
  },
  heroBudget: {
    fontFamily: typography.display, fontSize: typography.size.lg,
    color: 'rgba(255,255,255,0.55)', marginBottom: 6,
  },
  heroMeta: {
    flexDirection: 'row', justifyContent: 'space-between', marginTop: spacing.xs,
  },
  heroMetaText: {
    fontFamily: typography.body, fontSize: typography.size.xs,
    color: 'rgba(255,255,255,0.55)',
  },

  statsRow: { flexDirection: 'row', gap: spacing.md, marginBottom: spacing.lg },
  statCard: {
    flex: 1, backgroundColor: colors.surface,
    borderRadius: radius.lg, padding: spacing.md, gap: 2,
  },
  statLabel: {
    fontFamily: typography.body, fontSize: typography.size.xs,
    color: colors.inkFaint, textTransform: 'uppercase', letterSpacing: 0.5,
  },
  statValue: { fontFamily: typography.displayBold, fontSize: typography.size.xl, color: colors.ink },
  statSub: { fontFamily: typography.body, fontSize: typography.size.xs, color: colors.inkMuted },

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
