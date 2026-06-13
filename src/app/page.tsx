import Link from 'next/link';
import { ArrowRight, BarChart3, CreditCard, Check } from 'lucide-react';
import Logo from '@/components/ui/Logo';

// External Streamlit app (separate process/port). Configurable via env so it can
// point at the deployed Report Maker; defaults to Streamlit's local dev port.
const REPORT_MAKER_URL =
  process.env.NEXT_PUBLIC_REPORT_MAKER_URL ?? 'http://localhost:8501';

interface AppOption {
  name: string;
  tagline: string;
  description: string;
  features: string[];
  href: string;
  cta: string;
  external: boolean;
  Icon: typeof CreditCard;
}

// The landing page is data-driven so the two options stay easy to edit and a
// third could be slotted in without touching the layout.
const OPTIONS: AppOption[] = [
  {
    name: 'Cards Checkout',
    tagline: 'WinnerFlags',
    description:
      'Design and order custom numbered winner flag cards. Pick a run size, upload artwork, choose add-ons and pay securely once you approve the proof.',
    features: ['Run-size pricing', 'Artwork upload & proof', 'Secure card checkout'],
    href: '/order',
    cta: 'Start an order',
    external: false,
    Icon: CreditCard,
  },
  {
    name: 'Data Reporting Tool',
    tagline: 'CUIGG',
    description:
      'Turn survey exports into cleaned data, charts, indicative sentiment and a branded DOCX report — generated locally in a few clicks.',
    features: ['CSV cleaning', 'Charts & sentiment', 'Branded DOCX export'],
    href: REPORT_MAKER_URL,
    cta: 'Open reporting tool',
    external: true,
    Icon: BarChart3,
  },
];

function BrandLockup() {
  return (
    <div className="flex items-center gap-3">
      <Logo variant="full" className="h-8 w-auto text-gold-500" />
      <span className="text-navy-300 text-xl font-light">×</span>
      <span className="text-navy-900 font-black tracking-tight text-lg leading-none">
        CUIGG
      </span>
    </div>
  );
}

function OptionCard({ option }: { option: AppOption }) {
  const { Icon } = option;
  const body = (
    <div className="group h-full bg-white rounded-2xl border border-cream-dark hover:border-gold-500 shadow-sm hover:shadow-xl shadow-navy-900/5 transition-all duration-150 p-7 md:p-8 flex flex-col gap-5 active:scale-[.99]">
      <div className="flex items-center justify-between">
        <span className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-gold-500/10 text-gold-500 border border-gold-300">
          <Icon className="w-6 h-6" />
        </span>
        <span className="text-[10px] font-bold uppercase tracking-widest text-navy-600">
          {option.tagline}
        </span>
      </div>

      <div className="flex-1 flex flex-col gap-4">
        <div>
          <h2 className="text-2xl md:text-3xl font-black text-navy-900 leading-tight">
            {option.name}
          </h2>
          <p className="text-sm text-navy-600 leading-relaxed mt-2">
            {option.description}
          </p>
        </div>

        <ul className="flex flex-col gap-2 mt-auto">
          {option.features.map((feature) => (
            <li
              key={feature}
              className="flex items-center gap-2 text-sm font-medium text-navy-700"
            >
              <Check className="w-4 h-4 text-gold-500 shrink-0" />
              {feature}
            </li>
          ))}
        </ul>
      </div>

      <span className="inline-flex items-center justify-center gap-2 w-full rounded-xl bg-navy-900 group-hover:bg-gold-500 text-white group-hover:text-navy-900 text-sm font-bold py-3 transition-colors">
        {option.cta} <ArrowRight className="w-4 h-4" />
      </span>
    </div>
  );

  if (option.external) {
    return (
      <a
        href={option.href}
        target="_blank"
        rel="noopener noreferrer"
        className="block h-full"
      >
        {body}
      </a>
    );
  }
  return (
    <Link href={option.href} className="block h-full">
      {body}
    </Link>
  );
}

export default function Home() {
  return (
    <div className="min-h-screen bg-cream flex flex-col">
      {/* Home nav bar */}
      <nav className="bg-cream border-b border-cream-dark px-4 md:px-8 py-3 sticky top-0 z-40">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <BrandLockup />
          <span className="text-xs md:text-sm font-bold uppercase tracking-widest text-navy-600">
            Home
          </span>
        </div>
      </nav>

      {/* Hero */}
      <section className="px-4 pt-14 md:pt-20 pb-2 text-center">
        <div className="max-w-3xl mx-auto">
          <p className="text-[11px] font-bold uppercase tracking-[0.3em] text-gold-500 mb-3">
            WinnerFlags × CUIGG
          </p>
          <h1 className="text-4xl md:text-6xl font-black leading-[0.98] tracking-tight text-navy-900">
            What would you like to do?
          </h1>
          <p className="text-navy-600 text-base md:text-lg leading-relaxed max-w-xl mx-auto mt-4">
            Two tools, one home. Choose cards checkout to order winner flag
            cards, or the data reporting tool to build a survey report.
          </p>
        </div>
      </section>

      {/* Option grid */}
      <section className="px-4 py-10 md:py-14 flex-1">
        <div className="max-w-5xl mx-auto grid sm:grid-cols-2 gap-5 md:gap-6 items-stretch">
          {OPTIONS.map((option) => (
            <OptionCard key={option.name} option={option} />
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-cream-dark border-t border-navy-100 px-4 py-8">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <BrandLockup />
          <p className="text-[11px] text-navy-600 uppercase tracking-widest">
            © 2026 WinnerFlags × CUIGG · Limerick · Ireland
          </p>
        </div>
      </footer>
    </div>
  );
}
