import { Fragment, type ReactNode } from "react"
import { dureesDansTexte, formatDuree } from "../lib/durees"
import { decouperEtape, quantiteReference } from "../lib/references"
import type { Ingredient } from "../lib/types"
import { IconeChrono } from "./Icones"

function BlocDuree({ libelle }: { libelle: string }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-md bg-version-fond px-1.5 py-px align-baseline whitespace-nowrap text-version">
      <IconeChrono taille={14} className="self-center" />
      <span className="font-mono text-[0.9em] font-medium">{libelle}</span>
    </span>
  )
}

// Texte libre : les durées écrites (« 1h30 », « 1:30 », « 45 min ») s'affichent aussi en bloc chrono.
function TexteAvecDurees({ texte }: { texte: string }) {
  const morceaux: ReactNode[] = []
  let position = 0
  for (const d of dureesDansTexte(texte)) {
    if (d.debut > position) morceaux.push(texte.slice(position, d.debut))
    morceaux.push(<BlocDuree key={d.debut} libelle={d.libelle.trim()} />)
    position = d.fin
  }
  if (position < texte.length) morceaux.push(texte.slice(position))
  return <>{morceaux.map((m, i) => (typeof m === "string" ? <Fragment key={`t${i}`}>{m}</Fragment> : m))}</>
}

// Texte d'une étape, avec ses blocs : ingrédients cités « Eau · 350 g » et durées « 1 h 30 ».
export default function TexteEtape({ texte, ingredients, coefficient = 1 }: {
  texte: string
  ingredients: Ingredient[]
  coefficient?: number
}) {
  return (
    <>
      {decouperEtape(texte, ingredients).map((m, i) => {
        if (m.type === "texte") return <TexteAvecDurees key={i} texte={m.texte} />
        if (m.type === "duree") return <BlocDuree key={i} libelle={formatDuree(m.secondes)} />

        if (!m.ingredient || m.portion === null) {
          return (
            <span key={i} title="Ingrédient introuvable" className="rounded-md bg-erreur-fond px-1.5 text-erreur">
              {m.brut}
            </span>
          )
        }
        const quantite = quantiteReference(m.ingredient, m.portion, coefficient)
        return (
          <span key={i} className="rounded-md bg-[#f3e6da] px-1.5 py-px whitespace-nowrap text-seigle">
            <span className="font-medium">{m.ingredient.nom}</span>
            {quantite && <span className="font-mono text-[0.9em]"> · {quantite}</span>}
          </span>
        )
      })}
    </>
  )
}
