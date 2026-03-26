import { View, Text, FlatList, StyleSheet, ActivityIndicator } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '../../src/stores/auth.store';
import { calendarApi } from '../../src/api/client';
import { format, startOfMonth, endOfMonth } from 'date-fns';
import { de } from 'date-fns/locale';

export default function CalendarScreen() {
  const user = useAuthStore((s) => s.user);
  const familyId = user?.familyId ?? '';

  const now = new Date();
  const from = format(startOfMonth(now), 'yyyy-MM-dd');
  const to = format(endOfMonth(now), 'yyyy-MM-dd');

  const { data: events, isLoading } = useQuery({
    queryKey: ['calendar', familyId, from, to],
    queryFn: async () => {
      const { data } = await calendarApi.getEvents(familyId, from, to);
      return data.data as Array<{ id: string; title: string; startTime: string; endTime?: string; isAllDay: boolean; color?: string }>;
    },
    enabled: !!familyId,
  });

  if (isLoading) return <View style={s.center}><ActivityIndicator color="#2563eb" /></View>;

  return (
    <View style={s.container}>
      <Text style={s.month}>{format(now, 'MMMM yyyy', { locale: de })}</Text>
      <FlatList
        data={events ?? []}
        keyExtractor={(e) => e.id}
        contentContainerStyle={s.list}
        renderItem={({ item }) => (
          <View style={s.event}>
            <View style={[s.dot, { backgroundColor: item.color ?? '#2563eb' }]} />
            <View style={s.body}>
              <Text style={s.title}>{item.title}</Text>
              <Text style={s.time}>
                {item.isAllDay
                  ? `${format(new Date(item.startTime), 'd. MMM', { locale: de })} · Ganztägig`
                  : `${format(new Date(item.startTime), 'd. MMM, HH:mm', { locale: de })}`}
              </Text>
            </View>
          </View>
        )}
        ListEmptyComponent={<Text style={s.empty}>Keine Termine diesen Monat</Text>}
      />
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  month: { fontSize: 20, fontWeight: '700', color: '#111827', padding: 20, paddingBottom: 8 },
  list: { paddingHorizontal: 16, paddingBottom: 32 },
  event: { flexDirection: 'row', backgroundColor: '#fff', borderRadius: 12, padding: 14, marginBottom: 8, gap: 12, alignItems: 'center' },
  dot: { width: 10, height: 10, borderRadius: 5 },
  body: { flex: 1 },
  title: { fontSize: 15, fontWeight: '500', color: '#111827' },
  time: { fontSize: 12, color: '#6b7280', marginTop: 2 },
  empty: { textAlign: 'center', color: '#9ca3af', marginTop: 60 },
});
