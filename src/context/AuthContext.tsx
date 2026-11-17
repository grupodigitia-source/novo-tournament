import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'
import type { Player } from '../lib/types'

export interface Pendiente {
  nombre: string; nivel: string; edad: number; genero: string; cp: string; tiempo: string; optin: boolean
}
const PEND_KEY = 'nt-pendiente'
export const guardarPendiente = (p: Pendiente) => localStorage.setItem(PEND_KEY, JSON.stringify(p))

interface Ctx {
  session: Session | null
  player: Player | null
  isAdmin: boolean
  loading: boolean
  refresh: () => Promise<void>
  signOut: () => Promise<void>
}
const AuthCtx = createContext<Ctx>({} as Ctx)
export const useAuth = () => useContext(AuthCtx)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [player, setPlayer] = useState<Player | null>(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async (s: Session | null) => {
    if (!s) { setPlayer(null); setIsAdmin(false); return }
    const [{ data: adm }, { data: pl }] = await Promise.all([
      supabase.rpc('ranked_is_admin'),
      supabase.from('ranked_players').select('*').eq('user_id', s.user.id).maybeSingle(),
    ])
    setIsAdmin(Boolean(adm))
    let mine = pl as Player | null
    if (!mine) {
      const raw = localStorage.getItem(PEND_KEY)
      if (raw) {
        const p = JSON.parse(raw) as Pendiente
        const { data } = await supabase.rpc('ranked_registrar_jugador', {
          p_nombre: p.nombre, p_nivel: p.nivel, p_edad: p.edad, p_genero: p.genero,
          p_cp: p.cp, p_tiempo: p.tiempo, p_optin: p.optin,
        })
        if (data) { mine = data as Player; localStorage.removeItem(PEND_KEY) }
      }
    }
    setPlayer(mine)
  }, [])

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      setSession(data.session)
      await load(data.session)
      setLoading(false)
    })
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => {
      setSession(s)
      setTimeout(() => void load(s), 0)
    })
    return () => sub.subscription.unsubscribe()
  }, [load])

  const refresh = useCallback(async () => {
    const { data } = await supabase.auth.getSession()
    await load(data.session)
  }, [load])

  const signOut = async () => { await supabase.auth.signOut() }

  return <AuthCtx.Provider value={{ session, player, isAdmin, loading, refresh, signOut }}>{children}</AuthCtx.Provider>
}
