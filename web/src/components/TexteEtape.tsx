import { Fragment } from "react"
import { decouperEtape, quantiteReference } from "../lib/references"
import type { Ingredient } from "../lib/types"

// Texte d'une étape, avec les ingrédients cités affichés en pastille « Eau · 350 g ».
export default function TexteEtape({ texte, ingredients, coefficient = 1 }: {
  texte: string
  ingredients: Ingredient[]
  coefficient?: number
}) {
  return (
    <>
      {decouperEtape(texte, ingredients).map((m, i) => {
        if (m.type === "texte") return <Fragment key={i}>{m.texte}</Fragment>
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
