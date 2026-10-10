import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { useState } from 'react';
import { useRouter } from 'expo-router';
import { useAuth } from '@/context/AuthContext';
import { Alert } from '@/lib/alert';
import { API_BASE_URL } from '@/lib/api';

export default function LoginScreen() {
  const { login } = useAuth();
  const router = useRouter();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleLogin() {
    if (!identifier.trim() || !password.trim()) {
      Alert.alert('Missing fields', 'Please enter your username/email and password.');
      return;
    }

    setLoading(true);
    try {
      await login(identifier.trim(), password);
      // Navigation is handled by the Guard in _layout.tsx
    } catch (err: unknown) {
      const response = (err as { response?: { data?: { message?: string } } })?.response;
      const msg = response
        ? (response.data?.message ?? 'Invalid credentials. Please try again.')
        : `Can't reach the server at ${API_BASE_URL}. Check that the backend is running and your phone is on the same Wi-Fi.`;
      Alert.alert('Login failed', Array.isArray(msg) ? msg.join('\n') : msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.inner}>
        <Text style={styles.logo}>📦 LazyTracker</Text>
        <Text style={styles.subtitle}>Stock management, simplified.</Text>

        <View style={styles.form}>
          <TextInput
            style={styles.input}
            placeholder="Email or username"
            placeholderTextColor="#64748B"
            value={identifier}
            onChangeText={setIdentifier}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="email-address"
            returnKeyType="next"
          />
          <TextInput
            style={styles.input}
            placeholder="Password"
            placeholderTextColor="#64748B"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            returnKeyType="done"
            onSubmitEditing={handleLogin}
          />

          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handleLogin}
            disabled={loading}
            activeOpacity={0.8}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>Sign in</Text>
            )}
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={styles.registerLink}
          onPress={() => router.push('/(auth)/register')}
          activeOpacity={0.7}
        >
          <Text style={styles.registerLinkText}>
            New business?{' '}
            <Text style={styles.registerLinkBold}>Create an account</Text>
          </Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F172A',
  },
  inner: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
    gap: 0,
  },
  logo: {
    fontSize: 32,
    fontWeight: '800',
    color: '#F8FAFC',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 15,
    color: '#94A3B8',
    textAlign: 'center',
    marginBottom: 40,
  },
  form: {
    gap: 12,
  },
  input: {
    backgroundColor: '#1E293B',
    borderWidth: 1,
    borderColor: '#334155',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: '#F8FAFC',
  },
  button: {
    backgroundColor: '#3B82F6',
    borderRadius: 12,
    paddingVertical: 15,
    alignItems: 'center',
    marginTop: 8,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  registerLink: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  registerLinkText: {
    color: '#64748B',
    fontSize: 14,
  },
  registerLinkBold: {
    color: '#3B82F6',
    fontWeight: '700',
  },
});
