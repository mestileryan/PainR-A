import { Fragment } from "react"
import { formatDuree } from "../lib/durees"
import { decouperEtape, quantiteReference } from "../lib/references"
import type { Ingredient } from "../lib/types"
import { IconeChrono } from "./Icones"

// Texte d'une étape, avec ses blocs : ingrédients cités « Eau · 350 g » et durées « 1 h 30 ».
export default function TexteEtape({ texte, ingredients, coefficient = 1 }: {
  texte: string
  ingredients: Ingredient[]
  coefficient?: number
}) {
  return (
    <>
      {decouperEtape(texte, ingredients).map((m, i) => {
        if (m.type === "texte") return <Fragment key={i}>{m.texte}</Fragment>
        if (m.type === "duree") {
          return (
            <span key={i} className="inline-flex items-center gap-1 rounded-md bg-version-fond px-1.5 py-px align-baseline whitespace-nowrap text-version">
              <IconeChrono taille={14} className="self-center" />
              <span className="font-mono text-[0.9em] font-medium">{formatDuree(m.secondes)}</span>
            </span>
          )
        }
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
