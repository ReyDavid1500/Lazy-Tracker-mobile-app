import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  ActivityIndicator,
  TextInput,
  TouchableOpacity,
  Modal,
} from 'react-native';
import { useEffect, useState, useCallback, useMemo } from 'react';
import { Search, ChevronRight } from 'lucide-react-native';
import { api } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { Alert } from '@/lib/alert';
import type { InventoryItem } from '@/lib/types';

export default function ProductsScreen() {
  const { user } = useAuth();
  const isManager = user?.role === 'manager';

  const [items, setItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  // Threshold editing state
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
  const [thresholdInput, setThresholdInput] = useState('');
  const [savingThreshold, setSavingThreshold] = useState(false);

  const fetchProducts = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError(null);

    try {
      const { data } = await api.get<InventoryItem[]>('/products');
      setItems(data);
    } catch {
      setError('Failed to load products. Pull to refresh.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return items;
    return items.filter(
      (i) =>
        i.name.toLowerCase().includes(q) ||
        (i.brand?.toLowerCase().includes(q) ?? false) ||
        (i.sku?.toLowerCase().includes(q) ?? false),
    );
  }, [items, search]);

  const lowCount = items.filter((i) => i.isLow).length;

  function openThresholdModal(item: InventoryItem) {
    setEditingItem(item);
    setThresholdInput(String(item.lowStockThreshold));
  }

  async function saveThreshold() {
    if (!editingItem) return;
    const val = parseInt(thresholdInput, 10);
    if (isNaN(val) || val < 0) {
      Alert.alert('Invalid value', 'Please enter a valid number (0 or more).');
      return;
    }
    setSavingThreshold(true);
    try {
      await api.patch(`/products/${editingItem.productId}/threshold`, {
        lowStockThreshold: val,
      });
      setItems((prev) =>
        prev.map((i) =>
          i.productId === editingItem.productId
            ? { ...i, lowStockThreshold: val, isLow: i.currentStock <= val }
            : i,
        ),
      );
      setEditingItem(null);
    } catch {
      Alert.alert('Error', 'Failed to update threshold. Please try again.');
    } finally {
      setSavingThreshold(false);
    }
  }

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

      {/* Search bar */}
      <View style={styles.searchWrap}>
        <Search size={16} color="#64748B" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search by name, brand or SKU…"
          placeholderTextColor="#64748B"
          value={search}
          onChangeText={setSearch}
          autoCapitalize="none"
          autoCorrect={false}
          returnKeyType="search"
        />
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(item) => item.productId}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => fetchProducts(true)}
            tintColor="#3B82F6"
          />
        }
        ListEmptyComponent={
          <Text style={styles.empty}>{error ?? 'No products found.'}</Text>
        }
        renderItem={({ item }) => (
          <TouchableOpacity
            style={[styles.row, item.isLow && styles.rowLow]}
            onPress={() => isManager && openThresholdModal(item)}
            activeOpacity={isManager ? 0.7 : 1}
          >
            <View style={styles.rowLeft}>
              <Text style={styles.rowName}>{item.name}</Text>
              {item.brand ? <Text style={styles.rowMeta}>{item.brand}</Text> : null}
              {item.sku ? <Text style={styles.rowMeta}>SKU: {item.sku}</Text> : null}
              {isManager && (
                <Text style={styles.thresholdHint}>
                  Alert at ≤ {item.lowStockThreshold} units
                </Text>
              )}
            </View>

            <View style={styles.rowRight}>
              <Text style={[styles.stockCount, item.isLow && styles.stockCountLow]}>
                {item.currentStock}
              </Text>
              {item.isLow && (
                <View style={styles.lowBadge}>
                  <Text style={styles.lowBadgeText}>LOW</Text>
                </View>
              )}
              {isManager && <ChevronRight size={16} color="#334155" style={{ marginTop: 4 }} />}
            </View>
          </TouchableOpacity>
        )}
      />

      {/* Threshold edit modal */}
      <Modal
        visible={editingItem !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setEditingItem(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Set Alert Threshold</Text>
            <Text style={styles.modalSubtitle}>{editingItem?.name}</Text>
            <Text style={styles.modalHint}>
              You'll get notified when stock hits this number or below.
            </Text>
            <TextInput
              style={styles.modalInput}
              value={thresholdInput}
              onChangeText={setThresholdInput}
              keyboardType="number-pad"
              autoFocus
              selectTextOnFocus
            />
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalCancel}
                onPress={() => setEditingItem(null)}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalSave, savingThreshold && styles.btnDisabled]}
                onPress={saveThreshold}
                disabled={savingThreshold}
              >
                {savingThreshold ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={styles.modalSaveText}>Save</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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

  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E293B',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#334155',
    marginHorizontal: 16,
    marginTop: 12,
    paddingHorizontal: 12,
  },
  searchIcon: { marginRight: 8 },
  searchInput: {
    flex: 1,
    color: '#F8FAFC',
    fontSize: 15,
    paddingVertical: 12,
  },

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
  rowLow: { borderColor: '#F87171', backgroundColor: '#2D1B1B' },
  rowLeft: { flex: 1, gap: 2 },
  rowName: { fontSize: 15, fontWeight: '600', color: '#F8FAFC' },
  rowMeta: { fontSize: 12, color: '#64748B' },
  thresholdHint: { fontSize: 11, color: '#475569', marginTop: 2 },
  rowRight: { alignItems: 'flex-end', gap: 2 },
  stockCount: { fontSize: 22, fontWeight: '800', color: '#F8FAFC' },
  stockCountLow: { color: '#F87171' },
  lowBadge: {
    backgroundColor: '#7F1D1D',
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  lowBadgeText: { color: '#FCA5A5', fontSize: 10, fontWeight: '800', letterSpacing: 0.5 },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    padding: 32,
  },
  modalCard: {
    backgroundColor: '#1E293B',
    borderRadius: 16,
    padding: 24,
    borderWidth: 1,
    borderColor: '#334155',
  },
  modalTitle: { fontSize: 18, fontWeight: '800', color: '#F8FAFC', marginBottom: 4 },
  modalSubtitle: { fontSize: 14, color: '#94A3B8', marginBottom: 8 },
  modalHint: { fontSize: 13, color: '#64748B', marginBottom: 16 },
  modalInput: {
    backgroundColor: '#0F172A',
    borderWidth: 1,
    borderColor: '#334155',
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 24,
    fontWeight: '700',
    color: '#F8FAFC',
    textAlign: 'center',
    marginBottom: 20,
  },
  modalActions: { flexDirection: 'row', gap: 12 },
  modalCancel: {
    flex: 1,
    backgroundColor: '#0F172A',
    borderRadius: 10,
    paddingVertical: 13,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#334155',
  },
  modalCancelText: { color: '#94A3B8', fontWeight: '600', fontSize: 15 },
  modalSave: {
    flex: 1,
    backgroundColor: '#3B82F6',
    borderRadius: 10,
    paddingVertical: 13,
    alignItems: 'center',
  },
  btnDisabled: { opacity: 0.6 },
  modalSaveText: { color: '#fff', fontWeight: '700', fontSize: 15 },
});
