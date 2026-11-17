export type Lado = 'a' | 'b'

export interface Marcador {
  juegosA: number
  juegosB: number
  puntosA: string
  puntosB: string
  tiebreak: boolean
  puntoOro: boolean
  terminado: boolean
  ganador: Lado | null
}

const TXT = ['0', '15', '30', '40']

/**
 * 1 set a 6 juegos, ganando por 2; tie-break a 7 (por 2) en 6-6.
 * Puntos 0-15-30-40 con punto de oro a 40-40 (el siguiente punto gana el juego).
 */
export function calcular(lados: Lado[]): Marcador {
  let ga = 0, gb = 0, pa = 0, pb = 0, tb = false
  let fin: Lado | null = null
  for (const l of lados) {
    if (fin) break
    if (l === 'a') pa++; else pb++
    if (tb) {
      if ((pa >= 7 || pb >= 7) && Math.abs(pa - pb) >= 2) {
        if (pa > pb) ga++; else gb++
        fin = pa > pb ? 'a' : 'b'
      }
    } else if (pa >= 4 || pb >= 4) {
      if (pa > pb) ga++; else gb++
      pa = 0; pb = 0
      if ((ga >= 6 || gb >= 6) && Math.abs(ga - gb) >= 2) fin = ga > gb ? 'a' : 'b'
      else if (ga === 6 && gb === 6) tb = true
    }
  }
  return {
    juegosA: ga,
    juegosB: gb,
    puntosA: tb ? String(pa) : TXT[Math.min(pa, 3)],
    puntosB: tb ? String(pb) : TXT[Math.min(pb, 3)],
    tiebreak: tb && !fin,
    puntoOro: !tb && !fin && pa === 3 && pb === 3,
    terminado: fin !== null,
    ganador: fin,
  }
}
