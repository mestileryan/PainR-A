import type { ReactNode } from "react"
import { Link } from "react-router"
import { IconeRetour } from "./Icones"

export function Page({ children }: { children: ReactNode }) {
  return (
    <main className="mx-auto flex min-h-dvh max-w-xl flex-col gap-6 px-5 pt-5 pb-28">{children}</main>
  )
}

export function LienRetour({ vers, children }: { vers: string; children: ReactNode }) {
  return (
    <Link to={vers} className="flex h-11 items-center gap-1 self-start text-[15px] font-medium hover:text-seigle">
      <IconeRetour />
      {children}
    </Link>
  )
}

export function Erreur({ message }: { message: string }) {
  if (!message) return null
  return (
    <p role="alert" className="m-0 rounded-xl bg-erreur-fond px-4 py-3 text-[15px] leading-snug text-erreur">
      {message}
    </p>
  )
}

export function Chargement() {
  return <p className="m-0 text-[15px] text-sourdine">Chargement…</p>
}

export function TitreSection({ children, aside }: { children: ReactNode; aside?: ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <h2 className="m-0 font-titre text-[21px] font-semibold">{children}</h2>
      {aside && <span className="text-sm text-sourdine">{aside}</span>}
    </div>
  )
}

export const classeChamp =
  "h-[46px] w-full box-border rounded-xl border border-trait-fort bg-carte px-3.5 text-encre placeholder:text-sourdine/70"

export const classeBoutonPrincipal =
  "flex h-[52px] items-center justify-center gap-2 rounded-2xl border-0 bg-encre px-5 text-base font-semibold text-white disabled:opacity-60"

export const classeBoutonSecondaire =
  "flex h-[52px] items-center justify-center gap-2 rounded-2xl border-2 border-encre bg-carte px-5 text-base font-semibold text-encre disabled:opacity-60"

export const classeBoutonPointille =
  "flex h-[52px] items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-pointille bg-transparent px-5 text-base font-semibold text-encre"
