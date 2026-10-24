'use client';

import PageviewCounter from '@/components/home/PageviewCounter';

interface ContactFooterProps {
  name: string;
  email?: string;
}

export default function ContactFooter({ name, email }: ContactFooterProps) {
  return (
    <div className="mt-16" data-contact-footer>
      <section aria-labelledby="connect-heading" className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-7 p-6 sm:p-8 rounded-xl border border-neutral-200 bg-neutral-50 dark:bg-neutral-800">
        <div>
          <h2 id="connect-heading" className="text-2xl font-serif font-bold text-primary">Let’s connect!</h2>
          <div className="mt-3 space-y-1" data-contact-copy>
            <p className="text-base font-medium text-primary">Good research starts with a conversation.</p>
            <p className="text-[15px] leading-relaxed text-neutral-600">I’m always open to research collaborations. Feel free to get in touch.</p>
          </div>
        </div>
        {email && <a href={`mailto:${email}`} className="inline-flex items-center gap-3 shrink-0 rounded-lg border border-neutral-300 bg-background px-4 py-3 text-sm font-medium text-primary hover:border-accent hover:text-accent transition-colors focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent">
          <i aria-hidden="true" className="fa-solid fa-envelope text-base text-accent" />
          <span>{email}</span><span aria-hidden="true" className="text-accent">↗</span>
        </a>}
      </section>
      <footer className="mt-7 grid grid-cols-2 sm:grid-cols-[1fr_auto_1fr] items-center gap-x-5 gap-y-3 py-6 border-t border-neutral-200 text-[13px] text-neutral-600">
        <PageviewCounter />
        <span className="col-span-2 row-start-2 text-center sm:col-span-1 sm:col-start-2 sm:row-start-auto">© {name} | Last updated: <time dateTime="2026-10">Oct. 2026</time></span>
        <a href="#top" data-back-to-top className="justify-self-end hover:text-accent transition-colors" onClick={event => {
          event.preventDefault();
          window.history.pushState(null, '', '#top');
          window.scrollTo({ top: 0, behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' });
        }}>Back to top ↑</a>
      </footer>
    </div>
  );
}
