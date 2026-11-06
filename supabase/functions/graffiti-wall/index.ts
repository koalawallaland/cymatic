import { createHandler } from './handler.mjs';

const key = (legacy, modern) => Deno.env.get(legacy) || JSON.parse(Deno.env.get(modern) || '{}').default;
Deno.serve(createHandler({
  url: Deno.env.get('SUPABASE_URL'),
  serviceKey: key('SUPABASE_SERVICE_ROLE_KEY', 'SUPABASE_SECRET_KEYS'),
  anonKey: key('SUPABASE_ANON_KEY', 'SUPABASE_PUBLISHABLE_KEYS'),
  origins: ['https://koalawallaland.github.io'],
}));
