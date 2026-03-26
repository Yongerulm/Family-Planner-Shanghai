import {
  View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator, RefreshControl,
} from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '../../src/stores/auth.store';
import { tasksApi } from '../../src/api/client';

const PRIORITY_COLOR: Record<number, string> = { 0: '#10b981', 1: '#f59e0b', 2: '#ef4444' };
const PRIORITY_LABEL: Record<number, string> = { 0: 'Niedrig', 1: 'Mittel', 2: 'Hoch' };

export default function TasksScreen() {
  const user = useAuthStore((s) => s.user);
  const familyId = user?.familyId ?? '';
  const queryClient = useQueryClient();

  const { data: lists, isLoading, refetch } = useQuery({
    queryKey: ['tasks', familyId],
    queryFn: async () => {
      const { data } = await tasksApi.getLists(familyId);
      return data.data as Array<{ id: string; title: string; items: Array<{ id: string; title: string; priority: number; isCompleted: boolean; dueDate?: string }> }>;
    },
    enabled: !!familyId,
  });

  const completeMutation = useMutation({
    mutationFn: ({ listId, itemId }: { listId: string; itemId: string }) =>
      tasksApi.completeItem(familyId, listId, itemId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['tasks', familyId] }),
  });

  if (isLoading) return <View style={s.center}><ActivityIndicator color="#2563eb" /></View>;

  const pendingItems = lists?.flatMap((l) =>
    l.items.filter((i) => !i.isCompleted).map((i) => ({ ...i, listId: l.id, listTitle: l.title }))
  ) ?? [];

  return (
    <View style={s.container}>
      <FlatList
        data={pendingItems}
        keyExtractor={(item) => item.id}
        contentContainerStyle={s.list}
        refreshControl={<RefreshControl refreshing={false} onRefresh={refetch} />}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={s.item}
            onPress={() => completeMutation.mutate({ listId: item.listId, itemId: item.id })}
          >
            <View style={s.checkbox} />
            <View style={s.itemBody}>
              <Text style={s.itemTitle}>{item.title}</Text>
              <View style={s.meta}>
                <Text style={s.listName}>{item.listTitle}</Text>
                <View style={[s.priority, { backgroundColor: PRIORITY_COLOR[item.priority] + '20' }]}>
                  <Text style={[s.priorityText, { color: PRIORITY_COLOR[item.priority] }]}>
                    {PRIORITY_LABEL[item.priority]}
                  </Text>
                </View>
                {item.dueDate && (
                  <Text style={s.dueDate}>{new Date(item.dueDate).toLocaleDateString('de-DE')}</Text>
                )}
              </View>
            </View>
          </TouchableOpacity>
        )}
        ListEmptyComponent={<Text style={s.empty}>Alle Aufgaben erledigt! 🎉</Text>}
      />
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  list: { padding: 16, paddingBottom: 32 },
  item: { flexDirection: 'row', backgroundColor: '#fff', borderRadius: 12, padding: 14, marginBottom: 8, gap: 12, alignItems: 'flex-start' },
  checkbox: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: '#d1d5db', marginTop: 2 },
  itemBody: { flex: 1 },
  itemTitle: { fontSize: 15, fontWeight: '500', color: '#111827', marginBottom: 4 },
  meta: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, alignItems: 'center' },
  listName: { fontSize: 12, color: '#6b7280' },
  priority: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8 },
  priorityText: { fontSize: 11, fontWeight: '600' },
  dueDate: { fontSize: 12, color: '#6b7280' },
  empty: { textAlign: 'center', color: '#9ca3af', marginTop: 60, fontSize: 16 },
});
