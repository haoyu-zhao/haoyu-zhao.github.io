'use client';

import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import Image from 'next/image';
import type { SiteConfig } from '@/lib/config';
import { useMessages } from '@/lib/i18n/useMessages';
import BrandIcon from '@/components/ui/BrandIcon';

interface ProfileProps {
    author: SiteConfig['author'];
    social: SiteConfig['social'];
    features: SiteConfig['features'];
    researchInterests?: string[];
}
type Contact = 'email' | 'location';

export default function Profile({ author, social }: ProfileProps) {
    const messages = useMessages();
    const [open, setOpen] = useState<Contact | null>(null);
    const [pinned, setPinned] = useState<Contact | null>(null);
    const contacts = useRef<HTMLDivElement>(null);
    const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
    const mapUrl = social.location_url || `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(social.location || '')}`;

    useEffect(() => {
        const dismiss = (event: PointerEvent) => {
            if (!contacts.current?.contains(event.target as Node)) { setOpen(null); setPinned(null); }
        };
        const escape = (event: KeyboardEvent) => {
            if (event.key === 'Escape') { setOpen(null); setPinned(null); }
        };
        document.addEventListener('pointerdown', dismiss);
        document.addEventListener('keydown', escape);
        return () => {
            document.removeEventListener('pointerdown', dismiss);
            document.removeEventListener('keydown', escape);
            if (closeTimer.current) clearTimeout(closeTimer.current);
        };
    }, []);

    const reveal = (kind: Contact) => {
        if (closeTimer.current) clearTimeout(closeTimer.current);
        if (!pinned || pinned === kind) setOpen(kind);
    };
    const hide = () => {
        if (!pinned) closeTimer.current = setTimeout(() => setOpen(null), 120);
    };
    const socialLinks = [
        { name: 'Google Scholar', href: social.google_scholar, icon: 'ai ai-google-scholar' },
        { name: 'ORCID', href: social.orcid, icon: 'ai ai-orcid' },
        { name: 'GitHub', href: social.github, icon: 'fa-brands fa-github' },
        { name: 'LinkedIn', href: social.linkedin, icon: 'fa-brands fa-linkedin' },
        { name: 'X (Twitter)', href: social.twitter, brand: 'x' as const },
        { name: '小红书', href: social.xiaohongshu, brand: 'xiaohongshu' as const },
        { name: 'Hugging Face', href: social.huggingface, brand: 'huggingface' as const },
    ].filter(link => link.href);

    return (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }} className="sticky top-28" data-profile>
            <div className="w-64 h-64 mx-auto mb-6 rounded-2xl overflow-hidden shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-105">
                <Image src={author.avatar} alt={author.name} width={256} height={256} className="w-full h-full object-cover object-[32%_center]" priority />
            </div>

            <div className="text-center mb-2" data-profile-heading>
                <h1 className="text-3xl font-serif font-bold text-primary mb-2">{author.name}</h1>
                {author.name_zh && <p lang="zh" className="text-xl text-primary mb-2" data-chinese-name>{author.name_zh}</p>}
                <p className="text-lg text-accent font-medium mb-1">{author.title}</p>
                <p className="text-neutral-600">{author.institution}</p>
            </div>

            <div ref={contacts} className="flex flex-wrap items-center justify-center gap-0 sm:gap-2 lg:gap-0 xl:gap-1 mb-6 relative" data-contacts>
                {(['email', 'location'] as const).map(kind => {
                    if (kind === 'email' ? !social.email : !social.location) return null;
                    const label = kind === 'email' ? messages.profile.email : messages.profile.location;
                    const icon = kind === 'email' ? 'fa-envelope' : 'fa-location-dot';
                    const visible = open === kind || pinned === kind;
                    return (
                        <div key={kind} className="relative" data-contact={kind} onMouseEnter={() => reveal(kind)} onMouseLeave={hide}
                            onFocus={() => reveal(kind)} onBlur={event => { if (!event.currentTarget.contains(event.relatedTarget)) hide(); }}>
                            <button type="button" data-contact-trigger={kind} aria-label={label} aria-expanded={visible} aria-controls={`contact-${kind}`}
                                onClick={() => { const next = pinned === kind ? null : kind; setPinned(next); setOpen(next); }}
                                className={`flex items-center justify-center p-1.5 text-xl transition-colors duration-200 ${pinned === kind ? 'text-accent' : 'text-neutral-600 dark:text-neutral-600 hover:text-accent'}`}>
                                <i aria-hidden="true" className={`contact-icon fa-solid ${icon}`} />
                            </button>
                            <motion.div id={`contact-${kind}`} data-contact-popup={kind} role="dialog" aria-label={label} hidden={!visible}
                                initial={false} animate={visible ? { opacity: 1, y: 0, scale: 1 } : { opacity: 0, y: 10, scale: .8 }} transition={{ duration: .18 }}
                                className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 bg-neutral-800 text-white px-4 py-3 rounded-lg text-sm font-medium shadow-lg z-20">
                                <div className="text-center">
                                    <div className="flex items-center justify-center gap-2 mb-1">
                                        <p className="font-semibold">{kind === 'email' ? label : messages.profile.workAddress}</p>
                                    </div>
                                    {kind === 'email' ? (
                                        <a href={`mailto:${social.email}`} className="break-words text-white underline underline-offset-4 hover:text-accent">{social.email}</a>
                                    ) : (
                                        <>
                                            {social.location_details?.map((line, i) => <p key={i} className="break-words">{line}</p>)}
                                            <div className="mt-2">
                                                <a href={mapUrl} target="_blank" rel="noopener noreferrer"
                                                    className="inline-flex items-center justify-center gap-2 bg-accent hover:bg-accent-dark text-white px-3 py-1 rounded-md text-xs font-medium transition-colors duration-200">
                                                    <i aria-hidden="true" className="contact-icon fa-solid fa-location-dot" />
                                                    <span>{messages.profile.googleMap}</span>
                                                </a>
                                            </div>
                                        </>
                                    )}
                                </div>
                                <div className="absolute top-full left-1/2 -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-neutral-800" />
                            </motion.div>
                        </div>
                    );
                })}
                {socialLinks.map(link => (
                    <a key={link.name} href={link.href} target="_blank" rel="noopener noreferrer" className="flex items-center justify-center p-1.5 text-xl text-neutral-600 dark:text-neutral-600 hover:text-accent transition-colors duration-200" aria-label={link.name} title={link.name}>
                        {link.brand ? <BrandIcon name={link.brand} /> : <i aria-hidden="true" className={`contact-icon ${link.icon}`} />}
                    </a>
                ))}
            </div>

        </motion.div>
    );
}
