import { useRef, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, Modal, Pressable,
  Animated, Dimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { X } from 'lucide-react-native';
import { formatARS, formatARSShort } from '../lib/format';
import { colors, spacing, radius, typography } from '../lib/theme';
import type { Expense } from '../types';

export type StatMode = 'average' | 'projection';

type Props = {
  visible: boolean;
  mode: StatMode;
  dailyAverage: number;
  projectedTotal: number;
  dayOfMonth: number;
  daysInMonth: number;
  budget: number;
  expenses: Expense[];
  onClose: () => void;
};

const { height: SCREEN_H, width: SCREEN_W } = Dimensions.get('window');
const CHART_H = 90;
const CHART_PAD = spacing.lg;

// ── Day-by-day bar chart ──────────────────────────────────────────────────────

function DailyChart({
  expenses, daysInMonth, dayOfMonth, budget,
}: {
  expenses: Expense[];
  daysInMonth: number;
  dayOfMonth: number;
  budget: number;
}) {
  const byDay: Record<number, number> = {};
  for (const e of expenses) {
    const d = parseInt(e.date.slice(8, 10), 10);
    byDay[d] = (byDay[d] ?? 0) + e.amount;
  }

  const maxAmount = Math.max(...Object.values(byDay), 1);
  // budget line: what the daily average should be
  const budgetLineRatio = budget > 0 ? (budget / daysInMonth) / maxAmount : null;
  const budgetLineY = budgetLineRatio !== null ? CHART_H - budgetLineRatio * CHART_H : null;

  const chartW = SCREEN_W - CHART_PAD * 2;
  const barW   = Math.floor((chartW - (daysInMonth - 1)) / daysInMonth);

  return (
    <View style={{ height: CHART_H + 20 }}>
      {/* Bars */}
      <View style={{ height: CHART_H, flexDirection: 'row', alignItems: 'flex-end', gap: 1 }}>
        {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((day) => {
          const amount = byDay[day] ?? 0;
          const barH   = amount > 0 ? Math.max(3, (amount / maxAmount) * CHART_H) : 0;
          const isToday   = day === dayOfMonth;
          const isPast    = day < dayOfMonth;
          const isFuture  = day > dayOfMonth;

          return (
            <View
              key={day}
              style={{
                width: barW, height: CHART_H,
                justifyContent: 'flex-end', alignItems: 'center',
              }}
            >
              <View
                style={{
                  width: barW, height: barH || (isFuture ? 2 : 0),
                  backgroundColor: isToday
                    ? colors.primary
                    : isPast
                      ? '#8C8880'
                      : colors.border,
                  borderRadius: 2,
                  opacity: isFuture ? 0.3 : 1,
                }}
              />
            </View>
          );
        })}
      </View>

      {/* Budget line */}
      {budgetLineY !== null && (
        <View
          style={{
            position: 'absolute',
            top: budgetLineY,
            left: 0, right: 0, height: 1,
            backgroundColor: colors.warning,
            opacity: 0.7,
          }}
        />
      )}

      {/* X-axis labels: first, mid, last */}
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 }}>
        <Text style={chartStyles.axisLabel}>1</Text>
        <Text style={chartStyles.axisLabel}>{Math.ceil(daysInMonth / 2)}</Text>
        <Text style={chartStyles.axisLabel}>{daysInMonth}</Text>
      </View>
    </View>
  );
}

const chartStyles = StyleSheet.create({
  axisLabel: {
    fontFamily: typography.body, fontSize: 9,
    color: colors.inkFaint,
  },
});

// ── Sheet ─────────────────────────────────────────────────────────────────────

export function StatDetailSheet({
  visible, mode, dailyAverage, projectedTotal,
  dayOfMonth, daysInMonth, budget, expenses, onClose,
}: Props) {
  const insets       = useSafeAreaInsets();
  const slideAnim    = useRef(new Animated.Value(SCREEN_H)).current;
  const backdropAnim = useRef(new Animated.Value(0)).current;

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
    ]).start(onClose);
  }, [onClose, slideAnim, backdropAnim]);

  const isProjection = mode === 'projection';
  const value        = isProjection ? projectedTotal : dailyAverage;
  const label        = isProjection ? 'Proyección a fin de mes' : 'Promedio diario';
  const sub          = isProjection
    ? (budget > 0
        ? projectedTotal > budget
          ? `${formatARSShort(projectedTotal - budget)} por encima del presupuesto`
          : `${formatARSShort(budget - projectedTotal)} por debajo del presupuesto`
        : `si mantenés el ritmo de los ${dayOfMonth} días transcurridos`)
    : `basado en ${dayOfMonth} día${dayOfMonth !== 1 ? 's' : ''} transcurrido${dayOfMonth !== 1 ? 's' : ''}`;

  return (
    <Modal transparent visible={visible} animationType="none" onRequestClose={dismiss} statusBarTranslucent>
      <View style={styles.root}>
        <Animated.View style={[StyleSheet.absoluteFill, styles.backdrop, { opacity: backdropAnim }]} />
        <Pressable style={StyleSheet.absoluteFill} onPress={dismiss} />

        <Animated.View
          style={[
            styles.sheet,
            { paddingBottom: Math.max(insets.bottom, spacing.lg) },
            { transform: [{ translateY: slideAnim }] },
          ]}
        >
          <View style={styles.handle} />

          <View style={styles.header}>
            <Text style={styles.headerLabel}>{label}</Text>
            <Pressable onPress={dismiss} hitSlop={12}>
              <X size={18} color={colors.inkMuted} strokeWidth={2} />
            </Pressable>
          </View>

          <View style={styles.body}>
            {/* Full number */}
            <Text style={styles.bigNumber}>{formatARS(value)}</Text>
            <Text style={styles.subText}>{sub}</Text>

            {/* Chart (projection mode only) */}
            {isProjection && (
              <View style={styles.chartWrapper}>
                <DailyChart
                  expenses={expenses}
                  daysInMonth={daysInMonth}
                  dayOfMonth={dayOfMonth}
                  budget={budget}
                />
                <View style={styles.chartLegend}>
                  <View style={styles.legendItem}>
                    <View style={[styles.legendDot, { backgroundColor: colors.primary }]} />
                    <Text style={styles.legendText}>Hoy</Text>
                  </View>
                  <View style={styles.legendItem}>
                    <View style={[styles.legendDot, { backgroundColor: '#8C8880' }]} />
                    <Text style={styles.legendText}>Días anteriores</Text>
                  </View>
                  {budget > 0 && (
                    <View style={styles.legendItem}>
                      <View style={[styles.legendLine, { backgroundColor: colors.warning }]} />
                      <Text style={styles.legendText}>Límite diario</Text>
                    </View>
                  )}
                </View>
              </View>
            )}
          </View>
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
  },
  handle: {
    width: 36, height: 4, borderRadius: 2,
    backgroundColor: colors.border, alignSelf: 'center',
    marginTop: spacing.md, marginBottom: spacing.xs,
  },

  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: spacing.lg, paddingBottom: spacing.xs,
  },
  headerLabel: {
    fontFamily: typography.bodySemibold, fontSize: typography.size.xs,
    color: colors.inkMuted, textTransform: 'uppercase', letterSpacing: 0.7,
  },

  body: {
    paddingHorizontal: CHART_PAD, paddingTop: spacing.sm, gap: spacing.xs,
  },
  bigNumber: {
    fontFamily: typography.displayBold, fontSize: 36, color: colors.ink,
  },
  subText: {
    fontFamily: typography.body, fontSize: typography.size.sm, color: colors.inkMuted,
  },

  chartWrapper: { marginTop: spacing.lg, gap: spacing.md },
  chartLegend: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  legendItem:  { flexDirection: 'row', alignItems: 'center', gap: 5 },
  legendDot:   { width: 8, height: 8, borderRadius: 4 },
  legendLine:  { width: 14, height: 2, borderRadius: 1 },
  legendText:  {
    fontFamily: typography.body, fontSize: typography.size.xs, color: colors.inkMuted,
  },
});
