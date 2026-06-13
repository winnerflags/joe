import { notFound } from 'next/navigation';
import Step1Configuration from '@/components/steps/Step1Configuration';
import Step2Upload from '@/components/steps/Step2Upload';
import Step3Details from '@/components/steps/Step3Details';
import Step4Summary from '@/components/steps/Step4Summary';
import Step5Checkout from '@/components/steps/Step5Checkout';

const STEP_COMPONENTS: Record<string, React.ComponentType> = {
  '1': Step1Configuration,
  '2': Step2Upload,
  '3': Step3Details,
  '4': Step4Summary,
  '5': Step5Checkout,
};

interface Props {
  params: Promise<{ step: string }>;
}

export default async function StepPage({ params }: Props) {
  const { step } = await params;
  const Component = STEP_COMPONENTS[step];
  if (!Component) notFound();
  return <Component />;
}

export const dynamic = 'force-dynamic';
