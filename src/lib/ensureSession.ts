import { api } from './api';

export async function ensureSession() {
  const { data } = await api.auth.session();
  if (data?.user) return;

  // dev creds; adjust or replace with your login UI
  const email = 'dev@example.com';
  const password = 'devdev123';

  await api.auth.signup({ email, password }); // harmless if already exists
  await api.auth.signin({ email, password });
}
