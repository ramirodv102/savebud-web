import { useState, useRef, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, Modal, Pressable, TextInput,
  ScrollView, KeyboardAvoidingView, Platform, Animated, Dimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { X, Check, Archive, RotateCcw } from 'lucide-react-native';
import { useAppStore } from '../store/useAppStore';
import { colors, spacing, radius, typography } from '../lib/theme';
import type { Category } from '../types';

// ── Constants ─────────────────────────────────────────────────────────────────

const PRESET_COLORS = [
  '#111111', '#2E2E2E', '#444444', '#5C5C5C',
  '#707070', '#888888', '#A0A0A0', '#B8B8B8',
  '#3A3A3A', '#545454', '#6E6E6E', '#909090',
];

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

function formatDisplay(digits: string): string {
  if (!digits) return '';
  const n = parseInt(digits, 10);
  return isNaN(n) ? '' : new Intl.NumberFormat('es-AR').format(n);
}

// ── Component ─────────────────────────────────────────────────────────────────

type Props = {
  visible: boolean;
  category: Category | null; // null = add mode
  onClose: () => void;
};

const { height: SCREEN_H } = Dimensions.get('window');

export function CategorySheet({ visible, category, onClose }: Props) {
  const insets         = useSafeAreaInsets();
  const upsertCategory = useAppStore((s) => s.upsertCategory);

  const [name,          setName]          = useState('');
  const [icon,          setIcon]          = useState('');
  const [selectedColor, setSelectedColor] = useState(PRESET_COLORS[0]);
  const [budgetDigits,  setBudgetDigits]  = useState('');
  const [saving,        setSaving]        = useState(false);

  const slideAnim    = useRef(new Animated.Value(SCREEN_H)).current;
  const backdropAnim = useRef(new Animated.Value(0)).current;
  const nameRef      = useRef<TextInput>(null);

  const isEdit = category !== null;

  useEffect(() => {
    if (visible) {
      if (category) {
        setName(category.name);
        setIcon(category.icon);
        setSelectedColor(category.color);
        setBudgetDigits(category.monthlyBudget ? String(category.monthlyBudget) : '');
      } else {
        setName('');
        setIcon('');
        setSelectedColor(PRESET_COLORS[0]);
        setBudgetDigits('');
      }

      Animated.parallel([
        Animated.spring(slideAnim, { toValue: 0, useNativeDriver: true, damping: 20, stiffness: 260 }),
        Animated.timing(backdropAnim, { toValue: 1, duration: 200, useNativeDriver: true }),
      ]).start(() => setTimeout(() => nameRef.current?.focus(), 50));
    }
  }, [visible, category]);

  const dismiss = useCallback(() => {
    Animated.parallel([
      Animated.timing(slideAnim, { toValue: SCREEN_H, duration: 260, useNativeDriver: true }),
      Animated.timing(backdropAnim, { toValue: 0, duration: 200, useNativeDriver: true }),
    ]).start(onClose);
  }, [onClose, slideAnim, backdropAnim]);

  function handleBudgetChange(text: string) {
    const d = text.replace(/\D/g, '');
    if (parseInt(d || '0', 10) <= 100_000_000) setBudgetDigits(d);
  }

  async function handleSave() {
    if (!canSave || saving) return;
    setSaving(true);
    try {
      await upsertCategory({
        id:            category?.id ?? generateId(),
        name:          name.trim(),
        icon:          icon.trim() || '📦',
        color:         selectedColor,
        monthlyBudget: budgetDigits ? parseInt(budgetDigits, 10) : null,
        archived:      category?.archived ?? false,
      });
      dismiss();
    } finally {
      setSaving(false);
    }
  }

  async function handleArchiveToggle() {
    if (!category) return;
    await upsertCategory({ ...category, archived: !category.archived });
    dismiss();
  }

  const canSave = name.trim().length > 0;

  return (
    <Modal transparent visible={visible} animationType="none" onRequestClose={dismiss} statusBarTranslucent>
      <View style={styles.root}>
        <Animated.View style={[StyleSheet.absoluteFill, styles.backdrop, { opacity: backdropAnim }]} />
        <Pressable style={StyleSheet.absoluteFill} onPress={dismiss} />

        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.kav}
          pointerEvents="box-none"
        >
          <Animated.View
            style={[
              styles.sheet,
              { paddingBottom: Math.max(insets.bottom, spacing.md) },
              { transform: [{ translateY: slideAnim }] },
            ]}
          >
            <View style={styles.handle} />
            <View style={styles.header}>
              <Text style={styles.headerTitle}>
                {isEdit ? 'Editar categoría' : 'Nueva categoría'}
              </Text>
              <Pressable onPress={dismiss} hitSlop={12}>
                <X size={20} color={colors.inkMuted} strokeWidth={2} />
              </Pressable>
            </View>

            <ScrollView
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.content}
            >
              {/* Name */}
              <Text style={styles.label}>Nombre</Text>
              <TextInput
                ref={nameRef}
                style={styles.textInput}
                value={name}
                onChangeText={setName}
                placeholder="Ej: Supermercado"
                placeholderTextColor={colors.inkFaint}
                maxLength={30}
                returnKeyType="next"
                selectionColor={colors.primary}
              />

              {/* Icon */}
              <Text style={styles.label}>Emoji</Text>
              <TextInput
                style={[styles.textInput, styles.emojiInput]}
                value={icon}
                onChangeText={(t) => setIcon(t.slice(-2))}
                placeholder="🛒"
                placeholderTextColor={colors.inkFaint}
                maxLength={4}
                selectionColor={colors.primary}
              />

              {/* Color */}
              <Text style={styles.label}>Color</Text>
              <View style={styles.colorGrid}>
                {PRESET_COLORS.map((c) => (
                  <Pressable
                    key={c}
                    style={[styles.swatch, { backgroundColor: c }, selectedColor === c && styles.swatchSelected]}
                    onPress={() => setSelectedColor(c)}
                  >
                    {selectedColor === c && <Check size={14} color={colors.white} strokeWidth={3} />}
                  </Pressable>
                ))}
              </View>

              {/* Budget */}
              <Text style={styles.label}>
                Límite mensual <Text style={styles.optional}>(opcional)</Text>
              </Text>
              <View style={styles.budgetRow}>
                <Text style={[styles.budgetSymbol, !!budgetDigits && styles.budgetSymbolFilled]}>$</Text>
                <TextInput
                  style={styles.budgetInput}
                  value={formatDisplay(budgetDigits)}
                  onChangeText={handleBudgetChange}
                  keyboardType="numeric"
                  placeholder="Sin límite"
                  placeholderTextColor={colors.inkFaint}
                  returnKeyType="done"
                  selectionColor={colors.primary}
                />
                {!!budgetDigits && <Text style={styles.perMonth}>/mes</Text>}
              </View>

              <View style={{ height: spacing.lg }} />
            </ScrollView>

            <View style={styles.footer}>
              <Pressable
                style={[styles.saveBtn, !canSave && styles.saveBtnDisabled]}
                onPress={handleSave}
                disabled={!canSave || saving}
              >
                <Text style={styles.saveBtnText}>{saving ? 'Guardando...' : 'Guardar'}</Text>
              </Pressable>

              {isEdit && (
                <Pressable style={styles.archiveBtn} onPress={handleArchiveToggle}>
                  {category?.archived
                    ? <RotateCcw size={14} color={colors.inkMuted} strokeWidth={2} />
                    : <Archive size={14} color={colors.inkMuted} strokeWidth={2} />
                  }
                  <Text style={styles.archiveBtnText}>
                    {category?.archived ? 'Restaurar categoría' : 'Archivar categoría'}
                  </Text>
                </Pressable>
              )}
            </View>
          </Animated.View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: { flex: 1 },
  backdrop: { backgroundColor: 'rgba(0,0,0,0.45)' },
  kav: { flex: 1, justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: colors.background,
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    maxHeight: SCREEN_H * 0.88,
  },
  handle: {
    width: 36, height: 4, borderRadius: 2,
    backgroundColor: colors.border, alignSelf: 'center',
    marginTop: spacing.md, marginBottom: spacing.xs,
  },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: spacing.lg, paddingVertical: spacing.sm,
  },
  headerTitle: {
    fontFamily: typography.displayBold, fontSize: typography.size.lg, color: colors.ink,
  },
  content: { paddingHorizontal: spacing.lg, paddingTop: spacing.xs },

  label: {
    fontFamily: typography.bodySemibold, fontSize: typography.size.xs,
    color: colors.inkMuted, textTransform: 'uppercase', letterSpacing: 0.7,
    marginBottom: spacing.sm, marginTop: spacing.md,
  },
  optional: {
    fontFamily: typography.body, color: colors.inkFaint, textTransform: 'none', letterSpacing: 0,
  },

  textInput: {
    fontFamily: typography.body, fontSize: typography.size.md, color: colors.ink,
    backgroundColor: colors.surface, borderRadius: radius.lg, borderWidth: 1,
    borderColor: colors.border, paddingHorizontal: spacing.md, paddingVertical: spacing.sm + 2,
  },
  emojiInput: { fontSize: 22, textAlign: 'center', width: 64 },

  colorGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  swatch: {
    width: 38, height: 38, borderRadius: 19,
    alignItems: 'center', justifyContent: 'center',
  },
  swatchSelected: { borderWidth: 3, borderColor: colors.ink },

  budgetRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  budgetSymbol: {
    fontFamily: typography.display, fontSize: typography.size.lg, color: colors.border,
  },
  budgetSymbolFilled: { color: colors.inkMuted },
  budgetInput: {
    fontFamily: typography.display, fontSize: typography.size.lg, color: colors.ink,
    flex: 1, padding: 0,
  },
  perMonth: {
    fontFamily: typography.body, fontSize: typography.size.sm, color: colors.inkFaint,
  },

  footer: { paddingHorizontal: spacing.lg, paddingTop: spacing.sm, gap: spacing.xs },
  saveBtn: {
    backgroundColor: colors.primary, borderRadius: radius.full,
    paddingVertical: spacing.md, alignItems: 'center',
  },
  saveBtnDisabled: { opacity: 0.35 },
  saveBtnText: { fontFamily: typography.bodySemibold, fontSize: typography.size.lg, color: colors.white },
  archiveBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: spacing.xs, paddingVertical: spacing.sm,
  },
  archiveBtnText: {
    fontFamily: typography.bodyMedium, fontSize: typography.size.sm, color: colors.inkMuted,
  },
});
