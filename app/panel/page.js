'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Script from 'next/script';
import Link from 'next/link';
import { supabase } from '../../lib/supabaseClient';

const STORAGE_BUCKET = 'models';

const EMPTY_FORM = {
  name: '',
  price: '',
  slug: '',
  alto: '',
  ancho: '',
  fondo: '',
};

function formatPrice(value) {
  // El precio se guarda como texto libre (ej: "$ 355.000"), igual que en
  // el resto de la app (panel viejo, widget, /sitio). No se convierte a número.
  return value || '$ —';
}

function slugify(value) {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function getInitials(email = '') {
  const name = email.split('@')[0] || 'R';
  const parts = name.split(/[._-]/).filter(Boolean);
  return (parts[0]?.[0] || 'R').toUpperCase() + (parts[1]?.[0] || '').toUpperCase();
}

function ProductThumb({ product }) {
  if (product.image_url) {
    return <img src={product.image_url} alt="" />;
  }

  return (
    <svg viewBox="0 0 56 56" aria-hidden="true">
      <defs>
        <linearGradient id={`seat-${product.id}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#b9d8ff" />
          <stop offset="1" stopColor="#75a9ea" />
        </linearGradient>
      </defs>
      <rect width="56" height="56" rx="12" fill="#f2f7ff" />
      <ellipse cx="28" cy="44" rx="17" ry="3" fill="rgba(30,74,135,.12)" />
      <rect x="15" y="19" width="26" height="19" rx="7" fill={`url(#seat-${product.id})`} />
      <rect x="12" y="27" width="8" height="14" rx="4" fill="#7eade8" />
      <rect x="36" y="27" width="8" height="14" rx="4" fill="#7eade8" />
      <path d="M18 38h4l-1 7h-4zM34 38h4l1 7h-4z" fill="#b28f68" />
    </svg>
  );
}

export default function ProductosPage() {
  const fileInputRef = useRef(null);
  const accountRef = useRef(null);

  const [user, setUser] = useState(null);
  const [accountOpen, setAccountOpen] = useState(false);
  const [products, setProducts] = useState([]);
  const [form, setForm] = useState(EMPTY_FORM);
  const [file, setFile] = useState(null);
  const [editingProduct, setEditingProduct] = useState(null);
  const [slugTouched, setSlugTouched] = useState(false);

  const [sourceMode, setSourceMode] = useState('file'); // 'file' | 'photos'
  const [photoFiles, setPhotoFiles] = useState([]);
  const [generating, setGenerating] = useState(false);
  const [generationStatus, setGenerationStatus] = useState('');
  const [generatedModelUrl, setGeneratedModelUrl] = useState(null);
  const photoInputRef = useRef(null);
  const pollingRef = useRef(null);

  const [loadingProducts, setLoadingProducts] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [installationOpen, setInstallationOpen] = useState(false);

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const [toast, setToast] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);

  const filteredProducts = useMemo(() => {
    const normalized = search.trim().toLowerCase();

    return products.filter((product) => {
      const matchesSearch =
        !normalized ||
        product.name?.toLowerCase().includes(normalized) ||
        product.slug?.toLowerCase().includes(normalized);

      const matchesStatus =
        statusFilter === 'all' || product.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [products, search, statusFilter]);

  useEffect(() => {
    loadInitialData();
  }, []);

  useEffect(() => {
    if (window.lucide) window.lucide.createIcons();
  }, [
    products,
    editingProduct,
    installationOpen,
    loadingProducts,
    statusFilter,
    confirmDelete,
  ]);

  useEffect(() => {
    function handleOutsideClick(event) {
      if (accountRef.current && !accountRef.current.contains(event.target)) {
        setAccountOpen(false);
      }
    }
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  useEffect(() => {
    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, []);

  function showToast(title, message, type = 'success') {
    setToast({ title, message, type });
    window.clearTimeout(window.__realityToastTimer);
    window.__realityToastTimer = window.setTimeout(() => setToast(null), 3400);
  }

  async function loadInitialData() {
    setLoadingProducts(true);

    const [{ data: authData }, { data, error }] = await Promise.all([
      supabase.auth.getUser(),
      supabase
        .from('products')
        .select('*')
        .order('created_at', { ascending: false }),
    ]);

    setUser(authData?.user || null);

    if (error) {
      showToast(
        'No pudimos cargar los productos',
        'Revisá la conexión con Supabase e intentá nuevamente.',
        'error'
      );
    } else {
      setProducts(data || []);
    }

    setLoadingProducts(false);
  }

  function updateField(field, value) {
    setForm((current) => {
      const next = { ...current, [field]: value };

      if (field === 'name' && !slugTouched) {
        next.slug = slugify(value);
      }

      return next;
    });
  }

  function selectFile(selectedFile) {
    if (!selectedFile) return;

    if (!selectedFile.name.toLowerCase().endsWith('.glb')) {
      showToast(
        'Formato no compatible',
        'En esta versión solamente se pueden cargar archivos .glb.',
        'error'
      );
      return;
    }

    if (selectedFile.size > 50 * 1024 * 1024) {
      showToast(
        'El archivo es demasiado pesado',
        'El tamaño máximo permitido es de 50 MB.',
        'error'
      );
      return;
    }

    setFile(selectedFile);
  }

  function handleDrop(event) {
    event.preventDefault();
    setDragging(false);
    selectFile(event.dataTransfer.files?.[0]);
  }

  function resetForm() {
    setForm(EMPTY_FORM);
    setFile(null);
    setEditingProduct(null);
    setSlugTouched(false);
    setSourceMode('file');
    setPhotoFiles([]);
    setGeneratedModelUrl(null);
    setGenerationStatus('');
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    if (photoInputRef.current) {
      photoInputRef.current.value = '';
    }
  }

  function startEditing(product) {
    setEditingProduct(product);
    setForm({
      name: product.name || '',
      price: product.price || '',
      slug: product.slug || '',
      alto: product.alto || '',
      ancho: product.ancho || '',
      fondo: product.fondo || '',
    });
    setFile(null);
    setSlugTouched(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  async function uploadModel(selectedFile) {
    const extension = selectedFile.name.split('.').pop().toLowerCase();
    const userFolder = user?.id || 'public';
    const filePath = `${userFolder}/${crypto.randomUUID()}.${extension}`;

    const { error: uploadError } = await supabase.storage
      .from(STORAGE_BUCKET)
      .upload(filePath, selectedFile, {
        cacheControl: '3600',
        upsert: false,
        contentType: 'model/gltf-binary',
      });

    if (uploadError) throw uploadError;

    const { data } = supabase.storage
      .from(STORAGE_BUCKET)
      .getPublicUrl(filePath);

    return data.publicUrl;
  }

  async function handleGeneratePhotos() {
    if (photoFiles.length < 2) {
      showToast(
        'Faltan fotos',
        'Subí al menos 2 fotos del mueble, desde ángulos distintos.',
        'error'
      );
      return;
    }

    setGenerating(true);
    setGeneratedModelUrl(null);
    setGenerationStatus('Subiendo fotos…');

    const uploadedPaths = [];

    try {
      const userFolder = user?.id || 'public';
      const imageUrls = [];

      for (const photo of photoFiles) {
        const path = `${userFolder}/photos/${crypto.randomUUID()}-${photo.name}`;
        const { error: uploadError } = await supabase.storage
          .from(STORAGE_BUCKET)
          .upload(path, photo, { cacheControl: '3600', upsert: false });

        if (uploadError) throw uploadError;

        uploadedPaths.push(path);
        // La anotamos en la "lista de pendientes de borrar" — si algo falla
        // a mitad de camino, la limpieza diaria la va a encontrar igual.
        supabase.from('pending_photo_cleanup').insert({ path }).then(() => {});

        const { data } = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(path);
        imageUrls.push(data.publicUrl);
      }

      setGenerationStatus('Iniciando generación 3D…');

      const { data: { session } } = await supabase.auth.getSession();
      const authHeader = session?.access_token ? `Bearer ${session.access_token}` : '';

      const startRes = await fetch('/api/photo-to-3d', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: authHeader },
        body: JSON.stringify({ imageUrls }),
      });
      const startData = await startRes.json();

      if (startData.error || !startData.requestId) {
        throw new Error(startData.error || 'No se pudo iniciar la generación');
      }

      setGenerationStatus('Generando el modelo 3D… esto puede tardar unos minutos');

      pollingRef.current = setInterval(async () => {
        try {
          const statusRes = await fetch(
            `/api/photo-to-3d/status?request_id=${startData.requestId}`,
            { headers: { Authorization: authHeader } }
          );
          const statusData = await statusRes.json();

          if (statusData.error) {
            clearInterval(pollingRef.current);
            pollingRef.current = null;
            setGenerating(false);
            setGenerationStatus('');
            showToast('No se pudo generar el modelo', statusData.error, 'error');
            cleanupPhotos(uploadedPaths);
            return;
          }

          if (statusData.status === 'COMPLETED') {
            clearInterval(pollingRef.current);
            pollingRef.current = null;
            setGenerating(false);
            setGenerationStatus('');
            setGeneratedModelUrl(statusData.modelUrl);
            showToast('Modelo generado', 'El modelo 3D está listo — ya podés guardar el producto.');
            // Ya generamos el modelo, no necesitamos más las fotos originales
            cleanupPhotos(uploadedPaths);
          }
        } catch {
          // seguimos intentando en el próximo intervalo
        }
      }, 4000);
    } catch (error) {
      setGenerating(false);
      setGenerationStatus('');
      showToast(
        'No pudimos generar el modelo',
        error?.message || 'Intentá nuevamente.',
        'error'
      );
      cleanupPhotos(uploadedPaths);
    }
  }

  function cleanupPhotos(paths) {
    if (!paths.length) return;
    supabase.storage.from(STORAGE_BUCKET).remove(paths).catch(() => {});
    supabase.from('pending_photo_cleanup').delete().in('path', paths).then(() => {});
  }

  async function handleSubmit(event) {
    event.preventDefault();

    if (!form.name.trim() || !form.slug.trim()) {
      showToast(
        'Faltan datos',
        'Completá el nombre y el slug del producto.',
        'error'
      );
      return;
    }

    if (!editingProduct && !file && !generatedModelUrl) {
      showToast(
        'Falta el modelo 3D',
        'Seleccioná un archivo .glb o generá el modelo desde fotos.',
        'error'
      );
      return;
    }

    setSaving(true);

    try {
      let modelUrl = editingProduct?.model_url || '';

      if (sourceMode === 'photos' && generatedModelUrl) {
        modelUrl = generatedModelUrl;
      } else if (file) {
        modelUrl = await uploadModel(file);
      }

      const payload = {
        name: form.name.trim(),
        price: form.price.trim().startsWith('$') ? form.price.trim() : `$ ${form.price.trim()}`,
        slug: form.slug.trim(),
        alto: Number(form.alto || 0),
        ancho: Number(form.ancho || 0),
        fondo: Number(form.fondo || 0),
        model_url: modelUrl,
        status: editingProduct?.status || 'published',
      };

      if (editingProduct) {
        const { data, error } = await supabase
          .from('products')
          .update(payload)
          .eq('id', editingProduct.id)
          .select()
          .single();

        if (error) throw error;

        setProducts((current) =>
          current.map((product) =>
            product.id === editingProduct.id ? data : product
          )
        );

        showToast(
          'Producto actualizado',
          `${data.name} se actualizó correctamente.`
        );
      } else {
        const { data, error } = await supabase
          .from('products')
          .insert(payload)
          .select()
          .single();

        if (error) throw error;

        setProducts((current) => [data, ...current]);

        showToast(
          'Producto publicado',
          `${data.name} ya está disponible en el catálogo.`
        );
      }

      resetForm();
    } catch (error) {
      console.error(error);
      showToast(
        'No pudimos guardar el producto',
        error?.message || 'Revisá la configuración de Supabase.',
        'error'
      );
    } finally {
      setSaving(false);
    }
  }

  async function toggleStatus(product) {
    const nextStatus =
      product.status === 'published' ? 'draft' : 'published';

    const { data, error } = await supabase
      .from('products')
      .update({ status: nextStatus })
      .eq('id', product.id)
      .select()
      .single();

    if (error) {
      showToast(
        'No pudimos cambiar el estado',
        'Intentá nuevamente.',
        'error'
      );
      return;
    }

    setProducts((current) =>
      current.map((item) => (item.id === product.id ? data : item))
    );

    showToast(
      nextStatus === 'published' ? 'Producto publicado' : 'Producto pausado',
      `${product.name} cambió de estado correctamente.`
    );
  }

  async function deleteProduct(product) {
    const { error } = await supabase
      .from('products')
      .delete()
      .eq('id', product.id);

    if (error) {
      showToast(
        'No pudimos borrar el producto',
        'Intentá nuevamente.',
        'error'
      );
      return;
    }

    setProducts((current) =>
      current.filter((item) => item.id !== product.id)
    );
    setConfirmDelete(null);

    if (editingProduct?.id === product.id) {
      resetForm();
    }

    showToast(
      'Producto eliminado',
      `${product.name} se eliminó del catálogo.`
    );
  }

  async function handleSignOut() {
    await supabase.auth.signOut();
    window.location.href = '/login';
  }

  return (
    <>
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
      <link
        href="https://fonts.googleapis.com/css2?family=Baloo+2:wght@500;600;700;800&family=Nunito:wght@400;500;600;700;800;900&display=swap"
        rel="stylesheet"
      />
      <Script
        src="https://unpkg.com/lucide@0.468.0/dist/umd/lucide.js"
        strategy="afterInteractive"
        onLoad={() => window.lucide?.createIcons()}
      />
      <Script
        type="module"
        src="https://ajax.googleapis.com/ajax/libs/model-viewer/3.5.0/model-viewer.min.js"
        strategy="afterInteractive"
      />

      <main className="products-page">
        <header className="topbar">
          <Link className="brand" href="/">
            <span className="brand-mark">
              <i data-lucide="armchair"></i>
            </span>
            <span>Reality</span>
          </Link>

          <div className="topbar-actions">
            <button className="notification-button" type="button" aria-label="Notificaciones">
              <i data-lucide="bell"></i>
              <span>3</span>
            </button>

            <div className="account-wrap" ref={accountRef}>
              <button
                className="account-trigger"
                type="button"
                onClick={() => setAccountOpen((current) => !current)}
                aria-expanded={accountOpen}
                aria-label="Cuenta"
              >
                {getInitials(user?.email)}
              </button>

              {accountOpen && (
                <div className="account-dropdown">
                  <div className="account-dropdown-info">
                    <span className="account-dropdown-avatar">{getInitials(user?.email)}</span>
                    <div>
                      <strong>{user?.email || 'Tu cuenta'}</strong>
                      <small>Administrador</small>
                    </div>
                  </div>
                  <button
                    className="account-dropdown-logout"
                    type="button"
                    onClick={() => {
                      setAccountOpen(false);
                      handleSignOut();
                    }}
                  >
                    <i data-lucide="log-out"></i>
                    Cerrar sesión
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        <div className="page-shell">
          <section className="page-heading">
            <div>
              <span className="heading-kicker">Catálogo 3D</span>
              <h1>Productos</h1>
              <p>
                Cargá, revisá y administrá los muebles que tus clientes pueden
                probar en realidad aumentada.
              </p>
            </div>

            <div className="heading-stat">
              <span className="stat-icon">
                <i data-lucide="package-check"></i>
              </span>
              <span>
                <strong>{products.length}</strong>
                productos registrados
              </span>
            </div>
          </section>

          <section className={`installation-card ${installationOpen ? 'open' : ''}`}>
            <button
              type="button"
              onClick={() => setInstallationOpen((current) => !current)}
            >
              <span className="installation-title">
                <span className="info-icon">
                  <i data-lucide="info"></i>
                </span>
                Instalación en el sitio del cliente
                <small>Se hace una sola vez</small>
              </span>

              <i data-lucide="chevron-down"></i>
            </button>

            {installationOpen && (
              <div className="installation-content">
                <div>
                  <strong>1. Copiá el código</strong>
                  <p>
                    Pegalo antes del cierre de la etiqueta
                    <code>&lt;/body&gt;</code> del sitio del cliente. Este código ya
                    tiene tu ID de mueblería incluido — no lo compartas con otra
                    mueblería, cada una necesita el suyo propio.
                  </p>
                </div>

                <pre>
{`<script src="https://cutzstudio.vercel.app/widget.js"></script>
<div data-ebano-auto data-store="${user?.id || 'TU-ID-DE-MUEBLERIA'}"></div>`}
                </pre>

                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(
`<script src="https://cutzstudio.vercel.app/widget.js"></script>\n<div data-ebano-auto data-store="${user?.id || 'TU-ID-DE-MUEBLERIA'}"></div>`
                    );
                    showToast('Código copiado', 'Ya podés pegarlo en el sitio del cliente.');
                  }}
                >
                  <i data-lucide="copy"></i>
                  Copiar código
                </button>
              </div>
            )}
          </section>

          <section className="editor-grid">
            <form className="product-form-card" onSubmit={handleSubmit}>
              <div className="card-title-row">
                <span className="card-title-icon">
                  <i data-lucide={editingProduct ? 'pencil' : 'shopping-bag'}></i>
                </span>

                <div>
                  <h2>
                    {editingProduct
                      ? `Editando ${editingProduct.name}`
                      : 'Agregar nuevo producto'}
                  </h2>
                  <p>
                    Completá la información y cargá el archivo 3D correspondiente.
                  </p>
                </div>

                {editingProduct && (
                  <button
                    className="cancel-edit-button"
                    type="button"
                    onClick={resetForm}
                  >
                    <i data-lucide="x"></i>
                    Cancelar edición
                  </button>
                )}
              </div>

              <div className="form-grid top-fields">
                <label className="field field-name">
                  <span>Nombre</span>
                  <div className="input-control">
                    <i data-lucide="tag"></i>
                    <input
                      type="text"
                      placeholder="Ej: Sillón Estocolmo"
                      value={form.name}
                      onChange={(event) =>
                        updateField('name', event.target.value)
                      }
                      required
                    />
                  </div>
                </label>

                <label className="field field-price">
                  <span>Precio</span>
                  <div className="input-control">
                    <span className="currency-prefix">$</span>
                    <input
                      type="text"
                      inputMode="numeric"
                      placeholder="Ej: 210.000"
                      value={form.price}
                      onChange={(event) =>
                        updateField('price', event.target.value)
                      }
                    />
                  </div>
                </label>
              </div>

              <label className="field slug-field">
                <span>
                  Slug
                  <small>
                    Tiene que ser igual al de la URL del producto
                  </small>
                </span>

                <div className="input-control">
                  <i data-lucide="link-2"></i>
                  <input
                    type="text"
                    placeholder="Ej: sillon-estocolmo"
                    value={form.slug}
                    onChange={(event) => {
                      setSlugTouched(true);
                      updateField('slug', slugify(event.target.value));
                    }}
                    required
                  />
                </div>

                <p className="field-help">
                  Si la ficha del producto es
                  <code> /productos/{form.slug || 'sillon-estocolmo'}</code>,
                  el slug tiene que ser exactamente ese.
                </p>
              </label>

              <div className="form-grid measurements-grid">
                {[
                  ['alto', 'Alto', 'move-vertical', '80'],
                  ['ancho', 'Ancho', 'move-horizontal', '60'],
                  ['fondo', 'Fondo', 'move-horizontal', '75'],
                ].map(([key, label, icon, placeholder]) => (
                  <label className="field" key={key}>
                    <span>{label} (cm)</span>
                    <div className="input-control">
                      <i data-lucide={icon}></i>
                      <input
                        type="number"
                        min="0"
                        placeholder={`Ej: ${placeholder}`}
                        value={form[key]}
                        onChange={(event) =>
                          updateField(key, event.target.value)
                        }
                      />
                    </div>
                  </label>
                ))}
              </div>

              <div className="field file-field">
                <span>Cómo cargar el modelo 3D</span>

                <div className="source-toggle">
                  <button
                    type="button"
                    className={sourceMode === 'file' ? 'active' : ''}
                    onClick={() => setSourceMode('file')}
                  >
                    <i data-lucide="upload"></i>
                    Ya tengo el archivo .glb
                  </button>
                  <button
                    type="button"
                    className={sourceMode === 'photos' ? 'active' : ''}
                    onClick={() => setSourceMode('photos')}
                  >
                    <i data-lucide="sparkles"></i>
                    Generar desde fotos (IA)
                  </button>
                </div>

                {sourceMode === 'file' ? (
                  <>
                    <button
                      className={`drop-zone ${dragging ? 'dragging' : ''} ${file ? 'has-file' : ''}`}
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      onDragOver={(event) => {
                        event.preventDefault();
                        setDragging(true);
                      }}
                      onDragLeave={() => setDragging(false)}
                      onDrop={handleDrop}
                    >
                      <span className="upload-icon">
                        <i data-lucide={file ? 'badge-check' : 'cloud-upload'}></i>
                      </span>

                      <span className="drop-copy">
                        <strong>
                          {file
                            ? file.name
                            : editingProduct?.model_url
                              ? 'Modelo 3D actual cargado'
                              : 'Arrastrá y soltá tu archivo .glb aquí'}
                        </strong>
                        <small>
                          {file
                            ? `${(file.size / 1024 / 1024).toFixed(2)} MB`
                            : 'o hacé clic para seleccionar'}
                        </small>
                      </span>
                    </button>

                    <input
                      ref={fileInputRef}
                      className="hidden-file-input"
                      type="file"
                      accept=".glb,model/gltf-binary"
                      onChange={(event) =>
                        selectFile(event.target.files?.[0])
                      }
                    />

                    <p className="upload-help">
                      Recomendamos archivos .glb optimizados. Tamaño máximo: 50 MB.
                    </p>
                  </>
                ) : (
                  <>
                    <button
                      className={`drop-zone ${photoFiles.length ? 'has-file' : ''}`}
                      type="button"
                      onClick={() => photoInputRef.current?.click()}
                    >
                      <span className="upload-icon">
                        <i data-lucide={generatedModelUrl ? 'badge-check' : 'images'}></i>
                      </span>
                      <span className="drop-copy">
                        <strong>
                          {photoFiles.length
                            ? `${photoFiles.length} foto(s) seleccionada(s)`
                            : 'Subí 2 a 4 fotos del mueble'}
                        </strong>
                        <small>Desde ángulos distintos: frente, costado, atrás</small>
                      </span>
                    </button>

                    <input
                      ref={photoInputRef}
                      className="hidden-file-input"
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={(event) =>
                        setPhotoFiles(Array.from(event.target.files || []).slice(0, 4))
                      }
                    />

                    <button
                      type="button"
                      className="generate-button"
                      onClick={handleGeneratePhotos}
                      disabled={generating || photoFiles.length < 2}
                    >
                      <i data-lucide="sparkles"></i>
                      {generating ? (generationStatus || 'Generando…') : 'Generar modelo 3D'}
                    </button>

                    {generatedModelUrl && !generating && (
                      <p className="generate-success">
                        <i data-lucide="check-circle-2"></i>
                        Modelo generado — ya podés guardar el producto.
                      </p>
                    )}

                    <p className="upload-help">
                      La generación con IA es una aproximación — revisá el resultado antes de publicar.
                    </p>
                  </>
                )}
              </div>

              <div className="form-actions">
                <button
                  className="save-button"
                  type="submit"
                  disabled={saving}
                >
                  <i data-lucide={editingProduct ? 'save' : 'package-plus'}></i>
                  {saving
                    ? 'Guardando…'
                    : editingProduct
                      ? 'Guardar cambios'
                      : 'Guardar producto'}
                </button>
              </div>
            </form>
          </section>

          <section className="products-table-card">
            <div className="table-card-header">
              <div>
                <h2>
                  Productos registrados
                  <span>{products.length}</span>
                </h2>
                <p>Administrá el catálogo publicado en Reality.</p>
              </div>

              <div className="table-tools">
                <label className="search-control">
                  <i data-lucide="search"></i>
                  <input
                    type="search"
                    placeholder="Buscar productos..."
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                  />
                </label>

                <label className="filter-control">
                  <i data-lucide="list-filter"></i>
                  <select
                    value={statusFilter}
                    onChange={(event) =>
                      setStatusFilter(event.target.value)
                    }
                  >
                    <option value="all">Todos</option>
                    <option value="published">Publicados</option>
                    <option value="draft">Pausados</option>
                  </select>
                </label>
              </div>
            </div>

            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Producto</th>
                    <th>Slug</th>
                    <th>Medidas</th>
                    <th>Estado</th>
                    <th>Acciones</th>
                  </tr>
                </thead>

                <tbody>
                  {loadingProducts && (
                    <tr>
                      <td colSpan="5">
                        <div className="empty-table-state">
                          <span className="spinner" />
                          Cargando productos…
                        </div>
                      </td>
                    </tr>
                  )}

                  {!loadingProducts && filteredProducts.length === 0 && (
                    <tr>
                      <td colSpan="5">
                        <div className="empty-table-state">
                          <span className="empty-state-icon">
                            <i data-lucide="package-open"></i>
                          </span>
                          <strong>No encontramos productos</strong>
                          <small>
                            Probá con otra búsqueda o cargá uno nuevo.
                          </small>
                        </div>
                      </td>
                    </tr>
                  )}

                  {!loadingProducts &&
                    filteredProducts.map((product) => (
                      <tr key={product.id}>
                        <td>
                          <div className="product-cell">
                            <span className="product-thumbnail">
                              <ProductThumb product={product} />
                            </span>

                            <span>
                              <strong>{product.name}</strong>
                              <small>{formatPrice(product.price)}</small>
                            </span>
                          </div>
                        </td>

                        <td>
                          <span className="slug-value">
                            {product.slug}
                          </span>
                        </td>

                        <td>
                          <span className="measure-value">
                            {product.ancho || 0} × {product.fondo || 0} ×{' '}
                            {product.alto || 0} cm
                          </span>
                        </td>

                        <td>
                          <button
                            className={`status-badge ${product.status === 'published' ? 'published' : 'draft'}`}
                            type="button"
                            onClick={() => toggleStatus(product)}
                          >
                            <span />
                            {product.status === 'published'
                              ? 'Publicado'
                              : 'Pausado'}
                          </button>
                        </td>

                        <td>
                          <div className="row-actions">
                            <button
                              className="edit-button"
                              type="button"
                              onClick={() => startEditing(product)}
                            >
                              <i data-lucide="pencil"></i>
                              Editar
                            </button>

                            <button
                              className="delete-button"
                              type="button"
                              onClick={() => setConfirmDelete(product)}
                            >
                              <i data-lucide="trash-2"></i>
                              Borrar
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>

            <div className="table-footer">
              <span>
                Mostrando {filteredProducts.length} de {products.length}{' '}
                productos
              </span>
            </div>
          </section>
        </div>

        {confirmDelete && (
          <div className="modal-backdrop" onMouseDown={() => setConfirmDelete(null)}>
            <div className="delete-modal" onMouseDown={(event) => event.stopPropagation()}>
              <span className="delete-modal-icon">
                <i data-lucide="trash-2"></i>
              </span>

              <h3>¿Eliminar {confirmDelete.name}?</h3>
              <p>
                El producto dejará de estar disponible en el catálogo y esta
                acción no se puede deshacer.
              </p>

              <div>
                <button type="button" onClick={() => setConfirmDelete(null)}>
                  Cancelar
                </button>
                <button
                  className="confirm-delete-button"
                  type="button"
                  onClick={() => deleteProduct(confirmDelete)}
                >
                  Sí, eliminar
                </button>
              </div>
            </div>
          </div>
        )}

        {toast && (
          <div className={`toast ${toast.type === 'error' ? 'error' : ''}`}>
            <span>
              <i data-lucide={toast.type === 'error' ? 'circle-alert' : 'badge-check'}></i>
            </span>
            <div>
              <strong>{toast.title}</strong>
              <p>{toast.message}</p>
            </div>
          </div>
        )}
      </main>

      <style>{`
        :root {
          --blue-950: #0c2f6a;
          --blue-900: #143b82;
          --blue-800: #1454be;
          --blue-700: #1269ed;
          --blue-600: #2d82f6;
          --blue-500: #599cff;
          --blue-200: #d9eaff;
          --blue-100: #edf6ff;
          --blue-50: #f7fbff;
          --navy: #142f67;
          --text: #50678f;
          --muted: #8694ad;
          --white: #ffffff;
          --border: #dce6f3;
          --success: #1a9b56;
          --success-soft: #e5f6eb;
          --danger: #ef4a59;
          --danger-soft: #fff0f2;
          --shadow-sm: 0 8px 25px rgba(36, 83, 151, 0.07);
          --shadow-md: 0 18px 48px rgba(38, 87, 160, 0.11);
          --shadow-lg: 0 30px 80px rgba(28, 73, 144, 0.18);
          --container: min(1240px, calc(100% - 40px));
        }

        * {
          box-sizing: border-box;
        }

        html,
        body {
          margin: 0;
          min-height: 100%;
        }

        body {
          font-family: "Nunito", sans-serif;
          color: var(--text);
          background: #f8fbff;
        }

        button,
        input,
        select {
          font: inherit;
        }

        button,
        a,
        select {
          -webkit-tap-highlight-color: transparent;
        }

        a {
          color: inherit;
          text-decoration: none;
        }

        button {
          cursor: pointer;
        }

        .products-page {
          min-height: 100vh;
          background:
            radial-gradient(circle at 12% 0%, rgba(192, 222, 255, 0.58), transparent 22%),
            radial-gradient(circle at 91% 10%, rgba(204, 228, 255, 0.55), transparent 23%),
            linear-gradient(180deg, #f8fbff 0%, #f4f9ff 48%, #ffffff 100%);
        }

        .topbar {
          position: sticky;
          z-index: 100;
          top: 0;
          min-height: 76px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 24px;
          padding: 11px max(24px, calc((100vw - 1240px) / 2));
          border-bottom: 1px solid rgba(31, 101, 209, 0.09);
          background: rgba(255, 255, 255, 0.82);
          box-shadow: 0 8px 30px rgba(33, 76, 143, 0.055);
          backdrop-filter: blur(20px);
        }

        .brand {
          display: flex;
          align-items: center;
          gap: 10px;
          color: var(--blue-700);
          font-family: "Baloo 2", sans-serif;
          font-size: 1.72rem;
          font-weight: 800;
          line-height: 1;
        }

        .brand-mark {
          width: 42px;
          height: 42px;
          display: grid;
          place-items: center;
          padding: 8px;
          border: 2px solid currentColor;
          border-radius: 13px;
          background: var(--white);
          box-shadow: inset 0 0 0 4px var(--blue-100);
        }

        .brand-mark i {
          width: 100%;
          height: 100%;
        }

        .topbar-actions {
          display: flex;
          align-items: center;
          gap: 14px;
        }

        .notification-button {
          position: relative;
          width: 42px;
          height: 42px;
          display: grid;
          place-items: center;
          border: 1px solid var(--border);
          border-radius: 14px;
          color: #65799c;
          background: rgba(255, 255, 255, 0.9);
          box-shadow: var(--shadow-sm);
        }

        .notification-button i {
          width: 19px;
          height: 19px;
        }

        .notification-button span {
          position: absolute;
          top: -4px;
          right: -4px;
          width: 19px;
          height: 19px;
          display: grid;
          place-items: center;
          border: 2px solid var(--white);
          border-radius: 50%;
          color: var(--white);
          background: var(--blue-700);
          font-size: 0.63rem;
          font-weight: 900;
        }

        .account-wrap {
          position: relative;
        }

        .account-trigger {
          width: 41px;
          height: 41px;
          display: grid;
          place-items: center;
          border: 0;
          border-radius: 50%;
          cursor: pointer;
          color: var(--white);
          background: linear-gradient(145deg, var(--blue-600), #0a5ee6);
          box-shadow: 0 8px 18px rgba(29, 105, 227, 0.22);
          font-size: 0.77rem;
          font-weight: 900;
          transition: transform 0.15s ease, box-shadow 0.15s ease;
        }

        .account-trigger:hover {
          transform: translateY(-1px);
          box-shadow: 0 11px 22px rgba(29, 105, 227, 0.3);
        }

        .account-dropdown {
          position: absolute;
          z-index: 40;
          top: calc(100% + 12px);
          right: 0;
          width: 260px;
          padding: 14px;
          border: 1px solid var(--border);
          border-radius: 18px;
          background: var(--white);
          box-shadow: 0 20px 46px rgba(23, 58, 112, 0.16);
        }

        .account-dropdown-info {
          display: flex;
          align-items: center;
          gap: 11px;
          padding-bottom: 13px;
          margin-bottom: 11px;
          border-bottom: 1px solid var(--border);
        }

        .account-dropdown-avatar {
          width: 38px;
          height: 38px;
          flex: 0 0 auto;
          display: grid;
          place-items: center;
          border-radius: 50%;
          color: var(--white);
          background: linear-gradient(145deg, var(--blue-600), #0a5ee6);
          font-size: 0.73rem;
          font-weight: 900;
        }

        .account-dropdown-info strong {
          display: block;
          overflow: hidden;
          color: var(--navy);
          font-size: 0.78rem;
          text-overflow: ellipsis;
          white-space: nowrap;
          max-width: 175px;
        }

        .account-dropdown-info small {
          color: var(--muted);
          font-size: 0.7rem;
          font-weight: 700;
        }

        .account-dropdown-logout {
          width: 100%;
          min-height: 40px;
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 0 12px;
          border: 1px solid var(--border);
          border-radius: 12px;
          color: #65799c;
          background: var(--white);
          font-size: 0.78rem;
          font-weight: 850;
          cursor: pointer;
        }

        .account-dropdown-logout i {
          width: 16px;
          height: 16px;
        }

        .account-dropdown-logout:hover {
          color: var(--danger);
          border-color: #f3c7cd;
          background: #fff5f6;
        }

        .page-shell {
          width: var(--container);
          margin-inline: auto;
          padding: 42px 0 70px;
        }

        .page-heading {
          display: flex;
          align-items: flex-end;
          justify-content: space-between;
          gap: 32px;
          margin-bottom: 28px;
        }

        .heading-kicker {
          display: inline-flex;
          margin-bottom: 7px;
          color: var(--blue-700);
          font-size: 0.75rem;
          font-weight: 900;
          letter-spacing: 0.08em;
          text-transform: uppercase;
        }

        .page-heading h1 {
          margin: 0 0 6px;
          color: var(--navy);
          font-family: "Baloo 2", sans-serif;
          font-size: clamp(2.7rem, 5vw, 4.15rem);
          font-weight: 800;
          line-height: 0.92;
          letter-spacing: -0.035em;
        }

        .page-heading p {
          max-width: 680px;
          margin: 0;
          color: var(--muted);
          font-size: 0.96rem;
        }

        .heading-stat {
          min-width: 205px;
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 13px 16px;
          border: 1px solid rgba(37, 112, 224, 0.11);
          border-radius: 18px;
          background: rgba(255, 255, 255, 0.76);
          box-shadow: var(--shadow-sm);
          backdrop-filter: blur(14px);
        }

        .stat-icon {
          width: 42px;
          height: 42px;
          display: grid;
          place-items: center;
          border-radius: 14px;
          color: var(--blue-700);
          background: var(--blue-100);
        }

        .stat-icon i {
          width: 21px;
          height: 21px;
        }

        .heading-stat > span:last-child {
          display: grid;
          color: var(--muted);
          font-size: 0.73rem;
          font-weight: 800;
        }

        .heading-stat strong {
          color: var(--navy);
          font-size: 1.15rem;
          line-height: 1;
        }

        .installation-card {
          overflow: hidden;
          margin-bottom: 23px;
          border: 1px solid #bdd6fa;
          border-radius: 17px;
          background: rgba(247, 251, 255, 0.88);
          box-shadow: var(--shadow-sm);
        }

        .installation-card > button {
          width: 100%;
          min-height: 58px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 20px;
          padding: 0 20px;
          border: 0;
          color: var(--blue-700);
          background: transparent;
          font-weight: 900;
          text-align: left;
        }

        .installation-card > button > i {
          width: 18px;
          height: 18px;
          transition: transform 0.2s ease;
        }

        .installation-card.open > button > i {
          transform: rotate(180deg);
        }

        .installation-title {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .installation-title small {
          color: #6d83a8;
          font-size: 0.72rem;
          font-weight: 750;
        }

        .info-icon {
          width: 28px;
          height: 28px;
          display: grid;
          place-items: center;
          border-radius: 9px;
          color: var(--blue-700);
          background: var(--white);
          box-shadow: var(--shadow-sm);
        }

        .info-icon i {
          width: 15px;
          height: 15px;
        }

        .installation-content {
          display: grid;
          grid-template-columns: 1fr 1.3fr auto;
          align-items: center;
          gap: 20px;
          padding: 18px 20px 20px;
          border-top: 1px solid rgba(44, 114, 220, 0.09);
          background: rgba(255, 255, 255, 0.7);
        }

        .installation-content strong {
          color: var(--navy);
          font-size: 0.88rem;
        }

        .installation-content p {
          margin: 4px 0 0;
          color: var(--muted);
          font-size: 0.77rem;
        }

        .installation-content code {
          margin-left: 4px;
          color: var(--blue-700);
        }

        .installation-content pre {
          overflow-x: auto;
          margin: 0;
          padding: 12px 14px;
          border-radius: 12px;
          color: #ddecff;
          background: #16396c;
          font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
          font-size: 0.7rem;
          line-height: 1.5;
        }

        .installation-content > button {
          min-height: 42px;
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 0 15px;
          border: 0;
          border-radius: 12px;
          color: var(--white);
          background: var(--blue-700);
          font-size: 0.76rem;
          font-weight: 900;
          box-shadow: 0 10px 20px rgba(28, 103, 226, 0.22);
        }

        .installation-content > button i {
          width: 15px;
          height: 15px;
        }

        .editor-grid {
          display: grid;
          grid-template-columns: 1fr;
          gap: 22px;
          align-items: stretch;
          margin-bottom: 23px;
        }

        .product-form-card,
        .products-table-card {
          border: 1px solid rgba(39, 110, 216, 0.1);
          border-radius: 22px;
          background: rgba(255, 255, 255, 0.88);
          box-shadow: var(--shadow-md);
          backdrop-filter: blur(18px);
        }

        .product-form-card {
          padding: 25px 26px 22px;
        }

        .card-title-row {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-bottom: 23px;
        }

        .card-title-row h2 {
          margin: 0 0 3px;
          color: var(--navy);
          font-family: "Baloo 2", sans-serif;
          font-size: 1.35rem;
          font-weight: 800;
          line-height: 1;
        }

        .card-title-row p {
          margin: 0;
          color: var(--muted);
          font-size: 0.74rem;
        }

        .card-title-icon {
          width: 38px;
          height: 38px;
          display: grid;
          place-items: center;
          flex: 0 0 auto;
          border-radius: 13px;
          color: var(--blue-700);
          background: var(--blue-100);
          box-shadow: inset 0 0 0 1px rgba(37, 111, 221, 0.08);
        }

        .card-title-icon i {
          width: 19px;
          height: 19px;
        }

        .cancel-edit-button {
          min-height: 36px;
          display: inline-flex;
          align-items: center;
          gap: 6px;
          margin-left: auto;
          padding: 0 11px;
          border: 1px solid #dce6f3;
          border-radius: 10px;
          color: #7183a0;
          background: var(--white);
          font-size: 0.68rem;
          font-weight: 850;
        }

        .cancel-edit-button i {
          width: 14px;
          height: 14px;
        }

        .form-grid {
          display: grid;
          gap: 14px;
        }

        .top-fields {
          grid-template-columns: 1.55fr 0.85fr;
        }

        .measurements-grid {
          grid-template-columns: repeat(3, minmax(0, 1fr));
          margin-top: 16px;
        }

        .field {
          display: grid;
          gap: 7px;
        }

        .field > span {
          display: flex;
          align-items: baseline;
          gap: 7px;
          color: #304f82;
          font-size: 0.74rem;
          font-weight: 900;
        }

        .field > span small {
          color: var(--muted);
          font-size: 0.62rem;
          font-weight: 700;
        }

        .input-control {
          position: relative;
        }

        .input-control > i {
          position: absolute;
          top: 50%;
          left: 13px;
          width: 16px;
          height: 16px;
          color: #8496b5;
          transform: translateY(-50%);
          pointer-events: none;
        }

        .input-control input {
          width: 100%;
          height: 43px;
          padding: 0 13px 0 39px;
          border: 1px solid #d7e2f1;
          border-radius: 10px;
          outline: none;
          color: var(--navy);
          background: rgba(255, 255, 255, 0.95);
          font-size: 0.78rem;
          font-weight: 700;
          transition:
            border-color 0.2s ease,
            box-shadow 0.2s ease;
        }

        .input-control input::placeholder {
          color: #a2afc3;
          font-weight: 600;
        }

        .input-control input:focus {
          border-color: #75aef8;
          box-shadow: 0 0 0 4px rgba(45, 124, 242, 0.09);
        }

        .currency-prefix {
          position: absolute;
          top: 50%;
          left: 13px;
          width: 16px;
          color: #8292ac;
          font-size: 0.85rem;
          font-weight: 800;
          text-align: center;
          transform: translateY(-50%);
        }

        .slug-field {
          margin-top: 16px;
        }

        .field-help {
          margin: -1px 0 0;
          color: var(--muted);
          font-size: 0.66rem;
        }

        .field-help code {
          color: var(--blue-700);
          font-family: inherit;
          font-weight: 800;
        }

        .file-field {
          margin-top: 17px;
        }

        .drop-zone {
          width: 100%;
          min-height: 82px;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 13px;
          padding: 14px 18px;
          border: 1.5px dashed #82b1f7;
          border-radius: 14px;
          color: var(--blue-700);
          background:
            linear-gradient(135deg, rgba(245, 250, 255, 0.96), rgba(252, 254, 255, 0.9));
          transition:
            border-color 0.2s ease,
            background 0.2s ease,
            transform 0.2s ease;
        }

        .drop-zone:hover,
        .drop-zone.dragging {
          border-color: var(--blue-700);
          background: var(--blue-100);
          transform: translateY(-1px);
        }

        .drop-zone.has-file {
          border-color: #45b978;
          background: #f3fcf7;
        }

        .upload-icon {
          width: 46px;
          height: 46px;
          display: grid;
          place-items: center;
          border-radius: 50%;
          color: var(--blue-700);
          background: rgba(226, 240, 255, 0.92);
        }

        .drop-zone.has-file .upload-icon {
          color: var(--success);
          background: var(--success-soft);
        }

        .upload-icon i {
          width: 24px;
          height: 24px;
        }

        .drop-copy {
          display: grid;
          text-align: left;
        }

        .drop-copy strong {
          color: var(--blue-700);
          font-size: 0.78rem;
          font-weight: 900;
        }

        .drop-zone.has-file .drop-copy strong {
          color: #18834a;
        }

        .drop-copy small {
          color: var(--muted);
          font-size: 0.66rem;
          font-weight: 700;
        }

        .hidden-file-input {
          display: none;
        }

        .upload-help {
          margin: -1px 0 0;
          color: var(--muted);
          font-size: 0.62rem;
          text-align: center;
        }

        .source-toggle {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 8px;
          margin-bottom: 10px;
        }

        .source-toggle button {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 7px;
          min-height: 40px;
          padding: 0 10px;
          border: 1px solid #d7e2f1;
          border-radius: 11px;
          color: #627598;
          background: var(--white);
          font-size: 0.72rem;
          font-weight: 850;
          cursor: pointer;
        }

        .source-toggle button i {
          width: 14px;
          height: 14px;
        }

        .source-toggle button.active {
          border-color: var(--blue-600);
          color: var(--blue-700);
          background: var(--blue-50);
        }

        .generate-button {
          width: 100%;
          min-height: 44px;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          margin-top: 10px;
          border: 0;
          border-radius: 12px;
          color: var(--white);
          background: linear-gradient(180deg, #3189f8, #1067ed);
          font-size: 0.78rem;
          font-weight: 900;
          cursor: pointer;
        }

        .generate-button:disabled {
          cursor: default;
          opacity: 0.55;
        }

        .generate-button i {
          width: 15px;
          height: 15px;
        }

        .generate-success {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          margin: 10px 0 0;
          color: #18834a;
          font-size: 0.7rem;
          font-weight: 850;
        }

        .generate-success i {
          width: 14px;
          height: 14px;
        }

        .form-actions {
          display: flex;
          justify-content: center;
          margin-top: 18px;
        }

        .save-button {
          min-width: 230px;
          min-height: 45px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 9px;
          padding: 0 24px;
          border: 0;
          border-radius: 13px;
          color: var(--white);
          background: linear-gradient(180deg, #3189f8, #1067ed);
          box-shadow: 0 13px 24px rgba(29, 108, 231, 0.26);
          font-size: 0.8rem;
          font-weight: 900;
          transition:
            transform 0.2s ease,
            box-shadow 0.2s ease,
            opacity 0.2s ease;
        }

        .save-button:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 17px 30px rgba(29, 108, 231, 0.32);
        }

        .save-button:disabled {
          cursor: wait;
          opacity: 0.7;
        }

        .save-button i {
          width: 17px;
          height: 17px;
        }

        .products-table-card {
          overflow: hidden;
        }

        .table-card-header {
          min-height: 74px;
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          justify-content: space-between;
          gap: 14px 20px;
          padding: 16px 20px;
        }

        .table-card-header h2 {
          display: flex;
          align-items: center;
          gap: 9px;
          margin: 0 0 3px;
          color: var(--navy);
          font-family: "Baloo 2", sans-serif;
          font-size: 1.22rem;
          font-weight: 800;
          line-height: 1;
        }

        .table-card-header h2 span {
          min-width: 25px;
          height: 25px;
          display: inline-grid;
          place-items: center;
          border-radius: 50%;
          color: var(--blue-700);
          background: var(--blue-100);
          font-family: "Nunito", sans-serif;
          font-size: 0.68rem;
          font-weight: 900;
        }

        .table-card-header p {
          margin: 0;
          color: var(--muted);
          font-size: 0.69rem;
        }

        .table-tools {
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          gap: 10px;
        }

        .search-control,
        .filter-control {
          position: relative;
          display: flex;
          align-items: center;
        }

        .search-control > i,
        .filter-control > i {
          position: absolute;
          left: 12px;
          width: 15px;
          height: 15px;
          color: #8291aa;
          pointer-events: none;
        }

        .search-control input {
          width: 255px;
          height: 39px;
          padding: 0 14px 0 38px;
          border: 1px solid #dce5f2;
          border-radius: 12px;
          outline: none;
          color: var(--navy);
          background: var(--white);
          font-size: 0.73rem;
        }

        .filter-control select {
          height: 39px;
          padding: 0 30px 0 36px;
          border: 1px solid #dce5f2;
          border-radius: 12px;
          outline: none;
          color: #627598;
          background: var(--white);
          font-size: 0.73rem;
          font-weight: 850;
        }

        .table-wrap {
          overflow-x: auto;
          margin: 0 18px;
          border: 1px solid #dce5f1;
          border-radius: 14px;
        }

        table {
          width: 100%;
          min-width: 920px;
          border-collapse: collapse;
          background: rgba(255, 255, 255, 0.75);
        }

        th {
          height: 40px;
          padding: 0 15px;
          color: #61769b;
          background: #f8fbff;
          font-size: 0.66rem;
          font-weight: 900;
          text-align: left;
        }

        td {
          height: 63px;
          padding: 7px 15px;
          border-top: 1px solid #e5ecf5;
          color: #687b9a;
          font-size: 0.72rem;
          font-weight: 700;
        }

        .product-cell {
          display: flex;
          align-items: center;
          gap: 11px;
        }

        .product-thumbnail {
          width: 45px;
          height: 45px;
          display: grid;
          place-items: center;
          overflow: hidden;
          flex: 0 0 auto;
          border-radius: 10px;
          background: var(--blue-50);
        }

        .product-thumbnail img,
        .product-thumbnail svg {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .product-cell > span:last-child {
          display: grid;
          gap: 2px;
        }

        .product-cell strong {
          color: var(--navy);
          font-size: 0.78rem;
        }

        .product-cell small {
          color: #8492a9;
          font-size: 0.65rem;
        }

        .slug-value,
        .measure-value {
          color: #7788a4;
          font-size: 0.68rem;
        }

        .status-badge {
          min-height: 28px;
          display: inline-flex;
          align-items: center;
          gap: 7px;
          padding: 0 11px;
          border: 0;
          border-radius: 999px;
          font-size: 0.66rem;
          font-weight: 850;
        }

        .status-badge span {
          width: 7px;
          height: 7px;
          border-radius: 50%;
        }

        .status-badge.published {
          color: #21864f;
          background: var(--success-soft);
        }

        .status-badge.published span {
          background: #24a55d;
        }

        .status-badge.draft {
          color: #8a6b26;
          background: #fff6dd;
        }

        .status-badge.draft span {
          background: #e0a928;
        }

        .row-actions {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .row-actions button {
          min-height: 32px;
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 0 12px;
          border-radius: 9px;
          background: var(--white);
          font-size: 0.67rem;
          font-weight: 850;
        }

        .row-actions i {
          width: 14px;
          height: 14px;
        }

        .edit-button {
          border: 1px solid #dbe5f2;
          color: #526a91;
        }

        .edit-button:hover {
          color: var(--blue-700);
          border-color: #b9d3f9;
          background: var(--blue-50);
        }

        .delete-button {
          border: 1px solid #ffd3d9;
          color: var(--danger);
        }

        .delete-button:hover {
          background: var(--danger-soft);
        }

        .empty-table-state {
          min-height: 170px;
          display: grid;
          place-items: center;
          align-content: center;
          gap: 8px;
          color: var(--muted);
          text-align: center;
        }

        .empty-table-state strong {
          color: var(--navy);
        }

        .empty-table-state small {
          font-size: 0.67rem;
        }

        .empty-state-icon {
          width: 48px;
          height: 48px;
          display: grid;
          place-items: center;
          border-radius: 15px;
          color: var(--blue-700);
          background: var(--blue-100);
        }

        .empty-state-icon i {
          width: 25px;
          height: 25px;
        }

        .spinner {
          width: 27px;
          height: 27px;
          border: 3px solid #dceaff;
          border-top-color: var(--blue-700);
          border-radius: 50%;
          animation: spin 0.75s linear infinite;
        }

        .table-footer {
          min-height: 48px;
          display: flex;
          align-items: center;
          justify-content: flex-end;
          padding: 0 21px;
          color: var(--muted);
          font-size: 0.65rem;
          font-weight: 700;
        }

        .modal-backdrop {
          position: fixed;
          z-index: 500;
          inset: 0;
          display: grid;
          place-items: center;
          padding: 20px;
          background: rgba(11, 35, 72, 0.5);
          backdrop-filter: blur(9px);
        }

        .delete-modal {
          width: min(420px, 100%);
          padding: 27px;
          border-radius: 22px;
          background: var(--white);
          box-shadow: var(--shadow-lg);
          text-align: center;
        }

        .delete-modal-icon {
          width: 58px;
          height: 58px;
          display: grid;
          place-items: center;
          margin: 0 auto 15px;
          border-radius: 18px;
          color: var(--danger);
          background: var(--danger-soft);
        }

        .delete-modal-icon i {
          width: 27px;
          height: 27px;
        }

        .delete-modal h3 {
          margin: 0 0 8px;
          color: var(--navy);
          font-family: "Baloo 2", sans-serif;
          font-size: 1.55rem;
          line-height: 1;
        }

        .delete-modal p {
          margin: 0 auto 20px;
          color: var(--muted);
          font-size: 0.77rem;
        }

        .delete-modal > div {
          display: flex;
          justify-content: center;
          gap: 9px;
        }

        .delete-modal button {
          min-height: 41px;
          padding: 0 17px;
          border: 1px solid #dbe5f2;
          border-radius: 11px;
          color: #657795;
          background: var(--white);
          font-size: 0.75rem;
          font-weight: 850;
        }

        .delete-modal .confirm-delete-button {
          border-color: var(--danger);
          color: var(--white);
          background: var(--danger);
        }

        .toast {
          position: fixed;
          z-index: 700;
          right: 24px;
          bottom: 24px;
          max-width: min(380px, calc(100% - 48px));
          display: flex;
          align-items: flex-start;
          gap: 11px;
          padding: 15px 17px;
          border: 1px solid rgba(37, 111, 220, 0.13);
          border-radius: 16px;
          background: rgba(255, 255, 255, 0.96);
          box-shadow: var(--shadow-lg);
          backdrop-filter: blur(14px);
          animation: toastIn 0.22s ease both;
        }

        .toast > span {
          width: 34px;
          height: 34px;
          display: grid;
          place-items: center;
          flex: 0 0 auto;
          border-radius: 11px;
          color: var(--success);
          background: var(--success-soft);
        }

        .toast.error > span {
          color: var(--danger);
          background: var(--danger-soft);
        }

        .toast i {
          width: 18px;
          height: 18px;
        }

        .toast strong {
          display: block;
          color: var(--navy);
          font-size: 0.8rem;
        }

        .toast p {
          margin: 2px 0 0;
          color: var(--muted);
          font-size: 0.69rem;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        @keyframes toastIn {
          from {
            opacity: 0;
            transform: translateY(12px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @media (max-width: 1040px) {
          .installation-content {
            grid-template-columns: 1fr;
          }

          .installation-content > button {
            width: max-content;
          }
        }

        @media (max-width: 780px) {
          :root {
            --container: min(100% - 22px, 1240px);
          }

          .topbar {
            padding-inline: 13px;
          }

          .user-copy {
            display: none;
          }

          .logout-button {
            width: 41px;
            padding: 0;
            justify-content: center;
          }

          .logout-button {
            font-size: 0;
          }

          .page-shell {
            padding-top: 28px;
          }

          .page-heading {
            align-items: flex-start;
          }

          .heading-stat {
            display: none;
          }

          .page-heading h1 {
            font-size: 3rem;
          }

          .top-fields,
          .measurements-grid {
            grid-template-columns: 1fr;
          }

          .table-card-header {
            align-items: stretch;
            flex-direction: column;
          }

          .table-tools {
            width: 100%;
          }

          .search-control {
            flex: 1;
          }

          .search-control input {
            width: 100%;
          }
        }

        @media (max-width: 520px) {
          .brand {
            font-size: 1.42rem;
          }

          .brand-mark {
            width: 38px;
            height: 38px;
          }

          .notification-button {
            display: none;
          }

          .product-form-card {
            padding: 20px 16px;
            border-radius: 18px;
          }

          .card-title-row {
            align-items: flex-start;
          }

          .cancel-edit-button {
            width: 37px;
            min-width: 37px;
            padding: 0;
            justify-content: center;
            font-size: 0;
          }

          .drop-zone {
            justify-content: flex-start;
          }

          .save-button {
            width: 100%;
            min-width: 0;
          }

          .table-tools {
            flex-direction: column;
          }

          .search-control,
          .filter-control,
          .filter-control select {
            width: 100%;
          }

          .installation-title {
            align-items: flex-start;
            flex-wrap: wrap;
          }

          .installation-title small {
            width: 100%;
            padding-left: 38px;
            margin-top: -6px;
          }
        }
      `}</style>
    </>
  );
}
