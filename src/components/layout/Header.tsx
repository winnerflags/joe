'use client';

import Link from 'next/link';
import Logo from '@/components/ui/Logo';

export default function Header() {
  return (
    <header className="bg-cream border-b border-cream-dark px-4 py-3">
      <div className="max-w-3xl mx-auto flex items-center justify-between">
        <Link href="/order" aria-label="WinnerFlags ordering home">
          <Logo variant="full" className="h-8 w-auto text-gold-500" />
        </Link>
        <span className="text-navy-600 text-xs font-medium tracking-widest uppercase">
          Custom Card Order
        </span>
      </div>
    </header>
  );
}
