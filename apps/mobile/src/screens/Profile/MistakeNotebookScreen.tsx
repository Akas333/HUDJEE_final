import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, FlatList } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChevronLeft, Filter, BookOpen } from 'lucide-react-native';
import { colors } from '../../theme/colors';

const MOCK_MISTAKES = [
  { id: '1', subject: 'Physics', concept: 'Conservation of Angular Momentum', date: '2 days ago', priority: 'High', status: 'Review Needed' },
  { id: '2', subject: 'Maths', concept: 'Integration by Parts', date: '3 days ago', priority: 'Medium', status: 'Reviewed' },
  { id: '3', subject: 'Chemistry', concept: 'Thermodynamics - Hess Law', date: '5 days ago', priority: 'High', status: 'Review Needed' },
];

export default function MistakeNotebookScreen({ navigation }: any) {
  const [filter, setFilter] = useState('All');
  
  const renderItem = ({ item }: any) => (
    <TouchableOpacity style={styles.mistakeCard} activeOpacity={0.8}>
      <View style={styles.cardHeader}>
        <View style={[styles.subjectTag, { backgroundColor: item.subject === 'Physics' ? '#9B6FFF20' : item.subject === 'Chemistry' ? '#F8717120' : '#34D39920' }]}>
          <Text style={[styles.subjectTagText, { color: item.subject === 'Physics' ? '#9B6FFF' : item.subject === 'Chemistry' ? '#F87171' : '#34D399' }]}>{item.subject}</Text>
        </View>
        <Text style={styles.dateText}>{item.date}</Text>
      </View>
      <Text style={styles.conceptText}>{item.concept}</Text>
      <View style={styles.cardFooter}>
        <Text style={[styles.statusText, { color: item.status === 'Reviewed' ? '#34D399' : '#E8B84B' }]}>
          {item.status}
        </Text>
        <TouchableOpacity style={styles.reviewBtn}>
          <Text style={styles.reviewBtnText}>Practice Again</Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <ChevronLeft color={colors.text} size={24} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Mistake Notebook</Text>
        <TouchableOpacity style={styles.filterBtn}>
          <Filter color={colors.text} size={20} />
        </TouchableOpacity>
      </View>
      
      <View style={styles.emptyStateContainer}>
        <BookOpen color={colors.textSecondary} size={48} />
        <Text style={styles.emptyTitle}>Keep track of your errors</Text>
        <Text style={styles.emptySubtitle}>Mistakes from adaptive practice will automatically appear here so you can review them later.</Text>
      </View>

      <FlatList
        data={MOCK_MISTAKES}
        keyExtractor={item => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.border },
  backBtn: { padding: 4 },
  headerTitle: { color: colors.text, fontSize: 18, fontWeight: '700' },
  filterBtn: { padding: 4 },
  
  listContent: { padding: 16, gap: 12 },
  mistakeCard: { backgroundColor: colors.surface, borderRadius: 12, padding: 16, borderWidth: 1, borderColor: colors.border },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  subjectTag: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  subjectTagText: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase' },
  dateText: { color: colors.textSecondary, fontSize: 12 },
  conceptText: { color: colors.text, fontSize: 16, fontWeight: '600', marginBottom: 16 },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  statusText: { fontSize: 13, fontWeight: '600' },
  reviewBtn: { backgroundColor: colors.surfaceLight, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 6 },
  reviewBtnText: { color: colors.primary, fontSize: 13, fontWeight: '600' },
  
  emptyStateContainer: { alignItems: 'center', padding: 32, marginTop: 20 },
  emptyTitle: { color: colors.text, fontSize: 18, fontWeight: '700', marginTop: 16, marginBottom: 8 },
  emptySubtitle: { color: colors.textSecondary, fontSize: 14, textAlign: 'center', lineHeight: 20 },
});
