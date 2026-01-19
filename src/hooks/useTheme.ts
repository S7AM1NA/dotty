import { useEffect, useState } from 'react';
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

type ThemeMode = 'light' | 'dark' | 'system';

interface ThemeState {
    mode: ThemeMode;
    setMode: (mode: ThemeMode) => void;
}

// Store for persisting theme preference
export const useThemeStore = create<ThemeState>()(
    persist(
        (set) => ({
            mode: 'system',
            setMode: (mode: ThemeMode) => set({ mode }),
        }),
        {
            name: 'dotty-theme',
            storage: createJSONStorage(() => localStorage),
        }
    )
);

// Hook to manage theme and apply it to the document
export function useTheme() {
    const { mode, setMode } = useThemeStore();
    const [isDark, setIsDark] = useState(false);

    useEffect(() => {
        const updateTheme = () => {
            let shouldBeDark = false;

            if (mode === 'system') {
                shouldBeDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
            } else {
                shouldBeDark = mode === 'dark';
            }

            setIsDark(shouldBeDark);

            if (shouldBeDark) {
                document.documentElement.classList.add('dark');
            } else {
                document.documentElement.classList.remove('dark');
            }
        };

        updateTheme();

        // Listen for system theme changes
        const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
        const handleChange = () => {
            if (mode === 'system') {
                updateTheme();
            }
        };

        mediaQuery.addEventListener('change', handleChange);
        return () => mediaQuery.removeEventListener('change', handleChange);
    }, [mode]);

    const toggleTheme = () => {
        // Toggle between light and dark (skip system)
        setMode(isDark ? 'light' : 'dark');
    };

    return {
        mode,
        setMode,
        isDark,
        toggleTheme,
    };
}
