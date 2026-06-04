// supabaseClient.js
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = ''; // Replace with your Supabase project URL
const supabaseAnonKey = ''; // Replace with your anon public key

const supabase = createClient(supabaseUrl, supabaseAnonKey);

export default supabase;
