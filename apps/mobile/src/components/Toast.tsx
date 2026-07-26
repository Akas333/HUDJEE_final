import React, { useEffect } from 'react';
import { StyleSheet, Text } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withSpring, withTiming, runOnJS } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CheckCircle2, XCircle, Info } from 'lucide-react-native';
import { useToastStore } from '../services/ToastService';
import { typography } from '../theme/typography';

export default function Toast() {
  const { visible, message, type, hideToast } = useToastStore();
  const insets = useSafeAreaInsets();
  const translateY = useSharedValue(-100);
  const opacity = useSharedValue(0);

  useEffect(() => {
    if (visible) {
      opacity.value = withTiming(1, { duration: 200 });
      translateY.value = withSpring(insets.top + 10, { damping: 15, stiffness: 200 });
    } else {
      opacity.value = withTiming(0, { duration: 200 });
      translateY.value = withTiming(-100, { duration: 300 });
    }
  }, [visible]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }]
  }));

  let Icon = Info;
  let color = '#fff';
  let bgColor = '#1E1E21';
  let borderColor = '#333';

  if (type === 'success') {
    Icon = CheckCircle2;
    color = '#34D399';
    bgColor = 'rgba(52, 211, 153, 0.1)';
    borderColor = 'rgba(52, 211, 153, 0.3)';
  } else if (type === 'error') {
    Icon = XCircle;
    color = '#FF6B6B';
    bgColor = 'rgba(255, 107, 107, 0.1)';
    borderColor = 'rgba(255, 107, 107, 0.3)';
  }

  return (
    <Animated.View 
      pointerEvents={visible ? 'auto' : 'none'}
      style={[styles.container, animatedStyle, { backgroundColor: bgColor, borderColor }]}
    >
      <Icon color={color} size={20} style={{ marginRight: 12 }} />
      <Text style={[styles.text, { color }]}>{message}</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 20,
    right: 20,
    zIndex: 9999,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
  },
  text: {
    fontFamily: typography.semiBold,
    fontSize: 15,
  }
});
