'use client';

import { ReactNode, useEffect, useId, useState } from 'react';
import { Publication } from '@/types/publication';
import { copyToClipboard } from '@/lib/copyToClipboard';

interface PublicationDetailsProps {
  publication: Publication;
  children: (controls: { abstractButton: ReactNode; bibtexButton: ReactNode }) => ReactNode;
}

// Like the reference homepage, each paper has independently collapsible details.
export default function PublicationDetails({ publication, children }: PublicationDetailsProps) {
  const [open, setOpen] = useState<'abstract' | 'bibtex' | null>(null);
  const [copyState, setCopyState] = useState<'idle' | 'copying' | 'success' | 'error'>('idle');
  const id = useId();
  useEffect(() => {
    if (copyState !== 'success') return;
    const timer = window.setTimeout(() => setCopyState('idle'), 2500);
    return () => window.clearTimeout(timer);
  }, [copyState]);

  const copy = async () => {
    if (!publication.bibtex) return;
    setCopyState('copying');
    setCopyState(await copyToClipboard(publication.bibtex) ? 'success' : 'error');
  };
  const toggle = (kind: 'abstract' | 'bibtex', label: string) => (
    <button
      type="button"
      id={`${id}-${kind}-button`}
      data-action="publication-detail"
      data-detail={kind}
      aria-label={`${label === 'Abs' ? 'Abstract' : 'BibTeX'}: ${publication.title}`}
      aria-controls={`${id}-${kind}`}
      aria-expanded={open === kind}
      onClick={() => { setOpen(current => current === kind ? null : kind); setCopyState('idle'); }}
      className="publication-detail-toggle inline-flex items-center px-2 py-1 rounded text-[13px] font-medium bg-neutral-200 text-neutral-700 hover:bg-accent hover:text-white transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
    >{label}</button>
  );

  return (
    <div data-publication-details>
      {children({
        abstractButton: publication.abstract ? toggle('abstract', 'Abs') : null,
        bibtexButton: publication.bibtex ? toggle('bibtex', 'Bib') : null,
      })}
      {publication.abstract && (
        <section id={`${id}-abstract`} data-publication-panel="abstract" hidden={open !== 'abstract'} aria-labelledby={`${id}-abstract-button`} className="publication-detail-panel">
          <div className="publication-detail-header">
            <span className="publication-detail-label">Abstract</span>
          </div>
          <p className="text-[15px] leading-relaxed text-neutral-700 whitespace-pre-line break-words">{publication.abstract}</p>
        </section>
      )}
      {publication.bibtex && (
        <section id={`${id}-bibtex`} data-publication-panel="bibtex" hidden={open !== 'bibtex'} aria-labelledby={`${id}-bibtex-button`} className="publication-detail-panel">
          <div className="publication-detail-header">
            <span className="publication-detail-label">BibTeX</span>
            <button type="button" className="bibtex-copy" data-action="copy-bibtex" data-copy-state={copyState} aria-label={`Copy BibTeX for ${publication.title}`} disabled={copyState === 'copying'} onClick={copy}>
              <svg data-copy-icon="copy" aria-hidden="true" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><rect x="8" y="8" width="12" height="13" rx="2" /><path d="M16 8V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h3" /></svg>
              <svg data-copy-icon="check" aria-hidden="true" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="m5 12 4 4L19 6" /></svg>
              <span data-copy-label aria-live="polite">{copyState === 'success' ? 'Copied!' : copyState === 'copying' ? 'Copying…' : copyState === 'error' ? 'Try again' : 'Copy'}</span>
            </button>
          </div>
          <pre className="bibtex-code"><code data-bibtex-code>{publication.bibtex}</code></pre>
          <p data-copy-error hidden={copyState !== 'error'} role="status" className="bibtex-copy-error">Couldn’t copy automatically. Select the citation and press ⌘C or Ctrl+C.</p>
        </section>
      )}
    </div>
  );
}
