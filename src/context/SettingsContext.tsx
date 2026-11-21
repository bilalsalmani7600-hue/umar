import React, { createContext, useContext, useState, useEffect } from 'react';
import { sound } from '@/lib/soundEngine';
import { getSupabaseCredentials } from '@/lib/supabase';

interface SettingsContextType {
  counterId: string;
  setCounterId: (id: string) => void;
  isDarkMode: boolean;
  setIsDarkMode: (val: boolean) => void;
  soundEnabled: boolean;
  setSoundEnabled: (val: boolean) => void;
  isOnline: boolean;
  isSupabaseConnected: boolean;
  setSupabaseConnected: (val: boolean) => void;
  autoPrintReceipt: boolean;
  setAutoPrintReceipt: (val: boolean) => void;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export const SettingsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [counterId, setCounterId] = useState<string>(() => {
    return localStorage.getItem('pos_counter_id') || 'Counter 1';
  });

  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    const saved = localStorage.getItem('pos_dark_mode');
    return saved !== null ? saved === 'true' : true; // Default to dark mode as shown in screenshot
  });

  const [soundEnabled, setSoundEnabledState] = useState<boolean>(() => {
    const saved = localStorage.getItem('pos_sound_enabled');
    return saved !== null ? saved === 'true' : true;
  });

  const [autoPrintReceipt, setAutoPrintReceipt] = useState<boolean>(() => {
    return localStorage.getItem('pos_auto_print') === 'true';
  });

  const [isOnline, setIsOnline] = useState<boolean>(navigator.onLine);
  const [isSupabaseConnected, setSupabaseConnected] = useState<boolean>(() => {
    return getSupabaseCredentials().isConfigured;
  });

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  useEffect(() => {
    localStorage.setItem('pos_counter_id', counterId);
  }, [counterId]);

  useEffect(() => {
    localStorage.setItem('pos_dark_mode', String(isDarkMode));
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);

  useEffect(() => {
    localStorage.setItem('pos_sound_enabled', String(soundEnabled));
    sound.setSoundEnabled(soundEnabled);
  }, [soundEnabled]);

  useEffect(() => {
    localStorage.setItem('pos_auto_print', String(autoPrintReceipt));
  }, [autoPrintReceipt]);

  const setSoundEnabled = (val: boolean) => {
    setSoundEnabledState(val);
    sound.setSoundEnabled(val);
  };

  return (
    <SettingsContext.Provider
      value={{
        counterId,
        setCounterId,
        isDarkMode,
        setIsDarkMode,
        soundEnabled,
        setSoundEnabled,
        isOnline,
        isSupabaseConnected,
        setSupabaseConnected,
        autoPrintReceipt,
        setAutoPrintReceipt,
      }}
    >
      {children}
    </SettingsContext.Provider>
  );
};

export const useSettings = () => {
  const context = useContext(SettingsContext);
  if (!context) throw new Error('useSettings must be used within SettingsProvider');
  return context;
};

