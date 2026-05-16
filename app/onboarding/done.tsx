import { View, Text, StyleSheet, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useAppStore } from '../../store/useAppStore';
import { colors, spacing, radius, typography } from '../../lib/theme';

// Onboarding step 5 — built in Phase 1
export default function DoneScreen() {
  const updateSettings = useAppStore((s) => s.updateSettings);

  async function finish() {
    await updateSettings({ onboardingComplete: true });
    router.replace('/(tabs)');
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.emoji}>🎉</Text>
        <Text style={styles.title}>¡Listo!</Text>
        <Text style={styles.subtitle}>Ya podés empezar a registrar tus gastos.</Text>
      </View>

      <View style={styles.footer}>
        <Pressable style={styles.cta} onPress={finish}>
          <Text style={styles.ctaText}>Ir al inicio</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
    gap: spacing.md,
  },
  emoji: {
    fontSize: 56,
  },
  title: {
    fontFamily: typography.displayBold,
    fontSize: typography.size.xxl,
    color: colors.primary,
  },
  subtitle: {
    fontFamily: typography.body,
    fontSize: typography.size.lg,
    color: colors.inkMuted,
    textAlign: 'center',
  },
  footer: {
    padding: spacing.xl,
  },
  cta: {
    backgroundColor: colors.primary,
    borderRadius: radius.full,
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  ctaText: {
    fontFamily: typography.bodySemibold,
    fontSize: typography.size.lg,
    color: colors.white,
  },
});
