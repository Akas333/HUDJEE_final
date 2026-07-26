import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Animated as RNAnimated,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Bell, Footprints, Target, ClipboardList } from 'lucide-react-native';
import Svg, { Path } from 'react-native-svg';
import { GestureDetector, Gesture } from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  interpolate,
  Extrapolation,
} from 'react-native-reanimated';

const { width } = Dimensions.get('window');
const CONTAINER_WIDTH = width - 40;

// ─── SVG Icons ─────────────────────────────────────────────────────────────
const FourPointStar = ({ size = 80, color = '#000000' }) => (
  <Svg width={size} height={size} viewBox="0 0 100 100" fill="none">
    <Path
      d="M50 0C50 0 55 45 100 50C100 50 55 55 50 100C50 100 45 55 0 50C0 50 45 45 50 0Z"
      fill={color}
    />
  </Svg>
);

const ZapSvg = ({ size = 80, color = '#000000' }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
    <Path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
  </Svg>
);

const TargetSvg = ({ size = 80, color = '#000000' }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={3} strokeLinecap="round" strokeLinejoin="round">
    <Path d="M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20z" />
    <Path d="M12 16a4 4 0 1 0 0-8 4 4 0 0 0 0 8z" />
    <Path d="M12 12h.01" />
  </Svg>
);

const CARDS_DATA = [
  { id: '1', title: 'Consistency', colors: ['#F3F4F6', '#9CA3AF'], icon: <FourPointStar size={110} color="#111827" /> },
  { id: '2', title: 'Speed', colors: ['#86EFAC', '#4ADE80'], icon: <ZapSvg size={90} color="#064E3B" /> },
  { id: '3', title: 'Accuracy', colors: ['#E78693', '#F43F5E'], icon: <TargetSvg size={90} color="#4C0519" /> },
];

const TOTAL_CARDS = CARDS_DATA.length;
const SWIPE_THRESHOLD = width * 0.25;

// ─── Swipeable Card Component ────────────────────────────────────────────────
const SwipeableCard = ({ card, index, activeIndex, dragX, dragY }) => {
  const animatedStyle = useAnimatedStyle(() => {
    const relativeIndex = (index - activeIndex.value) % TOTAL_CARDS;
    const wrappedIndex = (relativeIndex + TOTAL_CARDS) % TOTAL_CARDS;
    
    const isFront = wrappedIndex === 0;

    // Scale and translate layout parameters to prevent layout pass collapses
    const targetScale = wrappedIndex === 0 ? 1 : wrappedIndex === 1 ? 0.94 : 0.88;
    const targetTranslateX = wrappedIndex === 0 ? 0 : wrappedIndex === 1 ? CONTAINER_WIDTH * 0.15 : CONTAINER_WIDTH * 0.28;
    const targetTranslateY = wrappedIndex === 0 ? 0 : wrappedIndex === 1 ? 8 : 16;
    const targetZIndex = 3 - wrappedIndex;

    // Apply drag translations ONLY to the front card
    const currentTranslateX = isFront ? dragX.value : withSpring(targetTranslateX, { damping: 18, stiffness: 100 });
    const currentTranslateY = isFront ? dragY.value : withSpring(targetTranslateY, { damping: 18, stiffness: 100 });
    const scale = withSpring(targetScale, { damping: 18, stiffness: 100 });
    const rotate = isFront ? interpolate(dragX.value, [-width, 0, width], [-10, 0, 10], Extrapolation.CLAMP) : 0;

    // Fade in card when it goes to the back
    const opacity = wrappedIndex === 2 ? withTiming(1, { duration: 300 }) : 1;

    return {
      position: 'absolute',
      zIndex: targetZIndex,
      opacity,
      transform: [
        { translateX: currentTranslateX },
        { translateY: currentTranslateY },
        { scale },
        { rotate: `${rotate}deg` }
      ]
    };
  });

  const contentStyle = useAnimatedStyle(() => {
    const relativeIndex = (index - activeIndex.value) % TOTAL_CARDS;
    const wrappedIndex = (relativeIndex + TOTAL_CARDS) % TOTAL_CARDS;
    const isFront = wrappedIndex === 0;
    
    return {
      opacity: withTiming(isFront ? 1 : 0, { duration: 200 })
    };
  });

  return (
    <Animated.View style={[styles.cardWrapper, animatedStyle]}>
      <LinearGradient
        colors={card.colors}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.cardSurface}
      >
        <Animated.View style={contentStyle}>
          <Text style={styles.silverCardTitle}>{card.title}</Text>
        </Animated.View>
        <View style={styles.starWrapper}>
          {card.icon}
        </View>
      </LinearGradient>
    </Animated.View>
  );
};

// ─── Main Dashboard ──────────────────────────────────────────────────────────
export default function DashboardScreen({ navigation }: any) {
  const fadeAnim = useRef(new RNAnimated.Value(0)).current;
  const activeIndex = useSharedValue(0);
  const dragX = useSharedValue(0);
  const dragY = useSharedValue(0);

  useEffect(() => {
    RNAnimated.timing(fadeAnim, { toValue: 1, duration: 600, useNativeDriver: true }).start();
  }, []);

  const panGesture = Gesture.Pan()
    .onUpdate((event) => {
      dragX.value = event.translationX;
      dragY.value = event.translationY;
    })
    .onEnd((event) => {
      if (Math.abs(event.translationX) > SWIPE_THRESHOLD) {
        dragX.value = withTiming(Math.sign(event.translationX) * width, { duration: 200 }, () => {
          activeIndex.value = activeIndex.value + 1;
          dragX.value = 0;
          dragY.value = 0;
        });
      } else {
        dragX.value = withSpring(0, { damping: 16 });
        dragY.value = withSpring(0, { damping: 16 });
      }
    });

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.contentPadding}
        showsVerticalScrollIndicator={false}
      >
        <RNAnimated.View style={[styles.header, { opacity: fadeAnim }]}>
          <Image source={require('../../assets/logo.png')} style={styles.logoImage} resizeMode="contain" />
          <TouchableOpacity style={styles.iconButton}>
            <Bell color="#9CA3AF" size={22} strokeWidth={2} />
          </TouchableOpacity>
        </RNAnimated.View>

        <RNAnimated.View style={[styles.scoreCard, { opacity: fadeAnim }]}>
          <View style={styles.scoreHeader}>
            <View>
              <Text style={styles.scoreHudjeeText}>HudJee</Text>
              <Text style={styles.scoreTitle}>Performance Score</Text>
            </View>
            <View style={styles.footprintsWrapper}>
              <Footprints color="#333333" size={54} strokeWidth={1} style={{ transform: [{ rotate: '-10deg' }] }} />
            </View>
          </View>
          <View style={styles.scoreBottom}>
            <Text style={styles.scoreValueText}>17/100</Text>
            <View style={styles.scoreTrack}>
              <LinearGradient colors={['#A7F3D0', '#38BDF8']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={[styles.scoreFill, { width: '30%' }]} />
            </View>
          </View>
        </RNAnimated.View>

        <RNAnimated.View style={[styles.section, { opacity: fadeAnim }]}>
          <Text style={styles.sectionTitle}>Top Areas you can improve</Text>
          <GestureDetector gesture={panGesture}>
            <View style={styles.stackedContainer}>
              {CARDS_DATA.map((card, index) => (
                <SwipeableCard key={card.id} card={card} index={index} activeIndex={activeIndex} dragX={dragX} dragY={dragY} />
              ))}
            </View>
          </GestureDetector>
        </RNAnimated.View>

        <RNAnimated.View style={[styles.gridContainer, { opacity: fadeAnim }]}>
          <View style={styles.gridCard}>
            <View style={styles.gridCardBgIcon}><Target color="#374151" size={110} strokeWidth={1.5} opacity={0.3} /></View>
            <Text style={styles.gridCardTitle}>Success{'\n'}Index</Text>
            <View style={styles.gridCardBottom}>
              <Text style={styles.gridCardValue}>17/100</Text>
              <View style={styles.gridCardTrack}><View style={[styles.gridCardFill, { width: '30%' }]} /></View>
            </View>
          </View>
          <View style={styles.gridCard}>
            <View style={styles.gridCardBgIcon}><ClipboardList color="#374151" size={100} strokeWidth={1.5} opacity={0.3} /></View>
            <Text style={styles.gridCardTitle}>Syllabus{'\n'}Completion</Text>
            <View style={styles.gridCardBottom}>
              <Text style={styles.gridCardValue}>17/100</Text>
              <View style={styles.gridCardTrack}><View style={[styles.gridCardFill, { width: '30%' }]} /></View>
            </View>
          </View>
        </RNAnimated.View>

        <RNAnimated.View style={[styles.section, { opacity: fadeAnim }]}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>Continue Learning</Text>
            <TouchableOpacity><Text style={styles.viewAllText}>View All</Text></TouchableOpacity>
          </View>
          <TouchableOpacity style={styles.continueCard} activeOpacity={0.8} onPress={() => navigation.navigate('Practice')}>
            <Text style={styles.continueTitle}>NLM</Text>
            <View style={styles.continueBottom}>
              <Text style={styles.continueValue}>17%</Text>
              <View style={styles.continueTrack}><View style={[styles.continueFill, { width: '17%' }]} /></View>
            </View>
          </TouchableOpacity>
        </RNAnimated.View>
        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#09090B' },
  container: { flex: 1 },
  contentPadding: { paddingHorizontal: 20, paddingTop: 10, paddingBottom: 24 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  logoImage: { width: 140, height: 32, tintColor: '#FFFFFF' },
  iconButton: { width: 40, height: 40, justifyContent: 'center', alignItems: 'flex-end' },
  scoreCard: { backgroundColor: '#111111', borderRadius: 16, paddingHorizontal: 20, paddingTop: 16, paddingBottom: 20, marginBottom: 32, position: 'relative', overflow: 'hidden' },
  scoreHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 32 },
  scoreHudjeeText: { color: '#9CA3AF', fontSize: 11, fontWeight: '600', marginBottom: 2 },
  scoreTitle: { color: '#FFFFFF', fontSize: 20, fontWeight: '700', letterSpacing: -0.3 },
  footprintsWrapper: { position: 'absolute', right: -10, top: -5, opacity: 0.8 },
  scoreBottom: { marginTop: 'auto' },
  scoreValueText: { color: '#9CA3AF', fontSize: 10, fontWeight: '700', alignSelf: 'flex-end', marginBottom: 6 },
  scoreTrack: { width: '100%', height: 6, backgroundColor: '#333333', borderRadius: 3, overflow: 'hidden' },
  scoreFill: { height: '100%', borderRadius: 3 },
  section: { marginBottom: 28 },
  sectionHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  sectionTitle: { color: '#F3F4F6', fontSize: 17, fontWeight: '500', marginBottom: 16 },
  viewAllText: { color: '#60A5FA', fontSize: 13, fontWeight: '600' },
  
  stackedContainer: { height: 220, position: 'relative', width: '100%' },
  cardWrapper: { position: 'absolute', width: CONTAINER_WIDTH * 0.68, height: 220, borderRadius: 24, overflow: 'hidden' },
  cardSurface: { width: '100%', height: '100%', padding: 20, borderRadius: 24, overflow: 'hidden' },
  silverCardTitle: { color: '#111827', fontSize: 17, fontWeight: '800' },
  starWrapper: { position: 'absolute', left: '50%', top: '50%', transform: [{ translateX: -55 }, { translateY: -40 }] },

  gridContainer: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 28, gap: 16 },
  gridCard: { flex: 1, backgroundColor: '#111111', borderRadius: 20, paddingHorizontal: 16, paddingTop: 20, paddingBottom: 16, height: 150, position: 'relative', overflow: 'hidden', justifyContent: 'space-between' },
  gridCardBgIcon: { position: 'absolute', right: -25, top: 20 },
  gridCardTitle: { color: '#F9FAFB', fontSize: 18, fontWeight: '800', letterSpacing: -0.3, lineHeight: 20 },
  gridCardBottom: { marginTop: 'auto' },
  gridCardValue: { color: '#9CA3AF', fontSize: 10, fontWeight: '700', alignSelf: 'flex-end', marginBottom: 6 },
  gridCardTrack: { width: '100%', height: 5, backgroundColor: '#333333', borderRadius: 2.5, overflow: 'hidden' },
  gridCardFill: { height: '100%', backgroundColor: '#0EA5E9', borderRadius: 2.5 },

  continueCard: { backgroundColor: '#111111', borderRadius: 16, paddingHorizontal: 16, paddingTop: 16, paddingBottom: 16 },
  continueTitle: { color: '#F9FAFB', fontSize: 16, fontWeight: '700', marginBottom: 20 },
  continueBottom: { marginTop: 'auto' },
  continueValue: { color: '#9CA3AF', fontSize: 10, fontWeight: '700', alignSelf: 'flex-end', marginBottom: 6 },
  continueTrack: { width: '100%', height: 4, backgroundColor: '#333333', borderRadius: 2, overflow: 'hidden' },
  continueFill: { height: '100%', backgroundColor: '#0EA5E9', borderRadius: 2 },
});
