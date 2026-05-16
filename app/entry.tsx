import { useState } from 'react';
import { View, Text, StyleSheet, Pressable, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { colors, spacing, radius, typography, shadows } from '../lib/theme';

export default function EntryScreen() {
  const [loginModal, setLoginModal] = useState(false);

  function goGuest() {
    router.push('/tutorial');
  }

  return (
    <SafeAreaView style={styles.container}>

      {/* ── Logo ─────────────────────────────────────────────────────── */}
      <View style={styles.logoArea}>
        <View style={styles.iconCircle}>
          <Text style={styles.iconEmoji}>💰</Text>
        </View>
        <Text style={styles.appName}>SaveBud</Text>
        <Text style={styles.tagline}>Controlá tus gastos sin vueltas</Text>
      </View>

      {/* ── Buttons ──────────────────────────────────────────────────── */}
      <View style={styles.buttons}>
        <Pressable
          style={({ pressed }) => [styles.secondaryBtn, pressed && styles.pressed]}
          onPress={() => setLoginModal(true)}
        >
          <Text style={styles.secondaryBtnText}>Iniciar sesión</Text>
        </Pressable>

        <Pressable
          style={({ pressed }) => [styles.primaryBtn, pressed && styles.pressed]}
          onPress={goGuest}
        >
          <Text style={styles.primaryBtnText}>Empezar como invitado</Text>
        </Pressable>
      </View>

      {/* ── Footer ───────────────────────────────────────────────────── */}
      <View style={styles.footer}>
        <Text style={styles.footerText}>
          Tus datos se guardan solo en tu dispositivo.
        </Text>
      </View>

      {/* ── "Próximamente" modal ──────────────────────────────────────── */}
      <Modal
        transparent
        visible={loginModal}
        animationType="fade"
        onRequestClose={() => setLoginModal(false)}
        statusBarTranslucent
      >
        <Pressable style={styles.modalOverlay} onPress={() => setLoginModal(false)}>
          <Pressable style={styles.modalCard} onPress={() => {}}>
            <Text style={styles.modalTitle}>Próximamente</Text>
            <Text style={styles.modalBody}>
              El inicio de sesión va a estar disponible próximamente.
              Por ahora podés usar la app como invitado y todos tus datos
              se guardan en tu dispositivo.
            </Text>
            <Pressable
              style={styles.modalBtn}
              onPress={() => { setLoginModal(false); goGuest(); }}
            >
              <Text style={styles.modalBtnText}>Continuar como invitado</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1, backgroundColor: colors.background,
    justifyContent: 'space-between',
  },

  logoArea: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    gap: spacing.sm, paddingHorizontal: spacing.xl,
  },
  iconCircle: {
    width: 88, height: 88, borderRadius: 44,
    backgroundColor: colors.primary + '18',
    alignItems: 'center', justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  iconEmoji: { fontSize: 42 },
  appName: {
    fontFamily: typography.displayBold,
    fontSize: 40,
    color: colors.ink,
    letterSpacing: -0.5,
  },
  tagline: {
    fontFamily: typography.body,
    fontSize: typography.size.md,
    color: colors.inkMuted,
    textAlign: 'center',
    lineHeight: 22,
  },

  buttons: {
    paddingHorizontal: spacing.xl,
    gap: spacing.sm,
    paddingBottom: spacing.lg,
  },
  primaryBtn: {
    backgroundColor: colors.primary,
    borderRadius: radius.full,
    paddingVertical: spacing.md + 2,
    alignItems: 'center',
    ...shadows.sm,
  },
  primaryBtnText: {
    fontFamily: typography.bodySemibold,
    fontSize: typography.size.lg,
    color: colors.white,
  },
  secondaryBtn: {
    borderRadius: radius.full,
    paddingVertical: spacing.md + 2,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  secondaryBtnText: {
    fontFamily: typography.bodySemibold,
    fontSize: typography.size.lg,
    color: colors.ink,
  },
  pressed: { opacity: 0.7 },

  footer: {
    paddingBottom: spacing.xl,
    alignItems: 'center',
  },
  footerText: {
    fontFamily: typography.body,
    fontSize: typography.size.xs,
    color: colors.inkFaint,
    textAlign: 'center',
  },

  // Modal
  modalOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center', alignItems: 'center',
    padding: spacing.xl,
  },
  modalCard: {
    backgroundColor: colors.background,
    borderRadius: 24, padding: spacing.xl,
    width: '100%', gap: spacing.md, ...shadows.md,
  },
  modalTitle: {
    fontFamily: typography.displayBold,
    fontSize: typography.size.xl, color: colors.ink,
  },
  modalBody: {
    fontFamily: typography.body,
    fontSize: typography.size.md, color: colors.inkMuted,
    lineHeight: 22,
  },
  modalBtn: {
    backgroundColor: colors.primary,
    borderRadius: radius.full,
    paddingVertical: spacing.md,
    alignItems: 'center',
    marginTop: spacing.xs,
  },
  modalBtnText: {
    fontFamily: typography.bodySemibold,
    fontSize: typography.size.md, color: colors.white,
  },
});
