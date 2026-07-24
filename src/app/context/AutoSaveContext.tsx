import React, { createContext, useContext, useRef, ReactNode } from 'react';

interface AutoSaveContextProps {
  registerAutoSave: (callback: () => Promise<void>) => () => void;
  triggerAutoSave: () => Promise<void>;
}

const AutoSaveContext = createContext<AutoSaveContextProps | undefined>(undefined);

export function AutoSaveProvider({ children }: { children: ReactNode }) {
  // Simpan daftar callback auto-save yang aktif
  const autoSaveCallbacks = useRef<Set<() => Promise<void>>>(new Set());

  // Mendaftarkan komponen untuk di-auto-save (contoh: Dasbor PMI / RS)
  const registerAutoSave = (callback: () => Promise<void>) => {
    autoSaveCallbacks.current.add(callback);
    return () => {
      autoSaveCallbacks.current.delete(callback);
    };
  };

  // Menjalankan semua auto-save yang terdaftar (dipanggil saat Navbar klik Logout)
  const triggerAutoSave = async () => {
    const promises = Array.from(autoSaveCallbacks.current).map(cb => cb());
    await Promise.allSettled(promises);
  };

  return (
    <AutoSaveContext.Provider value={{ registerAutoSave, triggerAutoSave }}>
      {children}
    </AutoSaveContext.Provider>
  );
}

export function useAutoSave() {
  const context = useContext(AutoSaveContext);
  if (!context) {
    throw new Error('useAutoSave harus digunakan di dalam AutoSaveProvider');
  }
  return context;
}
