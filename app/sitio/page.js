'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase } from '../../lib/supabaseClient';

export default function SitioPage() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase
      .from('products')
      .select('*')
      .eq('status', 'published')
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        setProducts(data || []);
        setLoading(false);
      });
  }, []);

  return (
    <main>
      <div style={{ padding: '24px 6vw', borderBottom: '1px solid var(--line)', display: 'flex', justifyContent: 'space-between' }}>
        <div style={{ fontFamily: "'Fraunces', serif", fontWeight: 600, fontSize: 20 }}>Éban<span style={{ color: 'var(--wood)' }}>o</span></div>
      </div>

      <div style={{ padding: '50px 6vw 20px' }}>
        <div className="mono" style={{ fontSize: 11.5, textTransform: 'uppercase', color: 'var(--steel)', marginBottom: 12 }}>
          Realidad aumentada · Escala real
        </div>
        <h1 style={{ fontFamily: "'Fraunces', serif", fontWeight: 500, fontSize: 34, maxWidth: '16ch' }}>
          Probalo en tu casa antes de comprarlo.
        </h1>
      </div>

      {loading && <div style={{ padding: '20px 6vw' }}>Cargando catálogo…</div>}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px,1fr))', gap: 20, padding: '20px 6vw 70px' }}>
        {products.map(p => (
          <Link key={p.id} href={`/sitio/${p.id}`}
            style={{ background: 'var(--card)', border: '1px solid var(--line)', borderRadius: 4, overflow: 'hidden', display: 'block' }}>
            <div style={{ height: 140, background: 'linear-gradient(135deg,#e4dcc9,#cfc4a9)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 34 }}>🪑</div>
            <div style={{ padding: 16 }}>
              <div style={{ fontWeight: 600, fontSize: 14 }}>{p.name}</div>
              <div className="mono" style={{ fontSize: 13, color: 'var(--wood)', marginTop: 4 }}>{p.price}</div>
              <div className="mono" style={{ fontSize: 11, color: '#8a8375', marginTop: 6 }}>{p.alto} × {p.ancho} × {p.fondo} cm</div>
            </div>
          </Link>
        ))}
        {!loading && products.length === 0 && (
          <div style={{ gridColumn: '1/-1', color: '#8a8375' }}>Todavía no hay productos publicados.</div>
        )}
      </div>
    </main>
  );
}
