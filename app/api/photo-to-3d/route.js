// app/api/photo-to-3d/route.js
//
// Recibe:  { imageUrls: [url1, url2, ...] }  (mínimo 2 fotos, URLs públicas)
// Devuelve: { requestId }
//
// Necesita la variable de entorno FAL_KEY (Vercel → Settings → Environment Variables)
// Se consigue en fal.ai → Dashboard → Settings → API Keys
//
// Usa Meshy 6 (a través de fal.ai) — antes usábamos Tripo3D, lo cambiamos
// porque Meshy dio resultados mejores y más rápidos, sobre todo con
// muebles de forma irregular (sillones esquineros, en L, etc.)

const MODEL_ID = 'fal-ai/meshy/v6/multi-image-to-3d';

import { checkRateLimit, verifySupabaseUser } from '../../../lib/rateLimit';

export async function POST(req) {
  try {
    const user = await verifySupabaseUser(req.headers.get('authorization'));
    if (!user) {
      return cors(json({ error: 'Necesitás estar logueado para generar modelos 3D.' }, 401));
    }

    // Antes 10/hora — lo subimos a 40 para poder cargar catálogos grandes
    // de clientes nuevos en una sola sentada (sigue habiendo un techo,
    // para frenar un abuso real, pero ya no es el cuello de botella).
    const { blocked } = await checkRateLimit('photo3d:' + user.id, 40, 60);
    if (blocked) {
      return cors(
        json({ error: 'Alcanzaste el límite de generaciones por hora. Probá más tarde.' }, 429)
      );
    }

    const { imageUrls } = await req.json();

    if (!imageUrls || imageUrls.length < 2) {
      return cors(json({ error: 'Subí al menos 2 fotos del mueble, desde ángulos distintos' }, 400));
    }

    const falRes = await fetch(`https://queue.fal.run/${MODEL_ID}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Key ' + process.env.FAL_KEY,
      },
      body: JSON.stringify({
        image_urls: imageUrls,
        should_texture: true,
        should_remesh: true,
        symmetry_mode: 'auto',
        topology: 'triangle',
        target_polycount: 30000,
      }),
    });

    if (!falRes.ok) {
      const errText = await falRes.text();
      return cors(json({ error: 'Error iniciando la generación: ' + errText }, 500));
    }

    const data = await falRes.json();
    return cors(
      json(
        {
          requestId: data.request_id,
          statusUrl: data.status_url,
          resultUrl: data.response_url,
        },
        200
      )
    );
  } catch (err) {
    return cors(json({ error: err.message }, 500));
  }
}

export async function OPTIONS() {
  return cors(new Response(null, { status: 204 }));
}

function json(obj, status) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function cors(res) {
  res.headers.set('Access-Control-Allow-Origin', '*');
  res.headers.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.headers.set('Access-Control-Allow-Headers', 'Content-Type');
  return res;
}
