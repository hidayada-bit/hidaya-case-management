import { useState, useEffect, useCallback } from 'react'
import ImageUpload from './components/ImageUpload'
import { supabase, BUCKETS } from './lib/supabase'
import { uploadFile } from './lib/imageUtils'

// ─── HDA BRAND COLORS ────────────────────────────────────────────────────────
const B = {
  green:       '#1e7d22',
  greenDark:   '#145717',
  greenLight:  '#e8f5e9',
  greenMid:    '#2e9e33',
  gold:        '#f5a800',
  goldDark:    '#c87d00',
  goldLight:   '#fff8e1',
  goldMid:     '#ffb300',
  sidebar:     '#0d3b0f',
  sidebarMid:  '#145717',
  white:       '#ffffff',
  bg:          '#f0f7f0',
  border:      '#c8e6c9',
  text:        '#1a2e1a',
  textMid:     '#4a6b4a',
  textLight:   '#7a9b7a',
}

// ─── RESPONSIVE HOOK ─────────────────────────────────────────────────────────
function useBreakpoint() {
  const [bp, setBp] = useState(() => {
    const w = window.innerWidth
    return w < 640 ? 'mobile' : w < 1024 ? 'tablet' : 'desktop'
  })
  useEffect(() => {
    const fn = () => {
      const w = window.innerWidth
      setBp(w < 640 ? 'mobile' : w < 1024 ? 'tablet' : 'desktop')
    }
    window.addEventListener('resize', fn)
    return () => window.removeEventListener('resize', fn)
  }, [])
  return bp
}

// ─── HELPERS ──────────────────────────────────────────────────────────────────
const calcAge = d => Math.floor((Date.now() - new Date(d)) / (365.25 * 24 * 3600 * 1000))
const initials = n => n.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
const AVATAR_COLORS = [B.green, B.greenMid, B.greenDark, B.goldDark, '#0891b2', '#7c3aed']
const getColor = n => AVATAR_COLORS[n.charCodeAt(0) % AVATAR_COLORS.length]

const statusStyle = s => ({
  active:   { bg: '#e8f5e9', color: '#1b5e20', dot: B.green },
  inactive: { bg: '#f3f4f6', color: '#374151', dot: '#9ca3af' },
  pending:  { bg: B.goldLight, color: '#7a4f00', dot: B.gold },
}[s] || { bg: '#f3f4f6', color: '#374151', dot: '#9ca3af' })

// ─── LIGHTBOX ────────────────────────────────────────────────────────────────
function Lightbox({ src, alt, onClose }) {
  useEffect(() => {
    const handler = e => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])
  if (!src) return null
  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 99999,
        background: 'rgba(0,0,0,0.85)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 20, backdropFilter: 'blur(6px)',
      }}
    >
      <div onClick={e => e.stopPropagation()} style={{ position: 'relative', maxWidth: '90vw', maxHeight: '90vh' }}>
        <img
          src={src} alt={alt}
          style={{
            maxWidth: '85vw', maxHeight: '85vh',
            borderRadius: 18, objectFit: 'contain',
            boxShadow: '0 32px 80px rgba(0,0,0,0.6)',
            border: `3px solid ${B.gold}`,
          }}
        />
        <button
          onClick={onClose}
          style={{
            position: 'absolute', top: -14, right: -14,
            width: 36, height: 36, borderRadius: '50%',
            background: B.gold, border: 'none', cursor: 'pointer',
            fontSize: 18, color: B.greenDark, fontWeight: 800,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 4px 12px rgba(0,0,0,0.4)',
          }}
        >×</button>
      </div>
    </div>
  )
}
function DocViewer({ doc, onClose }) {
  useEffect(() => {
    const handler = e => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])
  if (!doc) return null

  const isPdf = doc.file_url?.toLowerCase().includes('.pdf') || doc.file_name?.toLowerCase().endsWith('.pdf')

  return (
    <div onClick={onClose} style={{
      position: 'fixed', inset: 0, zIndex: 99999,
      background: 'rgba(0,0,0,0.88)', backdropFilter: 'blur(6px)',
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 20,
    }}>
      <div onClick={e => e.stopPropagation()} style={{ width: '100%', maxWidth: 860, maxHeight: '92vh', display: 'flex', flexDirection: 'column', gap: 10 }}>
        {/* Toolbar */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: B.sidebar, borderRadius: 12, padding: '10px 16px', border: `1px solid rgba(245,168,0,0.3)` }}>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: B.gold }}>{doc.document_type}</div>
            <div style={{ fontSize: 11, color: '#81c784' }}>{doc.file_name} · {doc.file_size_kb}KB</div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <a href={doc.file_url} download target="_blank" rel="noreferrer" style={{ background: B.green, color: '#fff', border: 'none', borderRadius: 8, padding: '6px 14px', fontSize: 12, fontWeight: 700, cursor: 'pointer', textDecoration: 'none' }}>⬇ Download</a>
            <button onClick={onClose} style={{ background: '#dc2626', color: '#fff', border: 'none', borderRadius: 8, padding: '6px 14px', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>✕ Close</button>
          </div>
        </div>
        {/* Viewer */}
        <div style={{ flex: 1, borderRadius: 12, overflow: 'hidden', background: '#1a1a1a', minHeight: 400, maxHeight: '78vh' }}>
          {isPdf
            ? <iframe src={doc.file_url} style={{ width: '100%', height: '100%', minHeight: 500, border: 'none' }} title={doc.document_type} />
            : <img src={doc.file_url} alt={doc.document_type} style={{ width: '100%', height: '100%', objectFit: 'contain', maxHeight: '78vh' }} />
          }
        </div>
      </div>
    </div>
  )
}
// ─── REUSABLE UI ──────────────────────────────────────────────────────────────
const StatusBadge = ({ s }) => {
  const st = statusStyle(s)
  return (
    <span style={{
      background: st.bg, color: st.color,
      padding: '4px 12px', borderRadius: 20, fontSize: 11, fontWeight: 700,
      display: 'inline-flex', alignItems: 'center', gap: 5,
    }}>
      <span style={{ width: 6, height: 6, borderRadius: '50%', background: st.dot }} />
      {s.charAt(0).toUpperCase() + s.slice(1)}
    </span>
  )
}

function Avatar({ name, photoUrl, size = 40, radius = 10, clickable = false }) {
  const [lightbox, setLightbox] = useState(false)
  const style = {
    width: size, height: size, borderRadius: radius,
    objectFit: 'cover', flexShrink: 0,
    cursor: clickable && photoUrl ? 'zoom-in' : 'default',
    transition: 'transform 0.15s, box-shadow 0.15s',
    border: clickable && photoUrl ? `2px solid ${B.gold}` : 'none',
  }
  return (
    <>
      {lightbox && <Lightbox src={photoUrl} alt={name} onClose={() => setLightbox(false)} />}
      {photoUrl
        ? <img
            src={photoUrl} alt={name} style={style}
            onClick={() => clickable && setLightbox(true)}
            onMouseEnter={e => { if (clickable) { e.target.style.transform = 'scale(1.05)'; e.target.style.boxShadow = `0 4px 16px rgba(0,0,0,0.3)` } }}
            onMouseLeave={e => { e.target.style.transform = 'scale(1)'; e.target.style.boxShadow = 'none' }}
          />
        : <div style={{
            width: size, height: size, borderRadius: radius,
            background: `linear-gradient(135deg, ${getColor(name)}, ${getColor(name)}cc)`,
            color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontWeight: 800, fontSize: size * 0.33, flexShrink: 0,
            border: `2px solid rgba(255,255,255,0.2)`,
          }}>{initials(name)}</div>
      }
    </>
  )
}

const Btn = ({ children, onClick, variant = 'primary', size = 'md', disabled, full }) => {
  const v = {
    primary: {
      background: `linear-gradient(135deg, ${B.green}, ${B.greenMid})`,
      color: '#fff', border: 'none',
      boxShadow: `0 2px 8px rgba(30,125,34,0.35)`,
    },
    secondary: { background: '#fff', color: B.text, border: `1.5px solid ${B.border}` },
    danger:    { background: '#fef2f2', color: '#dc2626', border: '1.5px solid #fecaca' },
    green:     { background: B.greenLight, color: B.greenDark, border: `1.5px solid ${B.border}` },
    gold: {
      background: `linear-gradient(135deg, ${B.gold}, ${B.goldMid})`,
      color: B.greenDark, border: 'none',
      boxShadow: `0 2px 8px rgba(245,168,0,0.4)`,
    },
  }[variant]
  const p = { sm: '8px 16px', md: '11px 22px', lg: '14px 30px' }[size]
  const fs = { sm: 13, md: 14, lg: 15 }[size]
  const minH = { sm: 36, md: 44, lg: 48 }[size]
  return (
    <button
      onClick={onClick} disabled={disabled}
      style={{
        ...v, padding: p, fontSize: fs, fontWeight: 700,
        borderRadius: 9, cursor: disabled ? 'not-allowed' : 'pointer',
        fontFamily: 'inherit', display: 'inline-flex', alignItems: 'center', gap: 6,
        opacity: disabled ? .5 : 1, width: full ? '100%' : undefined,
        justifyContent: full ? 'center' : undefined, transition: 'all 0.15s',
        minHeight: minH, touchAction: 'manipulation',
      }}
    >
      {children}
    </button>
  )
}

// ─── CLICK-TO-CALL BUTTON ─────────────────────────────────────────────────────
const CallBtn = ({ phone, label = '' }) => {
  if (!phone || phone === '—') return <span style={{ fontSize: 12, color: B.textLight }}>{phone || '—'}</span>
  const clean = phone.replace(/[\s\-]/g, '')
  return (
    <a
      href={`tel:${clean}`}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 6,
        background: `linear-gradient(135deg, ${B.green}, ${B.greenMid})`,
        color: '#fff', borderRadius: 20, padding: '6px 14px',
        fontSize: 12, fontWeight: 700, textDecoration: 'none',
        boxShadow: `0 2px 8px rgba(30,125,34,0.3)`,
        transition: 'all 0.15s', minHeight: 32,
      }}
      onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.04)' }}
      onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)' }}
    >
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
        <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12 19.79 19.79 0 0 1 1.61 3.39 2 2 0 0 1 3.6 1.22h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 8.8a16 16 0 0 0 5.55 5.55l.86-.86a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 21 16.92z"/>
      </svg>
      {label || phone}
    </a>
  )
}

// ─── FORM HELPERS ─────────────────────────────────────────────────────────────
const FL = ({ children, req }) => (
  <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: B.textMid, marginBottom: 6 }}>
    {children}{req && <span style={{ color: '#ef4444' }}> *</span>}
  </label>
)
const inputBase = {
  width: '100%', padding: '11px 14px', border: `1.5px solid ${B.border}`,
  borderRadius: 9, fontSize: 16, color: B.text, outline: 'none',
  fontFamily: 'inherit', background: '#fafff9', boxSizing: 'border-box',
  minHeight: 46,
}
const FI = ({ label, value, onChange, placeholder, type = 'text', req }) => (
  <div style={{ marginBottom: 16 }}>
    <FL req={req}>{label}</FL>
    <input
      type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
      style={inputBase}
      onFocus={e => e.target.style.borderColor = B.green}
      onBlur={e => e.target.style.borderColor = B.border}
    />
  </div>
)
const FS = ({ label, value, onChange, options }) => (
  <div style={{ marginBottom: 16 }}>
    <FL>{label}</FL>
    <select
      value={value} onChange={e => onChange(e.target.value)}
      style={inputBase}
    >
      {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  </div>
)
const FT = ({ label, value, onChange, placeholder }) => (
  <div style={{ marginBottom: 16 }}>
    <FL>{label}</FL>
    <textarea
      value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} rows={2}
      style={{ ...inputBase, resize: 'vertical' }}
      onFocus={e => e.target.style.borderColor = B.green}
      onBlur={e => e.target.style.borderColor = B.border}
    />
  </div>
)

// ─── TOAST ───────────────────────────────────────────────────────────────────
function useToast() {
  const [toasts, setToasts] = useState([])
  const show = (msg, type = 'success') => {
    const id = Date.now()
    setToasts(t => [...t, { id, msg, type }])
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 3500)
  }
  return { toasts, show }
}
const ToastColors = {
  success: { bg: B.greenLight, border: '#a5d6a7', color: B.greenDark, icon: '✓' },
  error:   { bg: '#fef2f2', border: '#fca5a5', color: '#991b1b', icon: '✗' },
  info:    { bg: B.goldLight, border: '#ffe082', color: B.goldDark, icon: 'ℹ' },
}

// ─── MODAL ───────────────────────────────────────────────────────────────────
const Modal = ({ open, onClose, title, children, width = 540 }) => {
  const bp = useBreakpoint()
  const isMobile = bp === 'mobile'
  if (!open) return null
  if (isMobile) {
    // Full-screen bottom sheet on mobile — easier to read & operate one-handed
    return (
      <div
        style={{
          position: 'fixed', inset: 0, background: 'rgba(13,59,15,0.55)',
          zIndex: 9000, display: 'flex', alignItems: 'flex-end',
        }}
        onClick={onClose}
      >
        <div
          style={{
            background: '#fff', borderRadius: '20px 20px 0 0', width: '100%',
            maxHeight: '94vh', display: 'flex', flexDirection: 'column',
            boxShadow: '0 -8px 40px rgba(0,0,0,0.3)',
            animation: 'sheetUp 0.22s ease',
          }}
          onClick={e => e.stopPropagation()}
        >
          <div style={{ display: 'flex', justifyContent: 'center', padding: '10px 0 0' }}>
            <div style={{ width: 38, height: 4, borderRadius: 2, background: B.border }} />
          </div>
          <div style={{
            padding: '12px 18px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            borderBottom: `2px solid ${B.greenLight}`, flexShrink: 0,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 4, height: 20, borderRadius: 2, background: `linear-gradient(to bottom, ${B.gold}, ${B.green})` }} />
              <span style={{ fontSize: 16, fontWeight: 800, color: B.text }}>{title}</span>
            </div>
            <button
              onClick={onClose}
              style={{
                background: B.greenLight, border: `1px solid ${B.border}`,
                borderRadius: '50%', width: 36, height: 36, cursor: 'pointer',
                fontSize: 18, color: B.greenDark, display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0,
              }}
            >×</button>
          </div>
          <div style={{ padding: '16px 18px calc(20px + env(safe-area-inset-bottom))', overflowY: 'auto' }}>{children}</div>
        </div>
      </div>
    )
  }
  return (
    <div
      style={{
        position: 'fixed', inset: 0, background: 'rgba(13,59,15,0.5)',
        zIndex: 9000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: '#fff', borderRadius: 18, width: '100%', maxWidth: width,
          maxHeight: '92vh', overflow: 'auto',
          boxShadow: `0 32px 80px rgba(0,0,0,0.28), 0 0 0 1px ${B.border}`,
        }}
        onClick={e => e.stopPropagation()}
      >
        <div style={{
          padding: '16px 22px', borderBottom: `2px solid ${B.greenLight}`,
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          background: `linear-gradient(to right, ${B.greenLight}, #fff)`,
          borderRadius: '18px 18px 0 0',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 4, height: 20, borderRadius: 2,
              background: `linear-gradient(to bottom, ${B.gold}, ${B.green})`,
            }} />
            <span style={{ fontSize: 16, fontWeight: 800, color: B.text }}>{title}</span>
          </div>
          <button
            onClick={onClose}
            style={{
              background: B.greenLight, border: `1px solid ${B.border}`,
              borderRadius: 8, width: 30, height: 30, cursor: 'pointer',
              fontSize: 18, color: B.greenDark, display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >×</button>
        </div>
        <div style={{ padding: 22 }}>{children}</div>
      </div>
    </div>
  )
}

// ─── LOADING SKELETON ─────────────────────────────────────────────────────────
const Skeleton = ({ w = '100%', h = 16, r = 8 }) => (
  <div style={{
    width: w, height: h, borderRadius: r,
    background: `linear-gradient(90deg, ${B.greenLight} 25%, ${B.border} 50%, ${B.greenLight} 75%)`,
    backgroundSize: '200% 100%', animation: 'shimmer 1.4s infinite',
  }} />
)

// ─── DONUT CHART ─────────────────────────────────────────────────────────────
const DonutChart = ({ active, inactive, pending }) => {
  const total = active + inactive + pending || 1
  const r = 30, circ = 2 * Math.PI * r
  const aD = circ * (active / total), iD = circ * (inactive / total)
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
      <svg width="76" height="76" viewBox="0 0 76 76">
        <circle cx="38" cy="38" r={r} fill="none" stroke={B.border} strokeWidth="11" />
        <circle cx="38" cy="38" r={r} fill="none" stroke={B.green} strokeWidth="11"
          strokeDasharray={`${aD} ${circ - aD}`} transform="rotate(-90 38 38)" strokeLinecap="round" />
        <circle cx="38" cy="38" r={r} fill="none" stroke={B.gold} strokeWidth="11"
          strokeDasharray={`${iD} ${circ - iD}`} strokeDashoffset={-aD} transform="rotate(-90 38 38)" strokeLinecap="round" />
        <text x="38" y="35" textAnchor="middle" fontSize="10" fontWeight="800" fill={B.text}>{Math.round((active / total) * 100)}%</text>
        <text x="38" y="48" textAnchor="middle" fontSize="9" fill={B.textLight}>Active</text>
      </svg>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {[
          { c: B.green, l: 'Active', v: active },
          { c: B.gold, l: 'Inactive', v: inactive },
          { c: '#f59e0b', l: 'Pending', v: pending },
        ].map(x => (
          <div key={x.l} style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: x.c, flexShrink: 0 }} />
            <span style={{ fontSize: 12, color: B.textLight }}>{x.l}: <strong style={{ color: B.text }}>{x.v}</strong></span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── MOBILE BOTTOM NAV ────────────────────────────────────────────────────────
const NAV = [
  { id: 'dashboard', label: 'Home',    d: 'M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z M9 22V12h6v10' },
  { id: 'families',  label: 'Families', d: 'M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2 M9 7a4 4 0 1 0 0-8 4 4 0 0 0 0 8 M23 21v-2a4 4 0 0 0-3-3.87 M16 3.13a4 4 0 0 1 0 7.75' },
  { id: 'analytics', label: 'Stats',   d: 'M18 20V10 M12 20V4 M6 20v-6' },
  { id: 'settings',  label: 'Settings', d: 'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6 M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z' },
]

function MobileBottomNav({ page, setPage }) {
  const activePage = page === 'detail' ? 'families' : page
  return (
    <nav style={{
      position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 200,
      background: B.sidebar, borderTop: `2px solid ${B.sidebarMid}`,
      display: 'flex', height: 'calc(60px + env(safe-area-inset-bottom))',
      paddingBottom: 'env(safe-area-inset-bottom)',
      boxShadow: '0 -4px 20px rgba(0,0,0,0.3)',
    }}>
      {NAV.map(item => {
        const active = activePage === item.id
        return (
          <button
            key={item.id}
            onClick={() => setPage(item.id)}
            style={{
              flex: 1, display: 'flex', flexDirection: 'column',
              alignItems: 'center', justifyContent: 'center', gap: 3,
              border: 'none', background: 'transparent', cursor: 'pointer',
              borderTop: active ? `3px solid ${B.gold}` : '3px solid transparent',
              transition: 'all 0.15s', touchAction: 'manipulation',
            }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
              stroke={active ? B.gold : '#6b9c6b'} strokeWidth="2"
              strokeLinecap="round" strokeLinejoin="round">
              <path d={item.d} />
            </svg>
            <span style={{ fontSize: 10, fontWeight: active ? 700 : 500, color: active ? B.gold : '#6b9c6b' }}>
              {item.label}
            </span>
          </button>
        )
      })}
    </nav>
  )
}

// ─── SIDEBAR ─────────────────────────────────────────────────────────────────
function Sidebar({ page, setPage, collapsed, setCollapsed, user, onSignOut }) {
  const activePage = page === 'detail' ? 'families' : page
  return (
    <aside style={{
      width: collapsed ? 66 : 220, flexShrink: 0,
      background: `linear-gradient(180deg, ${B.sidebar} 0%, ${B.sidebarMid} 100%)`,
      height: '100vh', position: 'sticky', top: 0,
      display: 'flex', flexDirection: 'column',
      transition: 'width 0.22s ease', overflow: 'hidden',
      boxShadow: `4px 0 24px rgba(0,0,0,0.25)`,
    }}>
      {/* Logo area */}
      <div style={{
        padding: collapsed ? '16px 10px' : '16px',
        borderBottom: `1px solid rgba(255,255,255,0.08)`,
        display: 'flex', alignItems: 'center', gap: 10,
        justifyContent: collapsed ? 'center' : 'flex-start',
        background: 'rgba(0,0,0,0.15)',
      }}>
        <div style={{
          width: 42, height: 42, borderRadius: 12,
          background: '#fff', display: 'flex', alignItems: 'center',
          justifyContent: 'center', flexShrink: 0, overflow: 'hidden',
          boxShadow: `0 2px 10px rgba(245,168,0,0.4), 0 0 0 2px ${B.gold}`,
        }}>
          <img src="/HDA_LOGO.png" alt="HDA"
            style={{ width: 38, height: 38, objectFit: 'contain' }}
            onError={e => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'flex' }} />
          <div style={{ display: 'none', width: 38, height: 38, alignItems: 'center', justifyContent: 'center', fontSize: 22 }}>🌟</div>
        </div>
        {!collapsed && (
          <div>
            <div style={{ fontSize: 13, fontWeight: 800, color: B.gold, lineHeight: 1.2, letterSpacing: '-0.02em' }}>HDA</div>
            <div style={{ fontSize: 9, color: '#a5d6a7', fontWeight: 500, lineHeight: 1.3 }}>Hidaya Development</div>
            <div style={{ fontSize: 9, color: '#81c784', fontWeight: 500 }}>Association</div>
          </div>
        )}
      </div>

      {/* Nav items */}
      <nav style={{ flex: 1, padding: '12px 6px' }}>
        {NAV.map(item => {
          const active = activePage === item.id
          return (
            <button
              key={item.id}
              onClick={() => setPage(item.id)}
              style={{
                width: '100%', padding: collapsed ? '12px' : '10px 14px',
                borderRadius: 10, border: 'none', cursor: 'pointer',
                background: active
                  ? `linear-gradient(135deg, rgba(30,125,34,0.5), rgba(46,158,51,0.3))`
                  : 'transparent',
                display: 'flex', alignItems: 'center', gap: 10,
                marginBottom: 4,
                justifyContent: collapsed ? 'center' : 'flex-start',
                transition: 'all 0.15s',
                borderLeft: active ? `3px solid ${B.gold}` : '3px solid transparent',
                paddingLeft: active && !collapsed ? '11px' : undefined,
              }}
              onMouseEnter={e => { if (!active) e.currentTarget.style.background = 'rgba(255,255,255,0.06)' }}
              onMouseLeave={e => { if (!active) e.currentTarget.style.background = 'transparent' }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
                stroke={active ? B.gold : '#81c784'} strokeWidth="2"
                strokeLinecap="round" strokeLinejoin="round">
                <path d={item.d} />
              </svg>
              {!collapsed && (
                <span style={{
                  fontSize: 13, fontWeight: active ? 700 : 500,
                  color: active ? B.gold : '#a5d6a7',
                }}>{item.label}</span>
              )}
            </button>
          )
        })}
      </nav>

      {/* User + sign out */}
      <div style={{ padding: collapsed ? '10px 6px' : '10px 12px', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
        {!collapsed && user && (
          <div style={{ marginBottom: 8, padding: '8px 10px', background: 'rgba(255,255,255,0.06)', borderRadius: 8 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: '#e8f5e9', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {user.full_name || user.email}
            </div>
            <div style={{ fontSize: 10, color: '#81c784', textTransform: 'capitalize', marginTop: 1 }}>{user.role || 'staff'}</div>
          </div>
        )}
        <button
          onClick={onSignOut}
          style={{
            width: '100%', padding: '8px',
            background: 'rgba(255,255,255,0.06)',
            border: '1px solid rgba(255,255,255,0.12)',
            borderRadius: 8, cursor: 'pointer', color: '#a5d6a7', fontSize: 12,
            display: 'flex', alignItems: 'center',
            justifyContent: collapsed ? 'center' : 'flex-start', gap: 6,
            transition: 'all 0.15s',
          }}
          onMouseEnter={e => { e.currentTarget.style.background = 'rgba(220,38,38,0.15)'; e.currentTarget.style.color = '#fca5a5' }}
          onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; e.currentTarget.style.color = '#a5d6a7' }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
            <polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" />
          </svg>
          {!collapsed && 'Sign Out'}
        </button>
      </div>
      <button
        onClick={() => setCollapsed(!collapsed)}
        style={{
          margin: '0 6px 10px', padding: '7px',
          border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: 8, background: 'transparent', cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          transition: 'background 0.15s',
        }}
        onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.08)'}
        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
      >
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#81c784" strokeWidth="2" strokeLinecap="round">
          {collapsed ? <polyline points="9 18 15 12 9 6" /> : <polyline points="15 18 9 12 15 6" />}
        </svg>
      </button>
    </aside>
  )
}

// ─── HEADER ───────────────────────────────────────────────────────────────────
function Header({ title, breadcrumb, isMobile }) {
  return (
    <div style={{
      background: '#fff', borderBottom: `2px solid ${B.greenLight}`,
      padding: isMobile ? '0 16px' : '0 26px',
      height: 58, display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      position: 'sticky', top: 0, zIndex: 50,
      boxShadow: `0 2px 12px rgba(30,125,34,0.08)`,
    }}>
      <div>
        {breadcrumb
          ? <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              {breadcrumb.map((b, i) => (
                <span key={i} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  {i > 0 && <span style={{ color: B.border }}>›</span>}
                  <span style={{
                    fontSize: isMobile ? 12 : 13,
                    color: i === breadcrumb.length - 1 ? B.text : B.textLight,
                    fontWeight: i === breadcrumb.length - 1 ? 700 : 500,
                    maxWidth: isMobile ? 120 : 'none',
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  }}>{b}</span>
                </span>
              ))}
            </div>
          : <span style={{ fontSize: isMobile ? 15 : 17, fontWeight: 800, color: B.text }}>{title}</span>
        }
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        {/* HDA Gold accent dot */}
        <div style={{
          width: 8, height: 8, borderRadius: '50%',
          background: `radial-gradient(circle, ${B.gold}, ${B.goldDark})`,
          boxShadow: `0 0 6px ${B.gold}`,
        }} />
        {!isMobile && <span style={{ fontSize: 12, color: B.textMid, fontWeight: 600 }}>HDA Staff Portal</span>}
      </div>
    </div>
  )
}

// ─── STAT CARD ────────────────────────────────────────────────────────────────
const StatCard = ({ label, value, icon, bg, color, sub, loading, isMobile }) => (
  <div style={{
    background: '#fff', borderRadius: 14,
    border: `1px solid ${B.border}`,
    padding: isMobile ? '13px 14px' : '16px 18px', display: 'flex', alignItems: 'center',
    gap: isMobile ? 10 : 14, flex: 1, minWidth: 0,
    boxShadow: `0 2px 12px rgba(30,125,34,0.06)`,
    transition: 'transform 0.15s, box-shadow 0.15s',
  }}
    onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = `0 8px 24px rgba(30,125,34,0.12)` }}
    onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = `0 2px 12px rgba(30,125,34,0.06)` }}
  >
    <div style={{
      width: isMobile ? 38 : 46, height: isMobile ? 38 : 46, borderRadius: 12, background: bg,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: isMobile ? 18 : 22, flexShrink: 0,
      boxShadow: `0 2px 8px rgba(0,0,0,0.08)`,
    }}>{icon}</div>
    <div style={{ flex: 1, minWidth: 0 }}>
      <div style={{
        fontSize: isMobile ? 9 : 10, color: B.textLight, fontWeight: 700,
        textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 3,
        whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
      }}>{label}</div>
      {loading ? <Skeleton h={isMobile ? 20 : 24} w={60} /> : (
        <div style={{ fontSize: isMobile ? 21 : 26, fontWeight: 800, color: B.text, lineHeight: 1 }}>{value}</div>
      )}
      {sub && !loading && <div style={{ fontSize: 11, color, marginTop: 2, fontWeight: 600 }}>{sub}</div>}
    </div>
  </div>
)

// ─── DASHBOARD PAGE ───────────────────────────────────────────────────────────
function DashboardPage({ families, children, loading, onView, onAdd, isMobile, isTablet }) {
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('All')
  const [pg, setPg] = useState(1)
  const PER = isMobile ? 6 : 8
  const active   = families.filter(f => f.status === 'active').length
  const inactive = families.filter(f => f.status === 'inactive').length
  const pending  = families.filter(f => f.status === 'pending').length

  const filtered = families.filter(f => {
    const q = search.toLowerCase()
    return (!q || f.mother_name.toLowerCase().includes(q) || f.family_code.toLowerCase().includes(q) || (f.phone_number || '').includes(q))
      && (filter === 'All' || f.status === filter.toLowerCase())
  })
  const paged = filtered.slice((pg - 1) * PER, pg * PER)
  const pages = Math.ceil(filtered.length / PER)

  return (
    <div style={{ padding: isMobile ? '14px 12px 84px' : '22px 26px', maxWidth: 1140, margin: '0 auto', position: 'relative' }}>
      {/* Stats grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: isMobile ? '1fr 1fr' : isTablet ? '1fr 1fr 1fr' : '1fr 1fr 1fr auto',
        gap: isMobile ? 10 : 14, marginBottom: isMobile ? 14 : 20,
      }}>
        <StatCard label="Total Families" value={families.length} icon="👨‍👩‍👧‍👦" bg={B.greenLight} color={B.green} sub={`${active} active`} loading={loading} isMobile={isMobile} />
        <StatCard label="Total Children" value={children.length} icon="👶" bg={B.goldLight} color={B.goldDark} sub="enrolled" loading={loading} isMobile={isMobile} />
        <StatCard label="Pending Cases" value={pending} icon="⏳" bg="#fff8e1" color="#e65100" sub="need review" loading={loading} isMobile={isMobile} />
        {!isMobile && (
          <div style={{
            background: '#fff', borderRadius: 14, border: `1px solid ${B.border}`,
            padding: '16px 18px', minWidth: 190,
            boxShadow: `0 2px 12px rgba(30,125,34,0.06)`,
          }}>
            <div style={{ fontSize: 10, color: B.textLight, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 10 }}>Family Statistics</div>
            {loading ? <Skeleton h={60} /> : <DonutChart active={active} inactive={inactive} pending={pending} />}
          </div>
        )}
      </div>

      {/* Table card */}
      <div style={{
        background: '#fff', borderRadius: 16,
        border: `1px solid ${B.border}`, overflow: 'hidden',
        boxShadow: `0 4px 20px rgba(30,125,34,0.08)`,
      }}>
        {/* Table header bar — sticky so search stays put while scrolling the list */}
        <div style={{
          padding: isMobile ? '12px 14px' : '16px 20px',
          borderBottom: `1px solid ${B.greenLight}`,
          background: `linear-gradient(to right, ${B.greenLight}, #fff)`,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          flexWrap: 'wrap', gap: 10,
          position: 'sticky', top: isMobile ? 58 : 0, zIndex: 10,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 3, height: 18, borderRadius: 2, background: `linear-gradient(to bottom, ${B.gold}, ${B.green})` }} />
            <span style={{ fontSize: 15, fontWeight: 800, color: B.text }}>Beneficiary List</span>
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', width: isMobile ? '100%' : 'auto' }}>
            <div style={{ position: 'relative', flex: isMobile ? 1 : 'none' }}>
              <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: B.textLight, fontSize: 14 }}>🔍</span>
              <input
                value={search} onChange={e => { setSearch(e.target.value); setPg(1) }}
                placeholder={isMobile ? 'Search families…' : 'Search name, code, phone…'}
                style={{
                  paddingLeft: 34, paddingRight: 10, paddingTop: 10, paddingBottom: 10,
                  border: `1.5px solid ${B.border}`, borderRadius: 9, fontSize: 16,
                  outline: 'none', fontFamily: 'inherit', width: isMobile ? '100%' : 200,
                  background: '#fff', minHeight: 42,
                }}
                onFocus={e => e.target.style.borderColor = B.green}
                onBlur={e => e.target.style.borderColor = B.border}
              />
            </div>
            {!isMobile && (
              <select
                value={filter} onChange={e => { setFilter(e.target.value); setPg(1) }}
                style={{ padding: '9px 10px', border: `1.5px solid ${B.border}`, borderRadius: 8, fontSize: 13, color: B.text, fontFamily: 'inherit', background: '#fafff9', minHeight: 42 }}
              >
                {['All', 'Active', 'Inactive', 'Pending'].map(o => <option key={o}>{o}</option>)}
              </select>
            )}
            {!isMobile && <Btn onClick={onAdd} variant="gold" size="md">＋ Add Family</Btn>}
          </div>
          {isMobile && (
            <div style={{ display: 'flex', gap: 6, width: '100%', overflowX: 'auto' }}>
              {['All', 'Active', 'Inactive', 'Pending'].map(o => (
                <button key={o} onClick={() => { setFilter(o); setPg(1) }}
                  style={{
                    padding: '6px 14px', borderRadius: 20, fontSize: 12, fontWeight: 700,
                    border: `1.5px solid ${filter === o ? B.green : B.border}`,
                    background: filter === o ? B.green : '#fff',
                    color: filter === o ? '#fff' : B.textMid,
                    whiteSpace: 'nowrap', flexShrink: 0,
                  }}>{o}</button>
              ))}
            </div>
          )}
        </div>

        {/* Mobile card list */}
        {isMobile ? (
          <div>
            {loading && Array.from({ length: 4 }).map((_, i) => (
              <div key={i} style={{ padding: '14px', borderBottom: `1px solid ${B.greenLight}` }}>
                <Skeleton h={60} />
              </div>
            ))}
            {!loading && paged.length === 0 && (
              <div style={{ padding: '48px 20px', textAlign: 'center', color: B.textLight }}>
                <div style={{ fontSize: 38, marginBottom: 10 }}>🔍</div>
                <div style={{ fontWeight: 700, color: B.text, marginBottom: 4 }}>No families found</div>
                <div style={{ fontSize: 13 }}>Try a different search term or filter.</div>
              </div>
            )}
            {!loading && paged.map(f => (
              <div
                key={f.id}
                onClick={() => onView(f)}
                style={{
                  padding: '14px 16px', borderBottom: `1px solid ${B.greenLight}`,
                  display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer',
                  transition: 'background 0.15s', minHeight: 64,
                }}
              >
                <Avatar name={f.mother_name} photoUrl={f.mother_photo_url} size={46} radius={11} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: 14, color: B.text, marginBottom: 3 }}>{f.mother_name}</div>
                  <div style={{ fontSize: 11, color: B.textLight }}>{f.family_code} · {f.district} · {f.children_count?.[0]?.count ?? 0} children</div>
                </div>
                <StatusBadge s={f.status} />
                <span style={{ color: B.border, fontSize: 16 }}>›</span>
              </div>
            ))}
          </div>
        ) : (
          /* Desktop table */
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 580 }}>
              <thead>
                <tr style={{ background: B.greenLight }}>
                  {['Code', 'Roll No', 'Mother', 'Phone', 'District', 'Children', 'Status', ''].map(h => (
                    <th key={h} style={{
                      padding: '10px 14px', textAlign: 'left',
                      fontSize: 11, fontWeight: 700, color: B.textMid,
                      letterSpacing: '0.05em', textTransform: 'uppercase',
                      borderBottom: `1px solid ${B.border}`, whiteSpace: 'nowrap',
                    }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading && Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} style={{ borderBottom: `1px solid ${B.greenLight}` }}>
                    {Array.from({ length: 8 }).map((_, j) => (
                      <td key={j} style={{ padding: '14px' }}><Skeleton h={14} /></td>
                    ))}
                  </tr>
                ))}
                {!loading && paged.length === 0 && (
                  <tr><td colSpan={8} style={{ padding: 40, textAlign: 'center', color: B.textLight }}>
                    <div style={{ fontSize: 36, marginBottom: 8 }}>🔍</div>No families found.
                  </td></tr>
                )}
                {!loading && paged.map(f => (
                  <tr
                    key={f.id}
                    style={{ borderBottom: `1px solid ${B.greenLight}`, cursor: 'pointer', transition: 'background 0.12s' }}
                    onMouseEnter={e => e.currentTarget.style.background = '#f1faf1'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                    onClick={() => onView(f)}
                  >
                    <td style={{ padding: '12px 14px', fontWeight: 700, color: B.green, fontSize: 13 }}>{f.family_code}</td>
                    <td style={{ padding: '12px 14px', fontSize: 13, color: B.textMid }}>{f.roll_number}</td>
                    <td style={{ padding: '12px 14px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <Avatar name={f.mother_name} photoUrl={f.mother_photo_url} size={34} radius={9} />
                        <span style={{ fontWeight: 650, fontSize: 13, color: B.text }}>{f.mother_name}</span>
                      </div>
                    </td>
                    <td style={{ padding: '12px 14px' }}>
                      <CallBtn phone={f.phone_number} />
                    </td>
                    <td style={{ padding: '12px 14px', fontSize: 13, color: B.textMid }}>{f.district}</td>
                    <td style={{ padding: '12px 14px' }}>
                      <span style={{ background: B.greenLight, color: B.green, fontWeight: 700, fontSize: 12, padding: '2px 10px', borderRadius: 20 }}>
                        {f.children_count?.[0]?.count ?? 0}
                      </span>
                    </td>
                    <td style={{ padding: '12px 14px' }}><StatusBadge s={f.status} /></td>
                    <td style={{ padding: '12px 14px' }}>
                      <button
                        onClick={e => { e.stopPropagation(); onView(f) }}
                        style={{
                          background: B.greenLight, border: `1px solid ${B.border}`,
                          borderRadius: 7, padding: '5px 12px', cursor: 'pointer',
                          fontSize: 12, color: B.green, fontWeight: 700,
                          transition: 'all 0.15s',
                        }}
                        onMouseEnter={e => { e.currentTarget.style.background = B.green; e.currentTarget.style.color = '#fff' }}
                        onMouseLeave={e => { e.currentTarget.style.background = B.greenLight; e.currentTarget.style.color = B.green }}
                      >View →</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {!loading && pages > 1 && (
          <div style={{
            padding: '12px 16px', borderTop: `1px solid ${B.greenLight}`,
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            background: '#fafff9',
          }}>
            <span style={{ fontSize: 12, color: B.textLight }}>
              {Math.min((pg - 1) * PER + 1, filtered.length)}–{Math.min(pg * PER, filtered.length)} of {filtered.length}
            </span>
            <div style={{ display: 'flex', gap: 4 }}>
              <button onClick={() => setPg(p => Math.max(1, p - 1))} disabled={pg === 1}
                style={{ padding: '5px 10px', border: `1px solid ${B.border}`, borderRadius: 6, background: '#fff', cursor: 'pointer', fontSize: 12, color: B.textMid, opacity: pg === 1 ? .4 : 1 }}>← Prev</button>
              {Array.from({ length: Math.min(pages, 4) }, (_, i) => i + 1).map(p => (
                <button key={p} onClick={() => setPg(p)}
                  style={{ width: 28, height: 28, border: '1px solid', borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: 'pointer', background: p === pg ? B.green : '#fff', color: p === pg ? '#fff' : B.textMid, borderColor: p === pg ? B.green : B.border }}>
                  {p}
                </button>
              ))}
              <button onClick={() => setPg(p => Math.min(pages, p + 1))} disabled={pg === pages}
                style={{ padding: '5px 10px', border: `1px solid ${B.border}`, borderRadius: 6, background: '#fff', cursor: 'pointer', fontSize: 12, color: B.textMid, opacity: pg === pages ? .4 : 1 }}>Next →</button>
            </div>
          </div>
        )}
      </div>

      {/* Mobile floating action button — thumb-reachable add */}
      {isMobile && (
        <button
          onClick={onAdd}
          style={{
            position: 'fixed', right: 18, bottom: 'calc(76px + env(safe-area-inset-bottom))',
            width: 56, height: 56, borderRadius: '50%',
            background: `linear-gradient(135deg, ${B.gold}, ${B.goldMid})`,
            border: 'none', boxShadow: '0 8px 20px rgba(245,168,0,0.5)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 26, color: B.greenDark, fontWeight: 800, cursor: 'pointer',
            zIndex: 150, touchAction: 'manipulation',
          }}
          aria-label="Add family"
        >＋</button>
      )}
    </div>
  )
}

// ─── FAMILY DETAIL PAGE ───────────────────────────────────────────────────────
function FamilyDetailPage({ family, allChildren, allDocs, onBack, onEditFamily, onAddChild, onEditChild, onDeleteChild, toast, onDocUploaded, isMobile }) {
  const kids = allChildren.filter(c => c.family_id === family.id)
  const famDocs = allDocs.filter(d => d.family_id === family.id)
  const [tab, setTab] = useState('overview')
  const [uploading, setUploading] = useState(null)
  const [viewingDoc, setViewingDoc] = useState(null)

  const handleMotherDocUpload = async (file, docType) => {
    setUploading(docType)
    try {
      const path = `${family.family_code}/${docType.replace(/\s+/g, '-').toLowerCase()}.jpg`
      const url = await uploadFile({ supabase, file, bucket: BUCKETS.DOCUMENTS, path, type: 'document' })
      const { error } = await supabase.from('documents').insert({
        family_id: family.id, child_id: null,
        document_type: docType, file_url: url,
        file_name: file.name, file_size_kb: Math.round(file.size / 1024),
      })
      if (error) throw error
      toast(`${docType} uploaded`)
      onDocUploaded()
    } catch (e) { toast(e.message, 'error') }
    finally { setUploading(null) }
  }

  return (
    <div style={{ padding: isMobile ? '12px 12px 28px' : '22px 26px', maxWidth: 1040, margin: '0 auto' }}>
      <DocViewer doc={viewingDoc} onClose={() => setViewingDoc(null)} />
      {/* Top bar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14, flexWrap: 'wrap' }}>
        <button
          onClick={onBack}
          style={{
            background: B.greenLight, border: `1px solid ${B.border}`,
            borderRadius: 8, padding: '9px 14px', cursor: 'pointer',
            fontSize: 13, color: B.green, fontWeight: 700, minHeight: 38,
          }}
        >← Back</button>
        <div style={{ flex: 1 }} />
        <Btn onClick={() => onEditFamily(family)} variant="secondary" size="sm">✏ Edit</Btn>
        <StatusBadge s={family.status} />
      </div>

      {/* Hero banner */}
      <div style={{
        background: `linear-gradient(135deg, ${B.sidebar} 0%, ${B.sidebarMid} 60%, ${B.green} 100%)`,
        borderRadius: 18, padding: isMobile ? '18px 16px' : '28px',
        marginBottom: 16,
        display: 'flex', flexDirection: isMobile ? 'column' : 'row',
        alignItems: 'flex-start', gap: isMobile ? 14 : 24,
        boxShadow: `0 8px 32px rgba(13,59,15,0.35)`,
        position: 'relative', overflow: 'hidden',
      }}>
        {/* Gold accent line */}
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0, height: 3,
          background: `linear-gradient(to right, ${B.gold}, ${B.goldMid}, transparent)`,
        }} />

        <div style={{ display: 'flex', alignItems: 'center', gap: 14, width: isMobile ? '100%' : 'auto' }}>
          {/* Clickable avatar */}
          <div style={{ position: 'relative', flexShrink: 0 }}>
            <Avatar
              name={family.mother_name}
              photoUrl={family.mother_photo_url}
              size={isMobile ? 64 : 90}
              radius={16}
              clickable={true}
            />
            {family.mother_photo_url && (
              <div style={{
                position: 'absolute', bottom: -4, right: -4,
                background: B.gold, borderRadius: '50%', width: 22, height: 22,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 11, boxShadow: '0 2px 6px rgba(0,0,0,0.3)',
                border: '2px solid #fff',
              }}>🔍</div>
            )}
          </div>

          {isMobile && (
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 18, fontWeight: 800, color: '#fff', marginBottom: 4 }}>{family.mother_name}</div>
              <div style={{ fontSize: 11, color: B.gold, fontWeight: 600 }}>{family.family_code} · Roll {family.roll_number}</div>
            </div>
          )}
        </div>

        {!isMobile && (
          <div style={{ flex: 1, minWidth: 180 }}>
            <div style={{ fontSize: 22, fontWeight: 800, color: '#fff', marginBottom: 4 }}>{family.mother_name}</div>
            <div style={{ fontSize: 12, color: B.gold, marginBottom: 12, fontWeight: 600 }}>
              ID: {family.mother_id_number} · {family.family_code} · Roll {family.roll_number}
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
              <CallBtn phone={family.phone_number} />
              {family.alternate_phone && <CallBtn phone={family.alternate_phone} label={`Alt: ${family.alternate_phone}`} />}
              <span style={{ fontSize: 12, color: '#a5d6a7', display: 'flex', alignItems: 'center', gap: 4 }}>📍 {family.address}</span>
              <span style={{ fontSize: 12, color: '#a5d6a7', display: 'flex', alignItems: 'center', gap: 4 }}>🏙 {family.city}, {family.district}</span>
            </div>
          </div>
        )}

        {isMobile && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, width: '100%' }}>
            <CallBtn phone={family.phone_number} />
            {family.alternate_phone && <CallBtn phone={family.alternate_phone} label="Alt" />}
            <span style={{ fontSize: 11, color: '#a5d6a7', display: 'flex', alignItems: 'center', gap: 4 }}>📍 {family.district}</span>
          </div>
        )}

        {/* Stats badges */}
        <div style={{ display: 'flex', gap: 10, flexShrink: 0, width: isMobile ? '100%' : 'auto' }}>
          {[{ n: kids.length, l: 'Children' }, { n: famDocs.length, l: 'Docs' }].map(s => (
            <div key={s.l} style={{
              background: 'rgba(255,255,255,0.1)',
              border: '1px solid rgba(255,255,255,0.15)',
              borderRadius: 12, padding: isMobile ? '10px 14px' : '12px 18px', textAlign: 'center',
              backdropFilter: 'blur(4px)', flex: isMobile ? 1 : 'none',
            }}>
              <div style={{ fontSize: isMobile ? 18 : 24, fontWeight: 800, color: B.gold }}>{s.n}</div>
              <div style={{ fontSize: 10, color: '#a5d6a7', marginTop: 2 }}>{s.l}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Tabs */}
      <div style={{
        display: 'flex', gap: 2, marginBottom: 16,
        background: B.greenLight, padding: 4, borderRadius: 12,
        width: '100%', overflowX: 'auto',
        border: `1px solid ${B.border}`,
        position: 'sticky', top: isMobile ? 58 : 0, zIndex: 20,
      }}>
        {['overview', 'children', 'documents', 'notes'].map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            style={{
              flex: 1, padding: isMobile ? '10px 8px' : '8px 18px',
              borderRadius: 9, border: 'none', cursor: 'pointer',
              fontSize: isMobile ? 12 : 13, fontWeight: 600,
              fontFamily: 'inherit',
              background: tab === t
                ? `linear-gradient(135deg, ${B.green}, ${B.greenMid})`
                : 'transparent',
              color: tab === t ? '#fff' : B.textMid,
              boxShadow: tab === t ? `0 2px 8px rgba(30,125,34,0.3)` : 'none',
              transition: 'all 0.15s', textTransform: 'capitalize',
              whiteSpace: 'nowrap', minHeight: 40,
            }}
          >{t}</button>
        ))}
      </div>

      {/* OVERVIEW */}
      {tab === 'overview' && (
        <div style={{
          display: 'grid',
          gridTemplateColumns: isMobile ? '1fr 1fr' : '1fr 1fr',
          gap: isMobile ? 8 : 12,
        }}>
          {[
            { l: 'Family Code', v: family.family_code },
            { l: 'Roll Number', v: family.roll_number },
            { l: 'National ID', v: family.mother_id_number },
            { l: 'Phone', v: family.phone_number, isPhone: true },
            { l: 'Alternate Phone', v: family.alternate_phone || '—', isPhone: true },
            { l: 'City', v: family.city },
            { l: 'District', v: family.district },
            { l: 'Registered', v: family.created_at?.slice(0, 10) },
          ].map(r => (
            <div key={r.l} style={{
              background: '#fff', borderRadius: 11,
              border: `1px solid ${B.border}`, padding: isMobile ? '11px 13px' : '13px 16px',
              transition: 'border-color 0.15s',
            }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: B.textLight, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 6 }}>{r.l}</div>
              {r.isPhone
                ? <CallBtn phone={r.v} />
                : <div style={{ fontSize: 15, fontWeight: 650, color: B.text }}>{r.v}</div>
              }
            </div>
          ))}
          <div style={{ gridColumn: '1/-1', background: '#fff', borderRadius: 11, border: `1px solid ${B.border}`, padding: isMobile ? '11px 13px' : '13px 16px' }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: B.textLight, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 4 }}>Full Address</div>
            <div style={{ fontSize: 14, color: B.text }}>{family.address}</div>
          </div>
        </div>
      )}

      {/* CHILDREN */}
      {tab === 'children' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <span style={{ fontSize: 14, color: B.textMid }}>{kids.length} children registered</span>
            <Btn onClick={() => onAddChild(family.id)} size="sm" variant="gold">＋ Add Child</Btn>
          </div>
          {kids.length === 0 && (
            <div style={{ background: B.greenLight, borderRadius: 13, padding: '40px', textAlign: 'center', color: B.textLight }}>
              <div style={{ fontSize: 38, marginBottom: 8 }}>👶</div>
              <div style={{ fontWeight: 600, marginBottom: 10 }}>No children added yet</div>
              <Btn onClick={() => onAddChild(family.id)} size="sm" variant="gold">Add First Child</Btn>
            </div>
          )}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {kids.map(c => {
              const childDocs = allDocs.filter(d => d.child_id === c.id)
              return (
                <div key={c.id} style={{
                  background: '#fff', borderRadius: 14,
                  border: `1px solid ${B.border}`, padding: isMobile ? '14px' : '16px 18px',
                  boxShadow: `0 2px 8px rgba(30,125,34,0.05)`,
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14, flexWrap: 'wrap' }}>
                    <Avatar name={c.child_name} photoUrl={c.child_photo_url} size={52} radius={12} clickable={true} />
                    <div style={{ flex: 1, minWidth: 120 }}>
                      <div style={{ fontWeight: 700, fontSize: 15, color: B.text }}>{c.child_name}</div>
                      <div style={{ fontSize: 12, color: B.textMid, marginTop: 3 }}>
                        {c.date_of_birth && <>Age {calcAge(c.date_of_birth)} · {c.date_of_birth} · </>}{c.grade} · 🏫 {c.school_name}
                      </div>
                      {c.medical_notes && (
                        <div style={{ marginTop: 5, fontSize: 11, color: '#dc2626', background: '#fef2f2', padding: '3px 9px', borderRadius: 6, display: 'inline-block' }}>
                          ⚕ {c.medical_notes}
                        </div>
                      )}
                    </div>
                    <div style={{ display: 'flex', gap: 8, flexShrink: 0, width: isMobile ? '100%' : 'auto' }}>
                      <Btn onClick={() => onEditChild(c)} variant="secondary" size="sm" full={isMobile}>✏ Edit</Btn>
                      <Btn onClick={() => onDeleteChild(c)} variant="danger" size="sm" full={isMobile}>Delete</Btn>
                    </div>
                  </div>
                  <div style={{ background: B.greenLight, borderRadius: 10, padding: '12px 14px' }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: B.textMid, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>📎 Documents</div>
                    <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                      {['Birth Certificate', 'School Certificate'].map(docType => {
                        const existing = childDocs.find(d => d.document_type === docType)
                        return (
                          <div key={docType} style={{ flex: 1, minWidth: 150 }}>
                            <div style={{ fontSize: 11, color: B.textMid, marginBottom: 6, fontWeight: 600 }}>{docType}</div>
                            {existing
                              ? <div style={{ background: '#fff', border: `1px solid ${B.border}`, borderRadius: 8, padding: '8px 12px', display: 'flex', alignItems: 'center', gap: 8 }}>
                                  <span style={{ fontSize: 16 }}>📄</span>
                                  <span style={{ fontSize: 11, color: B.green, fontWeight: 600, flex: 1 }}>Uploaded ✓</span>
                                  <button onClick={() => setViewingDoc(existing)}
                                    style={{ background: B.greenLight, border: 'none', borderRadius: 6, padding: '3px 9px', cursor: 'pointer', fontSize: 11, color: B.green, fontWeight: 700 }}>View</button>
                                </div>
                              : <label style={{ border: `1.5px dashed ${B.green}`, borderRadius: 8, padding: '8px 12px', fontSize: 11, color: B.green, background: '#fafff9', cursor: 'pointer', textAlign: 'center', display: 'block', fontWeight: 600 }}>
                                  + Upload
                                  <input type="file" accept="image/*,application/pdf" style={{ display: 'none' }} onChange={async e => {
                                    if (!e.target.files[0]) return
                                    setUploading(docType + c.id)
                                    try {
                                      const file = e.target.files[0]
                                      const path = `${family.family_code}/child-${c.id.slice(0, 8)}-${docType.replace(/\s+/g, '-').toLowerCase()}.jpg`
                                      const url = await uploadFile({ supabase, file, bucket: BUCKETS.DOCUMENTS, path, type: 'document' })
                                      await supabase.from('documents').insert({ family_id: family.id, child_id: c.id, document_type: docType, file_url: url, file_name: file.name, file_size_kb: Math.round(file.size / 1024) })
                                      toast(`${docType} uploaded`)
                                      onDocUploaded()
                                    } catch (err) { toast(err.message, 'error') }
                                    finally { setUploading(null) }
                                  }} />
                                </label>
                            }
                            {uploading === docType + c.id && <div style={{ fontSize: 11, color: B.green, marginTop: 4 }}>⏳ Uploading…</div>}
                          </div>
                        )
                      })}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* DOCUMENTS */}
      {tab === 'documents' && (
        <div>
          <div style={{ fontSize: 13, color: B.textMid, marginBottom: 16 }}>Mother's official documents — all images auto-compressed before upload</div>
          <div style={{ display: 'grid', gridTemplateColumns: `repeat(auto-fill, minmax(${isMobile ? '140px' : '190px'}, 1fr))`, gap: 12 }}>
            {[
              { type: 'Mother ID', icon: '🪪' },
              { type: 'Bank Book', icon: '🏦' },
              { type: 'Family Photo', icon: '🖼' },
              { type: 'Other', icon: '📋' },
            ].map(doc => {
              const existing = famDocs.find(d => d.document_type === doc.type && !d.child_id)
              return (
                <div key={doc.type} style={{
                  background: '#fff', borderRadius: 13, border: `1px solid ${B.border}`,
                  padding: '16px', display: 'flex', flexDirection: 'column', gap: 8,
                  boxShadow: `0 2px 8px rgba(30,125,34,0.05)`,
                }}>
                  <div style={{ fontSize: 26 }}>{doc.icon}</div>
                  <div style={{ fontWeight: 700, fontSize: 13, color: B.text }}>{doc.type}</div>
                  {existing
                    ? <div>
                        <div style={{ fontSize: 11, color: B.green, fontWeight: 700, marginBottom: 6 }}>✓ Uploaded</div>
                        <button onClick={() => setViewingDoc(existing)}
                          style={{ display: 'block', width: '100%', background: B.greenLight, borderRadius: 7, padding: '7px', cursor: 'pointer', fontSize: 12, color: B.green, fontWeight: 700, textAlign: 'center', border: 'none' }}>View / Download</button>
                      </div>
                    : <label style={{ border: `1.5px dashed ${B.green}`, borderRadius: 8, padding: '12px', textAlign: 'center', cursor: 'pointer', background: '#fafff9', display: 'block' }}>
                        <div style={{ fontSize: 18, marginBottom: 4 }}>📤</div>
                        <div style={{ fontSize: 11, color: B.green, fontWeight: 600 }}>{uploading === doc.type ? '⏳ Uploading…' : 'Upload'}</div>
                        <div style={{ fontSize: 10, color: B.textLight, marginTop: 1 }}>Auto-compressed</div>
                        <input type="file" accept="image/*,application/pdf" style={{ display: 'none' }}
                          onChange={e => { if (e.target.files[0]) handleMotherDocUpload(e.target.files[0], doc.type) }} />
                      </label>
                  }
                </div>
              )
            })}
          </div>
          {famDocs.length > 0 && (
            <div style={{ marginTop: 18, background: '#fff', borderRadius: 13, border: `1px solid ${B.border}`, overflow: 'hidden' }}>
              <div style={{ padding: '13px 18px', borderBottom: `1px solid ${B.greenLight}`, fontSize: 13, fontWeight: 700, color: B.text, background: B.greenLight }}>All Uploaded Documents</div>
              {famDocs.map(d => (
                <div key={d.id} style={{ padding: '12px 18px', borderBottom: `1px solid ${B.greenLight}`, display: 'flex', alignItems: 'center', gap: 12 }}>
                  <span style={{ fontSize: 20 }}>📄</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 650, color: B.text }}>{d.document_type}</div>
                    <div style={{ fontSize: 11, color: B.textLight, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{d.file_name} · {d.file_size_kb}KB · {d.uploaded_at?.slice(0, 10)}</div>
                  </div>
                  <button onClick={() => setViewingDoc(d)}
                    style={{ background: B.greenLight, borderRadius: 7, padding: '5px 12px', fontSize: 12, color: B.green, fontWeight: 700, whiteSpace: 'nowrap', border: 'none', cursor: 'pointer' }}>View</button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* NOTES */}
      {tab === 'notes' && (
        <div style={{ background: '#fff', borderRadius: 13, border: `1px solid ${B.border}`, padding: '20px' }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: B.text, marginBottom: 10 }}>Case Notes</div>
          <div style={{ fontSize: 14, color: B.textMid, lineHeight: 1.8, minHeight: 80 }}>
            {family.notes || <span style={{ color: B.textLight, fontStyle: 'italic' }}>No notes recorded for this family.</span>}
          </div>
        </div>
      )}
    </div>
  )
}

// ─── FAMILY FORM ─────────────────────────────────────────────────────────────
function FamilyForm({ initial, onSave, onCancel, saving }) {
  const [f, setF] = useState(initial || { family_code: '', roll_number: '', mother_name: '', mother_id_number: '', phone_number: '', alternate_phone: '', address: '', city: 'Addis Ababa', district: '', notes: '', status: 'active', mother_photo_url: null })
  const [photoFile, setPhotoFile] = useState(null)
  const s = k => v => setF(x => ({ ...x, [k]: v }))
  const bp = useBreakpoint()
  const isMobile = bp === 'mobile'
  return (
    <div>
      <div style={{ display: 'flex', gap: 20, alignItems: 'flex-start', marginBottom: 20, padding: '16px', background: B.greenLight, borderRadius: 12, border: `1px solid ${B.border}` }}>
        <ImageUpload label="Mother Photo" type="photo" currentUrl={f.mother_photo_url}
          onFileReady={file => { setPhotoFile(file); setF(x => ({ ...x, mother_photo_url: URL.createObjectURL(file) })) }}
          shape="circle" previewSize={80} />
        <div style={{ flex: 1, fontSize: 12, color: B.textMid, marginTop: 24, lineHeight: 1.7 }}>
          Upload a clear photo of the mother.<br />Auto-compressed to ~150KB before saving.
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '0 16px' }}>
        <FI label="Family Code" value={f.family_code} onChange={s('family_code')} placeholder="FM007" req />
        <FI label="Roll Number" value={f.roll_number} onChange={s('roll_number')} placeholder="1007" req />
        <FI label="Mother Full Name" value={f.mother_name} onChange={s('mother_name')} placeholder="Full name" req />
        <FI label="National ID Number" value={f.mother_id_number} onChange={s('mother_id_number')} placeholder="123-456-789" />
        <FI label="Phone Number" value={f.phone_number} onChange={s('phone_number')} type="tel" placeholder="0911-000-000" req />
        <FI label="Alternate Phone" value={f.alternate_phone} onChange={s('alternate_phone')} type="tel" placeholder="0922-000-000" />
        <FI label="City" value={f.city} onChange={s('city')} placeholder="Addis Ababa" />
        <FI label="District / Sub-City" value={f.district} onChange={s('district')} placeholder="Bole" />
      </div>
      <FT label="Full Address" value={f.address} onChange={s('address')} placeholder="Street, Kebele, Woreda…" />
      <FT label="Case Notes" value={f.notes} onChange={s('notes')} placeholder="Any relevant notes…" />
      <FS label="Status" value={f.status} onChange={s('status')} options={[{ value: 'active', label: 'Active' }, { value: 'inactive', label: 'Inactive' }, { value: 'pending', label: 'Pending' }]} />
      <div style={{
        display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 8,
        flexDirection: isMobile ? 'column-reverse' : 'row',
      }}>
        <Btn onClick={onCancel} variant="secondary" disabled={saving} full={isMobile}>Cancel</Btn>
        <Btn onClick={() => onSave(f, photoFile)} disabled={saving} variant="primary" full={isMobile}>
          {saving ? 'Saving…' : '💾 Save Family'}
        </Btn>
      </div>
    </div>
  )
}

// ─── CHILD FORM ───────────────────────────────────────────────────────────────
function ChildForm({ initial, familyId, onSave, onCancel, saving }) {
  const [f, setF] = useState(initial || { child_name: '', gender: 'female', date_of_birth: '', grade: '', school_name: '', medical_notes: '', child_photo_url: null })
  const [photoFile, setPhotoFile] = useState(null)
  const [birthCertFile, setBirthCertFile] = useState(null)
  const [schoolCertFile, setSchoolCertFile] = useState(null)
  const s = k => v => setF(x => ({ ...x, [k]: v }))
  const bp = useBreakpoint()
  const isMobile = bp === 'mobile'
  return (
    <div>
      <div style={{ display: 'flex', gap: 20, alignItems: 'flex-start', marginBottom: 20, padding: '14px', background: B.greenLight, borderRadius: 12, border: `1px solid ${B.border}` }}>
        <ImageUpload label="Child Photo" type="photo" currentUrl={f.child_photo_url}
          onFileReady={file => { setPhotoFile(file); setF(x => ({ ...x, child_photo_url: URL.createObjectURL(file) })) }}
          shape="circle" previewSize={72} />
        <div style={{ flex: 1, fontSize: 12, color: B.textMid, lineHeight: 1.7, marginTop: 20 }}>Clear photo of the child. Auto-compressed before saving.</div>
      </div>
      <FI label="Child Full Name" value={f.child_name} onChange={s('child_name')} placeholder="Full name" req />
      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '0 16px' }}>
        <FS label="Gender" value={f.gender} onChange={s('gender')} options={[{ value: 'female', label: 'Female' }, { value: 'male', label: 'Male' }]} />
        <FI label="Date of Birth" value={f.date_of_birth} onChange={s('date_of_birth')} type="date" req />
        <FI label="Grade / Level" value={f.grade} onChange={s('grade')} placeholder="Grade 4" />
        <FI label="School Name" value={f.school_name} onChange={s('school_name')} placeholder="School name" />
      </div>
      <FT label="Medical Notes" value={f.medical_notes} onChange={s('medical_notes')} placeholder="Any health conditions…" />
      <div style={{ background: B.greenLight, borderRadius: 11, padding: '14px', marginBottom: 14, border: `1px solid ${B.border}` }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: B.textMid, marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.04em' }}>📎 Child Documents</div>
        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 14 }}>
          <ImageUpload label="Birth Certificate" type="document" onFileReady={f => setBirthCertFile(f)} />
          <ImageUpload label="School Certificate" type="document" onFileReady={f => setSchoolCertFile(f)} />
        </div>
        <div style={{ fontSize: 11, color: B.textLight, marginTop: 6 }}>📷 Photo or scan — auto-compressed up to 80% smaller.</div>
      </div>
      <div style={{
        display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 6,
        flexDirection: isMobile ? 'column-reverse' : 'row',
      }}>
        <Btn onClick={onCancel} variant="secondary" disabled={saving} full={isMobile}>Cancel</Btn>
        <Btn onClick={() => onSave(f, photoFile, birthCertFile, schoolCertFile, familyId)} disabled={saving} variant="primary" full={isMobile}>
          {saving ? 'Saving…' : '💾 Save Child'}
        </Btn>
      </div>
    </div>
  )
}

// ─── ANALYTICS PAGE ───────────────────────────────────────────────────────────
function AnalyticsPage({ families, children, isMobile }) {
  const byStatus = { active: 0, inactive: 0, pending: 0 }
  families.forEach(f => byStatus[f.status] = (byStatus[f.status] || 0) + 1)
  const byDistrict = {}
  families.forEach(f => { byDistrict[f.district] = (byDistrict[f.district] || 0) + 1 })

  return (
    <div style={{ padding: isMobile ? '14px 12px' : '22px 26px', maxWidth: 900, margin: '0 auto' }}>
      {/* Gold accent banner */}
      <div style={{
        background: `linear-gradient(135deg, ${B.sidebar}, ${B.sidebarMid})`,
        borderRadius: 14, padding: '16px 20px', marginBottom: 18,
        display: 'flex', alignItems: 'center', gap: 14,
        border: `1px solid rgba(245,168,0,0.3)`,
        position: 'relative', overflow: 'hidden',
      }}>
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: `linear-gradient(to right, ${B.gold}, ${B.green})` }} />
        <div style={{ fontSize: 28 }}>📊</div>
        <div>
          <div style={{ fontSize: 15, fontWeight: 800, color: B.gold }}>HDA Statistics Overview</div>
          <div style={{ fontSize: 12, color: '#a5d6a7' }}>Hidaya Development Association — Case Management Data</div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: `repeat(auto-fit, minmax(${isMobile ? '100%' : '260px'}, 1fr))`, gap: 16 }}>
        {/* Donut */}
        <div style={{ background: '#fff', borderRadius: 16, border: `1px solid ${B.border}`, padding: '20px', boxShadow: `0 2px 12px rgba(30,125,34,0.06)` }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
            <div style={{ width: 3, height: 16, borderRadius: 2, background: `linear-gradient(to bottom, ${B.gold}, ${B.green})` }} />
            <span style={{ fontSize: 14, fontWeight: 750, color: B.text }}>Families by Status</span>
          </div>
          <DonutChart active={byStatus.active} inactive={byStatus.inactive} pending={byStatus.pending} />
          <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
            {[{ l: 'Active', v: byStatus.active, c: B.green }, { l: 'Inactive', v: byStatus.inactive, c: B.gold }, { l: 'Pending', v: byStatus.pending, c: '#f59e0b' }].map(x => (
              <div key={x.l}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <span style={{ fontSize: 12, color: B.textMid, fontWeight: 600 }}>{x.l}</span>
                  <span style={{ fontSize: 12, fontWeight: 700, color: x.c }}>{x.v}</span>
                </div>
                <div style={{ height: 6, background: B.greenLight, borderRadius: 3 }}>
                  <div style={{ height: '100%', borderRadius: 3, background: x.c, width: `${(x.v / (families.length || 1)) * 100}%`, transition: 'width 0.5s' }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* District */}
        <div style={{ background: '#fff', borderRadius: 16, border: `1px solid ${B.border}`, padding: '20px', boxShadow: `0 2px 12px rgba(30,125,34,0.06)` }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
            <div style={{ width: 3, height: 16, borderRadius: 2, background: `linear-gradient(to bottom, ${B.gold}, ${B.green})` }} />
            <span style={{ fontSize: 14, fontWeight: 750, color: B.text }}>Families by District</span>
          </div>
          {Object.entries(byDistrict).map(([d, v]) => (
            <div key={d} style={{ marginBottom: 11 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                <span style={{ fontSize: 12, color: B.textMid, fontWeight: 600 }}>{d}</span>
                <span style={{ fontSize: 12, fontWeight: 700, color: B.green }}>{v}</span>
              </div>
              <div style={{ height: 7, background: B.greenLight, borderRadius: 4 }}>
                <div style={{ height: '100%', borderRadius: 4, background: `linear-gradient(to right, ${B.green}, ${B.greenMid})`, width: `${(v / (families.length || 1)) * 100}%`, transition: 'width 0.5s' }} />
              </div>
            </div>
          ))}
        </div>

        {/* Summary */}
        <div style={{ background: '#fff', borderRadius: 16, border: `1px solid ${B.border}`, padding: '20px', boxShadow: `0 2px 12px rgba(30,125,34,0.06)` }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
            <div style={{ width: 3, height: 16, borderRadius: 2, background: `linear-gradient(to bottom, ${B.gold}, ${B.green})` }} />
            <span style={{ fontSize: 14, fontWeight: 750, color: B.text }}>Summary</span>
          </div>
          {[
            { i: '👨‍👩‍👧‍👦', l: 'Total Families', v: families.length },
            { i: '👶', l: 'Total Children', v: children.length },
            { i: '📊', l: 'Avg Children/Family', v: (children.length / (families.length || 1)).toFixed(1) },
            { i: '✅', l: 'Active Families', v: byStatus.active },
            { i: '⏳', l: 'Pending Review', v: byStatus.pending },
            { i: '🗺', l: 'Districts Covered', v: Object.keys(byDistrict).length },
          ].map((x, idx) => (
            <div key={x.l} style={{
              display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0',
              borderBottom: idx < 5 ? `1px solid ${B.greenLight}` : 'none',
            }}>
              <span style={{ fontSize: 18 }}>{x.i}</span>
              <span style={{ flex: 1, fontSize: 13, color: B.textMid }}>{x.l}</span>
              <span style={{ fontWeight: 800, fontSize: 15, color: B.green }}>{x.v}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ─── LOGIN PAGE ───────────────────────────────────────────────────────────────
function LoginPage({ onLogin }) {
  const [email, setEmail] = useState('')
  const [pass, setPass] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleLogin = async () => {
    if (!email || !pass) { setError('Please enter email and password.'); return }
    setLoading(true); setError('')
    const { error: err } = await supabase.auth.signInWithPassword({ email, password: pass })
    if (err) { setError(err.message); setLoading(false) }
    else onLogin()
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: `linear-gradient(160deg, ${B.sidebar} 0%, ${B.sidebarMid} 50%, ${B.green} 100%)`,
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
      position: 'relative', overflow: 'hidden',
    }}>
      {/* Decorative gold rings */}
      <div style={{ position: 'absolute', top: -80, right: -80, width: 320, height: 320, borderRadius: '50%', border: `2px solid rgba(245,168,0,0.15)` }} />
      <div style={{ position: 'absolute', top: -40, right: -40, width: 200, height: 200, borderRadius: '50%', border: `2px solid rgba(245,168,0,0.1)` }} />
      <div style={{ position: 'absolute', bottom: -60, left: -60, width: 260, height: 260, borderRadius: '50%', border: `2px solid rgba(245,168,0,0.1)` }} />

      <div style={{
        background: 'rgba(255,255,255,0.98)', borderRadius: 22,
        padding: '40px 36px', width: '100%', maxWidth: 400,
        boxShadow: `0 40px 100px rgba(0,0,0,0.5), 0 0 0 1px rgba(245,168,0,0.2)`,
        position: 'relative',
      }}>
        {/* Gold top accent */}
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0, height: 4,
          background: `linear-gradient(to right, ${B.gold}, ${B.green}, ${B.gold})`,
          borderRadius: '22px 22px 0 0',
        }} />

        <div style={{ textAlign: 'center', marginBottom: 30 }}>
          <div style={{
            width: 88, height: 88, borderRadius: 22,
            background: '#fff', border: `2px solid ${B.greenLight}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 16px', overflow: 'hidden',
            boxShadow: `0 4px 24px rgba(245,168,0,0.25), 0 0 0 4px ${B.greenLight}`,
          }}>
            <img src="/HDA_LOGO.png" alt="HDA" style={{ width: 78, height: 78, objectFit: 'contain' }}
              onError={e => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'flex' }} />
            <div style={{ display: 'none', width: 78, height: 78, alignItems: 'center', justifyContent: 'center', fontSize: 38 }}>🌟</div>
          </div>
          <div style={{ fontSize: 22, fontWeight: 800, color: B.sidebar, letterSpacing: '-0.02em' }}>Hidaya Development</div>
          <div style={{ fontSize: 13, color: B.textMid, marginTop: 3, fontWeight: 600 }}>Association — Case Management</div>
          <div style={{
            display: 'inline-block', marginTop: 8,
            background: B.greenLight, color: B.green,
            fontSize: 10, fontWeight: 700, padding: '3px 12px', borderRadius: 20,
            letterSpacing: '0.08em', textTransform: 'uppercase',
          }}>Staff Portal</div>
        </div>

        {error && (
          <div style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626', padding: '10px 14px', borderRadius: 9, fontSize: 13, marginBottom: 16 }}>
            {error}
          </div>
        )}

        <FI label="Email Address" value={email} onChange={setEmail} type="email" placeholder="your@hidaya.org.et" req />
        <FI label="Password" value={pass} onChange={setPass} type="password" req />

        <button
          onClick={handleLogin} disabled={loading}
          style={{
            width: '100%', padding: '14px',
            background: `linear-gradient(135deg, ${B.sidebar}, ${B.green})`,
            color: '#fff', border: 'none', borderRadius: 11,
            fontSize: 15, fontWeight: 800, cursor: loading ? 'not-allowed' : 'pointer',
            fontFamily: 'inherit', marginTop: 6, opacity: loading ? .8 : 1,
            boxShadow: `0 4px 16px rgba(13,59,15,0.4)`,
            transition: 'all 0.2s', minHeight: 50,
            letterSpacing: '0.01em',
          }}
        >
          {loading ? 'Signing in…' : '🔐 Sign In'}
        </button>
        <div style={{ textAlign: 'center', marginTop: 14 }}>
          <button
            onClick={async () => {
              const e = prompt('Enter your email:')
              if (e) { await supabase.auth.resetPasswordForEmail(e); alert('Password reset email sent!') }
            }}
            style={{ background: 'none', border: 'none', color: B.green, fontSize: 12, cursor: 'pointer', fontWeight: 700, minHeight: 38 }}
          >Forgot password?</button>
        </div>
      </div>
    </div>
  )
}

// ─── ROOT APP ─────────────────────────────────────────────────────────────────
export default function App() {
  const bp = useBreakpoint()
  const isMobile = bp === 'mobile'
  const isTablet = bp === 'tablet'

  const [session, setSession] = useState(null)
  const [user, setUser] = useState(null)
  const [authLoading, setAuthLoading] = useState(true)

  const [page, setPage] = useState('dashboard')
  const [collapsed, setCollapsed] = useState(isTablet)
  const [mobileNavOpen, setMobileNavOpen] = useState(false)
  const [selectedFamily, setSelectedFamily] = useState(null)

  const [families, setFamilies] = useState([])
  const [children, setChildren] = useState([])
  const [docs, setDocs] = useState([])
  const [dataLoading, setDataLoading] = useState(true)

  const [showFamilyForm, setShowFamilyForm] = useState(false)
  const [editingFamily, setEditingFamily] = useState(null)
  const [showChildForm, setShowChildForm] = useState(false)
  const [editingChild, setEditingChild] = useState(null)
  const [childFamilyId, setChildFamilyId] = useState(null)
  const [confirmDelete, setConfirmDelete] = useState(null)
  const [saving, setSaving] = useState(false)

  const { toasts, show: toast } = useToast()

  const handleSetPage = useCallback((p) => {
    setPage(p)
    setSelectedFamily(null)
  }, [])

  // Collapse sidebar on tablet automatically
  useEffect(() => { setCollapsed(isTablet) }, [isTablet])

  // ── AUTH ───────────────────────────────────────────────────
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      if (session) loadUserProfile(session.user.id)
      else setAuthLoading(false)
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_evt, session) => {
      setSession(session)
      if (session) loadUserProfile(session.user.id)
      else { setUser(null); setAuthLoading(false) }
    })
    return () => subscription.unsubscribe()
  }, [])

  const loadUserProfile = async (uid) => {
    const { data } = await supabase.from('users').select('*').eq('id', uid).single()
    setUser(data)
    setAuthLoading(false)
  }

  useEffect(() => { if (session) loadAll() }, [session])

  const loadAll = async () => {
    setDataLoading(true)
    try {
      const [{ data: fams }, { data: kids }, { data: docData }] = await Promise.all([
        supabase.from('families').select('*, children_count:children(count)').order('created_at', { ascending: false }),
        supabase.from('children').select('*').order('created_at', { ascending: false }),
        supabase.from('documents').select('*').order('uploaded_at', { ascending: false }),
      ])
      setFamilies(fams || [])
      setChildren(kids || [])
      setDocs(docData || [])
    } catch (e) { toast('Failed to load data: ' + e.message, 'error') }
    finally { setDataLoading(false) }
  }

  const reloadDocs = async () => {
    const { data } = await supabase.from('documents').select('*').order('uploaded_at', { ascending: false })
    setDocs(data || [])
  }

  const signOut = async () => {
    await supabase.auth.signOut()
    setFamilies([]); setChildren([]); setDocs([])
  }

  const saveFamily = async (form, photoFile) => {
    if (!form.family_code || !form.mother_name) { toast('Family code and mother name are required', 'error'); return }
    setSaving(true)
    try {
      let mother_photo_url = form.mother_photo_url
      if (photoFile) {
        const path = `${form.family_code}/mother.jpg`
        mother_photo_url = await uploadFile({ supabase, file: photoFile, bucket: BUCKETS.MOTHER_PHOTOS, path, type: 'photo' })
      }
      const payload = { family_code: form.family_code, roll_number: form.roll_number, mother_name: form.mother_name, mother_id_number: form.mother_id_number, phone_number: form.phone_number, alternate_phone: form.alternate_phone, address: form.address, city: form.city, district: form.district, notes: form.notes, status: form.status, mother_photo_url }
      if (editingFamily) {
        const { error } = await supabase.from('families').update(payload).eq('id', editingFamily.id)
        if (error) throw error
        toast('Family updated')
      } else {
        const { error } = await supabase.from('families').insert({ ...payload, created_by: session.user.id })
        if (error) throw error
        toast('Family registered')
      }
      setShowFamilyForm(false)
      await loadAll()
    } catch (e) { toast(e.message, 'error') }
    finally { setSaving(false) }
  }

  const saveChild = async (form, photoFile, birthCertFile, schoolCertFile, famId) => {
    if (!form.child_name) { toast('Child name is required', 'error'); return }
    setSaving(true)
    try {
      const fam = families.find(f => f.id === famId)
      let child_photo_url = form.child_photo_url
      if (photoFile) {
        const path = `${fam?.family_code}/child-${form.child_name.replace(/\s+/g, '-')}-photo.jpg`
        child_photo_url = await uploadFile({ supabase, file: photoFile, bucket: BUCKETS.CHILD_PHOTOS, path, type: 'photo' })
        child_photo_url = `${child_photo_url}?t=${Date.now()}`
      }
      const payload = { family_id: famId, child_name: form.child_name, gender: form.gender, date_of_birth: form.date_of_birth || null, grade: form.grade, school_name: form.school_name, medical_notes: form.medical_notes, child_photo_url }
      let childId = editingChild?.id
      if (editingChild) {
        const { error } = await supabase.from('children').update(payload).eq('id', editingChild.id)
        if (error) throw error
        toast('Child updated')
      } else {
        const { data, error } = await supabase.from('children').insert(payload).select().single()
        if (error) throw error
        childId = data.id
        toast('Child added')
      }
      const uploadDoc = async (file, docType) => {
        const path = `${fam?.family_code}/child-${childId?.slice(0, 8)}-${docType.replace(/\s+/g, '-').toLowerCase()}.jpg`
        const url = await uploadFile({ supabase, file, bucket: BUCKETS.DOCUMENTS, path, type: 'document' })
        await supabase.from('documents').insert({ family_id: famId, child_id: childId, document_type: docType, file_url: url, file_name: file.name, file_size_kb: Math.round(file.size / 1024) })
      }
      if (birthCertFile) await uploadDoc(birthCertFile, 'Birth Certificate')
      if (schoolCertFile) await uploadDoc(schoolCertFile, 'School Certificate')
      setShowChildForm(false)
      await loadAll()
    } catch (e) { toast(e.message, 'error') }
    finally { setSaving(false) }
  }

  const doDelete = async () => {
    try {
      if (confirmDelete.type === 'family') {
        const { error } = await supabase.from('families').delete().eq('id', confirmDelete.item.id)
        if (error) throw error
        if (page === 'detail') setPage('dashboard')
        toast('Family deleted', 'info')
      } else {
        const { error } = await supabase.from('children').delete().eq('id', confirmDelete.item.id)
        if (error) throw error
        toast('Child removed', 'info')
      }
      setConfirmDelete(null)
      await loadAll()
    } catch (e) { toast(e.message, 'error') }
  }

  // ── RENDER ──────────────────────────────────────────────────
  if (authLoading) return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: B.sidebar, gap: 16 }}>
      <img src="/HDA_LOGO.png" alt="HDA" style={{ width: 72, height: 72, objectFit: 'contain', animation: 'spin 2s linear infinite' }}
        onError={e => { e.target.style.display = 'none' }} />
      <div style={{ color: B.gold, fontSize: 16, fontWeight: 700 }}>Loading HDA System…</div>
    </div>
  )

  if (!session) return <LoginPage onLogin={() => {}} />

  const breadcrumb = page === 'detail' && selectedFamily ? ['Families', selectedFamily.mother_name] : null
  const pageTitle = { dashboard: 'Dashboard', detail: 'Family Details', analytics: 'Statistics', settings: 'Settings' }[page]

  return (
    <div style={{
      display: 'flex', minHeight: '100vh', background: B.bg,
      fontFamily: "'Segoe UI', system-ui, -apple-system, sans-serif",
    }}>
      <style>{`
        * { box-sizing: border-box; }
        ::-webkit-scrollbar { width: 5px; height: 5px; }
        ::-webkit-scrollbar-track { background: ${B.greenLight}; }
        ::-webkit-scrollbar-thumb { background: ${B.border}; border-radius: 3px; }
        button:focus-visible, input:focus-visible, select:focus-visible, textarea:focus-visible {
          outline: 2px solid ${B.gold}; outline-offset: 2px;
        }
        button:focus:not(:focus-visible), input:focus:not(:focus-visible) { outline: none; }
        @keyframes shimmer { 0% { background-position: 200% 0 } 100% { background-position: -200% 0 } }
        @keyframes spin { from { transform: rotate(0deg) } to { transform: rotate(360deg) } }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(8px) } to { opacity: 1; transform: none } }
        @keyframes sheetUp { from { transform: translateY(100%) } to { transform: translateY(0) } }
        .toast-enter { animation: fadeIn 0.25s ease; }
        @media (prefers-reduced-motion: reduce) {
          *, *::before, *::after { animation-duration: 0.01ms !important; transition-duration: 0.01ms !important; }
        }
      `}</style>

      {/* Toasts */}
      <div style={{ position: 'fixed', top: isMobile ? 'auto' : 16, bottom: isMobile ? 'calc(76px + env(safe-area-inset-bottom))' : 'auto', right: 16, left: isMobile ? 16 : 'auto', zIndex: 99998, display: 'flex', flexDirection: 'column', gap: 8, maxWidth: isMobile ? 'none' : 300 }}>
        {toasts.map(t => { const c = ToastColors[t.type]; return (
          <div key={t.id} className="toast-enter" style={{ background: c.bg, border: `1px solid ${c.border}`, color: c.color, padding: '12px 16px', borderRadius: 12, fontSize: 13, fontWeight: 600, boxShadow: '0 8px 24px rgba(0,0,0,0.15)', display: 'flex', alignItems: 'center', gap: 8, minWidth: isMobile ? 'auto' : 220 }}>
            <span style={{ fontSize: 16 }}>{c.icon}</span> {t.msg}
          </div>
        )})}
      </div>

      {/* Sidebar — hidden on mobile */}
      {!isMobile && (
        <Sidebar
          page={page === 'detail' ? 'families' : page}
          setPage={handleSetPage}
          collapsed={collapsed}
          setCollapsed={setCollapsed}
          user={user}
          onSignOut={signOut}
        />
      )}

      {/* Main content */}
      <main style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, paddingBottom: isMobile ? 'calc(60px + env(safe-area-inset-bottom))' : 0 }}>
        <Header title={pageTitle} breadcrumb={breadcrumb} isMobile={isMobile} />
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {(page === 'dashboard' || page === 'families') && (
            <DashboardPage
              families={families} children={children} loading={dataLoading}
              onView={f => { setSelectedFamily(f); setPage('detail') }}
              onAdd={() => { setEditingFamily(null); setShowFamilyForm(true) }}
              isMobile={isMobile} isTablet={isTablet}
            />
          )}
          {page === 'detail' && selectedFamily && (
            <FamilyDetailPage
              family={selectedFamily} allChildren={children} allDocs={docs}
              onBack={() => setPage('dashboard')}
              onEditFamily={f => { setEditingFamily(f); setShowFamilyForm(true) }}
              onAddChild={fid => { setEditingChild(null); setChildFamilyId(fid); setShowChildForm(true) }}
              onEditChild={c => { setEditingChild(c); setChildFamilyId(c.family_id); setShowChildForm(true) }}
              onDeleteChild={c => setConfirmDelete({ type: 'child', item: c })}
              toast={toast} onDocUploaded={reloadDocs}
              isMobile={isMobile}
            />
          )}
          {page === 'analytics' && <AnalyticsPage families={families} children={children} isMobile={isMobile} />}
          {page === 'settings' && (
            <div style={{ padding: '60px 20px', textAlign: 'center', color: B.textLight }}>
              <div style={{ fontSize: 48, marginBottom: 12 }}>⚙️</div>
              <div style={{ fontWeight: 700, fontSize: 16, color: B.text, marginBottom: 6 }}>Settings</div>
              <div style={{ fontSize: 13 }}>User management coming soon.</div>
            </div>
          )}
        </div>
      </main>

      {/* Mobile bottom navigation */}
      {isMobile && (
        <MobileBottomNav
          page={page}
          setPage={handleSetPage}
        />
      )}

      {/* Modals */}
      <Modal open={showFamilyForm} onClose={() => !saving && setShowFamilyForm(false)} title={editingFamily ? 'Edit Family' : 'Register New Family'} width={640}>
        <FamilyForm initial={editingFamily} onSave={saveFamily} onCancel={() => setShowFamilyForm(false)} saving={saving} />
      </Modal>

      <Modal open={showChildForm} onClose={() => !saving && setShowChildForm(false)} title={editingChild ? 'Edit Child' : 'Add Child'} width={560}>
        <ChildForm key={editingChild?.id || 'new-' + showChildForm} initial={editingChild} familyId={childFamilyId} onSave={saveChild} onCancel={() => setShowChildForm(false)} saving={saving} />
      </Modal>

      <Modal open={!!confirmDelete} onClose={() => setConfirmDelete(null)} title="Confirm Deletion" width={400}>
        <div style={{ textAlign: 'center', padding: '8px 0' }}>
          <div style={{ fontSize: 44, marginBottom: 12 }}>⚠️</div>
          <div style={{ fontSize: 15, fontWeight: 800, color: B.text, marginBottom: 8 }}>Delete {confirmDelete?.type === 'family' ? 'Family' : 'Child'}?</div>
          <div style={{ fontSize: 13, color: B.textMid, marginBottom: 24 }}>
            <strong>{confirmDelete?.item?.mother_name || confirmDelete?.item?.child_name}</strong> will be permanently removed.
          </div>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
            <Btn onClick={() => setConfirmDelete(null)} variant="secondary">Cancel</Btn>
            <Btn onClick={doDelete} variant="danger">Delete Permanently</Btn>
          </div>
        </div>
      </Modal>
    </div>
  )
}