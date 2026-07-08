'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../lib/supabaseClient';

const statusLabel = { review: 'Listo para revisar', published: 'Publicado', rejected: 'Necesita nuevo archivo' };

export default function PanelPage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [products, setProducts] = useState([]);
  const [loadingSession, setLoadingSession] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);

  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [alto, setAlto] = useState('');
  const [ancho, setAncho] = useState('');
  const [fondo, setFondo] = useState('');
  const [file, setFile] = useState(null);
  const [formError, setFormError] = useState('');

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        router.push('/login');
        return;
      }
      setUser(session.user);
      setLoadingSession(false);
    });
  }, [router]);

  useEffect(() => {
    if (user) fetchProducts();
  }, [user]);

  async function fetchProducts() {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .order('created_at', { ascending: false });
    if (!error) setProducts(data);
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push('/login');
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setFormError('');

    if (!file) {
      setFormError('Subí un archivo .glb — es lo único que hace que el modelo sea real.');
      return;
    }

    setSaving(true);

    // 1. Subir el archivo .glb real al bucket "models"
    const path = `${user.id}/${crypto.randomUUID()}.glb`;
    const { error: uploadError } = await supabase.storage.from('models').upload(path, file);

    if (uploadError) {
      setFormError('Error subiendo el archivo: ' + uploadError.message);
      setSaving(false);
      return;
    }

    // 2. Obtener la URL pública del archivo recién subido
    const { data: publicUrlData } = supabase.storage.from('models').getPublicUrl(path);

    // 3. Insertar el producto en la base de datos
    const { error: insertError } = await supabase.from('products').insert({
      owner_id: user.id,
      name,
      price,
      alto: Number(alto),
      ancho: Number(ancho),
      fondo: Number(fondo),
      model_url: publicUrlData.publicUrl,
      is_real_model: true,
      status: 'review',
    });

    setSaving(false);

    if (insertError) {
      setFormError('Error guardando el producto: ' + insertError.message);
      return;
    }

    setName(''); setPrice(''); setAlto(''); setAncho(''); setFondo(''); setFile(null);
    setShowForm(false);
    fetchProducts();
  }

  async function setStatus(id, status) {
    await supabase.from('products').update({ status }).eq('id', id);
    fetchProducts();
  }

  async function deleteProduct(id) {
    if (!confirm('¿Borrar este producto?')) return;
    await supabase.from('products').delete().eq('id', id);
    fetchProducts();
  }

  if (loadingSession) return <main style={{ padding: 40 }}>Cargando…</main>;

  return (
    <main style={{ padding: '32px 5vw', maxWidth: 900 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 26 }}>
        <div>
          <div className="mono" style={{ fontSize: 12, color: '#8a8375' }}>ÉBANO · PANEL</div>
          <h1 style={{ fontFamily: "'Fraunces', serif", fontWeight: 500, fontSize: 26, marginTop: 4 }}>Productos</h1>
          <div style={{ fontSize: 12.5, color: '#8a8375', marginTop: 4 }}>{user?.email}</div>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button className="btn btn-ghost" onClick={handleLogout}>Salir</button>
          <button className="btn btn-primary" onClick={() => setShowForm(!showForm)}>
            {showForm ? 'Cancelar' : '+ Nuevo producto'}
          </button>
        </div>
      </div>

      {showForm && (
        <form
          onSubmit={handleSubmit}
          style={{ background: 'var(--card)', border: '1px solid var(--line)', borderRadius: 4, padding: 22, marginBottom: 26 }}
        >
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 14, marginBottom: 14 }}>
            <div>
              <label>Nombre</label>
              <input value={name} onChange={e => setName(e.target.value)} required />
            </div>
            <div>
              <label>Precio</label>
              <input value={price} onChange={e => setPrice(e.target.value)} placeholder="$ 210.000" required />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 14 }}>
            <div><label>Alto (cm)</label><input type="number" value={alto} onChange={e => setAlto(e.target.value)} required /></div>
            <div><label>Ancho (cm)</label><input type="number" value={ancho} onChange={e => setAncho(e.target.value)} required /></div>
            <div><label>Fondo (cm)</label><input type="number" value={fondo} onChange={e => setFondo(e.target.value)} required /></div>
          </div>

          <div style={{ marginBottom: 14 }}>
            <label>Archivo 3D (.glb) — obligatorio en esta versión</label>
            <input type="file" accept=".glb" onChange={e => setFile(e.target.files[0])} required />
            <div style={{ fontSize: 11.5, color: '#8a8375', marginTop: 6 }}>
              Si no tenés uno a mano para probar, bajá cualquiera de https://github.com/KhronosGroup/glTF-Sample-Assets
            </div>
          </div>

          {formError && <div style={{ fontSize: 12.5, color: '#8C3B2E', marginBottom: 12 }}>{formError}</div>}

          <button type="submit" className="btn btn-primary" disabled={saving}>
            {saving ? 'Subiendo…' : 'Guardar producto'}
          </button>
        </form>
      )}

      <div style={{ background: 'var(--card)', border: '1px solid var(--line)', borderRadius: 4, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr className="mono" style={{ fontSize: 11, textTransform: 'uppercase', color: '#8a8375' }}>
              <th style={th}>Producto</th><th style={th}>Medidas</th><th style={th}>Estado</th><th style={th}></th>
            </tr>
          </thead>
          <tbody>
            {products.map(p => (
              <tr key={p.id}>
                <td style={td}><strong>{p.name}</strong><div className="mono" style={{ fontSize: 11.5, color: '#8a8375' }}>{p.price}</div></td>
                <td style={td}><span className="mono" style={{ fontSize: 11.5, color: '#8a8375' }}>{p.alto} × {p.ancho} × {p.fondo} cm</span></td>
                <td style={td}><span className={`badge ${p.status}`}><span className="bd"></span>{statusLabel[p.status]}</span></td>
                <td style={{ ...td, display: 'flex', gap: 8 }}>
                  {p.status === 'review' && (
                    <>
                      <button className="btn btn-sage" style={{ padding: '6px 10px', fontSize: 11.5 }} onClick={() => setStatus(p.id, 'published')}>Aprobar</button>
                      <button className="btn btn-rust" style={{ padding: '6px 10px', fontSize: 11.5 }} onClick={() => setStatus(p.id, 'rejected')}>Rechazar</button>
                    </>
                  )}
                  <button className="btn btn-ghost" style={{ padding: '6px 10px', fontSize: 11.5 }} onClick={() => deleteProduct(p.id)}>Borrar</button>
                </td>
              </tr>
            ))}
            {products.length === 0 && (
              <tr><td style={td} colSpan={4}>Todavía no cargaste productos.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </main>
  );
}

const th = { textAlign: 'left', padding: '12px 16px', borderBottom: '1px solid var(--line)' };
const td = { padding: '12px 16px', borderBottom: '1px solid var(--line)', fontSize: 13.5, verticalAlign: 'middle' };
