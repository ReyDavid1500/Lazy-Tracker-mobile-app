import * as SecureStore from 'expo-secure-store';

// Native: encrypted keychain/keystore. Web uses storage.web.ts instead.
export const storage = {
  getItem: (key: string) => SecureStore.getItemAsync(key),
  setItem: (key: string, value: string) => SecureStore.setItemAsync(key, value),
  removeItem: (key: string) => SecureStore.deleteItemAsync(key),
};
