
import { createClient } from '@supabase/supabase-js';

// SUBSTITUA PELAS SUAS CHAVES DO PASSO 4
const supabaseUrl = 'SUA_URL_AQUI';
const supabaseAnonKey = 'SUA_ANON_KEY_AQUI';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
