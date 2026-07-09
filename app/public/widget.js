/**
 * Ébano — Widget embebible
 * ==========================================================
 * Cómo lo usa una mueblería en SU sitio (sitio ajeno):
 *
 *   <script src="https://TU-DOMINIO.vercel.app/widget.js"></script>
 *   <div data-ebano-product="ID-DEL-PRODUCTO-EN-SUPABASE"></div>
 *
 * El ID del producto es el UUID que le asigna Supabase a cada
 * fila de la tabla "products" (columna "id"). Se consigue
 * entrando a Supabase → Table Editor → products → copiar el
 * valor de "id" de la fila que querés mostrar.
 * ==========================================================
 */
(function () {
  'use strict';

  // -----------------------------------------------------------
  // CONFIGURACIÓN — completar con los datos reales del proyecto
  // (son los mismos valores que están en .env.local)
  // -----------------------------------------------------------
  var SUPABASE_URL = 'https://TU-PROYECTO.supabase.co';
  var SUPABASE_ANON_KEY = 'TU-ANON-KEY-PUBLICA';
  // -----------------------------------------------------------

  var MODEL_VIEWER_SRC = 'https://unpkg.com/@google/model-viewer/dist/model-viewer.min.js';
  var modelViewerLoading = null;

  function ensureModelViewer() {
    if (window.customElements && window.customElements.get('model-viewer')) {
      return Promise.resolve();
    }
    if (modelViewerLoading) return modelViewerLoading;
    modelViewerLoading = new Promise(function (resolve, reject) {
      var script = document.createElement('script');
      script.type = 'module';
      script.src = MODEL_VIEWER_SRC;
      script.onload = function () { resolve(); };
      script.onerror = reject;
      document.head.appendChild(script);
    });
    return modelViewerLoading;
  }

  function fetchProduct(productId) {
    var url = SUPABASE_URL + '/rest/v1/products?id=eq.' + encodeURIComponent(productId) +
      '&status=eq.published&select=id,name,price,alto,ancho,fondo,model_url';
    return fetchFromSupabase(url);
  }

  function fetchProductBySlug(slug) {
    var url = SUPABASE_URL + '/rest/v1/products?slug=eq.' + encodeURIComponent(slug) +
      '&status=eq.published&select=id,name,price,alto,ancho,fondo,model_url';
    return fetchFromSupabase(url);
  }

  function fetchFromSupabase(url) {
    return fetch(url, {
      headers: {
        apikey: SUPABASE_ANON_KEY,
        Authorization: 'Bearer ' + SUPABASE_ANON_KEY,
      },
    })
      .then(function (res) {
        if (!res.ok) throw new Error('No se pudo consultar el producto');
        return res.json();
      })
      .then(function (rows) {
        if (!rows || rows.length === 0) {
          throw new Error('Producto no encontrado o no publicado');
        }
        return rows[0];
      });
  }

  // Deriva un slug candidato del último segmento de la URL actual.
  // Ej: https://sitio.com/productos/sillon-estocolmo -> "sillon-estocolmo"
  function slugFromUrl() {
    var parts = window.location.pathname.split('/').filter(Boolean);
    return parts.length ? decodeURIComponent(parts[parts.length - 1]) : null;
  }

  function buildWidget(container, product) {
    // Shadow DOM: aísla por completo los estilos del widget de los
    // del sitio anfitrión, para que no choquen entre sí.
    var root = container.attachShadow ? container.attachShadow({ mode: 'open' }) : container;

    var style = document.createElement('style');
    style.textContent = [
      ':host { all: initial; }',
      '.ebn-box { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;',
      '  border: 1px solid #E4DED0; background: #FBF9F4; border-radius: 8px; padding: 14px 16px; }',
      '.ebn-badge { display:inline-block; font-family: monospace; font-size: 10px; color: #8a7d63;',
      '  background: #F1EAD9; padding: 3px 8px; border-radius: 20px; letter-spacing: .03em; margin-bottom: 10px; }',
      '.ebn-btn { width: 100%; background: #332C24; color: #EDE6D8; border: none;',
      '  padding: 13px; border-radius: 6px; font-size: 14px; font-weight: 700; cursor: pointer; }',
      '.ebn-btn:hover { background: #211D18; }',
      '.ebn-hint { font-size: 11.5px; color: #8a8375; margin-top: 8px; text-align: center; }',
      '.ebn-overlay { position: fixed; inset: 0; background: rgba(17,19,24,.6); display: flex;',
      '  align-items: center; justify-content: center; z-index: 999999; }',
      '.ebn-modal { background: #F7F3EA; width: 520px; max-width: 92vw; border-radius: 10px; padding: 20px;',
      '  font-family: -apple-system, BlinkMacSystemFont, sans-serif; }',
      '.ebn-modal-top { display:flex; justify-content: space-between; align-items:center; margin-bottom: 12px; }',
      '.ebn-close { background: none; border: none; font-size: 18px; color: #8a8375; cursor: pointer; }',
      '.ebn-frame { width: 100%; height: 320px; background: #fbfaf6; border-radius: 8px; overflow: hidden; }',
      'model-viewer { width: 100%; height: 100%; }',
      '.ebn-ar-btn { background: #6B4A32; color: #fff; border: none; padding: 10px 16px;',
      '  border-radius: 6px; font-size: 13px; font-weight: 700; cursor: pointer; }',
      '.ebn-modal-hint { font-size: 11.5px; color: #8a8375; margin-top: 10px; }',
      '.ebn-poweredby { font-size: 10.5px; color: #a89a7d; margin-top: 14px; text-align: center;',
      '  font-family: monospace; }',
    ].join('\n');
    root.appendChild(style);

    var box = document.createElement('div');
    box.className = 'ebn-box';
    box.innerHTML =
      '<span class="ebn-badge">AR · Ébano</span>' +
      '<button class="ebn-btn" type="button">Ver este mueble en tu casa</button>' +
      '<div class="ebn-hint">Probalo a escala real con la cámara de tu celular</div>';
    root.appendChild(box);

    box.querySelector('.ebn-btn').addEventListener('click', function () {
      openARModal(root, product);
    });
  }

  function openARModal(root, product) {
    ensureModelViewer().then(function () {
      var overlay = document.createElement('div');
      overlay.className = 'ebn-overlay';
      overlay.innerHTML =
        '<div class="ebn-modal">' +
        '  <div class="ebn-modal-top">' +
        '    <strong>' + escapeHtml(product.name) + ' — ' + escapeHtml(product.price) + '</strong>' +
        '    <button class="ebn-close" type="button">✕</button>' +
        '  </div>' +
        '  <div class="ebn-frame">' +
        '    <model-viewer src="' + escapeAttr(product.model_url) + '" camera-controls auto-rotate' +
        '      shadow-intensity="1" exposure="0.95" environment-image="neutral"' +
        '      camera-orbit="35deg 78deg 2.6m" ar ar-modes="webxr scene-viewer quick-look">' +
        '      <button slot="ar-button" class="ebn-ar-btn">Ver en tu espacio (AR)</button>' +
        '    </model-viewer>' +
        '  </div>' +
        '  <p class="ebn-modal-hint">Desde el celular esto abre la cámara real. ' +
             product.alto + ' × ' + product.ancho + ' × ' + product.fondo + ' cm.</p>' +
        '  <div class="ebn-poweredby">⚡ Powered by Ébano</div>' +
        '</div>';
      root.appendChild(overlay);
      overlay.querySelector('.ebn-close').addEventListener('click', function () {
        overlay.remove();
      });
      overlay.addEventListener('click', function (e) {
        if (e.target === overlay) overlay.remove();
      });
    });
  }

  function escapeHtml(str) {
    return String(str).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function escapeAttr(str) {
    return escapeHtml(str);
  }

  function showError(container, message) {
    container.innerHTML =
      '<div style="font-family:sans-serif;font-size:12px;color:#8C3B2E;">' +
      'Reality AR: ' + escapeHtml(message) + '</div>';
    console.error('[Reality widget]', message);
  }

  function init() {
    // Modo manual (compatibilidad con instalaciones anteriores):
    // <div data-ebano-product="UUID-o-slug"></div>
    var manual = document.querySelectorAll('[data-ebano-product]');
    manual.forEach(function (container) {
      var productId = container.getAttribute('data-ebano-product');
      if (!productId) return;
      fetchProduct(productId)
        .then(function (product) { buildWidget(container, product); })
        .catch(function (err) { showError(container, err.message); });
    });

    // Modo automático (instalación única en la plantilla del sitio):
    // <div data-ebano-auto></div>
    // Detecta el producto solo, leyendo el slug de la URL actual.
    var auto = document.querySelectorAll('[data-ebano-auto]');
    if (auto.length) {
      var slug = slugFromUrl();
      if (!slug) {
        auto.forEach(function (c) { showError(c, 'no se pudo detectar el producto en esta URL'); });
        return;
      }
      auto.forEach(function (container) {
        fetchProductBySlug(slug)
          .then(function (product) { buildWidget(container, product); })
          .catch(function () {
            // Si no hay producto para este slug, no mostramos error visible:
            // simplemente esta página no tiene un producto cargado en Reality todavía.
            container.style.display = 'none';
          });
      });
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
