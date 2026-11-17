import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { QRCodeSVG } from 'qrcode.react'
import { supabase } from '../../lib/supabase'
import type { Sesion } from '../../lib/types'
import { fechaCorta } from '../../lib/format'
import { nivelCat } from '../../lib/niveles'
import { Logo } from '../../components/Logo'

export default function QRPrint() {
  const { id } = useParams()
  const [s, setS] = useState<Sesion | null>(null)
  useEffect(() => { supabase.from('ranked_sesiones').select('*').eq('id', id ?? '').maybeSingle().then(({ data }) => setS(data as Sesion | null)) }, [id])
  if (!s) return <p className="text-sm text-soft">Cargando…</p>
  const base = (import.meta.env.VITE_PUBLIC_URL as string | undefined) ?? window.location.origin
  const url = `${base.replace(/\/$/, '')}/r/${s.codigo}`
  return (
    <div>
      <div className="no-print mb-4 flex gap-2"><Link to="/admin/programar" className="btn-ghost">Volver</Link><button className="btn-primary" onClick={() => window.print()}>Imprimir</button></div>
      <div className="print-area card mx-auto flex max-w-md flex-col items-center gap-5 p-10 text-center">
        <Logo size={44} />
        <h1 className="text-2xl font-bold">Reta Ranked</h1>
        <div className="text-sm text-soft">{fechaCorta(s.fecha)} · {s.nivel} ({nivelCat(s.nivel)})</div>
        <QRCodeSVG value={url} size={260} level="M" fgColor="#111111" />
        <p className="text-sm font-semibold">Escanea para inscribirte</p>
        <p className="font-mono text-xs text-soft">{s.codigo}</p>
        <p className="break-all text-[10px] text-soft">{url}</p>
      </div>
    </div>
  )
}
