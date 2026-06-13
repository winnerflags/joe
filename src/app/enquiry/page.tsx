'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronLeft, Check, Mail } from 'lucide-react';
import Logo from '@/components/ui/Logo';
import TextInput from '@/components/ui/TextInput';
import Button from '@/components/ui/Button';
import StepCard from '@/components/ui/StepCard';

export default function EnquiryPage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [quantity, setQuantity] = useState('');
  const [eventDescription, setEventDescription] = useState('');
  const [details, setDetails] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  const canSubmit =
    name.trim().length > 0 &&
    email.trim().length > 0 &&
    quantity.trim().length > 0 &&
    eventDescription.trim().length > 0;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit || submitting) return;
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch('/api/enquiry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, phone, quantity, eventDescription, details }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to send enquiry');
      }
      setSent(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-cream flex flex-col">
      <nav className="bg-cream border-b border-cream-dark px-4 md:px-8 py-3">
        <div className="max-w-xl mx-auto">
          <Logo variant="full" className="h-8 w-auto text-gold-500" />
        </div>
      </nav>

      <div className="flex-1 flex flex-col items-center px-4 pt-10 pb-16">
        <div className="w-full max-w-xl">
          {sent ? (
            <StepCard>
              <div className="flex flex-col items-center text-center gap-4 py-6">
                <div className="w-14 h-14 rounded-full bg-gold-100 border border-gold-300 flex items-center justify-center">
                  <Check className="w-7 h-7 text-gold-500" strokeWidth={3} />
                </div>
                <h1 className="text-2xl font-bold text-navy-900">Enquiry sent</h1>
                <p className="text-sm text-navy-600 max-w-sm">
                  Thanks — we&rsquo;ve received your enquiry and will be in touch within one business day with a tailored quote.
                </p>
                <Button variant="ghost" onClick={() => router.push('/order')}>
                  <ChevronLeft className="w-4 h-4" /> Back to ordering
                </Button>
              </div>
            </StepCard>
          ) : (
            <form onSubmit={handleSubmit} className="flex flex-col gap-6">
              <div>
                <button
                  type="button"
                  onClick={() => router.push('/order')}
                  className="text-xs text-navy-600 hover:text-navy-900 flex items-center gap-1 mb-3"
                >
                  <ChevronLeft className="w-3 h-3" /> Back
                </button>
                <div className="inline-flex items-center gap-2 bg-gold-100 border border-gold-300 text-navy-900 text-xs font-bold px-3 py-1 rounded-full tracking-widest uppercase mb-3">
                  <Mail className="w-3 h-3" /> Bulk enquiry
                </div>
                <h1 className="text-2xl font-bold text-navy-900">Large orders (150+ cards)</h1>
                <p className="text-navy-600 mt-1 text-sm">
                  For runs over 150 cards we offer custom pricing and dedicated artwork support. Tell us a bit
                  about your order and we&rsquo;ll reply within one business day.
                </p>
              </div>

              <StepCard>
                <div className="flex flex-col gap-4">
                  <TextInput
                    label="Your name"
                    singleLine
                    placeholder="Full name or club name"
                    value={name}
                    onChange={(e) => setName((e.target as unknown as HTMLInputElement).value)}
                    required
                  />
                  <TextInput
                    label="Email"
                    singleLine
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail((e.target as unknown as HTMLInputElement).value)}
                    required
                  />
                  <TextInput
                    label="Phone (optional)"
                    singleLine
                    type="tel"
                    placeholder="+353 ..."
                    value={phone}
                    onChange={(e) => setPhone((e.target as unknown as HTMLInputElement).value)}
                  />
                  <TextInput
                    label="Estimated quantity"
                    singleLine
                    placeholder="e.g. 250, 500, 1000+"
                    value={quantity}
                    onChange={(e) => setQuantity((e.target as unknown as HTMLInputElement).value)}
                    required
                  />
                </div>
              </StepCard>

              <StepCard>
                <div className="flex flex-col gap-4">
                  <TextInput
                    label="Event or occasion"
                    hint="What are the cards for? Event name, club, rough date, etc."
                    placeholder="e.g. County final presentation night, May 2026"
                    value={eventDescription}
                    onChange={(e) => setEventDescription(e.target.value)}
                    rows={3}
                    required
                  />
                  <TextInput
                    label="Additional details (optional)"
                    hint="Timeline, artwork preferences, delivery address, anything else we should know."
                    placeholder="Anything else?"
                    value={details}
                    onChange={(e) => setDetails(e.target.value)}
                    rows={4}
                  />
                </div>
              </StepCard>

              {error && <p className="text-sm text-red-500">{error}</p>}

              <Button type="submit" disabled={!canSubmit} loading={submitting}>
                Send enquiry
              </Button>
              <p className="text-center text-xs text-navy-600">
                Sent to winnerflags@gmail.com &amp; hello@cuigg.com
              </p>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
