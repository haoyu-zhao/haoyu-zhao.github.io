'use client';

import { motion } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import { useMessages } from '@/lib/i18n/useMessages';

export interface NewsItem {
    date: string;
    content: string;
}

interface NewsProps {
    items: NewsItem[];
    title?: string;
    id?: string;
}

function formatContent(content: string) {
    return <ReactMarkdown components={{
        p: ({ children }) => <span>{children}</span>,
        a: ({ children, href }) => <a href={href} target="_blank" rel="noopener noreferrer" className="text-accent font-medium hover:underline underline-offset-2">{children}</a>,
        strong: ({ children }) => <strong className="font-semibold text-primary">{children}</strong>,
    }}>{content}</ReactMarkdown>;
}

export default function News({ items, title, id }: NewsProps) {
    const messages = useMessages();
    const resolvedTitle = title || messages.home.news;

    return (
        <motion.section
            id={id}
            className="scroll-mt-28"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.5 }}
        >
            <h2 className="text-2xl font-serif font-bold text-primary mb-4">{resolvedTitle}</h2>
            <div className="space-y-3 max-h-64 overflow-y-auto pr-2">
                {items.map((item, index) => (
                    <div key={index} className="flex items-start space-x-3">
                        <span className="text-[13px] font-medium text-neutral-600 mt-1 w-16 whitespace-nowrap flex-shrink-0">{item.date}</span>
                        <div className="text-base text-neutral-700">{formatContent(item.content)}</div>
                    </div>
                ))}
            </div>
        </motion.section>
    );
}
