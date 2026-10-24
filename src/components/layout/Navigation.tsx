'use client';

import { useState, useEffect, useMemo, useRef, useCallback, type MouseEvent } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Disclosure } from '@headlessui/react';
import { Bars3Icon, XMarkIcon } from '@heroicons/react/24/outline';
import { cn } from '@/lib/utils';
import { ThemeToggle } from '@/components/ui/ThemeToggle';
import LanguageToggle from '@/components/ui/LanguageToggle';
import type { SiteConfig } from '@/lib/config';
import { useLocaleStore } from '@/lib/stores/localeStore';
import { useMessages } from '@/lib/i18n/useMessages';
import type { I18nRuntimeConfig } from '@/types/i18n';

interface NavigationProps {
  items: SiteConfig['navigation'];
  siteTitle: string;
  enableOnePageMode?: boolean;
  i18n: I18nRuntimeConfig;
  itemsByLocale?: Record<string, SiteConfig['navigation']>;
  siteTitleByLocale?: Record<string, string>;
}

export default function Navigation({
  items,
  enableOnePageMode,
  i18n,
  itemsByLocale,
}: NavigationProps) {
  const pathname = usePathname();
  const locale = useLocaleStore((state) => state.locale);
  const [scrolled, setScrolled] = useState(false);
  const [activeHash, setActiveHash] = useState('');
  const [hoveredHref, setHoveredHref] = useState<string | null>(null);
  const messages = useMessages();
  const navContainerRef = useRef<HTMLDivElement>(null);
  const [indicatorStyle, setIndicatorStyle] = useState<{
    left: number;
    width: number;
    top: number;
    height: number;
  } | null>(null);

  const effectiveItems = useMemo(() => {
    if (!i18n.enabled) return items;
    return itemsByLocale?.[locale] || itemsByLocale?.[i18n.defaultLocale] || items;
  }, [i18n.defaultLocale, i18n.enabled, items, itemsByLocale, locale]);

  useEffect(() => {
    const handleScroll = () => {
      const isScrolled = window.scrollY > 20;
      setScrolled(isScrolled);
    };

    handleScroll();
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    if (pathname !== '/') { setActiveHash(''); return; }
    const sectionItems = effectiveItems.filter(item => item.type === 'section' || enableOnePageMode);
    let frame = 0;
    const measure = () => {
      frame = 0;
      const sections = sectionItems.map(item => ({ item, element: document.getElementById(item.target) }))
        .filter(entry => entry.element !== null);
      if (!sections.length) return;
      const marker = (document.querySelector('nav')?.getBoundingClientRect().bottom || 80) + 40;
      let current = sections[0].item.target;
      for (const { item, element } of sections) {
        if (element!.getBoundingClientRect().top <= marker) current = item.target;
      }
      if (window.scrollY + window.innerHeight >= document.documentElement.scrollHeight - 2) {
        current = sections[sections.length - 1].item.target;
      }
      setActiveHash(`#${current}`);
    };
    const schedule = () => { if (!frame) frame = requestAnimationFrame(measure); };
    measure();
    window.addEventListener('scroll', schedule, { passive: true });
    window.addEventListener('resize', schedule);
    window.addEventListener('hashchange', schedule);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('scroll', schedule);
      window.removeEventListener('resize', schedule);
      window.removeEventListener('hashchange', schedule);
    };
  }, [enableOnePageMode, effectiveItems, pathname]);

  const isSection = (item: SiteConfig['navigation'][number]) => item.type === 'section' || enableOnePageMode;
  const isDesktopItemActive = (item: SiteConfig['navigation'][number]) =>
    isSection(item)
      ? pathname === '/' && (activeHash === `#${item.target}` || (!activeHash && item.target === 'about'))
      : (item.href === '/' ? pathname === '/' : pathname.startsWith(item.href));
  const getDesktopItemHref = (item: SiteConfig['navigation'][number]) => isSection(item) ? `/#${item.target}` : item.href;
  const handleItemClick = (event: MouseEvent<HTMLAnchorElement>, item: SiteConfig['navigation'][number]) => {
    if (!isSection(item) || pathname !== '/' || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    const section = document.getElementById(item.target);
    if (!section) return;
    event.preventDefault();
    window.history.pushState(null, '', `#${item.target}`);
    section.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth', block: 'start' });
    setActiveHash(`#${item.target}`);
  };

  const activeItem = effectiveItems.find((item) => isDesktopItemActive(item)) ?? null;
  const activeHref = activeItem ? getDesktopItemHref(activeItem) : null;
  const indicatorHref = hoveredHref ?? activeHref;

  const measureIndicator = useCallback(() => {
    const container = navContainerRef.current;
    if (!container || !indicatorHref) {
      setIndicatorStyle(null);
      return;
    }
    const el = container.querySelector<HTMLElement>(
      `[data-nav-href="${CSS.escape(indicatorHref)}"]`
    );
    if (!el) {
      setIndicatorStyle(null);
      return;
    }
    setIndicatorStyle({
      left: el.offsetLeft,
      width: el.offsetWidth,
      top: el.offsetTop,
      height: el.offsetHeight,
    });
  }, [indicatorHref]);

  useEffect(() => {
    measureIndicator();
  }, [measureIndicator]);

  useEffect(() => {
    window.addEventListener('resize', measureIndicator);
    return () => window.removeEventListener('resize', measureIndicator);
  }, [measureIndicator]);

  return (
    <Disclosure as="nav" className="fixed top-0 left-0 right-0 z-50">
      {({ open }) => (
        <>
          <motion.div
            data-nav-surface
            initial={{ y: -100 }}
            animate={{ y: 0 }}
            transition={{ duration: 0.6 }}
            className={cn(
              'transition-all duration-300 ease-out',
              scrolled
                ? 'bg-background/80 backdrop-blur-xl border-b border-neutral-200/50 shadow-lg'
                : 'bg-transparent'
            )}
          >
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="flex justify-end items-center h-16 lg:h-20">
                <div className="hidden lg:block">
                  <div className="ml-10 flex items-center space-x-3">
                    <div
                      data-nav-items
                      ref={navContainerRef}
                      className="relative flex items-baseline space-x-1"
                      onMouseLeave={() => setHoveredHref(null)}
                    >
                      {indicatorStyle && (
                        <motion.div
                          className={cn(
                            'absolute rounded-lg pointer-events-none',
                            hoveredHref && hoveredHref !== activeHref
                              ? 'bg-accent/[0.07]'
                              : 'bg-accent/10'
                          )}
                          data-nav-indicator
                          initial={false}
                          animate={{
                            left: indicatorStyle.left,
                            width: indicatorStyle.width,
                            top: indicatorStyle.top,
                            height: indicatorStyle.height,
                          }}
                          transition={{
                            type: 'spring',
                            stiffness: 400,
                            damping: 28,
                          }}
                        />
                      )}
                      {effectiveItems.map((item) => {
                        const isActive = isDesktopItemActive(item);
                        const href = getDesktopItemHref(item);

                        return (
                          <Link
                            key={item.target}
                            href={href}
                            data-nav-href={href}
                            data-nav-target={isSection(item) ? item.target : undefined}
                            aria-current={isActive ? (isSection(item) ? "location" : "page") : undefined}
                            prefetch={true}
                            onClick={event => handleItemClick(event, item)}
                            onMouseEnter={() => setHoveredHref(href)}
                            className={cn(
                              'relative px-3 py-2 text-sm font-medium rounded-lg transition-colors duration-150',
                              isActive
                                ? 'text-primary'
                                : hoveredHref === href
                                  ? 'text-primary'
                                  : 'text-neutral-600'
                            )}
                          >
                            {item.title}
                          </Link>
                        );
                      })}
                    </div>
                    <LanguageToggle i18n={i18n} />
                    <ThemeToggle />
                  </div>
                </div>

                <div className="lg:hidden flex items-center space-x-2">
                  <LanguageToggle i18n={i18n} />
                  <ThemeToggle />
                  <Disclosure.Button className="inline-flex items-center justify-center p-2 rounded-md text-neutral-600 hover:text-primary hover:bg-neutral-100 dark:hover:bg-neutral-800 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-accent transition-colors duration-200">
                    <span className="sr-only">{messages.navigation.openMainMenu}</span>
                    <motion.div
                      animate={{ rotate: open ? 180 : 0 }}
                      transition={{ duration: 0.2 }}
                    >
                      {open ? (
                        <XMarkIcon className="block h-6 w-6" aria-hidden="true" />
                      ) : (
                        <Bars3Icon className="block h-6 w-6" aria-hidden="true" />
                      )}
                    </motion.div>
                  </Disclosure.Button>
                </div>
              </div>
            </div>
          </motion.div>

          <AnimatePresence>
            {open && (
              <Disclosure.Panel static>
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.3 }}
                  className="lg:hidden bg-background/95 backdrop-blur-xl border-b border-neutral-200/50 shadow-lg"
                >
                  <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3">
                    {effectiveItems.map((item, index) => {
                      const isActive = isDesktopItemActive(item);
                      const href = getDesktopItemHref(item);

                      return (
                        <motion.div
                          key={item.target}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: index * 0.1 }}
                        >
                          <Disclosure.Button
                            as={Link}
                            href={href}
                            prefetch={true}
                            data-nav-target={isSection(item) ? item.target : undefined}
                            onClick={event => handleItemClick(event, item)}
                            className={cn(
                              'block px-3 py-2 rounded-md text-base font-medium transition-all duration-200',
                              isActive
                                ? 'text-primary bg-accent/10 border-l-4 border-accent'
                                : 'text-neutral-600 hover:text-primary hover:bg-neutral-50'
                            )}
                          >
                            {item.title}
                          </Disclosure.Button>
                        </motion.div>
                      );
                    })}
                  </div>
                </motion.div>
              </Disclosure.Panel>
            )}
          </AnimatePresence>
        </>
      )}
    </Disclosure>
  );
}
