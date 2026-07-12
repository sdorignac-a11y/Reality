// app/api/cleanup-photos/route.js
//
// La dispara Vercel Cron una vez al día (ver vercel.json).
// Borra fotos temporales que quedaron pendientes de más de 48hs
// (por ejemplo, si alguien cerró la pestaña a mitad de una generación).
//
// Necesita dos variables de entorno nuevas:
// - SUPABASE_SERVICE_ROLE_KEY (Supabase → Settings → API → "service_role" secret key)
// - CRON_SECRET (la inventás vos, cualquier texto largo y difícil de adivinar)

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const BUCKET = 'models';
const MAX_AGE_HOURS = 48;
const BATCH_LIMIT = 200;

export async function GET(req) {
  var auth = req.headers.get('authorization');
  if (auth !== 'Bearer ' + process.env.CRON_SECRET) {
    return new Response('No autorizado', { status: 401 });
  }

  try {
    const cutoff = new Date(Date.now() - MAX_AGE_HOURS * 60 * 60 * 1000).toISOString();

    const listRes = await fetch(
      `${SUPABASE_URL}/rest/v1/pending_photo_cleanup?created_at=lt.${cutoff}&select=id,path&limit=${BATCH_LIMIT}`,
      {
        headers: {
          apikey: SERVICE_KEY,
          Authorization: `Bearer ${SERVICE_KEY}`,
        },
      }
    );

    const rows = await listRes.json();

    if (!rows.length) {
      return new Response(JSON.stringify({ cleaned: 0 }), { status: 200 });
    }

    const paths = rows.map((r) => r.path);

    await fetch(`${SUPABASE_URL}/storage/v1/object/${BUCKET}`, {
      method: 'DELETE',
      headers: {
        apikey: SERVICE_KEY,
        Authorization: `Bearer ${SERVICE_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ prefixes: paths }),
    });

    const ids = rows.map((r) => r.id).join(',');
    await fetch(`${SUPABASE_URL}/rest/v1/pending_photo_cleanup?id=in.(${ids})`, {
      method: 'DELETE',
      headers: {
        apikey: SERVICE_KEY,
        Authorization: `Bearer ${SERVICE_KEY}`,
      },
    });

    return new Response(JSON.stringify({ cleaned: rows.length }), { status: 200 });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
}
