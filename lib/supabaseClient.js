import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  // Esto te avisa temprano si te olvidaste de completar .env.local
  console.warn(
    'Faltan las variables NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY. ' +
    'Copiá .env.local.example a .env.local y completalas.'
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
