import { View, Text, StyleSheet } from 'react-native';
import { AlertTriangle, TrendingUp } from 'lucide-react-native';
import { colors, spacing, radius, typography } from '../lib/theme';

type BannerVariant = 'warning' | 'alert' | 'error';

type Props = {
  variant: BannerVariant;
  message: string;
};

const VARIANT_STYLES: Record<BannerVariant, { bg: string; text: string; icon: string }> = {
  warning: { bg: '#FDF6E3', text: colors.warning,  icon: colors.warning },
  alert:   { bg: '#FDF0E8', text: colors.alert,    icon: colors.alert },
  error:   { bg: '#FDECEB', text: colors.error,     icon: colors.error },
};

export function AlertBanner({ variant, message }: Props) {
  const s = VARIANT_STYLES[variant];
  const Icon = variant === 'warning' ? TrendingUp : AlertTriangle;

  return (
    <View style={[styles.banner, { backgroundColor: s.bg, borderLeftColor: s.icon }]}>
      <Icon size={15} color={s.icon} strokeWidth={2} style={styles.icon} />
      <Text style={[styles.text, { color: s.text }]}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: radius.md,
    borderLeftWidth: 3,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  icon: {
    flexShrink: 0,
  },
  text: {
    flex: 1,
    fontFamily: typography.bodyMedium,
    fontSize: typography.size.sm,
    lineHeight: 18,
  },
});
