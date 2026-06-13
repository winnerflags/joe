'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useDropzone } from 'react-dropzone';
import { UploadCloud, FileText, X, ChevronLeft, ChevronRight, ImageIcon, AlertTriangle, Mail } from 'lucide-react';
import { useOrder } from '@/context/OrderContext';
import { useStepNavigation } from '@/hooks/useStepNavigation';
import { cn } from '@/lib/cn';
import StepCard from '@/components/ui/StepCard';
import Button from '@/components/ui/Button';
import TextInput from '@/components/ui/TextInput';
import type { UploadedFile } from '@/types/order';

const ACCEPTED_TYPES = {
  'image/png': ['.png'],
  'image/jpeg': ['.jpg', '.jpeg'],
  'application/pdf': ['.pdf'],
  'application/postscript': ['.ai'],
  'application/illustrator': ['.ai'],
};

function formatBytes(bytes: number): string {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function Step2Upload() {
  const router = useRouter();
  const { state, dispatch } = useOrder();
  const { goPrev } = useStepNavigation();
  const fileRef = useRef<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Guard: redirect if artwork type isn't 'upload'
  useEffect(() => {
    if (state.artworkType !== null && state.artworkType !== 'upload') {
      dispatch({ type: 'NAVIGATE_TO_STEP', payload: 3 });
      router.replace('/order/step/3');
    }
  }, [state.artworkType, router, dispatch]);

  // Clear stale file metadata on mount — fileRef is always null on a fresh mount.
  // Without this, a user who goes Back and returns would see a file preview but
  // handleContinue would silently fail because fileRef.current === null.
  useEffect(() => {
    if (state.uploadedFile) {
      dispatch({ type: 'SET_UPLOADED_FILE', payload: null });
      dispatch({ type: 'SET_UPLOAD_PATH', payload: '' });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onDrop = useCallback(
    (accepted: File[], rejected: import('react-dropzone').FileRejection[]) => {
      setError(null);
      if (rejected.length > 0) {
        setError('File type not supported. Please upload PNG, JPG, PDF, or AI.');
        return;
      }
      if (accepted.length === 0) return;
      const file = accepted[0];
      fileRef.current = file;
      const previewUrl = file.type.startsWith('image/') ? URL.createObjectURL(file) : null;
      const uploaded: UploadedFile = {
        name: file.name,
        size: file.size,
        mimeType: file.type,
        previewUrl,
      };
      dispatch({ type: 'SET_UPLOADED_FILE', payload: uploaded });
      dispatch({ type: 'SET_UPLOAD_PATH', payload: '' });
    },
    [dispatch],
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: ACCEPTED_TYPES,
    multiple: false,
  });

  async function handleContinue() {
    if (!state.uploadedFile || !fileRef.current) return;
    if (!state.artistName.trim() || !state.artistEmail.trim() || !state.termsConfirmed) return;

    setError(null);
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', fileRef.current, fileRef.current.name);

      const res = await fetch('/api/upload', { method: 'POST', body: formData });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Upload failed');
      }
      const data = await res.json();
      dispatch({ type: 'SET_UPLOAD_PATH', payload: data.uploadPath });
      dispatch({ type: 'NAVIGATE_TO_STEP', payload: 3 });
      router.push('/order/step/3');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Upload failed. Please try again.');
    } finally {
      setUploading(false);
    }
  }

  const file = state.uploadedFile;
  const canContinue =
    !!file &&
    state.artistName.trim().length > 0 &&
    state.artistEmail.trim().length > 0 &&
    state.termsConfirmed;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold text-navy-900">Upload Your Artwork</h1>
        <p className="text-navy-600 mt-1 text-sm">
          Upload your print-ready file. We accept PNG, JPG, PDF, or Adobe Illustrator.
        </p>
      </div>

      {/* AI warning */}
      <div className="flex items-start gap-3 rounded-xl border border-amber-300 bg-amber-50 p-4">
        <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-semibold text-amber-900">AI-generated artwork is prohibited.</p>
          <p className="text-xs text-amber-800 mt-0.5">All submissions are subject to review and may be rejected. Rejected orders receive an automatic refund.</p>
        </div>
      </div>

      {/* File drop zone */}
      <StepCard>
        <h2 className="text-base font-semibold text-navy-900 mb-3">Your artwork file</h2>
        {!file ? (
          <div
            {...getRootProps()}
            className={cn(
              'flex flex-col items-center justify-center gap-4 rounded-xl border-2 border-dashed p-12 text-center cursor-pointer transition-all',
              isDragActive ? 'border-gold-500 bg-gold-50' : 'border-navy-100 hover:border-navy-600 bg-cream',
            )}
          >
            <input {...getInputProps()} />
            <UploadCloud className={cn('w-12 h-12', isDragActive ? 'text-gold-500' : 'text-navy-600')} />
            <div>
              <p className="text-sm font-semibold text-navy-900">
                {isDragActive ? 'Drop your file here' : 'Drag & drop your artwork here'}
              </p>
              <p className="text-xs text-navy-600 mt-1">or click to browse · PNG, JPG, PDF, AI · any size</p>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            <div className="flex items-start gap-4 rounded-xl border border-navy-100 p-4 bg-cream">
              <div className="w-16 h-16 rounded-lg border border-navy-100 bg-white flex items-center justify-center overflow-hidden flex-shrink-0">
                {file.previewUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={file.previewUrl} alt="Preview" className="w-full h-full object-cover" />
                ) : file.mimeType === 'application/pdf' ? (
                  <FileText className="w-8 h-8 text-navy-600" />
                ) : (
                  <ImageIcon className="w-8 h-8 text-navy-600" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-navy-900 truncate">{file.name}</p>
                <p className="text-xs text-navy-600">{formatBytes(file.size)}</p>
              </div>
              <button
                onClick={() => {
                  fileRef.current = null;
                  dispatch({ type: 'SET_UPLOADED_FILE', payload: null });
                  dispatch({ type: 'SET_UPLOAD_PATH', payload: '' });
                }}
                className="text-navy-600 hover:text-red-500 transition-colors p-1"
                aria-label="Remove file"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div {...getRootProps()} className="cursor-pointer">
              <input {...getInputProps()} />
              <span className="text-xs text-navy-600 hover:text-navy-900 underline">
                Choose a different file
              </span>
            </div>
          </div>
        )}
        {error && <p className="mt-3 text-sm text-red-500">{error}</p>}
      </StepCard>

      {/* Artist approval notice */}
      <div className="flex items-start gap-3 rounded-xl border border-gold-300 bg-gold-50 p-4">
        <Mail className="w-5 h-5 text-gold-500 flex-shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-semibold text-navy-900">Artist approval required before production</p>
          <p className="text-xs text-navy-700 mt-1 leading-relaxed">
            We need to confirm rights and approval directly with the artist before we go to print.
            Please ask your artist to email us at{' '}
            <a href="mailto:hello@cuigg.com" className="font-semibold underline hover:text-navy-900">
              hello@cuigg.com
            </a>{' '}
            with the subject line <span className="font-semibold">&ldquo;Artwork approval&rdquo;</span>.
            Orders will not proceed to production until this is confirmed.
          </p>
        </div>
      </div>

      {/* Artist details */}
      <StepCard>
        <h2 className="text-base font-semibold text-navy-900 mb-4">Artist details</h2>
        <div className="flex flex-col gap-4">
          <TextInput
            label="Artist name"
            singleLine
            placeholder="Your name or artist name"
            value={state.artistName}
            onChange={(e) => dispatch({ type: 'SET_ARTIST_NAME', payload: (e.target as unknown as HTMLInputElement).value })}
          />
          <TextInput
            label="Artist email"
            singleLine
            type="email"
            placeholder="artist@example.com"
            value={state.artistEmail}
            onChange={(e) => dispatch({ type: 'SET_ARTIST_EMAIL', payload: (e.target as unknown as HTMLInputElement).value })}
          />
          <TextInput
            label="Artist WhatsApp / phone (optional)"
            singleLine
            type="tel"
            placeholder="+353 ..."
            value={state.artistPhone}
            onChange={(e) => dispatch({ type: 'SET_ARTIST_PHONE', payload: (e.target as unknown as HTMLInputElement).value })}
          />
        </div>
      </StepCard>

      {/* Terms confirmation */}
      <StepCard>
        <label className="flex items-start gap-3 cursor-pointer">
          <div className="flex-shrink-0 mt-0.5">
            <button
              type="button"
              role="checkbox"
              aria-checked={state.termsConfirmed}
              onClick={() => dispatch({ type: 'SET_TERMS_CONFIRMED', payload: !state.termsConfirmed })}
              className={cn(
                'w-5 h-5 rounded border-2 flex items-center justify-center transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-500',
                state.termsConfirmed ? 'border-gold-500 bg-gold-500' : 'border-navy-100 bg-white',
              )}
            >
              {state.termsConfirmed && (
                <svg className="w-3 h-3 text-white" viewBox="0 0 12 12" fill="none">
                  <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              )}
            </button>
          </div>
          <p className="text-sm text-navy-700 leading-relaxed">
            I confirm this is original work, not ai, and the artist approved the submission for print.
          </p>
        </label>
      </StepCard>

      <div className="flex items-center justify-between">
        <Button variant="ghost" onClick={goPrev}>
          <ChevronLeft className="w-4 h-4" /> Back
        </Button>
        <Button onClick={handleContinue} disabled={!canContinue} loading={uploading}>
          Continue <ChevronRight className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}
