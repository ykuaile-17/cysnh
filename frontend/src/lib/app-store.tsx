import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from './db';
import { Profile, UISettings, ModuleToggle } from './types';

interface PinSettings {
  enabled: boolean;
  code: string;
}

interface AppState {
  profile: Profile | undefined;
  ui: UISettings;
  modules: ModuleToggle;
  pin: PinSettings;
  loading: boolean;
  updateProfile: (p: Partial<Profile>) => void;
  updateUI: (u: Partial<UISettings>) => void;
  updateModules: (m: Partial<ModuleToggle>) => void;
  updatePin: (p: Partial<PinSettings>) => void;
}

const Ctx = createContext<AppState | null>(null);

const defaultUI: UISettings = { theme: 'system', hideAmount: false, hideSpoiler: false };
const defaultModules: ModuleToggle = { games: true, stars: true, novels: true, merch: true };
const defaultPin: PinSettings = { enabled: false, code: '' };

export function AppProvider({ children }: { children: ReactNode }) {
  const profileRow = useLiveQuery(() => db.settings.get('profile'), [], undefined);
  const uiRow = useLiveQuery(() => db.settings.get('ui'), [], undefined);
  const modulesRow = useLiveQuery(() => db.settings.get('modules'), [], undefined);
  const pinRow = useLiveQuery(() => db.settings.get('pin'), [], undefined);

  const loading =
    profileRow === undefined || uiRow === undefined || modulesRow === undefined || pinRow === undefined;

  const update = useCallback(async (key: string, value: any) => {
    await db.settings.put({ key, value });
  }, []);

  const state: AppState = {
    profile: profileRow?.value,
    ui: uiRow?.value ?? defaultUI,
    modules: modulesRow?.value ?? defaultModules,
    pin: pinRow?.value ?? defaultPin,
    loading,
    updateProfile: (p) => update('profile', { ...(profileRow?.value ?? {}), ...p }),
    updateUI: (u) => update('ui', { ...(uiRow?.value ?? defaultUI), ...u }),
    updateModules: (m) => update('modules', { ...(modulesRow?.value ?? defaultModules), ...m }),
    updatePin: (p) => update('pin', { ...(pinRow?.value ?? defaultPin), ...p }),
  };

  // 应用主题
  useEffect(() => {
    const apply = () => {
      const theme = state.ui.theme;
      const dark = theme === 'dark' || (theme === 'system' &&
        window.matchMedia('(prefers-color-scheme: dark)').matches);
      document.documentElement.classList.toggle('dark', dark);
    };
    apply();
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    mq.addEventListener('change', apply);
    return () => mq.removeEventListener('change', apply);
  }, [state.ui.theme]);

  return <Ctx.Provider value={state}>{children}</Ctx.Provider>;
}

export function useApp() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}
