// ============================================================================
// LOWKEY Admin — UI Primitives v2
// ============================================================================

import { useState, useEffect, useRef, type ReactNode, type KeyboardEvent } from 'react';

// ── Colors / tokens ────────────────────────────────────────────────────────
export const ADM = {
  bg:      '#0a0a0a',
  surface: '#0f0f0f',
  border:  '#1a1a1a',
  border2: '#222',
  text:    '#e0e0e0',
  muted:   '#555',
  dim:     '#333',
  accent:  '#ffffff',
  green:   '#22c55e',
  amber:   '#f59e0b',
  red:     '#ef4444',
  blue:    '#3b82f6',
};

// ── Toast system ────────────────────────────────────────────────────────────
type ToastType = 'success' | 'error' | 'info' | 'warning';
interface ToastMsg { id: number; msg: string; type: ToastType; }
let toastId = 0;
const listeners: Array<(t: ToastMsg) => void> = [];

export function toast(msg: string, type: ToastType = 'success') {
  const t = { id: ++toastId, msg, type };
  listeners.forEach(fn => fn(t));
}

export function ToastContainer() {
  const [toasts, setToasts] = useState<ToastMsg[]>([]);
  useEffect(() => {
    const fn = (t: ToastMsg) => {
      setToasts(p => [...p, t]);
      setTimeout(() => setToasts(p => p.filter(x => x.id !== t.id)), 3500);
    };
    listeners.push(fn);
    return () => { const i = listeners.indexOf(fn); if (i >= 0) listeners.splice(i, 1); };
  }, []);

  if (!toasts.length) return null;
  const colors: Record<ToastType, string> = {
    success: '#22c55e', error: '#ef4444', info: '#3b82f6', warning: '#f59e0b'
  };
  return (
    <div style={{ position: 'fixed', bottom: 24, right: 24, zIndex: 9999, display: 'flex', flexDirection: 'column', gap: 8 }}>
      {toasts.map(t => (
        <div key={t.id} style={{
          background: ADM.surface, border: `1px solid ${colors[t.type]}30`,
          borderLeft: `3px solid ${colors[t.type]}`,
          padding: '10px 16px', borderRadius: 6, minWidth: 260, maxWidth: 360,
          fontSize: 12, color: ADM.text, letterSpacing: '0.02em',
          animation: 'slideIn 0.25s ease',
          boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
        }}>
          {t.msg}
        </div>
      ))}
      <style>{`@keyframes slideIn { from { opacity:0; transform:translateX(20px); } to { opacity:1; transform:translateX(0); } }`}</style>
    </div>
  );
}

// ── Modal ───────────────────────────────────────────────────────────────────
export function Modal({ open, onClose, title, children, width = 560 }: {
  open: boolean; onClose: () => void; title: string;
  children: ReactNode; width?: number;
}) {
  useEffect(() => {
    if (!open) return;
    const handler = (e: globalThis.KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    document.body.style.overflow = 'hidden';
    return () => { document.removeEventListener('keydown', handler); document.body.style.overflow = ''; };
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 200,
      background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24,
    }} onClick={onClose}>
      <div style={{
        background: ADM.surface, border: `1px solid ${ADM.border}`,
        borderRadius: 8, width: '100%', maxWidth: width, maxHeight: '90vh',
        overflow: 'hidden', display: 'flex', flexDirection: 'column',
        boxShadow: '0 24px 80px rgba(0,0,0,0.6)',
      }} onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div style={{
          padding: '16px 20px', borderBottom: `1px solid ${ADM.border}`,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0,
        }}>
          <span style={{ fontSize: 13, fontWeight: 500, color: ADM.text, letterSpacing: '0.04em' }}>{title}</span>
          <button onClick={onClose} style={{ color: ADM.muted, background: 'none', border: 'none', cursor: 'pointer', fontSize: 18, lineHeight: 1, padding: 2 }}>×</button>
        </div>
        {/* Body */}
        <div style={{ padding: 20, overflowY: 'auto', flex: 1 }}>{children}</div>
      </div>
    </div>
  );
}

// ── Confirm dialog ──────────────────────────────────────────────────────────
export function Confirm({ open, onClose, onConfirm, title, message, danger = true }: {
  open: boolean; onClose: () => void; onConfirm: () => void;
  title: string; message: string; danger?: boolean;
}) {
  return (
    <Modal open={open} onClose={onClose} title={title} width={400}>
      <p style={{ fontSize: 13, color: ADM.muted, lineHeight: 1.7, marginBottom: 20 }}>{message}</p>
      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
        <ABtn variant="ghost" onClick={onClose}>Cancel</ABtn>
        <ABtn variant={danger ? 'danger' : 'primary'} onClick={() => { onConfirm(); onClose(); }}>Confirm</ABtn>
      </div>
    </Modal>
  );
}

// ── Admin Button ────────────────────────────────────────────────────────────
type BtnVariant = 'primary' | 'ghost' | 'danger' | 'success';
export function ABtn({ children, onClick, variant = 'ghost', disabled, type = 'button', small }: {
  children: ReactNode; onClick?: () => void; variant?: BtnVariant;
  disabled?: boolean; type?: 'button' | 'submit'; small?: boolean;
}) {
  const styles: Record<BtnVariant, { bg: string; color: string; border: string }> = {
    primary: { bg: '#ffffff', color: '#000000', border: 'transparent' },
    ghost:   { bg: 'transparent', color: ADM.muted, border: ADM.border },
    danger:  { bg: 'transparent', color: ADM.red, border: `${ADM.red}40` },
    success: { bg: 'transparent', color: ADM.green, border: `${ADM.green}40` },
  };
  const s = styles[variant];
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      style={{
        background: s.bg, color: s.color, border: `1px solid ${s.border}`,
        padding: small ? '4px 10px' : '7px 14px',
        borderRadius: 5, fontSize: small ? 10 : 11,
        fontFamily: 'inherit', letterSpacing: '0.08em', textTransform: 'uppercase',
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.4 : 1,
        transition: 'opacity 0.2s, background 0.2s',
        whiteSpace: 'nowrap',
      }}
    >
      {children}
    </button>
  );
}

// ── Input ───────────────────────────────────────────────────────────────────
export function AInput({ label, value, onChange, type = 'text', placeholder, hint, area, required, disabled }: {
  label?: string; value: string; onChange: (v: string) => void;
  type?: string; placeholder?: string; hint?: string;
  area?: boolean; required?: boolean; disabled?: boolean;
}) {
  const base: React.CSSProperties = {
    width: '100%', background: ADM.bg, border: `1px solid ${ADM.border}`,
    borderRadius: 5, padding: '8px 10px',
    fontSize: 12, color: ADM.text, fontFamily: 'inherit',
    outline: 'none', transition: 'border-color 0.2s',
    letterSpacing: '0.01em', lineHeight: area ? 1.6 : undefined,
    opacity: disabled ? 0.5 : 1,
  };
  return (
    <div style={{ marginBottom: 14 }}>
      {label && (
        <label style={{ display: 'block', fontSize: 10, color: ADM.muted, letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: 6 }}>
          {label}{required && <span style={{ color: ADM.red, marginLeft: 3 }}>*</span>}
        </label>
      )}
      {area ? (
        <textarea
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
          disabled={disabled}
          rows={4}
          style={{ ...base, resize: 'vertical', minHeight: 80 }}
          onFocus={e => { e.currentTarget.style.borderColor = ADM.dim; }}
          onBlur={e => { e.currentTarget.style.borderColor = ADM.border; }}
        />
      ) : (
        <input
          type={type}
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
          disabled={disabled}
          required={required}
          style={base}
          onFocus={e => { e.currentTarget.style.borderColor = ADM.dim; }}
          onBlur={e => { e.currentTarget.style.borderColor = ADM.border; }}
        />
      )}
      {hint && <p style={{ fontSize: 10, color: ADM.dim, marginTop: 4 }}>{hint}</p>}
    </div>
  );
}

// ── Select ──────────────────────────────────────────────────────────────────
export function ASelect({ label, value, onChange, options }: {
  label?: string; value: string; onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <div style={{ marginBottom: 14 }}>
      {label && <label style={{ display: 'block', fontSize: 10, color: ADM.muted, letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: 6 }}>{label}</label>}
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        style={{
          width: '100%', background: ADM.bg, border: `1px solid ${ADM.border}`,
          borderRadius: 5, padding: '8px 10px', fontSize: 12, color: ADM.text,
          fontFamily: 'inherit', outline: 'none', cursor: 'pointer',
        }}
      >
        {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </div>
  );
}

// ── Search input ─────────────────────────────────────────────────────────────
export function SearchBar({ value, onChange, placeholder = 'Search…' }: {
  value: string; onChange: (v: string) => void; placeholder?: string;
}) {
  return (
    <div style={{ position: 'relative', flex: 1 }}>
      <span style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: ADM.dim, fontSize: 12, pointerEvents: 'none' }}>⌕</span>
      <input
        type="search"
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        style={{
          width: '100%', background: ADM.bg, border: `1px solid ${ADM.border}`,
          borderRadius: 5, padding: '7px 10px 7px 28px',
          fontSize: 12, color: ADM.text, fontFamily: 'inherit', outline: 'none',
        }}
      />
    </div>
  );
}

// ── Stat card ────────────────────────────────────────────────────────────────
export function StatCard({ label, value, sub, trend, color }: {
  label: string; value: string | number; sub?: string;
  trend?: 'up' | 'down' | 'flat'; color?: string;
}) {
  const trendColor = trend === 'up' ? ADM.green : trend === 'down' ? ADM.red : ADM.dim;
  const trendIcon  = trend === 'up' ? '↑' : trend === 'down' ? '↓' : '—';
  return (
    <div style={{
      background: ADM.surface, border: `1px solid ${ADM.border}`,
      borderRadius: 8, padding: '18px 20px',
    }}>
      <p style={{ fontSize: 10, color: ADM.muted, letterSpacing: '0.18em', textTransform: 'uppercase', marginBottom: 10 }}>{label}</p>
      <p style={{ fontSize: 22, fontWeight: 300, color: color || ADM.text, letterSpacing: '0.02em', lineHeight: 1 }}>{value}</p>
      {sub && (
        <p style={{ fontSize: 10, color: trendColor, marginTop: 6, display: 'flex', alignItems: 'center', gap: 4 }}>
          {trend && <span>{trendIcon}</span>}
          {sub}
        </p>
      )}
    </div>
  );
}

// ── Skeleton loader ───────────────────────────────────────────────────────────
export function Skeleton({ h = 36, w = '100%', radius = 4 }: { h?: number; w?: number | string; radius?: number }) {
  return (
    <div style={{
      height: h, width: w, borderRadius: radius,
      background: `linear-gradient(90deg, ${ADM.surface} 25%, ${ADM.border} 50%, ${ADM.surface} 75%)`,
      backgroundSize: '200% 100%',
      animation: 'shimmer 1.4s infinite',
    }}>
      <style>{`@keyframes shimmer { 0%{background-position:200% 0} 100%{background-position:-200% 0} }`}</style>
    </div>
  );
}

// ── Status badge ──────────────────────────────────────────────────────────────
export function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { bg: string; color: string }> = {
    pending:    { bg: '#92400e20', color: '#f59e0b' },
    confirmed:  { bg: '#1e3a5f40', color: '#60a5fa' },
    processing: { bg: '#1e3a5f40', color: '#93c5fd' },
    shipped:    { bg: '#1e40af30', color: '#818cf8' },
    delivered:  { bg: '#14532d30', color: '#4ade80' },
    cancelled:  { bg: '#7f1d1d30', color: '#f87171' },
    active:     { bg: '#14532d30', color: '#4ade80' },
    draft:      { bg: '#1f1f1f',   color: '#6b7280' },
    archived:   { bg: '#1f1f1f',   color: '#4b5563' },
    live:       { bg: '#14532d30', color: '#4ade80' },
    upcoming:   { bg: '#92400e20', color: '#fcd34d' },
    featured:   { bg: '#4c1d9520', color: '#a78bfa' },
  };
  const s = map[status] || { bg: '#1f1f1f', color: '#6b7280' };
  return (
    <span style={{
      background: s.bg, color: s.color,
      padding: '2px 8px', borderRadius: 3,
      fontSize: 9, letterSpacing: '0.15em', textTransform: 'uppercase', fontWeight: 500,
      display: 'inline-block',
    }}>
      {status}
    </span>
  );
}

// ── Simple mini bar chart ─────────────────────────────────────────────────────
export function MiniChart({ data, color = ADM.blue, height = 60 }: {
  data: number[]; color?: string; height?: number;
}) {
  if (!data.length) return null;
  const max = Math.max(...data, 1);
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 2, height }}>
      {data.map((v, i) => (
        <div
          key={i}
          title={`${v}`}
          style={{
            flex: 1, background: color,
            height: `${Math.max(2, (v / max) * 100)}%`,
            borderRadius: 2, opacity: 0.7,
            transition: 'height 0.5s ease',
          }}
        />
      ))}
    </div>
  );
}

// ── Revenue sparkline ─────────────────────────────────────────────────────────
export function RevenueChart({ data, label }: { data: Array<{ day: string; revenue: number }>; label?: string }) {
  const values = data.map(d => d.revenue);
  const max = Math.max(...values, 1);
  const width = 600;
  const height = 120;
  const pad = 8;
  const pts = values.map((v, i) => {
    const x = pad + (i / Math.max(values.length - 1, 1)) * (width - 2 * pad);
    const y = height - pad - ((v / max) * (height - 2 * pad));
    return `${x},${y}`;
  }).join(' ');
  const area = `M${pad},${height - pad} L${pts.split(' ').join(' L')} L${width - pad},${height - pad} Z`;
  const line = `M${pts.split(' ').join(' L')}`;

  return (
    <div style={{ background: ADM.surface, border: `1px solid ${ADM.border}`, borderRadius: 8, padding: '18px 20px' }}>
      {label && <p style={{ fontSize: 10, color: ADM.muted, letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: 12 }}>{label}</p>}
      <svg viewBox={`0 0 ${width} ${height}`} style={{ width: '100%', height: 'auto', display: 'block' }}>
        <defs>
          <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={ADM.blue} stopOpacity="0.25" />
            <stop offset="100%" stopColor={ADM.blue} stopOpacity="0" />
          </linearGradient>
        </defs>
        {values.length > 1 && (
          <>
            <path d={area} fill="url(#revGrad)" />
            <polyline points={pts} fill="none" stroke={ADM.blue} strokeWidth="1.5" />
          </>
        )}
      </svg>
      {/* Day labels — first, middle, last */}
      {data.length > 2 && (
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
          {[data[0], data[Math.floor(data.length / 2)], data[data.length - 1]].map(d => (
            <span key={d.day} style={{ fontSize: 9, color: ADM.dim }}>
              {d.day.slice(5)}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Command palette ──────────────────────────────────────────────────────────
export interface Command { id: string; label: string; icon?: string; action: () => void; }

export function CommandPalette({ open, onClose, commands }: {
  open: boolean; onClose: () => void; commands: Command[];
}) {
  const [q, setQ] = useState('');
  const [idx, setIdx] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { if (open) { setQ(''); setIdx(0); setTimeout(() => inputRef.current?.focus(), 50); } }, [open]);

  const filtered = q.trim()
    ? commands.filter(c => c.label.toLowerCase().includes(q.toLowerCase()))
    : commands.slice(0, 8);

  const handleKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setIdx(i => Math.min(i + 1, filtered.length - 1)); }
    if (e.key === 'ArrowUp')   { e.preventDefault(); setIdx(i => Math.max(i - 1, 0)); }
    if (e.key === 'Enter' && filtered[idx]) { filtered[idx].action(); onClose(); }
    if (e.key === 'Escape') onClose();
  };

  if (!open) return null;
  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 300,
      background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(6px)',
      display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
      paddingTop: '15vh',
    }} onClick={onClose}>
      <div style={{
        background: ADM.surface, border: `1px solid ${ADM.border2}`,
        borderRadius: 10, width: '100%', maxWidth: 520,
        overflow: 'hidden', boxShadow: '0 24px 80px rgba(0,0,0,0.7)',
      }} onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px', borderBottom: `1px solid ${ADM.border}` }}>
          <span style={{ fontSize: 14, color: ADM.dim }}>⌘</span>
          <input
            ref={inputRef}
            type="text"
            value={q}
            onChange={e => { setQ(e.target.value); setIdx(0); }}
            onKeyDown={handleKey}
            placeholder="Type a command or search…"
            style={{ flex: 1, background: 'none', border: 'none', outline: 'none', fontSize: 13, color: ADM.text, fontFamily: 'inherit' }}
          />
          <span style={{ fontSize: 9, color: ADM.dim, letterSpacing: '0.1em' }}>ESC</span>
        </div>
        <div style={{ maxHeight: 340, overflowY: 'auto' }}>
          {filtered.length === 0 && (
            <p style={{ padding: '20px 16px', fontSize: 12, color: ADM.dim, textAlign: 'center' }}>No commands found</p>
          )}
          {filtered.map((c, i) => (
            <button
              key={c.id}
              onClick={() => { c.action(); onClose(); }}
              style={{
                width: '100%', textAlign: 'left', padding: '10px 16px',
                background: i === idx ? '#ffffff08' : 'transparent',
                border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10,
                fontSize: 12, color: i === idx ? ADM.text : ADM.muted, fontFamily: 'inherit',
              }}
            >
              {c.icon && <span style={{ fontSize: 14, width: 20, textAlign: 'center' }}>{c.icon}</span>}
              {c.label}
            </button>
          ))}
        </div>
        <div style={{ padding: '8px 16px', borderTop: `1px solid ${ADM.border}`, display: 'flex', gap: 12 }}>
          {[['↑↓', 'Navigate'], ['↵', 'Select'], ['Esc', 'Close']].map(([k, l]) => (
            <span key={k} style={{ fontSize: 9, color: ADM.dim, display: 'flex', alignItems: 'center', gap: 4 }}>
              <kbd style={{ background: ADM.border, padding: '1px 5px', borderRadius: 3, fontSize: 9, color: ADM.muted }}>{k}</kbd>
              {l}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Pagination ────────────────────────────────────────────────────────────────
export function Pagination({ page, total, perPage, onChange }: {
  page: number; total: number; perPage: number; onChange: (p: number) => void;
}) {
  const pages = Math.ceil(total / perPage);
  if (pages <= 1) return null;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 16, justifyContent: 'flex-end' }}>
      <span style={{ fontSize: 10, color: ADM.muted, marginRight: 8 }}>
        {(page - 1) * perPage + 1}–{Math.min(page * perPage, total)} of {total}
      </span>
      {[['‹', page - 1], ['›', page + 1]].map(([label, target]) => (
        <button
          key={label}
          onClick={() => onChange(Number(target))}
          disabled={Number(target) < 1 || Number(target) > pages}
          style={{
            background: ADM.surface, border: `1px solid ${ADM.border}`,
            borderRadius: 4, width: 28, height: 28, fontSize: 13,
            color: ADM.muted, cursor: 'pointer', display: 'flex',
            alignItems: 'center', justifyContent: 'center',
            opacity: (Number(target) < 1 || Number(target) > pages) ? 0.3 : 1,
          }}
        >
          {label}
        </button>
      ))}
    </div>
  );
}

// ── Empty state ────────────────────────────────────────────────────────────────
export function EmptyState({ icon = '○', title, message, action }: {
  icon?: string; title: string; message?: string; action?: ReactNode;
}) {
  return (
    <div style={{ textAlign: 'center', padding: '48px 24px' }}>
      <div style={{ fontSize: 32, marginBottom: 12, opacity: 0.3 }}>{icon}</div>
      <p style={{ fontSize: 13, color: ADM.muted, marginBottom: 6 }}>{title}</p>
      {message && <p style={{ fontSize: 11, color: ADM.dim, marginBottom: 16 }}>{message}</p>}
      {action}
    </div>
  );
}

// ── Table primitives ───────────────────────────────────────────────────────────
export function THead({ children }: { children: ReactNode }) {
  return (
    <thead>
      <tr style={{ borderBottom: `1px solid ${ADM.border}` }}>
        {children}
      </tr>
    </thead>
  );
}
export function TH({ children, right }: { children?: ReactNode; right?: boolean }) {
  return (
    <th style={{
      padding: '8px 12px', textAlign: right ? 'right' : 'left',
      fontSize: 9, color: ADM.muted, letterSpacing: '0.18em',
      textTransform: 'uppercase', fontWeight: 500,
    }}>
      {children}
    </th>
  );
}
export function TD({ children, right, mono }: { children?: ReactNode; right?: boolean; mono?: boolean }) {
  return (
    <td style={{
      padding: '10px 12px', textAlign: right ? 'right' : 'left',
      fontSize: 12, color: ADM.muted, borderBottom: `1px solid ${ADM.border}08`,
      fontFamily: mono ? 'monospace' : 'inherit',
    }}>
      {children}
    </td>
  );
}
export function TableWrap({ children }: { children: ReactNode }) {
  return (
    <div style={{ overflowX: 'auto', borderRadius: 8, border: `1px solid ${ADM.border}` }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', background: ADM.surface }}>
        {children}
      </table>
    </div>
  );
}

// ── Section card ───────────────────────────────────────────────────────────────
export function Card({ children, title, action, noPad }: {
  children: ReactNode; title?: string; action?: ReactNode; noPad?: boolean;
}) {
  return (
    <div style={{
      background: ADM.surface, border: `1px solid ${ADM.border}`,
      borderRadius: 8, overflow: 'hidden',
    }}>
      {(title || action) && (
        <div style={{
          padding: '14px 18px', borderBottom: `1px solid ${ADM.border}`,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          {title && <span style={{ fontSize: 11, color: ADM.muted, letterSpacing: '0.15em', textTransform: 'uppercase' }}>{title}</span>}
          {action}
        </div>
      )}
      <div style={noPad ? {} : { padding: '16px 18px' }}>{children}</div>
    </div>
  );
}

// ── fmt ────────────────────────────────────────────────────────────────────────
export const fmtEGP = (n: number) => `EGP ${n.toLocaleString('en-EG')}`;
export const fmtNum = (n: number) => n.toLocaleString('en-EG');
export const fmtDate = (s: string) => s ? new Date(s).toLocaleDateString('en-EG', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';
export const fmtTime = (s: string) => s ? new Date(s).toLocaleTimeString('en-EG', { hour: '2-digit', minute: '2-digit' }) : '—';
