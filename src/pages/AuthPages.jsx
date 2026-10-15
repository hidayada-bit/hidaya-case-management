import { useState } from 'react'
import { supabase } from '../lib/supabase'
import Icon from '../components/Icon'

const C = {
  green: '#1e7d22', greenDark: '#145717', greenMid: '#2e9e33', greenLight: '#e8f5e9',
  gold: '#f5a800', goldMid: '#ffb300', sidebar: '#0d3b0f', border: '#c8e6c9',
  text: '#1a2e1a', textMid: '#4a6b4a', textLight: '#7a9b7a',
}

const CSS = `
.au-root{min-height:100vh;display:flex;font-family:'Segoe UI',system-ui,-apple-system,sans-serif;background:${C.sidebar};}
.au-brand{flex:1.1;position:relative;overflow:hidden;color:#fff;display:flex;flex-direction:column;justify-content:space-between;padding:48px 56px;
  background:radial-gradient(1200px 700px at 15% 10%,#1e7d22 0%,transparent 60%),radial-gradient(900px 600px at 90% 95%,#145717 0%,transparent 60%),linear-gradient(160deg,#0d3b0f,#0a2e0c);}
.au-orb{position:absolute;border-radius:50%;filter:blur(60px);opacity:.55;will-change:transform;}
.au-orb.o1{width:340px;height:340px;background:#2e9e33;top:-80px;left:-60px;animation:auFloatA 16s ease-in-out infinite;}
.au-orb.o2{width:280px;height:280px;background:#f5a800;opacity:.22;bottom:-70px;right:8%;animation:auFloatB 19s ease-in-out infinite;}
.au-orb.o3{width:220px;height:220px;background:#1e7d22;top:45%;right:-60px;animation:auFloatA 22s ease-in-out infinite reverse;}
.au-ring{position:absolute;border-radius:50%;border:1.5px solid rgba(245,168,0,.18);animation:auSpin 60s linear infinite;}
.au-ring.r1{width:520px;height:520px;right:-180px;top:-160px;}
.au-ring.r2{width:340px;height:340px;right:-90px;top:-70px;border-color:rgba(255,255,255,.08);animation-direction:reverse;animation-duration:80s;}
.au-grid{position:absolute;inset:0;background-image:linear-gradient(rgba(255,255,255,.035) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.035) 1px,transparent 1px);background-size:44px 44px;mask-image:radial-gradient(ellipse at 30% 40%,#000 0%,transparent 75%);}
.au-brand-top,.au-brand-mid,.au-brand-bot{position:relative;z-index:2;}
.au-logo-row{display:flex;align-items:center;gap:14px;animation:auRise .7s ease both;}
.au-logo{width:56px;height:56px;border-radius:15px;background:#fff;display:flex;align-items:center;justify-content:center;box-shadow:0 0 0 2px ${C.gold},0 8px 28px rgba(0,0,0,.35);overflow:hidden;animation:auGlow 4s ease-in-out infinite;}
.au-logo img{width:48px;height:48px;object-fit:contain;}
.au-org{font-size:15px;font-weight:800;letter-spacing:-.01em;line-height:1.2;}
.au-org small{display:block;font-size:11px;font-weight:600;color:#a5d6a7;letter-spacing:.08em;text-transform:uppercase;margin-top:2px;}
.au-h1{font-size:40px;line-height:1.12;font-weight:800;letter-spacing:-.03em;margin:0 0 16px;animation:auRise .8s .1s ease both;}
.au-h1 span{background:linear-gradient(90deg,${C.gold},#ffd54f);-webkit-background-clip:text;background-clip:text;color:transparent;}
.au-sub{font-size:15px;line-height:1.65;color:#c8e6c9;max-width:440px;margin:0 0 30px;animation:auRise .8s .2s ease both;}
.au-feats{display:flex;flex-direction:column;gap:14px;}
.au-feat{display:flex;align-items:center;gap:14px;font-size:14px;color:#e8f5e9;opacity:0;animation:auRise .7s ease forwards;}
.au-feat:nth-child(1){animation-delay:.35s}.au-feat:nth-child(2){animation-delay:.5s}.au-feat:nth-child(3){animation-delay:.65s}
.au-feat i{width:38px;height:38px;border-radius:11px;background:rgba(255,255,255,.08);border:1px solid rgba(255,255,255,.14);display:flex;align-items:center;justify-content:center;color:${C.gold};backdrop-filter:blur(6px);}
.au-foot{font-size:12px;color:#81c784;animation:auRise .8s .8s ease both;opacity:0;animation-fill-mode:forwards;}
.au-formside{flex:.9;display:flex;align-items:center;justify-content:center;padding:32px 24px;background:linear-gradient(180deg,#f7fbf7,#eef6ee);position:relative;min-width:0;}
.au-card{width:100%;max-width:410px;animation:auCard .7s cubic-bezier(.2,.8,.2,1) both;}
.au-card.shake{animation:auShake .45s ease;}
.au-badge{display:inline-flex;align-items:center;gap:6px;background:${C.greenLight};color:${C.green};font-size:11px;font-weight:700;padding:5px 12px;border-radius:20px;letter-spacing:.07em;text-transform:uppercase;margin-bottom:14px;}
.au-title{font-size:28px;font-weight:800;letter-spacing:-.025em;color:${C.sidebar};margin:0 0 6px;}
.au-desc{font-size:14px;color:${C.textMid};margin:0 0 26px;line-height:1.55;}
.au-field{position:relative;margin-bottom:16px;}
.au-field .au-ico{position:absolute;left:14px;top:50%;transform:translateY(-50%);color:${C.textLight};transition:color .2s;pointer-events:none;display:flex;}
.au-input{width:100%;height:52px;padding:18px 44px 0 44px;border:1.5px solid ${C.border};border-radius:12px;font-size:16px;color:${C.text};background:#fff;outline:none;font-family:inherit;transition:border-color .2s,box-shadow .2s;box-sizing:border-box;}
.au-input:focus{border-color:${C.green};box-shadow:0 0 0 4px rgba(30,125,34,.12);}
.au-field:focus-within .au-ico{color:${C.green};}
.au-label{position:absolute;left:44px;top:50%;transform:translateY(-50%);font-size:14px;color:${C.textLight};pointer-events:none;transition:all .18s ease;}
.au-input:focus + .au-label,.au-input:not(:placeholder-shown) + .au-label{top:14px;font-size:11px;font-weight:700;color:${C.green};letter-spacing:.03em;}
.au-eye{position:absolute;right:6px;top:50%;transform:translateY(-50%);width:40px;height:40px;border:none;background:transparent;color:${C.textLight};cursor:pointer;border-radius:10px;display:flex;align-items:center;justify-content:center;}
.au-eye:hover{color:${C.green};background:${C.greenLight};}
.au-btn{position:relative;width:100%;height:52px;border:none;border-radius:12px;font-size:15px;font-weight:800;letter-spacing:.01em;color:#fff;cursor:pointer;font-family:inherit;display:flex;align-items:center;justify-content:center;gap:9px;overflow:hidden;
  background:linear-gradient(135deg,${C.sidebar},${C.green});box-shadow:0 8px 22px rgba(20,87,23,.35);transition:transform .15s,box-shadow .2s,opacity .2s;}
.au-btn::after{content:'';position:absolute;top:0;left:-60%;width:40%;height:100%;background:linear-gradient(100deg,transparent,rgba(255,255,255,.28),transparent);transform:skewX(-20deg);}
.au-btn:hover:not(:disabled){transform:translateY(-1px);box-shadow:0 12px 28px rgba(20,87,23,.42);}
.au-btn:hover:not(:disabled)::after{animation:auShine .8s ease;}
.au-btn:active:not(:disabled){transform:translateY(0);}
.au-btn:disabled{opacity:.75;cursor:not-allowed;}
.au-btn.gold{background:linear-gradient(135deg,${C.gold},${C.goldMid});color:${C.greenDark};box-shadow:0 8px 22px rgba(245,168,0,.35);}
.au-link{background:none;border:none;color:${C.green};font-weight:700;font-size:13px;cursor:pointer;font-family:inherit;padding:8px 4px;}
.au-link:hover{text-decoration:underline;}
.au-link.muted{color:${C.textMid};}
.au-err{display:flex;gap:10px;align-items:flex-start;background:#fef2f2;border:1px solid #fecaca;color:#b91c1c;padding:11px 14px;border-radius:11px;font-size:13px;margin-bottom:16px;animation:auRise .3s ease both;line-height:1.45;}
.au-ok{display:flex;gap:10px;align-items:flex-start;background:${C.greenLight};border:1px solid ${C.border};color:${C.greenDark};padding:11px 14px;border-radius:11px;font-size:13px;margin-bottom:16px;animation:auRise .3s ease both;line-height:1.45;}
.au-row{display:flex;justify-content:space-between;align-items:center;margin-top:12px;gap:8px;flex-wrap:wrap;}
.au-sep{display:flex;align-items:center;gap:12px;margin:20px 0 6px;color:${C.textLight};font-size:12px;}
.au-sep::before,.au-sep::after{content:'';flex:1;height:1px;background:${C.border};}
.au-mobile-brand{display:none;}
.au-status-ico{width:72px;height:72px;border-radius:50%;display:flex;align-items:center;justify-content:center;margin:0 auto 18px;position:relative;}
.au-status-ico.wait{background:#fff8e1;color:#c87d00;}
.au-status-ico.wait::before,.au-status-ico.wait::after{content:'';position:absolute;inset:-6px;border-radius:50%;border:2px solid rgba(245,168,0,.45);animation:auPulse 2.2s ease-out infinite;}
.au-status-ico.wait::after{animation-delay:1.1s;}
.au-status-ico.deny{background:#fef2f2;color:#dc2626;}
.au-steps{margin:22px 0;display:flex;flex-direction:column;gap:12px;text-align:left;}
.au-step{display:flex;gap:12px;align-items:center;font-size:13px;color:${C.textMid};}
.au-step b{width:26px;height:26px;border-radius:50%;background:${C.greenLight};color:${C.green};display:flex;align-items:center;justify-content:center;font-size:12px;flex-shrink:0;}
.au-step.done b{background:${C.green};color:#fff;}
@keyframes auFloatA{0%,100%{transform:translate(0,0) scale(1)}50%{transform:translate(50px,40px) scale(1.12)}}
@keyframes auFloatB{0%,100%{transform:translate(0,0) scale(1)}50%{transform:translate(-60px,-30px) scale(1.15)}}
@keyframes auSpin{to{transform:rotate(360deg)}}
@keyframes auRise{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:none}}
@keyframes auCard{from{opacity:0;transform:translateY(24px) scale(.98)}to{opacity:1;transform:none}}
@keyframes auGlow{0%,100%{box-shadow:0 0 0 2px ${C.gold},0 8px 28px rgba(0,0,0,.35)}50%{box-shadow:0 0 0 2px ${C.gold},0 0 30px rgba(245,168,0,.5)}}
@keyframes auShine{to{left:130%}}
@keyframes auShake{10%,90%{transform:translateX(-2px)}20%,80%{transform:translateX(4px)}30%,50%,70%{transform:translateX(-7px)}40%,60%{transform:translateX(7px)}}
@keyframes auPulse{0%{transform:scale(.9);opacity:.9}100%{transform:scale(1.5);opacity:0}}
@keyframes spin{from{transform:rotate(0)}to{transform:rotate(360deg)}}
@media (max-width:900px){
  .au-root{flex-direction:column;background:linear-gradient(160deg,#0d3b0f,#145717 60%,#1e7d22);}
  .au-brand{display:none;}
  .au-formside{background:transparent;flex:1;padding:20px 16px;}
  .au-card{background:#fff;border-radius:22px;padding:26px 22px;box-shadow:0 30px 80px rgba(0,0,0,.4);}
  .au-mobile-brand{display:flex;align-items:center;gap:12px;margin-bottom:20px;}
  .au-mobile-brand .au-logo{width:48px;height:48px;animation:none;}
  .au-mobile-brand .au-logo img{width:40px;height:40px;}
  .au-mobile-brand .au-org{color:${C.sidebar};font-size:14px;}
  .au-mobile-brand .au-org small{color:${C.textMid};}
  .au-title{font-size:24px;}
}
@media (prefers-reduced-motion:reduce){.au-root *,.au-root *::before,.au-root *::after{animation-duration:.01ms!important;animation-iteration-count:1!important;}}
`

function Brand() {
  return (
    <>
      <aside className="au-brand" aria-hidden="false">
        <div className="au-grid" />
        <div className="au-orb o1" /><div className="au-orb o2" /><div className="au-orb o3" />
        <div className="au-ring r1" /><div className="au-ring r2" />
        <div className="au-brand-top">
          <div className="au-logo-row">
            <div className="au-logo"><img src="/HDA_LOGO.png" alt="HDA" onError={e => { e.target.style.display = 'none' }} /></div>
            <div className="au-org">Hidaya Development Association<small>Staff Portal</small></div>
          </div>
        </div>
        <div className="au-brand-mid">
          <h1 className="au-h1">Caring for every child,<br /><span>one family at a time.</span></h1>
          <p className="au-sub">A secure workspace for managing beneficiary families, education support, and monthly payments across all HDA projects.</p>
          <div className="au-feats">
            <div className="au-feat"><i><Icon name="users" size={18} /></i>Beneficiary families, children and documents</div>
            <div className="au-feat"><i><Icon name="wallet" size={18} /></i>Monthly payment follow-up and bank lists</div>
            <div className="au-feat"><i><Icon name="shield" size={18} /></i>Role-based access approved by administrators</div>
          </div>
        </div>
        <div className="au-brand-bot au-foot">&copy; {new Date().getFullYear()} Hidaya Development Association. Authorized staff only.</div>
      </aside>
    </>
  )
}

function Field({ icon, label, type = 'text', value, onChange, autoComplete, onEnter }) {
  const [show, setShow] = useState(false)
  const isPass = type === 'password'
  return (
    <div className="au-field">
      <span className="au-ico"><Icon name={icon} size={18} /></span>
      <input
        className="au-input" placeholder=" " value={value} autoComplete={autoComplete}
        type={isPass && show ? 'text' : type}
        onChange={e => onChange(e.target.value)}
        onKeyDown={e => { if (e.key === 'Enter' && onEnter) onEnter() }}
      />
      <label className="au-label">{label}</label>
      {isPass && (
        <button type="button" className="au-eye" onClick={() => setShow(s => !s)} aria-label={show ? 'Hide password' : 'Show password'} tabIndex={-1}>
          <Icon name={show ? 'eyeOff' : 'eye'} size={18} />
        </button>
      )}
    </div>
  )
}

function Shell({ children, shake }) {
  return (
    <div className="au-root">
      <style>{CSS}</style>
      <Brand />
      <main className="au-formside">
        <div className={`au-card${shake ? ' shake' : ''}`} key={shake}>
          <div className="au-mobile-brand">
            <div className="au-logo"><img src="/HDA_LOGO.png" alt="HDA" onError={e => { e.target.style.display = 'none' }} /></div>
            <div className="au-org">Hidaya Development Association<small>Staff Portal</small></div>
          </div>
          {children}
        </div>
      </main>
    </div>
  )
}

const friendly = msg => {
  if (!msg) return 'Something went wrong. Please try again.'
  if (/invalid login/i.test(msg)) return 'Incorrect email or password.'
  if (/email not confirmed/i.test(msg)) return 'Please confirm your email first, then sign in.'
  if (/already registered/i.test(msg)) return 'An account with this email already exists. Try signing in.'
  if (/password should be at least/i.test(msg)) return 'Password must be at least 6 characters.'
  if (/rate limit|too many requests|over_email_send_rate_limit/i.test(msg)) return 'Too many emails were sent recently. Please wait a few minutes and try again, or ask an administrator to create/approve your account.'
  return msg
}

// ─── LOGIN ──────────────────────────────────────────────────────────────────
export function LoginPage({ onLogin, onSwitchToSignup }) {
  const [email, setEmail] = useState('')
  const [pass, setPass] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')
  const [shake, setShake] = useState(0)
  const [mode, setMode] = useState('login') // 'login' | 'reset'

  const fail = m => { setError(m); setShake(s => s + 1) }

  const handleLogin = async () => {
    if (!email || !pass) { fail('Please enter your email and password.'); return }
    setLoading(true); setError(''); setInfo('')
    const { error: err } = await supabase.auth.signInWithPassword({ email: email.trim(), password: pass })
    if (err) { fail(friendly(err.message)); setLoading(false) }
    else onLogin && onLogin()
  }

  const handleReset = async () => {
    if (!email) { fail('Enter your email address first.'); return }
    setLoading(true); setError('')
    const { error: err } = await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo: window.location.origin })
    setLoading(false)
    if (err) fail(friendly(err.message))
    else setInfo('If an account exists for this email, a reset link is on its way.')
  }

  return (
    <Shell shake={shake}>
      <div className="au-badge"><Icon name="lock" size={12} />{mode === 'login' ? 'Secure sign in' : 'Password reset'}</div>
      <h2 className="au-title">{mode === 'login' ? 'Welcome back' : 'Reset your password'}</h2>
      <p className="au-desc">{mode === 'login' ? 'Sign in with your HDA staff account to continue.' : 'Enter your email and we will send you a reset link.'}</p>

      {error && <div className="au-err" role="alert"><Icon name="warn" size={17} style={{ marginTop: 1 }} />{error}</div>}
      {info && <div className="au-ok"><Icon name="done" size={17} style={{ marginTop: 1 }} />{info}</div>}

      <Field icon="mail" label="Email address" type="email" value={email} onChange={setEmail} autoComplete="username" onEnter={mode === 'login' ? handleLogin : handleReset} />
      {mode === 'login' && <Field icon="key" label="Password" type="password" value={pass} onChange={setPass} autoComplete="current-password" onEnter={handleLogin} />}

      <button className="au-btn" onClick={mode === 'login' ? handleLogin : handleReset} disabled={loading}>
        {loading ? <><Icon name="spinner" size={18} spin />{mode === 'login' ? 'Signing in…' : 'Sending…'}</> : <>{mode === 'login' ? 'Sign in' : 'Send reset link'}<Icon name="forward" size={18} /></>}
      </button>

      <div className="au-row">
        {mode === 'login'
          ? <button className="au-link muted" onClick={() => { setMode('reset'); setError(''); setInfo('') }}>Forgot password?</button>
          : <button className="au-link muted" onClick={() => { setMode('login'); setError(''); setInfo('') }}>Back to sign in</button>}
      </div>

      <div className="au-sep">New to HDA?</div>
      <button className="au-btn gold" style={{ height: 46, boxShadow: 'none' }} onClick={onSwitchToSignup}>
        <Icon name="userPlus" size={17} />Request access
      </button>
    </Shell>
  )
}

// ─── REQUEST ACCESS (SIGN UP) ───────────────────────────────────────────────
export function SignupPage({ onSwitchToLogin }) {
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [pass, setPass] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [shake, setShake] = useState(0)
  const [done, setDone] = useState(false)

  const fail = m => { setError(m); setShake(s => s + 1) }

  const handleSignup = async () => {
    if (!fullName.trim() || !email || !pass) { fail('Please fill in all fields.'); return }
    if (pass.length < 6) { fail('Password must be at least 6 characters.'); return }
    setLoading(true); setError('')
    try {
      // The database creates the profile as "pending" — an admin must approve it.
      const { error: e } = await supabase.auth.signUp({
        email: email.trim(), password: pass,
        options: { data: { full_name: fullName.trim() } },
      })
      if (e) throw e
      await supabase.auth.signOut().catch(() => {})
      setDone(true)
    } catch (e) { fail(friendly(e.message)) }
    finally { setLoading(false) }
  }

  if (done) {
    return (
      <Shell>
        <div style={{ textAlign: 'center' }}>
          <div className="au-status-ico wait"><Icon name="clock" size={32} /></div>
          <h2 className="au-title">Request sent</h2>
          <p className="au-desc" style={{ marginBottom: 6 }}>Your access request is waiting for an administrator.</p>
          <div className="au-steps">
            <div className="au-step done"><b><Icon name="check" size={14} /></b>Request submitted</div>
            <div className="au-step"><b>2</b>Confirm your email if you receive a message</div>
            <div className="au-step"><b>3</b>An administrator approves you and assigns your role</div>
            <div className="au-step"><b>4</b>Sign in and start working</div>
          </div>
          <button className="au-btn" onClick={onSwitchToLogin}>Back to sign in</button>
        </div>
      </Shell>
    )
  }

  return (
    <Shell shake={shake}>
      <div className="au-badge"><Icon name="userPlus" size={12} />Request access</div>
      <h2 className="au-title">Join the HDA team</h2>
      <p className="au-desc">Create your account. An administrator will review your request and assign your role before you can sign in.</p>

      {error && <div className="au-err" role="alert"><Icon name="warn" size={17} style={{ marginTop: 1 }} />{error}</div>}

      <Field icon="userCog" label="Full name" value={fullName} onChange={setFullName} autoComplete="name" />
      <Field icon="mail" label="Email address" type="email" value={email} onChange={setEmail} autoComplete="username" />
      <Field icon="key" label="Password (min. 6 characters)" type="password" value={pass} onChange={setPass} autoComplete="new-password" onEnter={handleSignup} />

      <button className="au-btn" onClick={handleSignup} disabled={loading}>
        {loading ? <><Icon name="spinner" size={18} spin />Sending request…</> : <>Request access<Icon name="forward" size={18} /></>}
      </button>
      <div className="au-row" style={{ justifyContent: 'center' }}>
        <button className="au-link" onClick={onSwitchToLogin}>Already approved? Sign in</button>
      </div>
    </Shell>
  )
}

// ─── WAITING FOR APPROVAL / ACCESS REVOKED ──────────────────────────────────
export function AccessGate({ user, rejected, onRefresh, onSignOut, checking, error = null }) {
  return (
    <Shell>
      <div style={{ textAlign: 'center' }}>
        <div className={`au-status-ico ${rejected ? 'deny' : 'wait'}`}>
          <Icon name={rejected ? 'reject' : 'clock'} size={32} />
        </div>
        <h2 className="au-title">{rejected ? 'Access not granted' : 'Waiting for approval'}</h2>
        <p className="au-desc">
          {rejected
            ? 'An administrator has declined or removed your access. Please contact the HDA office if you think this is a mistake.'
            : <>Hello{user?.full_name ? <>, <b>{user.full_name}</b></> : ''}. Your account is created but an administrator still needs to approve it and assign your role. This page updates automatically.</>}
        </p>
        {!rejected && (error || !user) && (
          <p className="au-desc" style={{ color: '#b91c1c', fontSize: 12.5 }}>
            {error ? `Could not read your account: ${error}` : 'Your account profile was not found yet. Press "Check again", or ask an administrator to confirm your account exists in Staff.'}
          </p>
        )}
        {!rejected && (
          <div className="au-steps" style={{ margin: '0 0 22px' }}>
            <div className="au-step done"><b><Icon name="check" size={14} /></b>Account created</div>
            <div className="au-step"><b>2</b>Administrator reviews your request</div>
            <div className="au-step"><b>3</b>You get your role and full access</div>
          </div>
        )}
        {!rejected && (
          <button className="au-btn" onClick={onRefresh} disabled={checking} style={{ marginBottom: 10 }}>
            <Icon name="refresh" size={17} spin={checking} />{checking ? 'Checking…' : 'Check again'}
          </button>
        )}
        <button className="au-link muted" onClick={onSignOut}>Sign out</button>
      </div>
    </Shell>
  )
}
