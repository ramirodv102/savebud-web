import { useRef, useState } from 'react';
import {
  View, Text, StyleSheet, Pressable,
  ScrollView, useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useAppStore } from '../store/useAppStore';
import { colors, spacing, radius, typography } from '../lib/theme';

// ── Slides data ───────────────────────────────────────────────────────────────

const SLIDES = [
  {
    emoji: '⚡',
    title: 'Cargá en segundos',
    body: 'Sumá un gasto con dos toques: monto, medio de pago y categoría.',
  },
  {
    emoji: '📊',
    title: 'Mirá en qué se te va',
    body: 'Vas a ver al toque cuánto gastaste este mes y en qué.',
  },
  {
    emoji: '🎯',
    title: 'Sabé si vas bien',
    body: 'Te avisamos si te estás pasando del presupuesto o gastando muy rápido.',
  },
];

// ── Component ─────────────────────────────────────────────────────────────────

export default function TutorialScreen() {
  const { width } = useWindowDimensions();
  const updateSettings   = useAppStore((s) => s.updateSettings);
  const onboardingComplete = useAppStore((s) => s.settings.onboardingComplete);
  const scrollRef        = useRef<ScrollView>(null);
  const [current, setCurrent] = useState(0);

  const isLast = current === SLIDES.length - 1;

  function destination() {
    return onboardingComplete ? '/(tabs)' : '/onboarding/payment-methods';
  }

  async function finish() {
    await updateSettings({ tutorialSeen: true });
    router.replace(destination() as any);
  }

  function handleNext() {
    if (isLast) {
      finish();
    } else {
      const next = current + 1;
      scrollRef.current?.scrollTo({ x: next * width, animated: true });
      setCurrent(next);
    }
  }

  return (
    <SafeAreaView style={styles.container}>

      {/* ── Skip button ──────────────────────────────────────────────── */}
      <View style={styles.topBar}>
        <View />
        <Pressable onPress={finish} hitSlop={12}>
          <Text style={styles.skipText}>Saltar</Text>
        </Pressable>
      </View>

      {/* ── Slides ───────────────────────────────────────────────────── */}
      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        scrollEventThrottle={16}
        onMomentumScrollEnd={(e) => {
          const idx = Math.round(e.nativeEvent.contentOffset.x / width);
          setCurrent(idx);
        }}
        style={{ flex: 1 }}
      >
        {SLIDES.map((slide, i) => (
          <View key={i} style={[styles.slide, { width }]}>
            <View style={styles.emojiCircle}>
              <Text style={styles.emoji}>{slide.emoji}</Text>
            </View>
            <Text style={styles.slideTitle}>{slide.title}</Text>
            <Text style={styles.slideBody}>{slide.body}</Text>
          </View>
        ))}
      </ScrollView>

      {/* ── Dots + button ────────────────────────────────────────────── */}
      <View style={styles.footer}>
        <View style={styles.dots}>
          {SLIDES.map((_, i) => (
            <View
              key={i}
              style={[styles.dot, i === current ? styles.dotActive : styles.dotInactive]}
            />
          ))}
        </View>

        <Pressable
          style={({ pressed }) => [styles.nextBtn, pressed && styles.nextBtnPressed]}
          onPress={handleNext}
        >
          <Text style={styles.nextBtnText}>
            {isLast ? 'Empezar' : 'Siguiente'}
          </Text>
        </Pressable>
      </View>

    </SafeAreaView>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1, backgroundColor: colors.background,
  },

  topBar: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm, paddingBottom: spacing.xs,
  },
  skipText: {
    fontFamily: typography.bodyMedium,
    fontSize: typography.size.sm, color: colors.inkMuted,
  },

  slide: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: spacing.xl, gap: spacing.lg,
  },
  emojiCircle: {
    width: 120, height: 120, borderRadius: 60,
    backgroundColor: colors.primary + '14',
    alignItems: 'center', justifyContent: 'center',
    marginBottom: spacing.md,
  },
  emoji: { fontSize: 56 },
  slideTitle: {
    fontFamily: typography.displayBold,
    fontSize: typography.size.xxl,
    color: colors.ink,
    textAlign: 'center',
  },
  slideBody: {
    fontFamily: typography.body,
    fontSize: typography.size.md,
    color: colors.inkMuted,
    textAlign: 'center',
    lineHeight: 24,
  },

  footer: {
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.xl,
    gap: spacing.lg,
    alignItems: 'center',
  },
  dots: {
    flexDirection: 'row', gap: 8,
  },
  dot: {
    height: 8, borderRadius: 4,
  },
  dotActive: {
    width: 24, backgroundColor: colors.primary,
  },
  dotInactive: {
    width: 8, backgroundColor: colors.border,
  },
  nextBtn: {
    backgroundColor: colors.primary,
    borderRadius: radius.full,
    paddingVertical: spacing.md + 2,
    alignItems: 'center',
    width: '100%',
  },
  nextBtnPressed: { opacity: 0.85 },
  nextBtnText: {
    fontFamily: typography.bodySemibold,
    fontSize: typography.size.lg, color: colors.white,
  },
});
