import { useState } from 'react'
import ImageUpload from './components/ImageUpload'

// ─── MOCK DATA (replaced by Supabase queries later) ───────────────────────────
const FAMILIES = [
  { id:'1', code:'FM001', roll:'1001', mother_name:'Amina Hassan', mother_id:'123-567-890', phone:'0911-234-567', alt_phone:'0922-345-678', address:'Kebele 12, Bole Sub-City', city:'Addis Ababa', district:'Bole', status:'active', notes:'Requires monthly food support', created_at:'2024-01-15', children_count:4, mother_photo_url:null },
  { id:'2', code:'FM002', roll:'1002', mother_name:'Fatuma Abdi', mother_id:'124-567-891', phone:'0933-456-789', alt_phone:'', address:'Kebele 05, Yeka Sub-City', city:'Addis Ababa', district:'Yeka', status:'active', notes:'Single mother, priority case', created_at:'2024-02-03', children_count:2, mother_photo_url:null },
  { id:'3', code:'FM003', roll:'1003', mother_name:'Tigist Bekele', mother_id:'125-567-892', phone:'0944-567-890', alt_phone:'0955-678-901', address:'Kebele 08, Kirkos Sub-City', city:'Addis Ababa', district:'Kirkos', status:'inactive', notes:'', created_at:'2024-02-20', children_count:3, mother_photo_url:null },
  { id:'4', code:'FM004', roll:'1004', mother_name:'Selamawit Girma', mother_id:'126-567-893', phone:'0966-789-012', alt_phone:'', address:'Kebele 03, Lideta Sub-City', city:'Addis Ababa', district:'Lideta', status:'pending', notes:'Recently enrolled', created_at:'2024-03-10', children_count:1, mother_photo_url:null },
  { id:'5', code:'FM005', roll:'1005', mother_name:'Hana Tesfaye', mother_id:'127-567-894', phone:'0977-890-123', alt_phone:'0988-901-234', address:'Kebele 15, Nifas Silk-Lafto', city:'Addis Ababa', district:'Nifas Silk', status:'active', notes:'Medical assistance required', created_at:'2024-03-25', children_count:2, mother_photo_url:null },
  { id:'6', code:'FM006', roll:'1006', mother_name:'Mekdes Alemu', mother_id:'128-567-895', phone:'0999-012-345', alt_phone:'', address:'Kebele 22, Akaky Kaliti', city:'Addis Ababa', district:'Akaky', status:'active', notes:'Relocated from Tigray', created_at:'2024-04-01', children_count:5, mother_photo_url:null },
]

const CHILDREN_INIT = [
  { id:'c1', family_id:'1', name:'Abebe Hassan', gender:'male', dob:'2013-03-15', grade:'Grade 4', school:'Bole Primary School', medical_notes:'', photo_url:null, docs:{ birth_cert:null, school_cert:null } },
  { id:'c2', family_id:'1', name:'Liya Hassan', gender:'female', dob:'2016-07-22', grade:'Grade 2', school:'Bole Primary School', medical_notes:'Mild anemia', photo_url:null, docs:{ birth_cert:null, school_cert:null } },
  { id:'c3', family_id:'1', name:'Dawit Hassan', gender:'male', dob:'2020-11-05', grade:'Kindergarten', school:'Sunshine KG', medical_notes:'', photo_url:null, docs:{ birth_cert:null, school_cert:null } },
  { id:'c4', family_id:'2', name:'Nadia Abdi', gender:'female', dob:'2014-05-18', grade:'Grade 5', school:'Yeka Primary School', medical_notes:'', photo_url:null, docs:{ birth_cert:null, school_cert:null } },
  { id:'c5', family_id:'2', name:'Omar Abdi', gender:'male', dob:'2017-09-30', grade:'Grade 3', school:'Yeka Primary School', medical_notes:'Asthma', photo_url:null, docs:{ birth_cert:null, school_cert:null } },
]

// ─── HELPERS ──────────────────────────────────────────────────────────────────
const calcAge = d => Math.floor((Date.now() - new Date(d)) / (365.25 * 24 * 3600 * 1000))
const initials = n => n.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
const COLORS = ['#1d4ed8','#0891b2','#7c3aed','#be185d','#059669','#d97706','#dc2626']
const getColor = n => COLORS[n.charCodeAt(0) % COLORS.length]

const statusStyle = s => ({
  active:   { bg:'#d1fae5', color:'#065f46', dot:'#10b981' },
  inactive: { bg:'#f3f4f6', color:'#374151', dot:'#9ca3af' },
  pending:  { bg:'#fef3c7', color:'#92400e', dot:'#f59e0b' },
}[s] || { bg:'#f3f4f6', color:'#374151', dot:'#9ca3af' })

// ─── REUSABLE UI ──────────────────────────────────────────────────────────────
const StatusBadge = ({ s }) => {
  const st = statusStyle(s)
  return (
    <span style={{ background:st.bg, color:st.color, padding:'3px 10px', borderRadius:20, fontSize:11, fontWeight:700, display:'inline-flex', alignItems:'center', gap:5 }}>
      <span style={{ width:6, height:6, borderRadius:'50%', background:st.dot }} />{s.charAt(0).toUpperCase()+s.slice(1)}
    </span>
  )
}

const Avatar = ({ name, photoUrl, size=40, radius=10 }) => (
  photoUrl
    ? <img src={photoUrl} alt={name} style={{ width:size, height:size, borderRadius:radius, objectFit:'cover', flexShrink:0 }} />
    : <div style={{ width:size, height:size, borderRadius:radius, background:getColor(name), color:'#fff', display:'flex', alignItems:'center', justifyContent:'center', fontWeight:800, fontSize:size*0.33, flexShrink:0 }}>{initials(name)}</div>
)

const Btn = ({ children, onClick, variant='primary', size='md', disabled, full }) => {
  const v = {
    primary:   { background:'#1d4ed8', color:'#fff', border:'none' },
    secondary: { background:'#fff', color:'#374151', border:'1.5px solid #e2e8f0' },
    danger:    { background:'#fef2f2', color:'#dc2626', border:'1.5px solid #fecaca' },
    green:     { background:'#f0fdf4', color:'#15803d', border:'1.5px solid #bbf7d0' },
  }[variant]
  const p = { sm:'6px 14px', md:'9px 20px', lg:'12px 28px' }[size]
  const fs = { sm:12, md:14, lg:15 }[size]
  return (
    <button onClick={onClick} disabled={disabled} style={{ ...v, padding:p, fontSize:fs, fontWeight:650, borderRadius:9, cursor:disabled?'not-allowed':'pointer', fontFamily:'inherit', display:'inline-flex', alignItems:'center', gap:6, opacity:disabled?.5:1, width:full?'100%':undefined, justifyContent:full?'center':undefined, transition:'opacity 0.15s' }}>
      {children}
    </button>
  )
}

// ─── FORM HELPERS ─────────────────────────────────────────────────────────────
const FL = ({ children, req }) => <label style={{ display:'block', fontSize:12, fontWeight:700, color:'#475569', marginBottom:5 }}>{children}{req && <span style={{ color:'#ef4444' }}> *</span>}</label>

const FI = ({ label, value, onChange, placeholder, type='text', req, half }) => (
  <div style={{ marginBottom:14, flex:half?'1':'unset' }}>
    <FL req={req}>{label}</FL>
    <input type={type} value={value} onChange={e=>onChange(e.target.value)} placeholder={placeholder}
      style={{ width:'100%', padding:'9px 12px', border:'1.5px solid #e2e8f0', borderRadius:8, fontSize:14, color:'#1e293b', outline:'none', fontFamily:'inherit', background:'#fafbff', boxSizing:'border-box' }}
      onFocus={e=>e.target.style.borderColor='#1d4ed8'} onBlur={e=>e.target.style.borderColor='#e2e8f0'} />
  </div>
)

const FS = ({ label, value, onChange, options }) => (
  <div style={{ marginBottom:14 }}>
    <FL>{label}</FL>
    <select value={value} onChange={e=>onChange(e.target.value)}
      style={{ width:'100%', padding:'9px 12px', border:'1.5px solid #e2e8f0', borderRadius:8, fontSize:14, color:'#1e293b', fontFamily:'inherit', background:'#fafbff', outline:'none' }}>
      {options.map(o=><option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  </div>
)

const FT = ({ label, value, onChange, placeholder }) => (
  <div style={{ marginBottom:14 }}>
    <FL>{label}</FL>
    <textarea value={value} onChange={e=>onChange(e.target.value)} placeholder={placeholder} rows={2}
      style={{ width:'100%', padding:'9px 12px', border:'1.5px solid #e2e8f0', borderRadius:8, fontSize:14, color:'#1e293b', fontFamily:'inherit', background:'#fafbff', resize:'vertical', outline:'none', boxSizing:'border-box' }}
      onFocus={e=>e.target.style.borderColor='#1d4ed8'} onBlur={e=>e.target.style.borderColor='#e2e8f0'} />
  </div>
)

// ─── TOAST ───────────────────────────────────────────────────────────────────
function useToast() {
  const [toasts, setToasts] = useState([])
  const show = (msg, type='success') => {
    const id = Date.now()
    setToasts(t=>[...t,{id,msg,type}])
    setTimeout(()=>setToasts(t=>t.filter(x=>x.id!==id)), 3200)
  }
  return { toasts, show }
}

const ToastColors = { success:{ bg:'#f0fdf4', border:'#86efac', color:'#14532d', icon:'✓' }, error:{ bg:'#fef2f2', border:'#fca5a5', color:'#991b1b', icon:'✗' }, info:{ bg:'#eff6ff', border:'#93c5fd', color:'#1e3a8a', icon:'ℹ' } }

// ─── MODAL ───────────────────────────────────────────────────────────────────
const Modal = ({ open, onClose, title, children, width=540 }) => {
  if (!open) return null
  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(15,23,42,0.45)', zIndex:9000, display:'flex', alignItems:'center', justifyContent:'center', padding:20 }} onClick={onClose}>
      <div style={{ background:'#fff', borderRadius:18, width:'100%', maxWidth:width, maxHeight:'92vh', overflow:'auto', boxShadow:'0 32px 80px rgba(0,0,0,0.22)' }} onClick={e=>e.stopPropagation()}>
        <div style={{ padding:'18px 24px', borderBottom:'1px solid #f1f5f9', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
          <span style={{ fontSize:16, fontWeight:750, color:'#0f172a' }}>{title}</span>
          <button onClick={onClose} style={{ background:'#f1f5f9', border:'none', borderRadius:8, width:30, height:30, cursor:'pointer', fontSize:18, color:'#64748b', display:'flex', alignItems:'center', justifyContent:'center' }}>×</button>
        </div>
        <div style={{ padding:24 }}>{children}</div>
      </div>
    </div>
  )
}

// ─── DONUT CHART ─────────────────────────────────────────────────────────────
const DonutChart = ({ active, inactive, pending }) => {
  const total = active + inactive + pending || 1
  const r=30, circ=2*Math.PI*r
  const aD=circ*(active/total), iD=circ*(inactive/total)
  return (
    <div style={{ display:'flex', alignItems:'center', gap:16 }}>
      <svg width="76" height="76" viewBox="0 0 76 76">
        <circle cx="38" cy="38" r={r} fill="none" stroke="#e2e8f0" strokeWidth="11"/>
        <circle cx="38" cy="38" r={r} fill="none" stroke="#1d4ed8" strokeWidth="11" strokeDasharray={`${aD} ${circ-aD}`} transform="rotate(-90 38 38)" strokeLinecap="round"/>
        <circle cx="38" cy="38" r={r} fill="none" stroke="#10b981" strokeWidth="11" strokeDasharray={`${iD} ${circ-iD}`} strokeDashoffset={-aD} transform="rotate(-90 38 38)" strokeLinecap="round"/>
        <text x="38" y="35" textAnchor="middle" fontSize="10" fontWeight="800" fill="#0f172a">{Math.round((active/total)*100)}%</text>
        <text x="38" y="48" textAnchor="middle" fontSize="9" fill="#64748b">Active</text>
      </svg>
      <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
        {[{c:'#1d4ed8',l:'Active',v:active},{c:'#10b981',l:'Inactive',v:inactive},{c:'#f59e0b',l:'Pending',v:pending}].map(x=>(
          <div key={x.l} style={{ display:'flex', alignItems:'center', gap:7 }}>
            <div style={{ width:8, height:8, borderRadius:'50%', background:x.c, flexShrink:0 }}/>
            <span style={{ fontSize:12, color:'#64748b' }}>{x.l}: <strong style={{ color:'#0f172a' }}>{x.v}</strong></span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── SIDEBAR ─────────────────────────────────────────────────────────────────
const NAV = [
  { id:'dashboard', label:'Dashboard', icon:'M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z M9 22V12h6v10' },
  { id:'families',  label:'Families',  icon:'M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2 M9 7a4 4 0 1 0 0-8 4 4 0 0 0 0 8 M23 21v-2a4 4 0 0 0-3-3.87 M16 3.13a4 4 0 0 1 0 7.75' },
  { id:'analytics', label:'Statistics', icon:'M18 20V10 M12 20V4 M6 20v-6' },
  { id:'settings',  label:'Settings',  icon:'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6 M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z' },
]

function Sidebar({ page, setPage, collapsed, setCollapsed }) {
  return (
    <aside style={{ width:collapsed?66:200, flexShrink:0, background:'#0c1f3f', height:'100vh', position:'sticky', top:0, display:'flex', flexDirection:'column', transition:'width 0.22s ease', overflow:'hidden' }}>
      {/* Logo */}
      <div style={{ padding:collapsed?'16px 10px':'16px 16px', borderBottom:'1px solid rgba(255,255,255,0.08)', display:'flex', alignItems:'center', gap:10, justifyContent:collapsed?'center':'flex-start' }}>
        <div style={{ width:38, height:38, borderRadius:10, background:'#fff', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, overflow:'hidden' }}>
          {/* Logo image — replace src with /logo.png once you have it */}
          <img src="/logo.png" alt="Hidaya" style={{ width:34, height:34, objectFit:'contain' }}
            onError={e=>{ e.target.style.display='none'; e.target.nextSibling.style.display='flex' }} />
          <div style={{ display:'none', width:34, height:34, alignItems:'center', justifyContent:'center', fontSize:18, background:'linear-gradient(135deg,#1d4ed8,#3b82f6)', borderRadius:8 }}>🕊</div>
        </div>
        {!collapsed && (
          <div>
            <div style={{ fontSize:12, fontWeight:800, color:'#fff', lineHeight:1.2, letterSpacing:'0.01em' }}>Hidaya</div>
            <div style={{ fontSize:9, color:'#94a3b8', fontWeight:500, lineHeight:1.2 }}>Development Association</div>
          </div>
        )}
      </div>

      {/* Nav */}
      <nav style={{ flex:1, padding:'10px 6px' }}>
        {NAV.map(item => (
          <button key={item.id} onClick={()=>setPage(item.id)} style={{
            width:'100%', padding:collapsed?'11px':'10px 12px', borderRadius:9, border:'none', cursor:'pointer',
            background:page===item.id?'rgba(29,78,216,0.35)':'transparent',
            display:'flex', alignItems:'center', gap:10, marginBottom:3,
            justifyContent:collapsed?'center':'flex-start', transition:'background 0.15s'
          }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={page===item.id?'#93c5fd':'#64748b'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d={item.icon}/>
            </svg>
            {!collapsed && <span style={{ fontSize:13, fontWeight:page===item.id?700:500, color:page===item.id?'#e0f2fe':'#94a3b8' }}>{item.label}</span>}
          </button>
        ))}
      </nav>

      {/* Collapse toggle */}
      <button onClick={()=>setCollapsed(!collapsed)} style={{ margin:'10px 6px', padding:'8px', border:'1px solid rgba(255,255,255,0.1)', borderRadius:8, background:'transparent', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}>
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2" strokeLinecap="round">
          {collapsed ? <><polyline points="9 18 15 12 9 6"/></> : <><polyline points="15 18 9 12 15 6"/></>}
        </svg>
      </button>
    </aside>
  )
}

// ─── HEADER ───────────────────────────────────────────────────────────────────
function Header({ title, breadcrumb }) {
  return (
    <div style={{ background:'#fff', borderBottom:'1px solid #e8f0fe', padding:'0 26px', height:58, display:'flex', alignItems:'center', justifyContent:'space-between', position:'sticky', top:0, zIndex:50 }}>
      <div>
        {breadcrumb
          ? <div style={{ display:'flex', alignItems:'center', gap:6 }}>
              {breadcrumb.map((b,i)=>(
                <span key={i} style={{ display:'flex', alignItems:'center', gap:6 }}>
                  {i>0 && <span style={{ color:'#cbd5e1' }}>›</span>}
                  <span style={{ fontSize:13, color:i===breadcrumb.length-1?'#0f172a':'#94a3b8', fontWeight:i===breadcrumb.length-1?700:500 }}>{b}</span>
                </span>
              ))}
            </div>
          : <span style={{ fontSize:17, fontWeight:800, color:'#0f172a' }}>{title}</span>
        }
      </div>
      <div style={{ display:'flex', alignItems:'center', gap:10 }}>
        <div style={{ width:8, height:8, borderRadius:'50%', background:'#10b981' }} />
        <span style={{ fontSize:12, color:'#64748b', fontWeight:600 }}>Hidaya Staff Portal</span>
        <div style={{ width:34, height:34, borderRadius:9, background:'linear-gradient(135deg,#1d4ed8,#3b82f6)', display:'flex', alignItems:'center', justifyContent:'center', color:'#fff', fontSize:13, fontWeight:800, marginLeft:6 }}>AD</div>
      </div>
    </div>
  )
}

// ─── STAT CARD ────────────────────────────────────────────────────────────────
const StatCard = ({ label, value, icon, bg, color, sub }) => (
  <div style={{ background:'#fff', borderRadius:13, border:'1px solid #e8f0fe', padding:'18px 20px', display:'flex', alignItems:'center', gap:14, flex:1, minWidth:140 }}>
    <div style={{ width:46, height:46, borderRadius:12, background:bg, display:'flex', alignItems:'center', justifyContent:'center', fontSize:22, flexShrink:0 }}>{icon}</div>
    <div>
      <div style={{ fontSize:11, color:'#94a3b8', fontWeight:700, textTransform:'uppercase', letterSpacing:'0.05em', marginBottom:3 }}>{label}</div>
      <div style={{ fontSize:26, fontWeight:800, color:'#0f172a', lineHeight:1 }}>{value}</div>
      {sub && <div style={{ fontSize:11, color, marginTop:2, fontWeight:600 }}>{sub}</div>}
    </div>
  </div>
)

// ─── DASHBOARD PAGE ───────────────────────────────────────────────────────────
function DashboardPage({ families, children, onView, onAdd }) {
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('All')
  const [pg, setPg] = useState(1)
  const PER = 5
  const active = families.filter(f=>f.status==='active').length
  const inactive = families.filter(f=>f.status==='inactive').length
  const pending = families.filter(f=>f.status==='pending').length

  const filtered = families.filter(f => {
    const q = search.toLowerCase()
    return (!q || f.mother_name.toLowerCase().includes(q) || f.code.toLowerCase().includes(q) || f.phone.includes(q))
      && (filter==='All' || f.status===filter.toLowerCase())
  })
  const paged = filtered.slice((pg-1)*PER, pg*PER)
  const pages = Math.ceil(filtered.length/PER)

  return (
    <div style={{ padding:'22px 26px', maxWidth:1140, margin:'0 auto' }}>
      {/* Stats */}
      <div style={{ display:'flex', gap:14, marginBottom:20, flexWrap:'wrap' }}>
        <StatCard label="Total Families" value={families.length} icon="👨‍👩‍👧‍👦" bg="#dbeafe" color="#1d4ed8" sub={`${active} active`}/>
        <StatCard label="Total Children" value={children.length} icon="👶" bg="#d1fae5" color="#059669" sub="enrolled"/>
        <StatCard label="Pending Cases" value={pending} icon="⏳" bg="#fef3c7" color="#d97706" sub="need review"/>
        <div style={{ background:'#fff', borderRadius:13, border:'1px solid #e8f0fe', padding:'18px 20px', flex:1, minWidth:180 }}>
          <div style={{ fontSize:11, color:'#94a3b8', fontWeight:700, textTransform:'uppercase', letterSpacing:'0.05em', marginBottom:10 }}>Family Statistics</div>
          <DonutChart active={active} inactive={inactive} pending={pending}/>
        </div>
      </div>

      {/* Table card */}
      <div style={{ background:'#fff', borderRadius:16, border:'1px solid #e8f0fe', overflow:'hidden' }}>
        <div style={{ padding:'16px 20px', borderBottom:'1px solid #f1f5f9', display:'flex', alignItems:'center', justifyContent:'space-between', flexWrap:'wrap', gap:10 }}>
          <span style={{ fontSize:15, fontWeight:800, color:'#0f172a' }}>Beneficiary List</span>
          <div style={{ display:'flex', gap:8, alignItems:'center', flexWrap:'wrap' }}>
            {/* Search */}
            <div style={{ position:'relative' }}>
              <span style={{ position:'absolute', left:10, top:'50%', transform:'translateY(-50%)', color:'#94a3b8', fontSize:14 }}>🔍</span>
              <input value={search} onChange={e=>{setSearch(e.target.value);setPg(1)}} placeholder="Search…"
                style={{ paddingLeft:30, paddingRight:10, paddingTop:7, paddingBottom:7, border:'1.5px solid #e2e8f0', borderRadius:8, fontSize:13, outline:'none', fontFamily:'inherit', width:160 }}/>
            </div>
            <select value={filter} onChange={e=>{setFilter(e.target.value);setPg(1)}} style={{ padding:'7px 10px', border:'1.5px solid #e2e8f0', borderRadius:8, fontSize:13, color:'#374151', fontFamily:'inherit' }}>
              {['All','Active','Inactive','Pending'].map(o=><option key={o}>{o}</option>)}
            </select>
            <Btn onClick={onAdd}>＋ Add Family</Btn>
          </div>
        </div>

        <div style={{ overflowX:'auto' }}>
          <table style={{ width:'100%', borderCollapse:'collapse', minWidth:580 }}>
            <thead>
              <tr style={{ background:'#f8fafc' }}>
                {['Code','Roll No','Mother','Phone','District','Children','Status',''].map(h=>(
                  <th key={h} style={{ padding:'10px 14px', textAlign:'left', fontSize:11, fontWeight:700, color:'#64748b', letterSpacing:'0.05em', textTransform:'uppercase', borderBottom:'1px solid #f1f5f9', whiteSpace:'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {paged.length===0 && (
                <tr><td colSpan={8} style={{ padding:40, textAlign:'center', color:'#94a3b8' }}>
                  <div style={{ fontSize:36, marginBottom:8 }}>🔍</div>No families found.
                </td></tr>
              )}
              {paged.map(f=>(
                <tr key={f.id} style={{ borderBottom:'1px solid #f8fafc', cursor:'pointer' }}
                  onMouseEnter={e=>e.currentTarget.style.background='#f8fbff'}
                  onMouseLeave={e=>e.currentTarget.style.background='transparent'}
                  onClick={()=>onView(f)}>
                  <td style={{ padding:'12px 14px', fontWeight:700, color:'#1d4ed8', fontSize:13 }}>{f.code}</td>
                  <td style={{ padding:'12px 14px', fontSize:13, color:'#64748b' }}>{f.roll}</td>
                  <td style={{ padding:'12px 14px' }}>
                    <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                      <Avatar name={f.mother_name} photoUrl={f.mother_photo_url} size={34} radius={9}/>
                      <span style={{ fontWeight:650, fontSize:13, color:'#1e293b' }}>{f.mother_name}</span>
                    </div>
                  </td>
                  <td style={{ padding:'12px 14px', fontSize:13, color:'#475569' }}>{f.phone}</td>
                  <td style={{ padding:'12px 14px', fontSize:13, color:'#475569' }}>{f.district}</td>
                  <td style={{ padding:'12px 14px' }}>
                    <span style={{ background:'#eff6ff', color:'#1d4ed8', fontWeight:700, fontSize:12, padding:'2px 10px', borderRadius:20 }}>{f.children_count}</span>
                  </td>
                  <td style={{ padding:'12px 14px' }}><StatusBadge s={f.status}/></td>
                  <td style={{ padding:'12px 14px' }}>
                    <button onClick={e=>{e.stopPropagation();onView(f)}} style={{ background:'#eff6ff', border:'none', borderRadius:7, padding:'5px 12px', cursor:'pointer', fontSize:12, color:'#1d4ed8', fontWeight:650 }}>View →</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div style={{ padding:'12px 16px', borderTop:'1px solid #f1f5f9', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
          <span style={{ fontSize:12, color:'#94a3b8' }}>Showing {Math.min((pg-1)*PER+1,filtered.length)}–{Math.min(pg*PER,filtered.length)} of {filtered.length}</span>
          <div style={{ display:'flex', gap:4 }}>
            <button onClick={()=>setPg(p=>Math.max(1,p-1))} disabled={pg===1} style={{ padding:'5px 10px', border:'1px solid #e2e8f0', borderRadius:6, background:'#fff', cursor:pg===1?'not-allowed':'pointer', fontSize:12, color:'#64748b', opacity:pg===1?.4:1 }}>← Prev</button>
            {Array.from({length:Math.min(pages,4)},(_,i)=>i+1).map(p=>(
              <button key={p} onClick={()=>setPg(p)} style={{ width:28, height:28, border:'1px solid', borderRadius:6, fontSize:12, fontWeight:600, cursor:'pointer', background:p===pg?'#1d4ed8':'#fff', color:p===pg?'#fff':'#64748b', borderColor:p===pg?'#1d4ed8':'#e2e8f0' }}>{p}</button>
            ))}
            <button onClick={()=>setPg(p=>Math.min(pages,p+1))} disabled={pg===pages||pages===0} style={{ padding:'5px 10px', border:'1px solid #e2e8f0', borderRadius:6, background:'#fff', cursor:'pointer', fontSize:12, color:'#64748b', opacity:pg===pages?.4:1 }}>Next →</button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── FAMILY DETAIL PAGE ───────────────────────────────────────────────────────
function FamilyDetailPage({ family, allChildren, onBack, onEditFamily, onAddChild, onEditChild, onDeleteChild, toast }) {
  const kids = allChildren.filter(c=>c.family_id===family.id)
  const [tab, setTab] = useState('overview')
  const tabs = ['overview','children','documents','notes']

  return (
    <div style={{ padding:'22px 26px', maxWidth:1040, margin:'0 auto' }}>
      {/* Back + actions */}
      <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:18 }}>
        <button onClick={onBack} style={{ background:'#f1f5f9', border:'none', borderRadius:8, padding:'7px 14px', cursor:'pointer', fontSize:13, color:'#475569', fontWeight:650, display:'flex', alignItems:'center', gap:6 }}>← Back</button>
        <div style={{ flex:1 }}/>
        <Btn onClick={()=>onEditFamily(family)} variant="secondary" size="sm">✏ Edit Family</Btn>
        <StatusBadge s={family.status}/>
      </div>

      {/* Mother hero card */}
      <div style={{ background:'linear-gradient(135deg,#0c1f3f 0%,#1d3461 100%)', borderRadius:18, padding:'28px', marginBottom:20, display:'flex', alignItems:'flex-start', gap:24, flexWrap:'wrap' }}>
        {/* Photo */}
        <div style={{ flexShrink:0 }}>
          <Avatar name={family.mother_name} photoUrl={family.mother_photo_url} size={90} radius={16}/>
          <div style={{ marginTop:8, fontSize:10, color:'#94a3b8', textAlign:'center' }}>Mother Photo</div>
        </div>
        {/* Info */}
        <div style={{ flex:1, minWidth:200 }}>
          <div style={{ fontSize:22, fontWeight:800, color:'#fff', marginBottom:4 }}>{family.mother_name}</div>
          <div style={{ fontSize:13, color:'#93c5fd', marginBottom:14 }}>ID: {family.mother_id} · {family.code} · Roll {family.roll}</div>
          <div style={{ display:'flex', flexWrap:'wrap', gap:10 }}>
            {[{i:'📱',v:family.phone},{i:'📞',v:family.alt_phone||'—'},{i:'📍',v:family.address},{i:'🏙',v:`${family.city}, ${family.district}`}].map((x,i)=>(
              <span key={i} style={{ fontSize:12, color:'#cbd5e1', display:'flex', alignItems:'center', gap:5 }}>{x.i} {x.v}</span>
            ))}
          </div>
        </div>
        {/* Quick stats */}
        <div style={{ display:'flex', gap:12, flexShrink:0 }}>
          {[{n:kids.length,l:'Children'},{n:family.created_at,l:'Registered'}].map(s=>(
            <div key={s.l} style={{ background:'rgba(255,255,255,0.08)', borderRadius:12, padding:'12px 18px', textAlign:'center', backdropFilter:'blur(4px)' }}>
              <div style={{ fontSize:s.l==='Children'?24:13, fontWeight:800, color:'#93c5fd', lineHeight:1.2 }}>{s.n}</div>
              <div style={{ fontSize:11, color:'#64748b', marginTop:2 }}>{s.l}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display:'flex', gap:3, marginBottom:18, background:'#f1f5f9', padding:5, borderRadius:11, width:'fit-content' }}>
        {tabs.map(t=>(
          <button key={t} onClick={()=>setTab(t)} style={{ padding:'8px 18px', borderRadius:8, border:'none', cursor:'pointer', fontSize:13, fontWeight:600, fontFamily:'inherit', background:tab===t?'#fff':'transparent', color:tab===t?'#1d4ed8':'#64748b', boxShadow:tab===t?'0 1px 4px rgba(0,0,0,0.09)':'none', transition:'all 0.15s', textTransform:'capitalize' }}>{t}</button>
        ))}
      </div>

      {/* ── OVERVIEW TAB ── */}
      {tab==='overview' && (
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14 }}>
          {[
            {l:'Family Code',v:family.code},{l:'Roll Number',v:family.roll},
            {l:'National ID',v:family.mother_id},{l:'Phone',v:family.phone},
            {l:'Alternate Phone',v:family.alt_phone||'—'},{l:'City',v:family.city},
            {l:'District / Sub-City',v:family.district},{l:'Registered',v:family.created_at},
          ].map(r=>(
            <div key={r.l} style={{ background:'#fff', borderRadius:11, border:'1px solid #e8f0fe', padding:'13px 16px' }}>
              <div style={{ fontSize:10, fontWeight:700, color:'#94a3b8', textTransform:'uppercase', letterSpacing:'0.07em', marginBottom:4 }}>{r.l}</div>
              <div style={{ fontSize:15, fontWeight:650, color:'#1e293b' }}>{r.v}</div>
            </div>
          ))}
          <div style={{ gridColumn:'1/-1', background:'#fff', borderRadius:11, border:'1px solid #e8f0fe', padding:'13px 16px' }}>
            <div style={{ fontSize:10, fontWeight:700, color:'#94a3b8', textTransform:'uppercase', letterSpacing:'0.07em', marginBottom:4 }}>Full Address</div>
            <div style={{ fontSize:14, color:'#1e293b' }}>{family.address}</div>
          </div>
        </div>
      )}

      {/* ── CHILDREN TAB ── */}
      {tab==='children' && (
        <div>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:14 }}>
            <span style={{ fontSize:14, color:'#64748b' }}>{kids.length} children registered</span>
            <Btn onClick={()=>onAddChild(family.id)} size="sm">＋ Add Child</Btn>
          </div>
          {kids.length===0 && (
            <div style={{ background:'#f8fafc', borderRadius:13, padding:'40px', textAlign:'center', color:'#94a3b8' }}>
              <div style={{ fontSize:38, marginBottom:8 }}>👶</div>
              <div style={{ fontWeight:600, marginBottom:10 }}>No children added yet</div>
              <Btn onClick={()=>onAddChild(family.id)} size="sm">Add First Child</Btn>
            </div>
          )}
          <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
            {kids.map(c=>(
              <div key={c.id} style={{ background:'#fff', borderRadius:14, border:'1px solid #e8f0fe', padding:'16px 20px' }}>
                <div style={{ display:'flex', alignItems:'center', gap:14, marginBottom:14 }}>
                  <Avatar name={c.name} photoUrl={c.photo_url} size={52} radius={12}/>
                  <div style={{ flex:1 }}>
                    <div style={{ fontWeight:700, fontSize:15, color:'#0f172a' }}>{c.name}</div>
                    <div style={{ fontSize:13, color:'#64748b', marginTop:3 }}>
                      Age {calcAge(c.dob)} · {c.dob} · {c.grade} · 🏫 {c.school}
                    </div>
                    {c.medical_notes && <div style={{ marginTop:5, fontSize:11, color:'#dc2626', background:'#fef2f2', padding:'3px 9px', borderRadius:6, display:'inline-block' }}>⚕ {c.medical_notes}</div>}
                  </div>
                  <div style={{ display:'flex', gap:8 }}>
                    <Btn onClick={()=>onEditChild(c)} variant="secondary" size="sm">✏ Edit</Btn>
                    <Btn onClick={()=>onDeleteChild(c)} variant="danger" size="sm">Delete</Btn>
                  </div>
                </div>
                {/* Child documents */}
                <div style={{ background:'#f8fafc', borderRadius:10, padding:'12px 14px', display:'flex', gap:16, flexWrap:'wrap' }}>
                  <div style={{ fontSize:11, fontWeight:700, color:'#64748b', textTransform:'uppercase', letterSpacing:'0.05em', width:'100%', marginBottom:6 }}>📎 Documents</div>
                  {[
                    {key:'birth_cert', label:'Birth Certificate'},
                    {key:'school_cert', label:'School Certificate'},
                  ].map(doc=>(
                    <div key={doc.key} style={{ flex:1, minWidth:160 }}>
                      <div style={{ fontSize:11, color:'#64748b', marginBottom:6, fontWeight:600 }}>{doc.label}</div>
                      {c.docs?.[doc.key]
                        ? <div style={{ background:'#fff', border:'1px solid #e8f0fe', borderRadius:8, padding:'8px 12px', display:'flex', alignItems:'center', gap:8 }}>
                            <span style={{ fontSize:18 }}>📄</span>
                            <span style={{ fontSize:11, color:'#1d4ed8', fontWeight:600, flex:1, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>Uploaded ✓</span>
                            <button onClick={()=>toast('Opening document…','info')} style={{ background:'#eff6ff', border:'none', borderRadius:6, padding:'3px 9px', cursor:'pointer', fontSize:11, color:'#1d4ed8', fontWeight:650 }}>View</button>
                          </div>
                        : <div style={{ border:'1.5px dashed #93c5fd', borderRadius:8, padding:'8px 12px', fontSize:11, color:'#94a3b8', background:'#f8fbff', cursor:'pointer', textAlign:'center' }}
                            onClick={()=>toast('Upload feature — connect Supabase Storage','info')}>
                            + Upload
                          </div>
                      }
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── DOCUMENTS TAB ── */}
      {tab==='documents' && (
        <div>
          <div style={{ fontSize:13, color:'#64748b', marginBottom:16 }}>Mother's official documents</div>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(200px,1fr))', gap:14 }}>
            {[
              {key:'mother_id', label:'Mother National ID', icon:'🪪'},
              {key:'bank_book', label:'Bank Book', icon:'🏦'},
              {key:'family_photo', label:'Family Photo', icon:'🖼'},
              {key:'other', label:'Other Documents', icon:'📋'},
            ].map(doc=>(
              <div key={doc.key} style={{ background:'#fff', borderRadius:13, border:'1px solid #e8f0fe', padding:'18px', display:'flex', flexDirection:'column', gap:10 }}>
                <div style={{ fontSize:30 }}>{doc.icon}</div>
                <div style={{ fontWeight:700, fontSize:13, color:'#0f172a' }}>{doc.label}</div>
                <div style={{ border:'1.5px dashed #93c5fd', borderRadius:8, padding:'10px', textAlign:'center', cursor:'pointer', background:'#f8fbff' }}
                  onClick={()=>toast('Upload feature — connect Supabase Storage','info')}>
                  <div style={{ fontSize:14 }}>📤</div>
                  <div style={{ fontSize:11, color:'#1d4ed8', fontWeight:600, marginTop:2 }}>Upload image or PDF</div>
                  <div style={{ fontSize:10, color:'#94a3b8', marginTop:1 }}>Auto-compressed before upload</div>
                </div>
              </div>
            ))}
          </div>
          <div style={{ marginTop:18, background:'#eff6ff', borderRadius:11, padding:'12px 16px', fontSize:12, color:'#1d4ed8', display:'flex', gap:8 }}>
            <span>ℹ</span>
            <span>All uploaded images are automatically compressed in your browser before being saved — no quality loss, up to 80% smaller file size.</span>
          </div>
        </div>
      )}

      {/* ── NOTES TAB ── */}
      {tab==='notes' && (
        <div style={{ background:'#fff', borderRadius:13, border:'1px solid #e8f0fe', padding:'20px' }}>
          <div style={{ fontSize:13, fontWeight:700, color:'#374151', marginBottom:10 }}>Case Notes</div>
          <div style={{ fontSize:14, color:'#475569', lineHeight:1.8, minHeight:80 }}>
            {family.notes || <span style={{ color:'#94a3b8', fontStyle:'italic' }}>No notes recorded for this family.</span>}
          </div>
        </div>
      )}
    </div>
  )
}

// ─── FAMILY FORM ─────────────────────────────────────────────────────────────
function FamilyForm({ initial, onSave, onCancel }) {
  const [f, setF] = useState(initial || { code:'', roll:'', mother_name:'', mother_id:'', phone:'', alt_phone:'', address:'', city:'Addis Ababa', district:'', notes:'', status:'active', mother_photo_url:null })
  const [photoFile, setPhotoFile] = useState(null)
  const s = k => v => setF(x=>({...x,[k]:v}))

  const handleSave = () => {
    // photoFile is ready for Supabase upload — for now store local preview
    onSave({ ...f, _photoFile: photoFile })
  }

  return (
    <div>
      {/* Mother photo */}
      <div style={{ display:'flex', gap:20, alignItems:'flex-start', marginBottom:20, padding:'16px', background:'#f8fafc', borderRadius:12 }}>
        <ImageUpload
          label="Mother Photo"
          type="photo"
          currentUrl={f.mother_photo_url}
          onFileReady={file => {
            setPhotoFile(file)
            setF(x=>({...x, mother_photo_url: URL.createObjectURL(file)}))
          }}
          shape="circle"
          previewSize={80}
        />
        <div style={{ flex:1, fontSize:12, color:'#64748b', marginTop:24, lineHeight:1.7 }}>
          Upload a clear photo of the mother.<br/>
          Any size accepted — automatically compressed to ~150KB before saving.
        </div>
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'0 16px' }}>
        <FI label="Family Code" value={f.code} onChange={s('code')} placeholder="FM007" req/>
        <FI label="Roll Number" value={f.roll} onChange={s('roll')} placeholder="1007" req/>
        <FI label="Mother Full Name" value={f.mother_name} onChange={s('mother_name')} placeholder="Full name" req/>
        <FI label="National ID Number" value={f.mother_id} onChange={s('mother_id')} placeholder="123-456-789"/>
        <FI label="Phone Number" value={f.phone} onChange={s('phone')} placeholder="0911-000-000" req/>
        <FI label="Alternate Phone" value={f.alt_phone} onChange={s('alt_phone')} placeholder="0922-000-000"/>
        <FI label="City" value={f.city} onChange={s('city')} placeholder="Addis Ababa"/>
        <FI label="District / Sub-City" value={f.district} onChange={s('district')} placeholder="Bole"/>
      </div>
      <FT label="Full Address" value={f.address} onChange={s('address')} placeholder="Street, Kebele, Woreda…"/>
      <FT label="Case Notes" value={f.notes} onChange={s('notes')} placeholder="Any relevant notes…"/>
      <FS label="Status" value={f.status} onChange={s('status')} options={[{value:'active',label:'Active'},{value:'inactive',label:'Inactive'},{value:'pending',label:'Pending'}]}/>

      <div style={{ display:'flex', justifyContent:'flex-end', gap:10, marginTop:6 }}>
        <Btn onClick={onCancel} variant="secondary">Cancel</Btn>
        <Btn onClick={handleSave}>💾 Save Family</Btn>
      </div>
    </div>
  )
}

// ─── CHILD FORM ───────────────────────────────────────────────────────────────
function ChildForm({ initial, familyId, onSave, onCancel }) {
  const [f, setF] = useState(initial || { name:'', gender:'female', dob:'', grade:'', school:'', medical_notes:'', photo_url:null, docs:{ birth_cert:null, school_cert:null } })
  const [photoFile, setPhotoFile] = useState(null)
  const [birthCertFile, setBirthCertFile] = useState(null)
  const [schoolCertFile, setSchoolCertFile] = useState(null)
  const s = k => v => setF(x=>({...x,[k]:v}))

  return (
    <div>
      {/* Child photo */}
      <div style={{ display:'flex', gap:20, alignItems:'flex-start', marginBottom:20, padding:'14px', background:'#f8fafc', borderRadius:12 }}>
        <ImageUpload
          label="Child Photo"
          type="photo"
          currentUrl={f.photo_url}
          onFileReady={file => {
            setPhotoFile(file)
            setF(x=>({...x, photo_url: URL.createObjectURL(file)}))
          }}
          shape="circle"
          previewSize={72}
        />
        <div style={{ flex:1 }}>
          <div style={{ fontSize:12, color:'#64748b', lineHeight:1.7, marginTop:20 }}>Clear photo of the child. Auto-compressed before saving.</div>
        </div>
      </div>

      <FI label="Child Full Name" value={f.name} onChange={s('name')} placeholder="Full name" req/>
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'0 16px' }}>
        <FS label="Gender" value={f.gender} onChange={s('gender')} options={[{value:'female',label:'Female'},{value:'male',label:'Male'}]}/>
        <FI label="Date of Birth" value={f.dob} onChange={s('dob')} type="date" req/>
        <FI label="Grade / Level" value={f.grade} onChange={s('grade')} placeholder="Grade 4"/>
        <FI label="School Name" value={f.school} onChange={s('school')} placeholder="School name"/>
      </div>
      <FT label="Medical Notes" value={f.medical_notes} onChange={s('medical_notes')} placeholder="Any health conditions…"/>

      {/* Document uploads */}
      <div style={{ background:'#f8fafc', borderRadius:11, padding:'14px', marginBottom:14 }}>
        <div style={{ fontSize:12, fontWeight:700, color:'#475569', marginBottom:12, textTransform:'uppercase', letterSpacing:'0.04em' }}>📎 Child Documents</div>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14 }}>
          <ImageUpload label="Birth Certificate" type="document" onFileReady={f=>setBirthCertFile(f)}/>
          <ImageUpload label="School Certificate" type="document" onFileReady={f=>setSchoolCertFile(f)}/>
        </div>
        <div style={{ fontSize:11, color:'#94a3b8', marginTop:6 }}>📷 Upload a photo or scan. Auto-compressed — up to 80% smaller.</div>
      </div>

      <div style={{ display:'flex', justifyContent:'flex-end', gap:10, marginTop:6 }}>
        <Btn onClick={onCancel} variant="secondary">Cancel</Btn>
        <Btn onClick={()=>onSave({ ...f, _photoFile:photoFile, _birthCertFile:birthCertFile, _schoolCertFile:schoolCertFile, family_id:familyId })}>💾 Save Child</Btn>
      </div>
    </div>
  )
}

// ─── ANALYTICS PAGE ───────────────────────────────────────────────────────────
function AnalyticsPage({ families, children }) {
  const byStatus = { active:0, inactive:0, pending:0 }
  families.forEach(f=>byStatus[f.status]++)
  const byDistrict = {}
  families.forEach(f=>{ byDistrict[f.district]=(byDistrict[f.district]||0)+1 })

  return (
    <div style={{ padding:'22px 26px', maxWidth:900, margin:'0 auto' }}>
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(260px,1fr))', gap:18 }}>
        {/* Status */}
        <div style={{ background:'#fff', borderRadius:16, border:'1px solid #e8f0fe', padding:'22px' }}>
          <div style={{ fontSize:14, fontWeight:750, color:'#0f172a', marginBottom:16 }}>Families by Status</div>
          <DonutChart active={byStatus.active} inactive={byStatus.inactive} pending={byStatus.pending}/>
          <div style={{ marginTop:16, display:'flex', flexDirection:'column', gap:10 }}>
            {[{l:'Active',v:byStatus.active,c:'#1d4ed8'},{l:'Inactive',v:byStatus.inactive,c:'#10b981'},{l:'Pending',v:byStatus.pending,c:'#f59e0b'}].map(x=>(
              <div key={x.l}>
                <div style={{ display:'flex', justifyContent:'space-between', marginBottom:4 }}>
                  <span style={{ fontSize:12, color:'#64748b', fontWeight:600 }}>{x.l}</span>
                  <span style={{ fontSize:12, fontWeight:700, color:x.c }}>{x.v}</span>
                </div>
                <div style={{ height:6, background:'#f1f5f9', borderRadius:3 }}>
                  <div style={{ height:'100%', borderRadius:3, background:x.c, width:`${(x.v/families.length||0)*100}%`, transition:'width 0.5s ease' }}/>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* District */}
        <div style={{ background:'#fff', borderRadius:16, border:'1px solid #e8f0fe', padding:'22px' }}>
          <div style={{ fontSize:14, fontWeight:750, color:'#0f172a', marginBottom:16 }}>Families by District</div>
          {Object.entries(byDistrict).map(([d,v])=>(
            <div key={d} style={{ marginBottom:11 }}>
              <div style={{ display:'flex', justifyContent:'space-between', marginBottom:4 }}>
                <span style={{ fontSize:12, color:'#64748b', fontWeight:600 }}>{d}</span>
                <span style={{ fontSize:12, fontWeight:700, color:'#1d4ed8' }}>{v}</span>
              </div>
              <div style={{ height:7, background:'#f1f5f9', borderRadius:4 }}>
                <div style={{ height:'100%', borderRadius:4, background:'#3b82f6', width:`${(v/families.length)*100}%` }}/>
              </div>
            </div>
          ))}
        </div>

        {/* Summary */}
        <div style={{ background:'#fff', borderRadius:16, border:'1px solid #e8f0fe', padding:'22px' }}>
          <div style={{ fontSize:14, fontWeight:750, color:'#0f172a', marginBottom:16 }}>Summary</div>
          {[
            {i:'👨‍👩‍👧‍👦',l:'Total Families',v:families.length},
            {i:'👶',l:'Total Children',v:children.length},
            {i:'📊',l:'Avg Children / Family',v:(children.length/families.length||0).toFixed(1)},
            {i:'✅',l:'Active Families',v:byStatus.active},
            {i:'⏳',l:'Pending Review',v:byStatus.pending},
            {i:'🗺',l:'Districts Covered',v:Object.keys(byDistrict).length},
          ].map(x=>(
            <div key={x.l} style={{ display:'flex', alignItems:'center', gap:12, padding:'9px 0', borderBottom:'1px solid #f8fafc' }}>
              <span style={{ fontSize:18 }}>{x.i}</span>
              <span style={{ flex:1, fontSize:13, color:'#475569' }}>{x.l}</span>
              <span style={{ fontWeight:800, fontSize:15, color:'#0f172a' }}>{x.v}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ─── LOGIN PAGE ───────────────────────────────────────────────────────────────
function LoginPage({ onLogin }) {
  const [email, setEmail] = useState('admin@hidaya.org.et')
  const [pass, setPass] = useState('••••••••')
  const [loading, setLoading] = useState(false)

  return (
    <div style={{ minHeight:'100vh', background:'linear-gradient(160deg,#0c1f3f 0%,#1d3461 60%,#0c1f3f 100%)', display:'flex', alignItems:'center', justifyContent:'center', padding:20 }}>
      <div style={{ position:'absolute', inset:0, backgroundImage:'radial-gradient(circle at 25% 30%, rgba(29,78,216,0.2) 0%, transparent 55%), radial-gradient(circle at 75% 70%, rgba(59,130,246,0.1) 0%, transparent 50%)' }}/>
      <div style={{ background:'rgba(255,255,255,0.98)', borderRadius:20, padding:'40px 36px', width:'100%', maxWidth:400, boxShadow:'0 32px 80px rgba(0,0,0,0.4)', position:'relative' }}>
        {/* Logo + org name */}
        <div style={{ textAlign:'center', marginBottom:28 }}>
          <div style={{ width:72, height:72, borderRadius:18, background:'#fff', border:'2px solid #e8f0fe', display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 14px', overflow:'hidden', boxShadow:'0 4px 16px rgba(29,78,216,0.15)' }}>
            <img src="/logo.png" alt="Hidaya" style={{ width:64, height:64, objectFit:'contain' }}
              onError={e=>{ e.target.style.display='none'; e.target.nextSibling.style.display='flex' }}/>
            <div style={{ display:'none', width:64, height:64, alignItems:'center', justifyContent:'center', fontSize:32, background:'#eff6ff', borderRadius:16 }}>🕊</div>
          </div>
          <div style={{ fontSize:20, fontWeight:800, color:'#0c1f3f', letterSpacing:'-0.01em' }}>Hidaya Development</div>
          <div style={{ fontSize:13, color:'#64748b', marginTop:2, fontWeight:500 }}>Association — Case Management</div>
        </div>

        <FI label="Email Address" value={email} onChange={setEmail} type="email" placeholder="your@hidaya.org.et" req/>
        <FI label="Password" value={pass} onChange={setPass} type="password" req/>

        <button onClick={()=>{setLoading(true);setTimeout(()=>{setLoading(false);onLogin()},1100)}} disabled={loading}
          style={{ width:'100%', padding:'12px', background:'linear-gradient(135deg,#0c1f3f,#1d4ed8)', color:'#fff', border:'none', borderRadius:10, fontSize:15, fontWeight:750, cursor:loading?'not-allowed':'pointer', fontFamily:'inherit', marginTop:4, opacity:loading?.8:1 }}>
          {loading ? 'Signing in…' : 'Sign In →'}
        </button>

        <div style={{ textAlign:'center', marginTop:14 }}>
          <button style={{ background:'none', border:'none', color:'#1d4ed8', fontSize:12, cursor:'pointer', fontWeight:600 }}>Forgot password?</button>
        </div>
        <div style={{ marginTop:18, padding:'10px 14px', background:'#f8fafc', borderRadius:9, fontSize:11, color:'#94a3b8', textAlign:'center' }}>
          Demo mode — click Sign In to enter
        </div>
      </div>
    </div>
  )
}

// ─── ROOT APP ─────────────────────────────────────────────────────────────────
export default function App() {
  const [loggedIn, setLoggedIn] = useState(false)
  const [page, setPage] = useState('dashboard')
  const [collapsed, setCollapsed] = useState(false)
  const [selectedFamily, setSelectedFamily] = useState(null)
  const [families, setFamilies] = useState(FAMILIES)
  const [children, setChildren] = useState(CHILDREN_INIT)

  // Modals
  const [showFamilyForm, setShowFamilyForm] = useState(false)
  const [editingFamily, setEditingFamily] = useState(null)
  const [showChildForm, setShowChildForm] = useState(false)
  const [editingChild, setEditingChild] = useState(null)
  const [childFamilyId, setChildFamilyId] = useState(null)
  const [confirmDelete, setConfirmDelete] = useState(null)

  const { toasts, show: toast } = useToast()

  const viewFamily = f => { setSelectedFamily(f); setPage('detail') }
  const openAddFamily = () => { setEditingFamily(null); setShowFamilyForm(true) }
  const openEditFamily = f => { setEditingFamily(f); setShowFamilyForm(true) }

  const saveFamily = form => {
    if (editingFamily) {
      setFamilies(fs=>fs.map(f=>f.id===editingFamily.id?{...f,...form}:f))
      if (selectedFamily?.id===editingFamily.id) setSelectedFamily(f=>({...f,...form}))
      toast('Family updated successfully')
    } else {
      const nf = { ...form, id:Date.now().toString(), created_at:new Date().toISOString().slice(0,10), children_count:0 }
      setFamilies(fs=>[nf,...fs])
      toast('Family registered')
    }
    setShowFamilyForm(false)
  }

  const openAddChild = fid => { setEditingChild(null); setChildFamilyId(fid); setShowChildForm(true) }
  const openEditChild = c => { setEditingChild(c); setChildFamilyId(c.family_id); setShowChildForm(true) }

  const saveChild = form => {
    if (editingChild) {
      setChildren(cs=>cs.map(c=>c.id===editingChild.id?{...c,...form}:c))
      toast('Child updated')
    } else {
      setChildren(cs=>[...cs,{...form,id:Date.now().toString()}])
      setFamilies(fs=>fs.map(f=>f.id===form.family_id?{...f,children_count:f.children_count+1}:f))
      toast('Child added')
    }
    setShowChildForm(false)
  }

  const doDelete = () => {
    if (confirmDelete.type==='family') {
      setFamilies(fs=>fs.filter(f=>f.id!==confirmDelete.item.id))
      setChildren(cs=>cs.filter(c=>c.family_id!==confirmDelete.item.id))
      if (page==='detail') setPage('dashboard')
      toast('Family removed','info')
    } else {
      setChildren(cs=>cs.filter(c=>c.id!==confirmDelete.item.id))
      if (selectedFamily) setFamilies(fs=>fs.map(f=>f.id===selectedFamily.id?{...f,children_count:Math.max(0,f.children_count-1)}:f))
      toast('Child removed','info')
    }
    setConfirmDelete(null)
  }

  if (!loggedIn) return <LoginPage onLogin={()=>setLoggedIn(true)}/>

  const breadcrumb = page==='detail'&&selectedFamily ? ['Families', selectedFamily.mother_name] : null
  const pageTitle = { dashboard:'Dashboard', detail:'Family Details', analytics:'Statistics', settings:'Settings' }[page]

  return (
    <div style={{ display:'flex', minHeight:'100vh', background:'#eef2f9', fontFamily:"'Segoe UI',system-ui,-apple-system,sans-serif" }}>
      <style>{`*{box-sizing:border-box;}::-webkit-scrollbar{width:5px;height:5px;}::-webkit-scrollbar-track{background:#f1f5f9;}::-webkit-scrollbar-thumb{background:#cbd5e1;border-radius:3px;}button:focus,input:focus,select:focus,textarea:focus{outline:none;}`}</style>

      {/* Toasts */}
      <div style={{ position:'fixed', top:16, right:16, zIndex:9999, display:'flex', flexDirection:'column', gap:8 }}>
        {toasts.map(t=>{ const c=ToastColors[t.type]; return (
          <div key={t.id} style={{ background:c.bg, border:`1px solid ${c.border}`, color:c.color, padding:'10px 16px', borderRadius:10, fontSize:13, fontWeight:600, boxShadow:'0 4px 16px rgba(0,0,0,0.1)', display:'flex', alignItems:'center', gap:8, minWidth:240 }}>
            {c.icon} {t.msg}
          </div>
        )})}
      </div>

      <Sidebar page={page==='detail'?'families':page} setPage={p=>{setPage(p);setSelectedFamily(null)}} collapsed={collapsed} setCollapsed={setCollapsed}/>

      <main style={{ flex:1, display:'flex', flexDirection:'column', minWidth:0 }}>
        <Header title={pageTitle} breadcrumb={breadcrumb}/>
        <div style={{ flex:1, overflowY:'auto' }}>
          {page==='dashboard' && <DashboardPage families={families} children={children} onView={viewFamily} onAdd={openAddFamily}/>}
          {page==='families'  && <DashboardPage families={families} children={children} onView={viewFamily} onAdd={openAddFamily}/>}
          {page==='detail'    && selectedFamily && <FamilyDetailPage family={selectedFamily} allChildren={children} onBack={()=>setPage('dashboard')} onEditFamily={openEditFamily} onAddChild={openAddChild} onEditChild={openEditChild} onDeleteChild={c=>setConfirmDelete({type:'child',item:c})} toast={toast}/>}
          {page==='analytics' && <AnalyticsPage families={families} children={children}/>}
          {page==='settings'  && <div style={{ padding:'60px', textAlign:'center', color:'#94a3b8' }}><div style={{ fontSize:40, marginBottom:10 }}>⚙️</div>Settings — connect Supabase to configure users and roles.</div>}
        </div>
      </main>

      {/* Family form modal */}
      <Modal open={showFamilyForm} onClose={()=>setShowFamilyForm(false)} title={editingFamily?'Edit Family':'Register New Family'} width={640}>
        <FamilyForm initial={editingFamily} onSave={saveFamily} onCancel={()=>setShowFamilyForm(false)}/>
      </Modal>

      {/* Child form modal */}
      <Modal open={showChildForm} onClose={()=>setShowChildForm(false)} title={editingChild?'Edit Child':'Add Child'} width={560}>
        <ChildForm initial={editingChild} familyId={childFamilyId} onSave={saveChild} onCancel={()=>setShowChildForm(false)}/>
      </Modal>

      {/* Confirm delete */}
      <Modal open={!!confirmDelete} onClose={()=>setConfirmDelete(null)} title="Confirm Deletion" width={400}>
        <div style={{ textAlign:'center', padding:'8px 0' }}>
          <div style={{ fontSize:38, marginBottom:10 }}>⚠️</div>
          <div style={{ fontSize:15, fontWeight:700, color:'#0f172a', marginBottom:8 }}>Delete {confirmDelete?.type==='family'?'Family':'Child'}?</div>
          <div style={{ fontSize:13, color:'#64748b', marginBottom:22 }}><strong>{confirmDelete?.item?.mother_name||confirmDelete?.item?.name}</strong> will be permanently removed. This cannot be undone.</div>
          <div style={{ display:'flex', gap:10, justifyContent:'center' }}>
            <Btn onClick={()=>setConfirmDelete(null)} variant="secondary">Cancel</Btn>
            <Btn onClick={doDelete} variant="danger">Delete Permanently</Btn>
          </div>
        </div>
      </Modal>
    </div>
  )
}
