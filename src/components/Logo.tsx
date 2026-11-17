export function Logo({ size = 32 }: { size?: number }) {
  return (
    <span className="inline-flex items-center gap-2.5">
      <img src="/logo-novo.png" alt="Novo" style={{ height: size }} className="w-auto" />
      <span className="text-sm font-bold tracking-tight">Tournament <span className="chip ml-1 !text-terra">Beta</span></span>
    </span>
  )
}
