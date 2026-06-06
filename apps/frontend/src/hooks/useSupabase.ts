import { createClient } from '@supabase/supabase-js'
import { useState } from 'react';

export function useSupabase() {
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

    const [supabase] = useState(() => {
        if (!supabaseUrl || !supabaseAnonKey) {
            console.warn('Missing Supabase environment variables. Please check your .env file.');
            console.warn('Required: VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY');
            return null;
        }
        return createClient(supabaseUrl, supabaseAnonKey);
    });

    return supabase;
}