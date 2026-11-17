import { useEffect } from 'react'
import { supabase } from '../lib/supabase'

/** Llama a `onChange` cada vez que cambian las tablas indicadas (Supabase Realtime). */
export function useRealtime(tables: string[], onChange: () => void) {
  useEffect(() => {
    const ch = supabase.channel('rt-' + tables.join('-') + Math.random().toString(36).slice(2))
    tables.forEach((t) => ch.on('postgres_changes', { event: '*', schema: 'public', table: t }, onChange))
    ch.subscribe()
    return () => {
      void supabase.removeChannel(ch)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tables.join(',')])
}
