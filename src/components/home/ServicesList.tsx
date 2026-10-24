'use client';

import { motion } from 'framer-motion';

interface ServiceItem {
    title: string;
    subtitle?: string;
    date?: string;
    content?: string;
    tags?: string[];
}

interface ServicesListProps {
    items: ServiceItem[];
    title?: string;
    description?: string;
}

export default function ServicesList({ items, title, description }: ServicesListProps) {
    return (
        <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.5 }}
        >
            <h2 className="text-2xl font-serif font-bold text-primary mb-2">{title}</h2>
            {description && (
                <p className="text-neutral-600 dark:text-neutral-500 mb-6">{description}</p>
            )}
            
            <div className="mb-6">
                <h3 className="text-lg font-semibold text-primary mb-3">Conference Reviewer</h3>
                <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {items.filter(item => item.title !== 'Conference Reviewer' && item.title !== 'Journal Reviewer').map((item, index) => (
                        <li key={index} className="text-neutral-700 dark:text-neutral-300">
                            {item.title} ({item.subtitle})
                        </li>
                    ))}
                </ul>
            </div>
            
            <div>
                <h3 className="text-lg font-semibold text-primary mb-3">Journal Reviewer</h3>
                <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {items.filter(item => item.title === 'Journal Reviewer').map((item, index) => (
                        <li key={index} className="text-neutral-700 dark:text-neutral-300">
                            {item.title} ({item.subtitle})
                        </li>
                    ))}
                </ul>
            </div>
        </motion.section>
    );
}
