'use client';

import { useEffect } from 'react';
import { motion } from 'framer-motion';
import { SunIcon, MoonIcon } from '@heroicons/react/24/outline';
import { useThemeStore, resolveTheme } from '@/lib/stores/themeStore';

export function ThemeToggle() {
  const { theme, setTheme } = useThemeStore();
  const dark = theme === 'dark';
  const label = dark ? 'Switch to light mode' : 'Switch to dark mode';

  useEffect(() => {
    if (theme === 'system') setTheme(resolveTheme(theme));
  }, [theme, setTheme]);

  return (
    <motion.button
      type="button"
      data-action="theme"
      data-theme-mode={dark ? 'dark' : 'light'}
      title={label}
      aria-label={label}
      aria-pressed={dark}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: .95 }}
      onClick={() => setTheme(dark ? 'light' : 'dark')}
      className="flex items-center justify-center w-10 h-10 rounded-lg border border-neutral-200 bg-background hover:bg-neutral-50 dark:border-[rgba(148,163,184,0.24)] dark:bg-neutral-800 dark:hover:bg-neutral-700 transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/50 text-neutral-600 hover:text-primary dark:text-neutral-600 dark:hover:text-white"
    >
      <span data-theme-icon="light" hidden={dark}><SunIcon aria-hidden="true" className="h-5 w-5" /></span>
      <span data-theme-icon="dark" hidden={!dark}><MoonIcon aria-hidden="true" className="h-5 w-5" /></span>
    </motion.button>
  );
}
