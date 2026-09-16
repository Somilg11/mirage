import type { ReactNode } from 'react';
import { Card } from '../../components/ui/primitives';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';

export interface LegalSection {
  title: string;
  body: ReactNode;
}

export function LegalPage({
  eyebrow,
  title,
  intro,
  updated,
  sections,
  children,
}: {
  eyebrow: string;
  title: string;
  intro?: string;
  updated?: string;
  sections: LegalSection[];
  children?: ReactNode;
}) {
  useDocumentTitle(title);
  return (
    <div className="mx-auto max-w-3xl py-4 sm:py-8">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">{eyebrow}</p>
      <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">{title}</h1>
      {intro && <p className="mt-3 text-base leading-relaxed text-muted">{intro}</p>}
      {updated && <p className="mt-2 text-xs text-subtle">Last updated {updated}</p>}

      {children}

      {sections.length > 0 && (
        <Card className="mt-8 divide-y divide-border">
          {sections.map((section, i) => (
            <section key={section.title} className="p-5 sm:p-6">
              <h2 className="flex gap-3 text-base font-semibold">
                <span className="num text-subtle">{String(i + 1).padStart(2, '0')}</span>
                {section.title}
              </h2>
              <div className="mt-2 pl-9 text-sm leading-relaxed text-muted">{section.body}</div>
            </section>
          ))}
        </Card>
      )}
    </div>
  );
}
