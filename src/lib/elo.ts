export const K = 32
export const esperado = (ra: number, rb: number) => 1 / (1 + Math.pow(10, (rb - ra) / 400))
/** Cambio de puntos para A (B recibe el opuesto). */
export const deltaElo = (ra: number, rb: number, ganaA: boolean) =>
  Math.round(K * ((ganaA ? 1 : 0) - esperado(ra, rb)))
