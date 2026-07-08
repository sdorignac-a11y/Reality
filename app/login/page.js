'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../lib/supabaseClient';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [mode, setMode] = useState('signin'); // 'signin' | 'signup'
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);

    const action = mode === 'signin'
      ? supabase.auth.signInWithPassword({ email, password })
      : supabase.auth.signUp({ email, password });

    const { error } = await action;
    setLoading(false);

    if (error) {
      setError(error.message);
      return;
    }

    if (mode === 'signup') {
      setError('Cuenta creada. Si tu proyecto de Supabase pide confirmación por email, revisá tu correo antes de entrar.');
      return;
    }

    router.push('/panel');
  }

  return (
    <main style={{ padding: '80px 6vw', maxWidth: 380 }}>
      <div className="mono" style={{ fontSize: 12, color: '#8a8375', marginBottom: 14 }}>
        ÉBANO · PANEL
      </div>
      <h1 style={{ fontFamily: "'Fraunces', serif", fontWeight: 500, fontSize: 26, marginBottom: 24 }}>
        {mode === 'signin' ? 'Ingresar' : 'Crear cuenta'}
      </h1>

      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: 14 }}>
          <label>Email</label>
          <input type="email" value={email} onChange={e => setEmail(e.target.value)} required />
        </div>
        <div style={{ marginBottom: 18 }}>
          <label>Contraseña</label>
          <input type="password" value={password} onChange={e => setPassword(e.target.value)} required minLength={6} />
        </div>

        {error && (
          <div style={{ fontSize: 12.5, color: '#8C3B2E', marginBottom: 14 }}>{error}</div>
        )}

        <button type="submit" className="btn btn-primary" style={{ width: '100%' }} disabled={loading}>
          {loading ? 'Un momento…' : mode === 'signin' ? 'Ingresar' : 'Crear cuenta'}
        </button>
      </form>

      <button
        className="btn btn-ghost"
        style={{ width: '100%', marginTop: 10 }}
        onClick={() => { setMode(mode === 'signin' ? 'signup' : 'signin'); setError(''); }}
      >
        {mode === 'signin' ? '¿No tenés cuenta? Creá una' : 'Ya tengo cuenta'}
      </button>
    </main>
  );
}
