import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';

// Placeholder-Screen für alle weiteren Module
// Wird nach und nach mit echten Screens befüllt
export default function MoreScreen() {
  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Weitere Module</Text>
      <Text style={styles.note}>
        Diese Module werden in späteren Versionen hinzugefügt.
        Das Backend-API ist vollständig implementiert.
      </Text>
      {[
        'Mahlzeiten & Rezepte',
        'Schulplaner',
        'Gefriergerät',
        'Notizen',
        'Dokument-Tresor',
        'Notfallvorrat',
        'Wetter',
        'Gamification & XP',
      ].map((label) => (
        <View key={label} style={styles.item}>
          <Text style={styles.itemText}>{label}</Text>
          <Text style={styles.badge}>Bald verfügbar</Text>
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  content: { padding: 20 },
  title: { fontSize: 22, fontWeight: '700', color: '#111827', marginBottom: 8 },
  note: { fontSize: 14, color: '#6b7280', marginBottom: 24, lineHeight: 20 },
  item: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  itemText: { fontSize: 15, color: '#374151', fontWeight: '500' },
  badge: { fontSize: 11, color: '#9ca3af', backgroundColor: '#f3f4f6', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8 },
});
