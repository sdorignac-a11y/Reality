# Ébano — Panel + Sitio (app real)

Next.js + Supabase (base de datos, login, y almacenamiento de archivos .glb).

## 1. Crear el proyecto en Supabase

1. Andá a https://supabase.com → creá una cuenta gratis → "New project"
2. Elegí nombre y contraseña de base de datos (guardala, no la vas a necesitar de nuevo salvo emergencia)
3. Cuando el proyecto esté listo, andá a **SQL Editor → New query**
4. Copiá y pegá **todo** el contenido de `supabase/schema.sql` de esta carpeta, y ejecutalo (▶ Run)
5. Andá a **Storage → New bucket**
   - Nombre: `models`
   - Activá el toggle **Public bucket**
   - Creá el bucket
6. Andá a **Settings → API** y copiá:
   - `Project URL`
   - `anon public` key

## 2. Configurar el proyecto localmente

```bash
cp .env.local.example .env.local
```

Editá `.env.local` y pegá ahí la URL y la key que copiaste en el paso anterior.

```bash
npm install
npm run dev
```

Abrí http://localhost:3000 — deberías ver la landing con los dos links (Panel / Sitio).

Probalo local:
1. Entrá a "Panel" → te va a mandar a "Crear cuenta" → registrate con cualquier email/contraseña
   (si tu proyecto de Supabase pide confirmación por email, desactivala en
   Supabase → Authentication → Providers → Email → "Confirm email" OFF, para probar más rápido)
2. Cargá un producto con un archivo `.glb` real (bajate uno de
   https://github.com/KhronosGroup/glTF-Sample-Assets si no tenés)
3. Aprobalo desde la tabla
4. Andá a "Sitio" → debería aparecer publicado, con AR funcionando de verdad en tu celular

## 3. Desplegarlo online (Vercel)

1. Subí esta carpeta a un repositorio de GitHub
2. Andá a https://vercel.com → "Add New Project" → importá el repo
3. En "Environment Variables" agregá las mismas dos variables de `.env.local`
4. Deploy

Listo — vas a tener una URL pública real (tipo `https://ebano-tuusuario.vercel.app`)
que podés compartir de verdad, con datos que persisten y AR funcionando.

## Qué es real acá y qué falta

✅ Base de datos real (Postgres vía Supabase), con seguridad por fila:
   cada mueblería solo ve sus propios productos.
✅ Login real (Supabase Auth).
✅ Subida de archivos .glb real a un bucket de Storage.
✅ El sitio público lee productos publicados directo de la base — sin login.
✅ AR real en celular (model-viewer + WebXR/ARKit/ARCore).

⚠️ Todavía NO está:
   - La conversión automática de fotos → 3D (necesita conectar Meshy o Tripo3D,
     que quedó pendiente de otra conversación).
   - El widget embebible como script real hosteado (`v1.js`) — hoy el panel y
     el sitio viven en la misma app; el paso de "sacarlo" a un script insertable
     en sitios de terceros es el siguiente after esto.
   - Diseño responsive para mobile (funciona, pero no está pulido).
   - Multi-tenant real por "mueblería" (hoy es por usuario individual, no por cuenta
     de negocio con varios empleados).
