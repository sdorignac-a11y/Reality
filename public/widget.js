/**
 * Reality — Widget embebible (v2, botón flotante)
 * ==========================================================
 * Instalación única (se pega UNA VEZ en la plantilla de ficha
 * de producto del sitio del cliente):
 *
 *   <script src="https://TU-DOMINIO.vercel.app/widget.js"></script>
 *   <div data-ebano-auto></div>
 *
 * También sigue funcionando el modo manual (compatibilidad):
 *   <div data-ebano-product="ID-o-slug-del-producto"></div>
 *
 * El widget aparece como un botón flotante abajo a la derecha.
 * Al tocarlo, ofrece dos opciones:
 *   1) Ver el producto de esta página en 3D / AR
 *   2) Subir una foto del espacio y elegir del catálogo qué mueble probar
 *      (por ahora es una búsqueda manual — la sugerencia automática
 *      por IA todavía no está conectada)
 * ==========================================================
 */
(function () {
  'use strict';

  // -----------------------------------------------------------
  var SUPABASE_URL = 'https://loqapxtmxrdnzxencgxs.supabase.co';
  var SUPABASE_ANON_KEY = 'sb_publishable_C6HGGPizWvwmyttbvIC6UA_5gLeeh_1';
  // -----------------------------------------------------------

  var MODEL_VIEWER_SRC = 'https://unpkg.com/@google/model-viewer/dist/model-viewer.min.js';
  var modelViewerLoading = null;

  function ensureModelViewer() {
    if (window.customElements && window.customElements.get('model-viewer')) return Promise.resolve();
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

  function fetchFromSupabase(url) {
    return fetch(url, {
      headers: { apikey: SUPABASE_ANON_KEY, Authorization: 'Bearer ' + SUPABASE_ANON_KEY },
    })
      .then(function (res) {
        if (!res.ok) throw new Error('No se pudo consultar Supabase');
        return res.json();
      });
  }

  function fetchProductById(id) {
    var url = SUPABASE_URL + '/rest/v1/products?id=eq.' + encodeURIComponent(id) +
      '&status=eq.published&select=id,name,price,alto,ancho,fondo,model_url,slug';
    return fetchFromSupabase(url).then(function (rows) {
      if (!rows.length) throw new Error('Producto no encontrado');
      return rows[0];
    });
  }

  function fetchProductBySlug(slug) {
    var url = SUPABASE_URL + '/rest/v1/products?slug=eq.' + encodeURIComponent(slug) +
      '&status=eq.published&select=id,name,price,alto,ancho,fondo,model_url,slug';
    return fetchFromSupabase(url).then(function (rows) { return rows.length ? rows[0] : null; });
  }

  function fetchCatalog() {
    var url = SUPABASE_URL + '/rest/v1/products?status=eq.published' +
      '&select=id,name,price,alto,ancho,fondo,model_url,slug&order=created_at.desc';
    return fetchFromSupabase(url);
  }

  function slugFromUrl() {
    var parts = window.location.pathname.split('/').filter(Boolean);
    return parts.length ? decodeURIComponent(parts[parts.length - 1]) : null;
  }

  function escapeHtml(str) {
    return String(str).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  // -----------------------------------------------------------
  // UI: host flotante con Shadow DOM (aislado del sitio anfitrión)
  // -----------------------------------------------------------
  function buildFAB(currentProduct) {
    var host = document.createElement('div');
    host.style.all = 'initial';
    document.body.appendChild(host);
    var root = host.attachShadow ? host.attachShadow({ mode: 'open' }) : host;

    var style = document.createElement('style');
    style.textContent = [
      '*{box-sizing:border-box;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;}',
      '.fab{position:fixed;bottom:22px;right:22px;width:58px;height:58px;',
      '  background:#332C24;border-radius:50% 50% 4px 50%;transform:rotate(45deg);',
      '  box-shadow:0 10px 26px -8px rgba(0,0,0,.45);cursor:pointer;z-index:999999;',
      '  display:flex;align-items:center;justify-content:center;border:none;transition:transform .2s ease;}',
      '.fab:hover{transform:rotate(45deg) scale(1.06);}',
      '.fab svg{width:22px;height:22px;transform:rotate(-45deg);color:#EDE6D8;}',
      '.menu{position:fixed;bottom:92px;right:22px;z-index:999999;',
      '  display:flex;flex-direction:column;gap:10px;align-items:flex-end;}',
      '.menu.hidden{display:none;}',
      '.menu-item{background:#F7F3EA;border:1px solid #DED5C2;border-radius:10px;',
      '  padding:13px 16px;font-size:13.5px;font-weight:600;color:#211D18;cursor:pointer;',
      '  box-shadow:0 12px 24px -10px rgba(0,0,0,.3);white-space:nowrap;display:flex;align-items:center;gap:10px;}',
      '.menu-item:hover{background:#EDE6D8;}',
      '.menu-item .ic{font-size:15px;}',
      '.overlay{position:fixed;inset:0;background:rgba(17,19,24,.6);display:none;',
      '  align-items:center;justify-content:center;z-index:9999999;padding:20px;}',
      '.overlay.open{display:flex;}',
      '.modal{background:#F7F3EA;width:540px;max-width:100%;border-radius:12px;padding:22px;',
      '  max-height:88vh;overflow-y:auto;font-family:-apple-system,BlinkMacSystemFont,sans-serif;}',
      '.modal-top{display:flex;justify-content:space-between;align-items:center;margin-bottom:14px;}',
      '.modal-top strong{font-size:15px;}',
      '.close{background:none;border:none;font-size:19px;color:#8a8375;cursor:pointer;}',
      '.frame{width:100%;height:300px;background:#fbfaf6;border-radius:8px;overflow:hidden;margin-bottom:8px;}',
      'model-viewer{width:100%;height:100%;}',
      '.ar-btn{background:#6B4A32;color:#fff;border:none;padding:10px 16px;border-radius:6px;font-size:13px;font-weight:700;cursor:pointer;}',
      '.hint{font-size:11.5px;color:#8a8375;margin-top:8px;}',
      '.poweredby{font-size:10.5px;color:#a89a7d;margin-top:14px;text-align:center;font-family:monospace;}',

      '.upload-zone{border:1.5px dashed #DED5C2;border-radius:10px;padding:26px;text-align:center;',
      '  cursor:pointer;background:#fff;margin-bottom:16px;}',
      '.upload-zone img{max-width:100%;max-height:160px;border-radius:6px;}',
      '.upload-zone p{font-size:12.5px;color:#8a8375;margin-top:8px;}',
      '.cat-note{font-size:12px;color:#8a8375;background:#F1EAD9;padding:10px 12px;border-radius:6px;margin-bottom:16px;line-height:1.5;}',
      '.cat-list{display:flex;flex-direction:column;gap:10px;}',
      '.cat-item{display:flex;justify-content:space-between;align-items:center;',
      '  border:1px solid #DED5C2;border-radius:8px;padding:12px 14px;background:#fff;}',
      '.cat-item .info strong{font-size:13.5px;display:block;}',
      '.cat-item .info span{font-size:11.5px;color:#8a8375;font-family:monospace;}',
      '.cat-item button{background:#332C24;color:#EDE6D8;border:none;padding:8px 13px;border-radius:6px;font-size:12px;font-weight:600;cursor:pointer;}',
      '.empty{font-size:13px;color:#8a8375;text-align:center;padding:20px 0;}',
    ].join('\n');
    root.appendChild(style);

    var fab = document.createElement('button');
    fab.className = 'fab';
    fab.innerHTML = '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2c-4 4.5-7 8.2-7 11.5A7 7 0 0012 20a7 7 0 007-6.5C19 10.2 16 6.5 12 2z"/></svg>';
    root.appendChild(fab);

    var menu = document.createElement('div');
    menu.className = 'menu hidden';
    menu.innerHTML =
      (currentProduct
        ? '<div class="menu-item" id="opt3d"><span class="ic">🪑</span> Ver este producto en 3D</div>'
        : '') +
      '<div class="menu-item" id="optCatalog"><span class="ic">📷</span> Probar un mueble en tu espacio</div>';
    root.appendChild(menu);

    fab.addEventListener('click', function () {
      menu.classList.toggle('hidden');
    });

    var arOverlay = buildAROverlay(root);
    var catalogOverlay = buildCatalogOverlay(root);

    if (currentProduct) {
      menu.querySelector('#opt3d').addEventListener('click', function () {
        menu.classList.add('hidden');
        openAR(arOverlay, currentProduct);
      });
    }
    menu.querySelector('#optCatalog').addEventListener('click', function () {
      menu.classList.add('hidden');
      openCatalog(catalogOverlay, arOverlay);
    });
  }

  function buildAROverlay(root) {
    var overlay = document.createElement('div');
    overlay.className = 'overlay';
    overlay.innerHTML =
      '<div class="modal">' +
      '  <div class="modal-top"><strong id="arTitle"></strong><button class="close">✕</button></div>' +
      '  <div class="frame"><model-viewer id="arViewer" camera-controls auto-rotate shadow-intensity="1" exposure="0.95" environment-image="neutral" camera-orbit="35deg 78deg 2.6m" ar ar-modes="webxr scene-viewer quick-look" ar-scale="fixed" ar-placement="floor">' +
      '    <button slot="ar-button" class="ar-btn">Ver en tu espacio (AR)</button>' +
      '  </model-viewer></div>' +
      '  <p class="hint">Desde el celular esto abre la cámara real, a escala bloqueada.</p>' +
      '  <div class="poweredby">⚡ Powered by Reality</div>' +
      '</div>';
    root.appendChild(overlay);
    overlay.querySelector('.close').addEventListener('click', function () { overlay.classList.remove('open'); });
    overlay.addEventListener('click', function (e) { if (e.target === overlay) overlay.classList.remove('open'); });
    return overlay;
  }

  function openAR(overlay, product) {
    ensureModelViewer().then(function () {
      overlay.querySelector('#arTitle').textContent = product.name + ' — ' + product.price;
      overlay.querySelector('#arViewer').setAttribute('src', product.model_url);
      overlay.classList.add('open');
    });
  }

  function buildCatalogOverlay(root) {
    var overlay = document.createElement('div');
    overlay.className = 'overlay';
    overlay.innerHTML =
      '<div class="modal">' +
      '  <div class="modal-top"><strong>Probá un mueble en tu espacio</strong><button class="close">✕</button></div>' +
      '  <div class="upload-zone" id="uploadZone">' +
      '    <div id="uploadPlaceholder">📷<p>Subí una foto del lugar donde querés probar un mueble (opcional, por ahora es solo de referencia)</p></div>' +
      '    <img id="uploadPreview" style="display:none;">' +
      '    <input type="file" id="uploadInput" accept="image/*" style="display:none;">' +
      '  </div>' +
      '  <div class="cat-note">Por ahora elegís vos del catálogo cuál mueble probar — la sugerencia automática según tu foto está en camino.</div>' +
      '  <div class="cat-list" id="catList"><div class="empty">Cargando catálogo…</div></div>' +
      '  <div class="poweredby">⚡ Powered by Reality</div>' +
      '</div>';
    root.appendChild(overlay);

    var zone = overlay.querySelector('#uploadZone');
    var input = overlay.querySelector('#uploadInput');
    var preview = overlay.querySelector('#uploadPreview');
    var placeholder = overlay.querySelector('#uploadPlaceholder');
    zone.addEventListener('click', function () { input.click(); });
    input.addEventListener('change', function (e) {
      var file = e.target.files[0];
      if (!file) return;
      var reader = new FileReader();
      reader.onload = function (ev) {
        preview.src = ev.target.result;
        preview.style.display = 'block';
        placeholder.style.display = 'none';
      };
      reader.readAsDataURL(file);
    });

    overlay.querySelector('.close').addEventListener('click', function () { overlay.classList.remove('open'); });
    overlay.addEventListener('click', function (e) { if (e.target === overlay) overlay.classList.remove('open'); });

    overlay._loaded = false;
    return overlay;
  }

  function openCatalog(overlay, arOverlay) {
    overlay.classList.add('open');
    if (overlay._loaded) return;
    overlay._loaded = true;
    var list = overlay.querySelector('#catList');
    fetchCatalog()
      .then(function (products) {
        if (!products.length) {
          list.innerHTML = '<div class="empty">Todavía no hay productos publicados.</div>';
          return;
        }
        list.innerHTML = products.map(function (p) {
          return '<div class="cat-item"><div class="info"><strong>' + escapeHtml(p.name) + '</strong><span>' + escapeHtml(p.price) + ' · ' + p.alto + '×' + p.ancho + '×' + p.fondo + ' cm</span></div><button>Ver en 3D</button></div>';
        }).join('');
        list.querySelectorAll('.cat-item').forEach(function (item, i) {
          item.querySelector('button').addEventListener('click', function () {
            overlay.classList.remove('open');
            openAR(arOverlay, products[i]);
          });
        });
      })
      .catch(function () {
        list.innerHTML = '<div class="empty">No se pudo cargar el catálogo.</div>';
      });
  }

  // -----------------------------------------------------------
  function init() {
    var manual = document.querySelector('[data-ebano-product]');
    var auto = document.querySelector('[data-ebano-auto]');

    if (manual) {
      var idOrSlug = manual.getAttribute('data-ebano-product');
      fetchProductById(idOrSlug)
        .catch(function () { return fetchProductBySlug(idOrSlug); })
        .then(function (p) { buildFAB(p); })
        .catch(function () { buildFAB(null); });
      return;
    }

    if (auto) {
      var slug = slugFromUrl();
      if (!slug) { buildFAB(null); return; }
      fetchProductBySlug(slug)
        .then(function (p) { buildFAB(p); })
        .catch(function () { buildFAB(null); });
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
