import type { Difference } from "../lib/differences"
import type { Ingredient } from "../lib/types"
import TexteEtape from "./TexteEtape"

function Fleche() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}
      strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="shrink-0 text-sourdine">
      <path d="M5 12h14M13 6l6 6-6 6" />
    </svg>
  )
}

const classeAvant = "text-sourdine line-through"
const classeApres = "rounded-md bg-essai-fond px-2 py-0.5 font-medium text-essai"

function Ligne({ d, avant, apres }: { d: Difference; avant: Ingredient[]; apres: Ingredient[] }) {
  switch (d.type) {
    case "ingredient-modifie":
      return (
        <>
          <span className="text-sm font-semibold text-sourdine">Ingrédient · {d.nom}</span>
          <span className="flex flex-wrap items-center gap-2.5 font-mono text-base">
            <span className={classeAvant}>{d.avant || "—"}</span>
            <Fleche />
            <span className={classeApres}>{d.apres || "—"}</span>
          </span>
        </>
      )
    case "ingredient-ajoute":
      return (
        <>
          <span className="text-sm font-semibold text-sourdine">Ingrédient ajouté</span>
          <span className="flex flex-wrap items-center gap-2.5 font-mono text-base">
            <span className={classeApres}>{`${d.nom} ${d.apres}`.trim()}</span>
          </span>
        </>
      )
    case "ingredient-retire":
      return (
        <>
          <span className="text-sm font-semibold text-sourdine">Ingrédient retiré</span>
          <span className={`font-mono text-base ${classeAvant}`}>{`${d.nom} ${d.avant}`.trim()}</span>
        </>
      )
    case "etape-modifiee":
      return (
        <>
          <span className="text-sm font-semibold text-sourdine">Étape {String(d.numero).padStart(2, "0")}</span>
          <span className={`text-[15px] leading-snug ${classeAvant}`}><TexteEtape texte={d.avant} ingredients={avant} /></span>
          <span className="self-start rounded-md bg-essai-fond px-2 py-1 text-[15px] leading-snug text-essai"><TexteEtape texte={d.apres} ingredients={apres} /></span>
        </>
      )
    case "etape-ajoutee":
      return (
        <>
          <span className="text-sm font-semibold text-sourdine">Nouvelle étape {String(d.numero).padStart(2, "0")}</span>
          <span className="self-start rounded-md bg-essai-fond px-2 py-1 text-[15px] leading-snug text-essai"><TexteEtape texte={d.apres} ingredients={apres} /></span>
        </>
      )
    case "etape-retiree":
      return (
        <>
          <span className="text-sm font-semibold text-sourdine">Étape {String(d.numero).padStart(2, "0")} retirée</span>
          <span className={`text-[15px] leading-snug ${classeAvant}`}><TexteEtape texte={d.avant} ingredients={avant} /></span>
        </>
      )
  }
}

export default function ListeDifferences({ differences, ingredientsAvant = [], ingredientsApres = [] }: {
  differences: Difference[]
  ingredientsAvant?: Ingredient[]
  ingredientsApres?: Ingredient[]
}) {
  if (differences.length === 0) {
    return <p className="m-0 text-[15px] text-sourdine">Aucune différence avec la version de départ.</p>
  }
  return (
    <ul className="m-0 flex list-none flex-col rounded-2xl border border-trait bg-carte p-0">
      {differences.map((d, i) => (
        <li key={i} className="flex flex-col gap-2 border-b border-[#ecebe7] px-4 py-3.5 last:border-b-0">
          <Ligne d={d} avant={ingredientsAvant} apres={ingredientsApres} />
        </li>
      ))}
    </ul>
  )
}
