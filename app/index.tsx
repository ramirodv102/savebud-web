import { Redirect } from 'expo-router';
import { useAppStore } from '../store/useAppStore';

// Entry point — redirects based on whether onboarding has been completed.
// The root _layout.tsx holds the splash screen until hydration is done,
// so by the time this renders, settings.onboardingComplete is already correct.
export default function Index() {
  // Separate selectors avoid returning a new object on every render (infinite loop with React 19 + Zustand)
  const hydrated = useAppStore((s) => s.hydrated);
  const onboardingComplete = useAppStore((s) => s.settings.onboardingComplete);

  if (!hydrated) {
    return null;
  }

  if (!onboardingComplete) {
    return <Redirect href="/entry" />;
  }

  return <Redirect href="/(tabs)" />;
}
