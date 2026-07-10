// app/api/recommend/route.js
//
// Recibe:
// { imageBase64, imageMediaType, products: [{id, name, price, alto, ancho, fondo}] }
//
// Devuelve:
// { recommendations: [{id, reason}] }
//
// Necesita la variable de entorno:
// OPENAI_API_KEY
//
// Vercel → Settings → Environment Variables
// Se consigue una key en platform.openai.com

export async function POST(req) {
  try {
    const { imageBase64, imageMediaType, products } = await req.json();

    if (!imageBase64 || !products || !products.length) {
      return cors(json({ error: 'Falta la imagen o el catálogo' }, 400));
    }

    const productList = products
      .map(
        (p) =>
          `- id: ${p.id} | nombre: ${p.name} | precio: ${p.price} | medidas: ${p.alto}x${p.ancho}x${p.fondo} cm`
      )
      .join('\n');

    const mediaType = imageMediaType || 'image/jpeg';

    const openaiRes = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'gpt-4.1-mini',
        input: [
          {
            role: 'user',
            content: [
              {
                type: 'input_text',
                text:
                  'Esta es una foto de un ambiente real de la casa de un cliente.\n\n' +
                  'Este es el catálogo disponible de una mueblería:\n\n' +
                  productList +
                  '\n\n' +
                  'Elegí hasta 3 productos del catálogo que mejor quedarían en ese ambiente. ' +
                  'Tené en cuenta estilo, color, proporciones y que el tamaño tenga sentido para el espacio visible. ' +
                  'La razón debe ser corta, clara y en español. ' +
                  'No inventes productos ni ids. Solo podés usar ids del catálogo.',
              },
              {
                type: 'input_image',
                image_url: `data:${mediaType};base64,${imageBase64}`,
              },
            ],
          },
        ],
        text: {
          format: {
            type: 'json_schema',
            name: 'furniture_recommendations',
            strict: true,
            schema: {
              type: 'object',
              additionalProperties: false,
              properties: {
                recommendations: {
                  type: 'array',
                  maxItems: 3,
                  items: {
                    type: 'object',
                    additionalProperties: false,
                    properties: {
                      id: {
                        type: 'string',
                      },
                      reason: {
                        type: 'string',
                      },
                    },
                    required: ['id', 'reason'],
                  },
                },
              },
              required: ['recommendations'],
            },
          },
        },
        max_output_tokens: 700,
      }),
    });

    if (!openaiRes.ok) {
      const errText = await openaiRes.text();
      return cors(json({ error: 'Error consultando OpenAI: ' + errText }, 500));
    }

    const data = await openaiRes.json();

    const outputText =
      data.output_text ||
      data.output
        ?.flatMap((item) => item.content || [])
        ?.find((content) => content.type === 'output_text')?.text ||
      '';

    let parsed;

    try {
      parsed = JSON.parse(outputText);
    } catch (e) {
      return cors(json({ error: 'OpenAI no devolvió un JSON válido' }, 500));
    }

    const validIds = new Set(products.map((p) => String(p.id)));

    const recommendations = (parsed.recommendations || [])
      .filter((rec) => rec && validIds.has(String(rec.id)))
      .slice(0, 3)
      .map((rec) => ({
        id: String(rec.id),
        reason: String(rec.reason || '').trim(),
      }));

    return cors(json({ recommendations }, 200));
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

// El widget se va a llamar desde el sitio de CUALQUIER mueblería,
// así que esta ruta necesita headers CORS abiertos.
function cors(res) {
  res.headers.set('Access-Control-Allow-Origin', '*');
  res.headers.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.headers.set('Access-Control-Allow-Headers', 'Content-Type');
  return res;
}
