import { useState, useRef, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, Modal, Pressable, TextInput,
  ScrollView, KeyboardAvoidingView, Platform, Animated, Dimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { X, Check, Archive, RotateCcw } from 'lucide-react-native';
import { useAppStore } from '../store/useAppStore';
import { colors, spacing, radius, typography } from '../lib/theme';
import type { PaymentMethod } from '../types';

// ── Constants ─────────────────────────────────────────────────────────────────

const PRESET_COLORS = [
  '#2D9C5A', '#3483FA', '#7B3FE4', '#FF6900',
  '#E5007D', '#D94F3D', '#C8A248', '#0F3D2E',
  '#1E3A8A', '#E07A4F', '#6B9E78', '#9E9E9E',
];

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

// ── Component ─────────────────────────────────────────────────────────────────

type Props = {
  visible: boolean;
  method: PaymentMethod | null; // null = add mode
  onClose: () => void;
};

const { height: SCREEN_H } = Dimensions.get('window');

export function PaymentMethodSheet({ visible, method, onClose }: Props) {
  const insets              = useSafeAreaInsets();
  const upsertPaymentMethod = useAppStore((s) => s.upsertPaymentMethod);

  const [name,          setName]          = useState('');
  const [icon,          setIcon]          = useState('');
  const [selectedColor, setSelectedColor] = useState(PRESET_COLORS[0]);
  const [saving,        setSaving]        = useState(false);

  const slideAnim    = useRef(new Animated.Value(SCREEN_H)).current;
  const backdropAnim = useRef(new Animated.Value(0)).current;
  const nameRef      = useRef<TextInput>(null);

  const isEdit = method !== null;

  useEffect(() => {
    if (visible) {
      if (method) {
        setName(method.name);
        setIcon(method.icon);
        setSelectedColor(method.color);
      } else {
        setName('');
        setIcon('');
        setSelectedColor(PRESET_COLORS[0]);
      }

      Animated.parallel([
        Animated.spring(slideAnim, { toValue: 0, useNativeDriver: true, damping: 20, stiffness: 260 }),
        Animated.timing(backdropAnim, { toValue: 1, duration: 200, useNativeDriver: true }),
      ]).start(() => setTimeout(() => nameRef.current?.focus(), 50));
    }
  }, [visible, method]);

  const dismiss = useCallback(() => {
    Animated.parallel([
      Animated.timing(slideAnim, { toValue: SCREEN_H, duration: 260, useNativeDriver: true }),
      Animated.timing(backdropAnim, { toValue: 0, duration: 200, useNativeDriver: true }),
    ]).start(onClose);
  }, [onClose, slideAnim, backdropAnim]);

  async function handleSave() {
    if (!canSave || saving) return;
    setSaving(true);
    try {
      await upsertPaymentMethod({
        id:       method?.id ?? generateId(),
        name:     name.trim(),
        icon:     icon.trim() || '💳',
        color:    selectedColor,
        archived: method?.archived ?? false,
      });
      dismiss();
    } finally {
      setSaving(false);
    }
  }

  async function handleArchiveToggle() {
    if (!method) return;
    await upsertPaymentMethod({ ...method, archived: !method.archived });
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
                {isEdit ? 'Editar medio de pago' : 'Nuevo medio de pago'}
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
                placeholder="Ej: Mercado Pago"
                placeholderTextColor={colors.inkFaint}
                maxLength={30}
                returnKeyType="next"
                selectionColor={colors.primary}
              />

              {/* Icon */}
              <Text style={styles.label}>
                Ícono <Text style={styles.hint}>(emoji o siglas, máx. 4 caracteres)</Text>
              </Text>
              <View style={styles.iconPreviewRow}>
                <TextInput
                  style={[styles.textInput, styles.iconInput]}
                  value={icon}
                  onChangeText={(t) => setIcon(t.slice(0, 4))}
                  placeholder="MP"
                  placeholderTextColor={colors.inkFaint}
                  maxLength={4}
                  selectionColor={colors.primary}
                />
                {/* Live preview dot */}
                <View style={[styles.previewDot, { backgroundColor: selectedColor }]}>
                  <Text style={styles.previewIcon}>
                    {(icon || 'MP').slice(0, 2)}
                  </Text>
                </View>
              </View>

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
                  {method?.archived
                    ? <RotateCcw size={14} color={colors.inkMuted} strokeWidth={2} />
                    : <Archive size={14} color={colors.inkMuted} strokeWidth={2} />
                  }
                  <Text style={styles.archiveBtnText}>
                    {method?.archived ? 'Restaurar medio de pago' : 'Archivar medio de pago'}
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
  hint: {
    fontFamily: typography.body, color: colors.inkFaint,
    textTransform: 'none', letterSpacing: 0, fontSize: typography.size.xs,
  },

  textInput: {
    fontFamily: typography.body, fontSize: typography.size.md, color: colors.ink,
    backgroundColor: colors.surface, borderRadius: radius.lg, borderWidth: 1,
    borderColor: colors.border, paddingHorizontal: spacing.md, paddingVertical: spacing.sm + 2,
  },
  iconPreviewRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  iconInput: { width: 100 },
  previewDot: {
    width: 40, height: 40, borderRadius: 20,
    alignItems: 'center', justifyContent: 'center',
  },
  previewIcon: {
    fontFamily: typography.bodySemibold, fontSize: 13, color: colors.white,
  },

  colorGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  swatch: {
    width: 38, height: 38, borderRadius: 19,
    alignItems: 'center', justifyContent: 'center',
  },
  swatchSelected: { borderWidth: 3, borderColor: colors.ink },

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
