import { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Check } from 'lucide-react-native';
import { DEFAULT_PAYMENT_METHODS } from '../../lib/defaults';
import { useAppStore } from '../../store/useAppStore';
import { colors, spacing, radius, typography, shadows } from '../../lib/theme';
import type { PaymentMethod } from '../../types';

// ── Helpers ──────────────────────────────────────────────────────────────────

// Returns true if the hex background color is light and needs dark text
function isLightColor(hex: string): boolean {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return (r * 299 + g * 587 + b * 114) / 1000 > 160;
}

// Returns true if the icon string contains emoji (Unicode outside BMP)
function hasEmoji(str: string): boolean {
  return [...str].some((c) => (c.codePointAt(0) ?? 0) > 0xffff);
}

function logoFontSize(icon: string): number {
  if (hasEmoji(icon)) return 28;
  if (icon.length <= 2) return 17;
  if (icon.length <= 3) return 14;
  return 12;
}

// ── Sub-components ────────────────────────────────────────────────────────────

function StepDots({ current, total }: { current: number; total: number }) {
  return (
    <View style={dotStyles.row}>
      {Array.from({ length: total }, (_, i) => (
        <View
          key={i}
          style={[dotStyles.dot, i < current ? dotStyles.filled : dotStyles.empty]}
        />
      ))}
    </View>
  );
}

const dotStyles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 6, marginBottom: spacing.lg },
  dot: { width: 8, height: 8, borderRadius: 4 },
  filled: { backgroundColor: colors.primary },
  empty: { backgroundColor: colors.border },
});

function MethodCell({
  method,
  selected,
  onPress,
  size,
}: {
  method: PaymentMethod;
  selected: boolean;
  onPress: () => void;
  size: number;
}) {
  const logoSize = Math.floor(size * 0.74);
  const light = isLightColor(method.color);
  const emojiIcon = hasEmoji(method.icon);
  const fontSize = logoFontSize(method.icon);

  return (
    <Pressable
      style={({ pressed }) => [cellStyles.cell, { width: size, opacity: pressed ? 0.75 : 1 }]}
      onPress={onPress}
    >
      {/* Colored logo box */}
      <View
        style={[
          cellStyles.logoBox,
          {
            width: logoSize,
            height: logoSize,
            backgroundColor: method.color,
          },
          selected && cellStyles.logoBoxSelected,
          selected && shadows.sm,
        ]}
      >
        <Text
          style={[
            cellStyles.logoText,
            {
              fontSize,
              color: emojiIcon ? '#000' : light ? colors.ink : colors.white,
            },
          ]}
          numberOfLines={1}
        >
          {method.icon}
        </Text>

        {/* Checkmark badge when selected */}
        {selected && (
          <View style={cellStyles.badge}>
            <Check size={9} color={colors.white} strokeWidth={3} />
          </View>
        )}
      </View>

      {/* Method name */}
      <Text
        style={[cellStyles.name, selected && cellStyles.nameSelected]}
        numberOfLines={2}
      >
        {method.name}
      </Text>
    </Pressable>
  );
}

const cellStyles = StyleSheet.create({
  cell: {
    alignItems: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.xs,
  },
  logoBox: {
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  logoBoxSelected: {
    borderWidth: 2.5,
    borderColor: colors.primary,
  },
  logoText: {
    fontFamily: typography.bodySemibold,
    letterSpacing: -0.3,
  },
  badge: {
    position: 'absolute',
    top: -6,
    right: -6,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.background,
  },
  name: {
    fontFamily: typography.body,
    fontSize: typography.size.xs,
    color: colors.inkMuted,
    textAlign: 'center',
    lineHeight: 15,
  },
  nameSelected: {
    fontFamily: typography.bodyMedium,
    color: colors.primary,
  },
});

// ── Screen ────────────────────────────────────────────────────────────────────

const COLS = 3;

export default function PaymentMethodsScreen() {
  const savePaymentMethods = useAppStore((s) => s.savePaymentMethods);
  const { width } = useWindowDimensions();

  // Start empty — user selects what applies to them
  const [selected, setSelected] = useState<Set<string>>(() => new Set());

  const H_PADDING = spacing.lg * 2;
  const GAP = spacing.sm;
  const cellSize = (width - H_PADDING - GAP * (COLS - 1)) / COLS;

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  async function handleContinue() {
    const chosen = DEFAULT_PAYMENT_METHODS.filter((m) => selected.has(m.id));
    await savePaymentMethods(chosen);
    router.push('/onboarding/categories');
  }

  const canContinue = selected.size > 0;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <StepDots current={2} total={5} />

        <Text style={styles.title}>¿Cómo pagás?</Text>
        <Text style={styles.subtitle}>
          Elegí los medios que usás. Podés cambiarlos en Ajustes cuando quieras.
        </Text>

        {/* 4 × 3 grid */}
        <View style={[styles.grid, { gap: GAP }]}>
          {DEFAULT_PAYMENT_METHODS.map((method) => (
            <MethodCell
              key={method.id}
              method={method}
              selected={selected.has(method.id)}
              onPress={() => toggle(method.id)}
              size={cellSize}
            />
          ))}
        </View>
      </ScrollView>

      {/* Footer — fixed at bottom */}
      <View style={styles.footer}>
        <Text style={styles.count}>
          {selected.size} seleccionado{selected.size !== 1 ? 's' : ''}
        </Text>
        <Pressable
          style={[styles.cta, !canContinue && styles.ctaDisabled]}
          onPress={handleContinue}
          disabled={!canContinue}
        >
          <Text style={styles.ctaText}>Continuar</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scroll: {
    flex: 1,
  },
  content: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl,
    paddingBottom: spacing.md,
  },
  title: {
    fontFamily: typography.displayBold,
    fontSize: typography.size.xxl,
    color: colors.ink,
    marginBottom: spacing.sm,
  },
  subtitle: {
    fontFamily: typography.body,
    fontSize: typography.size.md,
    color: colors.inkMuted,
    lineHeight: 22,
    marginBottom: spacing.xl,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  footer: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
    paddingBottom: spacing.lg,
    gap: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.background,
  },
  count: {
    fontFamily: typography.body,
    fontSize: typography.size.sm,
    color: colors.inkMuted,
    textAlign: 'center',
  },
  cta: {
    backgroundColor: colors.primary,
    borderRadius: radius.full,
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  ctaDisabled: {
    opacity: 0.35,
  },
  ctaText: {
    fontFamily: typography.bodySemibold,
    fontSize: typography.size.lg,
    color: colors.white,
  },
});
