import { Coffee, LifeBuoy, Mail, ShieldAlert, Wrench, Briefcase } from 'lucide-react';
import { Card } from '../../components/ui/primitives';
import { LegalPage } from './LegalPage';

const CHANNELS = [
  { icon: Mail, title: 'General inquiries', email: 'support@mirage.com', sla: 'Response within 24 hours' },
  { icon: Wrench, title: 'Technical support', email: 'tech@mirage.com', sla: 'Response within 12 hours' },
  { icon: Briefcase, title: 'Business inquiries', email: 'business@mirage.com', sla: 'Response within 48 hours' },
  { icon: ShieldAlert, title: 'Security issues', email: 'security@mirage.com', sla: 'Prioritised response' },
];

export function ContactPage() {
  return (
    <LegalPage eyebrow="Support" title="Contact us" intro="Get in touch with the team behind Mirage." sections={[]}>
      <div className="mt-8 grid gap-3 sm:grid-cols-2">
        {CHANNELS.map(({ icon: Icon, title, email, sla }) => (
          <Card key={title} className="p-5">
            <div className="grid size-10 place-items-center rounded-xl bg-primary-soft text-primary">
              <Icon className="size-5" />
            </div>
            <div className="mt-4 font-semibold">{title}</div>
            <a href={`mailto:${email}`} className="mt-1 block text-sm text-primary hover:underline">
              {email}
            </a>
            <div className="mt-2 text-xs text-muted">{sla}</div>
          </Card>
        ))}
      </div>

      <h2 className="mt-10 text-lg font-semibold">Other ways to connect</h2>
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <a
          href="https://github.com/Somilg11"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-3 rounded-2xl border border-border bg-surface p-4 hover:border-border-strong"
        >
          <LifeBuoy className="size-5 text-muted" />
          <div>
            <div className="text-sm font-semibold">GitHub</div>
            <div className="text-xs text-muted">Report bugs and request features</div>
          </div>
        </a>
        <a
          href="https://www.buymeacoffee.com/gsomil"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-3 rounded-2xl border border-border bg-surface p-4 hover:border-border-strong"
        >
          <Coffee className="size-5 text-muted" />
          <div>
            <div className="text-sm font-semibold">Buy me a coffee</div>
            <div className="text-xs text-muted">Support ongoing development</div>
          </div>
        </a>
      </div>
    </LegalPage>
  );
}
