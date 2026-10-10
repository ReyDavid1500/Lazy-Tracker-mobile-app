import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { useEffect, useState, useCallback } from 'react';
import { api } from '@/lib/api';
import type { InventoryItem } from '@/lib/types';

export default function InventoryScreen() {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchInventory = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError(null);

    try {
      const { data } = await api.get<InventoryItem[]>('/stock');
      setItems(data);
    } catch {
      setError('Failed to load inventory. Pull to refresh.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchInventory();
  }, [fetchInventory]);

  const lowCount = items.filter((i) => i.isLow).length;

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color="#3B82F6" size="large" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Summary bar */}
      <View style={styles.summary}>
        <View style={styles.summaryItem}>
          <Text style={styles.summaryValue}>{items.length}</Text>
          <Text style={styles.summaryLabel}>Products</Text>
        </View>
        <View style={styles.divider} />
        <View style={styles.summaryItem}>
          <Text style={[styles.summaryValue, lowCount > 0 && styles.summaryAlert]}>
            {lowCount}
          </Text>
          <Text style={styles.summaryLabel}>Low stock</Text>
        </View>
      </View>

      <FlatList
        data={items}
        keyExtractor={(item) => item.productId}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => fetchInventory(true)}
            tintColor="#3B82F6"
          />
        }
        ListEmptyComponent={
          <Text style={styles.empty}>{error ?? 'No products found.'}</Text>
        }
        renderItem={({ item }) => (
          <View style={[styles.row, item.isLow && styles.rowLow]}>
            <View style={styles.rowLeft}>
              <Text style={styles.rowName}>{item.name}</Text>
              {item.brand && <Text style={styles.rowMeta}>{item.brand}</Text>}
              {item.sku && <Text style={styles.rowMeta}>SKU: {item.sku}</Text>}
            </View>

            <View style={styles.rowRight}>
              <Text style={[styles.stockCount, item.isLow && styles.stockCountLow]}>
                {item.currentStock}
              </Text>
              <Text style={styles.thresholdLabel}>/ {item.lowStockThreshold}</Text>
              {item.isLow && (
                <View style={styles.lowBadge}>
                  <Text style={styles.lowBadgeText}>LOW</Text>
                </View>
              )}
            </View>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0F172A' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0F172A' },

  summary: {
    flexDirection: 'row',
    backgroundColor: '#1E293B',
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: '#334155',
  },
  summaryItem: { flex: 1, alignItems: 'center', gap: 2 },
  summaryValue: { fontSize: 28, fontWeight: '800', color: '#F8FAFC' },
  summaryAlert: { color: '#F87171' },
  summaryLabel: { fontSize: 12, color: '#64748B', fontWeight: '600' },
  divider: { width: 1, backgroundColor: '#334155', marginHorizontal: 16 },

  list: { padding: 16, gap: 10 },
  empty: { color: '#64748B', textAlign: 'center', marginTop: 40, fontSize: 15 },

  row: {
    backgroundColor: '#1E293B',
    borderRadius: 12,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#334155',
  },
  rowLow: {
    borderColor: '#F87171',
    backgroundColor: '#2D1B1B',
  },
  rowLeft: { flex: 1, gap: 2 },
  rowName: { fontSize: 15, fontWeight: '600', color: '#F8FAFC' },
  rowMeta: { fontSize: 12, color: '#64748B' },
  rowRight: { alignItems: 'flex-end', gap: 2 },
  stockCount: { fontSize: 22, fontWeight: '800', color: '#F8FAFC' },
  stockCountLow: { color: '#F87171' },
  thresholdLabel: { fontSize: 11, color: '#64748B' },
  lowBadge: {
    backgroundColor: '#7F1D1D',
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginTop: 2,
  },
  lowBadgeText: { color: '#FCA5A5', fontSize: 10, fontWeight: '800', letterSpacing: 0.5 },
});
