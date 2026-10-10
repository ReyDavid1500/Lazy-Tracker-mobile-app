import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  TextInput,
} from 'react-native';
import { useEffect, useState, useCallback } from 'react';
import { LogOut, Plus, Building2, User as UserIcon, Shield } from 'lucide-react-native';
import { useAuth } from '@/context/AuthContext';
import { api } from '@/lib/api';
import { Alert } from '@/lib/alert';

interface TeamMember {
  id: string;
  name: string;
  userName: string;
  role: 'manager' | 'worker';
  businessId: string;
}

interface Business {
  _id: string;
  name: string;
  slug: string;
}

export default function ProfileScreen() {
  const { user, logout } = useAuth();
  const isManager = user?.role === 'manager';

  const [business, setBusiness] = useState<Business | null>(null);
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loadingBiz, setLoadingBiz] = useState(true);
  const [loadingMembers, setLoadingMembers] = useState(false);

  // Add member modal
  const [addModal, setAddModal] = useState(false);
  const [newName, setNewName] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newRole, setNewRole] = useState<'worker' | 'manager'>('worker');
  const [saving, setSaving] = useState(false);

  const fetchBusiness = useCallback(async () => {
    try {
      const { data } = await api.get<Business>('/business/me');
      setBusiness(data);
    } catch {
      // ignore
    } finally {
      setLoadingBiz(false);
    }
  }, []);

  const fetchMembers = useCallback(async () => {
    if (!isManager) return;
    setLoadingMembers(true);
    try {
      const { data } = await api.get<TeamMember[]>('/users');
      setMembers(data);
    } catch {
      // ignore
    } finally {
      setLoadingMembers(false);
    }
  }, [isManager]);

  useEffect(() => {
    fetchBusiness();
    fetchMembers();
  }, [fetchBusiness, fetchMembers]);

  async function handleAddMember() {
    if (!newName.trim() || !newPassword.trim()) {
      Alert.alert('Missing fields', 'Please fill in name and password.');
      return;
    }
    if (newPassword.length < 8) {
      Alert.alert('Weak password', 'Password must be at least 8 characters.');
      return;
    }
    setSaving(true);
    try {
      await api.post('/users', {
        name: newName.trim(),
        password: newPassword,
        role: newRole,
      });
      setAddModal(false);
      setNewName('');
      setNewPassword('');
      setNewRole('worker');
      await fetchMembers();
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        'Failed to add member.';
      Alert.alert('Error', Array.isArray(msg) ? msg.join('\n') : String(msg));
    } finally {
      setSaving(false);
    }
  }

  function confirmLogout() {
    Alert.alert('Sign out', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign out', style: 'destructive', onPress: logout },
    ]);
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.inner}>
      {/* User card */}
      <View style={styles.card}>
        <View style={styles.avatarWrap}>
          <UserIcon size={28} color="#3B82F6" />
        </View>
        <View style={styles.cardBody}>
          <Text style={styles.cardName}>{user?.name}</Text>
          {user?.email ? (
            <Text style={styles.cardMeta}>{user.email}</Text>
          ) : null}
          {user?.userName ? (
            <Text style={styles.cardMeta}>@{user.userName}</Text>
          ) : null}
          <View style={[styles.roleBadge, isManager && styles.roleBadgeManager]}>
            <Shield size={11} color={isManager ? '#93C5FD' : '#94A3B8'} />
            <Text style={[styles.roleText, isManager && styles.roleTextManager]}>
              {isManager ? 'Manager' : 'Worker'}
            </Text>
          </View>
        </View>
      </View>

      {/* Business card */}
      <View style={styles.card}>
        <View style={[styles.avatarWrap, styles.avatarBiz]}>
          <Building2 size={24} color="#A78BFA" />
        </View>
        <View style={styles.cardBody}>
          <Text style={styles.sectionLabel}>BUSINESS</Text>
          {loadingBiz ? (
            <ActivityIndicator color="#3B82F6" size="small" />
          ) : (
            <>
              <Text style={styles.cardName}>{business?.name ?? '—'}</Text>
              {business?.slug ? (
                <Text style={styles.cardMeta}>/{business.slug}</Text>
              ) : null}
            </>
          )}
        </View>
      </View>

      {/* Team section — managers only */}
      {isManager && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Team</Text>
            <TouchableOpacity
              style={styles.addBtn}
              onPress={() => setAddModal(true)}
              activeOpacity={0.8}
            >
              <Plus size={16} color="#fff" />
              <Text style={styles.addBtnText}>Add member</Text>
            </TouchableOpacity>
          </View>

          {loadingMembers ? (
            <ActivityIndicator color="#3B82F6" style={{ marginTop: 16 }} />
          ) : members.length === 0 ? (
            <Text style={styles.empty}>No team members yet.</Text>
          ) : (
            members.map((m) => (
              <View key={m.id} style={styles.memberRow}>
                <View style={styles.memberLeft}>
                  <Text style={styles.memberName}>{m.name}</Text>
                  <Text style={styles.memberMeta}>@{m.userName}</Text>
                </View>
                <View style={[styles.roleBadge, m.role === 'manager' && styles.roleBadgeManager]}>
                  <Text style={[styles.roleText, m.role === 'manager' && styles.roleTextManager]}>
                    {m.role === 'manager' ? 'Manager' : 'Worker'}
                  </Text>
                </View>
              </View>
            ))
          )}
        </View>
      )}

      {/* Sign out */}
      <TouchableOpacity style={styles.logoutBtn} onPress={confirmLogout} activeOpacity={0.8}>
        <LogOut size={18} color="#F87171" />
        <Text style={styles.logoutText}>Sign out</Text>
      </TouchableOpacity>

      {/* Add member modal */}
      <Modal
        visible={addModal}
        transparent
        animationType="slide"
        onRequestClose={() => setAddModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Add Team Member</Text>

            <TextInput
              style={styles.input}
              placeholder="Full name"
              placeholderTextColor="#64748B"
              value={newName}
              onChangeText={setNewName}
              autoCapitalize="words"
              returnKeyType="next"
            />
            <TextInput
              style={styles.input}
              placeholder="Password (min. 8 characters)"
              placeholderTextColor="#64748B"
              value={newPassword}
              onChangeText={setNewPassword}
              secureTextEntry
              returnKeyType="done"
            />

            <Text style={styles.roleLabel}>Role</Text>
            <View style={styles.roleRow}>
              {(['worker', 'manager'] as const).map((r) => (
                <TouchableOpacity
                  key={r}
                  style={[styles.roleOption, newRole === r && styles.roleOptionActive]}
                  onPress={() => setNewRole(r)}
                >
                  <Text style={[styles.roleOptionText, newRole === r && styles.roleOptionTextActive]}>
                    {r === 'manager' ? 'Manager' : 'Worker'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalCancel}
                onPress={() => setAddModal(false)}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalSave, saving && styles.btnDisabled]}
                onPress={handleAddMember}
                disabled={saving}
              >
                {saving ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={styles.modalSaveText}>Add</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0F172A' },
  inner: { padding: 16, gap: 12, paddingBottom: 40 },

  card: {
    backgroundColor: '#1E293B',
    borderRadius: 14,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'flex-start',
    borderWidth: 1,
    borderColor: '#334155',
    gap: 14,
  },
  avatarWrap: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#1E40AF22',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarBiz: { backgroundColor: '#4C1D9522' },
  cardBody: { flex: 1, gap: 2 },
  sectionLabel: { fontSize: 10, fontWeight: '700', color: '#64748B', letterSpacing: 1, marginBottom: 2 },
  cardName: { fontSize: 17, fontWeight: '700', color: '#F8FAFC' },
  cardMeta: { fontSize: 13, color: '#64748B' },
  roleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    alignSelf: 'flex-start',
    backgroundColor: '#1E293B',
    borderWidth: 1,
    borderColor: '#334155',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
    marginTop: 4,
  },
  roleBadgeManager: { borderColor: '#3B82F655', backgroundColor: '#1E40AF22' },
  roleText: { fontSize: 12, color: '#64748B', fontWeight: '600' },
  roleTextManager: { color: '#93C5FD' },

  section: {
    backgroundColor: '#1E293B',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: '#334155',
    gap: 0,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#F8FAFC' },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#3B82F6',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  addBtnText: { color: '#fff', fontWeight: '600', fontSize: 13 },
  empty: { color: '#64748B', fontSize: 14, textAlign: 'center', paddingVertical: 12 },
  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: '#334155',
  },
  memberLeft: { flex: 1, gap: 1 },
  memberName: { fontSize: 15, fontWeight: '600', color: '#F8FAFC' },
  memberMeta: { fontSize: 12, color: '#64748B' },

  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: '#1E293B',
    borderWidth: 1,
    borderColor: '#7F1D1D',
    marginTop: 4,
  },
  logoutText: { color: '#F87171', fontWeight: '600', fontSize: 15 },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: '#1E293B',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 24,
    borderTopWidth: 1,
    borderColor: '#334155',
    gap: 12,
  },
  modalTitle: { fontSize: 18, fontWeight: '800', color: '#F8FAFC', marginBottom: 4 },
  input: {
    backgroundColor: '#0F172A',
    borderWidth: 1,
    borderColor: '#334155',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 13,
    fontSize: 16,
    color: '#F8FAFC',
  },
  roleLabel: { fontSize: 13, color: '#64748B', fontWeight: '600', marginTop: 4 },
  roleRow: { flexDirection: 'row', gap: 10 },
  roleOption: {
    flex: 1,
    paddingVertical: 11,
    borderRadius: 10,
    alignItems: 'center',
    backgroundColor: '#0F172A',
    borderWidth: 1,
    borderColor: '#334155',
  },
  roleOptionActive: { borderColor: '#3B82F6', backgroundColor: '#1E40AF22' },
  roleOptionText: { color: '#64748B', fontWeight: '600', fontSize: 14 },
  roleOptionTextActive: { color: '#93C5FD' },
  modalActions: { flexDirection: 'row', gap: 12, marginTop: 4 },
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
