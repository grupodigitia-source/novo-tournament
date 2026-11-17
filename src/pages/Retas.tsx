import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import type { Inscripcion, Sesion } from '../lib/types'
import { useRealtime } from '../hooks/useRealtime'
import { fechaCorta } from '../lib/format'
import { Empty, NivelBadge, Title } from '../components/ui'

export default function Retas() {
  const [sesiones, setSesiones] = useState<Sesion[]>([])
  const [ins, setIns] = useState<Inscripcion[]>([])
  const load = useCallback(async () => {
    const desde = new Date(Date.now() - 3 * 3600_000).toISOString()
    const [{ data: s }, { data: i }] = await Promise.all([
      supabase.from('ranked_sesiones').select('*').eq('estado', 'abierta').gte('fecha', desde).order('fecha'),
      supabase.from('ranked_inscripciones').select('*').eq('estado', 'confirmada'),
    ])
    setSesiones((s ?? []) as Sesion[]); setIns((i ?? []) as Inscripcion[])
  }, [])
  useEffect(() => { void load() }, [load])
  useRealtime(['ranked_inscripciones'], () => void load())

  return (
    <div>
      <Title sub="Escanea el QR en la cancha o inscríbete desde aquí.">Próximas retas</Title>
      {sesiones.length === 0 ? <Empty>No hay retas programadas por ahora.</Empty> : (
        <div className="grid gap-4 sm:grid-cols-2">
          {sesiones.map((s, i) => {
            const n = ins.filter((x) => x.sesion_id === s.id).length
            const pct = Math.min(100, (n / s.cupo) * 100)
            return (
              <div key={s.id} className="card rise p-5" style={{ animationDelay: `${i * 60}ms` }}>
                <div className="flex items-start justify-between">
                  <div><div className="text-sm font-semibold">{fechaCorta(s.fecha)}</div><div className="mt-1"><NivelBadge nivel={s.nivel} /></div></div>
                  <span className="text-sm font-bold tabular-nums">{n}/{s.cupo}</span>
                </div>
                <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-bg2"><div className="h-full rounded-full bg-terra transition-all duration-700" style={{ width: pct + '%' }} /></div>
                <Link to={`/r/${s.codigo}`} className="btn-primary mt-4 w-full">{n >= s.cupo ? 'Cupo lleno' : 'Inscribirme'}</Link>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
