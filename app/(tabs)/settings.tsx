import { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Pressable,
  Modal, TextInput, Alert, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Plus, ChevronRight, Download, Upload, Trash2 } from 'lucide-react-native';
import { useAppStore } from '../../store/useAppStore';
import { formatARS } from '../../lib/format';
import { exportData, importData } from '../../lib/backup';
import { CategorySheet } from '../../components/CategorySheet';
import { PaymentMethodSheet } from '../../components/PaymentMethodSheet';
import { colors, spacing, radius, typography, shadows } from '../../lib/theme';
import type { Category, PaymentMethod } from '../../types';

// ── Budget edit modal ─────────────────────────────────────────────────────────

function formatDisplay(digits: string): string {
  if (!digits) return '';
  const n = parseInt(digits, 10);
  return isNaN(n) ? '' : new Intl.NumberFormat('es-AR').format(n);
}

function BudgetModal({
  visible,
  current,
  onClose,
}: {
  visible: boolean;
  current: number;
  onClose: () => void;
}) {
  const updateSettings = useAppStore((s) => s.updateSettings);
  const [digits, setDigits] = useState(current > 0 ? String(current) : '');

  function handleChange(text: string) {
    const d = text.replace(/\D/g, '');
    if (parseInt(d || '0', 10) <= 100_000_000) setDigits(d);
  }

  async function handleSave() {
    await updateSettings({ totalMonthlyBudget: digits ? parseInt(digits, 10) : 0 });
    onClose();
  }

  return (
    <Modal transparent visible={visible} animationType="fade" onRequestClose={onClose} statusBarTranslucent>
      <Pressable style={bStyles.overlay} onPress={onClose}>
        <Pressable style={bStyles.card} onPress={() => {}}>
          <Text style={bStyles.title}>Presupuesto mensual</Text>
          <Text style={bStyles.subtitle}>Dejá vacío para no tener límite global.</Text>
          <View style={bStyles.inputRow}>
            <Text style={[bStyles.symbol, !!digits && bStyles.symbolFilled]}>$</Text>
            <TextInput
              style={bStyles.input}
              value={formatDisplay(digits)}
              onChangeText={handleChange}
              keyboardType="numeric"
              placeholder="0"
              placeholderTextColor={colors.border}
              autoFocus
              selectionColor={colors.primary}
              returnKeyType="done"
              onSubmitEditing={handleSave}
            />
            {!!digits && <Text style={bStyles.perMonth}>/mes</Text>}
          </View>
          <View style={bStyles.actions}>
            <Pressable style={bStyles.cancelBtn} onPress={onClose}>
              <Text style={bStyles.cancelText}>Cancelar</Text>
            </Pressable>
            <Pressable style={bStyles.saveBtn} onPress={handleSave}>
              <Text style={bStyles.saveText}>Guardar</Text>
            </Pressable>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const bStyles = StyleSheet.create({
  overlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center', alignItems: 'center', padding: spacing.xl,
  },
  card: {
    backgroundColor: colors.background, borderRadius: radius.xl,
    padding: spacing.xl, width: '100%', gap: spacing.sm, ...shadows.md,
  },
  title: { fontFamily: typography.displayBold, fontSize: typography.size.xl, color: colors.ink },
  subtitle: { fontFamily: typography.body, fontSize: typography.size.sm, color: colors.inkMuted },
  inputRow: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: spacing.md },
  symbol: { fontFamily: typography.display, fontSize: 32, color: colors.border },
  symbolFilled: { color: colors.inkMuted },
  input: {
    fontFamily: typography.displayBold, fontSize: 36,
    color: colors.ink, flex: 1, padding: 0,
  },
  perMonth: { fontFamily: typography.body, fontSize: typography.size.sm, color: colors.inkFaint },
  actions: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm },
  cancelBtn: {
    flex: 1, paddingVertical: spacing.md, alignItems: 'center',
    borderRadius: radius.full, borderWidth: 1, borderColor: colors.border,
  },
  cancelText: { fontFamily: typography.bodyMedium, fontSize: typography.size.md, color: colors.inkMuted },
  saveBtn: {
    flex: 1, paddingVertical: spacing.md, alignItems: 'center',
    borderRadius: radius.full, backgroundColor: colors.primary,
  },
  saveText: { fontFamily: typography.bodySemibold, fontSize: typography.size.md, color: colors.white },
});

// ── Screen ────────────────────────────────────────────────────────────────────

export default function SettingsScreen() {
  const categories     = useAppStore((s) => s.categories);
  const paymentMethods = useAppStore((s) => s.paymentMethods);
  const settings       = useAppStore((s) => s.settings);
  const rehydrate      = useAppStore((s) => s.rehydrate);
  const clearAllData   = useAppStore((s) => s.clearAllData);

  const [budgetVisible,  setBudgetVisible]  = useState(false);
  const [catSheetOpen,   setCatSheetOpen]   = useState(false);
  const [editingCat,     setEditingCat]     = useState<Category | null>(null);
  const [pmSheetOpen,    setPmSheetOpen]    = useState(false);
  const [editingPm,      setEditingPm]      = useState<PaymentMethod | null>(null);

  const activeCats    = categories.filter((c) => !c.archived);
  const archivedCats  = categories.filter((c) => c.archived);
  const activePms     = paymentMethods.filter((m) => !m.archived);
  const archivedPms   = paymentMethods.filter((m) => m.archived);

  function openAddCategory() {
    setEditingCat(null);
    setCatSheetOpen(true);
  }

  function openEditCategory(cat: Category) {
    setEditingCat(cat);
    setCatSheetOpen(true);
  }

  function openAddMethod() {
    setEditingPm(null);
    setPmSheetOpen(true);
  }

  function openEditMethod(pm: PaymentMethod) {
    setEditingPm(pm);
    setPmSheetOpen(true);
  }

  async function handleExport() {
    try {
      await exportData();
    } catch {
      Alert.alert('Error', 'No se pudo exportar la data.');
    }
  }

  async function handleImport() {
    try {
      const count = await importData();
      if (count === -1) return;
      await rehydrate();
      if (count === 0) {
        Alert.alert('Sin datos', 'No se encontraron gastos válidos en el archivo.');
      } else {
        Alert.alert('Importación exitosa', `Se importaron ${count} gasto${count !== 1 ? 's' : ''}.`);
      }
    } catch (e) {
      Alert.alert('Error', e instanceof Error ? e.message : 'El archivo no es válido.');
    }
  }

  function handleClearAll() {
    Alert.alert(
      'Borrar todo',
      'Se van a eliminar todos tus gastos, categorías y medios de pago. Esta acción no se puede deshacer.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Borrar todo',
          style: 'destructive',
          onPress: async () => {
            await clearAllData();
          },
        },
      ],
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <Text style={styles.heading}>Ajustes</Text>

        {/* ── Presupuesto ───────────────────────────────────────────────── */}
        <Text style={styles.sectionLabel}>Presupuesto</Text>
        <View style={[styles.card, shadows.sm]}>
          <Pressable
            style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
            onPress={() => setBudgetVisible(true)}
          >
            <Text style={styles.rowLabel}>Presupuesto mensual</Text>
            <View style={styles.rowRight}>
              <Text style={styles.rowValue}>
                {settings.totalMonthlyBudget > 0
                  ? formatARS(settings.totalMonthlyBudget)
                  : 'Sin límite'}
              </Text>
              <ChevronRight size={16} color={colors.inkFaint} strokeWidth={2} />
            </View>
          </Pressable>
        </View>

        {/* ── Categorías ───────────────────────────────────────────────── */}
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionLabel}>Categorías</Text>
          <Pressable onPress={openAddCategory} hitSlop={10}>
            <Plus size={18} color={colors.primary} strokeWidth={2.5} />
          </Pressable>
        </View>
        <View style={[styles.card, shadows.sm]}>
          {activeCats.map((cat) => (
            <Pressable
              key={cat.id}
              style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
              onPress={() => openEditCategory(cat)}
            >
              <View style={[styles.dot, { backgroundColor: cat.color }]}>
                <Text style={styles.dotEmoji}>{cat.icon}</Text>
              </View>
              <Text style={styles.rowLabel}>{cat.name}</Text>
              <View style={styles.rowRight}>
                {cat.monthlyBudget
                  ? <Text style={styles.rowValue}>{formatARS(cat.monthlyBudget)}/mes</Text>
                  : <Text style={styles.rowMuted}>Sin límite</Text>
                }
                <ChevronRight size={16} color={colors.inkFaint} strokeWidth={2} />
              </View>
            </Pressable>
          ))}
          {activeCats.length === 0 && (
            <View style={styles.emptyRow}>
              <Text style={styles.emptyText}>Sin categorías — tocá + para agregar</Text>
            </View>
          )}
          {archivedCats.map((cat) => (
            <Pressable
              key={cat.id}
              style={({ pressed }) => [styles.row, styles.archivedRow, pressed && styles.rowPressed]}
              onPress={() => openEditCategory(cat)}
            >
              <View style={[styles.dot, { backgroundColor: cat.color, opacity: 0.5 }]}>
                <Text style={styles.dotEmoji}>{cat.icon}</Text>
              </View>
              <Text style={[styles.rowLabel, styles.archivedText]}>{cat.name}</Text>
              <View style={styles.rowRight}>
                <Text style={styles.archivedBadge}>archivada</Text>
                <ChevronRight size={16} color={colors.border} strokeWidth={2} />
              </View>
            </Pressable>
          ))}
        </View>

        {/* ── Medios de pago ───────────────────────────────────────────── */}
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionLabel}>Medios de pago</Text>
          <Pressable onPress={openAddMethod} hitSlop={10}>
            <Plus size={18} color={colors.primary} strokeWidth={2.5} />
          </Pressable>
        </View>
        <View style={[styles.card, shadows.sm]}>
          {activePms.map((pm) => {
            const shortIcon = pm.icon.length > 4 ? pm.icon.slice(0, 2) : pm.icon;
            return (
              <Pressable
                key={pm.id}
                style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
                onPress={() => openEditMethod(pm)}
              >
                <View style={[styles.dot, { backgroundColor: pm.color }]}>
                  <Text style={styles.dotText}>{shortIcon}</Text>
                </View>
                <Text style={styles.rowLabel}>{pm.name}</Text>
                <View style={styles.rowRight}>
                  <ChevronRight size={16} color={colors.inkFaint} strokeWidth={2} />
                </View>
              </Pressable>
            );
          })}
          {activePms.length === 0 && (
            <View style={styles.emptyRow}>
              <Text style={styles.emptyText}>Sin medios de pago — tocá + para agregar</Text>
            </View>
          )}
          {archivedPms.map((pm) => {
            const shortIcon = pm.icon.length > 4 ? pm.icon.slice(0, 2) : pm.icon;
            return (
              <Pressable
                key={pm.id}
                style={({ pressed }) => [styles.row, styles.archivedRow, pressed && styles.rowPressed]}
                onPress={() => openEditMethod(pm)}
              >
                <View style={[styles.dot, { backgroundColor: pm.color, opacity: 0.5 }]}>
                  <Text style={styles.dotText}>{shortIcon}</Text>
                </View>
                <Text style={[styles.rowLabel, styles.archivedText]}>{pm.name}</Text>
                <View style={styles.rowRight}>
                  <Text style={styles.archivedBadge}>archivado</Text>
                  <ChevronRight size={16} color={colors.border} strokeWidth={2} />
                </View>
              </Pressable>
            );
          })}
        </View>

        {/* ── Datos ────────────────────────────────────────────────────── */}
        <Text style={styles.sectionLabel}>Datos</Text>
        <View style={[styles.card, shadows.sm]}>
          <Pressable
            style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
            onPress={handleExport}
          >
            <Download size={18} color={colors.primary} strokeWidth={2} />
            <Text style={styles.rowLabel}>Exportar datos</Text>
          </Pressable>
          <Pressable
            style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
            onPress={handleImport}
          >
            <Upload size={18} color={colors.primary} strokeWidth={2} />
            <Text style={styles.rowLabel}>Importar datos</Text>
          </Pressable>
          <Pressable
            style={({ pressed }) => [styles.row, styles.lastRow, pressed && styles.rowPressed]}
            onPress={handleClearAll}
          >
            <Trash2 size={18} color={colors.error} strokeWidth={2} />
            <Text style={[styles.rowLabel, { color: colors.error }]}>Borrar todo</Text>
          </Pressable>
        </View>

        <View style={{ height: 80 }} />
      </ScrollView>

      <BudgetModal
        visible={budgetVisible}
        current={settings.totalMonthlyBudget}
        onClose={() => setBudgetVisible(false)}
      />
      <CategorySheet
        visible={catSheetOpen}
        category={editingCat}
        onClose={() => setCatSheetOpen(false)}
      />
      <PaymentMethodSheet
        visible={pmSheetOpen}
        method={editingPm}
        onClose={() => setPmSheetOpen(false)}
      />
    </SafeAreaView>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  scroll: { paddingHorizontal: spacing.lg, paddingTop: spacing.md },

  heading: {
    fontFamily: typography.displayBold,
    fontSize: typography.size.xxl,
    color: colors.ink,
    marginBottom: spacing.xl,
  },

  sectionHeaderRow: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', marginBottom: spacing.sm, marginTop: spacing.lg,
  },
  sectionLabel: {
    fontFamily: typography.bodySemibold, fontSize: typography.size.xs,
    color: colors.inkMuted, textTransform: 'uppercase',
    letterSpacing: 0.7, marginBottom: spacing.sm, marginTop: spacing.lg,
  },

  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg, overflow: 'hidden',
  },
  row: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: spacing.md, paddingHorizontal: spacing.md,
    borderBottomWidth: 1, borderBottomColor: colors.border,
    gap: spacing.sm,
  },
  lastRow: { borderBottomWidth: 0 },
  rowPressed: { backgroundColor: colors.surfaceAlt },
  archivedRow: { opacity: 0.6 },

  rowLabel: {
    flex: 1, fontFamily: typography.bodyMedium,
    fontSize: typography.size.md, color: colors.ink,
  },
  rowRight: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  rowValue: {
    fontFamily: typography.body, fontSize: typography.size.sm, color: colors.inkMuted,
  },
  rowMuted: {
    fontFamily: typography.body, fontSize: typography.size.sm, color: colors.inkFaint,
  },
  archivedText: { color: colors.inkMuted },
  archivedBadge: {
    fontFamily: typography.body, fontSize: typography.size.xs,
    color: colors.inkFaint, backgroundColor: colors.surfaceAlt,
    borderRadius: radius.sm, paddingHorizontal: 6, paddingVertical: 2,
  },

  dot: {
    width: 32, height: 32, borderRadius: 16,
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  dotEmoji: { fontSize: 16 },
  dotText: { fontFamily: typography.bodySemibold, fontSize: 11, color: colors.white },

  emptyRow: { padding: spacing.md },
  emptyText: {
    fontFamily: typography.body, fontSize: typography.size.sm, color: colors.inkFaint,
    textAlign: 'center',
  },
});
