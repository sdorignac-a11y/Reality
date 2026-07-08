'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { supabase } from '../../../lib/supabaseClient';

export default function ProductPage() {
  const { id } = useParams();
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase
      .from('products')
      .select('*')
      .eq('id', id)
      .eq('status', 'published')
      .single()
      .then(({ data }) => {
        setProduct(data);
        setLoading(false);
      });
  }, [id]);

  if (loading) return <main style={{ padding: '60px 6vw' }}>Cargando…</main>;
  if (!product) return <main style={{ padding: '60px 6vw' }}>Producto no encontrado (o todavía no está publicado).</main>;

  return (
    <main style={{ padding: '40px 6vw', maxWidth: 700 }}>
      <div style={{ fontFamily: "'Fraunces', serif", fontWeight: 500, fontSize: 26 }}>{product.name}</div>
      <div className="mono" style={{ fontSize: 15, color: 'var(--wood)', marginTop: 6 }}>{product.price}</div>
      <div className="mono" style={{ fontSize: 12, color: '#8a8375', marginTop: 6 }}>
        {product.alto} × {product.ancho} × {product.fondo} cm
      </div>

      <div style={{
        marginTop: 24, height: 380, borderRadius: 4, overflow: 'hidden',
        background: 'linear-gradient(var(--line) 1px,transparent 1px),linear-gradient(90deg,var(--line) 1px,transparent 1px),#fbfaf6',
        backgroundSize: '22px 22px',
      }}>
        {/* eslint-disable-next-line react/no-unknown-property */}
        <model-viewer
          src={product.model_url}
          camera-controls
          auto-rotate
          shadow-intensity="1"
          exposure="0.95"
          environment-image="neutral"
          camera-orbit="35deg 78deg 2.6m"
          ar
          ar-modes="webxr scene-viewer quick-look"
          style={{ width: '100%', height: '100%' }}
        >
          <button
            slot="ar-button"
            style={{ background: 'var(--wood)', color: '#fff', border: 'none', padding: '10px 18px', borderRadius: 3, fontWeight: 600, fontSize: 13, cursor: 'pointer' }}
          >
            Ver en tu espacio (AR)
          </button>
        </model-viewer>
      </div>

      <p style={{ fontSize: 11.5, color: '#8a8375', marginTop: 12 }}>
        Desde el celular, el botón abre la cámara real. Desde notebook solo se ve el modelo 3D interactivo.
      </p>
    </main>
  );
}
