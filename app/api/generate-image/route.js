// app/api/generate-image/route.js
//
// Recibe:
// {
//   roomImageBase64, roomImageMediaType,
//   productImageBase64, productImageMediaType,
//   productName, alto, ancho, fondo
// }
//
// Devuelve:
// { imageBase64 }   (PNG generado, en base64, listo para mostrar)
//
// Necesita la misma variable de entorno que /api/recommend:
// OPENAI_API_KEY  (Vercel → Settings → Environment Variables)

import { checkRateLimit, getClientIp } from '../../../lib/rateLimit';

export async function POST(req) {
  try {
    const ip = getClientIp(req);
    const { blocked } = await checkRateLimit('generate-image:' + ip, 5, 10);
    if (blocked) {
      return cors(
        json({ error: 'Demasiadas generaciones seguidas. Probá de nuevo en unos minutos.' }, 429)
      );
    }

    const {
      roomImageBase64,
      roomImageMediaType,
      productImageBase64,
      productImageMediaType,
      productName,
      alto,
      ancho,
      fondo,
      mountType, // 'floor' (default) | 'wall'
      userNote,
    } = await req.json();

    if (!roomImageBase64 || !productImageBase64) {
      return cors(json({ error: 'Faltan la foto del ambiente o la del producto' }, 400));
    }

    const roomBlob = base64ToBlob(roomImageBase64, roomImageMediaType || 'image/jpeg');
    const productBlob = base64ToBlob(productImageBase64, productImageMediaType || 'image/png');

    const groundingInstruction =
      mountType === 'wall'
        ? `Este mueble va montado en la pared, no apoyado en el piso — colocalo a una altura realista sobre la pared, firmemente sujeto, no flotando en el aire sin ningún punto de anclaje visible.`
        : `Este mueble se apoya en el piso — es fundamental que sus patas o su base estén en contacto real y firme con el suelo de la foto, sin espacio de aire debajo, con una sombra de contacto realista justo donde toca el piso. No lo dejes flotando ni desalineado con el plano del suelo.`;

    const prompt =
      `Esta es una foto real de un ambiente (imagen 1) y una foto de referencia de un mueble ` +
      `llamado "${productName}" (imagen 2), que mide ${alto}x${ancho}x${fondo} cm (alto x ancho x fondo). ` +
      `Insertá ese mueble en el ambiente de la imagen 1, de forma fotorrealista, respetando la perspectiva ` +
      `y la iluminación real de la foto, y a una escala que sea coherente con sus medidas reales en relación ` +
      `al resto del ambiente. ${groundingInstruction} ` +
      (userNote && userNote.trim()
        ? `El cliente aclaró esto sobre cómo lo quiere: "${userNote.trim()}". Tenelo en cuenta para la ubicación, orientación o estilo del resultado, sin contradecir las instrucciones anteriores. `
        : '') +
      `Si hay un mueble parecido ocupando ese lugar, reemplazalo de forma natural. ` +
      `No cambies el resto del ambiente.`;

    const formData = new FormData();
    formData.append('model', 'gpt-image-1');
    formData.append('prompt', prompt);
    formData.append('size', '1024x1024');
    formData.append('image[]', roomBlob, 'room.jpg');
    formData.append('image[]', productBlob, 'product.png');

    const openaiRes = await fetch('https://api.openai.com/v1/images/edits', {
      method: 'POST',
      headers: {
        Authorization: 'Bearer ' + process.env.OPENAI_API_KEY,
      },
      body: formData,
    });

    if (!openaiRes.ok) {
      const errText = await openaiRes.text();
      return cors(json({ error: 'Error generando la imagen: ' + errText }, 500));
    }

    const data = await openaiRes.json();
    const imageBase64 = data?.data?.[0]?.b64_json;

    if (!imageBase64) {
      return cors(json({ error: 'La IA no devolvió una imagen' }, 500));
    }

    return cors(json({ imageBase64 }, 200));
  } catch (err) {
    return cors(json({ error: err.message }, 500));
  }
}

export async function OPTIONS() {
  return cors(new Response(null, { status: 204 }));
}

function base64ToBlob(base64, mediaType) {
  const bytes = Buffer.from(base64, 'base64');
  return new Blob([bytes], { type: mediaType });
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
