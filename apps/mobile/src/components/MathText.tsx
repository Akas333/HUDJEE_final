import React from 'react';
import { Text, TextProps } from 'react-native';
import { typography } from '../theme/typography';

// A simple mock MathText component that just renders text for now.
// To render LaTeX on React Native, you would typically use a library like 'react-native-math-view'
// or a WebView-based Katex renderer.
export default function MathText({ style, children, ...props }: TextProps) {
  return (
    <Text style={[{ fontFamily: typography.regular, color: '#fff' }, style]} {...props}>
      {children}
    </Text>
  );
}
