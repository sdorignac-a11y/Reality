/**
 * Reality — Widget embebible
 * Estética: panel rectangular, botones compactos, íconos monocromos,
 * tipografía redondeada (Baloo 2 / Nunito), footer "powered by reality".
 * + Análisis con IA: el cliente sube una foto de su espacio y Claude
 *   sugiere qué productos del catálogo quedarían mejor ahí.
 */
(function () {
  'use strict';

  // -----------------------------------------------------------
  var SUPABASE_URL = 'https://loqapxtmxrdnzxencgxs.supabase.co';
  var SUPABASE_ANON_KEY = 'sb_publishable_C6HGGPizWvwmyttbvIC6UA_5gLeeh_1';
  var SITE_DOMAIN = 'https://cutzstudio.vercel.app';
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
      headers: {
        apikey: SUPABASE_ANON_KEY,
        Authorization: 'Bearer ' + SUPABASE_ANON_KEY
      },
    }).then(function (res) {
      if (!res.ok) throw new Error('No se pudo consultar Supabase');
      return res.json();
    });
  }

  function fetchProductById(id, storeId) {
    var url = SUPABASE_URL + '/rest/v1/products?id=eq.' + encodeURIComponent(id) +
      '&owner_id=eq.' + encodeURIComponent(storeId) +
      '&status=eq.published&select=id,name,price,alto,ancho,fondo,model_url,slug';

    return fetchFromSupabase(url).then(function (rows) {
      if (!rows.length) throw new Error('Producto no encontrado');
      return rows[0];
    });
  }

  function fetchProductBySlug(slug, storeId) {
    var url = SUPABASE_URL + '/rest/v1/products?slug=eq.' + encodeURIComponent(slug) +
      '&owner_id=eq.' + encodeURIComponent(storeId) +
      '&status=eq.published&select=id,name,price,alto,ancho,fondo,model_url,slug';

    return fetchFromSupabase(url).then(function (rows) {
      return rows.length ? rows[0] : null;
    });
  }

  function fetchCatalog(storeId) {
    var url = SUPABASE_URL + '/rest/v1/products?status=eq.published' +
      '&owner_id=eq.' + encodeURIComponent(storeId) +
      '&select=id,name,price,alto,ancho,fondo,model_url,slug&order=created_at.desc';

    return fetchFromSupabase(url);
  }

  function slugFromUrl() {
    var parts = window.location.pathname.split('/').filter(Boolean);
    return parts.length ? decodeURIComponent(parts[parts.length - 1]) : null;
  }

  function escapeHtml(str) {
    return String(str).replace(/[&<>"']/g, function (c) {
      return {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;'
      }[c];
    });
  }

  function chairIcon() {
    return (
      '<svg class="line-icon" viewBox="0 0 48 48" aria-hidden="true">' +
      '  <path d="M17 7v32" />' +
      '  <path d="M32 8v31" />' +
      '  <path d="M17 10h15" />' +
      '  <path d="M17 20h15" />' +
      '  <path d="M15 25h20" />' +
      '  <path d="M18 25l-3 15" />' +
      '  <path d="M34 25l3 15" />' +
      '  <path d="M19 33h15" />' +
      '</svg>'
    );
  }

  function cameraIcon() {
    return (
      '<svg class="line-icon" viewBox="0 0 48 48" aria-hidden="true">' +
      '  <path d="M15 17l3.2-4.5h11.6L33 17h4.5c2 0 3.5 1.5 3.5 3.5v15c0 2-1.5 3.5-3.5 3.5h-27C8.5 39 7 37.5 7 35.5v-15c0-2 1.5-3.5 3.5-3.5H15z" />' +
      '  <circle cx="24" cy="28" r="7" />' +
      '  <path d="M35 22h.1" />' +
      '</svg>'
    );
  }

  function sparkIcon() {
    return (
      '<svg class="line-icon" viewBox="0 0 48 48" aria-hidden="true" style="stroke:none;fill:currentColor;">' +
      '  <path d="M24 6l3.5 12.5L40 22l-12.5 3.5L24 38l-3.5-12.5L8 22l12.5-3.5z" />' +
      '</svg>'
    );
  }

  // -----------------------------------------------------------
  // UI flotante con Shadow DOM
  // -----------------------------------------------------------
  function buildFAB(currentProduct, storeId) {
    var host = document.createElement('div');
    host.style.all = 'initial';
    document.body.appendChild(host);

    var root = host.attachShadow ? host.attachShadow({ mode: 'open' }) : host;

    var style = document.createElement('style');
    style.textContent = [
      '@import url("https://fonts.googleapis.com/css2?family=Baloo+2:wght@600;700;800&family=Nunito:wght@400;600;700;800&display=swap");',

      '*{box-sizing:border-box;}',

      ':host{',
      '  all:initial;',
      '}',

      '.fab-wrap{',
      '  position:fixed;',
      '  right:18px;',
      '  bottom:18px;',
      '  width:72px;',
      '  height:72px;',
      '  z-index:999999;',
      '  cursor:pointer;',
      '  border:none;',
      '  background:none;',
      '  padding:0;',
      '  outline:none;',
      '}',

      '.fab-wrap svg{',
      '  width:100%;',
      '  height:100%;',
      '  display:block;',
      '  filter:drop-shadow(0 18px 28px rgba(120,70,28,.30));',
      '  transition:transform .22s ease, filter .22s ease;',
      '}',

      '.fab-wrap:hover svg{',
      '  transform:scale(1.06) rotate(-4deg);',
      '  filter:drop-shadow(0 22px 34px rgba(120,70,28,.36));',
      '}',

      '.fab-wrap.is-open svg{',
      '  transform:scale(.94) rotate(5deg);',
      '}',

      '.menu{',
      '  position:fixed;',
      '  right:22px;',
      '  bottom:100px;',
      '  z-index:999999;',
      '  font-family:"Nunito",-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;',
      '}',

      '.menu.hidden{',
      '  display:none;',
      '}',

      '.menu-card{',
      '  position:relative;',
      '  width:288px;',
      '  min-height:354px;',
      '  padding:24px 16px 18px;',
      '  overflow:hidden;',
      '  border-radius:24px;',
      '  background:',
      '    radial-gradient(circle at 85% 3%, rgba(186,121,58,.14) 0 20px, transparent 21px),',
      '    linear-gradient(180deg,#FFF7ED 0%,#FBF0E1 100%);',
      '  border:1px solid rgba(210,174,125,.72);',
      '  box-shadow:',
      '    0 26px 60px rgba(56,33,18,.16),',
      '    0 8px 18px rgba(56,33,18,.08);',
      '}',

      '.menu-card:after{',
      '  content:"";',
      '  position:absolute;',
      '  right:-18px;',
      '  top:-18px;',
      '  width:72px;',
      '  height:72px;',
      '  border-radius:42% 58% 54% 46%;',
      '  background:rgba(178,104,43,.09);',
      '  pointer-events:none;',
      '}',

      '.menu-header{',
      '  position:relative;',
      '  z-index:1;',
      '  text-align:center;',
      '  margin-bottom:19px;',
      '}',

      '.menu-mark{',
      '  display:block;',
      '  color:#D59B54;',
      '  font-size:20px;',
      '  line-height:1;',
      '  margin-bottom:12px;',
      '}',

      '.menu-title{',
      '  display:block;',
      '  max-width:220px;',
      '  margin:0 auto;',
      '  font-family:"Baloo 2","Nunito",system-ui,sans-serif;',
      '  font-size:32px;',
      '  line-height:.94;',
      '  font-weight:800;',
      '  letter-spacing:-.04em;',
      '  color:#57331F;',
      '}',

      '.menu-subtitle{',
      '  display:block;',
      '  margin-top:10px;',
      '  font-size:12px;',
      '  line-height:1.2;',
      '  font-weight:700;',
      '  color:#9C876D;',
      '}',

      '.menu-body{',
      '  position:relative;',
      '  z-index:1;',
      '  display:flex;',
      '  flex-direction:column;',
      '  gap:10px;',
      '}',

      '.menu-item{',
      '  width:100%;',
      '  min-height:64px;',
      '  border:1px solid rgba(218,196,165,.88);',
      '  border-radius:15px;',
      '  background:rgba(255,255,255,.86);',
      '  padding:9px 11px;',
      '  cursor:pointer;',
      '  display:flex;',
      '  align-items:center;',
      '  gap:11px;',
      '  text-align:left;',
      '  color:#3D2A1B;',
      '  box-shadow:0 8px 18px rgba(74,47,29,.08);',
      '  transition:transform .16s ease, box-shadow .16s ease, border-color .16s ease, background .16s ease;',
      '}',

      '.menu-item:hover{',
      '  transform:translateY(-2px);',
      '  background:#FFFFFF;',
      '  border-color:rgba(178,104,43,.32);',
      '  box-shadow:0 14px 26px rgba(74,47,29,.13);',
      '}',

      '.menu-item:active{',
      '  transform:translateY(0);',
      '}',

      '.menu-item .ic{',
      '  width:38px;',
      '  height:38px;',
      '  flex:0 0 38px;',
      '  display:flex;',
      '  align-items:center;',
      '  justify-content:center;',
      '  border-radius:13px;',
      '  color:#6E4127;',
      '  background:linear-gradient(180deg,#F5E6D2,#EFE0CC);',
      '}',

      '.line-icon{',
      '  width:27px;',
      '  height:27px;',
      '  fill:none;',
      '  stroke:currentColor;',
      '  stroke-width:2.8;',
      '  stroke-linecap:round;',
      '  stroke-linejoin:round;',
      '}',

      '.menu-item .txt{',
      '  flex:1;',
      '  min-width:0;',
      '  display:flex;',
      '  flex-direction:column;',
      '  gap:1px;',
      '}',

      '.menu-item .txt strong{',
      '  display:block;',
      '  font-family:"Nunito",-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;',
      '  font-size:13.2px;',
      '  line-height:1.08;',
      '  font-weight:900;',
      '  color:#2D2016;',
      '}',

      '.menu-item .txt small{',
      '  display:block;',
      '  font-size:10.8px;',
      '  line-height:1.15;',
      '  font-weight:700;',
      '  color:#9D866B;',
      '}',

      '.menu-item .chev{',
      '  flex:0 0 auto;',
      '  font-size:24px;',
      '  line-height:1;',
      '  font-weight:700;',
      '  color:#B99B72;',
      '  transform:translateY(-1px);',
      '}',

      '.menu-footer{',
      '  position:relative;',
      '  z-index:1;',
      '  margin-top:18px;',
      '  padding-top:14px;',
      '  text-align:center;',
      '  font-size:11.5px;',
      '  line-height:1;',
      '  color:#9E8667;',
      '  font-weight:700;',
      '  font-style:italic;',
      '}',

      '.menu-footer:before{',
      '  content:"";',
      '  position:absolute;',
      '  top:0;',
      '  left:18px;',
      '  right:18px;',
      '  height:1px;',
      '  background:linear-gradient(90deg,transparent,rgba(195,158,112,.55),transparent);',
      '}',

      '.menu-footer span{',
      '  color:#B98145;',
      '  font-style:normal;',
      '  margin:0 6px;',
      '}',

      '.overlay{',
      '  position:fixed;',
      '  inset:0;',
      '  background:rgba(17,19,24,.60);',
      '  display:none;',
      '  align-items:center;',
      '  justify-content:center;',
      '  z-index:9999999;',
      '  padding:20px;',
      '  font-family:"Nunito",-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;',
      '}',

      '.overlay.open{',
      '  display:flex;',
      '}',

      '.modal{',
      '  width:540px;',
      '  max-width:100%;',
      '  max-height:88vh;',
      '  overflow-y:auto;',
      '  border-radius:22px;',
      '  padding:22px;',
      '  background:#FFF7ED;',
      '  border:1px solid rgba(210,174,125,.65);',
      '  box-shadow:0 30px 80px rgba(0,0,0,.28);',
      '}',

      '.modal-top{',
      '  display:flex;',
      '  justify-content:space-between;',
      '  align-items:center;',
      '  gap:16px;',
      '  margin-bottom:14px;',
      '}',

      '.modal-top strong{',
      '  font-size:16px;',
      '  font-weight:900;',
      '  color:#3D2A1B;',
      '}',

      '.close{',
      '  width:32px;',
      '  height:32px;',
      '  border:none;',
      '  border-radius:999px;',
      '  background:#F1E4D1;',
      '  color:#6E4127;',
      '  font-size:18px;',
      '  cursor:pointer;',
      '}',

      '.frame{',
      '  width:100%;',
      '  height:320px;',
      '  background:#FFFFFF;',
      '  border:1px solid rgba(218,196,165,.75);',
      '  border-radius:16px;',
      '  overflow:hidden;',
      '  margin-bottom:10px;',
      '}',

      'model-viewer{',
      '  width:100%;',
      '  height:100%;',
      '}',

      '.ar-btn{',
      '  background:#6B4A32;',
      '  color:#fff;',
      '  border:none;',
      '  padding:10px 16px;',
      '  border-radius:999px;',
      '  font-size:13px;',
      '  font-weight:800;',
      '  cursor:pointer;',
      '  margin:14px;',
      '}',

      '.hint{',
      '  font-size:12px;',
      '  color:#8a7b68;',
      '  margin:10px 0 0;',
      '  line-height:1.35;',
      '}',

      '.poweredby{',
      '  font-size:11px;',
      '  color:#9E8667;',
      '  margin-top:14px;',
      '  text-align:center;',
      '  font-weight:800;',
      '  font-style:italic;',
      '}',

      '.upload-zone{',
      '  border:1.5px dashed #DCC8A9;',
      '  border-radius:16px;',
      '  padding:26px;',
      '  text-align:center;',
      '  cursor:pointer;',
      '  background:#FFFFFF;',
      '  margin-bottom:12px;',
      '  color:#6E4127;',
      '}',

      '.upload-zone img{',
      '  max-width:100%;',
      '  max-height:160px;',
      '  border-radius:12px;',
      '}',

      '.upload-zone p{',
      '  font-size:12.5px;',
      '  color:#8a7b68;',
      '  margin:8px 0 0;',
      '  line-height:1.45;',
      '}',

      '.analyze-btn{',
      '  width:100%;',
      '  background:#6B4A32;',
      '  color:#FFF7ED;',
      '  border:none;',
      '  padding:13px;',
      '  border-radius:999px;',
      '  font-size:13px;',
      '  font-weight:800;',
      '  cursor:pointer;',
      '  margin-bottom:14px;',
      '  display:none;',
      '  align-items:center;',
      '  justify-content:center;',
      '  gap:8px;',
      '}',

      '.analyze-btn.show{',
      '  display:flex;',
      '}',

      '.analyze-btn:disabled{',
      '  opacity:.6;',
      '  cursor:default;',
      '}',

      '.analyze-btn .line-icon{',
      '  width:16px;',
      '  height:16px;',
      '  color:#FFF7ED;',
      '}',

      '.rec-banner{',
      '  font-size:12px;',
      '  font-weight:700;',
      '  color:#5C6B4F;',
      '  background:#E9EFE3;',
      '  padding:10px 12px;',
      '  border-radius:12px;',
      '  margin-bottom:14px;',
      '  display:none;',
      '  line-height:1.4;',
      '}',

      '.rec-banner.show{',
      '  display:block;',
      '}',

      '.cat-note{',
      '  font-size:12px;',
      '  color:#7E6B54;',
      '  background:#F3E8D7;',
      '  padding:11px 12px;',
      '  border-radius:12px;',
      '  margin-bottom:16px;',
      '  line-height:1.5;',
      '}',

      '.cat-list{',
      '  display:flex;',
      '  flex-direction:column;',
      '  gap:10px;',
      '}',

      '.cat-item{',
      '  display:flex;',
      '  flex-direction:column;',
      '  gap:10px;',
      '  border:1px solid #E0CDB0;',
      '  border-radius:14px;',
      '  padding:12px 14px;',
      '  background:#FFFFFF;',
      '}',

      '.cat-item.recommended{',
      '  border-color:#A8632C;',
      '  background:#FBF0E1;',
      '  box-shadow:0 8px 18px rgba(168,99,44,.14);',
      '}',

      '.cat-item .info strong{',
      '  font-size:13.5px;',
      '  display:block;',
      '  color:#2D2016;',
      '}',

      '.cat-item .info span{',
      '  font-size:11.5px;',
      '  color:#8a7b68;',
      '}',

      '.cat-item .reason{',
      '  font-size:11.5px;',
      '  color:#A8632C;',
      '  margin-top:4px;',
      '  font-style:italic;',
      '  line-height:1.35;',
      '}',

      '.cat-actions{',
      '  display:flex;',
      '  gap:8px;',
      '}',

      '.cat-actions button{',
      '  flex:1;',
      '  display:flex;',
      '  align-items:center;',
      '  justify-content:center;',
      '  gap:6px;',
      '  border:none;',
      '  padding:9px 10px;',
      '  border-radius:999px;',
      '  font-size:11.5px;',
      '  font-weight:800;',
      '  cursor:pointer;',
      '  white-space:nowrap;',
      '}',

      '.cat-actions button:disabled{',
      '  opacity:.6;',
      '  cursor:default;',
      '}',

      '.cat-btn-3d{',
      '  background:#6B4A32;',
      '  color:#FFF7ED;',
      '}',

      '.cat-btn-gen{',
      '  background:#FFFFFF;',
      '  color:#6B4A32;',
      '  border:1.5px solid #DCC8A9 !important;',
      '}',

      '.cat-btn-gen .line-icon{',
      '  width:13px;',
      '  height:13px;',
      '}',

      '.result-frame{',
      '  width:100%;',
      '  min-height:320px;',
      '  background:#FFFFFF;',
      '  border:1px solid rgba(218,196,165,.75);',
      '  border-radius:16px;',
      '  overflow:hidden;',
      '  margin-bottom:10px;',
      '  display:flex;',
      '  align-items:center;',
      '  justify-content:center;',
      '}',

      '.result-frame img{',
      '  width:100%;',
      '  height:100%;',
      '  object-fit:contain;',
      '  display:block;',
      '}',

      '.result-loading{',
      '  display:flex;',
      '  flex-direction:column;',
      '  align-items:center;',
      '  gap:10px;',
      '  color:#8a7b68;',
      '  font-size:13px;',
      '  font-weight:700;',
      '  padding:40px 20px;',
      '  text-align:center;',
      '}',

      '.result-loading .line-icon{',
      '  width:26px;',
      '  height:26px;',
      '  color:#A8632C;',
      '  animation:spin 1.4s linear infinite;',
      '}',

      '@keyframes spin{',
      '  from{transform:rotate(0deg);}',
      '  to{transform:rotate(360deg);}',
      '}',

      '.empty{',
      '  font-size:13px;',
      '  color:#8a7b68;',
      '  text-align:center;',
      '  padding:20px 0;',
      '}',

      '@media (max-width:520px){',
      '  .menu{right:14px;bottom:94px;}',
      '  .menu-card{width:calc(100vw - 28px);max-width:300px;}',
      '  .fab-wrap{right:14px;bottom:14px;width:68px;height:68px;}',
      '}'
    ].join('\n');

    root.appendChild(style);

    var fab = document.createElement('button');
    fab.className = 'fab-wrap';
    fab.setAttribute('aria-label', 'Abrir Reality');

    fab.innerHTML =
      '<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">' +
      '  <path fill="#A8632C" d="M50 4 C56 4 58 16 63 18 C69 20 78 12 83 17 C88 22 79 30 81 36 C83 42 96 44 96 51 C96 58 83 60 80 66 C77 72 84 82 78 87 C72 92 63 81 57 83 C51 85 48 96 41 96 C34 96 33 84 27 81 C21 78 10 86 6 80 C2 74 12 64 10 58 C8 52 -3 49 -1 42 C1 35 14 36 18 31 C22 26 17 14 24 10 C31 6 39 17 45 15 C49 14 47 4 50 4 Z"/>' +
      '  <path fill="rgba(255,255,255,.16)" d="M30 23 C38 17 51 14 63 19 C52 18 40 22 31 30 C27 34 22 28 30 23 Z"/>' +
      '</svg>';

    root.appendChild(fab);

    var menu = document.createElement('div');
    menu.className = 'menu hidden';

    var itemsHtml =
      (currentProduct
        ? '<button class="menu-item" id="opt3d">' +
          '  <span class="ic">' + chairIcon() + '</span>' +
          '  <span class="txt"><strong>Ver este producto<br>en 3D</strong><small>Giralo y probalo en AR</small></span>' +
          '  <span class="chev">›</span>' +
          '</button>'
        : '') +
      '<button class="menu-item" id="optCatalog">' +
      '  <span class="ic">' + cameraIcon() + '</span>' +
      '  <span class="txt"><strong>Probar un mueble<br>en tu espacio</strong><small>Subí una foto y elegí</small></span>' +
      '  <span class="chev">›</span>' +
      '</button>';

    menu.innerHTML =
      '<div class="menu-card">' +
      '  <div class="menu-header">' +
      '    <span class="menu-mark">✦</span>' +
      '    <strong class="menu-title">Probalo en<br>tu casa</strong>' +
      '    <span class="menu-subtitle">Elegí cómo querés ver el mueble</span>' +
      '  </div>' +
      '  <div class="menu-body">' + itemsHtml + '</div>' +
      '  <div class="menu-footer"><span>✦</span>powered by reality<span>✦</span></div>' +
      '</div>';

    root.appendChild(menu);

    fab.addEventListener('click', function (e) {
      e.stopPropagation();
      menu.classList.toggle('hidden');
      fab.classList.toggle('is-open', !menu.classList.contains('hidden'));
    });

    document.addEventListener('click', function (e) {
      var path = e.composedPath ? e.composedPath() : [];
      var clickedInside = path.indexOf(host) !== -1;

      if (!clickedInside) {
        menu.classList.add('hidden');
        fab.classList.remove('is-open');
      }
    });

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') {
        menu.classList.add('hidden');
        fab.classList.remove('is-open');
      }
    });

    var arOverlay = buildAROverlay(root);
    var resultOverlay = buildResultOverlay(root);
    var catalogOverlay = buildCatalogOverlay(root, arOverlay, resultOverlay);
    catalogOverlay._storeId = storeId;

    if (currentProduct && menu.querySelector('#opt3d')) {
      menu.querySelector('#opt3d').addEventListener('click', function () {
        menu.classList.add('hidden');
        fab.classList.remove('is-open');
        openAR(arOverlay, currentProduct);
      });
    }

    menu.querySelector('#optCatalog').addEventListener('click', function () {
      menu.classList.add('hidden');
      fab.classList.remove('is-open');
      openCatalog(catalogOverlay);
    });
  }

  function buildAROverlay(root) {
    var overlay = document.createElement('div');
    overlay.className = 'overlay';

    overlay.innerHTML =
      '<div class="modal">' +
      '  <div class="modal-top">' +
      '    <strong id="arTitle"></strong>' +
      '    <button class="close" aria-label="Cerrar">×</button>' +
      '  </div>' +
      '  <div class="frame">' +
      '    <model-viewer id="arViewer" camera-controls auto-rotate shadow-intensity="1" exposure="0.95" environment-image="neutral" camera-orbit="35deg 78deg 2.6m" ar ar-modes="webxr scene-viewer quick-look" ar-scale="fixed" ar-placement="floor">' +
      '      <button slot="ar-button" class="ar-btn">Ver en tu espacio</button>' +
      '    </model-viewer>' +
      '  </div>' +
      '  <p class="hint">Desde el celular esto abre la cámara real, a escala bloqueada.</p>' +
      '  <div class="poweredby">powered by reality</div>' +
      '</div>';

    root.appendChild(overlay);

    overlay.querySelector('.close').addEventListener('click', function () {
      overlay.classList.remove('open');
    });

    overlay.addEventListener('click', function (e) {
      if (e.target === overlay) overlay.classList.remove('open');
    });

    return overlay;
  }

  function openAR(overlay, product) {
    ensureModelViewer().then(function () {
      overlay.querySelector('#arTitle').textContent = product.name + ' — ' + product.price;
      overlay.querySelector('#arViewer').setAttribute('src', product.model_url);
      overlay.classList.add('open');
    });
  }

  function buildResultOverlay(root) {
    var overlay = document.createElement('div');
    overlay.className = 'overlay';

    overlay.innerHTML =
      '<div class="modal">' +
      '  <div class="modal-top">' +
      '    <strong>Así podría quedar</strong>' +
      '    <button class="close" aria-label="Cerrar">×</button>' +
      '  </div>' +
      '  <div class="result-frame" id="resultFrame">' +
      '    <div class="result-loading" id="resultLoading">' + sparkIcon() + '<span>Generando la imagen…</span></div>' +
      '    <img id="resultImage" style="display:none;">' +
      '  </div>' +
      '  <p class="hint">Imagen generada por IA a partir de tu foto — es una interpretación, no una medición exacta como el AR.</p>' +
      '  <div class="poweredby">powered by reality</div>' +
      '</div>';

    root.appendChild(overlay);

    overlay.querySelector('.close').addEventListener('click', function () {
      overlay.classList.remove('open');
    });
    overlay.addEventListener('click', function (e) {
      if (e.target === overlay) overlay.classList.remove('open');
    });

    return overlay;
  }

  function buildCatalogOverlay(root, arOverlay, resultOverlay) {
    var overlay = document.createElement('div');
    overlay.className = 'overlay';

    overlay.innerHTML =
      '<div class="modal">' +
      '  <div class="modal-top">' +
      '    <strong>Probá un mueble en tu espacio</strong>' +
      '    <button class="close" aria-label="Cerrar">×</button>' +
      '  </div>' +
      '  <div class="upload-zone" id="uploadZone">' +
      '    <div id="uploadPlaceholder">' +
      '      ' + cameraIcon() +
      '      <p>Subí una foto del lugar donde querés probar un mueble.</p>' +
      '    </div>' +
      '    <img id="uploadPreview" style="display:none;">' +
      '    <input type="file" id="uploadInput" accept="image/*" style="display:none;">' +
      '  </div>' +
      '  <button class="analyze-btn" id="analyzeBtn">' + sparkIcon() + ' Buscar qué mueble queda mejor acá</button>' +
      '  <div class="rec-banner" id="recBanner"></div>' +
      '  <div class="cat-note">También podés elegir vos directo del catálogo completo:</div>' +
      '  <div class="cat-list" id="catList"><div class="empty">Cargando catálogo…</div></div>' +
      '  <div class="poweredby">powered by reality</div>' +
      '</div>';

    root.appendChild(overlay);

    var zone = overlay.querySelector('#uploadZone');
    var input = overlay.querySelector('#uploadInput');
    var preview = overlay.querySelector('#uploadPreview');
    var placeholder = overlay.querySelector('#uploadPlaceholder');
    var analyzeBtn = overlay.querySelector('#analyzeBtn');
    var recBanner = overlay.querySelector('#recBanner');
    var uploadedBase64 = null;
    var uploadedMediaType = null;

    zone.addEventListener('click', function () {
      input.click();
    });

    input.addEventListener('change', function (e) {
      var file = e.target.files[0];
      if (!file) return;

      var reader = new FileReader();

      reader.onload = function (ev) {
        preview.src = ev.target.result;
        preview.style.display = 'block';
        placeholder.style.display = 'none';
        uploadedBase64 = ev.target.result.split(',')[1];
        uploadedMediaType = file.type;
        overlay._uploadedPhoto = { base64: uploadedBase64, mediaType: uploadedMediaType };
        analyzeBtn.classList.add('show');
        recBanner.classList.remove('show');
      };

      reader.readAsDataURL(file);
    });

    analyzeBtn.addEventListener('click', function () {
      if (!uploadedBase64) return;

      analyzeBtn.disabled = true;
      var originalLabel = analyzeBtn.innerHTML;
      analyzeBtn.textContent = 'Analizando tu ambiente…';

      var list = overlay.querySelector('#catList');
      var products = overlay._products || [];

      fetch(SITE_DOMAIN + '/api/recommend', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageBase64: uploadedBase64,
          imageMediaType: uploadedMediaType,
          products: products.map(function (p) {
            return { id: p.id, name: p.name, price: p.price, alto: p.alto, ancho: p.ancho, fondo: p.fondo };
          }),
        }),
      })
        .then(function (res) { return res.json(); })
        .then(function (data) {
          analyzeBtn.disabled = false;
          analyzeBtn.innerHTML = originalLabel;

          if (data.error || !data.recommendations || !data.recommendations.length) {
            recBanner.textContent = 'No se pudo analizar la foto ahora — elegí del catálogo abajo.';
            recBanner.classList.add('show');
            return;
          }

          recBanner.textContent = '✦ Encontramos ' + data.recommendations.length + ' mueble(s) que podrían quedar bien acá';
          recBanner.classList.add('show');
          renderCatalogList(list, products, overlay, data.recommendations);
        })
        .catch(function () {
          analyzeBtn.disabled = false;
          analyzeBtn.innerHTML = originalLabel;
          recBanner.textContent = 'No se pudo analizar la foto ahora — elegí del catálogo abajo.';
          recBanner.classList.add('show');
        });
    });

    overlay.querySelector('.close').addEventListener('click', function () {
      overlay.classList.remove('open');
    });

    overlay.addEventListener('click', function (e) {
      if (e.target === overlay) overlay.classList.remove('open');
    });

    overlay._loaded = false;
    overlay._arOverlay = arOverlay;
    overlay._resultOverlay = resultOverlay;
    overlay._root = root;
    overlay._uploadedPhoto = null;

    return overlay;
  }

  function renderCatalogList(list, products, overlay, recommendations) {
    var arOverlay = overlay._arOverlay;
    var recMap = {};
    (recommendations || []).forEach(function (r) { recMap[r.id] = r.reason; });

    var sorted = products.slice().sort(function (a, b) {
      var ra = recMap[a.id] ? 1 : 0, rb = recMap[b.id] ? 1 : 0;
      return rb - ra;
    });

    list.innerHTML = sorted.map(function (p) {
      var isRec = !!recMap[p.id];
      return (
        '<div class="cat-item' + (isRec ? ' recommended' : '') + '" data-id="' + escapeHtml(p.id) + '">' +
        '  <div class="info">' +
        '    <strong>' + (isRec ? '✦ ' : '') + escapeHtml(p.name) + '</strong>' +
        '    <span>' + escapeHtml(p.price) + ' · ' + p.alto + '×' + p.ancho + '×' + p.fondo + ' cm</span>' +
        (isRec ? '    <div class="reason">' + escapeHtml(recMap[p.id]) + '</div>' : '') +
        '  </div>' +
        '  <div class="cat-actions">' +
        '    <button class="cat-btn-3d">Ver en 3D</button>' +
        '    <button class="cat-btn-gen">' + sparkIcon() + ' Generar imagen</button>' +
        '  </div>' +
        '</div>'
      );
    }).join('');

    list.querySelectorAll('.cat-item').forEach(function (item, i) {
      item.querySelector('.cat-btn-3d').addEventListener('click', function () {
        openAR(arOverlay, sorted[i]);
      });
      item.querySelector('.cat-btn-gen').addEventListener('click', function (e) {
        generateComposite(overlay, sorted[i], e.currentTarget);
      });
    });
  }

  function generateComposite(overlay, product, buttonEl) {
    if (!overlay._uploadedPhoto) {
      var recBanner = overlay.querySelector('#recBanner');
      recBanner.textContent = 'Antes subí una foto de tu ambiente, arriba de todo.';
      recBanner.classList.add('show');
      return;
    }

    var originalLabel = buttonEl.innerHTML;
    buttonEl.disabled = true;
    buttonEl.textContent = 'Preparando…';

    ensureModelViewer().then(function () {
      var snap = document.createElement('model-viewer');
      snap.setAttribute('src', product.model_url);
      snap.setAttribute('crossorigin', 'anonymous');
      snap.setAttribute('exposure', '1');
      snap.setAttribute('environment-image', 'neutral');
      snap.setAttribute('camera-orbit', '35deg 75deg auto');
      snap.setAttribute('shadow-intensity', '0');
      snap.style.cssText = 'position:fixed;top:0;left:0;width:640px;height:640px;background:#fff;opacity:0.01;pointer-events:none;z-index:-1;';
      overlay._root.appendChild(snap);

      function failCapture(err) {
        console.error('[Reality widget] No se pudo capturar el modelo 3D para generar la imagen:', err);
        snap.remove();
        buttonEl.disabled = false;
        buttonEl.innerHTML = originalLabel;
        var recBanner = overlay.querySelector('#recBanner');
        recBanner.textContent = 'No se pudo preparar la foto del mueble. Probá de nuevo en un momento.';
        recBanner.classList.add('show');
      }

      var settled = false;
      function cleanupAndCapture() {
        if (settled) return;
        settled = true;
        snap.toBlob({ mimeType: 'image/png', idealAspect: true }).then(function (blob) {
          var reader = new FileReader();
          reader.onload = function (ev) {
            snap.remove();
            var productBase64 = ev.target.result.split(',')[1];
            callGenerateApi(overlay, product, productBase64, buttonEl, originalLabel);
          };
          reader.onerror = failCapture;
          reader.readAsDataURL(blob);
        }).catch(failCapture);
      }

      snap.addEventListener('error', failCapture);
      snap.addEventListener('load', function () { setTimeout(cleanupAndCapture, 600); });
      setTimeout(cleanupAndCapture, 5000); // por si el evento load no llega
    }).catch(function () {
      buttonEl.disabled = false;
      buttonEl.innerHTML = originalLabel;
    });
  }

  function callGenerateApi(overlay, product, productBase64, buttonEl, originalLabel) {
    buttonEl.textContent = 'Generando imagen…';

    fetch(SITE_DOMAIN + '/api/generate-image', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        roomImageBase64: overlay._uploadedPhoto.base64,
        roomImageMediaType: overlay._uploadedPhoto.mediaType,
        productImageBase64: productBase64,
        productImageMediaType: 'image/png',
        productName: product.name,
        alto: product.alto,
        ancho: product.ancho,
        fondo: product.fondo,
      }),
    })
      .then(function (res) { return res.json(); })
      .then(function (data) {
        buttonEl.disabled = false;
        buttonEl.innerHTML = originalLabel;

        var resultOverlay = overlay._resultOverlay;
        var loading = resultOverlay.querySelector('#resultLoading');
        var img = resultOverlay.querySelector('#resultImage');

        if (data.error || !data.imageBase64) {
          loading.querySelector('span').textContent = 'No se pudo generar la imagen ahora. Probá de nuevo en un rato.';
          img.style.display = 'none';
          loading.style.display = 'flex';
        } else {
          img.src = 'data:image/png;base64,' + data.imageBase64;
          img.style.display = 'block';
          loading.style.display = 'none';
        }
        resultOverlay.classList.add('open');
      })
      .catch(function () {
        buttonEl.disabled = false;
        buttonEl.innerHTML = originalLabel;
        var resultOverlay = overlay._resultOverlay;
        resultOverlay.querySelector('#resultLoading span').textContent = 'No se pudo generar la imagen ahora. Probá de nuevo en un rato.';
        resultOverlay.querySelector('#resultImage').style.display = 'none';
        resultOverlay.querySelector('#resultLoading').style.display = 'flex';
        resultOverlay.classList.add('open');
      });
  }

  function openCatalog(overlay) {
    overlay.classList.add('open');

    if (overlay._loaded) return;

    overlay._loaded = true;

    var list = overlay.querySelector('#catList');

    fetchCatalog(overlay._storeId)
      .then(function (products) {
        overlay._products = products;

        if (!products.length) {
          list.innerHTML = '<div class="empty">Todavía no hay productos publicados.</div>';
          return;
        }

        renderCatalogList(list, products, overlay, []);
      })
      .catch(function () {
        list.innerHTML = '<div class="empty">No se pudo cargar el catálogo.</div>';
      });
  }

  // -----------------------------------------------------------
  function showMissingStoreError(container) {
    container.innerHTML =
      '<div style="font-family:sans-serif;font-size:12px;color:#8C3B2E;">' +
      'Reality: falta el atributo data-store en el código de instalación.</div>';
    console.error('[Reality widget] Falta data-store — sin esto, el widget no puede saber de qué mueblería traer los productos.');
  }

  function init() {
    var manual = document.querySelector('[data-ebano-product]');
    var auto = document.querySelector('[data-ebano-auto]');
    var container = manual || auto;

    if (!container) return;

    var storeId = container.getAttribute('data-store');
    if (!storeId) {
      showMissingStoreError(container);
      return;
    }

    if (manual) {
      var idOrSlug = manual.getAttribute('data-ebano-product');

      fetchProductById(idOrSlug, storeId)
        .catch(function () {
          return fetchProductBySlug(idOrSlug, storeId);
        })
        .then(function (p) {
          buildFAB(p, storeId);
        })
        .catch(function () {
          buildFAB(null, storeId);
        });

      return;
    }

    if (auto) {
      var slug = slugFromUrl();

      if (!slug) {
        buildFAB(null, storeId);
        return;
      }

      fetchProductBySlug(slug, storeId)
        .then(function (p) {
          buildFAB(p, storeId);
        })
        .catch(function () {
          buildFAB(null, storeId);
        });
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
