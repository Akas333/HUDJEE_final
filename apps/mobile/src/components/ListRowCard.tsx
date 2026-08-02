import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { colors } from '../theme/colors';
import { typography } from '../theme/typography';

export interface ListRowCardProps {
  avatarUrl?: string;
  avatarInitials: string;
  title: string;
  subtitle?: string;
  rightElement?: React.ReactNode;
  footerText?: string;
  onPress?: () => void;
}

export const ListRowCard: React.FC<ListRowCardProps> = ({
  avatarUrl,
  avatarInitials,
  title,
  subtitle,
  rightElement,
  footerText,
  onPress,
}) => {
  const CardContainer = onPress ? TouchableOpacity : (View as any);

  return (
    <CardContainer
      activeOpacity={0.7}
      style={styles.card}
      onPress={onPress}
    >
      <View style={styles.mainRow}>
        <View style={styles.leftContent}>
          {avatarUrl ? (
            <Image source={{ uri: avatarUrl }} style={styles.avatar} />
          ) : (
            <View style={styles.avatarPlaceholder}>
              <Text style={styles.avatarInitials}>{avatarInitials}</Text>
            </View>
          )}
          <View style={styles.textContainer}>
            <Text style={styles.title} numberOfLines={1}>{title}</Text>
            {subtitle ? <Text style={styles.subtitle} numberOfLines={1}>{subtitle}</Text> : null}
          </View>
        </View>
        {rightElement && <View style={styles.rightContent}>{rightElement}</View>}
      </View>
      {footerText ? (
        <View style={styles.footerRow}>
          <Text style={styles.footerText}>{footerText}</Text>
        </View>
      ) : null}
    </CardContainer>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.hudjeeSurfaceCard,
    borderRadius: 24,
    padding: 16,
    flexDirection: 'column',
  },
  mainRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  leftContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 12,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.hudjeeSurfaceCardElevated,
  },
  avatarPlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.hudjeeSurfaceCardElevated,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitials: {
    ...typography.hudjee.headingMd,
    color: colors.hudjeeTextPrimary,
    fontSize: 16,
  },
  textContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  title: {
    ...typography.hudjee.headingMd,
    color: colors.hudjeeTextPrimary,
  },
  subtitle: {
    ...typography.hudjee.caption,
    color: colors.hudjeeTextSecondary,
    marginTop: 2,
  },
  rightContent: {
    marginLeft: 12,
  },
  footerRow: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.hudjeeBorderSubtle,
  },
  footerText: {
    ...typography.hudjee.caption,
    color: colors.hudjeeTextSecondary,
  },
});
