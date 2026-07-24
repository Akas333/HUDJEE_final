import React from 'react';
import { View, StyleSheet, Image, TouchableOpacity, Text } from 'react-native';
import { Bell } from 'lucide-react-native';
import { colors } from '../theme/colors';

export default function Header() {
  return (
    <View style={styles.container}>
      <View style={styles.logoContainer}>
        <Image 
          source={require('../../assets/refee/logo 1.png')} 
          style={styles.logoIcon} 
          resizeMode="contain"
        />
      </View>
      
      <TouchableOpacity style={styles.notificationButton}>
        <Bell color={colors.textSecondary} size={24} />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 60, // for safe area roughly
    paddingBottom: 20,
    backgroundColor: colors.background,
  },
  logoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  logoIcon: {
    width: 100,
    height: 32,
  },
  notificationButton: {
    padding: 8,
  }
});
