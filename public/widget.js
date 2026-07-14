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
  var SUPABASE_ANON_KEY =
    'sb_publishable_C6HGGPizWvwmyttbvIC6UA_5gLeeh_1';
  var SITE_DOMAIN = 'https://cutzstudio.vercel.app';
  // -----------------------------------------------------------

  var MODEL_VIEWER_SRC =
    'https://unpkg.com/@google/model-viewer/dist/model-viewer.min.js';

  var modelViewerLoading = null;

  function ensureModelViewer() {
    if (
      window.customElements &&
      window.customElements.get('model-viewer')
    ) {
      return Promise.resolve();
    }

    if (modelViewerLoading) {
      return modelViewerLoading;
    }

    modelViewerLoading = new Promise(function (resolve, reject) {
      var script = document.createElement('script');

      script.type = 'module';
      script.src = MODEL_VIEWER_SRC;

      script.onload = function () {
        resolve();
      };

      script.onerror = reject;

      document.head.appendChild(script);
    });

    return modelViewerLoading;
  }

  // Corrige la escala del modelo 3D para que coincida con las medidas
  // reales cargadas en el producto (alto/ancho/fondo en cm).
  function applyRealScale(modelViewer, alto, ancho, fondo) {
    if (modelViewer.__realityDoScale) {
      modelViewer.removeEventListener(
        'load',
        modelViewer.__realityDoScale
      );

      modelViewer.__realityDoScale = null;
    }

    function doScale() {
      try {
        var dims = modelViewer.getDimensions();
        var current = modelViewer.scale || {
          x: 1,
          y: 1,
          z: 1
        };

        var baseX = dims.x / (current.x || 1);
        var baseY = dims.y / (current.y || 1);
        var baseZ = dims.z / (current.z || 1);

        var targetX = (Number(ancho) || 0) / 100;
        var targetY = (Number(alto) || 0) / 100;
        var targetZ = (Number(fondo) || 0) / 100;

        var ratios = [];

        if (baseX > 0 && targetX > 0) {
          ratios.push(targetX / baseX);
        }

        if (baseY > 0 && targetY > 0) {
          ratios.push(targetY / baseY);
        }

        if (baseZ > 0 && targetZ > 0) {
          ratios.push(targetZ / baseZ);
        }

        if (!ratios.length) {
          return;
        }

        var avg =
          ratios.reduce(function (a, b) {
            return a + b;
          }, 0) / ratios.length;

        if (!isFinite(avg) || avg <= 0) {
          return;
        }

        modelViewer.setAttribute(
          'scale',
          avg + ' ' + avg + ' ' + avg
        );
      } catch (e) {
        // Si algo falla, dejamos el modelo con su escala original.
      }
    }

    modelViewer.__realityDoScale = doScale;

    modelViewer.addEventListener('load', doScale);

    if (modelViewer.loaded) {
      doScale();
    }
  }

  function fetchFromSupabase(url) {
    return fetch(url, {
      headers: {
        apikey: SUPABASE_ANON_KEY,
        Authorization: 'Bearer ' + SUPABASE_ANON_KEY
      }
    }).then(function (res) {
      if (!res.ok) {
        throw new Error('No se pudo consultar Supabase');
      }

      return res.json();
    });
  }

  function fetchProductById(id, storeId) {
    var url =
      SUPABASE_URL +
      '/rest/v1/products?id=eq.' +
      encodeURIComponent(id) +
      '&owner_id=eq.' +
      encodeURIComponent(storeId) +
      '&status=eq.published' +
      '&select=id,name,price,alto,ancho,fondo,model_url,slug';

    return fetchFromSupabase(url).then(function (rows) {
      if (!rows.length) {
        throw new Error('Producto no encontrado');
      }

      return rows[0];
    });
  }

  function fetchProductBySlug(slug, storeId) {
    var url =
      SUPABASE_URL +
      '/rest/v1/products?slug=eq.' +
      encodeURIComponent(slug) +
      '&owner_id=eq.' +
      encodeURIComponent(storeId) +
      '&status=eq.published' +
      '&select=id,name,price,alto,ancho,fondo,model_url,slug';

    return fetchFromSupabase(url).then(function (rows) {
      return rows.length ? rows[0] : null;
    });
  }

  function fetchCatalog(storeId) {
    var url =
      SUPABASE_URL +
      '/rest/v1/products?status=eq.published' +
      '&owner_id=eq.' +
      encodeURIComponent(storeId) +
      '&select=id,name,price,alto,ancho,fondo,model_url,slug' +
      '&order=created_at.desc';

    return fetchFromSupabase(url);
  }

  function slugFromUrl() {
    var parts = window.location.pathname
      .split('/')
      .filter(Boolean);

    return parts.length
      ? decodeURIComponent(parts[parts.length - 1])
      : null;
  }

  function escapeHtml(str) {
    return String(str).replace(/[&<>"']/g, function (character) {
      return {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;'
      }[character];
    });
  }

  function cubeIcon() {
    return (
      '<svg class="line-icon cube-icon" viewBox="0 0 48 48" aria-hidden="true">' +
      '  <path d="M24 5 40 14v20L24 43 8 34V14z" />' +
      '  <path d="M8 14l16 9 16-9" />' +
      '  <path d="M24 23v20" />' +
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

  function sofaIcon() {
    return (
      '<svg class="line-icon" viewBox="0 0 48 48" aria-hidden="true">' +
      '  <path d="M12 22v-5.5A5.5 5.5 0 0 1 17.5 11h13A5.5 5.5 0 0 1 36 16.5V22" />' +
      '  <path d="M9 22h30a4 4 0 0 1 4 4v8H5v-8a4 4 0 0 1 4-4Z" />' +
      '  <path d="M8 34v5M40 34v5M14 22v12M34 22v12" />' +
      '</svg>'
    );
  }

  function rulerIcon() {
    return (
      '<svg class="line-icon" viewBox="0 0 48 48" aria-hidden="true">' +
      '  <path d="m10 32 22-22 6 6-22 22H10z" />' +
      '  <path d="m26 16 3 3M21 21l3 3M16 26l3 3M31 11l3 3" />' +
      '</svg>'
    );
  }

  function scanIcon() {
    return (
      '<svg class="line-icon" viewBox="0 0 48 48" aria-hidden="true">' +
      '  <path d="M17 7H9a2 2 0 0 0-2 2v8M31 7h8a2 2 0 0 1 2 2v8M41 31v8a2 2 0 0 1-2 2h-8M17 41H9a2 2 0 0 1-2-2v-8" />' +
      '  <circle cx="24" cy="24" r="7" />' +
      '  <path d="M24 13v4M24 31v4M13 24h4M31 24h4" />' +
      '</svg>'
    );
  }

  function lockIcon() {
    return (
      '<svg class="line-icon" viewBox="0 0 48 48" aria-hidden="true">' +
      '  <rect x="11" y="21" width="26" height="20" rx="4" />' +
      '  <path d="M17 21v-6a7 7 0 0 1 14 0v6M24 29v5" />' +
      '</svg>'
    );
  }

  function formatProductPrice(value) {
    if (
      value === null ||
      value === undefined ||
      value === ''
    ) {
      return '';
    }

    var raw = String(value).trim();

    if (/[$€£]|ARS|USD/i.test(raw)) {
      return raw;
    }

    var numeric = Number(
      raw
        .replace(/\./g, '')
        .replace(',', '.')
    );

    if (!isFinite(numeric)) {
      return raw;
    }

    return (
      '$ ' +
      numeric.toLocaleString('es-AR', {
        maximumFractionDigits: 0
      })
    );
  }

  // -----------------------------------------------------------
  // UI flotante con Shadow DOM
  // -----------------------------------------------------------

  function buildFAB(currentProduct, storeId) {
    var host = document.createElement('div');

    host.style.all = 'initial';

    document.body.appendChild(host);

    var root = host.attachShadow
      ? host.attachShadow({
          mode: 'open'
        })
      : host;

    var style = document.createElement('style');

    style.textContent = [
      '@import url("https://fonts.googleapis.com/css2?family=Baloo+2:wght@600;700;800&family=DM+Serif+Display&family=Nunito:wght@400;600;700;800;900&display=swap");',

      '*{',
      '  box-sizing:border-box;',
      '}',

      ':host{',
      '  all:initial;',
      '}',

      '.fab-wrap{',
      '  position:fixed;',
      '  right:16px;',
      '  bottom:16px;',
      '  width:54px;',
      '  height:54px;',
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
      '  filter:drop-shadow(0 13px 22px rgba(120,70,28,.28));',
      '  transition:transform .22s ease,filter .22s ease;',
      '}',

      '.fab-wrap:hover svg{',
      '  transform:scale(1.06) rotate(-4deg);',
      '  filter:drop-shadow(0 17px 27px rgba(120,70,28,.34));',
      '}',

      '.fab-wrap.is-open svg{',
      '  transform:scale(.94) rotate(5deg);',
      '}',

      '.menu{',
      '  position:fixed;',
      '  right:16px;',
      '  bottom:78px;',
      '  z-index:999999;',
      '  font-family:"Nunito",-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;',
      '}',

      '.menu.hidden{',
      '  display:none;',
      '}',

      '.menu-card{',
      '  position:relative;',
      '  width:286px;',
      '  min-height:450px;',
      '  padding:32px 20px 24px;',
      '  display:flex;',
      '  flex-direction:column;',
      '  overflow:hidden;',
      '  border-radius:21px;',
      '  background:linear-gradient(180deg,#FFFBF7 0%,#FFF8F0 100%);',
      '  border:1px solid rgba(224,198,169,.78);',
      '  box-shadow:0 26px 58px rgba(74,46,26,.16),0 8px 20px rgba(74,46,26,.07);',
      '  animation:realityMenuIn .22s ease both;',
      '}',

      '@keyframes realityMenuIn{',
      '  from{',
      '    opacity:0;',
      '    transform:translateY(10px) scale(.98);',
      '  }',
      '  to{',
      '    opacity:1;',
      '    transform:translateY(0) scale(1);',
      '  }',
      '}',

      '.menu-close{',
      '  position:absolute;',
      '  top:14px;',
      '  right:14px;',
      '  z-index:3;',
      '  width:28px;',
      '  height:28px;',
      '  display:flex;',
      '  align-items:center;',
      '  justify-content:center;',
      '  border:none;',
      '  border-radius:999px;',
      '  background:transparent;',
      '  color:#5B4738;',
      '  font-size:24px;',
      '  line-height:1;',
      '  font-weight:300;',
      '  cursor:pointer;',
      '  transition:background .16s ease,transform .16s ease;',
      '}',

      '.menu-close:hover{',
      '  background:#F5EBDD;',
      '  transform:rotate(3deg);',
      '}',

      '.menu-header{',
      '  position:relative;',
      '  z-index:1;',
      '  text-align:left;',
      '  margin-bottom:22px;',
      '  padding-right:22px;',
      '}',

      '.menu-mark{',
      '  display:block;',
      '  color:#D89A4D;',
      '  font-size:20px;',
      '  line-height:1;',
      '  margin-bottom:16px;',
      '}',

      '.menu-title{',
      '  display:block;',
      '  max-width:235px;',
      '  margin:0;',
      '  font-family:"Baloo 2","Nunito",system-ui,sans-serif;',
      '  font-size:28px;',
      '  line-height:1.06;',
      '  font-weight:800;',
      '  letter-spacing:-.035em;',
      '  color:#332317;',
      '}',

      '.menu-subtitle{',
      '  display:block;',
      '  margin-top:8px;',
      '  font-size:12.5px;',
      '  line-height:1.35;',
      '  font-weight:600;',
      '  color:#74685F;',
      '}',

      '.menu-body{',
      '  position:relative;',
      '  z-index:1;',
      '  display:flex;',
      '  flex:1;',
      '  flex-direction:column;',
      '  justify-content:center;',
      '  gap:10px;',
      '}',

      '.menu-item{',
      '  width:100%;',
      '  min-height:78px;',
      '  border:1px solid rgba(224,205,184,.94);',
      '  border-radius:15px;',
      '  background:#FFFFFF;',
      '  padding:10px;',
      '  cursor:pointer;',
      '  display:flex;',
      '  align-items:center;',
      '  gap:10px;',
      '  text-align:left;',
      '  color:#3D2A1B;',
      '  box-shadow:0 8px 20px rgba(74,47,29,.045);',
      '  transition:transform .18s ease,box-shadow .18s ease,border-color .18s ease,background .18s ease;',
      '}',

      '.menu-item-primary{',
      '  background:linear-gradient(180deg,#FFF8EF 0%,#FFF3E6 100%);',
      '  border-color:rgba(217,177,131,.90);',
      '}',

      '.menu-item:hover{',
      '  transform:translateY(-2px);',
      '  border-color:rgba(180,122,66,.42);',
      '  box-shadow:0 16px 30px rgba(74,47,29,.11);',
      '}',

      '.menu-item:active{',
      '  transform:translateY(0);',
      '}',

      '.menu-item .ic{',
      '  width:46px;',
      '  height:46px;',
      '  flex:0 0 46px;',
      '  display:flex;',
      '  flex-direction:column;',
      '  align-items:center;',
      '  justify-content:center;',
      '  gap:2px;',
      '  border-radius:13px;',
      '  color:#65452E;',
      '  background:linear-gradient(180deg,#F8EBDD 0%,#F3E4D2 100%);',
      '}',

      '.line-icon{',
      '  width:23px;',
      '  height:23px;',
      '  fill:none;',
      '  stroke:currentColor;',
      '  stroke-width:2.5;',
      '  stroke-linecap:round;',
      '  stroke-linejoin:round;',
      '}',

      '.menu-item .ic-label{',
      '  font-family:"Nunito",-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;',
      '  font-size:10.5px;',
      '  line-height:1;',
      '  font-weight:800;',
      '  color:#75614E;',
      '}',

      '.menu-item .txt{',
      '  flex:1;',
      '  min-width:0;',
      '  display:flex;',
      '  flex-direction:column;',
      '  gap:3px;',
      '}',

      '.menu-item .txt strong{',
      '  display:block;',
      '  font-family:"Nunito",-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;',
      '  font-size:15px;',
      '  line-height:1.08;',
      '  font-weight:900;',
      '  letter-spacing:-.02em;',
      '  color:#251B14;',
      '}',

      '.menu-item .txt small{',
      '  display:block;',
      '  font-size:11px;',
      '  line-height:1.32;',
      '  font-weight:600;',
      '  color:#887A70;',
      '}',

      '.menu-item .chev{',
      '  flex:0 0 auto;',
      '  font-size:25px;',
      '  line-height:1;',
      '  font-weight:500;',
      '  color:#6D4B31;',
      '  transform:translateY(-1px);',
      '}',

      '.menu-footer{',
      '  position:relative;',
      '  z-index:1;',
      '  margin-top:24px;',
      '  padding-top:16px;',
      '  text-align:center;',
      '  font-size:10.5px;',
      '  line-height:1;',
      '  color:#A79A91;',
      '  font-weight:700;',
      '  font-style:italic;',
      '}',

      '.menu-footer:before{',
      '  content:"";',
      '  position:absolute;',
      '  top:0;',
      '  left:0;',
      '  right:0;',
      '  height:1px;',
      '  background:#E9DED1;',
      '}',

      '.menu-footer span{',
      '  color:#D29A58;',
      '  font-style:normal;',
      '  margin:0 7px;',
      '}',

      '.overlay{',
      '  position:fixed;',
      '  inset:0;',
      '  background:rgba(17,19,24,.60);',
      '  display:none;',
      '  align-items:center;',
      '  justify-content:center;',
      '  z-index:9999999;',
      '  padding:14px;',
      '  font-family:"Nunito",-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;',
      '}',

      '.overlay.open{',
      '  display:flex;',
      '}',

      '.modal{',
      '  width:480px;',
      '  max-width:100%;',
      '  max-height:88vh;',
      '  overflow-y:auto;',
      '  border-radius:18px;',
      '  padding:18px;',
      '  background:#FFF7ED;',
      '  border:1px solid rgba(210,174,125,.65);',
      '  box-shadow:0 30px 80px rgba(0,0,0,.28);',
      '}',

      '.modal-top{',
      '  display:flex;',
      '  justify-content:space-between;',
      '  align-items:center;',
      '  gap:12px;',
      '  margin-bottom:11px;',
      '}',

      '.modal-top strong{',
      '  font-size:14px;',
      '  font-weight:900;',
      '  color:#3D2A1B;',
      '}',

      '.ar-overlay{',
      '  background:rgba(46,40,35,.40);',
      '  backdrop-filter:blur(9px);',
      '  -webkit-backdrop-filter:blur(9px);',
      '}',

      '.ar-modal{',
      '  width:720px;',
      '  max-width:100%;',
      '  max-height:94vh;',
      '  overflow-y:auto;',
      '  padding:0;',
      '  border-radius:22px;',
      '  background:linear-gradient(180deg,#FFFBF6 0%,#FFF8EF 100%);',
      '  border:1px solid rgba(221,197,169,.72);',
      '  box-shadow:0 38px 100px rgba(39,29,20,.28),0 10px 32px rgba(61,42,27,.12);',
      '  scrollbar-width:thin;',
      '  scrollbar-color:#DCC5A8 transparent;',
      '}',

      '.ar-modal::-webkit-scrollbar{',
      '  width:7px;',
      '}',

      '.ar-modal::-webkit-scrollbar-thumb{',
      '  background:#DCC5A8;',
      '  border-radius:999px;',
      '}',

      '.ar-modal-header{',
      '  display:flex;',
      '  align-items:center;',
      '  justify-content:space-between;',
      '  gap:18px;',
      '  padding:26px 28px 20px;',
      '}',

      '.ar-heading{',
      '  min-width:0;',
      '  display:flex;',
      '  align-items:center;',
      '  gap:18px;',
      '}',

      '.ar-product-icon{',
      '  width:54px;',
      '  height:54px;',
      '  flex:0 0 54px;',
      '  display:flex;',
      '  align-items:center;',
      '  justify-content:center;',
      '  border-radius:999px;',
      '  color:#B67837;',
      '  background:linear-gradient(180deg,#FFFCF8 0%,#FFF5E9 100%);',
      '  border:1px solid rgba(217,170,115,.58);',
      '  box-shadow:0 6px 14px rgba(95,57,25,.08);',
      '}',

      '.ar-product-icon .line-icon{',
      '  width:27px;',
      '  height:27px;',
      '  stroke-width:2.2;',
      '}',

      '.ar-product-info{',
      '  min-width:0;',
      '  display:flex;',
      '  align-items:baseline;',
      '  flex-wrap:wrap;',
      '  gap:7px 22px;',
      '}',

      '.ar-title{',
      '  min-width:0;',
      '  overflow:hidden;',
      '  text-overflow:ellipsis;',
      '  white-space:nowrap;',
      '  font-family:"DM Serif Display",Georgia,serif;',
      '  font-size:27px;',
      '  line-height:1.05;',
      '  font-weight:400;',
      '  letter-spacing:-.02em;',
      '  color:#30231B;',
      '}',

      '.ar-price{',
      '  font-size:16.5px;',
      '  line-height:1;',
      '  font-weight:900;',
      '  color:#B67837;',
      '  white-space:nowrap;',
      '}',

      '.ar-modal .close{',
      '  width:48px;',
      '  height:48px;',
      '  flex:0 0 48px;',
      '  display:flex;',
      '  align-items:center;',
      '  justify-content:center;',
      '  background:#FFFCF8;',
      '  border:1px solid rgba(226,208,187,.78);',
      '  color:#735132;',
      '  font-size:27px;',
      '  font-weight:300;',
      '  line-height:1;',
      '  box-shadow:0 8px 18px rgba(84,55,29,.10);',
      '  transition:transform .18s ease,background .18s ease,box-shadow .18s ease;',
      '}',

      '.ar-modal .close:hover{',
      '  transform:rotate(5deg) scale(1.03);',
      '  background:#FFF7EC;',
      '  box-shadow:0 11px 22px rgba(84,55,29,.14);',
      '}',

      '.ar-frame{',
      '  position:relative;',
      '  width:auto;',
      '  height:430px;',
      '  margin:0 28px;',
      '  overflow:hidden;',
      '  border-radius:18px;',
      '  background:radial-gradient(circle at 50% 47%,rgba(255,255,255,.98) 0%,rgba(251,247,241,.92) 46%,rgba(241,234,225,.86) 100%);',
      '  border:1px solid rgba(226,212,195,.82);',
      '  box-shadow:inset 0 1px 0 rgba(255,255,255,.9);',
      '}',

      '.ar-viewer{',
      '  position:absolute;',
      '  inset:0;',
      '  width:100%;',
      '  height:100%;',
      '  --poster-color:transparent;',
      '  background:transparent;',
      '}',

      '.native-ar-trigger{',
      '  position:absolute;',
      '  width:1px;',
      '  height:1px;',
      '  opacity:0;',
      '  pointer-events:none;',
      '  overflow:hidden;',
      '}',

      '.measure-layer{',
      '  position:absolute;',
      '  inset:0;',
      '  z-index:4;',
      '  pointer-events:none;',
      '  opacity:0;',
      '  transform:scale(.985);',
      '  transition:opacity .2s ease,transform .2s ease;',
      '}',

      '.ar-overlay.showing-dims .measure-layer{',
      '  opacity:1;',
      '  transform:scale(1);',
      '}',

      '.measure{',
      '  position:absolute;',
      '  color:#6B513B;',
      '  font-size:12px;',
      '  line-height:1.15;',
      '  font-weight:800;',
      '  letter-spacing:-.01em;',
      '}',

      '.measure b{',
      '  font-weight:900;',
      '}',

      '.measure-rule{',
      '  position:absolute;',
      '  display:block;',
      '  background:#7A5E43;',
      '}',

      '.measure-rule:before,',
      '.measure-rule:after{',
      '  content:"";',
      '  position:absolute;',
      '  display:block;',
      '  background:#7A5E43;',
      '}',

      '.measure-label{',
      '  position:absolute;',
      '  z-index:2;',
      '  display:block;',
      '  padding:3px 8px;',
      '  border-radius:6px;',
      '  background:rgba(250,246,240,.94);',
      '  box-shadow:0 2px 8px rgba(72,48,29,.04);',
      '  white-space:nowrap;',
      '}',

      '.measure-width{',
      '  top:58px;',
      '  left:20%;',
      '  right:17%;',
      '  height:28px;',
      '}',

      '.measure-width .measure-rule{',
      '  left:0;',
      '  right:0;',
      '  top:50%;',
      '  height:1px;',
      '}',

      '.measure-width .measure-rule:before,',
      '.measure-width .measure-rule:after{',
      '  top:-4px;',
      '  width:1px;',
      '  height:9px;',
      '}',

      '.measure-width .measure-rule:before{',
      '  left:0;',
      '}',

      '.measure-width .measure-rule:after{',
      '  right:0;',
      '}',

      '.measure-width .measure-label{',
      '  top:50%;',
      '  left:50%;',
      '  transform:translate(-50%,-50%);',
      '}',

      '.measure-height{',
      '  top:104px;',
      '  bottom:98px;',
      '  left:23px;',
      '  width:84px;',
      '}',

      '.measure-height .measure-rule{',
      '  top:0;',
      '  bottom:0;',
      '  left:51px;',
      '  width:1px;',
      '}',

      '.measure-height .measure-rule:before,',
      '.measure-height .measure-rule:after{',
      '  left:-4px;',
      '  width:9px;',
      '  height:1px;',
      '}',

      '.measure-height .measure-rule:before{',
      '  top:0;',
      '}',

      '.measure-height .measure-rule:after{',
      '  bottom:0;',
      '}',

      '.measure-height .measure-label{',
      '  top:50%;',
      '  left:0;',
      '  max-width:48px;',
      '  padding:4px 3px;',
      '  text-align:center;',
      '  white-space:normal;',
      '  transform:translateY(-50%);',
      '}',

      '.measure-depth{',
      '  right:22px;',
      '  bottom:70px;',
      '  width:138px;',
      '  height:86px;',
      '}',

      '.measure-depth .measure-rule{',
      '  left:8px;',
      '  bottom:10px;',
      '  width:82px;',
      '  height:1px;',
      '  transform:rotate(-48deg);',
      '  transform-origin:left center;',
      '}',

      '.measure-depth .measure-rule:before,',
      '.measure-depth .measure-rule:after{',
      '  top:-4px;',
      '  width:1px;',
      '  height:9px;',
      '}',

      '.measure-depth .measure-rule:before{',
      '  left:0;',
      '}',

      '.measure-depth .measure-rule:after{',
      '  right:0;',
      '}',

      '.measure-depth .measure-label{',
      '  right:0;',
      '  bottom:0;',
      '  max-width:78px;',
      '  white-space:normal;',
      '  text-align:left;',
      '}',

      '.ar-frame-note{',
      '  position:absolute;',
      '  left:18px;',
      '  bottom:15px;',
      '  z-index:5;',
      '  display:flex;',
      '  align-items:center;',
      '  gap:10px;',
      '  max-width:330px;',
      '  color:#725F50;',
      '  font-size:11.5px;',
      '  line-height:1.35;',
      '  font-weight:600;',
      '  pointer-events:none;',
      '}',

      '.ar-frame-note .line-icon{',
      '  width:27px;',
      '  height:27px;',
      '  flex:0 0 27px;',
      '  color:#9E7449;',
      '  stroke-width:2;',
      '}',

      '.ar-actions{',
      '  display:grid;',
      '  grid-template-columns:1fr 1fr;',
      '  gap:14px;',
      '  margin:18px 28px 0;',
      '}',

      '.ar-action-btn{',
      '  height:54px;',
      '  display:flex;',
      '  align-items:center;',
      '  justify-content:center;',
      '  gap:10px;',
      '  border-radius:14px;',
      '  font-family:"Nunito",-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;',
      '  font-size:14px;',
      '  line-height:1;',
      '  font-weight:900;',
      '  cursor:pointer;',
      '  transition:transform .18s ease,box-shadow .18s ease,background .18s ease,border-color .18s ease;',
      '}',

      '.ar-action-btn:hover{',
      '  transform:translateY(-1px);',
      '}',

      '.ar-action-btn:active{',
      '  transform:translateY(0);',
      '}',

      '.ar-action-btn .line-icon{',
      '  width:21px;',
      '  height:21px;',
      '  stroke-width:2.4;',
      '}',

      '.dims-toggle{',
      '  border:1px solid rgba(205,155,99,.72);',
      '  background:rgba(255,255,255,.56);',
      '  color:#76502F;',
      '  box-shadow:inset 0 1px 0 rgba(255,255,255,.9);',
      '}',

      '.dims-toggle:hover,',
      '.ar-overlay.showing-dims .dims-toggle{',
      '  background:#FFF8EF;',
      '  border-color:#C98A49;',
      '  box-shadow:0 8px 18px rgba(122,75,34,.08);',
      '}',

      '.ar-open-btn{',
      '  border:1px solid rgba(188,123,56,.24);',
      '  background:linear-gradient(180deg,#D7A566 0%,#C58947 100%);',
      '  color:#FFFFFF;',
      '  box-shadow:0 11px 24px rgba(160,99,40,.20);',
      '}',

      '.ar-open-btn:hover{',
      '  background:linear-gradient(180deg,#DCAA6A 0%,#C18342 100%);',
      '  box-shadow:0 14px 28px rgba(160,99,40,.25);',
      '}',

      '.ar-security{',
      '  display:flex;',
      '  align-items:center;',
      '  justify-content:center;',
      '  gap:7px;',
      '  margin:14px 28px 20px;',
      '  color:#A38F7C;',
      '  font-size:11px;',
      '  line-height:1.25;',
      '  font-weight:600;',
      '  text-align:center;',
      '}',

      '.ar-security .line-icon{',
      '  width:15px;',
      '  height:15px;',
      '  flex:0 0 15px;',
      '  color:#B58A5C;',
      '  stroke-width:2.3;',
      '}',

      '.close{',
      '  width:28px;',
      '  height:28px;',
      '  border:none;',
      '  border-radius:999px;',
      '  background:#F1E4D1;',
      '  color:#6E4127;',
      '  font-size:16px;',
      '  cursor:pointer;',
      '}',

      '.hint{',
      '  font-size:11px;',
      '  color:#8A7B68;',
      '  margin:8px 0 0;',
      '  line-height:1.35;',
      '}',

      '.poweredby{',
      '  font-size:10px;',
      '  color:#9E8667;',
      '  margin-top:10px;',
      '  text-align:center;',
      '  font-weight:800;',
      '  font-style:italic;',
      '}',

      '.upload-zone{',
      '  border:1.5px dashed #DCC8A9;',
      '  border-radius:14px;',
      '  padding:20px;',
      '  text-align:center;',
      '  cursor:pointer;',
      '  background:#FFFFFF;',
      '  margin-bottom:10px;',
      '  color:#6E4127;',
      '}',

      '.upload-zone img{',
      '  max-width:100%;',
      '  max-height:140px;',
      '  border-radius:10px;',
      '}',

      '.upload-zone p{',
      '  font-size:11.5px;',
      '  color:#8A7B68;',
      '  margin:7px 0 0;',
      '  line-height:1.45;',
      '}',

      '.user-note{',
      '  width:100%;',
      '  min-height:46px;',
      '  max-height:90px;',
      '  margin-top:8px;',
      '  padding:8px 10px;',
      '  border:1px solid #E0CDB0;',
      '  border-radius:10px;',
      '  background:#FFFFFF;',
      '  color:#3A2F22;',
      '  font-family:inherit;',
      '  font-size:11.5px;',
      '  line-height:1.4;',
      '  resize:vertical;',
      '}',

      '.user-note:focus{',
      '  outline:none;',
      '  border-color:#A8632C;',
      '}',

      '.user-note::placeholder{',
      '  color:#A89680;',
      '}',

      '.analyze-btn{',
      '  width:100%;',
      '  background:#6B4A32;',
      '  color:#FFF7ED;',
      '  border:none;',
      '  padding:10px;',
      '  border-radius:999px;',
      '  font-size:11.5px;',
      '  font-weight:800;',
      '  cursor:pointer;',
      '  margin-bottom:10px;',
      '  display:none;',
      '  align-items:center;',
      '  justify-content:center;',
      '  gap:6px;',
      '}',

      '.analyze-btn.show{',
      '  display:flex;',
      '}',

      '.analyze-btn:disabled{',
      '  opacity:.6;',
      '  cursor:default;',
      '}',

      '.analyze-btn .line-icon{',
      '  width:14px;',
      '  height:14px;',
      '  color:#FFF7ED;',
      '}',

      '.rec-banner{',
      '  font-size:11px;',
      '  font-weight:700;',
      '  color:#5C6B4F;',
      '  background:#E9EFE3;',
      '  padding:8px 10px;',
      '  border-radius:10px;',
      '  margin-bottom:10px;',
      '  display:none;',
      '  line-height:1.4;',
      '}',

      '.rec-banner.show{',
      '  display:block;',
      '}',

      '.cat-note{',
      '  font-size:11px;',
      '  color:#7E6B54;',
      '  background:#F3E8D7;',
      '  padding:9px 10px;',
      '  border-radius:10px;',
      '  margin-bottom:12px;',
      '  line-height:1.5;',
      '}',

      '.cat-list{',
      '  display:flex;',
      '  flex-direction:column;',
      '  gap:8px;',
      '}',

      '.cat-item{',
      '  display:flex;',
      '  flex-direction:column;',
      '  gap:8px;',
      '  border:1px solid #E0CDB0;',
      '  border-radius:12px;',
      '  padding:10px 12px;',
      '  background:#FFFFFF;',
      '}',

      '.cat-item.recommended{',
      '  border-color:#A8632C;',
      '  background:#FBF0E1;',
      '  box-shadow:0 6px 14px rgba(168,99,44,.12);',
      '}',

      '.cat-item .info strong{',
      '  font-size:12.5px;',
      '  display:block;',
      '  color:#2D2016;',
      '}',

      '.cat-item .info span{',
      '  font-size:10.5px;',
      '  color:#8A7B68;',
      '}',

      '.cat-item .reason{',
      '  font-size:10.5px;',
      '  color:#A8632C;',
      '  margin-top:4px;',
      '  font-style:italic;',
      '  line-height:1.35;',
      '}',

      '.cat-actions{',
      '  display:flex;',
      '  gap:6px;',
      '}',

      '.cat-actions button{',
      '  flex:1;',
      '  display:flex;',
      '  align-items:center;',
      '  justify-content:center;',
      '  gap:5px;',
      '  border:none;',
      '  padding:7px 8px;',
      '  border-radius:999px;',
      '  font-size:10.5px;',
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
      '  width:11.5px;',
      '  height:11.5px;',
      '}',

      '.result-frame{',
      '  width:100%;',
      '  min-height:280px;',
      '  background:#FFFFFF;',
      '  border:1px solid rgba(218,196,165,.75);',
      '  border-radius:14px;',
      '  overflow:hidden;',
      '  margin-bottom:8px;',
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
      '  gap:8px;',
      '  color:#8A7B68;',
      '  font-size:11.5px;',
      '  font-weight:700;',
      '  padding:32px 16px;',
      '  text-align:center;',
      '}',

      '.result-loading .line-icon{',
      '  width:22px;',
      '  height:22px;',
      '  color:#A8632C;',
      '  animation:spin 1.4s linear infinite;',
      '}',

      '@keyframes spin{',
      '  from{',
      '    transform:rotate(0deg);',
      '  }',
      '  to{',
      '    transform:rotate(360deg);',
      '  }',
      '}',

      '.empty{',
      '  font-size:11.5px;',
      '  color:#8A7B68;',
      '  text-align:center;',
      '  padding:16px 0;',
      '}',

      '@media (max-width:520px){',
      '  .menu{',
      '    right:10px;',
      '    bottom:78px;',
      '  }',
      '  .menu-card{',
      '    width:calc(100vw - 16px);',
      '    max-width:286px;',
      '    min-height:420px;',
      '    padding:28px 16px 20px;',
      '    border-radius:19px;',
      '  }',
      '  .menu-close{',
      '    top:10px;',
      '    right:10px;',
      '  }',
      '  .menu-header{',
      '    margin-bottom:20px;',
      '    padding-right:26px;',
      '  }',
      '  .menu-mark{',
      '    margin-bottom:12px;',
      '  }',
      '  .menu-title{',
      '    font-size:25px;',
      '    max-width:210px;',
      '  }',
      '  .menu-subtitle{',
      '    font-size:10.5px;',
      '    margin-top:7px;',
      '  }',
      '  .menu-body{',
      '    gap:9px;',
      '  }',
      '  .menu-item{',
      '    min-height:74px;',
      '    padding:9px;',
      '    gap:9px;',
      '    border-radius:14px;',
      '  }',
      '  .menu-item .ic{',
      '    width:44px;',
      '    height:44px;',
      '    flex-basis:44px;',
      '    border-radius:12px;',
      '  }',
      '  .menu-item .line-icon{',
      '    width:22px;',
      '    height:22px;',
      '  }',
      '  .menu-item .ic-label{',
      '    font-size:10px;',
      '  }',
      '  .menu-item .txt strong{',
      '    font-size:14px;',
      '  }',
      '  .menu-item .txt small{',
      '    font-size:10.5px;',
      '  }',
      '  .menu-item .chev{',
      '    font-size:24px;',
      '  }',
      '  .menu-footer{',
      '    margin-top:20px;',
      '    padding-top:14px;',
      '    font-size:10px;',
      '  }',
      '  .fab-wrap{',
      '    right:10px;',
      '    bottom:10px;',
      '    width:52px;',
      '    height:52px;',
      '  }',
      '  .ar-modal{',
      '    width:100%;',
      '    max-height:94vh;',
      '    border-radius:18px;',
      '  }',
      '  .ar-modal-header{',
      '    gap:10px;',
      '    padding:16px 16px 13px;',
      '  }',
      '  .ar-heading{',
      '    gap:11px;',
      '  }',
      '  .ar-product-icon{',
      '    width:44px;',
      '    height:44px;',
      '    flex-basis:44px;',
      '  }',
      '  .ar-product-icon .line-icon{',
      '    width:23px;',
      '    height:23px;',
      '  }',
      '  .ar-product-info{',
      '    display:block;',
      '  }',
      '  .ar-title{',
      '    display:block;',
      '    max-width:calc(100vw - 150px);',
      '    font-size:21px;',
      '  }',
      '  .ar-price{',
      '    display:block;',
      '    margin-top:4px;',
      '    font-size:13.5px;',
      '  }',
      '  .ar-modal .close{',
      '    width:42px;',
      '    height:42px;',
      '    flex-basis:42px;',
      '    font-size:24px;',
      '  }',
      '  .ar-frame{',
      '    height:min(56vh,390px);',
      '    min-height:310px;',
      '    margin:0 14px;',
      '    border-radius:15px;',
      '  }',
      '  .measure-width{',
      '    top:45px;',
      '    left:20%;',
      '    right:14%;',
      '  }',
      '  .measure-height{',
      '    top:88px;',
      '    bottom:88px;',
      '    left:7px;',
      '  }',
      '  .measure-depth{',
      '    right:8px;',
      '    bottom:60px;',
      '    transform:scale(.86);',
      '    transform-origin:right bottom;',
      '  }',
      '  .measure{',
      '    font-size:10px;',
      '  }',
      '  .ar-frame-note{',
      '    left:12px;',
      '    bottom:11px;',
      '    max-width:245px;',
      '    gap:7px;',
      '    font-size:9.5px;',
      '  }',
      '  .ar-frame-note .line-icon{',
      '    width:23px;',
      '    height:23px;',
      '    flex-basis:23px;',
      '  }',
      '  .ar-actions{',
      '    gap:8px;',
      '    margin:13px 14px 0;',
      '  }',
      '  .ar-action-btn{',
      '    height:48px;',
      '    gap:7px;',
      '    border-radius:12px;',
      '    font-size:11.5px;',
      '  }',
      '  .ar-action-btn .line-icon{',
      '    width:18px;',
      '    height:18px;',
      '  }',
      '  .ar-security{',
      '    margin:11px 14px 15px;',
      '    font-size:9.5px;',
      '  }',
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
        ? '<button class="menu-item menu-item-primary" id="opt3d">' +
          '  <span class="ic">' +
          cubeIcon() +
          '    <span class="ic-label">3D</span>' +
          '  </span>' +
          '  <span class="txt">' +
          '    <strong>Ver en 3D</strong>' +
          '    <small>Exploralo y probalo<br>en realidad aumentada</small>' +
          '  </span>' +
          '  <span class="chev">›</span>' +
          '</button>'
        : '') +
      '<button class="menu-item" id="optCatalog">' +
      '  <span class="ic">' +
      cameraIcon() +
      '  </span>' +
      '  <span class="txt">' +
      '    <strong>Probar en mi espacio</strong>' +
      '    <small>Subí una foto de tu<br>ambiente y visualizalo</small>' +
      '  </span>' +
      '  <span class="chev">›</span>' +
      '</button>';

    menu.innerHTML =
      '<div class="menu-card">' +
      '  <button class="menu-close" id="menuClose" aria-label="Cerrar">×</button>' +
      '  <div class="menu-header">' +
      '    <span class="menu-mark">✦</span>' +
      '    <strong class="menu-title">Probá este mueble<br>en tu casa</strong>' +
      '    <span class="menu-subtitle">Elegí cómo querés visualizarlo</span>' +
      '  </div>' +
      '  <div class="menu-body">' +
      itemsHtml +
      '  </div>' +
      '  <div class="menu-footer">' +
      '    <span>✦</span>' +
      '    powered by reality' +
      '    <span>✦</span>' +
      '  </div>' +
      '</div>';

    root.appendChild(menu);

    var menuClose = menu.querySelector('#menuClose');

    menuClose.addEventListener('click', function (event) {
      event.stopPropagation();

      menu.classList.add('hidden');
      fab.classList.remove('is-open');
    });

    fab.addEventListener('click', function (event) {
      event.stopPropagation();

      menu.classList.toggle('hidden');

      fab.classList.toggle(
        'is-open',
        !menu.classList.contains('hidden')
      );
    });

    document.addEventListener('click', function (event) {
      var path = event.composedPath
        ? event.composedPath()
        : [];

      var clickedInside = path.indexOf(host) !== -1;

      if (!clickedInside) {
        menu.classList.add('hidden');
        fab.classList.remove('is-open');
      }
    });

    document.addEventListener('keydown', function (event) {
      if (event.key === 'Escape') {
        menu.classList.add('hidden');
        fab.classList.remove('is-open');
      }
    });

    var arOverlay = buildAROverlay(root);
    var resultOverlay = buildResultOverlay(root);

    var catalogOverlay = buildCatalogOverlay(
      root,
      arOverlay,
      resultOverlay
    );

    catalogOverlay._storeId = storeId;

    if (
      currentProduct &&
      menu.querySelector('#opt3d')
    ) {
      menu
        .querySelector('#opt3d')
        .addEventListener('click', function () {
          menu.classList.add('hidden');
          fab.classList.remove('is-open');

          openAR(arOverlay, currentProduct);
        });
    }

    menu
      .querySelector('#optCatalog')
      .addEventListener('click', function () {
        menu.classList.add('hidden');
        fab.classList.remove('is-open');

        openCatalog(catalogOverlay);
      });
  }

  function buildAROverlay(root) {
    var overlay = document.createElement('div');

    overlay.className = 'overlay ar-overlay';

    overlay.innerHTML =
      '<div class="modal ar-modal" role="dialog" aria-modal="true" aria-label="Visualizador 3D del producto">' +
      '  <div class="ar-modal-header">' +
      '    <div class="ar-heading">' +
      '      <span class="ar-product-icon">' +
      sofaIcon() +
      '      </span>' +
      '      <div class="ar-product-info">' +
      '        <strong class="ar-title" id="arTitle"></strong>' +
      '        <span class="ar-price" id="arPrice"></span>' +
      '      </div>' +
      '    </div>' +
      '    <button class="close" aria-label="Cerrar">×</button>' +
      '  </div>' +

      '  <div class="ar-frame">' +
      '    <model-viewer ' +
      '      id="arViewer" ' +
      '      class="ar-viewer" ' +
      '      camera-controls ' +
      '      interaction-prompt="none" ' +
      '      shadow-intensity="1.15" ' +
      '      shadow-softness=".9" ' +
      '      exposure="1" ' +
      '      environment-image="neutral" ' +
      '      camera-orbit="0deg 76deg auto" ' +
      '      field-of-view="31deg" ' +
      '      min-camera-orbit="auto 55deg auto" ' +
      '      max-camera-orbit="auto 88deg auto" ' +
      '      ar ' +
      '      ar-modes="webxr scene-viewer quick-look" ' +
      '      ar-scale="fixed" ' +
      '      ar-placement="floor">' +
      '      <button slot="ar-button" class="native-ar-trigger" id="nativeArTrigger" tabindex="-1">Abrir en AR</button>' +
      '    </model-viewer>' +

      '    <div class="measure-layer" aria-hidden="true">' +
      '      <div class="measure measure-width">' +
      '        <span class="measure-rule"></span>' +
      '        <span class="measure-label">Ancho: <b id="dimAncho"></b></span>' +
      '      </div>' +

      '      <div class="measure measure-height">' +
      '        <span class="measure-rule"></span>' +
      '        <span class="measure-label">Alto:<br><b id="dimAlto"></b></span>' +
      '      </div>' +

      '      <div class="measure measure-depth">' +
      '        <span class="measure-rule"></span>' +
      '        <span class="measure-label">Profundidad:<br><b id="dimFondo"></b></span>' +
      '      </div>' +
      '    </div>' +

      '    <div class="ar-frame-note">' +
      scanIcon() +
      '      <span>Desde el celular, tocá “Abrir en AR” para abrir la cámara y ver el mueble en tu espacio.</span>' +
      '    </div>' +
      '  </div>' +

      '  <div class="ar-actions">' +
      '    <button class="ar-action-btn dims-toggle" id="dimsToggle" type="button" aria-pressed="false">' +
      rulerIcon() +
      '      <span>Ver medidas</span>' +
      '    </button>' +

      '    <button class="ar-action-btn ar-open-btn" id="openArBtn" type="button">' +
      scanIcon() +
      '      <span>Abrir en AR</span>' +
      '    </button>' +
      '  </div>' +

      '  <div class="ar-security">' +
      lockIcon() +
      '    <span>Tu espacio, a escala real. Seguro y privado.</span>' +
      '  </div>' +
      '</div>';

    root.appendChild(overlay);

    overlay
      .querySelector('.close')
      .addEventListener('click', function () {
        overlay.classList.remove('open');
      });

    overlay.addEventListener('click', function (event) {
      if (event.target === overlay) {
        overlay.classList.remove('open');
      }
    });

    overlay
      .querySelector('#dimsToggle')
      .addEventListener('click', function (event) {
        var showing =
          overlay.classList.toggle('showing-dims');

        var label =
          event.currentTarget.querySelector('span');

        event.currentTarget.setAttribute(
          'aria-pressed',
          showing ? 'true' : 'false'
        );

        label.textContent = showing
          ? 'Ocultar medidas'
          : 'Ver medidas';
      });

    overlay
      .querySelector('#openArBtn')
      .addEventListener('click', function () {
        var viewer =
          overlay.querySelector('#arViewer');

        var nativeButton =
          overlay.querySelector('#nativeArTrigger');

        try {
          if (
            viewer &&
            typeof viewer.activateAR === 'function'
          ) {
            var activation = viewer.activateAR();

            if (
              activation &&
              typeof activation.catch === 'function'
            ) {
              activation.catch(function () {
                if (nativeButton) {
                  nativeButton.click();
                }
              });
            }

            return;
          }
        } catch (error) {
          // Si el método no está disponible en este navegador,
          // usamos el botón nativo de model-viewer.
        }

        if (nativeButton) {
          nativeButton.click();
        }
      });

    return overlay;
  }

  function openAR(overlay, product) {
    ensureModelViewer().then(function () {
      overlay.querySelector('#arTitle').textContent =
        product.name || 'Producto';

      overlay.querySelector('#arPrice').textContent =
        formatProductPrice(product.price);

      overlay.querySelector('#dimAlto').textContent =
        product.alto + ' cm';

      overlay.querySelector('#dimAncho').textContent =
        product.ancho + ' cm';

      overlay.querySelector('#dimFondo').textContent =
        product.fondo + ' cm';

      var viewer =
        overlay.querySelector('#arViewer');

      viewer.setAttribute(
        'src',
        product.model_url
      );

      applyRealScale(
        viewer,
        product.alto,
        product.ancho,
        product.fondo
      );

      overlay._currentProduct = product;

      overlay.classList.remove(
        'showing-dims'
      );

      var toggle =
        overlay.querySelector('#dimsToggle');

      toggle.setAttribute(
        'aria-pressed',
        'false'
      );

      toggle.querySelector('span').textContent =
        'Ver medidas';

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
      '    <div class="result-loading" id="resultLoading">' +
      sparkIcon() +
      '      <span>Generando la imagen…</span>' +
      '    </div>' +
      '    <img id="resultImage" alt="Resultado generado" style="display:none;">' +
      '  </div>' +

      '  <p class="hint">' +
      '    Imagen generada por IA a partir de tu foto. Es una interpretación, no una medición exacta como el AR.' +
      '  </p>' +

      '  <div class="poweredby">powered by reality</div>' +
      '</div>';

    root.appendChild(overlay);

    overlay
      .querySelector('.close')
      .addEventListener('click', function () {
        overlay.classList.remove('open');
      });

    overlay.addEventListener('click', function (event) {
      if (event.target === overlay) {
        overlay.classList.remove('open');
      }
    });

    return overlay;
  }

  function buildCatalogOverlay(
    root,
    arOverlay,
    resultOverlay
  ) {
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
      cameraIcon() +
      '      <p>Subí una foto del lugar donde querés probar un mueble.</p>' +
      '    </div>' +

      '    <img id="uploadPreview" alt="Vista previa" style="display:none;">' +

      '    <input ' +
      '      type="file" ' +
      '      id="uploadInput" ' +
      '      accept="image/*" ' +
      '      style="display:none;">' +
      '  </div>' +

      '  <textarea ' +
      '    class="user-note" ' +
      '    id="userNote" ' +
      '    placeholder="¿Algo que quieras contarnos? Ej: quiero algo para el rincón de la ventana, o que combine con la pared blanca (opcional)"></textarea>' +

      '  <button class="analyze-btn" id="analyzeBtn">' +
      sparkIcon() +
      '    Buscar qué mueble queda mejor acá' +
      '  </button>' +

      '  <div class="rec-banner" id="recBanner"></div>' +

      '  <div class="cat-note">' +
      '    También podés elegir vos directo del catálogo completo:' +
      '  </div>' +

      '  <div class="cat-list" id="catList">' +
      '    <div class="empty">Cargando catálogo…</div>' +
      '  </div>' +

      '  <div class="poweredby">powered by reality</div>' +
      '</div>';

    root.appendChild(overlay);

    var zone =
      overlay.querySelector('#uploadZone');

    var input =
      overlay.querySelector('#uploadInput');

    var preview =
      overlay.querySelector('#uploadPreview');

    var placeholder =
      overlay.querySelector('#uploadPlaceholder');

    var analyzeBtn =
      overlay.querySelector('#analyzeBtn');

    var recBanner =
      overlay.querySelector('#recBanner');

    var userNoteField =
      overlay.querySelector('#userNote');

    var uploadedBase64 = null;
    var uploadedMediaType = null;

    zone.addEventListener('click', function () {
      input.click();
    });

    input.addEventListener('change', function (event) {
      var file = event.target.files[0];

      if (!file) {
        return;
      }

      var reader = new FileReader();

      reader.onload = function (readerEvent) {
        preview.src =
          readerEvent.target.result;

        preview.style.display = 'block';
        placeholder.style.display = 'none';

        uploadedBase64 =
          readerEvent.target.result.split(',')[1];

        uploadedMediaType = file.type;

        overlay._uploadedPhoto = {
          base64: uploadedBase64,
          mediaType: uploadedMediaType
        };

        analyzeBtn.classList.add('show');
        recBanner.classList.remove('show');
      };

      reader.readAsDataURL(file);
    });

    analyzeBtn.addEventListener('click', function () {
      if (!uploadedBase64) {
        return;
      }

      analyzeBtn.disabled = true;

      var originalLabel =
        analyzeBtn.innerHTML;

      analyzeBtn.textContent =
        'Analizando tu ambiente…';

      var list =
        overlay.querySelector('#catList');

      var products =
        overlay._products || [];

      fetch(SITE_DOMAIN + '/api/recommend', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          imageBase64: uploadedBase64,
          imageMediaType: uploadedMediaType,
          userNote: userNoteField.value.trim(),

          products: products.map(function (product) {
            return {
              id: product.id,
              name: product.name,
              price: product.price,
              alto: product.alto,
              ancho: product.ancho,
              fondo: product.fondo
            };
          })
        })
      })
        .then(function (response) {
          return response.json();
        })
        .then(function (data) {
          analyzeBtn.disabled = false;
          analyzeBtn.innerHTML = originalLabel;

          if (
            data.error ||
            !data.recommendations ||
            !data.recommendations.length
          ) {
            recBanner.textContent =
              'No se pudo analizar la foto ahora — elegí del catálogo abajo.';

            recBanner.classList.add('show');

            return;
          }

          recBanner.textContent =
            '✦ Encontramos ' +
            data.recommendations.length +
            ' mueble(s) que podrían quedar bien acá';

          recBanner.classList.add('show');

          renderCatalogList(
            list,
            products,
            overlay,
            data.recommendations
          );
        })
        .catch(function () {
          analyzeBtn.disabled = false;
          analyzeBtn.innerHTML = originalLabel;

          recBanner.textContent =
            'No se pudo analizar la foto ahora — elegí del catálogo abajo.';

          recBanner.classList.add('show');
        });
    });

    overlay
      .querySelector('.close')
      .addEventListener('click', function () {
        overlay.classList.remove('open');
      });

    overlay.addEventListener('click', function (event) {
      if (event.target === overlay) {
        overlay.classList.remove('open');
      }
    });

    overlay._loaded = false;
    overlay._arOverlay = arOverlay;
    overlay._resultOverlay = resultOverlay;
    overlay._root = root;
    overlay._uploadedPhoto = null;

    return overlay;
  }

  function renderCatalogList(
    list,
    products,
    overlay,
    recommendations
  ) {
    var arOverlay = overlay._arOverlay;
    var recMap = {};

    (recommendations || []).forEach(function (
      recommendation
    ) {
      recMap[recommendation.id] =
        recommendation.reason;
    });

    var sorted = products.slice().sort(function (
      productA,
      productB
    ) {
      var recommendationA =
        recMap[productA.id] ? 1 : 0;

      var recommendationB =
        recMap[productB.id] ? 1 : 0;

      return recommendationB - recommendationA;
    });

    list.innerHTML = sorted
      .map(function (product) {
        var isRecommended = Boolean(
          recMap[product.id]
        );

        return (
          '<div class="cat-item' +
          (isRecommended ? ' recommended' : '') +
          '" data-id="' +
          escapeHtml(product.id) +
          '">' +

          '  <div class="info">' +
          '    <strong>' +
          (isRecommended ? '✦ ' : '') +
          escapeHtml(product.name) +
          '</strong>' +

          '    <span>' +
          escapeHtml(product.price) +
          ' · ' +
          product.alto +
          '×' +
          product.ancho +
          '×' +
          product.fondo +
          ' cm</span>' +

          (isRecommended
            ? '<div class="reason">' +
              escapeHtml(recMap[product.id]) +
              '</div>'
            : '') +
          '  </div>' +

          '  <div class="cat-actions">' +
          '    <button class="cat-btn-3d">Ver en 3D</button>' +

          '    <button class="cat-btn-gen">' +
          sparkIcon() +
          '      Generar imagen' +
          '    </button>' +
          '  </div>' +
          '</div>'
        );
      })
      .join('');

    list
      .querySelectorAll('.cat-item')
      .forEach(function (item, index) {
        item
          .querySelector('.cat-btn-3d')
          .addEventListener('click', function () {
            openAR(
              arOverlay,
              sorted[index]
            );
          });

        item
          .querySelector('.cat-btn-gen')
          .addEventListener('click', function (event) {
            generateComposite(
              overlay,
              sorted[index],
              event.currentTarget
            );
          });
      });
  }

  function generateComposite(
    overlay,
    product,
    buttonElement
  ) {
    if (!overlay._uploadedPhoto) {
      var recBanner =
        overlay.querySelector('#recBanner');

      recBanner.textContent =
        'Antes subí una foto de tu ambiente, arriba de todo.';

      recBanner.classList.add('show');

      return;
    }

    var originalLabel =
      buttonElement.innerHTML;

    buttonElement.disabled = true;
    buttonElement.textContent = 'Preparando…';

    ensureModelViewer()
      .then(function () {
        var snap =
          document.createElement('model-viewer');

        snap.setAttribute(
          'src',
          product.model_url
        );

        snap.setAttribute(
          'crossorigin',
          'anonymous'
        );

        snap.setAttribute(
          'exposure',
          '1'
        );

        snap.setAttribute(
          'environment-image',
          'neutral'
        );

        snap.setAttribute(
          'camera-orbit',
          '35deg 75deg auto'
        );

        snap.setAttribute(
          'shadow-intensity',
          '0'
        );

        snap.style.cssText =
          'position:fixed;' +
          'top:0;' +
          'left:0;' +
          'width:640px;' +
          'height:640px;' +
          'background:#fff;' +
          'opacity:0.01;' +
          'pointer-events:none;' +
          'z-index:-1;';

        overlay._root.appendChild(snap);

        var settled = false;

        function failCapture(error) {
          console.error(
            '[Reality widget] No se pudo capturar el modelo 3D para generar la imagen:',
            error
          );

          snap.remove();

          buttonElement.disabled = false;
          buttonElement.innerHTML =
            originalLabel;

          var recBanner =
            overlay.querySelector('#recBanner');

          recBanner.textContent =
            'No se pudo preparar la foto del mueble. Probá de nuevo en un momento.';

          recBanner.classList.add('show');
        }

        function cleanupAndCapture() {
          if (settled) {
            return;
          }

          settled = true;

          snap
            .toBlob({
              mimeType: 'image/png',
              idealAspect: true
            })
            .then(function (blob) {
              var reader = new FileReader();

              reader.onload = function (
                readerEvent
              ) {
                snap.remove();

                var productBase64 =
                  readerEvent.target.result.split(
                    ','
                  )[1];

                callGenerateApi(
                  overlay,
                  product,
                  productBase64,
                  buttonElement,
                  originalLabel
                );
              };

              reader.onerror = failCapture;
              reader.readAsDataURL(blob);
            })
            .catch(failCapture);
        }

        snap.addEventListener(
          'error',
          failCapture
        );

        snap.addEventListener(
          'load',
          function () {
            setTimeout(
              cleanupAndCapture,
              600
            );
          }
        );

        setTimeout(
          cleanupAndCapture,
          5000
        );
      })
      .catch(function () {
        buttonElement.disabled = false;
        buttonElement.innerHTML =
          originalLabel;
      });
  }

  function callGenerateApi(
    overlay,
    product,
    productBase64,
    buttonElement,
    originalLabel
  ) {
    buttonElement.textContent =
      'Generando imagen…';

    var noteField =
      overlay.querySelector('#userNote');

    var userNote = noteField
      ? noteField.value.trim()
      : '';

    fetch(
      SITE_DOMAIN + '/api/generate-image',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          roomImageBase64:
            overlay._uploadedPhoto.base64,

          roomImageMediaType:
            overlay._uploadedPhoto.mediaType,

          productImageBase64:
            productBase64,

          productImageMediaType:
            'image/png',

          productName:
            product.name,

          alto:
            product.alto,

          ancho:
            product.ancho,

          fondo:
            product.fondo,

          userNote:
            userNote
        })
      }
    )
      .then(function (response) {
        return response.json();
      })
      .then(function (data) {
        buttonElement.disabled = false;
        buttonElement.innerHTML =
          originalLabel;

        var resultOverlay =
          overlay._resultOverlay;

        var loading =
          resultOverlay.querySelector(
            '#resultLoading'
          );

        var image =
          resultOverlay.querySelector(
            '#resultImage'
          );

        if (
          data.error ||
          !data.imageBase64
        ) {
          loading
            .querySelector('span')
            .textContent =
            'No se pudo generar la imagen ahora. Probá de nuevo en un rato.';

          image.style.display = 'none';
          loading.style.display = 'flex';
        } else {
          image.src =
            'data:image/png;base64,' +
            data.imageBase64;

          image.style.display = 'block';
          loading.style.display = 'none';
        }

        resultOverlay.classList.add('open');
      })
      .catch(function () {
        buttonElement.disabled = false;
        buttonElement.innerHTML =
          originalLabel;

        var resultOverlay =
          overlay._resultOverlay;

        resultOverlay
          .querySelector(
            '#resultLoading span'
          )
          .textContent =
          'No se pudo generar la imagen ahora. Probá de nuevo en un rato.';

        resultOverlay
          .querySelector('#resultImage')
          .style.display = 'none';

        resultOverlay
          .querySelector('#resultLoading')
          .style.display = 'flex';

        resultOverlay.classList.add('open');
      });
  }

  function openCatalog(overlay) {
    overlay.classList.add('open');

    if (overlay._loaded) {
      return;
    }

    overlay._loaded = true;

    var list =
      overlay.querySelector('#catList');

    fetchCatalog(overlay._storeId)
      .then(function (products) {
        overlay._products = products;

        if (!products.length) {
          list.innerHTML =
            '<div class="empty">Todavía no hay productos publicados.</div>';

          return;
        }

        renderCatalogList(
          list,
          products,
          overlay,
          []
        );
      })
      .catch(function () {
        list.innerHTML =
          '<div class="empty">No se pudo cargar el catálogo.</div>';
      });
  }

  // -----------------------------------------------------------

  function showMissingStoreError(container) {
    container.innerHTML =
      '<div style="font-family:sans-serif;font-size:12px;color:#8C3B2E;">' +
      'Reality: falta el atributo data-store en el código de instalación.' +
      '</div>';

    console.error(
      '[Reality widget] Falta data-store — sin esto, el widget no puede saber de qué mueblería traer los productos.'
    );
  }

  function init() {
    var manual = document.querySelector(
      '[data-ebano-product]'
    );

    var auto = document.querySelector(
      '[data-ebano-auto]'
    );

    var container = manual || auto;

    if (!container) {
      return;
    }

    var storeId =
      container.getAttribute('data-store');

    if (!storeId) {
      showMissingStoreError(container);

      return;
    }

    if (manual) {
      var idOrSlug =
        manual.getAttribute(
          'data-ebano-product'
        );

      fetchProductById(
        idOrSlug,
        storeId
      )
        .catch(function () {
          return fetchProductBySlug(
            idOrSlug,
            storeId
          );
        })
        .then(function (product) {
          buildFAB(
            product,
            storeId
          );
        })
        .catch(function () {
          buildFAB(
            null,
            storeId
          );
        });

      return;
    }

    if (auto) {
      var slug = slugFromUrl();

      if (!slug) {
        buildFAB(
          null,
          storeId
        );

        return;
      }

      fetchProductBySlug(
        slug,
        storeId
      )
        .then(function (product) {
          buildFAB(
            product,
            storeId
          );
        })
        .catch(function () {
          buildFAB(
            null,
            storeId
          );
        });
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener(
      'DOMContentLoaded',
      init
    );
  } else {
    init();
  }
})();
