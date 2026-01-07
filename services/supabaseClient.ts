
import { createClient } from '@supabase/supabase-js';

// Configuração do cliente Supabase com as credenciais fornecidas.
const supabaseUrl = 'https://rvcvfwmpeesxmwagedbn.supabase.co'; 
const supabaseAnonKey = 'sb_publishable_zA2C0S8S4A4BKfbkjLAMrA_IG3a908J';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
