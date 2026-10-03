import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { userModel } from '../models/userModel';

// Derive loading from the identity actually hydrated, rather than setting
// loading synchronously in an effect on every authentication transition.
export function useProfileSync() {
  const { user, loading: authLoading } = useAuth();
  const [loadedUserId, setLoadedUserId] = useState<string | null>(null);
  const userId = user?.id ?? null;
  useEffect(() => {
    if (authLoading) return;
    userModel.userId = null;
    if (!userId) return;
    let cancelled = false;
    async function syncProfile() {
      const hadSavedData = await userModel.loadFromSupabase(userId!);
      if (cancelled) return;
      userModel.userId = userId;
      if (!hadSavedData) userModel.saveToSupabase();
      setLoadedUserId(userId);
    }
    void syncProfile();
    return () => { cancelled = true; };
  }, [userId, authLoading]);
  return { loading: authLoading || (userId !== null && loadedUserId !== userId) };
}
