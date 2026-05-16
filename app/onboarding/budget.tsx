import { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  TextInput,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useAppStore } from '../../store/useAppStore';
import { colors, spacing, radius, typography } from '../../lib/theme';
import type { Category } from '../../types';

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatDisplay(digits: string): string {
  if (!digits) return '';
  const num = parseInt(digits, 10);
  return isNaN(num)
    ? ''
    : new Intl.NumberFormat('es-AR', { minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(num);
}

// ── Sub-components ────────────────────────────────────────────────────────────

function StepDots({ current, total }: { current: number; total: number }) {
  return (
    <View style={dotStyles.row}>
      {Array.from({ length: total }, (_, i) => (
        <View key={i} style={[dotStyles.dot, i < current ? dotStyles.filled : dotStyles.empty]} />
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

function CategoryBudgetRow({
  category,
  value,
  onChange,
  onSubmitEditing,
  inputRef,
}: {
  category: Category;
  value: string;
  onChange: (digits: string) => void;
  onSubmitEditing: () => void;
  inputRef: React.Ref<TextInput>;
}) {
  function handleChangeText(text: string) {
    const digits = text.replace(/\D/g, '');
    if (parseInt(digits || '0', 10) <= 100_000_000) {
      onChange(digits);
    }
  }

  return (
    <View style={rowStyles.row}>
      {/* Category pill */}
      <View style={[rowStyles.dot, { backgroundColor: category.color }]}>
        <Text style={rowStyles.emoji}>{category.icon}</Text>
      </View>
      <Text style={rowStyles.name} numberOfLines={1}>{category.name}</Text>

      {/* Amount input */}
      <View style={rowStyles.inputWrap}>
        <Text style={rowStyles.symbol}>$</Text>
        <TextInput
          ref={inputRef}
          style={rowStyles.input}
          value={formatDisplay(value)}
          onChangeText={handleChangeText}
          keyboardType="numeric"
          placeholder="Sin límite"
          placeholderTextColor={colors.inkFaint}
          returnKeyType="next"
          onSubmitEditing={onSubmitEditing}
          selectionColor={colors.primary}
        />
        {value.length > 0 && <Text style={rowStyles.perMonth}>/mes</Text>}
      </View>
    </View>
  );
}

const rowStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    gap: spacing.sm,
  },
  dot: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  emoji: {
    fontSize: 18,
  },
  name: {
    flex: 1,
    fontFamily: typography.bodyMedium,
    fontSize: typography.size.md,
    color: colors.ink,
  },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  symbol: {
    fontFamily: typography.display,
    fontSize: typography.size.lg,
    color: colors.inkMuted,
  },
  input: {
    fontFamily: typography.display,
    fontSize: typography.size.lg,
    color: colors.ink,
    minWidth: 80,
    textAlign: 'right',
    padding: 0,
  },
  perMonth: {
    fontFamily: typography.body,
    fontSize: typography.size.sm,
    color: colors.inkFaint,
    marginLeft: 2,
  },
});

// ── Screen ────────────────────────────────────────────────────────────────────

export default function BudgetScreen() {
  const categories = useAppStore((s) => s.categories);
  const saveCategories = useAppStore((s) => s.saveCategories);

  // Maps categoryId → raw digit string
  const [budgets, setBudgets] = useState<Record<string, string>>({});

  // Refs for "next" keyboard navigation between inputs
  const inputRefs = useRef<Record<string, TextInput | null>>({});

  function handleChange(categoryId: string, digits: string) {
    setBudgets((prev) => ({ ...prev, [categoryId]: digits }));
  }

  function focusNext(currentId: string) {
    const ids = categories.map((c) => c.id);
    const nextId = ids[ids.indexOf(currentId) + 1];
    if (nextId) inputRefs.current[nextId]?.focus();
  }

  async function handleSave() {
    const updated = categories.map((cat) => ({
      ...cat,
      monthlyBudget: budgets[cat.id] ? parseInt(budgets[cat.id], 10) : null,
    }));
    await saveCategories(updated);
    router.push('/onboarding/done');
  }

  async function handleSkip() {
    // Save categories as-is (all monthlyBudget: null)
    router.push('/onboarding/done');
  }

  const anyBudgetSet = Object.values(budgets).some((d) => d.length > 0 && parseInt(d, 10) > 0);

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 24}
      >
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <StepDots current={4} total={5} />

          <Text style={styles.title}>Límites por categoría</Text>
          <Text style={styles.subtitle}>
            Ponele un tope a cada categoría. Los límites son por mes. Dejá en blanco las que no querés limitar.
          </Text>

          {/* One row per selected category */}
          <View style={styles.list}>
            {categories.map((cat) => (
              <CategoryBudgetRow
                key={cat.id}
                category={cat}
                value={budgets[cat.id] ?? ''}
                onChange={(digits) => handleChange(cat.id, digits)}
                onSubmitEditing={() => focusNext(cat.id)}
                inputRef={(ref) => { inputRefs.current[cat.id] = ref; }}
              />
            ))}
          </View>
        </ScrollView>

        {/* Footer */}
        <View style={styles.footer}>
          <Pressable
            style={[styles.cta, !anyBudgetSet && styles.ctaDisabled]}
            onPress={handleSave}
            disabled={!anyBudgetSet}
          >
            <Text style={styles.ctaText}>Guardar límites</Text>
          </Pressable>

          <Pressable style={styles.skipBtn} onPress={handleSkip}>
            <Text style={styles.skipText}>Omitir por ahora</Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  flex: {
    flex: 1,
  },
  scroll: {
    flex: 1,
  },
  content: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xl,
    paddingBottom: spacing.lg,
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
  list: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  footer: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
    paddingBottom: spacing.lg,
    gap: spacing.sm,
    backgroundColor: colors.background,
    borderTopWidth: 1,
    borderTopColor: colors.border,
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
  skipBtn: {
    paddingVertical: spacing.sm,
    alignItems: 'center',
  },
  skipText: {
    fontFamily: typography.body,
    fontSize: typography.size.md,
    color: colors.inkMuted,
  },
});
