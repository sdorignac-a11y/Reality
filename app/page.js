'use client';

import { useEffect } from 'react';
import Script from 'next/script';

export default function HomePage() {
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

    const swatches = document.querySelectorAll('.swatch');
    function handleSwatchClick(swatch) {
      swatches.forEach((item) => item.classList.remove('active'));
      swatch.classList.add('active');
      document.documentElement.style.setProperty('--chair-color', swatch.dataset.color);
    }
    swatches.forEach((swatch) => swatch.addEventListener('click', () => handleSwatchClick(swatch)));

    const stage = document.getElementById('arStage');
    const chair = document.getElementById('chair');
    let dragging = false;
    let startPointerX = 0;
    let startPointerY = 0;
    let currentX = 0;
    let currentY = 0;
    let originX = 0;
    let originY = 0;
    let chairScale = 1;

    function updateChairTransform() {
      chair.style.transform = `translate(calc(-50% + ${currentX}px), ${currentY}px) scale(${chairScale})`;
    }

    function handlePointerDown(event) {
      dragging = true;
      startPointerX = event.clientX;
      startPointerY = event.clientY;
      originX = currentX;
      originY = currentY;
      chair.setPointerCapture(event.pointerId);
    }

    function handlePointerMove(event) {
      if (!dragging) return;
      const stageRect = stage.getBoundingClientRect();
      const chairRect = chair.getBoundingClientRect();
      const nextX = originX + (event.clientX - startPointerX);
      const nextY = originY + (event.clientY - startPointerY);
      const horizontalLimit = Math.max(0, stageRect.width / 2 - chairRect.width / 2 - 14);
      currentX = Math.min(horizontalLimit, Math.max(-horizontalLimit, nextX));
      currentY = Math.min(20, Math.max(-150, nextY));
      updateChairTransform();
    }

    function stopDragging(event) {
      if (!dragging) return;
      dragging = false;
      if (event?.pointerId !== undefined && chair.hasPointerCapture(event.pointerId)) {
        chair.releasePointerCapture(event.pointerId);
      }
    }

    chair.addEventListener('pointerdown', handlePointerDown);
    chair.addEventListener('pointermove', handlePointerMove);
    chair.addEventListener('pointerup', stopDragging);
    chair.addEventListener('pointercancel', stopDragging);

    const scaleDownButton = document.getElementById('scaleDownButton');
    const scaleUpButton = document.getElementById('scaleUpButton');
    const resetChairButton = document.getElementById('resetChairButton');
    const captureButton = document.getElementById('captureButton');
    const helpButton = document.getElementById('helpButton');

    function handleScaleDown() {
      chairScale = Math.max(0.82, Number((chairScale - 0.06).toFixed(2)));
      updateChairTransform();
      showToast('Escala simulada', 'En producción la escala queda bloqueada con las medidas reales.');
    }
    function handleScaleUp() {
      chairScale = Math.min(1.18, Number((chairScale + 0.06).toFixed(2)));
      updateChairTransform();
      showToast('Escala simulada', 'En producción la escala queda bloqueada con las medidas reales.');
    }
    function handleReset() {
      currentX = 0;
      currentY = 0;
      chairScale = 1;
      updateChairTransform();
      showToast('Posición reiniciada', 'El sillón volvió al centro de la habitación.');
    }
    function handleCapture() {
      showToast('Captura guardada', 'La imagen quedó lista para compartir o comparar.');
    }
    function handleHelp() {
      showToast('Cómo usar la demo', 'Arrastrá el sillón, cambiá el color y probá los controles inferiores.');
    }

    scaleDownButton.addEventListener('click', handleScaleDown);
    scaleUpButton.addEventListener('click', handleScaleUp);
    resetChairButton.addEventListener('click', handleReset);
    captureButton.addEventListener('click', handleCapture);
    helpButton.addEventListener('click', handleHelp);

    const demoModal = document.getElementById('demoModal');
    const openDemoButton = document.getElementById('openDemoButton');
    const viewInSpaceButton = document.getElementById('viewInSpaceButton');
    const closeModalButton = document.getElementById('closeModalButton');

    function openModal() {
      demoModal.classList.add('open');
      document.body.style.overflow = 'hidden';
      closeModalButton.focus();
    }
    function closeModal() {
      demoModal.classList.remove('open');
      document.body.style.overflow = '';
    }
    function handleModalOverlayClick(event) {
      if (event.target === demoModal) closeModal();
    }
    function handleEscape(event) {
      if (event.key === 'Escape' && demoModal.classList.contains('open')) closeModal();
    }

    openDemoButton.addEventListener('click', openModal);
    viewInSpaceButton.addEventListener('click', openModal);
    closeModalButton.addEventListener('click', closeModal);
    demoModal.addEventListener('click', handleModalOverlayClick);
    document.addEventListener('keydown', handleEscape);

    const simulateARButton = document.getElementById('simulateARButton');
    function handleSimulateAR() {
      closeModal();
      showToast('Demo iniciada', 'En un celular compatible se abriría la cámara del navegador.');
    }
    simulateARButton.addEventListener('click', handleSimulateAR);

    const pilotForm = document.getElementById('pilotForm');
    function handlePilotSubmit(event) {
      event.preventDefault();
      const businessName = document.getElementById('businessName').value.trim();
      showToast('Solicitud enviada', `${businessName || 'Tu mueblería'} quedó registrada para la prueba piloto.`);
      event.currentTarget.reset();
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
      chair.removeEventListener('pointerdown', handlePointerDown);
      chair.removeEventListener('pointermove', handlePointerMove);
      chair.removeEventListener('pointerup', stopDragging);
      chair.removeEventListener('pointercancel', stopDragging);
      document.removeEventListener('keydown', handleEscape);
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
          --surface: rgba(255, 255, 255, 0.84);
          --surface-soft: rgba(247, 251, 255, 0.92);
          --danger: #ff6a7a;
          --success: #1e73e8;
          --shadow-sm: 0 8px 24px rgba(40, 92, 175, 0.08);
          --shadow-md: 0 18px 48px rgba(40, 92, 175, 0.12);
          --shadow-lg: 0 30px 80px rgba(29, 82, 168, 0.17);
          --radius-sm: 14px;
          --radius-md: 22px;
          --radius-lg: 30px;
          --radius-xl: 38px;
          --container: min(1180px, calc(100% - 32px));
          --chair-color: #5f9ae8;
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
        .section { padding: 82px 0; }
        .section-card {
          width: var(--container);
          margin-inline: auto;
          padding: 56px;
          border: 1px solid rgba(44, 116, 229, 0.1);
          border-radius: var(--radius-xl);
          background: rgba(255, 255, 255, 0.9);
          box-shadow: var(--shadow-md);
          backdrop-filter: blur(18px);
        }
        .section-heading { max-width: 760px; margin: 0 auto 42px; text-align: center; }
        .section-heading h2 { margin-bottom: 12px; font-size: clamp(2.25rem, 4vw, 3.4rem); font-weight: 800; }
        .section-heading p { margin-bottom: 0; font-size: 1.08rem; color: var(--muted); }
        .eyebrow {
          display: inline-flex; align-items: center; gap: 8px; margin-bottom: 18px;
          padding: 9px 14px; border: 1px solid rgba(43, 121, 239, 0.12); border-radius: 999px;
          background: rgba(255, 255, 255, 0.92); color: var(--blue-700);
          font-size: 0.9rem; font-weight: 900; box-shadow: var(--shadow-sm);
        }
        .eyebrow i { width: 17px; height: 17px; }
        .btn {
          min-height: 54px; display: inline-flex; align-items: center; justify-content: center;
          gap: 10px; padding: 0 24px; border: 0; border-radius: 16px; cursor: pointer; font-weight: 900;
          transition: transform 0.2s ease, box-shadow 0.2s ease, background 0.2s ease;
        }
        .btn:hover { transform: translateY(-2px); }
        .btn-primary {
          color: var(--white); background: linear-gradient(135deg, var(--blue-600), #0f5fe6);
          box-shadow: 0 14px 30px rgba(29, 108, 232, 0.28);
        }
        .btn-primary:hover { box-shadow: 0 18px 38px rgba(29, 108, 232, 0.34); }
        .btn-secondary {
          color: var(--blue-700); background: rgba(255, 255, 255, 0.95);
          border: 1px solid rgba(49, 126, 235, 0.14); box-shadow: var(--shadow-sm);
        }
        .btn-small { min-height: 44px; padding: 0 18px; border-radius: 14px; font-size: 0.92rem; }
        .btn i { width: 18px; height: 18px; }
        .navbar-shell { position: sticky; z-index: 1000; top: 0; padding: 16px 0 0; pointer-events: none; }
        .navbar {
          width: var(--container); min-height: 70px; margin-inline: auto; display: flex;
          align-items: center; justify-content: space-between; gap: 24px; padding: 10px 12px 10px 18px;
          border: 1px solid rgba(32, 112, 232, 0.1); border-radius: 22px; background: rgba(255, 255, 255, 0.83);
          box-shadow: 0 14px 45px rgba(42, 91, 161, 0.09); backdrop-filter: blur(20px); pointer-events: auto;
        }
        .logo { display: flex; align-items: center; gap: 10px; flex: 0 0 auto; }
        .logo-mark {
          width: 42px; height: 42px; display: grid; place-items: center; border: 2px solid var(--blue-600);
          border-radius: 13px; color: var(--blue-600); background: var(--white); box-shadow: inset 0 0 0 4px var(--blue-100);
        }
        .logo-mark i { width: 24px; height: 24px; stroke-width: 2.4; }
        .brand { font-size: 1.72rem; font-weight: 800; color: var(--blue-700); }
        .nav-links { display: flex; align-items: center; justify-content: center; gap: 28px; font-size: 0.9rem; font-weight: 900; color: var(--navy); }
        .nav-links a { transition: color 0.2s ease; }
        .nav-links a:hover { color: var(--blue-700); }
        .menu-button {
          display: none; width: 44px; height: 44px; place-items: center; border: 0;
          border-radius: 14px; background: var(--blue-100); color: var(--blue-700); cursor: pointer;
        }
        .hero { position: relative; min-height: 780px; display: flex; align-items: center; padding: 84px 0 110px; isolation: isolate; }
        .hero::before {
          content: ""; position: absolute; z-index: -2; inset: 0;
          background: radial-gradient(circle at 50% 40%, rgba(255, 255, 255, 0.96) 0 23%, rgba(255, 255, 255, 0.3) 52%, transparent 70%);
        }
        .hero::after {
          content: ""; position: absolute; z-index: -1; top: 23%; left: 50%; width: 520px; height: 520px;
          border-radius: 50%; background: rgba(183, 216, 255, 0.18); filter: blur(18px); transform: translateX(-50%);
        }
        .hero-content { position: relative; z-index: 4; max-width: 830px; margin: 0 auto; text-align: center; }
        .hero h1 { margin-bottom: 24px; font-size: clamp(3.45rem, 7vw, 6.3rem); font-weight: 800; }
        .hero h1 span { position: relative; display: inline-block; color: var(--blue-700); }
        .hero h1 span::after {
          content: ""; position: absolute; right: 4%; bottom: -7px; left: 5%; height: 15px;
          border-top: 5px solid var(--blue-600); border-radius: 50%; transform: rotate(-1.5deg);
        }
        .hero-copy { max-width: 640px; margin: 0 auto 28px; font-size: clamp(1.06rem, 1.6vw, 1.24rem); color: var(--text); }
        .hero-actions { display: flex; flex-wrap: wrap; align-items: center; justify-content: center; gap: 12px; margin-bottom: 30px; }
        .hero-actions .btn { min-width: 250px; }
        .hero-pills { display: flex; flex-wrap: wrap; justify-content: center; gap: 10px; }
        .micro-pill {
          display: flex; align-items: center; gap: 8px; padding: 10px 14px;
          border: 1px solid rgba(43, 121, 239, 0.11); border-radius: 14px; background: rgba(255, 255, 255, 0.86);
          color: var(--blue-700); font-size: 0.82rem; font-weight: 900; box-shadow: var(--shadow-sm); backdrop-filter: blur(14px);
        }
        .micro-pill i { width: 16px; height: 16px; }
        .hero-furniture {
          position: absolute; z-index: 1; bottom: 75px; width: min(29vw, 360px);
          pointer-events: none; filter: drop-shadow(0 28px 30px rgba(35, 68, 120, 0.16));
        }
        .hero-chair { left: -14px; transform: rotate(-1deg); }
        .hero-sofa { right: -28px; width: min(35vw, 450px); transform: rotate(1deg); }
        .orbit { position: absolute; z-index: 2; width: 125px; height: 125px; border: 2px dashed rgba(45, 124, 242, 0.55); border-radius: 50%; pointer-events: none; }
        .orbit-left { left: 5%; bottom: 260px; border-right-color: transparent; border-bottom-color: transparent; transform: rotate(10deg); }
        .orbit-right { right: 8%; bottom: 220px; border-left-color: transparent; border-bottom-color: transparent; transform: rotate(-12deg); }
        .comparison-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 22px; }
        .comparison-card { position: relative; overflow: hidden; min-height: 360px; padding: 24px; border-radius: 28px; border: 1px solid rgba(40, 95, 178, 0.08); box-shadow: var(--shadow-sm); }
        .comparison-card.bad { background: linear-gradient(135deg, rgba(255, 249, 250, 0.97), rgba(255, 242, 245, 0.88)), #fff; }
        .comparison-card.good { background: linear-gradient(135deg, rgba(246, 251, 255, 0.98), rgba(234, 245, 255, 0.92)), #fff; }
        .comparison-top { display: grid; grid-template-columns: 1fr 48%; gap: 22px; align-items: center; height: 100%; }
        .status-pill { display: inline-flex; align-items: center; gap: 7px; width: max-content; margin-bottom: 18px; padding: 8px 11px; border-radius: 999px; background: var(--white); font-size: 0.82rem; font-weight: 900; box-shadow: var(--shadow-sm); }
        .bad .status-pill { color: #ef5668; }
        .good .status-pill { color: var(--blue-700); }
        .status-pill i { width: 17px; height: 17px; }
        .check-list { display: grid; gap: 13px; margin: 0; padding: 0; list-style: none; color: #516382; font-size: 0.93rem; font-weight: 700; }
        .check-list li { display: flex; align-items: flex-start; gap: 9px; }
        .check-list i { width: 16px; height: 16px; margin-top: 2px; flex: 0 0 auto; }
        .bad .check-list i { color: var(--danger); }
        .good .check-list i { color: var(--blue-700); }
        .comparison-image { position: relative; overflow: hidden; height: 265px; border-radius: 22px; background-position: center; background-size: cover; box-shadow: 0 15px 28px rgba(35, 65, 108, 0.14); }
        .bad .comparison-image { background-image: linear-gradient(rgba(67, 71, 78, 0.13), rgba(67, 71, 78, 0.13)), url("https://images.unsplash.com/photo-1555041469-a586c61ea9bc?auto=format&fit=crop&w=900&q=88"); filter: grayscale(0.5) saturate(0.75); }
        .good .comparison-image { background-image: linear-gradient(rgba(31, 92, 180, 0.04), rgba(31, 92, 180, 0.04)), url("https://images.unsplash.com/photo-1556228453-efd6c1ff04f6?auto=format&fit=crop&w=900&q=88"); }
        .comparison-badge { position: absolute; right: 12px; bottom: 12px; width: 44px; height: 44px; display: grid; place-items: center; border: 3px solid var(--white); border-radius: 50%; color: var(--white); box-shadow: 0 10px 24px rgba(30, 62, 111, 0.22); }
        .bad .comparison-badge { background: var(--danger); }
        .good .comparison-badge { background: var(--blue-700); }
        .steps { position: relative; display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 24px; }
        .step-card { position: relative; min-height: 320px; padding: 28px 24px 24px; border: 1px solid rgba(32, 114, 233, 0.1); border-radius: 26px; background: rgba(255, 255, 255, 0.92); text-align: center; box-shadow: var(--shadow-sm); transition: transform 0.2s ease, box-shadow 0.2s ease; }
        .step-card:hover { transform: translateY(-5px); box-shadow: var(--shadow-md); }
        .step-number { position: absolute; top: -18px; left: 50%; width: 42px; height: 42px; display: grid; place-items: center; border: 4px solid #f7fbff; border-radius: 50%; color: var(--white); background: linear-gradient(135deg, var(--blue-500), var(--blue-700)); font-family: "Baloo 2", sans-serif; font-size: 1.25rem; font-weight: 800; box-shadow: 0 10px 22px rgba(27, 105, 224, 0.28); transform: translateX(-50%); }
        .step-visual { position: relative; height: 145px; display: grid; place-items: center; margin-bottom: 20px; }
        .step-visual::before { content: ""; position: absolute; width: 130px; height: 110px; border-radius: 24px; background: linear-gradient(145deg, #ffffff, var(--blue-100)); box-shadow: var(--shadow-sm); }
        .step-visual i { position: relative; z-index: 2; width: 68px; height: 68px; color: var(--blue-600); stroke-width: 1.45; }
        .step-card h3 { margin-bottom: 10px; font-size: 1.45rem; font-weight: 800; }
        .step-card p { margin-bottom: 0; color: var(--muted); font-size: 0.94rem; }
        .demo-section { background: radial-gradient(circle at 20% 50%, rgba(144, 196, 255, 0.22), transparent 30%), linear-gradient(135deg, #f6fbff, #edf6ff); }
        .demo-layout { display: grid; grid-template-columns: 0.78fr 1.65fr; gap: 28px; align-items: stretch; }
        .demo-intro { display: flex; flex-direction: column; justify-content: center; padding: 18px 10px 18px 4px; }
        .demo-intro h2 { margin-bottom: 14px; font-size: clamp(2.3rem, 4vw, 3.5rem); font-weight: 800; }
        .demo-intro p { margin-bottom: 24px; color: var(--muted); }
        .demo-note { display: flex; align-items: flex-start; gap: 12px; margin-top: 18px; padding: 15px; border: 1px solid rgba(44, 119, 231, 0.1); border-radius: 18px; background: rgba(255, 255, 255, 0.68); font-size: 0.88rem; box-shadow: var(--shadow-sm); }
        .demo-note i { width: 20px; height: 20px; color: var(--blue-700); flex: 0 0 auto; }
        .widget { overflow: hidden; display: grid; grid-template-columns: 300px 1fr; min-height: 540px; border: 8px solid rgba(255, 255, 255, 0.95); border-radius: 32px; background: var(--white); box-shadow: var(--shadow-lg); }
        .product-panel { position: relative; z-index: 4; padding: 28px 24px; border-right: 1px solid rgba(26, 91, 184, 0.09); background: rgba(255, 255, 255, 0.98); }
        .product-panel h3 { margin-bottom: 4px; font-size: 1.7rem; font-weight: 800; }
        .price { margin-bottom: 18px; color: var(--navy); font-size: 1.1rem; font-weight: 900; }
        .label { display: block; margin-bottom: 8px; color: var(--muted); font-size: 0.8rem; font-weight: 900; }
        .swatches { display: flex; gap: 9px; margin-bottom: 22px; }
        .swatch { width: 30px; height: 30px; padding: 0; border: 4px solid white; border-radius: 50%; cursor: pointer; box-shadow: 0 0 0 1px rgba(23, 73, 143, 0.12), var(--shadow-sm); transition: transform 0.2s ease, box-shadow 0.2s ease; }
        .swatch:hover, .swatch.active { transform: scale(1.1); box-shadow: 0 0 0 2px var(--blue-600), var(--shadow-sm); }
        .measurements { display: grid; gap: 12px; margin-bottom: 24px; }
        .measure { display: flex; align-items: center; justify-content: space-between; gap: 16px; color: #5d6f8c; font-size: 0.88rem; font-weight: 800; }
        .measure span:first-child { display: flex; align-items: center; gap: 7px; }
        .measure i { width: 17px; height: 17px; color: var(--blue-700); }
        .product-panel .btn { width: 100%; }
        .powered-by { display: flex; align-items: center; justify-content: center; gap: 6px; margin-top: 14px; color: #8a99b0; font-size: 0.72rem; font-weight: 800; }
        .powered-by strong { color: var(--blue-700); }
        .ar-stage { position: relative; overflow: hidden; min-height: 540px; background: linear-gradient(rgba(20, 51, 104, 0.03), rgba(20, 51, 104, 0.03)), url("https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?auto=format&fit=crop&w=1200&q=90") center / cover no-repeat; touch-action: none; user-select: none; }
        .ar-stage::after { content: ""; position: absolute; inset: auto 0 0; height: 44%; background: linear-gradient(to top, rgba(15, 40, 79, 0.14), transparent); pointer-events: none; }
        .top-control { position: absolute; z-index: 5; top: 18px; width: 42px; height: 42px; display: grid; place-items: center; border: 0; border-radius: 50%; color: var(--navy); background: rgba(255, 255, 255, 0.92); box-shadow: var(--shadow-sm); cursor: pointer; }
        .top-control:first-of-type { left: 18px; }
        .top-control.help { right: 18px; }
        .top-control i { width: 19px; height: 19px; }
        .lock-pill { position: absolute; z-index: 6; top: 18px; left: 50%; display: flex; align-items: center; gap: 7px; padding: 8px 11px; border-radius: 999px; background: rgba(255, 255, 255, 0.9); color: var(--blue-700); font-size: 0.76rem; font-weight: 900; box-shadow: var(--shadow-sm); transform: translateX(-50%); }
        .lock-pill i { width: 14px; height: 14px; }
        .chair-wrap { position: absolute; z-index: 3; left: 50%; bottom: 62px; width: min(58%, 330px); cursor: grab; filter: drop-shadow(0 32px 25px rgba(20, 45, 84, 0.31)); transform: translateX(-50%); }
        .chair-wrap:active { cursor: grabbing; }
        .chair-svg .chair-color { fill: var(--chair-color); transition: fill 0.25s ease; }
        .chair-svg .chair-shadow { fill: rgba(0, 0, 0, 0.12); }
        .demo-controls { position: absolute; z-index: 7; right: 0; bottom: 16px; left: 0; display: flex; align-items: center; justify-content: center; gap: 18px; }
        .circle-control { width: 50px; height: 50px; display: grid; place-items: center; border: 0; border-radius: 50%; color: var(--blue-700); background: rgba(255, 255, 255, 0.9); box-shadow: var(--shadow-md); cursor: pointer; }
        .capture-control { width: 74px; height: 74px; border: 5px solid var(--white); border-radius: 50%; background: rgba(255, 255, 255, 0.28); box-shadow: 0 0 0 2px rgba(22, 61, 120, 0.36), var(--shadow-md); cursor: pointer; }
        .drag-tip { position: absolute; z-index: 7; right: 20px; bottom: 28%; max-width: 110px; padding: 9px 11px; border-radius: 13px; background: rgba(255, 255, 255, 0.9); color: var(--blue-700); font-size: 0.74rem; font-weight: 900; box-shadow: var(--shadow-sm); transform: rotate(-3deg); }
        .benefits-grid { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 18px; }
        .benefit-card { min-height: 240px; padding: 26px 22px; border: 1px solid rgba(37, 111, 222, 0.1); border-radius: 24px; background: linear-gradient(180deg, rgba(255, 255, 255, 0.98), rgba(245, 250, 255, 0.94)); text-align: center; box-shadow: var(--shadow-sm); transition: transform 0.2s ease, box-shadow 0.2s ease; }
        .benefit-card:hover { transform: translateY(-5px); box-shadow: var(--shadow-md); }
        .benefit-icon { width: 76px; height: 76px; display: grid; place-items: center; margin: 0 auto 18px; border-radius: 24px; color: var(--blue-600); background: var(--blue-100); box-shadow: inset 0 0 0 1px rgba(44, 124, 242, 0.1); }
        .benefit-icon i { width: 39px; height: 39px; stroke-width: 1.5; }
        .benefit-card h3 { margin-bottom: 9px; font-size: 1.22rem; font-weight: 800; }
        .benefit-card p { margin-bottom: 0; color: var(--muted); font-size: 0.9rem; }
        .cta-section { padding: 18px 0 80px; }
        .cta-card { position: relative; overflow: hidden; width: var(--container); min-height: 350px; margin-inline: auto; display: grid; grid-template-columns: 1.1fr 0.9fr; align-items: center; gap: 30px; padding: 48px 54px; border-radius: 34px; color: var(--white); background: radial-gradient(circle at 90% 15%, rgba(255, 255, 255, 0.2), transparent 22%), linear-gradient(135deg, #1f73eb, #0d58d8 62%, #1249b3); box-shadow: 0 30px 70px rgba(28, 91, 194, 0.25); }
        .cta-card::before, .cta-card::after { content: "✦"; position: absolute; color: rgba(255, 255, 255, 0.25); font-size: 4rem; }
        .cta-card::before { top: 24px; right: 34%; }
        .cta-card::after { right: 40px; bottom: 26px; font-size: 2.2rem; }
        .cta-copy { position: relative; z-index: 2; }
        .cta-copy h2 { max-width: 720px; margin-bottom: 14px; color: var(--white); font-size: clamp(2.5rem, 5vw, 4.3rem); font-weight: 800; }
        .cta-copy p { max-width: 620px; margin-bottom: 26px; color: rgba(255, 255, 255, 0.83); font-size: 1.02rem; }
        .pilot-proof { display: flex; align-items: center; gap: 14px; margin-top: 22px; }
        .avatars { display: flex; }
        .avatar { width: 39px; height: 39px; margin-left: -9px; display: grid; place-items: center; border: 3px solid rgba(255, 255, 255, 0.9); border-radius: 50%; background: linear-gradient(135deg, #d8eaff, #91bfff); color: var(--blue-900); font-size: 0.78rem; font-weight: 900; }
        .avatar:first-child { margin-left: 0; }
        .pilot-proof span { color: rgba(255, 255, 255, 0.86); font-size: 0.84rem; font-weight: 800; }
        .pilot-form { position: relative; z-index: 3; padding: 24px; border: 1px solid rgba(255, 255, 255, 0.18); border-radius: 26px; background: rgba(255, 255, 255, 0.14); backdrop-filter: blur(14px); }
        .pilot-form h3 { margin-bottom: 14px; color: var(--white); font-size: 1.55rem; }
        .field { display: grid; gap: 7px; margin-bottom: 12px; }
        .field label { color: rgba(255, 255, 255, 0.88); font-size: 0.78rem; font-weight: 900; }
        .field input { width: 100%; height: 50px; padding: 0 15px; border: 1px solid rgba(255, 255, 255, 0.22); border-radius: 14px; outline: none; color: var(--navy); background: rgba(255, 255, 255, 0.94); transition: box-shadow 0.2s ease, border 0.2s ease; }
        .field input:focus { border-color: #9bc7ff; box-shadow: 0 0 0 4px rgba(255, 255, 255, 0.2); }
        .pilot-form .btn { width: 100%; margin-top: 5px; color: var(--blue-700); background: var(--white); }
        footer { padding: 24px 0 34px; }
        .footer-inner { display: flex; align-items: center; justify-content: space-between; gap: 20px; color: var(--muted); font-size: 0.84rem; }
        .footer-mini { display: flex; gap: 20px; font-weight: 800; }
        .modal { position: fixed; z-index: 2000; inset: 0; display: grid; place-items: center; padding: 22px; background: rgba(13, 35, 72, 0.54); backdrop-filter: blur(10px); opacity: 0; visibility: hidden; transition: opacity 0.22s ease, visibility 0.22s ease; }
        .modal.open { opacity: 1; visibility: visible; }
        .modal-card { position: relative; width: min(460px, 100%); padding: 28px; border-radius: 28px; background: var(--white); box-shadow: var(--shadow-lg); text-align: center; transform: translateY(12px) scale(0.98); transition: transform 0.22s ease; }
        .modal.open .modal-card { transform: translateY(0) scale(1); }
        .modal-close { position: absolute; top: 14px; right: 14px; width: 40px; height: 40px; display: grid; place-items: center; border: 0; border-radius: 50%; color: var(--navy); background: var(--blue-100); cursor: pointer; }
        .modal-icon { width: 74px; height: 74px; display: grid; place-items: center; margin: 0 auto 18px; border-radius: 24px; color: var(--blue-700); background: var(--blue-100); }
        .modal-icon i { width: 38px; height: 38px; }
        .modal-card h3 { margin-bottom: 10px; font-size: 2rem; }
        .modal-card p { margin-bottom: 20px; color: var(--muted); }
        .qr-fake { width: 176px; height: 176px; margin: 0 auto 18px; padding: 12px; border: 8px solid var(--blue-100); border-radius: 22px; background: linear-gradient(90deg, var(--navy) 10px, transparent 10px) 0 0/30px 30px, linear-gradient(var(--navy) 10px, transparent 10px) 0 0/30px 30px, linear-gradient(90deg, transparent 20px, var(--navy) 20px 30px, transparent 30px) 5px 8px/44px 44px, white; box-shadow: inset 0 0 0 2px rgba(20, 60, 130, 0.08); }
        .toast { position: fixed; z-index: 3000; right: 24px; bottom: 24px; max-width: min(380px, calc(100% - 48px)); display: flex; align-items: flex-start; gap: 12px; padding: 16px 18px; border: 1px solid rgba(45, 124, 242, 0.14); border-radius: 18px; background: rgba(255, 255, 255, 0.95); box-shadow: var(--shadow-lg); backdrop-filter: blur(12px); opacity: 0; transform: translateY(16px); pointer-events: none; transition: opacity 0.22s ease, transform 0.22s ease; }
        .toast.show { opacity: 1; transform: translateY(0); }
        .toast i { width: 22px; height: 22px; color: var(--blue-700); flex: 0 0 auto; }
        .toast strong { display: block; color: var(--navy); margin-bottom: 2px; }
        .toast span { color: var(--muted); font-size: 0.86rem; }
        .reveal { opacity: 0; transform: translateY(22px); transition: opacity 0.65s ease, transform 0.65s ease; }
        .reveal.visible { opacity: 1; transform: translateY(0); }
        @keyframes float { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-10px); } }
        .hero-chair, .hero-sofa { animation: float 5.5s ease-in-out infinite; }
        .hero-sofa { animation-delay: -2.2s; }
        @media (max-width: 1020px) {
          .nav-links { gap: 18px; }
          .hero { min-height: 720px; }
          .hero-furniture { opacity: 0.52; }
          .comparison-top { grid-template-columns: 1fr; }
          .comparison-image { height: 200px; }
          .demo-layout { grid-template-columns: 1fr; }
          .demo-intro { text-align: center; }
          .demo-intro .btn { align-self: center; }
          .demo-note { max-width: 600px; margin-inline: auto; }
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
          .hero { min-height: 720px; padding-top: 70px; }
          .hero-furniture { bottom: 20px; width: 260px; opacity: 0.23; }
          .hero-sofa { width: 320px; }
          .comparison-grid, .steps { grid-template-columns: 1fr; }
          .steps { gap: 38px; }
          .section-card { padding: 38px 22px; }
          .widget { grid-template-columns: 1fr; }
          .product-panel { border-right: 0; border-bottom: 1px solid rgba(26, 91, 184, 0.09); }
          .ar-stage { min-height: 480px; }
          .cta-card { padding: 38px 26px; }
          .footer-inner { flex-direction: column; text-align: center; }
        }
        @media (max-width: 560px) {
          :root { --container: min(100% - 22px, 1180px); }
          .section { padding: 62px 0; }
          .navbar-shell { padding-top: 10px; }
          .navbar { min-height: 62px; padding: 8px 10px 8px 13px; border-radius: 18px; }
          .logo-mark { width: 37px; height: 37px; border-radius: 11px; }
          .brand { font-size: 1.5rem; }
          .hero { min-height: 690px; padding: 62px 0 90px; }
          .hero h1 { font-size: clamp(3rem, 14.8vw, 4.2rem); }
          .hero-actions { display: grid; }
          .hero-actions .btn { width: min(100%, 330px); min-width: 0; }
          .hero-pills { gap: 7px; }
          .micro-pill { padding: 9px 10px; font-size: 0.74rem; }
          .hero-chair { left: -86px; }
          .hero-sofa { right: -116px; }
          .comparison-card { min-height: 0; padding: 18px; }
          .comparison-image { height: 190px; }
          .benefits-grid { grid-template-columns: 1fr; }
          .widget { border-width: 5px; border-radius: 24px; }
          .product-panel { padding: 22px 18px; }
          .ar-stage { min-height: 430px; }
          .lock-pill { display: none; }
          .drag-tip { display: none; }
          .cta-card { border-radius: 26px; }
          .cta-copy h2 { font-size: 2.7rem; }
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

          <a className="btn btn-primary btn-small" href="#piloto">Quiero ser piloto</a>

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
                <span className="eyebrow"><i data-lucide="sparkles"></i> Probalo en vivo</span>
                <h2>Viendo es creyendo</h2>
                <p>Cambiá el color del sillón y arrastralo dentro del ambiente. En el celular, el botón abre una simulación del acceso por realidad aumentada.</p>

                <button className="btn btn-primary" id="openDemoButton" type="button">
                  <i data-lucide="scan-line"></i>
                  Escanear demo
                </button>

                <div className="demo-note">
                  <i data-lucide="move"></i>
                  <span>En la demo podés mover el sillón. En la versión real se ancla al piso y mantiene su escala exacta.</span>
                </div>
              </div>

              <div className="widget">
                <aside className="product-panel">
                  <h3>Sillón Nórdico</h3>
                  <div className="price">$ 499.990</div>

                  <span className="label">Colores disponibles</span>
                  <div className="swatches" role="group" aria-label="Seleccionar color">
                    <button className="swatch active" style={{ background: '#5f9ae8' }} data-color="#5f9ae8" aria-label="Azul"></button>
                    <button className="swatch" style={{ background: '#9ba7b6' }} data-color="#9ba7b6" aria-label="Gris"></button>
                    <button className="swatch" style={{ background: '#d9d1c3' }} data-color="#d9d1c3" aria-label="Beige"></button>
                    <button className="swatch" style={{ background: '#9bb7a9' }} data-color="#9bb7a9" aria-label="Verde"></button>
                  </div>

                  <div className="measurements">
                    <div className="measure"><span><i data-lucide="move-horizontal"></i> Ancho</span><span>80 cm</span></div>
                    <div className="measure"><span><i data-lucide="move-horizontal"></i> Profundidad</span><span>85 cm</span></div>
                    <div className="measure"><span><i data-lucide="move-vertical"></i> Alto</span><span>90 cm</span></div>
                  </div>

                  <button className="btn btn-primary" id="viewInSpaceButton" type="button">
                    Ver en mi espacio
                    <i data-lucide="box"></i>
                  </button>

                  <div className="powered-by">Con tecnología de <strong>Reality</strong></div>
                </aside>

                <div className="ar-stage" id="arStage">
                  <button className="top-control" id="resetChairButton" type="button" aria-label="Reiniciar posición">
                    <i data-lucide="rotate-ccw"></i>
                  </button>

                  <span className="lock-pill"><i data-lucide="lock-keyhole"></i> Escala real bloqueada</span>

                  <button className="top-control help" id="helpButton" type="button" aria-label="Ayuda">
                    <i data-lucide="help-circle"></i>
                  </button>

                  <div className="chair-wrap" id="chair">
                    <svg className="chair-svg" viewBox="0 0 430 420" aria-label="Sillón nórdico">
                      <ellipse className="chair-shadow" cx="215" cy="380" rx="160" ry="24" />
                      <path className="chair-color" d="M110 162c0-71 43-113 105-113s105 42 105 113v116H110z" />
                      <rect className="chair-color" x="77" y="226" width="276" height="113" rx="48" />
                      <rect className="chair-color" x="66" y="201" width="84" height="144" rx="38" />
                      <rect className="chair-color" x="280" y="201" width="84" height="144" rx="38" />
                      <path d="M119 337h34l-12 64h-39zM277 337h34l17 64h-39z" fill="#ba9871" />
                      <path d="M133 173c37 17 127 17 164 0" fill="none" stroke="rgba(255,255,255,.24)" strokeWidth="8" strokeLinecap="round" />
                    </svg>
                  </div>

                  <div className="drag-tip">Arrastrame por la habitación</div>

                  <div className="demo-controls">
                    <button className="circle-control" id="scaleDownButton" type="button" aria-label="Reducir"><i data-lucide="minus"></i></button>
                    <button className="capture-control" id="captureButton" type="button" aria-label="Capturar"></button>
                    <button className="circle-control" id="scaleUpButton" type="button" aria-label="Aumentar"><i data-lucide="plus"></i></button>
                  </div>
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

      <div className="modal" id="demoModal" role="dialog" aria-modal="true" aria-labelledby="modalTitle">
        <div className="modal-card">
          <button className="modal-close" id="closeModalButton" type="button" aria-label="Cerrar">
            <i data-lucide="x"></i>
          </button>
          <div className="modal-icon"><i data-lucide="scan-line"></i></div>
          <h3 id="modalTitle">Abrí Reality desde tu celular</h3>
          <p>Escaneá este código o abrí la demo en tu teléfono para probar el sillón en tu ambiente.</p>
          <div className="qr-fake" aria-hidden="true"></div>
          <button className="btn btn-primary" id="simulateARButton" type="button">
            Simular acceso desde el celular
            <i data-lucide="smartphone"></i>
          </button>
        </div>
      </div>

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
