import { View, Text, StyleSheet } from 'react-native';

type Props = {
  icon: string;
  size?: number;
  selected?: boolean; // dark bg for AddExpenseSheet selection state
};

export function CategoryDot({ icon, size = 38, selected = false }: Props) {
  const r = size / 2;
  return (
    <View style={[
      styles.dot,
      { width: size, height: size, borderRadius: r },
      selected ? styles.dotSelected : styles.dotDefault,
    ]}>
      <Text style={{ fontSize: size * 0.47 }}>{icon}</Text>
      {/* Desaturation overlay */}
      <View style={[
        StyleSheet.absoluteFill,
        { borderRadius: r },
        selected ? styles.overlayDark : styles.overlayLight,
      ]} />
    </View>
  );
}

const styles = StyleSheet.create({
  dot: {
    alignItems: 'center', justifyContent: 'center', overflow: 'hidden', flexShrink: 0,
  },
  dotDefault:  { backgroundColor: '#E8E8E8' },
  dotSelected: { backgroundColor: '#1C1C1C' },
  overlayLight: { backgroundColor: 'rgba(232,232,232,0.52)' },
  overlayDark:  { backgroundColor: 'rgba(28,28,28,0.38)' },
});
