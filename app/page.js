'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Script from 'next/script';
import { supabase } from '../lib/supabaseClient';

export default function HomePage() {
  const [products, setProducts] = useState([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const selected = products[selectedIndex] || null;

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
    if (window.lucide) window.lucide.createIcons();
  }, [products, selectedIndex]);

  useEffect(() => {
    document.title = 'Reality — Probá los muebles en tu casa';

    if (window.lucide) window.lucide.createIcons();

    const menuButton = document.getElementById('menuButton');
    const navLinks = document.getElementById('navLinks');
    const pilotForm = document.getElementById('pilotForm');

    if (!menuButton || !navLinks || !pilotForm) return;

    function handleMenuClick() {
      const isOpen = navLinks.classList.toggle('open');

      menuButton.setAttribute('aria-expanded', String(isOpen));
      menuButton.innerHTML = isOpen
        ? '<i data-lucide="x"></i>'
        : '<i data-lucide="menu"></i>';

      if (window.lucide) window.lucide.createIcons();
    }

    menuButton.addEventListener('click', handleMenuClick);

    const navLinkEls = navLinks.querySelectorAll('a');

    function closeMenu() {
      navLinks.classList.remove('open');
      menuButton.setAttribute('aria-expanded', 'false');
      menuButton.innerHTML = '<i data-lucide="menu"></i>';

      if (window.lucide) window.lucide.createIcons();
    }

    navLinkEls.forEach((link) => {
      link.addEventListener('click', closeMenu);
    });

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

    document.querySelectorAll('.reveal').forEach((el) => {
      revealObserver.observe(el);
    });

    const toast = document.getElementById('toast');
    const toastTitle = document.getElementById('toastTitle');
    const toastMessage = document.getElementById('toastMessage');

    let toastTimer;

    function showToast(title, message) {
      if (!toast || !toastTitle || !toastMessage) return;

      clearTimeout(toastTimer);

      toastTitle.textContent = title;
      toastMessage.textContent = message;
      toast.classList.add('show');

      toastTimer = setTimeout(() => {
        toast.classList.remove('show');
      }, 3400);
    }

    async function handlePilotSubmit(event) {
      event.preventDefault();

      const businessName = document
        .getElementById('businessName')
        ?.value.trim();

      const contactEmail = document
        .getElementById('contactEmail')
        ?.value.trim();

      const website = document
        .getElementById('website')
        ?.value.trim();

      const submitButton = event.currentTarget.querySelector(
        'button[type="submit"]'
      );

      if (!submitButton) return;

      const originalLabel = submitButton.innerHTML;

      submitButton.disabled = true;
      submitButton.textContent = 'Enviando…';

      try {
        const res = await fetch('/api/pilot-lead', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            businessName,
            contactEmail,
            website,
          }),
        });

        const data = await res.json();

        if (!res.ok || data.error) {
          throw new Error(data.error || 'No se pudo enviar');
        }

        showToast(
          'Solicitud enviada',
          `${businessName || 'Tu mueblería'} quedó registrada para la prueba piloto.`
        );

        event.currentTarget.reset();
      } catch (error) {
        showToast(
          'No se pudo enviar',
          'Revisá los datos e intentá de nuevo en un momento.'
        );
      } finally {
        submitButton.disabled = false;
        submitButton.innerHTML = originalLabel;

        if (window.lucide) window.lucide.createIcons();
      }
    }

    pilotForm.addEventListener('submit', handlePilotSubmit);

    return () => {
      clearTimeout(toastTimer);
      revealObserver.disconnect();

      menuButton.removeEventListener('click', handleMenuClick);
      pilotForm.removeEventListener('submit', handlePilotSubmit);

      navLinkEls.forEach((link) => {
        link.removeEventListener('click', closeMenu);
      });
    };
  }, []);

  return (
    <>
      <link rel="preconnect" href="https://fonts.googleapis.com" />

      <link
        rel="preconnect"
        href="https://fonts.gstatic.com"
        crossOrigin=""
      />

      <link
        href="https://fonts.googleapis.com/css2?family=Baloo+2:wght@500;600;700;800&family=Nunito:wght@400;500;600;700;800;900&display=swap"
        rel="stylesheet"
      />

      <Script
        src="https://unpkg.com/lucide@0.468.0/dist/umd/lucide.js"
        strategy="beforeInteractive"
      />

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

        * {
          box-sizing: border-box;
        }

        html {
          scroll-behavior: smooth;
          scroll-padding-top: 100px;
        }

        body {
          margin: 0;
          color: var(--text);
          background:
            radial-gradient(
              circle at 12% 5%,
              rgba(141, 194, 255, 0.22),
              transparent 20%
            ),
            radial-gradient(
              circle at 92% 11%,
              rgba(203, 227, 255, 0.52),
              transparent 18%
            ),
            linear-gradient(
              180deg,
              #fbfdff 0%,
              #f4f9ff 48%,
              #ffffff 100%
            );
          font-family: "Nunito", sans-serif;
          line-height: 1.55;
          overflow-x: hidden;
        }

        img,
        svg {
          display: block;
          max-width: 100%;
        }

        button,
        input,
        textarea {
          font: inherit;
        }

        button,
        a {
          -webkit-tap-highlight-color: transparent;
        }

        a {
          color: inherit;
          text-decoration: none;
        }

        h1,
        h2,
        h3,
        h4,
        p {
          margin-top: 0;
        }

        h1,
        h2,
        h3,
        h4,
        .brand {
          font-family: "Baloo 2", sans-serif;
          color: var(--navy);
          line-height: 1.02;
          letter-spacing: -0.025em;
        }

        .container {
          width: var(--container);
          margin-inline: auto;
        }

        .section {
          padding: 56px 0;
        }

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

        .section-heading {
          max-width: 640px;
          margin: 0 auto 30px;
          text-align: center;
        }

        .section-heading h2 {
          margin-bottom: 10px;
          font-size: clamp(1.7rem, 3vw, 2.4rem);
          font-weight: 800;
        }

        .section-heading p {
          margin-bottom: 0;
          font-size: 0.96rem;
          color: var(--muted);
        }

        .eyebrow {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          margin-bottom: 14px;
          padding: 7px 12px;
          border: 1px solid rgba(43, 121, 239, 0.12);
          border-radius: 999px;
          background: rgba(255, 255, 255, 0.92);
          color: var(--blue-700);
          font-size: 0.78rem;
          font-weight: 900;
          box-shadow: var(--shadow-sm);
        }

        .eyebrow i {
          width: 14px;
          height: 14px;
        }

        .btn {
          min-height: 44px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          padding: 0 18px;
          border: 0;
          border-radius: 13px;
          cursor: pointer;
          font-weight: 900;
          font-size: 0.88rem;
          transition:
            transform 0.2s ease,
            box-shadow 0.2s ease,
            background 0.2s ease;
        }

        .btn:hover {
          transform: translateY(-2px);
        }

        .btn-primary {
          color: var(--white);
          background: linear-gradient(
            135deg,
            var(--blue-600),
            #0f5fe6
          );
          box-shadow: 0 10px 22px rgba(29, 108, 232, 0.28);
        }

        .btn-primary:hover {
          box-shadow: 0 14px 28px rgba(29, 108, 232, 0.34);
        }

        .btn-secondary {
          color: var(--blue-700);
          background: rgba(255, 255, 255, 0.95);
          border: 1px solid rgba(49, 126, 235, 0.14);
          box-shadow: var(--shadow-sm);
        }

        .btn-small {
          min-height: 38px;
          padding: 0 15px;
          border-radius: 11px;
          font-size: 0.82rem;
        }

        .btn i {
          width: 15px;
          height: 15px;
        }

        .navbar-shell {
          position: sticky;
          z-index: 1000;
          top: 0;
          padding: 12px 0 0;
          pointer-events: none;
        }

        .navbar {
          width: var(--container);
          min-height: 58px;
          margin-inline: auto;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 20px;
          padding: 8px 10px 8px 15px;
          border: 1px solid rgba(32, 112, 232, 0.1);
          border-radius: 18px;
          background: rgba(255, 255, 255, 0.83);
          box-shadow: 0 12px 36px rgba(42, 91, 161, 0.09);
          backdrop-filter: blur(20px);
          pointer-events: auto;
        }

        .logo {
          display: flex;
          align-items: center;
          gap: 8px;
          flex: 0 0 auto;
        }

        .logo-mark {
          width: 34px;
          height: 34px;
          display: grid;
          place-items: center;
          border: 2px solid var(--blue-600);
          border-radius: 10px;
          color: var(--blue-600);
          background: var(--white);
          box-shadow: inset 0 0 0 3px var(--blue-100);
        }

        .logo-mark i {
          width: 18px;
          height: 18px;
          stroke-width: 2.4;
        }

        .brand {
          font-size: 1.32rem;
          font-weight: 800;
          color: var(--blue-700);
        }

        .nav-links {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 20px;
          font-size: 0.82rem;
          font-weight: 900;
          color: var(--navy);
        }

        .nav-links a {
          transition: color 0.2s ease;
        }

        .nav-links a:hover {
          color: var(--blue-700);
        }

        .menu-button {
          display: none;
          width: 38px;
          height: 38px;
          place-items: center;
          border: 0;
          border-radius: 11px;
          background: var(--blue-100);
          color: var(--blue-700);
          cursor: pointer;
        }

        .hero {
          position: relative;
          min-height: 680px;
          display: flex;
          align-items: center;
          overflow: hidden;
          padding: 72px 0 118px;
          isolation: isolate;
          background:
            radial-gradient(
              circle at 50% 31%,
              rgba(255, 255, 255, 0.98) 0 22%,
              rgba(255, 255, 255, 0.5) 48%,
              transparent 71%
            ),
            linear-gradient(
              180deg,
              #f8fbff 0%,
              #f1f7ff 100%
            );
        }

        .hero::before {
          content: "";
          position: absolute;
          z-index: 0;
          top: 50px;
          left: -115px;
          width: 300px;
          height: 300px;
          border-radius: 50%;
          background: rgba(193, 221, 255, 0.35);
          box-shadow: 0 0 90px rgba(91, 157, 242, 0.08);
          pointer-events: none;
        }

        .hero::after {
          content: "";
          position: absolute;
          z-index: 0;
          top: 115px;
          left: 50%;
          width: 760px;
          height: 440px;
          border-radius: 50%;
          background: rgba(255, 255, 255, 0.58);
          filter: blur(34px);
          transform: translateX(-50%);
          pointer-events: none;
        }

        .hero-content {
          position: relative;
          z-index: 5;
          width: min(800px, calc(100% - 32px));
          max-width: 800px;
          margin: 0 auto;
          text-align: center;
        }

        .hero .eyebrow {
          margin-bottom: 22px;
          padding: 10px 17px;
          border-color: rgba(35, 113, 229, 0.1);
          border-radius: 999px;
          background: rgba(255, 255, 255, 0.95);
          font-size: 0.86rem;
          box-shadow: 0 10px 30px rgba(47, 94, 167, 0.08);
        }

        .hero .eyebrow i {
          width: 19px;
          height: 19px;
        }

        .hero h1 {
          margin-bottom: 24px;
          color: #14366f;
          font-size: clamp(3.35rem, 5.5vw, 5.05rem);
          font-weight: 800;
          line-height: 0.96;
          letter-spacing: -0.042em;
        }

        .hero h1 span {
          position: relative;
          display: block;
          width: max-content;
          max-width: 100%;
          margin: 8px auto 0;
          color: #176fe9;
        }

        .hero h1 span::after {
          content: "";
          position: absolute;
          right: 3%;
          bottom: -12px;
          left: 4%;
          height: 15px;
          border-top: 5px solid #287ef0;
          border-radius: 50%;
          transform: rotate(-1deg);
        }

        .hero-copy {
          max-width: 660px;
          margin: 0 auto 27px;
          color: #536c96;
          font-size: clamp(1rem, 1.3vw, 1.12rem);
          line-height: 1.62;
        }

        .hero-actions {
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          justify-content: center;
          gap: 12px;
          margin-bottom: 26px;
        }

        .hero-actions .btn {
          min-width: 235px;
          min-height: 53px;
          border-radius: 15px;
          font-size: 0.93rem;
        }

        .hero-actions .btn-primary {
          background: linear-gradient(
            180deg,
            #3188f8 0%,
            #1267ec 100%
          );
          box-shadow: 0 15px 30px rgba(28, 105, 228, 0.28);
        }

        .hero-actions .btn-secondary {
          background: rgba(255, 255, 255, 0.96);
          box-shadow: 0 11px 28px rgba(46, 87, 148, 0.09);
        }

        .hero-pills {
          display: flex;
          flex-wrap: wrap;
          justify-content: center;
          gap: 10px;
        }

        .micro-pill {
          min-height: 46px;
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 0 16px;
          border: 1px solid rgba(43, 121, 239, 0.09);
          border-radius: 14px;
          color: var(--blue-700);
          background: rgba(255, 255, 255, 0.93);
          font-size: 0.78rem;
          font-weight: 900;
          box-shadow: 0 10px 28px rgba(43, 89, 160, 0.08);
          backdrop-filter: blur(14px);
        }

        .micro-pill i {
          width: 19px;
          height: 19px;
        }

        .hero-scene {
          position: absolute;
          z-index: 2;
          bottom: 91px;
          width: clamp(250px, 23vw, 380px);
          pointer-events: none;
          user-select: none;
          filter: drop-shadow(
            0 24px 30px rgba(37, 77, 132, 0.12)
          );
        }

        .hero-scene img {
          width: 100%;
          height: auto;
          display: block;
          object-fit: contain;
        }

        .hero-scene-left {
          left: max(-5px, calc((100vw - 1540px) / 2));
        }

        .hero-scene-right {
          right: max(-5px, calc((100vw - 1540px) / 2));
          width: clamp(270px, 24vw, 400px);
        }

        .hero-dots {
          position: absolute;
          z-index: 1;
          top: 105px;
          right: 1.8%;
          width: 132px;
          height: 82px;
          opacity: 0.5;
          background-image: radial-gradient(
            circle,
            #6ca5f1 2.3px,
            transparent 2.6px
          );
          background-size: 24px 24px;
          pointer-events: none;
        }

        .hero-wave {
          position: absolute;
          z-index: 3;
          right: 0;
          bottom: -1px;
          left: 0;
          width: 100%;
          height: 72px;
          pointer-events: none;
        }

        .hero-wave path {
          fill: #ffffff;
        }

        .comparison-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 16px;
        }

        .comparison-card {
          position: relative;
          overflow: hidden;
          min-height: 270px;
          padding: 18px;
          border-radius: 20px;
          border: 1px solid rgba(40, 95, 178, 0.08);
          box-shadow: var(--shadow-sm);
        }

        .comparison-card.bad {
          background:
            linear-gradient(
              135deg,
              rgba(255, 249, 250, 0.97),
              rgba(255, 242, 245, 0.88)
            ),
            #fff;
        }

        .comparison-card.good {
          background:
            linear-gradient(
              135deg,
              rgba(246, 251, 255, 0.98),
              rgba(234, 245, 255, 0.92)
            ),
            #fff;
        }

        .comparison-top {
          display: grid;
          grid-template-columns: 1fr 48%;
          gap: 16px;
          align-items: center;
          height: 100%;
        }

        .status-pill {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          width: max-content;
          margin-bottom: 13px;
          padding: 6px 9px;
          border-radius: 999px;
          background: var(--white);
          font-size: 0.74rem;
          font-weight: 900;
          box-shadow: var(--shadow-sm);
        }

        .bad .status-pill {
          color: #ef5668;
        }

        .good .status-pill {
          color: var(--blue-700);
        }

        .status-pill i {
          width: 14px;
          height: 14px;
        }

        .check-list {
          display: grid;
          gap: 9px;
          margin: 0;
          padding: 0;
          list-style: none;
          color: #516382;
          font-size: 0.82rem;
          font-weight: 700;
        }

        .check-list li {
          display: flex;
          align-items: flex-start;
          gap: 7px;
        }

        .check-list i {
          width: 14px;
          height: 14px;
          margin-top: 2px;
          flex: 0 0 auto;
        }

        .bad .check-list i {
          color: var(--danger);
        }

        .good .check-list i {
          color: var(--blue-700);
        }

        .comparison-image {
          position: relative;
          overflow: hidden;
          height: 190px;
          border-radius: 16px;
          background-position: center;
          background-size: cover;
          box-shadow: 0 12px 22px rgba(35, 65, 108, 0.14);
        }

        .bad .comparison-image {
          background-image:
            linear-gradient(
              rgba(67, 71, 78, 0.13),
              rgba(67, 71, 78, 0.13)
            ),
            url("https://images.unsplash.com/photo-1555041469-a586c61ea9bc?auto=format&fit=crop&w=900&q=88");
          filter: grayscale(0.5) saturate(0.75);
        }

        .good .comparison-image {
          background-image:
            linear-gradient(
              rgba(31, 92, 180, 0.04),
              rgba(31, 92, 180, 0.04)
            ),
            url("https://images.unsplash.com/photo-1556228453-efd6c1ff04f6?auto=format&fit=crop&w=900&q=88");
        }

        .comparison-badge {
          position: absolute;
          right: 12px;
          bottom: 12px;
          width: 44px;
          height: 44px;
          display: grid;
          place-items: center;
          border: 3px solid var(--white);
          border-radius: 50%;
          color: var(--white);
          box-shadow: 0 10px 24px rgba(30, 62, 111, 0.22);
        }

        .bad .comparison-badge {
          background: var(--danger);
        }

        .good .comparison-badge {
          background: var(--blue-700);
        }

        .steps {
          position: relative;
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 18px;
        }

        .step-card {
          position: relative;
          min-height: 250px;
          padding: 22px 18px 18px;
          border: 1px solid rgba(32, 114, 233, 0.1);
          border-radius: 20px;
          background: rgba(255, 255, 255, 0.92);
          text-align: center;
          box-shadow: var(--shadow-sm);
          transition:
            transform 0.2s ease,
            box-shadow 0.2s ease;
        }

        .step-card:hover {
          transform: translateY(-5px);
          box-shadow: var(--shadow-md);
        }

        .step-number {
          position: absolute;
          top: -15px;
          left: 50%;
          width: 34px;
          height: 34px;
          display: grid;
          place-items: center;
          border: 3px solid #f7fbff;
          border-radius: 50%;
          color: var(--white);
          background: linear-gradient(
            135deg,
            var(--blue-500),
            var(--blue-700)
          );
          font-family: "Baloo 2", sans-serif;
          font-size: 1.02rem;
          font-weight: 800;
          box-shadow: 0 8px 18px rgba(27, 105, 224, 0.28);
          transform: translateX(-50%);
        }

        .step-visual {
          position: relative;
          height: 108px;
          display: grid;
          place-items: center;
          margin-bottom: 14px;
        }

        .step-visual::before {
          content: "";
          position: absolute;
          width: 98px;
          height: 84px;
          border-radius: 18px;
          background: linear-gradient(
            145deg,
            #ffffff,
            var(--blue-100)
          );
          box-shadow: var(--shadow-sm);
        }

        .step-visual i {
          position: relative;
          z-index: 2;
          width: 50px;
          height: 50px;
          color: var(--blue-600);
          stroke-width: 1.45;
        }

        .step-card h3 {
          margin-bottom: 7px;
          font-size: 1.14rem;
          font-weight: 800;
        }

        .step-card p {
          margin-bottom: 0;
          color: var(--muted);
          font-size: 0.83rem;
        }

        .demo-section {
          background:
            radial-gradient(
              circle at 20% 50%,
              rgba(144, 196, 255, 0.22),
              transparent 30%
            ),
            linear-gradient(135deg, #f6fbff, #edf6ff);
        }

        .demo-layout {
          display: grid;
          grid-template-columns: 0.78fr 1.65fr;
          gap: 20px;
          align-items: stretch;
        }

        .demo-intro {
          display: flex;
          flex-direction: column;
          justify-content: center;
          padding: 12px 6px 12px 2px;
        }

        .demo-intro h2 {
          margin-bottom: 10px;
          font-size: clamp(1.7rem, 3vw, 2.4rem);
          font-weight: 800;
        }

        .demo-intro p {
          margin-bottom: 16px;
          color: var(--muted);
          font-size: 0.92rem;
        }

        .demo-note {
          display: flex;
          align-items: flex-start;
          gap: 9px;
          margin-top: 12px;
          padding: 11px;
          border: 1px solid rgba(44, 119, 231, 0.1);
          border-radius: 14px;
          background: rgba(255, 255, 255, 0.68);
          font-size: 0.78rem;
          box-shadow: var(--shadow-sm);
        }

        .demo-note i {
          width: 16px;
          height: 16px;
          color: var(--blue-700);
          flex: 0 0 auto;
        }

        .widget {
          overflow: hidden;
          display: grid;
          grid-template-columns: 230px 1fr;
          min-height: 400px;
          border: 6px solid rgba(255, 255, 255, 0.95);
          border-radius: 24px;
          background: var(--white);
          box-shadow: var(--shadow-lg);
        }

        .product-panel {
          position: relative;
          z-index: 4;
          padding: 18px 16px;
          border-right: 1px solid rgba(26, 91, 184, 0.09);
          background: rgba(255, 255, 255, 0.98);
          display: flex;
          flex-direction: column;
        }

        .label {
          display: block;
          margin-bottom: 8px;
          color: var(--muted);
          font-size: 0.7rem;
          font-weight: 900;
          text-transform: uppercase;
          letter-spacing: 0.03em;
        }

        .product-list {
          display: flex;
          flex-direction: column;
          gap: 6px;
          margin-bottom: 16px;
          overflow-y: auto;
          max-height: 210px;
        }

        .product-list-item {
          display: flex;
          flex-direction: column;
          align-items: flex-start;
          gap: 1px;
          padding: 9px 10px;
          border: 1px solid rgba(23, 73, 143, 0.1);
          border-radius: 11px;
          background: var(--white);
          cursor: pointer;
          text-align: left;
          transition:
            border-color 0.15s ease,
            background 0.15s ease;
        }

        .product-list-item strong {
          font-size: 0.82rem;
          color: var(--navy);
        }

        .product-list-item span {
          font-size: 0.72rem;
          color: var(--muted);
          font-weight: 700;
        }

        .product-list-item.active {
          border-color: var(--blue-600);
          background: var(--blue-50);
        }

        .product-list-item:hover {
          border-color: var(--blue-500);
        }

        .empty-note {
          font-size: 0.8rem;
          color: var(--muted);
          text-align: center;
          padding: 10px 4px;
        }

        .measurements {
          display: grid;
          gap: 8px;
          margin-bottom: 16px;
          margin-top: auto;
        }

        .measure {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          color: #5d6f8c;
          font-size: 0.76rem;
          font-weight: 800;
        }

        .measure span:first-child {
          display: flex;
          align-items: center;
          gap: 5px;
        }

        .measure i {
          width: 14px;
          height: 14px;
          color: var(--blue-700);
        }

        .powered-by {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 5px;
          color: #8a99b0;
          font-size: 0.66rem;
          font-weight: 800;
        }

        .powered-by strong {
          color: var(--blue-700);
        }

        .ar-stage {
          position: relative;
          overflow: hidden;
          min-height: 400px;
          background: #fafcff;
        }

        .ar-real-btn {
          background: var(--blue-600);
          color: #fff;
          border: none;
          padding: 10px 16px;
          border-radius: 999px;
          font-size: 0.8rem;
          font-weight: 800;
          cursor: pointer;
        }

        .lock-pill {
          position: absolute;
          z-index: 6;
          top: 13px;
          left: 50%;
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 6px 9px;
          border-radius: 999px;
          background: rgba(255, 255, 255, 0.9);
          color: var(--blue-700);
          font-size: 0.66rem;
          font-weight: 900;
          box-shadow: var(--shadow-sm);
          transform: translateX(-50%);
        }

        .lock-pill i {
          width: 11px;
          height: 11px;
        }

        .benefits-grid {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 14px;
        }

        .benefit-card {
          min-height: 185px;
          padding: 20px 16px;
          border: 1px solid rgba(37, 111, 222, 0.1);
          border-radius: 18px;
          background: linear-gradient(
            180deg,
            rgba(255, 255, 255, 0.98),
            rgba(245, 250, 255, 0.94)
          );
          text-align: center;
          box-shadow: var(--shadow-sm);
          transition:
            transform 0.2s ease,
            box-shadow 0.2s ease;
        }

        .benefit-card:hover {
          transform: translateY(-5px);
          box-shadow: var(--shadow-md);
        }

        .benefit-icon {
          width: 58px;
          height: 58px;
          display: grid;
          place-items: center;
          margin: 0 auto 13px;
          border-radius: 18px;
          color: var(--blue-600);
          background: var(--blue-100);
          box-shadow: inset 0 0 0 1px rgba(44, 124, 242, 0.1);
        }

        .benefit-icon i {
          width: 29px;
          height: 29px;
          stroke-width: 1.5;
        }

        .benefit-card h3 {
          margin-bottom: 6px;
          font-size: 1.02rem;
          font-weight: 800;
        }

        .benefit-card p {
          margin-bottom: 0;
          color: var(--muted);
          font-size: 0.8rem;
        }

        .cta-section {
          padding: 12px 0 56px;
        }

        .cta-card {
          position: relative;
          overflow: hidden;
          width: var(--container);
          min-height: 280px;
          margin-inline: auto;
          display: grid;
          grid-template-columns: 1.1fr 0.9fr;
          align-items: center;
          gap: 22px;
          padding: 32px 36px;
          border-radius: 26px;
          color: var(--white);
          background:
            radial-gradient(
              circle at 90% 15%,
              rgba(255, 255, 255, 0.2),
              transparent 22%
            ),
            linear-gradient(
              135deg,
              #1f73eb,
              #0d58d8 62%,
              #1249b3
            );
          box-shadow: 0 22px 52px rgba(28, 91, 194, 0.25);
        }

        .cta-card::before,
        .cta-card::after {
          content: "✦";
          position: absolute;
          color: rgba(255, 255, 255, 0.25);
          font-size: 3rem;
        }

        .cta-card::before {
          top: 18px;
          right: 34%;
        }

        .cta-card::after {
          right: 30px;
          bottom: 20px;
          font-size: 1.6rem;
        }

        .cta-copy {
          position: relative;
          z-index: 2;
        }

        .cta-copy h2 {
          max-width: 560px;
          margin-bottom: 10px;
          color: var(--white);
          font-size: clamp(1.9rem, 3.5vw, 2.8rem);
          font-weight: 800;
        }

        .cta-copy p {
          max-width: 480px;
          margin-bottom: 18px;
          color: rgba(255, 255, 255, 0.83);
          font-size: 0.9rem;
        }

        .pilot-proof {
          display: flex;
          align-items: center;
          gap: 11px;
          margin-top: 16px;
        }

        .avatars {
          display: flex;
        }

        .avatar {
          width: 31px;
          height: 31px;
          margin-left: -7px;
          display: grid;
          place-items: center;
          border: 2px solid rgba(255, 255, 255, 0.9);
          border-radius: 50%;
          background: linear-gradient(135deg, #d8eaff, #91bfff);
          color: var(--blue-900);
          font-size: 0.66rem;
          font-weight: 900;
        }

        .avatar:first-child {
          margin-left: 0;
        }

        .pilot-proof span {
          color: rgba(255, 255, 255, 0.86);
          font-size: 0.74rem;
          font-weight: 800;
        }

        .pilot-form {
          position: relative;
          z-index: 3;
          padding: 18px;
          border: 1px solid rgba(255, 255, 255, 0.18);
          border-radius: 20px;
          background: rgba(255, 255, 255, 0.14);
          backdrop-filter: blur(14px);
        }

        .pilot-form h3 {
          margin-bottom: 11px;
          color: var(--white);
          font-size: 1.24rem;
        }

        .field {
          display: grid;
          gap: 5px;
          margin-bottom: 10px;
        }

        .field label {
          color: rgba(255, 255, 255, 0.88);
          font-size: 0.7rem;
          font-weight: 900;
        }

        .field input {
          width: 100%;
          height: 40px;
          padding: 0 12px;
          border: 1px solid rgba(255, 255, 255, 0.22);
          border-radius: 11px;
          outline: none;
          color: var(--navy);
          background: rgba(255, 255, 255, 0.94);
          font-size: 0.86rem;
          transition:
            box-shadow 0.2s ease,
            border 0.2s ease;
        }

        .field input:focus {
          border-color: #9bc7ff;
          box-shadow: 0 0 0 4px rgba(255, 255, 255, 0.2);
        }

        .pilot-form .btn {
          width: 100%;
          margin-top: 4px;
          color: var(--blue-700);
          background: var(--white);
        }

        footer {
          padding: 24px 0 34px;
        }

        .footer-inner {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 20px;
          color: var(--muted);
          font-size: 0.84rem;
        }

        .footer-mini {
          display: flex;
          gap: 20px;
          font-weight: 800;
        }

        .toast {
          position: fixed;
          z-index: 3000;
          right: 24px;
          bottom: 24px;
          max-width: min(380px, calc(100% - 48px));
          display: flex;
          align-items: flex-start;
          gap: 12px;
          padding: 16px 18px;
          border: 1px solid rgba(45, 124, 242, 0.14);
          border-radius: 18px;
          background: rgba(255, 255, 255, 0.95);
          box-shadow: var(--shadow-lg);
          backdrop-filter: blur(12px);
          opacity: 0;
          transform: translateY(16px);
          pointer-events: none;
          transition:
            opacity 0.22s ease,
            transform 0.22s ease;
        }

        .toast.show {
          opacity: 1;
          transform: translateY(0);
        }

        .toast i {
          width: 22px;
          height: 22px;
          color: var(--blue-700);
          flex: 0 0 auto;
        }

        .toast strong {
          display: block;
          color: var(--navy);
          margin-bottom: 2px;
        }

        .toast span {
          color: var(--muted);
          font-size: 0.86rem;
        }

        .reveal {
          opacity: 0;
          transform: translateY(22px);
          transition:
            opacity 0.65s ease,
            transform 0.65s ease;
        }

        .reveal.visible {
          opacity: 1;
          transform: translateY(0);
        }

        @media (max-width: 1220px) {
          .hero {
            min-height: 650px;
          }

          .hero-content {
            max-width: 720px;
          }

          .hero h1 {
            font-size: clamp(3.1rem, 5.7vw, 4.55rem);
          }

          .hero-scene {
            bottom: 80px;
            width: clamp(220px, 24vw, 300px);
            opacity: 0.92;
          }

          .hero-scene-right {
            width: clamp(235px, 25vw, 320px);
          }
        }

        @media (max-width: 1020px) {
          .nav-links {
            gap: 18px;
          }

          .comparison-top {
            grid-template-columns: 1fr;
          }

          .comparison-image {
            height: 170px;
          }

          .demo-layout {
            grid-template-columns: 1fr;
          }

          .demo-intro {
            text-align: center;
          }

          .demo-note {
            max-width: 500px;
            margin-inline: auto;
          }

          .benefits-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }

          .cta-card {
            grid-template-columns: 1fr;
          }
        }

        @media (max-width: 930px) {
          .hero {
            min-height: 620px;
            padding-top: 64px;
          }

          .hero-content {
            max-width: 680px;
          }

          .hero-scene {
            bottom: 50px;
            width: 225px;
            opacity: 0.23;
          }

          .hero-scene-left {
            left: -65px;
          }

          .hero-scene-right {
            right: -75px;
            width: 245px;
          }

          .hero-dots {
            display: none;
          }
        }

        @media (max-width: 820px) {
          .navbar {
            position: relative;
          }

          .nav-links {
            position: absolute;
            top: calc(100% + 10px);
            right: 0;
            left: 0;
            display: grid;
            gap: 2px;
            padding: 12px;
            border: 1px solid rgba(31, 103, 214, 0.1);
            border-radius: 18px;
            background: rgba(255, 255, 255, 0.97);
            box-shadow: var(--shadow-md);
            opacity: 0;
            visibility: hidden;
            transform: translateY(-8px);
            transition:
              opacity 0.2s ease,
              transform 0.2s ease,
              visibility 0.2s ease;
          }

          .nav-links.open {
            opacity: 1;
            visibility: visible;
            transform: translateY(0);
          }

          .nav-links a {
            padding: 12px;
            border-radius: 12px;
          }

          .nav-links a:hover {
            background: var(--blue-100);
          }

          .navbar > .btn {
            display: none;
          }

          .menu-button {
            display: grid;
          }

          .comparison-grid,
          .steps {
            grid-template-columns: 1fr;
          }

          .steps {
            gap: 30px;
          }

          .section-card {
            padding: 26px 18px;
          }

          .widget {
            grid-template-columns: 1fr;
          }

          .product-panel {
            border-right: 0;
            border-bottom: 1px solid rgba(26, 91, 184, 0.09);
          }

          .ar-stage {
            min-height: 360px;
          }

          .cta-card {
            padding: 28px 20px;
          }

          .footer-inner {
            flex-direction: column;
            text-align: center;
          }
        }

        @media (max-width: 620px) {
          .hero {
            min-height: 650px;
            padding: 55px 0 105px;
          }

          .hero::before {
            width: 210px;
            height: 210px;
          }

          .hero .eyebrow {
            margin-bottom: 18px;
            padding: 8px 12px;
            font-size: 0.74rem;
          }

          .hero h1 {
            margin-bottom: 22px;
            font-size: clamp(2.7rem, 13vw, 3.75rem);
            line-height: 0.98;
          }

          .hero h1 span {
            margin-top: 6px;
          }

          .hero h1 span::after {
            bottom: -9px;
            border-top-width: 4px;
          }

          .hero-copy {
            font-size: 0.95rem;
          }

          .hero-actions {
            display: grid;
            width: 100%;
          }

          .hero-actions .btn {
            width: min(100%, 340px);
            min-width: 0;
            margin-inline: auto;
          }

          .hero-pills {
            gap: 7px;
          }

          .micro-pill {
            min-height: 40px;
            padding: 0 11px;
            font-size: 0.7rem;
          }

          .micro-pill i {
            width: 16px;
            height: 16px;
          }

          .hero-scene {
            display: none;
          }

          .hero-wave {
            height: 48px;
          }
        }

        @media (max-width: 560px) {
          :root {
            --container: min(100% - 22px, 1180px);
          }

          .section {
            padding: 44px 0;
          }

          .navbar-shell {
            padding-top: 10px;
          }

          .navbar {
            min-height: 54px;
            padding: 6px 8px 6px 11px;
            border-radius: 16px;
          }

          .logo-mark {
            width: 30px;
            height: 30px;
            border-radius: 9px;
          }

          .brand {
            font-size: 1.14rem;
          }

          .comparison-card {
            min-height: 0;
            padding: 14px;
          }

          .comparison-image {
            height: 150px;
          }

          .benefits-grid {
            grid-template-columns: 1fr;
          }

          .widget {
            border-width: 4px;
            border-radius: 20px;
          }

          .product-panel {
            padding: 16px 14px;
          }

          .ar-stage {
            min-height: 320px;
          }

          .lock-pill {
            display: none;
          }

          .cta-card {
            border-radius: 22px;
          }

          .cta-copy h2 {
            font-size: 2.1rem;
          }
        }
      `}</style>

      <div className="navbar-shell">
        <nav
          className="navbar"
          aria-label="Navegación principal"
        >
          <a
            className="logo"
            href="#inicio"
            aria-label="Reality, inicio"
          >
            <span className="logo-mark">
              <i data-lucide="armchair"></i>
            </span>

            <span className="brand">Reality</span>
          </a>

          <div className="nav-links" id="navLinks">
            <a href="#problema">El problema</a>
            <a href="#como-funciona">Cómo funciona</a>
            <a href="#demo">Demo</a>
            <a href="#beneficios">Beneficios</a>
          </div>

          <Link
            href="/login"
            className="btn btn-primary btn-small"
          >
            Iniciar sesión
          </Link>

          <button
            className="menu-button"
            id="menuButton"
            type="button"
            aria-label="Abrir menú"
            aria-expanded="false"
          >
            <i data-lucide="menu"></i>
          </button>
        </nav>
      </div>

      <main>
        <section className="hero" id="inicio">
          <div
            className="hero-dots"
            aria-hidden="true"
          ></div>

          <div
            className="hero-scene hero-scene-left"
            aria-hidden="true"
          >
            <img
              src="/reality-hero-left.png"
              alt=""
              width="360"
              height="365"
              loading="eager"
              draggable="false"
            />
          </div>

          <div
            className="hero-scene hero-scene-right"
            aria-hidden="true"
          >
            <img
              src="/reality-hero-right.png"
              alt=""
              width="380"
              height="350"
              loading="eager"
              draggable="false"
            />
          </div>

          <div className="hero-content reveal">
            <div className="eyebrow">
              <i data-lucide="sparkles"></i>
              Realidad aumentada para mueblerías
            </div>

            <h1>
              Tus clientes prueban los muebles en su casa
              <span>antes de comprar</span>
            </h1>

            <p className="hero-copy">
              Reality permite visualizar cada mueble en el ambiente
              real, con escala, proporciones y colores precisos.
              Más confianza, menos dudas y más ventas.
            </p>

            <div className="hero-actions">
              <a
                className="btn btn-primary"
                href="#piloto"
              >
                Quiero ser mueblería piloto
                <i data-lucide="arrow-right"></i>
              </a>

              <a
                className="btn btn-secondary"
                href="#demo"
              >
                <i data-lucide="play-circle"></i>
                Ver cómo funciona
              </a>
            </div>

            <div className="hero-pills">
              <span className="micro-pill">
                <i data-lucide="smartphone"></i>
                Sin apps
              </span>

              <span className="micro-pill">
                <i data-lucide="ruler"></i>
                Escala real
              </span>

              <span className="micro-pill">
                <i data-lucide="code-2"></i>
                Fácil de integrar
              </span>

              <span className="micro-pill">
                <i data-lucide="zap"></i>
                Listo en minutos
              </span>
            </div>
          </div>

          <svg
            className="hero-wave"
            viewBox="0 0 1440 80"
            preserveAspectRatio="none"
            aria-hidden="true"
          >
            <path d="M0,48 C180,12 310,73 520,54 C710,37 822,18 1030,52 C1200,79 1320,31 1440,45 L1440,80 L0,80 Z" />
          </svg>
        </section>

        <section className="section" id="problema">
          <div className="section-card reveal">
            <div className="section-heading">
              <span className="eyebrow">
                <i data-lucide="circle-help"></i>
                Menos incertidumbre
              </span>

              <h2>
                Comprar muebles hoy es incierto. Con Reality, ya no.
              </h2>

              <p>
                El cliente deja de imaginar cómo quedaría el producto
                y puede verlo directamente en su espacio antes de
                decidir.
              </p>
            </div>

            <div className="comparison-grid">
              <article className="comparison-card bad">
                <div className="comparison-top">
                  <div>
                    <div className="status-pill">
                      <i data-lucide="circle-x"></i>
                      Sin Reality
                    </div>

                    <ul className="check-list">
                      <li>
                        <i data-lucide="x-circle"></i>
                        No saben si va a quedar bien.
                      </li>

                      <li>
                        <i data-lucide="x-circle"></i>
                        Dudas sobre tamaño y color.
                      </li>

                      <li>
                        <i data-lucide="x-circle"></i>
                        Más preguntas antes de comprar.
                      </li>

                      <li>
                        <i data-lucide="x-circle"></i>
                        Devoluciones y cancelaciones.
                      </li>

                      <li>
                        <i data-lucide="x-circle"></i>
                        Menos confianza, menos ventas.
                      </li>
                    </ul>
                  </div>

                  <div className="comparison-image">
                    <div className="comparison-badge">
                      <i data-lucide="x"></i>
                    </div>
                  </div>
                </div>
              </article>

              <article className="comparison-card good">
                <div className="comparison-top">
                  <div>
                    <div className="status-pill">
                      <i data-lucide="badge-check"></i>
                      Con Reality
                    </div>

                    <ul className="check-list">
                      <li>
                        <i data-lucide="check-circle-2"></i>
                        Lo prueban en su espacio.
                      </li>

                      <li>
                        <i data-lucide="check-circle-2"></i>
                        Ven tamaño y proporciones reales.
                      </li>

                      <li>
                        <i data-lucide="check-circle-2"></i>
                        Compran con mayor confianza.
                      </li>

                      <li>
                        <i data-lucide="check-circle-2"></i>
                        Menos devoluciones.
                      </li>

                      <li>
                        <i data-lucide="check-circle-2"></i>
                        Más conversiones para tu tienda.
                      </li>
                    </ul>
                  </div>

                  <div className="comparison-image">
                    <div className="comparison-badge">
                      <i data-lucide="check"></i>
                    </div>
                  </div>
                </div>
              </article>
            </div>
          </div>
        </section>

        <section
          className="section"
          id="como-funciona"
        >
          <div className="container">
            <div className="section-heading reveal">
              <span className="eyebrow">
                <i data-lucide="workflow"></i>
                Configuración simple
              </span>

              <h2>Así de simple funciona</h2>

              <p>
                Nosotros nos ocupamos de la parte técnica para que tu
                equipo pueda empezar sin cambiar su forma de trabajar.
              </p>
            </div>

            <div className="steps">
              <article className="step-card reveal">
                <div className="step-number">1</div>

                <div className="step-visual">
                  <i data-lucide="cloud-upload"></i>
                </div>

                <h3>Enviás tus productos</h3>

                <p>
                  Subís fotos, medidas, colores y variantes desde un
                  panel simple e intuitivo.
                </p>
              </article>

              <article className="step-card reveal">
                <div className="step-number">2</div>

                <div className="step-visual">
                  <i data-lucide="scan-search"></i>
                </div>

                <h3>Revisamos y publicamos</h3>

                <p>
                  Nuestro equipo controla cada producto y lo deja listo
                  para usarse en realidad aumentada.
                </p>
              </article>

              <article className="step-card reveal">
                <div className="step-number">3</div>

                <div className="step-visual">
                  <i data-lucide="code-xml"></i>
                </div>

                <h3>Lo instalás en tu sitio</h3>

                <p>
                  Pegás un código simple y listo. No necesitás migrar
                  de plataforma ni rehacer tu tienda.
                </p>
              </article>
            </div>
          </div>
        </section>

        <section
          className="section demo-section"
          id="demo"
        >
          <div className="section-card reveal">
            <div className="demo-layout">
              <div className="demo-intro">
                <span className="eyebrow">
                  <i data-lucide="sparkles"></i>
                  Catálogo real
                </span>

                <h2>Viendo es creyendo</h2>

                <p>
                  Esto no es una simulación: son los productos reales
                  cargados en la plataforma. Elegí uno de la lista y
                  probalo en 3D.
                </p>

                <div className="demo-note">
                  <i data-lucide="move"></i>

                  <span>
                    Desde el celular, el botón “Ver en tu espacio” abre
                    la cámara real y ancla el mueble a escala exacta.
                  </span>
                </div>
              </div>

              <div className="widget">
                <aside className="product-panel">
                  <span className="label">
                    Catálogo publicado
                  </span>

                  <div className="product-list">
                    {products.length === 0 && (
                      <div className="empty-note">
                        Todavía no hay productos publicados.
                      </div>
                    )}

                    {products.map((product, index) => (
                      <button
                        key={product.id}
                        type="button"
                        className={
                          `product-list-item${
                            index === selectedIndex
                              ? ' active'
                              : ''
                          }`
                        }
                        onClick={() => {
                          setSelectedIndex(index);
                        }}
                      >
                        <strong>{product.name}</strong>
                        <span>{product.price}</span>
                      </button>
                    ))}
                  </div>

                  {selected && (
                    <div className="measurements">
                      <div className="measure">
                        <span>
                          <i data-lucide="move-horizontal"></i>
                          Ancho
                        </span>

                        <span>{selected.ancho} cm</span>
                      </div>

                      <div className="measure">
                        <span>
                          <i data-lucide="move-horizontal"></i>
                          Profundidad
                        </span>

                        <span>{selected.fondo} cm</span>
                      </div>

                      <div className="measure">
                        <span>
                          <i data-lucide="move-vertical"></i>
                          Alto
                        </span>

                        <span>{selected.alto} cm</span>
                      </div>
                    </div>
                  )}

                  <div className="powered-by">
                    Con tecnología de
                    <strong>Reality</strong>
                  </div>
                </aside>

                <div className="ar-stage">
                  <span className="lock-pill">
                    <i data-lucide="lock-keyhole"></i>
                    Escala real bloqueada
                  </span>

                  {selected ? (
                    // eslint-disable-next-line react/no-unknown-property
                    <model-viewer
                      key={selected.id}
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
                      style={{
                        width: '100%',
                        height: '100%',
                      }}
                    >
                      <button
                        slot="ar-button"
                        className="ar-real-btn"
                      >
                        Ver en tu espacio (AR)
                      </button>
                    </model-viewer>
                  ) : (
                    <div
                      className="empty-note"
                      style={{ padding: 40 }}
                    >
                      Cargando catálogo…
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </section>

        <section
          className="section"
          id="beneficios"
        >
          <div className="container">
            <div className="section-heading reveal">
              <span className="eyebrow">
                <i data-lucide="heart-handshake"></i>
                Hecho para mueblerías
              </span>

              <h2>
                Pensado para vender más sin complicar tu operación
              </h2>

              <p>
                Reality se adapta a tu tienda actual y deja la
                experiencia técnica resuelta para tu equipo y tus
                clientes.
              </p>
            </div>

            <div className="benefits-grid">
              <article className="benefit-card reveal">
                <div className="benefit-icon">
                  <i data-lucide="scan-3d"></i>
                </div>

                <h3>Escala real bloqueada</h3>

                <p>
                  Tus muebles se ven en tamaño real y con proporciones
                  exactas, sin distorsiones.
                </p>
              </article>

              <article className="benefit-card reveal">
                <div className="benefit-icon">
                  <i data-lucide="cloud-upload"></i>
                </div>

                <h3>Panel simple de carga</h3>

                <p>
                  Subí productos y variantes fácilmente. Nosotros nos
                  ocupamos de lo técnico.
                </p>
              </article>

              <article className="benefit-card reveal">
                <div className="benefit-icon">
                  <i data-lucide="blocks"></i>
                </div>

                <h3>Integración sin migrar</h3>

                <p>
                  Funciona con tu tienda actual: Shopify, Tiendanube,
                  WooCommerce o desarrollo propio.
                </p>
              </article>

              <article className="benefit-card reveal">
                <div className="benefit-icon">
                  <i data-lucide="globe-2"></i>
                </div>

                <h3>Funciona sin apps</h3>

                <p>
                  El cliente lo usa desde el navegador de su celular.
                  No necesita descargar nada.
                </p>
              </article>
            </div>
          </div>
        </section>

        <section
          className="cta-section"
          id="piloto"
        >
          <div className="cta-card reveal">
            <div className="cta-copy">
              <h2>
                Sumate como mueblería piloto y llevá tus ventas al
                siguiente nivel
              </h2>

              <p>
                Estamos seleccionando mueblerías que quieran probar
                Reality, sumar productos y crecer junto a nosotros
                desde el comienzo.
              </p>

              <div className="pilot-proof">
                <div
                  className="avatars"
                  aria-hidden="true"
                >
                  <span className="avatar">MR</span>
                  <span className="avatar">CN</span>
                  <span className="avatar">LM</span>
                </div>

                <span>
                  Más mueblerías ya están probando la experiencia.
                </span>
              </div>
            </div>

            <form
              className="pilot-form"
              id="pilotForm"
            >
              <h3>Quiero conocer Reality</h3>

              <div className="field">
                <label htmlFor="businessName">
                  Nombre de la mueblería
                </label>

                <input
                  id="businessName"
                  name="businessName"
                  type="text"
                  placeholder="Ej: Casa Nórdica"
                  required
                />
              </div>

              <div className="field">
                <label htmlFor="contactEmail">
                  Email de contacto
                </label>

                <input
                  id="contactEmail"
                  name="contactEmail"
                  type="email"
                  placeholder="hola@tumuebleria.com"
                  required
                />
              </div>

              <div className="field">
                <label htmlFor="website">
                  Sitio web o Instagram
                </label>

                <input
                  id="website"
                  name="website"
                  type="text"
                  placeholder="@tumuebleria"
                />
              </div>

              <button
                className="btn"
                type="submit"
              >
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
            <span className="logo-mark">
              <i data-lucide="armchair"></i>
            </span>

            <span className="brand">Reality</span>
          </div>

          <span>
            © 2026 Reality. Realidad aumentada para mueblerías.
          </span>

          <div className="footer-mini">
            <a href="#inicio">Inicio</a>
            <a href="#demo">Demo</a>
          </div>
        </div>
      </footer>

      <div
        className="toast"
        id="toast"
        role="status"
        aria-live="polite"
      >
        <i data-lucide="badge-check"></i>

        <div>
          <strong id="toastTitle">
            Listo
          </strong>

          <span id="toastMessage">
            La acción se completó correctamente.
          </span>
        </div>
      </div>
    </>
  );
}
