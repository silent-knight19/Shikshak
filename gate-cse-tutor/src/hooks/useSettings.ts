import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../firebase/auth';
import { getUserSettings, saveUserSettings } from '../firebase/db';
import type { Settings } from '../store/types';
import { DEFAULT_SETTINGS } from '../store/types';

export function useSettings() {
  const { user } = useAuth();
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setSettings(DEFAULT_SETTINGS);
      setLoading(false);
      return;
    }
    getUserSettings(user.uid).then((s) => {
      if (s) setSettings({ ...DEFAULT_SETTINGS, ...s });
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [user]);

  const saveSettings = useCallback(async (s: Settings) => {
    if (!user) return;
    setSettings(s);
    await saveUserSettings(user.uid, s);
  }, [user]);

  return { settings, saveSettings, loading };
}
