import { cn } from '@/lib/cn';

interface TextInputProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label: string;
  hint?: string;
  error?: string;
  characterLimit?: number;
  currentLength?: number;
  singleLine?: boolean;
  type?: React.HTMLInputTypeAttribute;
}

export default function TextInput({
  label,
  hint,
  error,
  characterLimit,
  currentLength,
  singleLine = false,
  className,
  ...props
}: TextInputProps) {
  const Tag = singleLine ? 'input' : 'textarea';

  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-sm font-semibold text-navy-900">{label}</label>
      {hint && <p className="text-xs text-navy-600">{hint}</p>}
      <div className="relative">
        {singleLine ? (
          <input
            className={cn(
              'w-full rounded-xl border border-navy-100 bg-white px-4 py-3 text-sm text-navy-900 placeholder:text-navy-600/50 focus:outline-none focus:ring-2 focus:ring-gold-500 focus:border-transparent transition',
              error && 'border-red-400 focus:ring-red-400',
              className,
            )}
            {...(props as React.InputHTMLAttributes<HTMLInputElement>)}
          />
        ) : (
          <textarea
            rows={4}
            className={cn(
              'w-full rounded-xl border border-navy-100 bg-white px-4 py-3 text-sm text-navy-900 placeholder:text-navy-600/50 focus:outline-none focus:ring-2 focus:ring-gold-500 focus:border-transparent transition resize-none',
              error && 'border-red-400 focus:ring-red-400',
              className,
            )}
            {...props}
          />
        )}
        {characterLimit && currentLength !== undefined && (
          <span
            className={cn(
              'absolute bottom-3 right-3 text-xs',
              currentLength > characterLimit ? 'text-red-500' : 'text-navy-600/50',
            )}
          >
            {currentLength}/{characterLimit}
          </span>
        )}
      </div>
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  );
}
