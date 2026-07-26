import React from 'react';
import { TouchableOpacityProps, StyleSheet, ViewStyle } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withTiming, Easing } from 'react-native-reanimated';
import { HapticService } from '../services/HapticService';
import { colors } from '../theme/colors';

type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'success' | 'outline' | 'ghost';

interface AnimatedButtonProps extends TouchableOpacityProps {
  children: React.ReactNode;
  variant?: ButtonVariant;
  hapticType?: 'light' | 'medium' | 'heavy' | 'success';
}

export default function AnimatedButton({ 
  children, 
  onPress, 
  style, 
  disabled, 
  variant = 'primary',
  hapticType = 'light', 
  ...props 
}: AnimatedButtonProps) {
  const isPressed = useSharedValue(0);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: isPressed.value * 4 }] // Push down by 4px
  }));

  // Border bottom shrinks (simulating 3D press)
  const innerAnimatedStyle = useAnimatedStyle(() => ({
    borderBottomWidth: disabled ? 2 : 5 - (isPressed.value * 3), // Compress border
    marginTop: isPressed.value * 3, // Keep the text centered visually while border shrinks
    paddingBottom: 16 - (isPressed.value * 3)
  }));

  const handlePressIn = () => {
    if (disabled) return;
    isPressed.value = withTiming(1, { duration: 50, easing: Easing.out(Easing.ease) });
  };

  const handlePressOut = () => {
    if (disabled) return;
    isPressed.value = withTiming(0, { duration: 100, easing: Easing.bounce });
  };

  const handlePress = (e: any) => {
    if (disabled) return;
    
    // Trigger Haptic
    if (hapticType === 'light') HapticService.light();
    else if (hapticType === 'medium') HapticService.medium();
    else if (hapticType === 'heavy') HapticService.heavy();
    else if (hapticType === 'success') HapticService.success();
    
    if (onPress) onPress(e);
  };

  const getVariantStyles = (): ViewStyle => {
    switch (variant) {
      case 'secondary':
        return { backgroundColor: colors.surfaceElevated, borderBottomColor: colors.border, borderWidth: 1, borderColor: colors.border };
      case 'danger':
        return { backgroundColor: colors.error, borderBottomColor: colors.errorDark };
      case 'success':
        return { backgroundColor: colors.success, borderBottomColor: colors.successDark };
      case 'outline':
        return { backgroundColor: 'transparent', borderBottomColor: colors.border, borderWidth: 2, borderColor: colors.border };
      case 'ghost':
        return { backgroundColor: 'transparent', borderBottomWidth: 0 };
      case 'primary':
      default:
        return { backgroundColor: colors.primary, borderBottomColor: colors.primaryDark };
    }
  };

  return (
    <Animated.View
      style={[
        styles.container,
        getVariantStyles(),
        style,
        disabled && styles.disabled,
        animatedStyle,
        variant !== 'ghost' && innerAnimatedStyle
      ]}
      onTouchStart={handlePressIn}
      onTouchEnd={handlePressOut}
      onTouchCancel={handlePressOut}
      onPointerDown={handlePressIn} // for web
      onPointerUp={handlePressOut}
      onStartShouldSetResponder={() => true}
      onResponderRelease={handlePress}
    >
      {children}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 16,
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 16,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  disabled: {
    opacity: 0.5,
  }
});
