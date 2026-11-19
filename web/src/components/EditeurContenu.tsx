import { lireQuantite } from "../lib/format"
import type { Etape, Ingredient } from "../lib/types"
import { TitreSection, classeChamp } from "./Commun"
import { IconeCroix, IconePlus } from "./Icones"

// Édition des ingrédients et des étapes, partagée entre la création d'une
// recette et la proposition (ou la retouche) d'un essai.

export interface LigneIngredient {
  cle: number
  nom: string
  quantite: string
  unite: string
}

export interface LigneEtape {
  cle: number
  texte: string
}

export interface Lignes {
  ingredients: LigneIngredient[]
  etapes: LigneEtape[]
}

let compteur = 0
export const nouvelIngredient = (i?: Ingredient): LigneIngredient => ({
  cle: ++compteur,
  nom: i?.nom ?? "",
  quantite: i?.quantite === undefined || i?.quantite === null ? "" : String(i.quantite).replace(".", ","),
  unite: i?.unite ?? "",
})
export const nouvelleEtape = (e?: Etape): LigneEtape => ({ cle: ++compteur, texte: e?.texte ?? "" })

export function lignesDepuis(contenu?: { ingredients: Ingredient[] | null; etapes: Etape[] | null }): Lignes {
  const ingredients = contenu?.ingredients?.length ? contenu.ingredients.map(nouvelIngredient) : [nouvelIngredient(), nouvelIngredient(), nouvelIngredient()]
  const etapes = contenu?.etapes?.length ? contenu.etapes.map(nouvelleEtape) : [nouvelleEtape(), nouvelleEtape()]
  return { ingredients, etapes }
}

// Les lignes vides sont ignorées.
export function contenuDepuis(lignes: Lignes): { ingredients: Ingredient[]; etapes: Etape[] } {
  const ingredients = lignes.ingredients
    .filter((l) => l.nom.trim())
    .map((l) => {
      const ingredient: Ingredient = { nom: l.nom.trim() }
      const quantite = lireQuantite(l.quantite)
      if (quantite !== undefined) ingredient.quantite = quantite
      if (l.unite.trim()) ingredient.unite = l.unite.trim()
      return ingredient
    })
  const etapes = lignes.etapes.filter((l) => l.texte.trim()).map((l) => ({ texte: l.texte.trim() }))
  return { ingredients, etapes }
}

const classeBoutonAjout =
  "flex h-11 items-center gap-1.5 self-start rounded-xl border-0 bg-transparent px-1 text-[15px] font-semibold text-seigle"
const classeBoutonRetrait =
  "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border-0 bg-transparent text-sourdine hover:text-encre"

export default function EditeurContenu({ lignes, onChange }: { lignes: Lignes; onChange: (l: Lignes) => void }) {
  const majIngredient = (cle: number, champ: "nom" | "quantite" | "unite", valeur: string) =>
    onChange({ ...lignes, ingredients: lignes.ingredients.map((l) => (l.cle === cle ? { ...l, [champ]: valeur } : l)) })
  const majEtape = (cle: number, texte: string) =>
    onChange({ ...lignes, etapes: lignes.etapes.map((l) => (l.cle === cle ? { ...l, texte } : l)) })

  return (
    <>
      <section className="flex flex-col gap-2.5">
        <TitreSection>Ingrédients</TitreSection>
        <div className="flex gap-2 pr-[52px] text-[13px] font-medium text-sourdine" aria-hidden="true">
          <span className="flex-1">Ingrédient</span>
          <span className="w-20">Quantité</span>
          <span className="w-16">Unité</span>
        </div>
        {lignes.ingredients.map((ligne, i) => (
          <div key={ligne.cle} className="flex items-center gap-2">
            <input aria-label={`Ingrédient ${i + 1}`} value={ligne.nom}
              onChange={(e) => majIngredient(ligne.cle, "nom", e.target.value)}
              className={`${classeChamp} min-w-0 flex-1`} />
            <input aria-label={`Quantité de l'ingrédient ${i + 1}`} inputMode="decimal" value={ligne.quantite}
              onChange={(e) => majIngredient(ligne.cle, "quantite", e.target.value)}
              className={`${classeChamp} w-20! shrink-0 font-mono`} />
            <input aria-label={`Unité de l'ingrédient ${i + 1}`} value={ligne.unite} placeholder="g"
              onChange={(e) => majIngredient(ligne.cle, "unite", e.target.value)}
              className={`${classeChamp} w-16! shrink-0`} />
            <button type="button" aria-label={`Retirer l'ingrédient ${i + 1}`} className={classeBoutonRetrait}
              onClick={() => onChange({ ...lignes, ingredients: lignes.ingredients.filter((l) => l.cle !== ligne.cle) })}>
              <IconeCroix />
            </button>
          </div>
        ))}
        <button type="button" className={classeBoutonAjout}
          onClick={() => onChange({ ...lignes, ingredients: [...lignes.ingredients, nouvelIngredient()] })}>
          <IconePlus /> Ajouter un ingrédient
        </button>
      </section>

      <section className="flex flex-col gap-2.5">
        <TitreSection>Étapes</TitreSection>
        {lignes.etapes.map((ligne, i) => (
          <div key={ligne.cle} className="flex items-start gap-2">
            <span className="w-7 shrink-0 pt-3 font-mono text-sm text-seigle">{String(i + 1).padStart(2, "0")}</span>
            <textarea aria-label={`Étape ${i + 1}`} rows={2} value={ligne.texte}
              onChange={(e) => majEtape(ligne.cle, e.target.value)}
              className="box-border min-w-0 flex-1 resize-y rounded-xl border border-trait-fort bg-carte px-3.5 py-3 leading-snug" />
            <button type="button" aria-label={`Retirer l'étape ${i + 1}`} className={classeBoutonRetrait}
              onClick={() => onChange({ ...lignes, etapes: lignes.etapes.filter((l) => l.cle !== ligne.cle) })}>
              <IconeCroix />
            </button>
          </div>
        ))}
        <button type="button" className={classeBoutonAjout}
          onClick={() => onChange({ ...lignes, etapes: [...lignes.etapes, nouvelleEtape()] })}>
          <IconePlus /> Ajouter une étape
        </button>
      </section>
    </>
  )
}
