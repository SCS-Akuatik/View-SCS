import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://ynixwjufhutrqocdlcww.supabase.co';
// Ingat: Nanti di versi production, Key ini sebaiknya dimasukkan ke file .env
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InluaXh3anVmaHV0cnFvY2RsY3d3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODMzMzkxMzQsImV4cCI6MjA5ODkxNTEzNH0.M3zOtZm0-O5IiYL5zpvDKBQwwa27dayEtqZ0Z6-mAMQ';

export const supabaseClient = createClient(supabaseUrl, supabaseKey);
