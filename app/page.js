'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import Script from 'next/script';
import { supabase } from '../lib/supabaseClient';

// Corrige la escala del modelo 3D para que coincida con las medidas reales
// cargadas en el producto — mismo criterio que en el widget y en /sitio.
function applyRealScale(modelViewer, alto, ancho, fondo) {
  function doScale() {
    try {
      const dims = modelViewer.getDimensions();
      const current = modelViewer.scale || { x: 1, y: 1, z: 1 };

      const baseX = dims.x / (current.x || 1);
      const baseY = dims.y / (current.y || 1);
      const baseZ = dims.z / (current.z || 1);

      const targetX = (Number(ancho) || 0) / 100;
      const targetY = (Number(alto) || 0) / 100;
      const targetZ = (Number(fondo) || 0) / 100;

      const scaleX = baseX > 0 && targetX > 0 ? targetX / baseX : 1;
      const scaleY = baseY > 0 && targetY > 0 ? targetY / baseY : 1;
      const scaleZ = baseZ > 0 && targetZ > 0 ? targetZ / baseZ : 1;

      if (![scaleX, scaleY, scaleZ].every((n) => isFinite(n) && n > 0)) return;

      modelViewer.setAttribute('scale', `${scaleX} ${scaleY} ${scaleZ}`);
    } catch (e) {
      // si algo falla, dejamos el modelo con su escala original
    }
  }

  modelViewer.addEventListener('load', doScale);
  if (modelViewer.loaded) doScale();

  return () => modelViewer.removeEventListener('load', doScale);
}

function placeMeasurementAnchors(viewer, product) {
  if (!viewer || !product) return;

  try {
    const dims = viewer.getDimensions();
    const center = viewer.getBoundingBoxCenter();

    const hx = dims.x / 2;
    const hy = dims.y / 2;
    const hz = dims.z / 2;

    const points = {
      'hotspot-alto-top': `${center.x - hx} ${center.y + hy} ${center.z + hz}`,
      'hotspot-alto-bottom': `${center.x - hx} ${center.y - hy} ${center.z + hz}`,
      'hotspot-ancho-left': `${center.x - hx} ${center.y + hy} ${center.z + hz}`,
      'hotspot-ancho-right': `${center.x + hx} ${center.y + hy} ${center.z + hz}`,
      'hotspot-fondo-near': `${center.x + hx} ${center.y + hy} ${center.z + hz}`,
      'hotspot-fondo-far': `${center.x + hx} ${center.y + hy} ${center.z - hz}`,
    };

    Object.keys(points).forEach((name) => {
      const el = viewer.querySelector(`[slot="${name}"]`);
      if (el) el.setAttribute('data-position', points[name]);
      if (viewer.updateHotspot) viewer.updateHotspot({ name, position: points[name] });
    });

    viewer._dimValues = {
      alto: `${product.alto} cm`,
      ancho: `${product.ancho} cm`,
      fondo: `${product.fondo} cm`,
    };
  } catch (e) {
    // si algo falla, no se muestran las medidas sobre el modelo
  }
}

function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g, (c) => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
  ));
}

function drawDimensionLines(svg, viewer) {
  if (!svg || !viewer.queryHotspot || !viewer._dimValues) return;

  const rect = viewer.getBoundingClientRect();
  svg.setAttribute('viewBox', `0 0 ${rect.width} ${rect.height}`);

  function point(name) {
    const hs = viewer.queryHotspot(name);
    return hs && hs.canvasPosition ? hs.canvasPosition : null;
  }

  function dimensionLine(fromName, toName, label) {
    const a = point(fromName);
    const b = point(toName);
    if (!a || !b) return '';

    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const len = Math.sqrt(dx * dx + dy * dy) || 1;
    const px = (-dy / len) * 6;
    const py = (dx / len) * 6;

    const midX = (a.x + b.x) / 2;
    const midY = (a.y + b.y) / 2;
    const labelWidth = label.length * 6.2 + 14;

    return (
      `<line x1="${a.x}" y1="${a.y}" x2="${b.x}" y2="${b.y}"></line>` +
      `<line class="dim-tick" x1="${a.x - px}" y1="${a.y - py}" x2="${a.x + px}" y2="${a.y + py}"></line>` +
      `<line class="dim-tick" x1="${b.x - px}" y1="${b.y - py}" x2="${b.x + px}" y2="${b.y + py}"></line>` +
      `<rect class="dim-label-bg" x="${midX - labelWidth / 2}" y="${midY - 10}" width="${labelWidth}" height="20" rx="10"></rect>` +
      `<text x="${midX}" y="${midY + 4}" text-anchor="middle">${escapeHtml(label)}</text>`
    );
  }

  svg.innerHTML =
    dimensionLine('hotspot-alto-top', 'hotspot-alto-bottom', viewer._dimValues.alto) +
    dimensionLine('hotspot-ancho-left', 'hotspot-ancho-right', viewer._dimValues.ancho) +
    dimensionLine('hotspot-fondo-near', 'hotspot-fondo-far', viewer._dimValues.fondo);
}

export default function HomePage() {
  const [products, setProducts] = useState([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [showingDims, setShowingDims] = useState(false);
  const selected = products[selectedIndex] || null;
  const demoViewerRef = useRef(null);
  const demoSvgRef = useRef(null);

  // Traer el catálogo real publicado
  useEffect(() => {
    supabase
      .from('products')
      .select('*')
      .eq('status', 'published')
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        if (data) setProducts(data);
      });
  }, []);

  useEffect(() => {
    if (!selected || !demoViewerRef.current) return;
    return applyRealScale(demoViewerRef.current, selected.alto, selected.ancho, selected.fondo);
  }, [selected]);

  useEffect(() => {
    setShowingDims(false);
  }, [selectedIndex]);

  useEffect(() => {
    const viewer = demoViewerRef.current;
    const svg = demoSvgRef.current;
    if (!viewer || !svg) return;

    if (!showingDims) {
      svg.innerHTML = '';
      return;
    }

    placeMeasurementAnchors(viewer, selected);
    const redraw = () => drawDimensionLines(svg, viewer);
    viewer.addEventListener('camera-change', redraw);
    redraw();

    return () => viewer.removeEventListener('camera-change', redraw);
  }, [showingDims, selected]);

  // Re-generar íconos cada vez que aparece contenido nuevo en el DOM
  useEffect(() => {
    if (window.lucide) window.lucide.createIcons();
  }, [products, selectedIndex]);

  useEffect(() => {
    document.title = 'Reality — Probá los muebles en tu casa';

    if (window.lucide) window.lucide.createIcons();

    const menuButton = document.getElementById('menuButton');
    const navLinks = document.getElementById('navLinks');

    function handleMenuClick() {
      const isOpen = navLinks.classList.toggle('open');
      menuButton.setAttribute('aria-expanded', String(isOpen));
      menuButton.innerHTML = isOpen ? '<i data-lucide="x"></i>' : '<i data-lucide="menu"></i>';
      window.lucide.createIcons();
    }
    menuButton.addEventListener('click', handleMenuClick);

    const navLinkEls = navLinks.querySelectorAll('a');
    function closeMenu() {
      navLinks.classList.remove('open');
      menuButton.setAttribute('aria-expanded', 'false');
      menuButton.innerHTML = '<i data-lucide="menu"></i>';
      window.lucide.createIcons();
    }
    navLinkEls.forEach((link) => link.addEventListener('click', closeMenu));

    const revealObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('visible');
            revealObserver.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.14 }
    );
    document.querySelectorAll('.reveal').forEach((el) => revealObserver.observe(el));

    const pilotForm = document.getElementById('pilotForm');
    async function handlePilotSubmit(event) {
      event.preventDefault();

      const businessName = document.getElementById('businessName').value.trim();
      const contactEmail = document.getElementById('contactEmail').value.trim();
      const website = document.getElementById('website').value.trim();

      const submitButton = event.currentTarget.querySelector('button[type="submit"]');
      const originalLabel = submitButton.innerHTML;
      submitButton.disabled = true;
      submitButton.textContent = 'Enviando…';

      try {
        const res = await fetch('/api/pilot-lead', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ businessName, contactEmail, website }),
        });
        const data = await res.json();

        if (!res.ok || data.error) {
          throw new Error(data.error || 'No se pudo enviar');
        }

        showToast('Solicitud enviada', `${businessName || 'Tu mueblería'} quedó registrada para la prueba piloto.`);
        event.currentTarget.reset();
      } catch (err) {
        showToast('No se pudo enviar', 'Revisá los datos e intentá de nuevo en un momento.');
      } finally {
        submitButton.disabled = false;
        submitButton.innerHTML = originalLabel;
      }
    }
    pilotForm.addEventListener('submit', handlePilotSubmit);

    const toast = document.getElementById('toast');
    const toastTitle = document.getElementById('toastTitle');
    const toastMessage = document.getElementById('toastMessage');
    let toastTimer;
    function showToast(title, message) {
      clearTimeout(toastTimer);
      toastTitle.textContent = title;
      toastMessage.textContent = message;
      toast.classList.add('show');
      toastTimer = setTimeout(() => {
        toast.classList.remove('show');
      }, 3400);
    }

    return () => {
      menuButton.removeEventListener('click', handleMenuClick);
      navLinkEls.forEach((link) => link.removeEventListener('click', closeMenu));
    };
  }, []);

  return (
    <>
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
      <link
        href="https://fonts.googleapis.com/css2?family=Baloo+2:wght@500;600;700;800&family=Nunito:wght@400;500;600;700;800;900&display=swap"
        rel="stylesheet"
      />
      <Script src="https://unpkg.com/lucide@0.468.0/dist/umd/lucide.js" strategy="beforeInteractive" />

      <style>{`
        :root {
          --blue-900: #143c82;
          --blue-800: #174fbd;
          --blue-700: #1769e8;
          --blue-600: #2d7cf2;
          --blue-500: #4b91ff;
          --blue-300: #a8ccff;
          --blue-200: #d8eaff;
          --blue-100: #edf6ff;
          --blue-50: #f7fbff;
          --navy: #173568;
          --text: #4b6086;
          --muted: #7384a2;
          --white: #ffffff;
          --danger: #ff6a7a;
          --shadow-sm: 0 8px 24px rgba(40, 92, 175, 0.08);
          --shadow-md: 0 18px 48px rgba(40, 92, 175, 0.12);
          --shadow-lg: 0 30px 80px rgba(29, 82, 168, 0.17);
          --radius-xl: 38px;
          --container: min(1040px, calc(100% - 32px));
        }
        * { box-sizing: border-box; }
        html { scroll-behavior: smooth; scroll-padding-top: 100px; }
        body {
          margin: 0;
          color: var(--text);
          background:
            radial-gradient(circle at 12% 5%, rgba(141, 194, 255, 0.22), transparent 20%),
            radial-gradient(circle at 92% 11%, rgba(203, 227, 255, 0.52), transparent 18%),
            linear-gradient(180deg, #fbfdff 0%, #f4f9ff 48%, #ffffff 100%);
          font-family: "Nunito", sans-serif;
          line-height: 1.55;
          overflow-x: hidden;
        }
        img, svg { display: block; max-width: 100%; }
        button, input, textarea { font: inherit; }
        button, a { -webkit-tap-highlight-color: transparent; }
        a { color: inherit; text-decoration: none; }
        h1, h2, h3, h4, p { margin-top: 0; }
        h1, h2, h3, h4, .brand {
          font-family: "Baloo 2", sans-serif;
          color: var(--navy);
          line-height: 1.02;
          letter-spacing: -0.025em;
        }
        .container { width: var(--container); margin-inline: auto; }
        .section { padding: 56px 0; }
        .section-card {
          width: var(--container);
          margin-inline: auto;
          padding: 36px;
          border: 1px solid rgba(44, 116, 229, 0.1);
          border-radius: var(--radius-xl);
          background: rgba(255, 255, 255, 0.9);
          box-shadow: var(--shadow-md);
          backdrop-filter: blur(18px);
        }
        .section-heading { max-width: 640px; margin: 0 auto 30px; text-align: center; }
        .section-heading h2 { margin-bottom: 10px; font-size: clamp(1.7rem, 3vw, 2.4rem); font-weight: 800; }
        .section-heading p { margin-bottom: 0; font-size: 0.96rem; color: var(--muted); }
        .eyebrow {
          display: inline-flex; align-items: center; gap: 6px; margin-bottom: 14px;
          padding: 7px 12px; border: 1px solid rgba(43, 121, 239, 0.12); border-radius: 999px;
          background: rgba(255, 255, 255, 0.92); color: var(--blue-700);
          font-size: 0.78rem; font-weight: 900; box-shadow: var(--shadow-sm);
        }
        .eyebrow i { width: 14px; height: 14px; }
        .btn {
          min-height: 44px; display: inline-flex; align-items: center; justify-content: center;
          gap: 8px; padding: 0 18px; border: 0; border-radius: 13px; cursor: pointer; font-weight: 900;
          font-size: 0.88rem;
          transition: transform 0.2s ease, box-shadow 0.2s ease, background 0.2s ease;
        }
        .btn:hover { transform: translateY(-2px); }
        .btn-primary {
          color: var(--white); background: linear-gradient(135deg, var(--blue-600), #0f5fe6);
          box-shadow: 0 10px 22px rgba(29, 108, 232, 0.28);
        }
        .btn-primary:hover { box-shadow: 0 14px 28px rgba(29, 108, 232, 0.34); }
        .btn-secondary {
          color: var(--blue-700); background: rgba(255, 255, 255, 0.95);
          border: 1px solid rgba(49, 126, 235, 0.14); box-shadow: var(--shadow-sm);
        }
        .btn-small { min-height: 38px; padding: 0 15px; border-radius: 11px; font-size: 0.82rem; }
        .btn i { width: 15px; height: 15px; }
        .navbar-shell { position: sticky; z-index: 1000; top: 0; padding: 12px 0 0; pointer-events: none; }
        .navbar {
          width: var(--container); min-height: 58px; margin-inline: auto; display: flex;
          align-items: center; justify-content: space-between; gap: 20px; padding: 8px 10px 8px 15px;
          border: 1px solid rgba(32, 112, 232, 0.1); border-radius: 18px; background: rgba(255, 255, 255, 0.83);
          box-shadow: 0 12px 36px rgba(42, 91, 161, 0.09); backdrop-filter: blur(20px); pointer-events: auto;
        }
        .logo { display: flex; align-items: center; gap: 8px; flex: 0 0 auto; }
        .logo-mark {
          width: 34px; height: 34px; display: grid; place-items: center; border: 2px solid var(--blue-600);
          border-radius: 10px; color: var(--blue-600); background: var(--white); box-shadow: inset 0 0 0 3px var(--blue-100);
        }
        .logo-mark i { width: 18px; height: 18px; stroke-width: 2.4; }
        .brand { font-size: 1.32rem; font-weight: 800; color: var(--blue-700); }
        .nav-links { display: flex; align-items: center; justify-content: center; gap: 20px; font-size: 0.82rem; font-weight: 900; color: var(--navy); }
        .nav-links a { transition: color 0.2s ease; }
        .nav-links a:hover { color: var(--blue-700); }
        .menu-button {
          display: none; width: 38px; height: 38px; place-items: center; border: 0;
          border-radius: 11px; background: var(--blue-100); color: var(--blue-700); cursor: pointer;
        }
        .hero { position: relative; min-height: 540px; display: flex; align-items: center; padding: 56px 0 70px; isolation: isolate; }
        .hero::before {
          content: ""; position: absolute; z-index: -2; inset: 0;
          background: radial-gradient(circle at 50% 40%, rgba(255, 255, 255, 0.96) 0 23%, rgba(255, 255, 255, 0.3) 52%, transparent 70%);
        }
        .hero::after {
          content: ""; position: absolute; z-index: -1; top: 23%; left: 50%; width: 520px; height: 520px;
          border-radius: 50%; background: rgba(183, 216, 255, 0.18); filter: blur(18px); transform: translateX(-50%);
        }
        .hero-content { position: relative; z-index: 4; max-width: 660px; margin: 0 auto; text-align: center; }
        .hero h1 { margin-bottom: 16px; font-size: clamp(2.3rem, 5vw, 3.9rem); font-weight: 800; }
        .hero h1 span { position: relative; display: inline-block; color: var(--blue-700); }
        .hero h1 span::after {
          content: ""; position: absolute; right: 4%; bottom: -5px; left: 5%; height: 10px;
          border-top: 4px solid var(--blue-600); border-radius: 50%; transform: rotate(-1.5deg);
        }
        .hero-copy { max-width: 520px; margin: 0 auto 20px; font-size: clamp(0.94rem, 1.3vw, 1.02rem); color: var(--text); }
        .hero-actions { display: flex; flex-wrap: wrap; align-items: center; justify-content: center; gap: 10px; margin-bottom: 22px; }
        .hero-actions .btn { min-width: 200px; }
        .hero-pills { display: flex; flex-wrap: wrap; justify-content: center; gap: 8px; }
        .micro-pill {
          display: flex; align-items: center; gap: 6px; padding: 8px 11px;
          border: 1px solid rgba(43, 121, 239, 0.11); border-radius: 12px; background: rgba(255, 255, 255, 0.86);
          color: var(--blue-700); font-size: 0.74rem; font-weight: 900; box-shadow: var(--shadow-sm); backdrop-filter: blur(14px);
        }
        .micro-pill i { width: 14px; height: 14px; }

        .hero-furniture {
          position: absolute; z-index: 1; bottom: 50px; width: min(22vw, 270px);
          pointer-events: none; filter: drop-shadow(0 22px 24px rgba(35, 68, 120, 0.16));
        }
        .hero-chair { left: -10px; transform: rotate(-1deg); animation: float 5.5s ease-in-out infinite; }
        .hero-sofa { right: -20px; width: min(27vw, 340px); transform: rotate(1deg); animation: float 5.5s ease-in-out infinite; animation-delay: -2.2s; }

        .orbit { position: absolute; z-index: 2; width: 95px; height: 95px; border: 2px dashed rgba(45, 124, 242, 0.55); border-radius: 50%; pointer-events: none; }
        .orbit-left { left: 5%; bottom: 190px; border-right-color: transparent; border-bottom-color: transparent; transform: rotate(10deg); }
        .orbit-right { right: 8%; bottom: 160px; border-left-color: transparent; border-bottom-color: transparent; transform: rotate(-12deg); }
        .comparison-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 16px; }
        .comparison-card { position: relative; overflow: hidden; min-height: 270px; padding: 18px; border-radius: 20px; border: 1px solid rgba(40, 95, 178, 0.08); box-shadow: var(--shadow-sm); }
        .comparison-card.bad { background: linear-gradient(135deg, rgba(255, 249, 250, 0.97), rgba(255, 242, 245, 0.88)), #fff; }
        .comparison-card.good { background: linear-gradient(135deg, rgba(246, 251, 255, 0.98), rgba(234, 245, 255, 0.92)), #fff; }
        .comparison-top { display: grid; grid-template-columns: 1fr 48%; gap: 16px; align-items: center; height: 100%; }
        .status-pill { display: inline-flex; align-items: center; gap: 6px; width: max-content; margin-bottom: 13px; padding: 6px 9px; border-radius: 999px; background: var(--white); font-size: 0.74rem; font-weight: 900; box-shadow: var(--shadow-sm); }
        .bad .status-pill { color: #ef5668; }
        .good .status-pill { color: var(--blue-700); }
        .status-pill i { width: 14px; height: 14px; }
        .check-list { display: grid; gap: 9px; margin: 0; padding: 0; list-style: none; color: #516382; font-size: 0.82rem; font-weight: 700; }
        .check-list li { display: flex; align-items: flex-start; gap: 7px; }
        .check-list i { width: 14px; height: 14px; margin-top: 2px; flex: 0 0 auto; }
        .bad .check-list i { color: var(--danger); }
        .good .check-list i { color: var(--blue-700); }
        .comparison-image { position: relative; overflow: hidden; height: 190px; border-radius: 16px; background-position: center; background-size: cover; box-shadow: 0 12px 22px rgba(35, 65, 108, 0.14); }
        .bad .comparison-image { background-image: linear-gradient(rgba(67, 71, 78, 0.13), rgba(67, 71, 78, 0.13)), url("https://images.unsplash.com/photo-1555041469-a586c61ea9bc?auto=format&fit=crop&w=900&q=88"); filter: grayscale(0.5) saturate(0.75); }
        .good .comparison-image { background-image: linear-gradient(rgba(31, 92, 180, 0.04), rgba(31, 92, 180, 0.04)), url("https://images.unsplash.com/photo-1556228453-efd6c1ff04f6?auto=format&fit=crop&w=900&q=88"); }
        .comparison-badge { position: absolute; right: 12px; bottom: 12px; width: 44px; height: 44px; display: grid; place-items: center; border: 3px solid var(--white); border-radius: 50%; color: var(--white); box-shadow: 0 10px 24px rgba(30, 62, 111, 0.22); }
        .bad .comparison-badge { background: var(--danger); }
        .good .comparison-badge { background: var(--blue-700); }
        .steps { position: relative; display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 18px; }
        .step-card { position: relative; min-height: 250px; padding: 22px 18px 18px; border: 1px solid rgba(32, 114, 233, 0.1); border-radius: 20px; background: rgba(255, 255, 255, 0.92); text-align: center; box-shadow: var(--shadow-sm); transition: transform 0.2s ease, box-shadow 0.2s ease; }
        .step-card:hover { transform: translateY(-5px); box-shadow: var(--shadow-md); }
        .step-number { position: absolute; top: -15px; left: 50%; width: 34px; height: 34px; display: grid; place-items: center; border: 3px solid #f7fbff; border-radius: 50%; color: var(--white); background: linear-gradient(135deg, var(--blue-500), var(--blue-700)); font-family: "Baloo 2", sans-serif; font-size: 1.02rem; font-weight: 800; box-shadow: 0 8px 18px rgba(27, 105, 224, 0.28); transform: translateX(-50%); }
        .step-visual { position: relative; height: 108px; display: grid; place-items: center; margin-bottom: 14px; }
        .step-visual::before { content: ""; position: absolute; width: 98px; height: 84px; border-radius: 18px; background: linear-gradient(145deg, #ffffff, var(--blue-100)); box-shadow: var(--shadow-sm); }
        .step-visual i { position: relative; z-index: 2; width: 50px; height: 50px; color: var(--blue-600); stroke-width: 1.45; }
        .step-card h3 { margin-bottom: 7px; font-size: 1.14rem; font-weight: 800; }
        .step-card p { margin-bottom: 0; color: var(--muted); font-size: 0.83rem; }
        .demo-section { background: radial-gradient(circle at 20% 50%, rgba(144, 196, 255, 0.22), transparent 30%), linear-gradient(135deg, #f6fbff, #edf6ff); }
        .demo-layout { display: grid; grid-template-columns: 0.78fr 1.65fr; gap: 20px; align-items: stretch; }
        .demo-intro { display: flex; flex-direction: column; justify-content: center; padding: 12px 6px 12px 2px; }
        .demo-intro h2 { margin-bottom: 10px; font-size: clamp(1.7rem, 3vw, 2.4rem); font-weight: 800; }
        .demo-intro p { margin-bottom: 16px; color: var(--muted); font-size: 0.92rem; }
        .demo-note { display: flex; align-items: flex-start; gap: 9px; margin-top: 12px; padding: 11px; border: 1px solid rgba(44, 119, 231, 0.1); border-radius: 14px; background: rgba(255, 255, 255, 0.68); font-size: 0.78rem; box-shadow: var(--shadow-sm); }
        .demo-note i { width: 16px; height: 16px; color: var(--blue-700); flex: 0 0 auto; }
        .widget { overflow: hidden; display: grid; grid-template-columns: 230px 1fr; min-height: 400px; border: 6px solid rgba(255, 255, 255, 0.95); border-radius: 24px; background: var(--white); box-shadow: var(--shadow-lg); }
        .product-panel { position: relative; z-index: 4; padding: 18px 16px; border-right: 1px solid rgba(26, 91, 184, 0.09); background: rgba(255, 255, 255, 0.98); display: flex; flex-direction: column; }
        .label { display: block; margin-bottom: 8px; color: var(--muted); font-size: 0.7rem; font-weight: 900; text-transform: uppercase; letter-spacing: 0.03em; }
        .product-list { display: flex; flex-direction: column; gap: 6px; margin-bottom: 16px; overflow-y: auto; max-height: 210px; }
        .product-list-item {
          display: flex; flex-direction: column; align-items: flex-start; gap: 1px;
          padding: 9px 10px; border: 1px solid rgba(23, 73, 143, 0.1); border-radius: 11px;
          background: var(--white); cursor: pointer; text-align: left; transition: border-color 0.15s ease, background 0.15s ease;
        }
        .product-list-item strong { font-size: 0.82rem; color: var(--navy); }
        .product-list-item span { font-size: 0.72rem; color: var(--muted); font-weight: 700; }
        .product-list-item.active { border-color: var(--blue-600); background: var(--blue-50); }
        .product-list-item:hover { border-color: var(--blue-500); }
        .empty-note { font-size: 0.8rem; color: var(--muted); text-align: center; padding: 10px 4px; }
        .powered-by { display: flex; align-items: center; justify-content: center; gap: 5px; color: #8a99b0; font-size: 0.66rem; font-weight: 800; }
        .powered-by strong { color: var(--blue-700); }
        .ar-stage { position: relative; overflow: hidden; min-height: 400px; background: #fafcff; }
        .ar-real-btn {
          background: var(--blue-600); color: #fff; border: none; padding: 10px 16px;
          border-radius: 999px; font-size: 0.8rem; font-weight: 800; cursor: pointer;
        }
        .lock-pill { position: absolute; z-index: 6; top: 13px; left: 50%; display: flex; align-items: center; gap: 6px; padding: 6px 9px; border-radius: 999px; background: rgba(255, 255, 255, 0.9); color: var(--blue-700); font-size: 0.66rem; font-weight: 900; box-shadow: var(--shadow-sm); transform: translateX(-50%); }
        .lock-pill i { width: 11px; height: 11px; }

        .extra-measurements-badges { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 10px; }
        .extra-measurement-badge { padding: 3px 9px; border-radius: 999px; background: var(--blue-100); color: var(--blue-700); font-size: 0.65rem; font-weight: 800; }

        .dims-toggle-btn {
          display: flex; align-items: center; justify-content: center; gap: 7px;
          width: 100%; min-height: 38px; margin-top: 12px;
          border: 1.5px solid #cddaf0; border-radius: 999px;
          background: var(--white); color: var(--blue-700);
          font-size: 0.7rem; font-weight: 850; cursor: pointer;
        }
        .dims-toggle-btn:hover { background: var(--blue-50); }
        .dims-toggle-btn i { width: 13px; height: 13px; }

        .demo-dim-svg {
          position: absolute; inset: 0; width: 100%; height: 100%;
          pointer-events: none; z-index: 4;
        }
        .demo-dim-svg line { stroke: var(--blue-700); stroke-width: 1.5; }
        .demo-dim-svg .dim-tick { stroke: var(--blue-700); stroke-width: 1.5; }
        .demo-dim-svg text { font-family: inherit; font-size: 11px; font-weight: 800; fill: var(--navy); }
        .demo-dim-svg .dim-label-bg { fill: #ffffff; stroke: #cddaf0; stroke-width: 1; }

        .benefits-grid { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 14px; }
        .benefit-card { min-height: 185px; padding: 20px 16px; border: 1px solid rgba(37, 111, 222, 0.1); border-radius: 18px; background: linear-gradient(180deg, rgba(255, 255, 255, 0.98), rgba(245, 250, 255, 0.94)); text-align: center; box-shadow: var(--shadow-sm); transition: transform 0.2s ease, box-shadow 0.2s ease; }
        .benefit-card:hover { transform: translateY(-5px); box-shadow: var(--shadow-md); }
        .benefit-icon { width: 58px; height: 58px; display: grid; place-items: center; margin: 0 auto 13px; border-radius: 18px; color: var(--blue-600); background: var(--blue-100); box-shadow: inset 0 0 0 1px rgba(44, 124, 242, 0.1); }
        .benefit-icon i { width: 29px; height: 29px; stroke-width: 1.5; }
        .benefit-card h3 { margin-bottom: 6px; font-size: 1.02rem; font-weight: 800; }
        .benefit-card p { margin-bottom: 0; color: var(--muted); font-size: 0.8rem; }
        .cta-section { padding: 12px 0 56px; }
        .cta-card { position: relative; overflow: hidden; width: var(--container); min-height: 280px; margin-inline: auto; display: grid; grid-template-columns: 1.1fr 0.9fr; align-items: center; gap: 22px; padding: 32px 36px; border-radius: 26px; color: var(--white); background: radial-gradient(circle at 90% 15%, rgba(255, 255, 255, 0.2), transparent 22%), linear-gradient(135deg, #1f73eb, #0d58d8 62%, #1249b3); box-shadow: 0 22px 52px rgba(28, 91, 194, 0.25); }
        .cta-card::before, .cta-card::after { content: "✦"; position: absolute; color: rgba(255, 255, 255, 0.25); font-size: 3rem; }
        .cta-card::before { top: 18px; right: 34%; }
        .cta-card::after { right: 30px; bottom: 20px; font-size: 1.6rem; }
        .cta-copy { position: relative; z-index: 2; }
        .cta-copy h2 { max-width: 560px; margin-bottom: 10px; color: var(--white); font-size: clamp(1.9rem, 3.5vw, 2.8rem); font-weight: 800; }
        .cta-copy p { max-width: 480px; margin-bottom: 18px; color: rgba(255, 255, 255, 0.83); font-size: 0.9rem; }
        .pilot-proof { display: flex; align-items: center; gap: 11px; margin-top: 16px; }
        .avatars { display: flex; }
        .avatar { width: 31px; height: 31px; margin-left: -7px; display: grid; place-items: center; border: 2px solid rgba(255, 255, 255, 0.9); border-radius: 50%; background: linear-gradient(135deg, #d8eaff, #91bfff); color: var(--blue-900); font-size: 0.66rem; font-weight: 900; }
        .avatar:first-child { margin-left: 0; }
        .pilot-proof span { color: rgba(255, 255, 255, 0.86); font-size: 0.74rem; font-weight: 800; }
        .pilot-form { position: relative; z-index: 3; padding: 18px; border: 1px solid rgba(255, 255, 255, 0.18); border-radius: 20px; background: rgba(255, 255, 255, 0.14); backdrop-filter: blur(14px); }
        .pilot-form h3 { margin-bottom: 11px; color: var(--white); font-size: 1.24rem; }
        .field { display: grid; gap: 5px; margin-bottom: 10px; }
        .field label { color: rgba(255, 255, 255, 0.88); font-size: 0.7rem; font-weight: 900; }
        .field input { width: 100%; height: 40px; padding: 0 12px; border: 1px solid rgba(255, 255, 255, 0.22); border-radius: 11px; outline: none; color: var(--navy); background: rgba(255, 255, 255, 0.94); font-size: 0.86rem; transition: box-shadow 0.2s ease, border 0.2s ease; }
        .field input:focus { border-color: #9bc7ff; box-shadow: 0 0 0 4px rgba(255, 255, 255, 0.2); }
        .pilot-form .btn { width: 100%; margin-top: 4px; color: var(--blue-700); background: var(--white); }
        footer { padding: 24px 0 34px; }
        .footer-inner { display: flex; align-items: center; justify-content: space-between; gap: 20px; color: var(--muted); font-size: 0.84rem; }
        .footer-mini { display: flex; gap: 20px; font-weight: 800; }
        .toast { position: fixed; z-index: 3000; right: 24px; bottom: 24px; max-width: min(380px, calc(100% - 48px)); display: flex; align-items: flex-start; gap: 12px; padding: 16px 18px; border: 1px solid rgba(45, 124, 242, 0.14); border-radius: 18px; background: rgba(255, 255, 255, 0.95); box-shadow: var(--shadow-lg); backdrop-filter: blur(12px); opacity: 0; transform: translateY(16px); pointer-events: none; transition: opacity 0.22s ease, transform 0.22s ease; }
        .toast.show { opacity: 1; transform: translateY(0); }
        .toast i { width: 22px; height: 22px; color: var(--blue-700); flex: 0 0 auto; }
        .toast strong { display: block; color: var(--navy); margin-bottom: 2px; }
        .toast span { color: var(--muted); font-size: 0.86rem; }
        .reveal { opacity: 0; transform: translateY(22px); transition: opacity 0.65s ease, transform 0.65s ease; }
        .reveal.visible { opacity: 1; transform: translateY(0); }
        @keyframes float { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-10px); } }

        @media (max-width: 1020px) {
          .nav-links { gap: 18px; }
          .hero { min-height: 480px; }
          .hero-furniture { opacity: 0.52; }
          .comparison-top { grid-template-columns: 1fr; }
          .comparison-image { height: 170px; }
          .demo-layout { grid-template-columns: 1fr; }
          .demo-intro { text-align: center; }
          .demo-note { max-width: 500px; margin-inline: auto; }
          .benefits-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
          .cta-card { grid-template-columns: 1fr; }
        }
        @media (max-width: 820px) {
          .navbar { position: relative; }
          .nav-links { position: absolute; top: calc(100% + 10px); right: 0; left: 0; display: grid; gap: 2px; padding: 12px; border: 1px solid rgba(31, 103, 214, 0.1); border-radius: 18px; background: rgba(255, 255, 255, 0.97); box-shadow: var(--shadow-md); opacity: 0; visibility: hidden; transform: translateY(-8px); transition: opacity 0.2s ease, transform 0.2s ease, visibility 0.2s ease; }
          .nav-links.open { opacity: 1; visibility: visible; transform: translateY(0); }
          .nav-links a { padding: 12px; border-radius: 12px; }
          .nav-links a:hover { background: var(--blue-100); }
          .navbar > .btn { display: none; }
          .menu-button { display: grid; }
          .hero { padding-top: 60px; }
          .hero-furniture { bottom: 10px; opacity: 0.2; }
          .comparison-grid, .steps { grid-template-columns: 1fr; }
          .steps { gap: 30px; }
          .section-card { padding: 26px 18px; }
          .widget { grid-template-columns: 1fr; }
          .product-panel { border-right: 0; border-bottom: 1px solid rgba(26, 91, 184, 0.09); }
          .ar-stage { min-height: 360px; }
          .cta-card { padding: 28px 20px; }
          .footer-inner { flex-direction: column; text-align: center; }
        }
        @media (max-width: 560px) {
          :root { --container: min(100% - 22px, 1180px); }
          .section { padding: 44px 0; }
          .navbar-shell { padding-top: 10px; }
          .navbar { min-height: 54px; padding: 6px 8px 6px 11px; border-radius: 16px; }
          .logo-mark { width: 30px; height: 30px; border-radius: 9px; }
          .brand { font-size: 1.14rem; }
          .hero { min-height: 460px; padding: 46px 0 60px; }
          .hero h1 { font-size: clamp(2rem, 10vw, 2.8rem); }
          .hero-actions { display: grid; }
          .hero-actions .btn { width: min(100%, 300px); min-width: 0; }
          .hero-pills { gap: 6px; }
          .micro-pill { padding: 7px 9px; font-size: 0.68rem; }
          .hero-chair { left: -60px; }
          .hero-sofa { right: -80px; }
          .comparison-card { min-height: 0; padding: 14px; }
          .comparison-image { height: 150px; }
          .benefits-grid { grid-template-columns: 1fr; }
          .widget { border-width: 4px; border-radius: 20px; }
          .product-panel { padding: 16px 14px; }
          .ar-stage { min-height: 320px; }
          .lock-pill { display: none; }
          .cta-card { border-radius: 22px; }
          .cta-copy h2 { font-size: 2.1rem; }
        }
      `}</style>

      <div className="navbar-shell">
        <nav className="navbar" aria-label="Navegación principal">
          <a className="logo" href="#inicio" aria-label="Reality, inicio">
            <span className="logo-mark"><i data-lucide="armchair"></i></span>
            <span className="brand">Reality</span>
          </a>

          <div className="nav-links" id="navLinks">
            <a href="#problema">El problema</a>
            <a href="#como-funciona">Cómo funciona</a>
            <a href="#demo">Demo</a>
            <a href="#beneficios">Beneficios</a>
          </div>

          <Link href="/login" className="btn btn-primary btn-small">Iniciar sesión</Link>

          <button className="menu-button" id="menuButton" type="button" aria-label="Abrir menú" aria-expanded="false">
            <i data-lucide="menu"></i>
          </button>
        </nav>
      </div>

      <main>
        <section className="hero" id="inicio">
          <div className="orbit orbit-left"></div>
          <div className="orbit orbit-right"></div>

          <svg className="hero-furniture hero-chair" viewBox="0 0 390 360" aria-hidden="true">
            <ellipse cx="195" cy="324" rx="150" ry="24" fill="rgba(31,67,119,.10)" />
            <path d="M90 132C90 82 123 48 170 48h50c47 0 80 34 80 84v82H90z" fill="#86b6ed" />
            <rect x="64" y="175" width="262" height="116" rx="46" fill="#6fa4e6" />
            <rect x="77" y="190" width="236" height="89" rx="39" fill="#7aade8" />
            <rect x="54" y="158" width="74" height="142" rx="34" fill="#689be0" />
            <rect x="262" y="158" width="74" height="142" rx="34" fill="#689be0" />
            <path d="M94 287h32l-12 60H83zM264 287h32l11 60h-31z" fill="#c6ad87" />
            <path d="M134 69c20-9 101-9 121 0" fill="none" stroke="rgba(255,255,255,.3)" strokeWidth="6" strokeLinecap="round" />
          </svg>

          <svg className="hero-furniture hero-sofa" viewBox="0 0 520 360" aria-hidden="true">
            <ellipse cx="260" cy="326" rx="212" ry="24" fill="rgba(31,67,119,.10)" />
            <rect x="78" y="122" width="364" height="153" rx="48" fill="#d6dbe2" />
            <rect x="54" y="176" width="412" height="119" rx="42" fill="#c9cfd8" />
            <rect x="54" y="155" width="83" height="145" rx="34" fill="#c0c7d1" />
            <rect x="383" y="155" width="83" height="145" rx="34" fill="#c0c7d1" />
            <rect x="124" y="182" width="130" height="92" rx="25" fill="#dce1e7" />
            <rect x="266" y="182" width="130" height="92" rx="25" fill="#dce1e7" />
            <path d="M112 291h32l-7 43h-32zM376 291h32l8 43h-32z" fill="#c3a67f" />
            <rect x="299" y="140" width="88" height="72" rx="18" fill="#8fbdef" />
          </svg>

          <div className="container hero-content reveal">
            <div className="eyebrow">
              <i data-lucide="sparkles"></i>
              Realidad aumentada para mueblerías
            </div>

            <h1>
              Tus clientes prueban los muebles en su casa
              <span> antes de comprar</span>
            </h1>

            <p className="hero-copy">
              Reality permite visualizar cada mueble en el ambiente real, con escala,
              proporciones y colores precisos. Más confianza, menos dudas y más ventas.
            </p>

            <div className="hero-actions">
              <a className="btn btn-primary" href="#piloto">
                Quiero ser mueblería piloto
                <i data-lucide="arrow-right"></i>
              </a>
              <a className="btn btn-secondary" href="#demo">
                <i data-lucide="play-circle"></i>
                Ver cómo funciona
              </a>
            </div>

            <div className="hero-pills">
              <span className="micro-pill"><i data-lucide="smartphone"></i> Sin apps</span>
              <span className="micro-pill"><i data-lucide="ruler"></i> Escala real</span>
              <span className="micro-pill"><i data-lucide="code-2"></i> Fácil de integrar</span>
              <span className="micro-pill"><i data-lucide="zap"></i> Listo en minutos</span>
            </div>
          </div>
        </section>

        <section className="section" id="problema">
          <div className="section-card reveal">
            <div className="section-heading">
              <span className="eyebrow"><i data-lucide="circle-help"></i> Menos incertidumbre</span>
              <h2>Comprar muebles hoy es incierto. Con Reality, ya no.</h2>
              <p>El cliente deja de imaginar cómo quedaría el producto y puede verlo directamente en su espacio antes de decidir.</p>
            </div>

            <div className="comparison-grid">
              <article className="comparison-card bad">
                <div className="comparison-top">
                  <div>
                    <div className="status-pill"><i data-lucide="circle-x"></i> Sin Reality</div>
                    <ul className="check-list">
                      <li><i data-lucide="x-circle"></i> No saben si va a quedar bien.</li>
                      <li><i data-lucide="x-circle"></i> Dudas sobre tamaño y color.</li>
                      <li><i data-lucide="x-circle"></i> Más preguntas antes de comprar.</li>
                      <li><i data-lucide="x-circle"></i> Devoluciones y cancelaciones.</li>
                      <li><i data-lucide="x-circle"></i> Menos confianza, menos ventas.</li>
                    </ul>
                  </div>
                  <div className="comparison-image">
                    <div className="comparison-badge"><i data-lucide="x"></i></div>
                  </div>
                </div>
              </article>

              <article className="comparison-card good">
                <div className="comparison-top">
                  <div>
                    <div className="status-pill"><i data-lucide="badge-check"></i> Con Reality</div>
                    <ul className="check-list">
                      <li><i data-lucide="check-circle-2"></i> Lo prueban en su espacio.</li>
                      <li><i data-lucide="check-circle-2"></i> Ven tamaño y proporciones reales.</li>
                      <li><i data-lucide="check-circle-2"></i> Compran con mayor confianza.</li>
                      <li><i data-lucide="check-circle-2"></i> Menos devoluciones.</li>
                      <li><i data-lucide="check-circle-2"></i> Más conversiones para tu tienda.</li>
                    </ul>
                  </div>
                  <div className="comparison-image">
                    <div className="comparison-badge"><i data-lucide="check"></i></div>
                  </div>
                </div>
              </article>
            </div>
          </div>
        </section>

        <section className="section" id="como-funciona">
          <div className="container">
            <div className="section-heading reveal">
              <span className="eyebrow"><i data-lucide="workflow"></i> Configuración simple</span>
              <h2>Así de simple funciona</h2>
              <p>Nosotros nos ocupamos de la parte técnica para que tu equipo pueda empezar sin cambiar su forma de trabajar.</p>
            </div>

            <div className="steps">
              <article className="step-card reveal">
                <div className="step-number">1</div>
                <div className="step-visual"><i data-lucide="cloud-upload"></i></div>
                <h3>Enviás tus productos</h3>
                <p>Subís fotos, medidas, colores y variantes desde un panel simple e intuitivo.</p>
              </article>
              <article className="step-card reveal">
                <div className="step-number">2</div>
                <div className="step-visual"><i data-lucide="scan-search"></i></div>
                <h3>Revisamos y publicamos</h3>
                <p>Nuestro equipo controla cada producto y lo deja listo para usarse en realidad aumentada.</p>
              </article>
              <article className="step-card reveal">
                <div className="step-number">3</div>
                <div className="step-visual"><i data-lucide="code-xml"></i></div>
                <h3>Lo instalás en tu sitio</h3>
                <p>Pegás un código simple y listo. No necesitás migrar de plataforma ni rehacer tu tienda.</p>
              </article>
            </div>
          </div>
        </section>

        <section className="section demo-section" id="demo">
          <div className="section-card reveal">
            <div className="demo-layout">
              <div className="demo-intro">
                <span className="eyebrow"><i data-lucide="sparkles"></i> Catálogo real</span>
                <h2>Viendo es creyendo</h2>
                <p>Esto no es una simulación: son los productos reales cargados en la plataforma. Elegí uno de la lista y probalo en 3D.</p>

                <div className="demo-note">
                  <i data-lucide="move"></i>
                  <span>Desde el celular, el botón "Ver en tu espacio" abre la cámara real y ancla el mueble a escala exacta.</span>
                </div>
              </div>

              <div className="widget">
                <aside className="product-panel">
                  <span className="label">Catálogo publicado</span>
                  <div className="product-list">
                    {products.length === 0 && (
                      <div className="empty-note">Todavía no hay productos publicados.</div>
                    )}
                    {products.map((p, i) => (
                      <button
                        key={p.id}
                        type="button"
                        className={`product-list-item${i === selectedIndex ? ' active' : ''}`}
                        onClick={() => setSelectedIndex(i)}
                      >
                        <strong>{p.name}</strong>
                        <span>{p.price}</span>
                      </button>
                    ))}
                  </div>

                  {selected && Array.isArray(selected.extra_measurements) && selected.extra_measurements.length > 0 && (
                    <div className="extra-measurements-badges">
                      {selected.extra_measurements
                        .filter((m) => m && m.label && m.value)
                        .map((m, i) => (
                          <span key={i} className="extra-measurement-badge">{m.label}: {m.value}</span>
                        ))}
                    </div>
                  )}

                  {selected && (
                    <button
                      type="button"
                      className="dims-toggle-btn"
                      onClick={() => setShowingDims((current) => !current)}
                    >
                      <i data-lucide="ruler"></i>
                      {showingDims ? 'Ocultar medidas' : 'Ver medidas sobre el mueble'}
                    </button>
                  )}

                  <div className="powered-by">Con tecnología de <strong>Reality</strong></div>
                </aside>

                <div className="ar-stage">
                  <span className="lock-pill"><i data-lucide="lock-keyhole"></i> Escala real bloqueada</span>
                  {selected ? (
                    <>
                      {/* eslint-disable-next-line react/no-unknown-property */}
                      <model-viewer
                        key={selected.id}
                        ref={demoViewerRef}
                        src={selected.model_url}
                        camera-controls
                        auto-rotate
                        shadow-intensity="1"
                        exposure="0.95"
                        environment-image="neutral"
                        camera-orbit="35deg 78deg 2.6m"
                        ar
                        ar-modes="webxr scene-viewer quick-look"
                        ar-scale="fixed"
                        ar-placement="floor"
                        style={{ width: '100%', height: '100%' }}
                      >
                        <button slot="ar-button" className="ar-real-btn">Ver en tu espacio (AR)</button>
                        {/* eslint-disable-next-line react/no-unknown-property */}
                        <span slot="hotspot-alto-top" data-position="0 0 0" style={{ display: 'none' }}></span>
                        {/* eslint-disable-next-line react/no-unknown-property */}
                        <span slot="hotspot-alto-bottom" data-position="0 0 0" style={{ display: 'none' }}></span>
                        {/* eslint-disable-next-line react/no-unknown-property */}
                        <span slot="hotspot-ancho-left" data-position="0 0 0" style={{ display: 'none' }}></span>
                        {/* eslint-disable-next-line react/no-unknown-property */}
                        <span slot="hotspot-ancho-right" data-position="0 0 0" style={{ display: 'none' }}></span>
                        {/* eslint-disable-next-line react/no-unknown-property */}
                        <span slot="hotspot-fondo-near" data-position="0 0 0" style={{ display: 'none' }}></span>
                        {/* eslint-disable-next-line react/no-unknown-property */}
                        <span slot="hotspot-fondo-far" data-position="0 0 0" style={{ display: 'none' }}></span>
                      </model-viewer>

                      {showingDims && (
                        <svg ref={demoSvgRef} className="demo-dim-svg"></svg>
                      )}
                    </>
                  ) : (
                    <div className="empty-note" style={{ padding: 40 }}>Cargando catálogo…</div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="section" id="beneficios">
          <div className="container">
            <div className="section-heading reveal">
              <span className="eyebrow"><i data-lucide="heart-handshake"></i> Hecho para mueblerías</span>
              <h2>Pensado para vender más sin complicar tu operación</h2>
              <p>Reality se adapta a tu tienda actual y deja la experiencia técnica resuelta para tu equipo y tus clientes.</p>
            </div>

            <div className="benefits-grid">
              <article className="benefit-card reveal">
                <div className="benefit-icon"><i data-lucide="scan-3d"></i></div>
                <h3>Escala real bloqueada</h3>
                <p>Tus muebles se ven en tamaño real y con proporciones exactas, sin distorsiones.</p>
              </article>
              <article className="benefit-card reveal">
                <div className="benefit-icon"><i data-lucide="cloud-upload"></i></div>
                <h3>Panel simple de carga</h3>
                <p>Subí productos y variantes fácilmente. Nosotros nos ocupamos de lo técnico.</p>
              </article>
              <article className="benefit-card reveal">
                <div className="benefit-icon"><i data-lucide="blocks"></i></div>
                <h3>Integración sin migrar</h3>
                <p>Funciona con tu tienda actual: Shopify, Tiendanube, WooCommerce o desarrollo propio.</p>
              </article>
              <article className="benefit-card reveal">
                <div className="benefit-icon"><i data-lucide="globe-2"></i></div>
                <h3>Funciona sin apps</h3>
                <p>El cliente lo usa desde el navegador de su celular. No necesita descargar nada.</p>
              </article>
            </div>
          </div>
        </section>

        <section className="cta-section" id="piloto">
          <div className="cta-card reveal">
            <div className="cta-copy">
              <h2>Sumate como mueblería piloto y llevá tus ventas al siguiente nivel</h2>
              <p>Estamos seleccionando mueblerías que quieran probar Reality, sumar productos y crecer junto a nosotros desde el comienzo.</p>

              <div className="pilot-proof">
                <div className="avatars" aria-hidden="true">
                  <span className="avatar">MR</span>
                  <span className="avatar">CN</span>
                  <span className="avatar">LM</span>
                </div>
                <span>Más mueblerías ya están probando la experiencia.</span>
              </div>
            </div>

            <form className="pilot-form" id="pilotForm">
              <h3>Quiero conocer Reality</h3>

              <div className="field">
                <label htmlFor="businessName">Nombre de la mueblería</label>
                <input id="businessName" name="businessName" type="text" placeholder="Ej: Casa Nórdica" required />
              </div>

              <div className="field">
                <label htmlFor="contactEmail">Email de contacto</label>
                <input id="contactEmail" name="contactEmail" type="email" placeholder="hola@tumuebleria.com" required />
              </div>

              <div className="field">
                <label htmlFor="website">Sitio web o Instagram</label>
                <input id="website" name="website" type="text" placeholder="@tumuebleria" />
              </div>

              <button className="btn" type="submit">
                Quiero ser mueblería piloto
                <i data-lucide="arrow-right"></i>
              </button>
            </form>
          </div>
        </section>
      </main>

      <footer>
        <div className="container footer-inner">
          <div className="logo">
            <span className="logo-mark"><i data-lucide="armchair"></i></span>
            <span className="brand">Reality</span>
          </div>
          <span>© 2026 Reality. Realidad aumentada para mueblerías.</span>
          <div className="footer-mini">
            <a href="#inicio">Inicio</a>
            <a href="#demo">Demo</a>
          </div>
        </div>
      </footer>

      <div className="toast" id="toast" role="status" aria-live="polite">
        <i data-lucide="badge-check"></i>
        <div>
          <strong id="toastTitle">Listo</strong>
          <span id="toastMessage">La acción se completó correctamente.</span>
        </div>
      </div>
    </>
  );
}
