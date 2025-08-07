'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

const CHAINS = ['ethereum', 'polygon', 'base', 'bsc', 'arbitrum', 'optimism', 'all'];

export default function LandingPage() {
  const [showInput, setShowInput] = useState(false);
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const router = useRouter();

  const handleGetStarted = () => {
    setShowInput(true);
    setError('');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (CHAINS.includes(password.toLowerCase())) {
      // Option 1: Use sessionStorage to pass chain
      if (typeof window !== 'undefined') {
        sessionStorage.setItem('selected_chain', password.toLowerCase());
      }
      router.push('/dashboard');
    } else {
      setError('Invalid password. Try a valid chain name.');
    }
  };

  return (
    <main style={{ minHeight: '100vh', background: '#f7f7f7', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ background: '#fff', borderRadius: 20, padding: '3rem 2rem', boxShadow: '0 4px 24px rgba(0,0,0,0.07)', maxWidth: 500, width: '100%', textAlign: 'center' }}>
        <div style={{ marginBottom: 24 }}>
          <img src="/globe.svg" alt="Logo" style={{ width: 48, height: 48, borderRadius: 24, marginBottom: 12 }} />
          <h1 style={{ fontSize: '2.2rem', fontWeight: 700, margin: 0, color: '#2d2d2d' }}>
            Unlock Insights from Alchemy Usage Data
          </h1>
          <p style={{ color: '#4a4a4a', marginTop: 16, fontSize: '1.1rem' }}>
            Supercharge your blockchain project with powerful, real-time analytics and visualizations.<br />
            See your chain’s growth, user engagement, and transaction trends at a glance.
          </p>
        </div>
        <ul style={{ textAlign: 'left', margin: '0 auto 24px auto', maxWidth: 400, color: '#333', fontSize: '1rem' }}>
          <li><b>Custom Dashboards:</b> Visualize API calls, user activity, and transaction metrics.</li>
          <li><b>Chain-Specific Insights:</b> Each customer sees only their chain’s data.</li>
          <li><b>Secure & Private:</b> Built with Supabase authentication and row-level security.</li>
          <li><b>Easy Integration:</b> No setup required—just log in and start exploring.</li>
        </ul>
        {!showInput ? (
          <button
            style={{ padding: '0.8rem 2.2rem', fontSize: '1.1rem', borderRadius: 8, background: '#2d2d2d', color: '#fff', border: 'none', cursor: 'pointer', marginTop: 12 }}
            onClick={handleGetStarted}
          >
            Get Started
          </button>
        ) : (
          <form onSubmit={handleSubmit} style={{ marginTop: 20 }}>
            <input
              type="password"
              placeholder="Enter chain name (e.g. ethereum)"
              value={password}
              onChange={e => setPassword(e.target.value)}
              style={{ padding: '0.7rem 1rem', fontSize: '1rem', borderRadius: 6, border: '1px solid #ccc', width: '70%', color: '#000' }}
            />
            <button
              type="submit"
              style={{ marginLeft: 10, padding: '0.7rem 1.5rem', fontSize: '1rem', borderRadius: 6, background: '#2d2d2d', color: '#fff', border: 'none', cursor: 'pointer' }}
            >
              Continue
            </button>
            {error && <div style={{ color: 'red', marginTop: 10 }}>{error}</div>}
          </form>
        )}
      </div>
      <footer style={{ marginTop: 40, color: '#888', fontSize: '0.95rem' }}>
        &copy; {new Date().getFullYear()} Alchemy Analytics. All rights reserved.
      </footer>
    </main>
  );
}