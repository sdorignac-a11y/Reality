// app/api/photo-to-3d/status/route.js
//
// Recibe (query param): ?request_id=...
// Devuelve: { status: "IN_QUEUE" | "IN_PROGRESS" | "COMPLETED", modelUrl? }
//
// El panel llama a esta ruta cada pocos segundos hasta que status sea "COMPLETED".

const MODEL_ID = 'tripo3d/h3.1/multiview-to-3d';

import { verifySupabaseUser } from '../../../../lib/rateLimit';

export async function GET(req) {
  try {
    const user = await verifySupabaseUser(req.headers.get('authorization'));
    if (!user) {
      return cors(json({ error: 'Necesitás estar logueado.' }, 401));
    }

    const { searchParams } = new URL(req.url);
    const requestId = searchParams.get('request_id');

    if (!requestId) {
      return cors(json({ error: 'Falta request_id' }, 400));
    }

    const statusRes = await fetch(
      `https://queue.fal.run/${MODEL_ID}/requests/${requestId}/status`,
      { headers: { Authorization: 'Key ' + process.env.FAL_KEY } }
    );

    if (!statusRes.ok) {
      const errText = await statusRes.text();
      return cors(json({ error: 'Error consultando el estado: ' + errText }, 500));
    }

    const statusData = await statusRes.json();

    if (statusData.status !== 'COMPLETED') {
      return cors(json({ status: statusData.status }, 200));
    }

    const resultRes = await fetch(
      `https://queue.fal.run/${MODEL_ID}/requests/${requestId}`,
      { headers: { Authorization: 'Key ' + process.env.FAL_KEY } }
    );

    if (!resultRes.ok) {
      const errText = await resultRes.text();
      return cors(json({ error: 'Error obteniendo el resultado: ' + errText }, 500));
    }

    const resultData = await resultRes.json();
    const modelUrl = resultData?.model_mesh?.url;

    if (!modelUrl) {
      return cors(json({ status: 'COMPLETED', error: 'No se encontró el archivo del modelo generado' }, 200));
    }

    return cors(json({ status: 'COMPLETED', modelUrl }, 200));
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
  res.headers.set('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.headers.set('Access-Control-Allow-Headers', 'Content-Type');
  return res;
}
