import { createClient } from '@supabase/supabase-js';

// User-provided Supabase credentials
const supabaseUrl = 'https://rjfsyuvbqtgoqbqdmnnq.supabase.co';

// IMPORTANT: Replace this placeholder with your actual Supabase public anonymous key.
// This key is safe to be exposed in a browser environment.
// You can find it in your Supabase project's API settings.
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJqZnN5dXZicXRnb3FicWRtbm5xIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjIxODgwNTYsImV4cCI6MjA3Nzc2NDA1Nn0.JLGBi-UBeT_OUA7SVWCNfV-q07KivuC7Yh8BX90Nqpo';

if (supabaseAnonKey === 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJqZnN5dXZicXRnb3FicWRtbm5xIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjIxODgwNTYsImV4cCI6MjA3Nzc2NDA1Nn0.JLGBi-UBeT_OUA7SVWCNfV-q07KivuC7Yh8BX90Nqpo') {
  console.warn('Supabase API key is a placeholder. Please replace it in lib/supabaseClient.ts');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);