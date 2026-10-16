import { useEffect, useRef, useState } from 'react'
import { supabase } from '../lib/supabase'
import { compressImage } from '../lib/imageUtils'
import { logActivity } from '../lib/activity'
import { B } from '../lib/theme'
import Icon from '../components/Icon'

// Scanned agreements (MoUs, contracts, partner letters …). Stored in the private "agreements" bucket,
// opened through short-lived signed links. Everyone with access can view; admin + director upload; admin deletes.
const BUCKET = 'agreements'
const MAX_MB = 15
const fdate = d => d ? new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'
const fsize = n => n > 1048576 ? `${(n / 1048576).toFixed(1)} MB` : `${Math.max(1, Math.round(n / 1024))} KB`
const safeName = n => n.replace(/[^\w.\-]+/g, '_').slice(-80)

const field = { width: '100%', padding: '11px 14px', border: `1.5px solid ${B.border}`, borderRadius: 9, fontSize: 16, color: B.text, background: B.input, fontFamily: 'inherit', boxSizing: 'border-box', minHeight: 46, outline: 'none' }
const lbl = { display: 'block', fontSize: 12, fontWeight: 700, color: B.textMid, marginBottom: 6 }
const btn = (bg, color = '#fff') => ({ background: bg, color, border: 'none', borderRadius: 9, padding: '10px 16px', fontSize: 13, fontWeight: 700, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6, fontFamily: 'inherit', minHeight: 40 })

export default function AgreementsPage({ user, canUpload = false, canDelete = false, toast = () => {}, isMobile }) {
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [missing, setMissing] = useState(false)
  const [q, setQ] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({ title: '', party: '', signed_on: '', notes: '' })
  const [files, setFiles] = useState([])
  const [opening, setOpening] = useState(null)
  const inputRef = useRef(null)

  const load = async () => {
    setLoading(true)
    const { data, error } = await supabase.from('agreements').select('*').order('created_at', { ascending: false })
    if (error) { setMissing(/agreements|relation|schema cache/i.test(error.message)); if (!/agreements|relation|schema cache/i.test(error.message)) toast(error.message, 'error') }
    else { setMissing(false); setRows(data || []) }
    setLoading(false)
  }
  useEffect(() => { load() }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const pick = e => {
    const list = Array.from(e.target.files || [])
    e.target.value = ''
    const ok = []
    for (const f of list) {
      if (!(f.type === 'application/pdf' || f.type.startsWith('image/'))) { toast(`${f.name}: only PDF or image scans are accepted`, 'error'); continue }
      if (f.size > MAX_MB * 1048576) { toast(`${f.name} is larger than ${MAX_MB} MB`, 'error'); continue }
      ok.push(f)
    }
    setFiles(x => [...x, ...ok])
  }

  const save = async () => {
    if (!form.title.trim()) { toast('Give the agreement a title', 'error'); return }
    if (!files.length) { toast('Attach the scanned file (PDF or photo)', 'error'); return }
    setSaving(true)
    const uploaded = []
    try {
      const folder = `${new Date().getFullYear()}/${Date.now()}`
      for (const f of files) {
        let file = f
        if (f.type.startsWith('image/')) { try { file = await compressImage(f, { type: 'document', maxWidth: 2000 }) } catch { file = f } }
        const path = `${folder}/${safeName(f.name)}`
        const { error } = await supabase.storage.from(BUCKET).upload(path, file, { contentType: file.type, upsert: false })
        if (error) throw error
        uploaded.push({ path, name: f.name, type: file.type, size: file.size })
      }
      const { error } = await supabase.from('agreements').insert({
        title: form.title.trim(), party: form.party.trim() || null, signed_on: form.signed_on || null, notes: form.notes.trim() || null,
        files: uploaded, uploaded_by: user.id, uploaded_by_name: user.full_name || user.email,
      })
      if (error) throw error
      logActivity(user, 'agreement', `${user?.full_name || 'Someone'} uploaded the agreement "${form.title.trim()}"${form.party.trim() ? ` (${form.party.trim()})` : ''}`)
      toast('Agreement uploaded')
      setForm({ title: '', party: '', signed_on: '', notes: '' }); setFiles([]); setShowForm(false)
      await load()
    } catch (e) {
      if (uploaded.length) await supabase.storage.from(BUCKET).remove(uploaded.map(u => u.path))
      toast(e.message + (/bucket|not found|row-level/i.test(e.message) ? ' — run migration 010_agreements_letters_director.sql' : ''), 'error')
    } finally { setSaving(false) }
  }

  const open = async (file, key) => {
    setOpening(key)
    const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(file.path, 300)
    setOpening(null)
    if (error || !data?.signedUrl) { toast(error?.message || 'Could not open the file', 'error'); return }
    window.open(data.signedUrl, '_blank', 'noopener')
  }

  const remove = async row => {
    if (!window.confirm(`Delete "${row.title}" and its scanned file(s)? This cannot be undone.`)) return
    const paths = (row.files || []).map(f => f.path)
    if (paths.length) await supabase.storage.from(BUCKET).remove(paths)
    const { error } = await supabase.from('agreements').delete().eq('id', row.id)
    if (error) { toast(error.message, 'error'); return }
    logActivity(user, 'agreement', `${user?.full_name || 'Admin'} deleted the agreement "${row.title}"`)
    toast('Agreement deleted'); load()
  }

  const s = q.trim().toLowerCase()
  const list = rows.filter(r => !s || [r.title, r.party, r.notes, r.uploaded_by_name].some(v => (v || '').toLowerCase().includes(s)))

  return (
    <div style={{ padding: isMobile ? '14px 12px 28px' : '22px 26px', maxWidth: 900, margin: '0 auto' }}>
      <div className="page-banner" style={{ background: `linear-gradient(135deg, ${B.sidebar}, ${B.sidebarMid})`, borderRadius: 14, padding: '16px 20px', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap', border: '1px solid rgba(245,168,0,0.3)', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: `linear-gradient(to right, ${B.gold}, ${B.green})` }} />
        <Icon name="agreement" size={28} color={B.gold} />
        <div style={{ flex: 1, minWidth: 180 }}>
          <div style={{ fontSize: 15, fontWeight: 800, color: B.gold }}>Agreements</div>
          <div className="pb-sub" style={{ fontSize: 12, color: '#a5d6a7' }}>Scanned, signed agreements — kept private to staff</div>
        </div>
        {canUpload && !missing && (
          <button onClick={() => setShowForm(v => !v)} style={btn(B.gold, '#fff')}>
            <Icon name={showForm ? 'x' : 'upload'} size={15} />{showForm ? 'Cancel' : 'Upload agreement'}
          </button>
        )}
      </div>

      {missing && (
        <div style={{ background: B.goldLight, border: `1px solid ${B.goldBorder}`, color: B.warnText, borderRadius: 12, padding: 16, fontSize: 13, lineHeight: 1.6 }}>
          <b>One-time setup needed.</b> Run <code>010_agreements_letters_director.sql</code> in Supabase → SQL Editor, then reload this page.
        </div>
      )}

      {canUpload && showForm && (
        <div style={{ background: B.card, border: `1.5px solid ${B.gold}`, borderRadius: 14, padding: isMobile ? 14 : 20, marginBottom: 16 }}>
          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '0 16px' }}>
            <div style={{ marginBottom: 14 }}><label style={lbl}>Title <span style={{ color: '#ef4444' }}>*</span></label><input style={field} value={form.title} onChange={e => setForm(x => ({ ...x, title: e.target.value }))} placeholder="e.g. MoU with Oromia Bank" maxLength={120} /></div>
            <div style={{ marginBottom: 14 }}><label style={lbl}>Signed with (organization / person)</label><input style={field} value={form.party} onChange={e => setForm(x => ({ ...x, party: e.target.value }))} placeholder="e.g. Oromia Bank" maxLength={120} /></div>
            <div style={{ marginBottom: 14 }}><label style={lbl}>Date signed</label><input type="date" style={field} value={form.signed_on} onChange={e => setForm(x => ({ ...x, signed_on: e.target.value }))} /></div>
            <div style={{ marginBottom: 14 }}><label style={lbl}>Notes</label><input style={field} value={form.notes} onChange={e => setForm(x => ({ ...x, notes: e.target.value }))} placeholder="Optional" maxLength={300} /></div>
          </div>
          <label style={lbl}>Scanned file(s) — PDF or photo, up to {MAX_MB} MB each <span style={{ color: '#ef4444' }}>*</span></label>
          <input ref={inputRef} type="file" accept="application/pdf,image/*" multiple onChange={pick} style={{ display: 'none' }} />
          <button type="button" onClick={() => inputRef.current?.click()} style={{ ...btn(B.greenLight, B.green), border: `1.5px dashed ${B.green}`, width: '100%', justifyContent: 'center', padding: '16px' }}>
            <Icon name="attach" size={16} /> Choose file(s) to attach
          </button>
          {files.length > 0 && (
            <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 6 }}>
              {files.map((f, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, background: B.greenLight, borderRadius: 8, padding: '8px 12px', fontSize: 13, color: B.text }}>
                  <Icon name={f.type === 'application/pdf' ? 'file' : 'image'} size={16} color={B.green} />
                  <span style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f.name}</span>
                  <span style={{ color: B.textLight, fontSize: 11 }}>{fsize(f.size)}</span>
                  <button type="button" aria-label={`Remove ${f.name}`} onClick={() => setFiles(x => x.filter((_, j) => j !== i))} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: B.red, display: 'flex' }}><Icon name="x" size={15} /></button>
                </div>
              ))}
            </div>
          )}
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 16 }}>
            <button onClick={save} disabled={saving} style={{ ...btn(`linear-gradient(135deg, ${B.green}, ${B.greenMid})`), opacity: saving ? 0.6 : 1 }}>
              <Icon name="save" size={15} />{saving ? 'Uploading…' : 'Save agreement'}
            </button>
          </div>
        </div>
      )}

      {!missing && (
        <>
          <input value={q} onChange={e => setQ(e.target.value)} placeholder="Search agreements…" style={{ ...field, marginBottom: 14 }} aria-label="Search agreements" />
          {loading ? (
            <div style={{ textAlign: 'center', color: B.textLight, padding: 40 }}>Loading…</div>
          ) : list.length === 0 ? (
            <div style={{ textAlign: 'center', color: B.textMid, padding: '50px 20px', background: B.card, border: `1px solid ${B.border}`, borderRadius: 14 }}>
              <div style={{ color: B.textLight, marginBottom: 10 }}><Icon name="agreement" size={42} /></div>
              <div style={{ fontWeight: 800, color: B.text, marginBottom: 4 }}>{rows.length ? 'No agreement matches your search' : 'No agreements uploaded yet'}</div>
              {canUpload && !rows.length && <div style={{ fontSize: 13 }}>Use “Upload agreement” to add the first scanned copy.</div>}
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {list.map(r => (
                <div key={r.id} style={{ background: B.card, border: `1px solid ${B.border}`, borderLeft: `5px solid ${B.gold}`, borderRadius: 12, padding: isMobile ? 14 : '16px 18px', boxShadow: '0 2px 10px rgba(30,125,34,0.06)' }}>
                  <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start', flexWrap: 'wrap' }}>
                    <div style={{ flex: 1, minWidth: 200 }}>
                      <div style={{ fontSize: 15, fontWeight: 800, color: B.text }}>{r.title}</div>
                      <div style={{ fontSize: 12, color: B.textMid, marginTop: 3 }}>
                        {r.party ? <>With <b>{r.party}</b> · </> : null}{r.signed_on ? <>Signed {fdate(r.signed_on)} · </> : null}Uploaded {fdate(r.created_at)}{r.uploaded_by_name ? <> by {r.uploaded_by_name}</> : null}
                      </div>
                      {r.notes && <div style={{ fontSize: 12.5, color: B.textMid, marginTop: 6 }}>{r.notes}</div>}
                    </div>
                    {canDelete && <button onClick={() => remove(r)} aria-label={`Delete ${r.title}`} title="Delete" style={{ ...btn(B.errBg, B.errText), border: `1px solid ${B.errBorder}`, padding: '8px 12px' }}><Icon name="trash" size={14} /></button>}
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 12 }}>
                    {(r.files || []).map((f, i) => (
                      <button key={i} onClick={() => open(f, `${r.id}-${i}`)} disabled={opening === `${r.id}-${i}`} style={{ ...btn(B.greenLight, B.green), border: `1px solid ${B.border}`, maxWidth: '100%' }}>
                        <Icon name={f.type === 'application/pdf' ? 'file' : 'image'} size={15} />
                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 220 }}>{opening === `${r.id}-${i}` ? 'Opening…' : f.name}</span>
                        <span style={{ color: B.textLight, fontWeight: 600, fontSize: 11 }}>{fsize(f.size || 0)}</span>
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}
