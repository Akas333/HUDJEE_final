import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Home, BookOpen, PenTool, Users, User } from 'lucide-react-native';
import { colors } from '../theme/colors';

// Import Navigators
import DashboardScreen from '../screens/DashboardScreen';
import LearnNavigator from './LearnNavigator';
import TestNavigator from './TestNavigator';
import SocialNavigator from './SocialNavigator';
import ProfileNavigator from './ProfileNavigator';

const Tab = createBottomTabNavigator();

export default function BottomTabNavigator() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: colors.background,
          borderTopColor: colors.border,
          height: 60,
          paddingBottom: 10,
          paddingTop: 10,
        },
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textSecondary,
        tabBarShowLabel: false,
      }}
    >
      <Tab.Screen 
        name="Dashboard" 
        component={DashboardScreen} 
        options={{
          tabBarIcon: ({ color, size }) => <Home color={color} size={size} />
        }}
      />
      <Tab.Screen 
        name="Learn" 
        component={LearnNavigator} 
        options={{
          tabBarIcon: ({ color, size }) => <BookOpen color={color} size={size} />
        }}
      />
      <Tab.Screen 
        name="Test" 
        component={TestNavigator}
        options={{
          tabBarIcon: ({ color, size }) => <PenTool color={color} size={size} />
        }}
      />
      <Tab.Screen 
        name="Social" 
        component={SocialNavigator}
        options={{
          tabBarIcon: ({ color, size }) => <Users color={color} size={size} />
        }}
      />
      <Tab.Screen 
        name="Profile" 
        component={ProfileNavigator}
        options={{
          tabBarIcon: ({ color, size }) => <User color={color} size={size} />
        }}
      />
    </Tab.Navigator>
  );
}
