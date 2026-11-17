import { useScrollFx } from '../hooks/useScrollFx'

/** Capa decorativa: trofeo, llaves de torneo que se dibujan con el scroll y una pelota rodando. */
export function Decor() {
  useScrollFx()
  return (
    <div className="decor" aria-hidden>
      <svg className="decor-trophy" viewBox="0 0 120 140" fill="none" stroke="#C17A5A" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
        <path d="M30 14h60v32c0 18-13 30-30 30S30 64 30 46V14z" />
        <path d="M30 24H14c0 16 6 26 18 30M90 24h16c0 16-6 26-18 30" />
        <path d="M60 76v22M40 126h40M46 98h28l4 28H42z" />
      </svg>
      <svg className="decor-bracket" viewBox="0 0 800 300" fill="none" stroke="#C17A5A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" opacity=".28">
        <path pathLength={1} d="M20 30h90v50h90M20 130h90V80M20 170h90v50h90M20 270h90V220M200 80h110v90h110M200 220h110V170M420 170h130h120" />
        <circle cx="672" cy="170" r="7" fill="#C17A5A" stroke="none" />
      </svg>
      <svg className="decor-ball" viewBox="0 0 48 48" fill="none" stroke="#C17A5A" strokeWidth="2.5">
        <circle cx="24" cy="24" r="20" />
        <path d="M6 18c10 2 16 8 18 18M42 30C32 28 26 22 24 12" />
      </svg>
    </div>
  )
}
