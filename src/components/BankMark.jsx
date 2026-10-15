import { bankById } from '../lib/banks'

// Small round bank logo (falls back to the bank's initials if the image is missing).
export default function BankMark({ bank, size = 22, ring = false, style }) {
  const b = typeof bank === 'string' ? bankById(bank) : bank
  if (!b) return null
  return (
    <span title={b.name} style={{
      width: size, height: size, borderRadius: '50%', flexShrink: 0, position: 'relative', overflow: 'hidden',
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center', verticalAlign: 'middle',
      background: '#fff', boxShadow: ring ? `0 0 0 2px ${b.color}` : `0 0 0 1px rgba(0,0,0,0.12)`, ...style,
    }}>
      <span style={{ position: 'absolute', fontSize: Math.max(8, size * 0.34), fontWeight: 800, color: b.color }}>{b.label.slice(0, 2).toUpperCase()}</span>
      <img src={b.logo} alt={b.name} onError={e => { e.currentTarget.style.display = 'none' }}
        style={{ position: 'relative', width: '86%', height: '86%', objectFit: 'contain', filter: 'none' }} />
    </span>
  )
}
