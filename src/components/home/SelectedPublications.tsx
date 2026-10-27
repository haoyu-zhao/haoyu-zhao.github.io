'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import Image from 'next/image';
import { Publication } from '@/types/publication';
import PublicationDetails from '@/components/publications/PublicationDetails';
import { useMessages } from '@/lib/i18n/useMessages';

interface SelectedPublicationsProps {
    publications: Publication[];
    title?: string;
    id?: string;
    googleScholar?: string;
    enableOnePageMode?: boolean;
}

export default function SelectedPublications({ publications, title, id, googleScholar, enableOnePageMode = false }: SelectedPublicationsProps) {
    const messages = useMessages();
    const resolvedTitle = title || messages.home.selectedPublications;

    const orderedPublications = [...publications].sort((a, b) =>
        (a.displayOrder ?? a.sourceOrder ?? Infinity) - (b.displayOrder ?? b.sourceOrder ?? Infinity)
    );

    const getPaperLink = (pub: Publication): string | undefined => {
        if (pub.url) return pub.url;
        if (pub.doi) return `https://doi.org/${pub.doi}`;
        if (pub.arxivId) return `https://arxiv.org/abs/${pub.arxivId}`;
        return undefined;
    };

    const renderPublication = (pub: Publication, index: number) => {
        const paperLink = getPaperLink(pub);

        return (
            <motion.div
                key={pub.id}
                data-publication-id={pub.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.1 * index }}
                className="bg-neutral-50 dark:bg-neutral-800 p-4 rounded-lg shadow-sm border border-neutral-200 dark:border-[rgba(148,163,184,0.24)] hover:shadow-lg transition-all duration-200 hover:scale-[1.02]"
            >
                <PublicationDetails publication={pub}>
                {({ abstractButton, bibtexButton }) => (
                <div className="flex flex-col sm:flex-row items-center gap-5">
                    {pub.preview && (
                        <div className="w-full sm:w-48 h-40 sm:h-36 flex-shrink-0 relative rounded-md overflow-hidden bg-white">
                            <Image
                                src={`/images/${pub.preview}`}
                                alt={pub.title}
                                fill
                                sizes="(min-width: 640px) 192px, 100vw"
                                className="object-contain"
                            />
                        </div>
                    )}
                    <div className="w-full flex-1 min-w-0">
                        <h3 className="font-semibold text-primary mb-2 leading-tight">
                            {paperLink ? (
                                <a
                                    href={paperLink}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="hover:text-accent transition-colors"
                                >
                                    {pub.title}
                                </a>
                            ) : (
                                pub.title
                            )}
                        </h3>
                        <p className="text-[15px] leading-relaxed text-neutral-600 mb-1">
                            {pub.authors.map((author, idx) => (
                                <span key={idx}>
                                    <span className={`${author.isHighlighted ? 'font-semibold text-accent' : ''} ${author.isCoAuthor ? `underline underline-offset-4 ${author.isHighlighted ? 'decoration-accent' : 'decoration-neutral-400'}` : ''}`}>
                                        {author.name}
                                    </span>
                                    {author.isMainAuthor && (
                                        <sup className={`ml-0 ${author.isHighlighted ? 'text-accent' : 'text-neutral-600'}`}>^</sup>
                                    )}
                                    {author.isCorresponding && (
                                        <sup className={`ml-0 ${author.isHighlighted ? 'text-accent' : 'text-neutral-600'}`}>*</sup>
                                    )}
                                    {idx < pub.authors.length - 1 && ', '}
                                </span>
                            ))}
                        </p>
                        <p className="text-[15px] leading-relaxed text-neutral-600 mb-2">
                            {(pub.journal || pub.conference) && (
                                <span className="italic">
                                    {pub.journal || pub.conference}{pub.year && `, ${pub.year}`}
                                </span>
                            )}
                            {pub.description && <span className={pub.journal || pub.conference ? 'text-accent' : 'italic'}> {pub.description}</span>}
                        </p>
                        <div className="flex flex-wrap gap-2">
                            {abstractButton}
                            {pub.url && (
                                <a
                                    href={pub.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center px-2 py-1 rounded text-[13px] font-medium bg-neutral-200 dark:bg-neutral-700 text-neutral-700 dark:text-neutral-300 hover:bg-accent hover:text-white transition-colors"
                                >
                                    Paper
                                </a>
                            )}
                            {pub.huggingface && (
                                <a
                                    href={pub.huggingface}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center px-2 py-1 rounded text-[13px] font-medium bg-neutral-200 dark:bg-neutral-700 text-neutral-700 dark:text-neutral-300 hover:bg-accent hover:text-white transition-colors"
                                >
                                    Daily Paper
                                </a>
                            )}
                            {pub.project && (
                                <a
                                    href={pub.project}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center px-2 py-1 rounded text-[13px] font-medium bg-neutral-200 dark:bg-neutral-700 text-neutral-700 dark:text-neutral-300 hover:bg-accent hover:text-white transition-colors"
                                >
                                    Project Page
                                </a>
                            )}
                            {pub.media && (
                                <a
                                    href={pub.media}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center px-2 py-1 rounded text-[13px] font-medium bg-neutral-200 dark:bg-neutral-700 text-neutral-700 dark:text-neutral-300 hover:bg-accent hover:text-white transition-colors"
                                >
                                    Media Coverage{pub.mediaLabel && ` · ${pub.mediaLabel}`}
                                </a>
                            )}
                            {pub.code && (
                                <a
                                    href={pub.code}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center px-2 py-1 rounded text-[13px] font-medium bg-neutral-200 dark:bg-neutral-700 text-neutral-700 dark:text-neutral-300 hover:bg-accent hover:text-white transition-colors"
                                >
                                    Code
                                </a>
                            )}
                            {pub.dataset && (
                                <a
                                    href={pub.dataset}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center px-2 py-1 rounded text-[13px] font-medium bg-neutral-200 dark:bg-neutral-700 text-neutral-700 dark:text-neutral-300 hover:bg-accent hover:text-white transition-colors"
                                >
                                    Dataset
                                </a>
                            )}
                            {pub.weights && (
                                <a
                                    href={pub.weights}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center px-2 py-1 rounded text-[13px] font-medium bg-neutral-200 dark:bg-neutral-700 text-neutral-700 dark:text-neutral-300 hover:bg-accent hover:text-white transition-colors"
                                >
                                    Weights
                                </a>
                            )}
                            {pub.benchmark && (
                                <a
                                    href={pub.benchmark}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center px-2 py-1 rounded text-[13px] font-medium bg-neutral-200 dark:bg-neutral-700 text-neutral-700 dark:text-neutral-300 hover:bg-accent hover:text-white transition-colors"
                                >
                                    Benchmark
                                </a>
                            )}
                            {pub.demo && (
                                <a
                                    href={pub.demo}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center px-2 py-1 rounded text-[13px] font-medium bg-neutral-200 dark:bg-neutral-700 text-neutral-700 dark:text-neutral-300 hover:bg-accent hover:text-white transition-colors"
                                >
                                    Demo
                                </a>
                            )}
                            {pub.pdfUrl && (
                                <a
                                    href={pub.pdfUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center px-2 py-1 rounded text-[13px] font-medium bg-neutral-200 dark:bg-neutral-700 text-neutral-700 dark:text-neutral-300 hover:bg-accent hover:text-white transition-colors"
                                >
                                    PDF
                                </a>
                            )}
                            {pub.doi && (
                                <a
                                    href={`https://doi.org/${pub.doi}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center px-2 py-1 rounded text-[13px] font-medium bg-neutral-200 dark:bg-neutral-700 text-neutral-700 dark:text-neutral-300 hover:bg-accent hover:text-white transition-colors"
                                >
                                    DOI
                                </a>
                            )}
                            {pub.eprint && !pub.arxivId && (
                                <a
                                    href={`https://arxiv.org/abs/${pub.eprint.replace('arXiv:', '')}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center px-2 py-1 rounded text-[13px] font-medium bg-neutral-200 dark:bg-neutral-700 text-neutral-700 dark:text-neutral-300 hover:bg-accent hover:text-white transition-colors"
                                >
                                    arXiv
                                </a>
                            )}
                            {bibtexButton}
                        </div>
                    </div>
                </div>
                )}
                </PublicationDetails>
            </motion.div>
        );
    };

    return (
        <motion.section
            id={id}
            className="scroll-mt-28"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
        >
            <div className="flex flex-wrap items-baseline justify-between gap-4 mb-4" data-publications-heading>
                <h2 className="text-2xl font-serif font-bold text-primary">{resolvedTitle}</h2>
                <div className="flex items-center gap-5 shrink-0" data-publication-actions>
                    {googleScholar && <a data-scholar-link href={googleScholar} target="_blank" rel="noopener noreferrer" className="text-sm text-accent font-medium hover:underline underline-offset-4">Google Scholar ↗</a>}
                    <Link
                        href={enableOnePageMode ? "/#publications" : "/publications"}
                        prefetch={true}
                        className="text-accent hover:text-accent-dark text-sm font-medium transition-all duration-200 rounded hover:bg-accent/10 hover:shadow-sm"
                    >
                        {messages.home.viewAll} →
                    </Link>
                </div>
            </div>

            <div className="space-y-4" data-selected-publications>
                {orderedPublications.map(renderPublication)}
            </div>
        </motion.section>
    );
}
