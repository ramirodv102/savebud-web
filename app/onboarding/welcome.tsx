import { View, Text, StyleSheet, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { colors, spacing, radius, typography } from '../../lib/theme';

// Onboarding step 1 — built in Phase 1
export default function WelcomeScreen() {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.appName}>SaveBud</Text>
        <Text style={styles.headline}>Controlá tus gastos{'\n'}sin vueltas</Text>
        <Text style={styles.body}>
          Abrís la app, dos toques, y el gasto ya está guardado.
          Sin sincronización, sin cuentas, sin complicaciones.
        </Text>
      </View>

      <View style={styles.footer}>
        <Pressable
          style={styles.cta}
          onPress={() => router.push('/onboarding/payment-methods')}
        >
          <Text style={styles.ctaText}>Empezar</Text>
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
  content: {
    flex: 1,
    justifyContent: 'center',
    padding: spacing.xl,
    gap: spacing.lg,
  },
  appName: {
    fontFamily: typography.body,
    fontSize: typography.size.sm,
    color: colors.inkFaint,
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  headline: {
    fontFamily: typography.displayBold,
    fontSize: typography.size.hero,
    lineHeight: 56,
    color: colors.primary,
  },
  body: {
    fontFamily: typography.body,
    fontSize: typography.size.lg,
    color: colors.inkMuted,
    lineHeight: 26,
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
