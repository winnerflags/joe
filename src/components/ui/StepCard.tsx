import { cn } from '@/lib/cn';

interface StepCardProps {
  children: React.ReactNode;
  className?: string;
}

export default function StepCard({ children, className }: StepCardProps) {
  return (
    <div className={cn('bg-white rounded-2xl shadow-sm border border-cream-dark p-6 md:p-8', className)}>
      {children}
    </div>
  );
}
