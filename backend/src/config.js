import 'dotenv/config';

if (process.env.NODE_ENV !== 'test') {
  for (const k of ['DATABASE_URL', 'DIRECT_URL', 'SUPABASE_URL']) {
    if (!process.env[k]) {
      console.error(`Missing required environment variable: ${k}`); // name only, never the value
      process.exit(1);
    }
  }
}

export const config = {
  port: Number(process.env.PORT || 4000),
  isProd: process.env.NODE_ENV === 'production',
  supabaseUrl: (process.env.SUPABASE_URL || 'https://placeholder.supabase.co').replace(/\/$/, ''),
  jwtSecret: process.env.SUPABASE_JWT_SECRET || null,
  corsOrigins: (process.env.CORS_ORIGINS || 'http://localhost:5173').split(',').map((s) => s.trim()),
  allowSimulatedFailure: process.env.ALLOW_SIMULATED_FAILURE === 'true',
};
