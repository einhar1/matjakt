export function validateSupabaseEnvironment(url: string | undefined, key: string | undefined) {
  if (!url || !key) throw new Error('Supabase configuration missing. Run npm run env:local or set the VITE_SUPABASE variables.');
  const parsed = new URL(url);
  if (!['http:', 'https:'].includes(parsed.protocol)) throw new Error('Supabase URL must use HTTP or HTTPS.');
  if (key.startsWith('sb_secret_')) throw new Error('A Supabase secret key must never be used in the browser.');
  // Legacy JWT keys may be used locally, but a service-role JWT must not be bundled.
  if (key.split('.').length === 3) {
    try {
      const payload = JSON.parse(atob(key.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
      if (payload.role === 'service_role') throw new Error('A Supabase service-role key must never be used in the browser.');
    } catch (error) {
      if (error instanceof Error && error.message.includes('service-role')) throw error;
      throw new Error('Invalid Supabase legacy key.', { cause: error });
    }
  }
  return { url, key };
}
