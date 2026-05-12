import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { userModel } from "../models/userModel";

// Syncs the local userModel with the logged-in user's Supabase profile
// On sign-in: loads saved profile. If the profile is empty (new account) it pushes current local state to Supabase so nothing is lost
// On sign-out: clears userId so saves stop, but keeps local state intact
export function useProfileSync() {
    const { user, loading: authLoading } = useAuth();
    const [profileLoading, setProfileLoading] = useState(true);

    useEffect(() => {
        // Wait for auth to finish resolving
        if (authLoading) return;

        if (!user) {
            // Logged out — stop persisting but keep local state
            userModel.userId = null;
            setProfileLoading(false);
            return;
        }

        let cancelled = false;

        async function syncProfile() {
            // Load profile from DB
            const hadSavedData = await userModel.loadFromSupabase(user!.id);

            if (cancelled) return;

            // Link model to this user so future changes persist
            userModel.userId = user!.id;

            // New account with no saved data so push whatever the user set locally before signing up
            if (!hadSavedData) {
                userModel.saveToSupabase();
            }

            setProfileLoading(false);
        }

        setProfileLoading(true);
        syncProfile();

        return () => { cancelled = true; };
    }, [user?.id, authLoading]);

    return { loading: authLoading || profileLoading };
}
