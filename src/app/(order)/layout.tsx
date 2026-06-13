import type { Metadata } from 'next';
import { OrderProvider } from '@/context/OrderContext';

export const metadata: Metadata = {
  title: 'WinnerFlags — Custom Winner Flag Cards',
  description:
    'Order custom winner flag cards for your event. Choose your quantity, artwork style, and get a proof before printing.',
};

// Scopes the order state to the ordering app only. The app-store hub at `/`
// renders outside this group and therefore never needs OrderProvider.
export default function OrderAppLayout({ children }: { children: React.ReactNode }) {
  return <OrderProvider>{children}</OrderProvider>;
}
