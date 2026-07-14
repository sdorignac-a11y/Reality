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
  // reales cargadas en el producto (alto/ancho/fondo en cm) — sin esto,
  // el tamaño en AR depende únicamente de cómo haya salido escalado el
  // archivo .glb, que puede no tener nada que ver con las medidas reales.
  function applyRealScale(modelViewer, alto, ancho, fondo) {
    // Si este visor ya tenía un escuchador de una vez anterior, lo sacamos
    // primero — si no, se van acumulando uno por cada producto que se vio,
    // y todos terminan disparando juntos y pisándose entre sí.
    if (modelViewer.__realityDoScale) {
      modelViewer.removeEventListener('load', modelViewer.__realityDoScale);
      modelViewer.__realityDoScale = null;
    }

    function doScale() {
      try {
        var dims = modelViewer.getDimensions();
        var current = modelViewer.scale || { x: 1, y: 1, z: 1 };

        var baseX = dims.x / (current.x || 1);
        var baseY = dims.y / (current.y || 1);
        var baseZ = dims.z / (current.z || 1);

        var targetX = (Number(ancho) || 0) / 100;
        var targetY = (Number(alto) || 0) / 100;
        var targetZ = (Number(fondo) || 0) / 100;

        // Un factor por eje (no un promedio) — así las tres medidas
        // quedan exactas, aunque eso implique estirar un poco la forma
        // si el modelo 3D no tenía las mismas proporciones reales.
        var scaleX = baseX > 0 && targetX > 0 ? targetX / baseX : 1;
        var scaleY = baseY > 0 && targetY > 0 ? targetY / baseY : 1;
        var scaleZ = baseZ > 0 && targetZ > 0 ? targetZ / baseZ : 1;

        if (![scaleX, scaleY, scaleZ].every(function (n) { return isFinite(n) && n > 0; })) {
          return;
        }

        modelViewer.setAttribute('scale', scaleX + ' ' + scaleY + ' ' + scaleZ);
      } catch (e) {
        // si algo falla, dejamos el modelo con su escala original
      }
    }

    modelViewer.__realityDoScale = doScale;

    modelViewer.addEventListener('load', doScale);
    if (modelViewer.loaded) doScale();
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
      '&select=id,name,price,alto,ancho,fondo,model_url,slug,extra_measurements';

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
      '&select=id,name,price,alto,ancho,fondo,model_url,slug,extra_measurements';

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
      '&select=id,name,price,alto,ancho,fondo,model_url,slug,extra_measurements' +
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

  // -----------------------------------------------------------
  // UI flotante con Shadow DOM
  // -----------------------------------------------------------

  function buildFAB(currentProduct, storeId) {
    var host = document.createElement('div');

    host.style.all = 'initial';

    document.body.appendChild(host);

    var root = host.attachShadow
      ? host.attachShadow({ mode: 'open' })
      : host;

    var style = document.createElement('style');

    style.textContent = [
      '@import url("https://fonts.googleapis.com/css2?family=Baloo+2:wght@600;700;800&family=Nunito:wght@400;600;700;800;900&display=swap");',

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

      '.ar-dims{',
      '  font-size:11px;',
      '  font-weight:700;',
      '  color:#8A7B68;',
      '  margin-top:2px;',
      '}',

      '.ar-extra-dims{',
      '  display:flex;',
      '  flex-wrap:wrap;',
      '  gap:6px;',
      '  margin-top:6px;',
      '}',

      '.ar-extra-dim-item{',
      '  padding:3px 8px;',
      '  border-radius:999px;',
      '  background:#F3E8D7;',
      '  color:#6E4127;',
      '  font-size:10px;',
      '  font-weight:800;',
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

      '.frame{',
      '  position:relative;',
      '  width:100%;',
      '  height:280px;',
      '  background:#FFFFFF;',
      '  border:1px solid rgba(218,196,165,.75);',
      '  border-radius:14px;',
      '  overflow:hidden;',
      '  margin-bottom:8px;',
      '}',

      'model-viewer{',
      '  width:100%;',
      '  height:100%;',
      '}',

      '.ar-btn{',
      '  background:#6B4A32;',
      '  color:#FFFFFF;',
      '  border:none;',
      '  padding:8px 13px;',
      '  border-radius:999px;',
      '  font-size:11.5px;',
      '  font-weight:800;',
      '  cursor:pointer;',
      '  margin:10px;',
      '}',

      '.dim-anchor{',
      '  display:none;',
      '}',

      '.dim-svg{',
      '  position:absolute;',
      '  inset:0;',
      '  width:100%;',
      '  height:100%;',
      '  pointer-events:none;',
      '  display:none;',
      '}',

      '.overlay.showing-dims .dim-svg{',
      '  display:block;',
      '}',

      '.dim-svg line{',
      '  stroke:#6B4A32;',
      '  stroke-width:1.5;',
      '}',

      '.dim-svg .dim-tick{',
      '  stroke:#6B4A32;',
      '  stroke-width:1.5;',
      '}',

      '.dim-svg text{',
      '  font-family:"Nunito",-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;',
      '  font-size:11px;',
      '  font-weight:800;',
      '  fill:#3D2A1B;',
      '}',

      '.dim-svg .dim-label-bg{',
      '  fill:#FFF7ED;',
      '  stroke:#DCC8A9;',
      '  stroke-width:1;',
      '}',

      '.dims-toggle{',
      '  width:100%;',
      '  background:#FFFFFF;',
      '  color:#6B4A32;',
      '  border:1.5px solid #DCC8A9;',
      '  padding:8px;',
      '  border-radius:999px;',
      '  font-size:11px;',
      '  font-weight:800;',
      '  cursor:pointer;',
      '  margin-bottom:8px;',
      '}',

      '.dims-toggle:hover{',
      '  background:#FBF0E1;',
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

    overlay.className = 'overlay';

    overlay.innerHTML =
      '<div class="modal">' +
      '  <div class="modal-top">' +
      '    <div>' +
      '      <strong id="arTitle"></strong>' +
      '      <div class="ar-dims" id="arDims"></div>' +
      '      <div class="ar-extra-dims" id="arExtraDims"></div>' +
      '    </div>' +
      '    <button class="close" aria-label="Cerrar">×</button>' +
      '  </div>' +
      '  <div class="frame">' +
      '    <model-viewer ' +
      '      id="arViewer" ' +
      '      camera-controls ' +
      '      auto-rotate ' +
      '      shadow-intensity="1" ' +
      '      exposure="0.95" ' +
      '      environment-image="neutral" ' +
      '      camera-orbit="35deg 78deg 2.6m" ' +
      '      ar ' +
      '      ar-modes="webxr scene-viewer quick-look" ' +
      '      ar-scale="fixed" ' +
      '      ar-placement="floor">' +
      '      <button slot="ar-button" class="ar-btn">' +
      '        Ver en tu espacio' +
      '      </button>' +
      '      <span slot="hotspot-alto-top" class="dim-anchor" data-position="0 0 0"></span>' +
      '      <span slot="hotspot-alto-bottom" class="dim-anchor" data-position="0 0 0"></span>' +
      '      <span slot="hotspot-ancho-left" class="dim-anchor" data-position="0 0 0"></span>' +
      '      <span slot="hotspot-ancho-right" class="dim-anchor" data-position="0 0 0"></span>' +
      '      <span slot="hotspot-fondo-near" class="dim-anchor" data-position="0 0 0"></span>' +
      '      <span slot="hotspot-fondo-far" class="dim-anchor" data-position="0 0 0"></span>' +
      '    </model-viewer>' +
      '    <svg class="dim-svg" id="dimSvg"></svg>' +
      '  </div>' +
      '  <button class="dims-toggle" id="dimsToggle">Ver medidas sobre el mueble</button>' +
      '  <p class="hint">' +
      '    Desde el celular esto abre la cámara real, a escala bloqueada.' +
      '  </p>' +
      '  <div class="poweredby">powered by reality</div>' +
      '</div>';

    root.appendChild(overlay);

    overlay
      .querySelector('.close')
      .addEventListener('click', function () {
        overlay.classList.remove('open');
        stopDimensionTracking(overlay, overlay.querySelector('#arViewer'));
      });

    overlay.addEventListener('click', function (event) {
      if (event.target === overlay) {
        overlay.classList.remove('open');
        stopDimensionTracking(overlay, overlay.querySelector('#arViewer'));
      }
    });

    overlay
      .querySelector('#dimsToggle')
      .addEventListener('click', function (event) {
        var viewer = overlay.querySelector('#arViewer');
        var showing = overlay.classList.toggle('showing-dims');

        event.currentTarget.textContent = showing
          ? 'Ocultar medidas'
          : 'Ver medidas sobre el mueble';

        if (showing) {
          placeMeasurementAnchors(viewer, overlay._currentProduct);
          startDimensionTracking(overlay, viewer);
        } else {
          stopDimensionTracking(overlay, viewer);
        }
      });

    return overlay;
  }

  // Ubica las 6 anclas invisibles (dos puntas por cada medida: alto,
  // ancho y fondo) sobre las esquinas reales del mueble, usando el
  // tamaño ya corregido por applyRealScale.
  function placeMeasurementAnchors(viewer, product) {
    if (!viewer || !product) return;

    try {
      var dims = viewer.getDimensions();
      var center = viewer.getBoundingBoxCenter();

      var hx = dims.x / 2;
      var hy = dims.y / 2;
      var hz = dims.z / 2;

      var points = {
        'hotspot-alto-top': (center.x - hx) + ' ' + (center.y + hy) + ' ' + (center.z + hz),
        'hotspot-alto-bottom': (center.x - hx) + ' ' + (center.y - hy) + ' ' + (center.z + hz),
        'hotspot-ancho-left': (center.x - hx) + ' ' + (center.y + hy) + ' ' + (center.z + hz),
        'hotspot-ancho-right': (center.x + hx) + ' ' + (center.y + hy) + ' ' + (center.z + hz),
        'hotspot-fondo-near': (center.x + hx) + ' ' + (center.y + hy) + ' ' + (center.z + hz),
        'hotspot-fondo-far': (center.x + hx) + ' ' + (center.y + hy) + ' ' + (center.z - hz)
      };

      Object.keys(points).forEach(function (name) {
        var el = viewer.querySelector('[slot="' + name + '"]');
        if (el) el.setAttribute('data-position', points[name]);
        if (viewer.updateHotspot) {
          viewer.updateHotspot({ name: name, position: points[name] });
        }
      });

      viewer._dimValues = {
        alto: product.alto + ' cm',
        ancho: product.ancho + ' cm',
        fondo: product.fondo + ' cm'
      };
    } catch (e) {
      // si algo falla, simplemente no se muestran las medidas sobre el modelo
    }
  }

  // Dibuja las líneas de medida en el SVG, consultando la posición en
  // pantalla real de cada ancla (así siguen al mueble cuando lo rotás).
  function drawDimensionLines(overlay, viewer) {
    var svg = overlay.querySelector('#dimSvg');
    if (!svg || !viewer.queryHotspot || !viewer._dimValues) return;

    var rect = viewer.getBoundingClientRect();
    svg.setAttribute('viewBox', '0 0 ' + rect.width + ' ' + rect.height);

    function point(name) {
      var hs = viewer.queryHotspot(name);
      if (!hs || !hs.canvasPosition) return null;
      return hs.canvasPosition;
    }

    function dimensionLine(fromName, toName, label, offset) {
      var a = point(fromName);
      var b = point(toName);
      if (!a || !b) return '';

      // vector perpendicular a la línea, para las patitas de los extremos
      var dx = b.x - a.x;
      var dy = b.y - a.y;
      var len = Math.sqrt(dx * dx + dy * dy) || 1;
      var px = (-dy / len) * 6;
      var py = (dx / len) * 6;

      var midX = (a.x + b.x) / 2;
      var midY = (a.y + b.y) / 2;
      var labelWidth = label.length * 6.2 + 14;

      return (
        '<line x1="' + a.x + '" y1="' + a.y + '" x2="' + b.x + '" y2="' + b.y + '"></line>' +
        '<line class="dim-tick" x1="' + (a.x - px) + '" y1="' + (a.y - py) + '" x2="' + (a.x + px) + '" y2="' + (a.y + py) + '"></line>' +
        '<line class="dim-tick" x1="' + (b.x - px) + '" y1="' + (b.y - py) + '" x2="' + (b.x + px) + '" y2="' + (b.y + py) + '"></line>' +
        '<rect class="dim-label-bg" x="' + (midX - labelWidth / 2) + '" y="' + (midY - 10) + '" width="' + labelWidth + '" height="20" rx="10"></rect>' +
        '<text x="' + midX + '" y="' + (midY + 4) + '" text-anchor="middle">' + escapeHtml(label) + '</text>'
      );
    }

    svg.innerHTML =
      dimensionLine('hotspot-alto-top', 'hotspot-alto-bottom', viewer._dimValues.alto) +
      dimensionLine('hotspot-ancho-left', 'hotspot-ancho-right', viewer._dimValues.ancho) +
      dimensionLine('hotspot-fondo-near', 'hotspot-fondo-far', viewer._dimValues.fondo);
  }

  function startDimensionTracking(overlay, viewer) {
    stopDimensionTracking(overlay, viewer);

    function redraw() { drawDimensionLines(overlay, viewer); }

    viewer.__dimRedraw = redraw;
    viewer.addEventListener('camera-change', redraw);
    redraw();
  }

  function stopDimensionTracking(overlay, viewer) {
    if (viewer && viewer.__dimRedraw) {
      viewer.removeEventListener('camera-change', viewer.__dimRedraw);
      viewer.__dimRedraw = null;
    }
    var svg = overlay.querySelector('#dimSvg');
    if (svg) svg.innerHTML = '';
  }

  function openAR(overlay, product) {
    ensureModelViewer().then(function () {
      overlay.querySelector('#arTitle').textContent =
        product.name + ' — ' + product.price;

      overlay.querySelector('#arDims').textContent =
        product.alto + ' × ' + product.ancho + ' × ' + product.fondo + ' cm';

      var extraDims = Array.isArray(product.extra_measurements)
        ? product.extra_measurements
        : [];

      overlay.querySelector('#arExtraDims').innerHTML = extraDims
        .filter(function (m) { return m && m.label && m.value; })
        .map(function (m) {
          return (
            '<span class="ar-extra-dim-item">' +
            escapeHtml(m.label) + ': ' + escapeHtml(m.value) +
            '</span>'
          );
        })
        .join('');

      var viewer = overlay.querySelector('#arViewer');

      viewer.setAttribute('src', product.model_url);
      applyRealScale(viewer, product.alto, product.ancho, product.fondo);

      stopDimensionTracking(overlay, viewer);
      overlay._currentProduct = product;
      overlay.classList.remove('showing-dims');
      overlay.querySelector('#dimsToggle').textContent = 'Ver medidas sobre el mueble';

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

    var zone = overlay.querySelector('#uploadZone');
    var input = overlay.querySelector('#uploadInput');
    var preview = overlay.querySelector('#uploadPreview');
    var placeholder = overlay.querySelector(
      '#uploadPlaceholder'
    );

    var analyzeBtn = overlay.querySelector('#analyzeBtn');
    var recBanner = overlay.querySelector('#recBanner');
    var userNoteField = overlay.querySelector('#userNote');

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
        preview.src = readerEvent.target.result;
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

      var originalLabel = analyzeBtn.innerHTML;

      analyzeBtn.textContent =
        'Analizando tu ambiente…';

      var list = overlay.querySelector('#catList');
      var products = overlay._products || [];

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
      var recommendationA = recMap[productA.id]
        ? 1
        : 0;

      var recommendationB = recMap[productB.id]
        ? 1
        : 0;

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
            openAR(arOverlay, sorted[index]);
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

    var originalLabel = buttonElement.innerHTML;

    buttonElement.disabled = true;
    buttonElement.textContent = 'Preparando…';

    ensureModelViewer()
      .then(function () {
        var snap =
          document.createElement('model-viewer');

        snap.setAttribute('src', product.model_url);
        snap.setAttribute(
          'crossorigin',
          'anonymous'
        );

        snap.setAttribute('exposure', '1');

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
          buttonElement.innerHTML = originalLabel;

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
        buttonElement.innerHTML = originalLabel;
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

    fetch(SITE_DOMAIN + '/api/generate-image', {
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
    })
      .then(function (response) {
        return response.json();
      })
      .then(function (data) {
        buttonElement.disabled = false;
        buttonElement.innerHTML = originalLabel;

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
        buttonElement.innerHTML = originalLabel;

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
          buildFAB(product, storeId);
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

      fetchProductBySlug(
        slug,
        storeId
      )
        .then(function (product) {
          buildFAB(product, storeId);
        })
        .catch(function () {
          buildFAB(null, storeId);
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
