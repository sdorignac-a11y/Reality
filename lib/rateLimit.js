// lib/rateLimit.js
//
// Funciones compartidas de seguridad para las rutas de IA:
// - checkRateLimit: limita cuántos pedidos puede hacer una misma IP
//   (o un mismo usuario) en una ventana de tiempo.
// - verifySupabaseUser: confirma que un pedido viene de verdad de una
//   mueblería logueada, no de cualquiera que le pegue a la URL.

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export async function checkRateLimit(key, maxRequests, windowMinutes) {
  const since = new Date(Date.now() - windowMinutes * 60 * 1000).toISOString();

  const countRes = await fetch(
    `${SUPABASE_URL}/rest/v1/api_rate_limits?key=eq.${encodeURIComponent(key)}&created_at=gte.${since}&select=id`,
    {
      headers: {
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        Prefer: 'count=exact',
      },
    }
  );

  const countHeader = countRes.headers.get('content-range'); // ej: "0-9/23"
  const total = countHeader ? Number(countHeader.split('/')[1]) : 0;

  if (total >= maxRequests) {
    return { blocked: true };
  }

  // Registramos este pedido para que cuente en la próxima consulta
  fetch(`${SUPABASE_URL}/rest/v1/api_rate_limits`, {
    method: 'POST',
    headers: {
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ key }),
  }).catch(() => {}); // si falla el registro, no bloqueamos el pedido por eso

  return { blocked: false };
}

export function getClientIp(req) {
  const forwarded = req.headers.get('x-forwarded-for');
  return forwarded ? forwarded.split(',')[0].trim() : 'unknown';
}

export async function verifySupabaseUser(authHeader) {
  if (!authHeader) return null;
  const token = authHeader.replace('Bearer ', '').trim();
  if (!token) return null;

  const res = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
    headers: {
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${token}`,
    },
  });

  if (!res.ok) return null;
  return res.json(); // { id, email, ... }
}
