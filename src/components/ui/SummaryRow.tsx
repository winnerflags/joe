import { cn } from '@/lib/cn';

interface SummaryRowProps {
  label: string;
  value: React.ReactNode;
  emphasis?: boolean;
  className?: string;
}

export default function SummaryRow({ label, value, emphasis = false, className }: SummaryRowProps) {
  return (
    <div className={cn('flex items-center justify-between gap-4 py-2', className)}>
      <span className={cn('text-sm', emphasis ? 'font-semibold text-navy-900' : 'text-navy-600')}>{label}</span>
      <span className={cn('text-sm text-right', emphasis ? 'font-bold text-navy-900 text-base' : 'text-navy-900')}>{value}</span>
    </div>
  );
}
