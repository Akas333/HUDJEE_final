import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, NativeSyntheticEvent, NativeScrollEvent, LayoutChangeEvent } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors } from '../theme/colors';
import { typography } from '../theme/typography';

interface CarouselItem {
  title: string;
  subtitle: string;
}

interface CarouselCardProps {
  items: CarouselItem[];
}

export const CarouselCard: React.FC<CarouselCardProps> = ({ items }) => {
  const [activeIndex, setActiveIndex] = useState(0);
  const [cardWidth, setCardWidth] = useState(0);

  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    if (cardWidth === 0) return;
    const x = event.nativeEvent.contentOffset.x;
    const index = Math.round(x / cardWidth);
    setActiveIndex(index);
  };

  const handleLayout = (event: LayoutChangeEvent) => {
    setCardWidth(event.nativeEvent.layout.width);
  };

  return (
    <LinearGradient
      colors={[
        colors.hudjeeHeroStart || '#38BDF8', 
        colors.hudjeeHeroEnd || '#2563EB'
      ]}
      style={styles.container}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      onLayout={handleLayout}
    >
      <ScrollView
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        snapToInterval={cardWidth > 0 ? cardWidth : undefined}
        decelerationRate="fast"
        onMomentumScrollEnd={handleScroll}
        style={styles.scrollView}
      >
        {items.map((item, index) => (
          <View key={index} style={[styles.slide, { width: cardWidth > 0 ? cardWidth : '100%' }]}>
            <Text style={styles.title}>{item.title}</Text>
            <Text style={styles.subtitle}>{item.subtitle}</Text>
          </View>
        ))}
      </ScrollView>
      {items.length > 1 && (
        <View style={styles.pagination}>
          {items.map((_, index) => (
            <View
              key={index}
              style={[
                styles.dot,
                activeIndex === index ? styles.activeDot : styles.inactiveDot,
              ]}
            />
          ))}
        </View>
      )}
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: 24,
    height: 130,
    width: '100%',
    overflow: 'hidden',
  },
  scrollView: {
    flex: 1,
  },
  slide: {
    padding: 20,
    justifyContent: 'center',
  },
  title: {
    ...typography.hudjee.headingLg,
    color: colors.hudjeeTextPrimary || '#FFFFFF',
    marginBottom: 4,
  },
  subtitle: {
    ...typography.hudjee.body,
    color: colors.hudjeeTextPrimary || '#FFFFFF',
  },
  pagination: {
    position: 'absolute',
    bottom: 12,
    right: 20,
    flexDirection: 'row',
    gap: 6,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  activeDot: {
    backgroundColor: colors.hudjeeTextPrimary || '#FFFFFF',
  },
  inactiveDot: {
    backgroundColor: colors.hudjeeTextTertiary || 'rgba(255,255,255,0.4)',
  },
});
