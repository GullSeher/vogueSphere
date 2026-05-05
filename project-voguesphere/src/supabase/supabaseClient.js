// supabaseClient.js
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://apuzxvwyfdjzmzxveaib.supabase.co'; // Replace with your Supabase project URL
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFwdXp4dnd5ZmRqem16eHZlYWliIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDUxNDMwNzgsImV4cCI6MjA2MDcxOTA3OH0.eGJjsanuHEqaG4F3IhI8g2vSEwN-29aVGsRy5paxg7o'; // Replace with your anon public key

const supabase = createClient(supabaseUrl, supabaseAnonKey);

export default supabase;
