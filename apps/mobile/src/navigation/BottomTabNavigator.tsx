import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Pencil, Box, User, BookOpen } from 'lucide-react-native';
import Svg, { Path, Polyline, Rect } from 'react-native-svg';

// Import Navigators
import DashboardScreen from '../screens/DashboardScreen';
import PracticeNavigator from './PracticeNavigator';
import ArenaNavigator from './ArenaNavigator';
import SocialNavigator from './SocialNavigator';
import ProfileNavigator from './ProfileNavigator';

const Tab = createBottomTabNavigator();

// Custom Home Icon (No door, matched to design)
const HomeIcon = ({ color, size, strokeWidth }: { color: string; size: number; strokeWidth: number }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
    <Path d="M3 10L12 3l9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V10z" />
  </Svg>
);

// Custom Book Icon (Pointed spine, matched to design)
const BookIcon = ({ color, size, strokeWidth }: { color: string; size: number; strokeWidth: number }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
    <Path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
    <Path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
  </Svg>
);

export default function BottomTabNavigator() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: '#111111',
          borderTopColor: '#262626',
          borderTopWidth: 1,
          height: 85,
          paddingBottom: 28,
          paddingTop: 16,
        },
        tabBarActiveTintColor: '#FFFFFF',
        tabBarInactiveTintColor: '#6B7280',
        tabBarShowLabel: false,
      }}
    >
      <Tab.Screen 
        name="Dashboard" 
        component={DashboardScreen} 
        options={{
          tabBarIcon: ({ color, size, focused }) => <HomeIcon color={color} size={28} strokeWidth={focused ? 2.5 : 2} />
        }}
      />
      <Tab.Screen 
        name="Practice" 
        component={PracticeNavigator} 
        options={{
          tabBarIcon: ({ color, size, focused }) => <BookIcon color={color} size={26} strokeWidth={focused ? 2.5 : 2} />
        }}
      />
      <Tab.Screen 
        name="Arena" 
        component={ArenaNavigator}
        options={{
          tabBarIcon: ({ color, size, focused }) => <Pencil color={color} size={26} strokeWidth={focused ? 2.5 : 2} />
        }}
      />
      <Tab.Screen 
        name="Challenges" 
        component={SocialNavigator}
        options={{
          tabBarIcon: ({ color, size, focused }) => <Box color={color} size={26} strokeWidth={focused ? 2.5 : 2} />
        }}
      />
      <Tab.Screen 
        name="Profile" 
        component={ProfileNavigator}
        options={{
          tabBarIcon: ({ color, size, focused }) => <User color={color} size={26} strokeWidth={focused ? 2.5 : 2} />
        }}
      />
    </Tab.Navigator>
  );
}
