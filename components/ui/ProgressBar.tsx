import { View, StyleSheet } from 'react-native';
import { colors, radius } from '../../lib/theme';

type Props = {
  value: number;        // 0–100
  color?: string;
  height?: number;
  backgroundColor?: string;
};

export function ProgressBar({
  value,
  color = colors.primary,
  height = 6,
  backgroundColor = colors.border,
}: Props) {
  const clamped = Math.min(100, Math.max(0, value));

  return (
    <View style={[styles.track, { height, backgroundColor, borderRadius: height / 2 }]}>
      <View
        style={[
          styles.fill,
          {
            width: `${clamped}%`,
            height,
            backgroundColor: color,
            borderRadius: height / 2,
          },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    width: '100%',
    overflow: 'hidden',
  },
  fill: {
    position: 'absolute',
    left: 0,
    top: 0,
  },
});
