import { useState } from 'react';

export default function Login() {
  const [mode, setMode] = useState('user');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [who, setWho] = useState('');
  const [msg, setMsg] = useState('');

  async function submit(e) {
    e.preventDefault();
    setMsg('');
    const body = mode === 'user' ? { username, password } : { code, who };
    try {
      const res = await fetch('/.netlify/functions/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (res.status === 200) window.location.href = '/';
      else if (res.status === 401) setMsg('Invalid credentials. Try again.');
      else if (res.status === 403) setMsg('Blocked. Contact the site owner.');
      else { const t = await res.text(); setMsg(`Error: ${res.status} ${t || ''}`); }
    } catch (err) { setMsg(`Network error: ${err?.message || err}`); }
  }

  return (
    <main style={{maxWidth: 460, margin: '10vh auto', padding: 24, border: '1px solid #ddd', borderRadius: 12}}>
      <h1>Sign in</h1>
      <div style={{display: 'flex', gap: 8, marginTop: 8}}>
        <button type="button" onClick={() => setMode('user')} disabled={mode==='user'}>Account</button>
        <button type="button" onClick={() => setMode('code')} disabled={mode==='code'}>Access Code</button>
      </div>
      <form onSubmit={submit}>
        {mode === 'user' ? (
          <>
            <div style={{marginTop: 12}}>
              <label>Username</label>
              <input value={username} onChange={e => setUsername(e.target.value)} required style={{width: '100%'}} autoComplete="username" />
            </div>
            <div style={{marginTop: 12}}>
              <label>Password</label>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)} required style={{width: '100%'}} autoComplete="current-password" />
            </div>
          </>
        ) : (
          <>
            <div style={{marginTop: 12}}>
              <label>Access Code</label>
              <input value={code} onChange={e => setCode(e.target.value)} required style={{width: '100%'}} autoComplete="one-time-code" />
            </div>
            <div style={{marginTop: 12}}>
              <label>Your name (optional)</label>
              <input value={who} onChange={e => setWho(e.target.value)} style={{width: '100%'}} autoComplete="name" />
            </div>
          </>
        )}
        <button style={{marginTop: 16}} type="submit">Enter</button>
      </form>
      {msg && <p style={{color: 'crimson'}}>{msg}</p>}
    </main>
  );
}
