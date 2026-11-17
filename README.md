# Novo Tournament Beta

Sistema Ranked de pádel para Baaxal Bosques. React + Vite + TypeScript + TailwindCSS + Supabase.

## Puesta en marcha

1. En Supabase > SQL Editor ejecuta `supabase/migrations/0001_ranked.sql` (es idempotente).
2. Copia `.env.example` a `.env` y llena `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY`. Opcional: `VITE_PUBLIC_URL` (dominio que se codifica en los QR; por defecto el dominio actual).
3. `npm install && npm run dev`

## Primer administrador

Crea una cuenta desde "Jugador > Crea tu cuenta", luego entra por la pestaña "Administrador": si aún no existe ningún admin, esa cuenta lo reclama (`ranked_claim_admin`). Después solo se agregan desde SQL (`insert into ranked_admins`).

## Deploy en Vercel

Importa el repo; `vercel.json` ya define build, salida `dist` y el rewrite de SPA. Agrega las variables `VITE_*` en Vercel.

## Notas

- Niveles: Bronce 7ª, Plata 6ª, Oro 5ª, Platino 4ª, Diamante 3ª, Élite 2ª, Leyenda 1ª. Se puede entrar a retas del propio nivel o uno arriba; si no, queda pendiente de aprobación.
- Elo con K = 32, calculado en la base de datos (`ranked_capturar_resultado`).
- Los datos personales del onboarding (edad, género, CP) viven en `ranked_player_profiles`: solo los lee el dueño y el admin.
- Si Supabase exige confirmar correo, el perfil se completa en el primer inicio de sesión.
- Modo TV: `/tv` (Realtime).
