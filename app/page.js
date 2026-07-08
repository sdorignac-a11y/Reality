import Link from 'next/link';

export default function Home() {
  return (
    <main style={{ padding: '80px 6vw', maxWidth: 640 }}>
      <div className="mono" style={{ fontSize: 12, color: '#8a8375', marginBottom: 14 }}>
        ÉBANO · PLATAFORMA AR
      </div>
      <h1 style={{ fontFamily: "'Fraunces', serif", fontWeight: 500, fontSize: 34, marginBottom: 18 }}>
        Elegí qué ver
      </h1>
      <div style={{ display: 'flex', gap: 12, marginTop: 20 }}>
        <Link href="/panel" className="btn btn-primary">Panel (mueblería)</Link>
        <Link href="/sitio" className="btn btn-ghost">Sitio público</Link>
      </div>
    </main>
  );
}
