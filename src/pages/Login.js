import { getDailyQuotaSeconds } from '../utils/dailyQuota';

export default function Login() {
  const quotaMinutes = Math.floor(getDailyQuotaSeconds() / 60);

  return (
    <main style={{ maxWidth: 460, margin: '10vh auto', padding: 24, border: '1px solid #ddd', borderRadius: 12 }}>
      <h1>Sign in with Agora</h1>
      <p style={{ marginTop: 12, color: '#555' }}>
        Use your Agora account to access this demo. Each user gets {quotaMinutes} minutes per day.
      </p>
      <a
        href="/api/auth/agora/start"
        style={{
          display: 'inline-block',
          marginTop: 16,
          padding: '10px 16px',
          background: '#2563eb',
          color: '#fff',
          borderRadius: 8,
          textDecoration: 'none',
          fontWeight: 600,
        }}
      >
        Continue with Agora SSO
      </a>
    </main>
  );
}
