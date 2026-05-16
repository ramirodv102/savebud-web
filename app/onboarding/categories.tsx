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
import { DEFAULT_CATEGORIES } from '../../lib/defaults';
import { useAppStore } from '../../store/useAppStore';
import { colors, spacing, radius, typography, shadows } from '../../lib/theme';
import type { Category } from '../../types';

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

function CategoryCell({
  category,
  selected,
  onPress,
  size,
}: {
  category: Category;
  selected: boolean;
  onPress: () => void;
  size: number;
}) {
  const circleSize = Math.floor(size * 0.74);

  return (
    <Pressable
      style={({ pressed }) => [cellStyles.cell, { width: size, opacity: pressed ? 0.75 : 1 }]}
      onPress={onPress}
    >
      {/* Colored circle with emoji */}
      <View
        style={[
          cellStyles.circle,
          {
            width: circleSize,
            height: circleSize,
            backgroundColor: selected ? category.color : colors.surfaceAlt,
          },
          selected && cellStyles.circleSelected,
          selected && shadows.sm,
        ]}
      >
        <Text style={cellStyles.emoji}>{category.icon}</Text>

        {selected && (
          <View style={cellStyles.badge}>
            <Check size={9} color={colors.white} strokeWidth={3} />
          </View>
        )}
      </View>

      <Text
        style={[cellStyles.name, selected && cellStyles.nameSelected]}
        numberOfLines={2}
      >
        {category.name}
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
  circle: {
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  circleSelected: {
    borderWidth: 2.5,
    borderColor: colors.primary,
  },
  emoji: {
    fontSize: 26,
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

export default function CategoriesScreen() {
  const saveCategories = useAppStore((s) => s.saveCategories);
  const { width } = useWindowDimensions();

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
    const chosen = DEFAULT_CATEGORIES.filter((c) => selected.has(c.id));
    await saveCategories(chosen);
    router.push('/onboarding/budget');
  }

  const canContinue = selected.size > 0;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <StepDots current={3} total={5} />

        <Text style={styles.title}>¿En qué gastás?</Text>
        <Text style={styles.subtitle}>
          Elegí tus categorías. Podés personalizarlas en Ajustes.
        </Text>

        {/* 4 × 3 grid */}
        <View style={[styles.grid, { gap: GAP }]}>
          {DEFAULT_CATEGORIES.map((category) => (
            <CategoryCell
              key={category.id}
              category={category}
              selected={selected.has(category.id)}
              onPress={() => toggle(category.id)}
              size={cellSize}
            />
          ))}
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <Text style={styles.count}>
          {selected.size} seleccionada{selected.size !== 1 ? 's' : ''}
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
