import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors } from '../theme/colors';
import { typography } from '../theme/typography';
import { ChallengeV2 } from '../services/api.mock';
import { ListRowCard } from './ListRowCard';

export interface ChallengeCardProps {
  challenge: ChallengeV2;
  isAwaitingYou: boolean;
  onPress: () => void;
}

const getHumanizedTime = (expiresAt: string) => {
  const expires = new Date(expiresAt).getTime();
  const now = Date.now();
  const diff = expires - now;

  if (diff <= 0) return { short: 'Expired', long: 'Expired' };

  const hours = Math.floor(diff / (1000 * 60 * 60));
  const days = Math.floor(hours / 24);

  if (days > 0) {
    return { short: `${days}d`, long: `${days} days left` };
  }
  return { short: `${hours}h`, long: `${hours} hrs left` };
};

export const ChallengeCard: React.FC<ChallengeCardProps> = ({
  challenge,
  isAwaitingYou,
  onPress,
}) => {
  const isSender = challenge.sender.friend_id === 'self';
  const opponent = isSender ? challenge.recipient : challenge.sender;

  const timeLeft = getHumanizedTime(challenge.expires_at);

  const getInitials = (name: string) => {
    if (!name) return '?';
    return name.charAt(0).toUpperCase();
  };

  const statusText = isAwaitingYou ? 'Your move' : timeLeft.short;

  const rightElement = (
    <View style={styles.chip}>
      <Text style={styles.chipText}>{statusText}</Text>
    </View>
  );

  let footerText: string | undefined;
  if (challenge.status === 'pending' || isAwaitingYou) {
    footerText = `${0} Qs · ${timeLeft.long}`;
  }

  return (
    <ListRowCard
      avatarUrl={opponent.avatar_url}
      avatarInitials={getInitials(opponent.name)}
      title={opponent.name}
      subtitle={challenge.scope || 'Mixed'}
      rightElement={rightElement}
      footerText={footerText}
      onPress={onPress}
    />
  );
};

const styles = StyleSheet.create({
  chip: {
    backgroundColor: colors.hudjeeSurfaceCardElevated,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  chipText: {
    ...typography.hudjee.caption,
    color: colors.hudjeeTextPrimary,
  },
});
