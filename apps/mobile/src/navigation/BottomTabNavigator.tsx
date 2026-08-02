import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Pencil, Swords, User, BookOpen } from 'lucide-react-native';
import Svg, { Path } from 'react-native-svg';

import { colors } from '../theme/colors';
import { typography } from '../theme/typography';

import { useSafeAreaInsets } from 'react-native-safe-area-context';

// Import Navigators
import DashboardScreen from '../screens/DashboardScreen';
import PracticeNavigator from './PracticeNavigator';
import ArenaNavigator from './ArenaNavigator';
import SocialNavigator from './SocialNavigator';
import ProfileNavigator from './ProfileNavigator';

const Tab = createBottomTabNavigator();

const HomeIcon = ({ color, size, strokeWidth }: { color: string; size: number; strokeWidth: number }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
    <Path d="M3 10L12 3l9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V10z" />
  </Svg>
);

const BookIcon = ({ color, size, strokeWidth }: { color: string; size: number; strokeWidth: number }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
    <Path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
    <Path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
  </Svg>
);

import Animated, { LinearTransition, FadeIn, FadeOut } from 'react-native-reanimated';

const TabIcon = ({ focused, icon: IconComp, label }: { focused: boolean, icon: any, label: string }) => {
  return (
    <Animated.View 
      layout={LinearTransition.duration(250)}
      style={[
        styles.tabIconContainer,
        focused && styles.tabIconContainerFocused
      ]}
    >
      <IconComp 
        color={focused ? "#A78BFA" : colors.hudjeeTextSecondary} 
        size={focused ? 20 : 24} 
        strokeWidth={focused ? 2.5 : 2} 
      />
      {focused && (
        <Animated.Text 
          entering={FadeIn.duration(150)} 
          exiting={FadeOut.duration(100)}
          style={styles.tabLabelFocused} 
          numberOfLines={1}
        >
          {label}
        </Animated.Text>
      )}
    </Animated.View>
  );
};

const AnimatedTouchableOpacity = Animated.createAnimatedComponent(TouchableOpacity);

function CustomTabBar({ state, descriptors, navigation, insets }: any) {
  return (
    <View style={[styles.tabBar, { height: 60 + (insets.bottom > 0 ? insets.bottom : 12), paddingBottom: insets.bottom > 0 ? insets.bottom : 12 }]}>
      {state.routes.map((route: any, index: number) => {
        const { options } = descriptors[route.key];
        const isFocused = state.index === index;

        const onPress = () => {
          const event = navigation.emit({
            type: 'tabPress',
            target: route.key,
            canPreventDefault: true,
          });

          if (!isFocused && !event.defaultPrevented) {
            navigation.navigate(route.name);
          }
        };

        return (
          <AnimatedTouchableOpacity
            key={index}
            accessibilityRole="button"
            accessibilityState={isFocused ? { selected: true } : {}}
            accessibilityLabel={options.tabBarAccessibilityLabel}
            testID={options.tabBarTestID}
            onPress={onPress}
            activeOpacity={0.8}
            style={isFocused ? styles.customTabItemActive : styles.customTabItemInactive}
            layout={LinearTransition.duration(250)}
          >
            {options.tabBarIcon ? options.tabBarIcon({ focused: isFocused }) : null}
          </AnimatedTouchableOpacity>
        );
      })}
    </View>
  );
}

export default function BottomTabNavigator() {
  const insets = useSafeAreaInsets();
  
  return (
    <Tab.Navigator
      tabBar={(props) => <CustomTabBar {...props} insets={insets} />}
      screenOptions={{
        headerShown: false,
      }}
    >
      <Tab.Screen 
        name="Dashboard" 
        component={DashboardScreen} 
        options={{
          tabBarIcon: ({ focused }) => <TabIcon focused={focused} icon={HomeIcon} label="Home" />
        }}
      />
      <Tab.Screen 
        name="Practice" 
        component={PracticeNavigator} 
        options={{
          tabBarIcon: ({ focused }) => <TabIcon focused={focused} icon={BookIcon} label="Practice" />
        }}
      />
      <Tab.Screen 
        name="Arena" 
        component={ArenaNavigator}
        options={{
          tabBarIcon: ({ focused }) => <TabIcon focused={focused} icon={Pencil} label="Arena" />
        }}
      />
      <Tab.Screen 
        name="Challenges" 
        component={SocialNavigator}
        options={{
          tabBarIcon: ({ focused }) => <TabIcon focused={focused} icon={Swords} label="Social" />
        }}
      />
      <Tab.Screen 
        name="Profile" 
        component={ProfileNavigator}
        options={{
          tabBarIcon: ({ focused }) => <TabIcon focused={focused} icon={User} label="Profile" />
        }}
      />
    </Tab.Navigator>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: colors.hudjeeBgBase,
    borderTopWidth: 1,
    borderTopColor: colors.hudjeeSurfaceCardElevated,
    paddingTop: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
  },
  customTabItemActive: {
    flex: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  customTabItemInactive: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabIconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    height: 48,
    minWidth: 48,
  },
  tabIconContainerFocused: {
    flexDirection: 'row',
    backgroundColor: 'rgba(167, 139, 250, 0.15)',
    paddingHorizontal: 20,
    borderRadius: 24,
    gap: 8,
  },
  tabLabelFocused: {
    fontFamily: typography.hudjee.headingMd.fontFamily,
    fontSize: 14,
    fontWeight: '600',
    color: '#A78BFA',
  }
});
