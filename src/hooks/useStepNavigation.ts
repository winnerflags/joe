'use client';

import { useRouter } from 'next/navigation';
import { useOrder } from '@/context/OrderContext';
import { step1Schema, step2Schema, validateStep3 } from '@/lib/validation';

export function useStepNavigation() {
  const router = useRouter();
  const { state, dispatch } = useOrder();

  function canProceed(): boolean {
    switch (state.currentStep) {
      case 1:
        return step1Schema.safeParse({
          quantity: state.quantity,
          artworkType: state.artworkType,
        }).success;
      case 2:
        return step2Schema.safeParse({
          uploadPath: state.uploadPath,
          artistName: state.artistName,
          artistEmail: state.artistEmail,
          termsConfirmed: state.termsConfirmed,
        }).success;
      case 3:
        return validateStep3({
          cardBottomText: state.cardBottomText,
          artworkDescription: state.artworkDescription,
          eventDescription: state.eventDescription,
          artworkType: state.artworkType ?? '',
        });
      case 4:
        return true;
      case 5:
        return true;
      default:
        return false;
    }
  }

  function goNext() {
    let nextStep: 1 | 2 | 3 | 4 | 5;
    if (state.currentStep === 1) {
      // Skip step 2 if not uploading own artwork
      nextStep = state.artworkType === 'upload' ? 2 : 3;
    } else if (state.currentStep < 5) {
      nextStep = (state.currentStep + 1) as 1 | 2 | 3 | 4 | 5;
    } else {
      return;
    }
    dispatch({ type: 'NAVIGATE_TO_STEP', payload: nextStep });
    router.push(`/order/step/${nextStep}`);
  }

  function goPrev() {
    let prevStep: 1 | 2 | 3 | 4 | 5;
    if (state.currentStep === 3 && state.artworkType !== 'upload') {
      prevStep = 1;
    } else if (state.currentStep > 1) {
      prevStep = (state.currentStep - 1) as 1 | 2 | 3 | 4 | 5;
    } else {
      return;
    }
    dispatch({ type: 'NAVIGATE_TO_STEP', payload: prevStep });
    router.push(`/order/step/${prevStep}`);
  }

  function goToStep(step: 1 | 2 | 3 | 4 | 5) {
    dispatch({ type: 'NAVIGATE_TO_STEP', payload: step });
    router.push(`/order/step/${step}`);
  }

  return { canProceed, goNext, goPrev, goToStep };
}
