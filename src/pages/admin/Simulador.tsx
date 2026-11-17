import { useState } from 'react'
import { mxn } from '../../lib/format'
import { Title } from '../../components/ui'

function Slider({ label, v, set, min, max, step = 1, fmt = String }: { label: string; v: number; set: (n: number) => void; min: number; max: number; step?: number; fmt?: (n: number) => string }) {
  return (
    <div>
      <div className="mb-1 flex justify-between text-sm"><span className="text-soft">{label}</span><b className="tabular-nums">{fmt(v)}</b></div>
      <input type="range" className="w-full accent-[#C17A5A]" min={min} max={max} step={step} value={v} onChange={(e) => set(Number(e.target.value))} />
    </div>
  )
}

export default function Simulador() {
  const [precio, setPrecio] = useState(150)
  const [jugadores, setJugadores] = useState(8)
  const [retas, setRetas] = useState(12)
  const [cancha, setCancha] = useState(350)
  const [premio, setPremio] = useState(15)
  const [fijos, setFijos] = useState(1500)

  const ingresos = precio * jugadores * retas
  const premios = ingresos * (premio / 100)
  const canchas = cancha * retas
  const costos = premios + canchas + fijos
  const utilidad = ingresos - costos
  const margen = ingresos > 0 ? (utilidad / ingresos) * 100 : 0
  const contribucion = precio * jugadores * (1 - premio / 100) - cancha
  const equilibrio = contribucion > 0 ? Math.ceil(fijos / contribucion) : null
  const max = Math.max(ingresos, costos, 1)

  const barra = (l: string, n: number, c: string) => (
    <div><div className="mb-1 flex justify-between text-sm"><span className="text-soft">{l}</span><b className="tabular-nums">{mxn(n)}</b></div>
      <div className="h-2.5 overflow-hidden rounded-full bg-bg2"><div className={`h-full rounded-full transition-all duration-500 ${c}`} style={{ width: Math.max(0, (n / max) * 100) + '%' }} /></div></div>
  )

  return (
    <div>
      <Title sub="Mueve los controles y ve en vivo si el Ranked es negocio. Periodo: un mes.">Simulador de negocio</Title>
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="card rise space-y-5 p-5">
          <Slider label="Cuota por jugador" v={precio} set={setPrecio} min={50} max={400} step={10} fmt={mxn} />
          <Slider label="Jugadores por reta" v={jugadores} set={setJugadores} min={2} max={24} />
          <Slider label="Retas al mes" v={retas} set={setRetas} min={1} max={60} />
          <Slider label="Costo de cancha por reta" v={cancha} set={setCancha} min={0} max={1000} step={25} fmt={mxn} />
          <Slider label="Premios (% de ingresos)" v={premio} set={setPremio} min={0} max={50} fmt={(n) => n + '%'} />
          <Slider label="Gastos fijos del mes" v={fijos} set={setFijos} min={0} max={10000} step={100} fmt={mxn} />
        </div>
        <div className="card rise space-y-5 p-5">
          <div className="text-center"><div className="text-xs font-semibold uppercase tracking-wide text-soft">Utilidad mensual</div>
            <div className={`text-4xl font-bold tabular-nums transition-colors ${utilidad >= 0 ? 'text-pos' : 'text-neg'}`}>{mxn(utilidad)}</div>
            <div className="text-sm text-soft">Margen {margen.toFixed(0)}%</div></div>
          {barra('Ingresos', ingresos, 'bg-pos')}
          {barra('Canchas', canchas, 'bg-terra')}
          {barra('Premios', premios, 'bg-warn')}
          {barra('Gastos fijos', fijos, 'bg-soft')}
          <p className="rounded-btn bg-off p-3 text-sm">{equilibrio === null ? 'Con estos números cada reta pierde dinero: sube la cuota o baja el costo.' : `Punto de equilibrio: ${equilibrio} retas al mes.`}</p>
        </div>
      </div>
    </div>
  )
}
