'use client';

import { useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, AlertCircle, Lightbulb, ChevronDown, CalendarDays, Check, Pipette, Plus, Trash2, Link2, BarChart2 } from 'lucide-react';
import { useOrder } from '@/context/OrderContext';
import type { CardLink } from '@/types/order';
import { useStepNavigation } from '@/hooks/useStepNavigation';
import {
  validateStep3,
  validateCardText,
  TITLE_MIN,
  TITLE_MAX,
  DESC_MIN,
  DESC_MAX,
  type Fit,
} from '@/lib/validation';
import { cn } from '@/lib/cn';
import StepCard from '@/components/ui/StepCard';
import TextInput from '@/components/ui/TextInput';
import Button from '@/components/ui/Button';

const FIT_STYLES: Record<Fit, { bar: string; bg: string; border: string; text: string; label: string }> = {
  perfect:  { bar: 'bg-green-500',  bg: 'bg-green-50',   border: 'border-green-200',  text: 'text-green-800',  label: 'Perfect fit' },
  good:     { bar: 'bg-gold-500',   bg: 'bg-gold-50',    border: 'border-gold-300',   text: 'text-navy-900',   label: 'Good fit' },
  tight:    { bar: 'bg-amber-400',  bg: 'bg-amber-50',   border: 'border-amber-300',  text: 'text-amber-900',  label: 'Tight — consider adjusting' },
  overflow: { bar: 'bg-red-500',    bg: 'bg-red-50',     border: 'border-red-300',    text: 'text-red-800',    label: 'Does not fit' },
};

const TITLE_SUGGESTIONS = [
  'CLUB CHAMPIONSHIP 2026', 'PLAYER OF THE MATCH', 'ANNUAL AWARDS NIGHT',
  'FINALS NIGHT 2026', 'MVP AWARD 2026', 'TOP SCORER AWARD',
];

const DESC_SUGGESTIONS = [
  'PRESENTED AT [VENUE] · [DATE]', '[NAME] · [POSITION] · [CLUB]',
  '[TEAM A] VS [TEAM B] · [COMPETITION]', 'RECOGNISED FOR OUTSTANDING PERFORMANCE',
  'IN HONOUR OF [NAME] · [YEAR]', '[ARTIST1] · [ARTIST2] + SPECIAL GUESTS',
];

const TITLE_TIPS = [
  `Keep it ${TITLE_MIN}–${TITLE_MAX} characters — the sweet spot for legibility on the card.`,
  'USE CAPITALS for a bold, badge-like look that matches our card style.',
  'Lead with the event name or award name — not the recipient.',
];

const DESC_TIPS = [
  `Aim for ${DESC_MIN}–${DESC_MAX} characters to fill the subtitle strip comfortably.`,
  'A line-up, location, date, or short descriptor all work well here.',
  'Separate items with · or / for a clean, typeset feel.',
];

// ─── Colour palette ───────────────────────────────────────────────────────────

const GOLD = '#F5C35D';

const PASTEL_SWATCHES = [
  { hex: '#FFB3C6', name: 'Bubblegum' },
  { hex: '#FFCBA4', name: 'Peach' },
  { hex: '#FFE566', name: 'Buttercup' },
  { hex: '#A8E6CF', name: 'Mint' },
  { hex: '#AED9E0', name: 'Sky' },
  { hex: '#C9B8E8', name: 'Lavender' },
  { hex: '#FF9E80', name: 'Coral' },
  { hex: '#7EC8C8', name: 'Seafoam' },
  { hex: '#D4A8E8', name: 'Lilac' },
  { hex: '#B0C9E8', name: 'Powder' },
  { hex: '#A8C8A0', name: 'Sage' },
  { hex: '#F4A8C8', name: 'Rose' },
];

// ─── Card preview ─────────────────────────────────────────────────────────────

function QRPlaceholder({ size, color }: { size: number; color: string }) {
  const u = size / 10;
  const mods: [number, number][] = [
    [4,0],[5,0],[4,1],[6,1],[5,2],[4,3],[6,3],[5,4],
    [0,4],[1,4],[2,4],[3,4],[6,4],[7,4],[8,4],[9,4],
    [0,5],[2,5],[5,5],[7,5],[9,5],
    [0,6],[3,6],[5,6],[8,6],
    [4,7],[6,7],[8,7],[9,7],
    [4,8],[5,8],[7,8],
    [4,9],[6,9],[8,9],[9,9],
    [7,7],[7,8],[7,9],
  ];
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      {/* TL finder */}
      <rect x={0} y={0} width={u*3} height={u*3} fill={color} rx={u*0.3} />
      <rect x={u*0.5} y={u*0.5} width={u*2} height={u*2} fill="white" rx={u*0.15} />
      <rect x={u} y={u} width={u} height={u} fill={color} rx={u*0.1} />
      {/* TR finder */}
      <rect x={u*7} y={0} width={u*3} height={u*3} fill={color} rx={u*0.3} />
      <rect x={u*7.5} y={u*0.5} width={u*2} height={u*2} fill="white" rx={u*0.15} />
      <rect x={u*8} y={u} width={u} height={u} fill={color} rx={u*0.1} />
      {/* BL finder */}
      <rect x={0} y={u*7} width={u*3} height={u*3} fill={color} rx={u*0.3} />
      <rect x={u*0.5} y={u*7.5} width={u*2} height={u*2} fill="white" rx={u*0.15} />
      <rect x={u} y={u*8} width={u} height={u} fill={color} rx={u*0.1} />
      {/* Data modules */}
      {mods.map(([c, r], i) => (
        <rect key={i} x={c*u+u*0.06} y={r*u+u*0.06} width={u*0.84} height={u*0.84} fill={color} rx={u*0.1} />
      ))}
    </svg>
  );
}

// ─── New card render ──────────────────────────────────────────────────────────

interface RenderWFCardOpts {
  borderColor: string;
  title: string;
  description: string;
  finish: 'holographic' | 'matte';
  artworkUrl: string | null;
  isCommissioned: boolean;
  onTitleTap?: () => void;
  onDescTap?: () => void;
}

function renderWFCard(w: number, opts: RenderWFCardOpts) {
  const { borderColor, title, description, finish, artworkUrl, isCommissioned, onTitleTap, onDescTap } = opts;
  const h = Math.round(w * 4 / 3);
  const chamfer = Math.round(w * 0.13);
  // Three-layer border: 3px black + 2px accent + 2px black = 7px per side → 14px total
  const cw = w - 14;
  const ch = h - 14;
  const cah = Math.round(ch * 0.68);
  const cth = ch - cah;
  const leftColW = Math.round(cw * 0.25);
  const edgeBoxSz = Math.round(cw * 0.11);
  const fs = {
    cardNo:  Math.max(7, Math.round(w * 0.04)),
    title:   Math.max(9, Math.round(w * 0.055)),
    desc:    Math.max(7, Math.round(w * 0.042)),
    edition: Math.max(6, Math.round(w * 0.033)),
    handle:  Math.max(6, Math.round(w * 0.03)),
  };
  const clipPath = `polygon(0 0, calc(100% - ${chamfer}px) 0, 100% ${chamfer}px, 100% 100%, 0 100%)`;

  return (
    <div className="flex-shrink-0" style={{ filter: 'drop-shadow(0 10px 30px rgba(0,0,0,0.28))' }}>
      {/* Outer black border + chamfer clip */}
      <div style={{ width: w, height: h, clipPath, background: '#121212', padding: 3, boxSizing: 'border-box' }}>
        {/* Accent layer (user colour — Championship Gold by default) */}
        <div style={{ width: '100%', height: '100%', background: borderColor, padding: 2, boxSizing: 'border-box' }}>
          {/* Inner black layer */}
          <div style={{ width: '100%', height: '100%', background: '#121212', padding: 2, boxSizing: 'border-box' }}>
            {/* Art area */}
            <div className="relative overflow-hidden" style={{ height: cah }}>
              {artworkUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={artworkUrl} alt="Uploaded artwork" className="w-full h-full object-cover" />
              ) : (
                <div className="relative w-full h-full overflow-hidden">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src="/sample-card.png" alt="Sample card" className="w-full h-full object-cover opacity-50" />
                  <div className="absolute inset-0 flex items-end justify-center pb-2">
                    <span className="font-bold uppercase tracking-widest text-white bg-black/50 rounded px-1.5 py-0.5"
                      style={{ fontSize: fs.cardNo }}>
                      {isCommissioned ? 'Artwork at proof stage' : 'Upload to preview'}
                    </span>
                  </div>
                </div>
              )}
              {finish === 'holographic' && (
                <div className="absolute inset-0 pointer-events-none animate-holo-shift"
                  style={{ background: 'linear-gradient(135deg,#ff6b6b,#ffd93d,#6bcb77,#4d96ff,#c77dff,#ff6b6b)',
                    backgroundSize: '300% 300%', mixBlendMode: 'overlay', opacity: 0.45 }} />
              )}
              {finish === 'matte' && (
                <div className="absolute inset-0 pointer-events-none"
                  style={{ background: 'rgba(30,20,10,0.08)', mixBlendMode: 'multiply' }} />
              )}
              <span className="absolute top-1.5 right-2 font-mono font-bold text-white/30"
                style={{ fontSize: fs.cardNo }}>No. 001</span>
            </div>

            {/* Cream info strip */}
            <div style={{ height: cth, background: '#FEF9ED', display: 'flex' }}>
              {/* Left mini-column: edition box / slash / @wflags */}
              <div style={{
                width: leftColW, flexShrink: 0,
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                gap: 2, borderRight: '1px solid rgba(0,0,0,0.07)',
              }}>
                <div style={{
                  width: edgeBoxSz, height: edgeBoxSz,
                  border: '1px solid rgba(0,0,0,0.28)', borderRadius: 2,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <span style={{ fontSize: fs.edition, fontWeight: 900, color: 'rgba(0,0,0,0.4)', fontFamily: 'monospace' }}>001</span>
                </div>
                <span style={{ fontSize: fs.edition, fontWeight: 700, color: 'rgba(0,0,0,0.22)', lineHeight: 1 }}>/</span>
                <span style={{ fontSize: fs.handle, fontWeight: 700, color: 'rgba(0,0,0,0.32)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>@wflags</span>
              </div>

              {/* Title + description (right area) */}
              <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '0 6px', gap: 3 }}>
                {onTitleTap ? (
                  <button type="button" onClick={onTitleTap} className="text-left w-full overflow-hidden group" title="Tap to edit title">
                    <span className="font-black leading-tight truncate block group-hover:text-gold-500 transition-colors"
                      style={{ fontSize: fs.title, color: '#121212' }}>
                      {title || 'CARD TITLE'}
                    </span>
                  </button>
                ) : (
                  <span className="font-black leading-tight truncate block" style={{ fontSize: fs.title, color: '#121212' }}>
                    {title || 'CARD TITLE'}
                  </span>
                )}
                {onDescTap ? (
                  <button type="button" onClick={onDescTap} className="text-left w-full overflow-hidden group" title="Tap to edit description">
                    <span className="leading-tight truncate block group-hover:text-gold-500 transition-colors"
                      style={{ fontSize: fs.desc, color: 'rgba(18,18,18,0.5)' }}>
                      {description || 'Your description line'}
                    </span>
                  </button>
                ) : (
                  <span className="leading-tight truncate block" style={{ fontSize: fs.desc, color: 'rgba(18,18,18,0.5)' }}>
                    {description || 'Your description line'}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function CardFullPreview({
  borderColor, title, description, finish, artworkUrl, isCommissioned, qrLogoAddon,
  onTitleTap, onDescTap,
}: {
  borderColor: string; title: string; description: string;
  finish: 'holographic' | 'matte'; artworkUrl: string | null;
  isCommissioned: boolean; qrLogoAddon: boolean;
  onTitleTap?: () => void; onDescTap?: () => void;
}) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [previewSide, setPreviewSide] = useState<'front' | 'back'>('front');

  function renderCardBack(w: number) {
    const h = Math.round(w * 4 / 3);
    const qrSize = Math.round(w * 0.46);
    return (
      <div
        className="rounded-2xl overflow-hidden shadow-2xl flex-shrink-0 relative"
        style={{ width: w, height: h, border: `5px solid ${borderColor}`, background: '#FEF9ED' }}
      >
        <div className="absolute top-0 left-0 right-0 h-1" style={{ background: borderColor }} />
        <div className="flex flex-col items-center" style={{ paddingTop: Math.round(h * 0.07) }}>
          <div className="flex items-center justify-center rounded"
            style={{ width: Math.round(w * 0.22), height: Math.round(w * 0.22), border: `2px solid ${borderColor}` }}>
            <span style={{ fontSize: Math.round(w * 0.08), fontWeight: 900, color: borderColor }}>WF</span>
          </div>
          <span style={{ fontSize: Math.round(w * 0.034), color: borderColor, fontWeight: 700,
            letterSpacing: '0.15em', textTransform: 'uppercase' as const, marginTop: 4 }}>
            Winner Flag
          </span>
        </div>
        <div className="flex flex-col items-center" style={{ marginTop: Math.round(h * 0.05) }}>
          <div className="rounded-xl p-2" style={{ background: 'white', boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}>
            <QRPlaceholder size={qrSize} color="#121212" />
          </div>
          <p style={{ fontSize: Math.round(w * 0.038), color: '#3D3830', marginTop: 6, fontWeight: 600 }}>
            Scan to connect
          </p>
          <p style={{ fontSize: Math.round(w * 0.03), color: '#9A9080', marginTop: 2 }}>
            Your link here
          </p>
        </div>
        <div className="absolute bottom-0 left-0 right-0 flex items-center justify-between px-3 py-1.5"
          style={{ background: '#121212' }}>
          <span style={{ fontSize: 7, color: 'rgba(255,255,255,0.3)', fontFamily: 'monospace' }}>No. 001</span>
          <span style={{ fontSize: 7, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase' as const, letterSpacing: '0.12em' }}>
            @winnerflags
          </span>
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Front / Back tabs — only shown when QR addon is enabled */}
      {qrLogoAddon && (
        <div className="flex gap-2 mb-4">
          {(['front', 'back'] as const).map((side) => (
            <button
              key={side}
              type="button"
              onClick={() => setPreviewSide(side)}
              className={cn(
                'px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider border-2 transition-all duration-150 select-none',
                previewSide === side
                  ? 'bg-gold-500 border-gold-500 text-navy-900'
                  : 'bg-white border-navy-100 text-navy-600 hover:border-navy-600',
              )}
            >
              {side === 'front' ? 'Front' : 'Back — QR'}
            </button>
          ))}
        </div>
      )}

      {/* Mobile — collapsible */}
      <div className="md:hidden">
        <button
          type="button"
          onClick={() => setMobileOpen((o) => !o)}
          className="flex items-center gap-1.5 text-xs font-bold text-gold-500 mb-3"
        >
          {mobileOpen ? 'Collapse preview' : 'Expand preview'}
          <ChevronDown className={cn('w-3.5 h-3.5 transition-transform duration-200', mobileOpen && 'rotate-180')} />
        </button>
        {mobileOpen && (
          <div className="flex justify-center animate-fade-up">
            {previewSide === 'front'
              ? renderWFCard(240, { borderColor, title, description, finish, artworkUrl, isCommissioned })
              : renderCardBack(240)}
          </div>
        )}
      </div>

      {/* Desktop */}
      <div className="hidden md:flex md:justify-center">
        {previewSide === 'front'
          ? renderWFCard(200, { borderColor, title, description, finish, artworkUrl, isCommissioned, onTitleTap, onDescTap })
          : renderCardBack(200)}
      </div>
    </div>
  );
}

// ─── Card preview (small, used in colour picker) ──────────────────────────────

type CardFinish = 'holographic' | 'matte';

function CardPreview({
  borderColor, title, description, finish,
}: {
  borderColor: string;
  title: string;
  description: string;
  finish: CardFinish;
}) {
  const isLight = (hex: string) => {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return (r * 299 + g * 587 + b * 114) / 1000 > 128;
  };
  const badgeText = isLight(borderColor) ? '#121212' : '#FFFFFF';

  return (
    <div
      className="rounded-2xl overflow-hidden shadow-xl flex-shrink-0 transition-all duration-300"
      style={{
        width: 140,
        aspectRatio: '3/4',
        border: `5px solid ${borderColor}`,
      }}
    >
      {/* Art area */}
      <div
        className="flex flex-col items-center justify-center gap-2 relative overflow-hidden"
        style={{
          height: '68%',
          background: `linear-gradient(145deg, #FEF9ED 50%, ${borderColor}22)`,
        }}
      >
        {/* Finish overlay */}
        {finish === 'holographic' && (
          <div
            className="absolute inset-0 pointer-events-none animate-holo-shift"
            style={{
              background: 'linear-gradient(135deg, #ff6b6b, #ffd93d, #6bcb77, #4d96ff, #c77dff, #ff6b6b)',
              backgroundSize: '300% 300%',
              mixBlendMode: 'overlay',
              opacity: 0.55,
            }}
          />
        )}
        {finish === 'matte' && (
          <div
            className="absolute inset-0 pointer-events-none"
            style={{ background: 'rgba(30,20,10,0.08)', mixBlendMode: 'multiply' }}
          />
        )}

        {/* Edition badge */}
        <span className="absolute top-2 right-2 text-[7px] font-mono font-bold opacity-30 text-navy-900">
          No. 001
        </span>

        {/* WF badge mark */}
        <div
          className="flex items-center justify-center rounded"
          style={{ width: 44, height: 44, border: `2.5px solid ${borderColor}` }}
        >
          <span style={{ fontSize: 13, fontWeight: 900, color: borderColor, letterSpacing: 0.5 }}>WF</span>
        </div>
        <div
          className="text-[7px] font-bold uppercase tracking-[0.2em]"
          style={{ color: borderColor, opacity: 0.7 }}
        >
          Winner Flag
        </div>
        {/* Colour accent stripe at bottom of art area */}
        <div className="absolute bottom-0 left-0 right-0 h-[3px]" style={{ background: borderColor }} />
      </div>

      {/* Text strip */}
      <div
        className="flex flex-col justify-center px-2 py-1.5"
        style={{ height: '32%', background: '#121212' }}
      >
        <p className="font-black text-white leading-tight truncate" style={{ fontSize: 8 }}>
          {title || 'CARD TITLE'}
        </p>
        <p className="text-white/60 leading-tight truncate mt-0.5" style={{ fontSize: 6 }}>
          {description || 'Your description'}
        </p>
        <div className="flex items-center justify-between mt-1.5">
          <span className="text-white/30 uppercase tracking-wider" style={{ fontSize: 5 }}>
            Collector Edition
          </span>
          <span
            className="font-bold rounded px-1"
            style={{ fontSize: 6, background: borderColor, color: badgeText }}
          >
            2026
          </span>
        </div>
      </div>
    </div>
  );
}

// ─── Colour picker ────────────────────────────────────────────────────────────

function CardColourPicker({
  value,
  onChange,
  title,
  description,
  finish,
}: {
  value: string;
  onChange: (v: string) => void;
  title: string;
  description: string;
  finish: CardFinish;
}) {
  const colorInputRef = useRef<HTMLInputElement>(null);

  return (
    <div className="flex flex-col sm:flex-row gap-6 items-start">
      {/* Live card preview */}
      <div className="flex flex-col items-center gap-2 flex-shrink-0">
        <CardPreview borderColor={value} title={title} description={description} finish={finish} />
        <span className="text-[10px] text-navy-600 font-semibold uppercase tracking-wide">Preview</span>
      </div>

      {/* Controls */}
      <div className="flex-1 min-w-0">
        {/* Championship Gold — featured */}
        <button
          type="button"
          onClick={() => onChange(GOLD)}
          className={cn(
            'w-full flex items-center gap-3 rounded-xl border-2 p-3 mb-4 transition-all duration-150 active:scale-[.98] select-none',
            value === GOLD
              ? 'border-gold-500 bg-gold-50'
              : 'border-navy-100 bg-white hover:border-gold-400',
          )}
        >
          <span
            className="w-7 h-7 rounded-full flex-shrink-0 shadow-sm"
            style={{ background: GOLD, border: '2px solid rgba(0,0,0,0.08)' }}
          />
          <div className="flex-1 text-left">
            <p className="text-sm font-bold text-navy-900">Championship Gold</p>
            <p className="text-[11px] text-navy-600">Our signature — the classic WinnerFlags look</p>
          </div>
          {value === GOLD && <Check className="w-4 h-4 text-gold-500 flex-shrink-0" />}
        </button>

        {/* Pastel range */}
        <p className="text-[11px] font-bold text-navy-600 uppercase tracking-widest mb-2">
          Pastel range
        </p>
        <div className="grid grid-cols-6 sm:grid-cols-6 gap-2 mb-4">
          {PASTEL_SWATCHES.map((s) => (
            <button
              key={s.hex}
              type="button"
              title={s.name}
              onClick={() => onChange(s.hex)}
              className={cn(
                'w-full aspect-square rounded-full transition-all duration-150 active:scale-90 select-none',
                value === s.hex
                  ? 'ring-2 ring-offset-2 ring-navy-900 scale-110'
                  : 'hover:scale-105 ring-1 ring-black/10',
              )}
              style={{ background: s.hex }}
            />
          ))}
        </div>

        {/* Custom colour wheel */}
        <div className="border-t border-cream-dark pt-4">
          <p className="text-[11px] font-bold text-navy-600 uppercase tracking-widest mb-2">
            Custom colour
          </p>
          <button
            type="button"
            onClick={() => colorInputRef.current?.click()}
            className="flex items-center gap-3 rounded-xl border-2 border-navy-100 bg-white hover:border-navy-600 p-3 w-full transition-all duration-150 active:scale-[.98] select-none"
          >
            <span
              className="w-7 h-7 rounded-full flex-shrink-0 shadow-sm"
              style={{ background: value, border: '2px solid rgba(0,0,0,0.1)' }}
            />
            <span className="text-sm font-semibold text-navy-900 flex-1 text-left">
              {value.toUpperCase()}
            </span>
            <Pipette className="w-4 h-4 text-navy-600" />
          </button>
          <input
            ref={colorInputRef}
            type="color"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="sr-only"
          />
        </div>
      </div>
    </div>
  );
}

// ─── Finish selector ─────────────────────────────────────────────────────────

const FINISHES: { id: CardFinish; label: string; desc: string }[] = [
  { id: 'holographic',  label: 'Holographic',    desc: 'Rainbow shimmer' },
  { id: 'matte',        label: 'Strong Tactile',  desc: 'Firm tactile finish' },
];

function CardFinishSelector({
  value,
  onChange,
  borderColor,
}: {
  value: CardFinish;
  onChange: (v: CardFinish) => void;
  borderColor: string;
}) {
  return (
    <div className="grid grid-cols-2 gap-3">
      {FINISHES.map((f) => (
        <button
          key={f.id}
          type="button"
          onClick={() => onChange(f.id)}
          className={cn(
            'flex flex-col items-center gap-2 rounded-xl border-2 p-3 text-center transition-all duration-150 active:scale-[.97] select-none',
            value === f.id ? 'border-gold-500 bg-gold-50' : 'border-navy-100 bg-white hover:border-navy-600',
          )}
        >
          {/* Mini card thumbnail */}
          <div
            className="rounded overflow-hidden flex-shrink-0 relative"
            style={{ width: 40, height: 53, border: `2px solid ${borderColor}` }}
          >
            <div
              className="relative"
              style={{ height: '68%', background: `linear-gradient(145deg, #FEF9ED 60%, ${borderColor}22)` }}
            >
              {f.id === 'holographic' && (
                <div
                  className="absolute inset-0 pointer-events-none animate-holo-shift"
                  style={{
                    background: 'linear-gradient(135deg, #ff6b6b, #ffd93d, #6bcb77, #4d96ff, #c77dff, #ff6b6b)',
                    backgroundSize: '300% 300%',
                    mixBlendMode: 'overlay',
                    opacity: 0.55,
                  }}
                />
              )}
              {f.id === 'matte' && (
                <div
                  className="absolute inset-0 pointer-events-none"
                  style={{ background: 'rgba(30,20,10,0.08)', mixBlendMode: 'multiply' }}
                />
              )}
            </div>
            <div style={{ height: '32%', background: '#121212' }} />
          </div>

          <div>
            <p className="text-xs font-bold text-navy-900">{f.label}</p>
            <p className="text-[10px] text-navy-600 leading-tight">{f.desc}</p>
          </div>
          {value === f.id && <Check className="w-3.5 h-3.5 text-gold-500" />}
        </button>
      ))}
    </div>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function SuggestionChips({ chips, onPick }: { chips: string[]; onPick: (v: string) => void }) {
  return (
    <div className="flex flex-wrap gap-2 mt-2">
      {chips.map((chip, i) => (
        <button
          key={chip}
          type="button"
          onClick={() => onPick(chip)}
          className="animate-chip-pop text-xs font-semibold px-3 py-1.5 rounded-full border border-navy-100 bg-white text-navy-700 hover:border-gold-500 hover:bg-gold-50 hover:text-navy-900 active:scale-[.94] transition-all duration-100 select-none"
          style={{ animationDelay: `${i * 30}ms` }}
        >
          {chip}
        </button>
      ))}
    </div>
  );
}

function TipsToggle({ tips }: { tips: string[] }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="mt-1">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-1.5 text-xs text-navy-600 hover:text-navy-900 transition-colors"
      >
        <Lightbulb className="w-3.5 h-3.5 text-gold-500" />
        Tips for great text
        <ChevronDown className={cn('w-3 h-3 transition-transform duration-200', open && 'rotate-180')} />
      </button>
      {open && (
        <ul className="mt-2 flex flex-col gap-1.5 animate-fade-up">
          {tips.map((tip) => (
            <li key={tip} className="flex items-start gap-2 text-xs text-navy-600">
              <span className="text-gold-500 mt-px">·</span>
              {tip}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function Step3Details() {
  const { state, dispatch } = useOrder();
  const { goNext, goPrev } = useStepNavigation();
  const isCommissioned = state.artworkType !== 'upload';
  const titleInputRef = useRef<HTMLDivElement>(null);
  const descInputRef = useRef<HTMLDivElement>(null);

  const cardText = validateCardText(state.cardBottomText, state.artworkDescription);
  const fitStyle = FIT_STYLES[cardText.fit];

  const canProceed = validateStep3({
    cardBottomText: state.cardBottomText,
    artworkDescription: state.artworkDescription,
    eventDescription: state.eventDescription,
    artworkType: state.artworkType ?? '',
  });

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold text-navy-900">Card Details</h1>
        <p className="text-navy-600 mt-1 text-sm">
          {isCommissioned
            ? 'Tell us what to create and what text goes on the card.'
            : 'Tell us what text to print on your card.'}
        </p>
      </div>

      {/* Two-column layout: sticky card left, scrollable form right */}
      <div className="flex flex-col gap-6 md:grid md:grid-cols-[auto_1fr] md:gap-10 md:items-start">
        {/* Left column — card preview (sticky on desktop) */}
        <div className="md:sticky md:top-20 animate-fade-up">
          <CardFullPreview
            borderColor={state.cardBorderColor}
            title={state.cardBottomText}
            description={state.artworkDescription}
            finish={state.cardFinish}
            artworkUrl={state.uploadPath || state.uploadedFile?.previewUrl || null}
            isCommissioned={isCommissioned}
            qrLogoAddon={state.qrLogoAddon}
            onTitleTap={() => titleInputRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })}
            onDescTap={() => descInputRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })}
          />
        </div>

        {/* Right column — form fields */}
        <div className="flex flex-col gap-6">

      {/* Card text fields */}
      <StepCard>
        <div className="flex flex-col gap-6">
          {/* Title */}
          <div ref={titleInputRef} className="flex flex-col gap-1">
            <TextInput
              label="Card title"
              hint={`Printed at the bottom of the card — e.g. the event or award name. ${TITLE_MIN}–${TITLE_MAX} characters.`}
              placeholder="e.g. CLUB CHAMPIONSHIP 2026"
              singleLine
              characterLimit={TITLE_MAX}
              currentLength={state.cardBottomText.length}
              value={state.cardBottomText}
              onChange={(e) => dispatch({ type: 'SET_CARD_BOTTOM_TEXT', payload: e.target.value })}
              maxLength={TITLE_MAX}
            />
            <SuggestionChips chips={TITLE_SUGGESTIONS} onPick={(v) => dispatch({ type: 'SET_CARD_BOTTOM_TEXT', payload: v })} />
            <TipsToggle tips={TITLE_TIPS} />
          </div>

          {/* Description */}
          <div ref={descInputRef} className="flex flex-col gap-1">
            <TextInput
              label="Card description"
              hint={`Subtitle printed under the title — e.g. line-up, recipient name, or strapline. ${DESC_MIN}–${DESC_MAX} characters.`}
              placeholder="e.g. HAZEY HAZE · STRANGEBOY · DYRT + VERY SPECIAL GUESTS"
              characterLimit={DESC_MAX}
              currentLength={state.artworkDescription.length}
              value={state.artworkDescription}
              onChange={(e) => dispatch({ type: 'SET_ARTWORK_DESCRIPTION', payload: e.target.value })}
              maxLength={DESC_MAX}
              rows={2}
            />
            <SuggestionChips chips={DESC_SUGGESTIONS} onPick={(v) => dispatch({ type: 'SET_ARTWORK_DESCRIPTION', payload: v })} />
            <TipsToggle tips={DESC_TIPS} />
          </div>

          {/* Fit indicator */}
          {state.cardBottomText.length < 3 && state.artworkDescription.length < 3 ? (
            <div className="rounded-xl border border-navy-100 bg-cream p-4 text-center">
              <p className="text-xs text-navy-600">Start typing above to see how well your text fits the card.</p>
            </div>
          ) : (
            <div className={cn('rounded-xl border p-4 flex flex-col gap-2.5 transition-all duration-300', fitStyle.bg, fitStyle.border)}>
              <div className="flex items-center justify-between">
                <span className={cn('text-xs font-bold uppercase tracking-wide', fitStyle.text)}>{fitStyle.label}</span>
                <span className={cn('text-xs font-mono font-semibold', fitStyle.text)}>{cardText.confidence}% confidence</span>
              </div>
              <div className="w-full h-2 bg-white/70 rounded-full overflow-hidden">
                <div
                  className={cn('h-full rounded-full transition-[width] duration-500 ease-out', fitStyle.bar)}
                  style={{ width: `${cardText.confidence}%` }}
                />
              </div>
              {(cardText.errors.length > 0 || cardText.warnings.length > 0) && (
                <ul className={cn('text-xs flex flex-col gap-1 animate-fade-up', fitStyle.text)}>
                  {cardText.errors.map((e, i) => (
                    <li key={`e${i}`} className="flex items-start gap-1.5">
                      <AlertCircle className="w-3 h-3 flex-shrink-0 mt-0.5" />{e}
                    </li>
                  ))}
                  {cardText.warnings.map((w, i) => (
                    <li key={`w${i}`} className="opacity-75">· {w}</li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>
      </StepCard>

      {/* Card accent colour */}
      <StepCard>
        <h2 className="text-base font-semibold text-navy-900 mb-1">Card accent colour</h2>
        <p className="text-xs text-navy-600 mb-5 leading-relaxed">
          Sets the border and accent colour on your finished card. Pick from our pastel range,
          stay with Championship Gold, or choose any custom colour.
        </p>
        <CardColourPicker
          value={state.cardBorderColor}
          onChange={(v) => dispatch({ type: 'SET_CARD_BORDER_COLOR', payload: v })}
          title={state.cardBottomText}
          description={state.artworkDescription}
          finish={state.cardFinish}
        />
      </StepCard>

      {/* Card finish */}
      <StepCard>
        <h2 className="text-base font-semibold text-navy-900 mb-1">Card finish</h2>
        <p className="text-xs text-navy-600 mb-4 leading-relaxed">
          Choose the surface finish for the front of your card. All finishes are included at no extra cost.
        </p>
        <CardFinishSelector
          value={state.cardFinish}
          onChange={(v) => dispatch({ type: 'SET_CARD_FINISH', payload: v })}
          borderColor={state.cardBorderColor}
        />
      </StepCard>

      {/* Event date */}
      <StepCard>
        <h2 className="text-base font-semibold text-navy-900 mb-4">Event date</h2>
        <div className="flex flex-col gap-3">
          {!state.eventDateNA && (
            <div className="flex flex-col gap-1.5 animate-fade-up">
              <label className="text-sm font-semibold text-navy-900">Date</label>
              <div className="relative">
                <CalendarDays className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-navy-600 pointer-events-none" />
                <input
                  type="text"
                  placeholder="e.g. 25th April 2026"
                  value={state.eventDate}
                  onChange={(e) => dispatch({ type: 'SET_EVENT_DATE', payload: e.target.value })}
                  className="w-full rounded-xl border border-navy-100 bg-white pl-10 pr-4 py-3 text-sm text-navy-900 placeholder:text-navy-600/50 focus:outline-none focus:ring-2 focus:ring-gold-500 focus:border-transparent transition"
                />
              </div>
            </div>
          )}
          <button
            type="button"
            onClick={() => dispatch({ type: 'SET_EVENT_DATE_NA', payload: !state.eventDateNA })}
            className={cn(
              'flex items-center gap-3 rounded-xl border-2 p-3.5 text-left transition-all duration-150 active:scale-[.98]',
              state.eventDateNA ? 'border-gold-500 bg-gold-50' : 'border-navy-100 bg-white hover:border-navy-600',
            )}
          >
            <div className={cn('w-5 h-5 rounded border-2 flex-shrink-0 flex items-center justify-center transition-all duration-150', state.eventDateNA ? 'border-gold-500 bg-gold-500' : 'border-navy-100')}>
              {state.eventDateNA && (
                <svg className="w-3 h-3 text-white" viewBox="0 0 12 12" fill="none">
                  <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              )}
            </div>
            <div>
              <p className="text-sm font-semibold text-navy-900">Date not applicable</p>
              <p className="text-xs text-navy-600">For recurring events, open-ended runs, or evergreen awards.</p>
            </div>
          </button>
        </div>
      </StepCard>

      {/* Event / occasion brief */}
      <StepCard>
        <TextInput
          label={isCommissioned ? 'Event / occasion brief' : 'Event or occasion (optional)'}
          hint={isCommissioned
            ? 'What is the card for? Helps our designer capture the right tone and imagery.'
            : 'Optionally describe the event these cards are for.'}
          placeholder={isCommissioned
            ? 'e.g. Trad Folkin Raps at Record Room, The Commercial — 25th April, doors 8:30.'
            : 'e.g. Annual club awards night, November 2025.'}
          value={state.eventDescription}
          onChange={(e) => dispatch({ type: 'SET_EVENT_DESCRIPTION', payload: e.target.value })}
        />
      </StepCard>

      {/* Links + CUIGG Survey */}
      <StepCard>
        <div className="flex items-start justify-between mb-1">
          <div>
            <h2 className="text-base font-semibold text-navy-900">Links</h2>
            <p className="text-xs text-navy-600 mt-0.5">
              Add up to 5 links to associate with your card — social profiles, playlists, landing pages, or event info.
            </p>
          </div>
          <Link2 className="w-4 h-4 text-navy-600 flex-shrink-0 mt-0.5" />
        </div>

        <div className="flex flex-col gap-2 mt-4">
          {state.links.map((link, i) => (
            <div key={i} className="flex items-center gap-2 animate-fade-up">
              <input
                type="text"
                placeholder="Label"
                value={link.label}
                onChange={(e) => {
                  const next = state.links.map((l, j) => j === i ? { ...l, label: e.target.value } : l);
                  dispatch({ type: 'SET_LINKS', payload: next });
                }}
                className="w-28 shrink-0 rounded-lg border border-navy-100 bg-white px-2.5 py-2 text-xs text-navy-900 placeholder:text-navy-600/40 focus:outline-none focus:ring-2 focus:ring-gold-500 focus:border-transparent transition"
              />
              <input
                type="url"
                placeholder="https://..."
                value={link.url}
                onChange={(e) => {
                  const next = state.links.map((l, j) => j === i ? { ...l, url: e.target.value } : l);
                  dispatch({ type: 'SET_LINKS', payload: next });
                }}
                className="flex-1 min-w-0 rounded-lg border border-navy-100 bg-white px-2.5 py-2 text-xs text-navy-900 placeholder:text-navy-600/40 focus:outline-none focus:ring-2 focus:ring-gold-500 focus:border-transparent transition"
              />
              <button
                type="button"
                onClick={() => dispatch({ type: 'SET_LINKS', payload: state.links.filter((_, j) => j !== i) })}
                className="p-1.5 rounded-lg text-navy-600 hover:text-red-500 hover:bg-red-50 transition-colors shrink-0"
                aria-label="Remove link"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}

          {state.links.length < 5 && (
            <button
              type="button"
              onClick={() => dispatch({ type: 'SET_LINKS', payload: [...state.links, { label: '', url: '' }] })}
              className="flex items-center gap-2 text-xs font-semibold text-gold-500 hover:text-gold-400 transition-colors mt-1 select-none"
            >
              <Plus className="w-3.5 h-3.5" />
              Add link{state.links.length > 0 ? ` (${5 - state.links.length} remaining)` : ''}
            </button>
          )}
        </div>

        {/* CUIGG Survey toggle */}
        <div className="mt-5 pt-5 border-t border-cream-dark">
          <button
            type="button"
            onClick={() => dispatch({ type: 'SET_CUIGG_SURVEY', payload: !state.cuiggSurvey })}
            className={cn(
              'w-full flex items-center gap-4 rounded-xl border-2 p-4 text-left transition-all duration-150 active:scale-[.98] select-none',
              state.cuiggSurvey ? 'border-gold-500 bg-gold-50' : 'border-navy-100 bg-white hover:border-navy-600',
            )}
          >
            <BarChart2 className={cn('w-5 h-5 flex-shrink-0 transition-colors', state.cuiggSurvey ? 'text-gold-500' : 'text-navy-600')} />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-navy-900">Add CUIGG Survey</p>
              <p className="text-xs text-navy-600 mt-0.5 leading-snug">
                Include a CUIGG satisfaction survey link with your card order — collect attendee feedback automatically.
              </p>
            </div>
            <div className={cn(
              'w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 transition-all duration-150',
              state.cuiggSurvey ? 'border-gold-500 bg-gold-500' : 'border-navy-100',
            )}>
              {state.cuiggSurvey && (
                <svg className="w-3 h-3 text-white" viewBox="0 0 12 12" fill="none">
                  <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              )}
            </div>
          </button>
        </div>
      </StepCard>

      <div className="flex items-center justify-between">
        <Button variant="ghost" onClick={goPrev}>
          <ChevronLeft className="w-4 h-4" /> Back
        </Button>
        <Button onClick={goNext} disabled={!canProceed}>
          Continue <ChevronRight className="w-4 h-4" />
        </Button>
      </div>

        </div>{/* end right column */}
      </div>{/* end two-column grid */}
    </div>
  );
}
