// app/api/pilot-lead/route.js
//
// Recibe: { businessName, contactEmail, website }
// Guarda el lead en la tabla pilot_leads (solo el servidor puede escribir ahí).
//
// Usa las mismas variables de entorno que ya tenés cargadas:
// NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY

import { checkRateLimit, getClientIp } from '../../../lib/rateLimit';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

export async function POST(req) {
  try {
    const ip = getClientIp(req);
    const { blocked } = await checkRateLimit('pilot-lead:' + ip, 5, 60);
    if (blocked) {
      return cors(json({ error: 'Demasiados envíos seguidos. Probá más tarde.' }, 429));
    }

    const { businessName, contactEmail, website } = await req.json();

    if (!businessName || !businessName.trim()) {
      return cors(json({ error: 'Falta el nombre de la mueblería' }, 400));
    }

    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!contactEmail || !emailPattern.test(contactEmail)) {
      return cors(json({ error: 'El email no es válido' }, 400));
    }

    const insertRes = await fetch(`${SUPABASE_URL}/rest/v1/pilot_leads`, {
      method: 'POST',
      headers: {
        apikey: SERVICE_KEY,
        Authorization: `Bearer ${SERVICE_KEY}`,
        'Content-Type': 'application/json',
        Prefer: 'return=minimal',
      },
      body: JSON.stringify({
        business_name: businessName.trim(),
        contact_email: contactEmail.trim(),
        website: website ? website.trim() : null,
      }),
    });

    if (!insertRes.ok) {
      const errText = await insertRes.text();
      return cors(json({ error: 'Error guardando el lead: ' + errText }, 500));
    }

    return cors(json({ ok: true }, 200));
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
