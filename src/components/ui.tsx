import type { ReactNode } from 'react'
import { nivelCat } from '../lib/niveles'

export const Title = ({ children, sub }: { children: ReactNode; sub?: string }) => (
  <div className="rise mb-6">
    <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{children}</h1>
    {sub && <p className="mt-1 text-sm text-soft">{sub}</p>}
  </div>
)
export const NivelBadge = ({ nivel }: { nivel: string }) => (
  <span className="chip">{nivel} · {nivelCat(nivel)}</span>
)
export const Empty = ({ children }: { children: ReactNode }) => (
  <div className="card p-8 text-center text-sm text-soft">{children}</div>
)
export const ErrorMsg = ({ msg }: { msg: string | null }) =>
  msg ? <p className="rounded-btn border border-neg/30 bg-neg/5 px-3 py-2 text-sm text-neg">{msg}</p> : null
