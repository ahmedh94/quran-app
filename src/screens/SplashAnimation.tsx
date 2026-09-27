import React, { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  withDelay,
} from 'react-native-reanimated';
import { colors } from '../theme';

export default function SplashAnimation({ onFinish }: { onFinish: () => void }) {
  const scale = useSharedValue(0.6);
  const opacity = useSharedValue(0);
  const titleOpacity = useSharedValue(0);

  useEffect(() => {
    opacity.value = withTiming(1, { duration: 300 });
    scale.value = withSpring(1, { damping: 8, stiffness: 120, mass: 1 });
    titleOpacity.value = withDelay(400, withTiming(1, { duration: 500 }));

    const timer = setTimeout(onFinish, 1200);
    return () => clearTimeout(timer);
  }, []);

  const logoStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ scale: scale.value }],
  }));

  const titleStyle = useAnimatedStyle(() => ({
    opacity: titleOpacity.value,
  }));

  return (
    <View style={styles.container}>
      <Animated.Image
        source={require('../../assets/splash-icon.png')}
        style={[styles.logo, logoStyle]}
      />
      <Animated.Text style={[styles.title, titleStyle]}>حلقتي</Animated.Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.pinkLight, alignItems: 'center', justifyContent: 'center' },
  logo: { width: 150, height: 150, borderRadius: 75 },
  title: { marginTop: 20, fontWeight: '800', fontSize: 20, color: colors.pinkDark },
});
