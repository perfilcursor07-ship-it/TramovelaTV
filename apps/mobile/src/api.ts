import Constants from 'expo-constants';
import * as SecureStore from 'expo-secure-store';
import { createApi } from '@novelas/shared';

/**
 * Mesmo cliente HTTP usado no web (packages/shared).
 * No celular, "localhost" é o próprio aparelho: use o IP da sua máquina em app.json > extra.apiUrl.
 */
const baseUrl: string = (Constants.expoConfig?.extra as any)?.apiUrl ?? 'http://localhost:3333';

export const TOKEN_KEY = 'tnv_token';

export const api = createApi({
  baseUrl,
  getToken: () => SecureStore.getItemAsync(TOKEN_KEY),
  onUnauthorized: () => SecureStore.deleteItemAsync(TOKEN_KEY),
});
