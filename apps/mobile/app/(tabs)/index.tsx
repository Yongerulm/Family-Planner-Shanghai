import { View, Text, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuthStore } from '../../src/stores/auth.store';
import { authApi } from '../../src/api/client';

const FEATURE_TILES = [
  { label: 'Einkaufen', emoji: '🛒', route: '/(tabs)/shopping' },
  { label: 'Aufgaben', emoji: '✅', route: '/(tabs)/tasks' },
  { label: 'Kalender', emoji: '📅', route: '/(tabs)/calendar' },
  { label: 'Mahlzeiten', emoji: '🍽️', route: '/(tabs)/more' },
  { label: 'Schule', emoji: '🎒', route: '/(tabs)/more' },
  { label: 'Gefriergerät', emoji: '🧊', route: '/(tabs)/more' },
  { label: 'Notizen', emoji: '📝', route: '/(tabs)/more' },
  { label: 'Dokumente', emoji: '📁', route: '/(tabs)/more' },
];

export default function HomeScreen() {
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const router = useRouter();

  async function handleLogout() {
    try { await authApi.logout(); } catch { /* ignored */ }
    await logout();
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Text style={styles.greeting}>Hallo, {user?.displayName ?? user?.email?.split('@')[0]} 👋</Text>
        <TouchableOpacity onPress={handleLogout}>
          <Text style={styles.logoutText}>Ausloggen</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.sectionTitle}>Module</Text>
      <View style={styles.grid}>
        {FEATURE_TILES.map((tile) => (
          <TouchableOpacity
            key={tile.label}
            style={styles.tile}
            onPress={() => router.push(tile.route as never)}
          >
            <Text style={styles.tileEmoji}>{tile.emoji}</Text>
            <Text style={styles.tileLabel}>{tile.label}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  content: { padding: 20 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  greeting: { fontSize: 22, fontWeight: '700', color: '#111827', flex: 1 },
  logoutText: { fontSize: 14, color: '#6b7280' },
  sectionTitle: { fontSize: 16, fontWeight: '600', color: '#374151', marginBottom: 12 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  tile: {
    backgroundColor: '#fff',
    borderRadius: 16,
    width: '47%',
    paddingVertical: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  tileEmoji: { fontSize: 32, marginBottom: 8 },
  tileLabel: { fontSize: 14, fontWeight: '500', color: '#374151' },
});
