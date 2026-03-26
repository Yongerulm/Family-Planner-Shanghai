import { useState, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  ActivityIndicator, RefreshControl,
} from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '../../src/stores/auth.store';
import { shoppingApi } from '../../src/api/client';

interface ShoppingItem {
  id: string;
  name: string;
  quantity?: number;
  unit?: string;
  isChecked: boolean;
  sortOrder: number;
}

interface ShoppingList {
  id: string;
  name: string;
  items: ShoppingItem[];
}

export default function ShoppingScreen() {
  const user = useAuthStore((s) => s.user);
  const familyId = user?.familyId ?? '';
  const queryClient = useQueryClient();

  const { data: lists, isLoading, refetch } = useQuery<ShoppingList[]>({
    queryKey: ['shopping', familyId],
    queryFn: async () => {
      const { data } = await shoppingApi.getLists(familyId);
      return data.data;
    },
    enabled: !!familyId,
  });

  const checkMutation = useMutation({
    mutationFn: ({ listId, itemId, checked }: { listId: string; itemId: string; checked: boolean }) =>
      shoppingApi.checkItem(familyId, listId, itemId, checked),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['shopping', familyId] }),
  });

  const [activeListId, setActiveListId] = useState<string | null>(null);
  const activeList = lists?.find((l) => l.id === activeListId) ?? lists?.[0];

  if (isLoading) {
    return <View style={styles.center}><ActivityIndicator color="#2563eb" /></View>;
  }

  return (
    <View style={styles.container}>
      {/* Liste wählen */}
      <FlatList
        horizontal
        data={lists}
        keyExtractor={(l) => l.id}
        contentContainerStyle={styles.listTabs}
        showsHorizontalScrollIndicator={false}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={[styles.tab, activeList?.id === item.id && styles.tabActive]}
            onPress={() => setActiveListId(item.id)}
          >
            <Text style={[styles.tabText, activeList?.id === item.id && styles.tabTextActive]}>
              {item.name}
            </Text>
          </TouchableOpacity>
        )}
      />

      {/* Items */}
      <FlatList
        data={activeList?.items?.sort((a, b) => a.sortOrder - b.sortOrder)}
        keyExtractor={(item) => item.id}
        refreshControl={<RefreshControl refreshing={false} onRefresh={refetch} />}
        contentContainerStyle={styles.itemsList}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.item}
            onPress={() =>
              checkMutation.mutate({ listId: activeList!.id, itemId: item.id, checked: !item.isChecked })
            }
          >
            <View style={[styles.checkbox, item.isChecked && styles.checkboxChecked]}>
              {item.isChecked && <Text style={styles.checkmark}>✓</Text>}
            </View>
            <View style={styles.itemText}>
              <Text style={[styles.itemName, item.isChecked && styles.itemNameChecked]}>
                {item.name}
              </Text>
              {item.quantity && (
                <Text style={styles.itemQty}>{item.quantity} {item.unit ?? ''}</Text>
              )}
            </View>
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          <Text style={styles.empty}>Keine Artikel — füge welche über die App oder den Browser hinzu.</Text>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  listTabs: { padding: 16, gap: 8 },
  tab: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: '#e5e7eb' },
  tabActive: { backgroundColor: '#2563eb' },
  tabText: { fontSize: 14, color: '#374151', fontWeight: '500' },
  tabTextActive: { color: '#fff' },
  itemsList: { paddingHorizontal: 16, paddingBottom: 32 },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
    gap: 12,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#d1d5db',
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxChecked: { backgroundColor: '#2563eb', borderColor: '#2563eb' },
  checkmark: { color: '#fff', fontSize: 14, fontWeight: '700' },
  itemText: { flex: 1 },
  itemName: { fontSize: 15, color: '#111827', fontWeight: '500' },
  itemNameChecked: { color: '#9ca3af', textDecorationLine: 'line-through' },
  itemQty: { fontSize: 12, color: '#6b7280', marginTop: 2 },
  empty: { textAlign: 'center', color: '#9ca3af', marginTop: 40, lineHeight: 22 },
});
