import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { api } from '@/lib/api';
import type { ScanIdentification, MatchedProduct, RecordStockResponse } from '@/lib/types';
import { Alert } from '@/lib/alert';

export default function ConfirmScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    identification: string;
    matchedProduct: string;
  }>();

  const identification = JSON.parse(params.identification) as ScanIdentification;
  const matchedProduct = params.matchedProduct
    ? (JSON.parse(params.matchedProduct) as MatchedProduct)
    : null;

  const [quantity, setQuantity] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // When no product exists yet, we create it first then record stock
  async function handleSubmit() {
    const qty = parseInt(quantity, 10);
    if (isNaN(qty) || qty < 0) {
      Alert.alert('Invalid quantity', 'Please enter a valid stock count (0 or more).');
      return;
    }

    setSubmitting(true);
    try {
      let productId: string;
      let productName: string;

      if (matchedProduct) {
        productId = matchedProduct.id;
        productName = matchedProduct.name;
      } else {
        // New product — create it with the initial stock count
        const { data: created } = await api.post<{ _id: string; name: string }>(
          '/products',
          {
            name: identification.name,
            brand: identification.brand ?? undefined,
            sku: identification.sku ?? undefined,
            initialStock: qty,
          },
        );
        productId = created._id;
        productName = created.name;
      }

      // Record the stock count
      const { data } = await api.post<RecordStockResponse>(
        `/stock/${productId}`,
        {
          quantity: qty,
          aiIdentificationNote: identification.rawNote,
        },
      );

      if (data.alertFired) {
        Alert.alert(
          '⚠️ Low stock alert sent',
          `${productName} is now at ${qty} units. Your manager has been notified.`,
          [{ text: 'OK', onPress: () => router.replace('/(tabs)/scan') }],
        );
      } else {
        const verb = matchedProduct ? 'Stock recorded' : 'Product added';
        Alert.alert(`✅ ${verb}`, `${productName}: ${qty} units saved.`, [
          { text: 'OK', onPress: () => router.replace('/(tabs)/scan') },
        ]);
      }
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        'Failed to save. Please try again.';
      Alert.alert('Error', Array.isArray(msg) ? msg.join('\n') : String(msg));
    } finally {
      setSubmitting(false);
    }
  }

  const isNew = !matchedProduct;

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
      >
        {/* AI identification result */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>AI IDENTIFIED</Text>
          <View style={styles.card}>
            <Text style={styles.productName}>{identification.name}</Text>
            {identification.brand ? (
              <Text style={styles.meta}>Brand: {identification.brand}</Text>
            ) : null}
            {identification.sku ? (
              <Text style={styles.meta}>SKU: {identification.sku}</Text>
            ) : null}
            {identification.description ? (
              <Text style={styles.description}>{identification.description}</Text>
            ) : null}
          </View>
        </View>

        {/* Matched product from DB */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>MATCHED IN SYSTEM</Text>
          {matchedProduct ? (
            <View style={[styles.card, styles.matchedCard]}>
              <View style={styles.matchBadge}>
                <Text style={styles.matchBadgeText}>✓ Found</Text>
              </View>
              <Text style={styles.productName}>{matchedProduct.name}</Text>
              {matchedProduct.brand ? (
                <Text style={styles.meta}>Brand: {matchedProduct.brand}</Text>
              ) : null}
              <Text style={styles.meta}>
                Current stock: {matchedProduct.currentStock} · Threshold:{' '}
                {matchedProduct.lowStockThreshold}
              </Text>
            </View>
          ) : (
            <View style={[styles.card, styles.newCard]}>
              <View style={styles.newBadge}>
                <Text style={styles.newBadgeText}>+ New product</Text>
              </View>
              <Text style={styles.newText}>
                This item isn't in your inventory yet. Enter the quantity below and it
                will be added automatically.
              </Text>
            </View>
          )}
        </View>

        {/* Stock count input */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>
            {isNew ? 'INITIAL STOCK COUNT' : 'HOW MANY UNITS DO YOU SEE?'}
          </Text>
          <TextInput
            style={styles.quantityInput}
            value={quantity}
            onChangeText={setQuantity}
            keyboardType="numeric"
            placeholder="0"
            placeholderTextColor="#475569"
            returnKeyType="done"
            onSubmitEditing={handleSubmit}
            autoFocus
          />
        </View>

        <View style={styles.actions}>
          <TouchableOpacity
            style={styles.cancelBtn}
            onPress={() => router.replace('/(tabs)/scan')}
          >
            <Text style={styles.cancelText}>Scan again</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.submitBtn, submitting && styles.submitBtnDisabled]}
            onPress={handleSubmit}
            disabled={submitting}
            activeOpacity={0.8}
          >
            {submitting ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.submitText}>
                {isNew ? 'Add & save' : 'Save count'}
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0F172A' },
  scroll: { padding: 20, gap: 24 },

  section: { gap: 8 },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748B',
    letterSpacing: 1,
  },
  card: {
    backgroundColor: '#1E293B',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: '#334155',
    gap: 4,
  },
  matchedCard: {
    borderColor: '#1D4ED8',
    backgroundColor: '#1E3A5F',
  },
  newCard: {
    borderColor: '#059669',
    backgroundColor: '#0D2B22',
    gap: 8,
  },
  matchBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#1D4ED8',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 2,
    marginBottom: 6,
  },
  matchBadgeText: { color: '#BFDBFE', fontSize: 11, fontWeight: '700' },
  newBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#059669',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  newBadgeText: { color: '#D1FAE5', fontSize: 11, fontWeight: '700' },
  newText: { fontSize: 14, color: '#6EE7B7', lineHeight: 20 },

  productName: { fontSize: 18, fontWeight: '700', color: '#F8FAFC' },
  meta: { fontSize: 13, color: '#94A3B8' },
  description: { fontSize: 13, color: '#94A3B8', marginTop: 4 },

  quantityInput: {
    backgroundColor: '#1E293B',
    borderWidth: 1,
    borderColor: '#3B82F6',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 16,
    fontSize: 32,
    fontWeight: '700',
    color: '#F8FAFC',
    textAlign: 'center',
  },

  actions: { flexDirection: 'row', gap: 12, marginTop: 8 },
  cancelBtn: {
    flex: 1,
    backgroundColor: '#1E293B',
    borderRadius: 12,
    paddingVertical: 15,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#334155',
  },
  cancelText: { color: '#94A3B8', fontSize: 15, fontWeight: '600' },
  submitBtn: {
    flex: 2,
    backgroundColor: '#3B82F6',
    borderRadius: 12,
    paddingVertical: 15,
    alignItems: 'center',
  },
  submitBtnDisabled: { opacity: 0.5 },
  submitText: { color: '#fff', fontSize: 15, fontWeight: '700' },
});
