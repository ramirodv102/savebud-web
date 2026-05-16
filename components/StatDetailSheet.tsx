import { useRef, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, Modal, Pressable,
  Animated, Dimensions,
} from 'react-native';
import Svg, { Line, Polyline, Circle, Text as SvgText } from 'react-native-svg';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { X } from 'lucide-react-native';
import { formatARS, formatARSShort } from '../lib/format';
import { colors, spacing, typography } from '../lib/theme';
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
const SHEET_PAD = spacing.lg;

// ── Projection chart (SVG) ────────────────────────────────────────────────────

function ProjectionChart({
  expenses, daysInMonth, dayOfMonth, projectedTotal, budget,
}: {
  expenses: Expense[];
  daysInMonth: number;
  dayOfMonth: number;
  projectedTotal: number;
  budget: number;
}) {
  // Daily totals
  const byDay: Record<number, number> = {};
  for (const e of expenses) {
    const d = parseInt(e.date.slice(8, 10), 10);
    byDay[d] = (byDay[d] ?? 0) + e.amount;
  }

  // Cumulative spending per day (up to today)
  const cumulative: number[] = [];
  let running = 0;
  for (let day = 1; day <= dayOfMonth; day++) {
    running += byDay[day] ?? 0;
    cumulative.push(running);
  }
  const cumulativeToday = cumulative[cumulative.length - 1] ?? 0;

  // Layout
  const totalW  = SCREEN_W - SHEET_PAD * 2;
  const totalH  = 150;
  const Y_AXIS  = 52;   // left margin for Y labels
  const X_AXIS  = 20;   // bottom margin for X labels
  const plotW   = totalW - Y_AXIS;
  const plotH   = totalH - X_AXIS;

  const maxY = Math.max(projectedTotal, budget > 0 ? budget : 0, cumulativeToday, 1) * 1.18;

  function xScale(day: number) {
    return Y_AXIS + ((day - 1) / Math.max(1, daysInMonth - 1)) * plotW;
  }
  function yScale(amount: number) {
    return plotH - (amount / maxY) * plotH;
  }

  const todayX = xScale(dayOfMonth);
  const todayY = yScale(cumulativeToday);
  const endX   = xScale(daysInMonth);
  const endY   = yScale(projectedTotal);
  const budgetY = budget > 0 ? yScale(budget) : null;

  const actualPoints = cumulative.length > 0
    ? cumulative.map((c, i) => `${xScale(i + 1).toFixed(1)},${yScale(c).toFixed(1)}`).join(' ')
    : null;

  const midDay = Math.ceil(daysInMonth / 2);

  // Clamp Y-axis label so it doesn't clip at the top
  const projLabelY = Math.max(endY + 4, 10);

  return (
    <Svg width={totalW} height={totalH}>
      {/* ── Grid / axes ───────────────────────────────────────────── */}
      <Line x1={Y_AXIS} y1={0}     x2={Y_AXIS}  y2={plotH} stroke={colors.border} strokeWidth={1} />
      <Line x1={Y_AXIS} y1={plotH} x2={totalW}  y2={plotH} stroke={colors.border} strokeWidth={1} />

      {/* ── Budget reference line ─────────────────────────────────── */}
      {budgetY !== null && (
        <>
          <Line
            x1={Y_AXIS} y1={budgetY} x2={totalW} y2={budgetY}
            stroke={colors.warning} strokeWidth={1}
            strokeDasharray="5,3" opacity={0.75}
          />
          <Line x1={Y_AXIS - 4} y1={budgetY} x2={Y_AXIS} y2={budgetY} stroke={colors.warning} strokeWidth={1} />
          <SvgText
            x={Y_AXIS - 5} y={budgetY - 3}
            textAnchor="end" fontSize={8}
            fill={colors.warning} fontFamily={typography.body}
          >
            {formatARSShort(budget)}
          </SvgText>
        </>
      )}

      {/* ── Actual cumulative line ────────────────────────────────── */}
      {actualPoints && (
        <Polyline
          points={actualPoints}
          fill="none" stroke={colors.ink}
          strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"
        />
      )}

      {/* ── Projection dashed line ────────────────────────────────── */}
      {dayOfMonth < daysInMonth && cumulativeToday > 0 && (
        <Line
          x1={todayX.toFixed(1)} y1={todayY.toFixed(1)}
          x2={endX.toFixed(1)}   y2={endY.toFixed(1)}
          stroke={colors.inkMuted} strokeWidth={1.5}
          strokeDasharray="6,4" strokeLinecap="round"
        />
      )}

      {/* ── Today vertical marker ────────────────────────────────── */}
      <Line
        x1={todayX.toFixed(1)} y1={0}
        x2={todayX.toFixed(1)} y2={plotH}
        stroke={colors.primary} strokeWidth={1}
        strokeDasharray="3,3" opacity={0.4}
      />

      {/* ── Dots ──────────────────────────────────────────────────── */}
      {cumulativeToday > 0 && (
        <Circle cx={todayX.toFixed(1)} cy={todayY.toFixed(1)} r={4} fill={colors.primary} />
      )}
      {dayOfMonth < daysInMonth && (
        <Circle
          cx={endX.toFixed(1)} cy={endY.toFixed(1)}
          r={3} fill="none" stroke={colors.inkMuted} strokeWidth={1.5}
        />
      )}

      {/* ── Y-axis: projected value tick + label ─────────────────── */}
      <Line x1={Y_AXIS - 4} y1={endY.toFixed(1)} x2={Y_AXIS} y2={endY.toFixed(1)} stroke={colors.border} strokeWidth={1} />
      <SvgText
        x={Y_AXIS - 5} y={projLabelY}
        textAnchor="end" fontSize={9}
        fill={colors.inkMuted} fontFamily={typography.body}
      >
        {formatARSShort(projectedTotal)}
      </SvgText>

      {/* ── X-axis labels: 1, mid, today (if unique), last ───────── */}
      {[1, midDay, dayOfMonth !== 1 && dayOfMonth !== daysInMonth ? dayOfMonth : null, daysInMonth]
        .filter((d, i, arr) => d !== null && arr.indexOf(d) === i)
        .map((d) => (
          <SvgText
            key={d}
            x={xScale(d!).toFixed(1)} y={totalH - 3}
            textAnchor="middle" fontSize={9}
            fill={d === dayOfMonth ? colors.primary : colors.inkFaint}
            fontFamily={typography.body}
          >
            {d}
          </SvgText>
        ))}
    </Svg>
  );
}

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

  const sub = isProjection
    ? budget > 0
      ? projectedTotal > budget
        ? `${formatARSShort(projectedTotal - budget)} por encima del presupuesto`
        : `${formatARSShort(budget - projectedTotal)} por debajo del presupuesto`
      : `si mantenés el ritmo de los ${dayOfMonth} días transcurridos`
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
            <Text style={styles.bigNumber}>{formatARS(value)}</Text>
            <Text style={styles.subText}>{sub}</Text>

            {isProjection && (
              <View style={styles.chartWrapper}>
                <ProjectionChart
                  expenses={expenses}
                  daysInMonth={daysInMonth}
                  dayOfMonth={dayOfMonth}
                  projectedTotal={projectedTotal}
                  budget={budget}
                />
                <View style={styles.legend}>
                  <View style={styles.legendItem}>
                    <View style={[styles.legendLine, { backgroundColor: colors.ink }]} />
                    <Text style={styles.legendText}>Acumulado real</Text>
                  </View>
                  <View style={styles.legendItem}>
                    <View style={[styles.legendDash, { borderColor: colors.inkMuted }]} />
                    <Text style={styles.legendText}>Proyección</Text>
                  </View>
                  {budget > 0 && (
                    <View style={styles.legendItem}>
                      <View style={[styles.legendDash, { borderColor: colors.warning }]} />
                      <Text style={styles.legendText}>Presupuesto</Text>
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
    paddingHorizontal: SHEET_PAD, paddingBottom: spacing.xs,
  },
  headerLabel: {
    fontFamily: typography.bodySemibold, fontSize: typography.size.xs,
    color: colors.inkMuted, textTransform: 'uppercase', letterSpacing: 0.7,
  },

  body: {
    paddingHorizontal: SHEET_PAD, paddingTop: spacing.sm,
    paddingBottom: spacing.md, gap: spacing.xs,
  },
  bigNumber: {
    fontFamily: typography.displayBold, fontSize: 36, color: colors.ink,
  },
  subText: {
    fontFamily: typography.body, fontSize: typography.size.sm, color: colors.inkMuted,
  },

  chartWrapper: { marginTop: spacing.lg, gap: spacing.md },
  legend: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  legendLine: { width: 16, height: 2, borderRadius: 1 },
  legendDash: { width: 16, height: 0, borderTopWidth: 1.5, borderStyle: 'dashed' },
  legendText: {
    fontFamily: typography.body, fontSize: typography.size.xs, color: colors.inkMuted,
  },
});
