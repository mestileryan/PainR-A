import { useEffect, useId, useMemo, useState } from "react"
import { lireQuantite, quantiteSaisie, sansAccents } from "../lib/format"
import { memeNom, problemesReferences, renommerReferences } from "../lib/references"
import type { Etape, Ingredient } from "../lib/types"
import EditeurEtape from "./EditeurEtape"
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
  quantite: i ? quantiteSaisie(i) : "",
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

// Problème bloquant avant l'enregistrement : ingrédients en double ou référence introuvable.
export function verifierLignes(lignes: Lignes): string | null {
  const { ingredients, etapes } = contenuDepuis(lignes)
  const vus = new Set<string>()
  for (const i of ingredients) {
    const cle = sansAccents(i.nom)
    if (vus.has(cle)) {
      return `L'ingrédient « ${i.nom} » apparaît deux fois : donne-leur des noms différents (par exemple « Farine T65 » et « Farine T80 »).`
    }
    vus.add(cle)
  }
  return problemesReferences(etapes, ingredients)[0] ?? null
}

export default function EditeurContenu({ lignes, onChange }: { lignes: Lignes; onChange: (l: Lignes) => void }) {
  const idBase = useId()
  const [aFocaliser, setAFocaliser] = useState<string | null>(null)
  const ingredientsCites = useMemo(() => contenuDepuis(lignes).ingredients, [lignes])
  const idIngredient = (cle: number) => `${idBase}-ingredient-${cle}`
  const idEtape = (cle: number) => `${idBase}-etape-${cle}`

  // Une ligne ajoutée (bouton ou Tab) reçoit le curseur dès qu'elle est affichée.
  useEffect(() => {
    if (aFocaliser === null) return
    document.getElementById(aFocaliser)?.focus()
    setAFocaliser(null)
  }, [aFocaliser])

  function ajouterIngredient() {
    const ligne = nouvelIngredient()
    setAFocaliser(idIngredient(ligne.cle))
    onChange({ ...lignes, ingredients: [...lignes.ingredients, ligne] })
  }

  function ajouterEtape() {
    const ligne = nouvelleEtape()
    setAFocaliser(idEtape(ligne.cle))
    onChange({ ...lignes, etapes: [...lignes.etapes, ligne] })
  }

  function majIngredient(cle: number, champ: "nom" | "quantite" | "unite", valeur: string) {
    let etapes = lignes.etapes
    if (champ === "nom") {
      // Renommer un ingrédient met à jour ses références dans les étapes.
      const ancien = lignes.ingredients.find((l) => l.cle === cle)?.nom ?? ""
      const homonyme = lignes.ingredients.some((l) => l.cle !== cle && memeNom(l.nom, ancien))
      if (ancien.trim() && valeur.trim() && !homonyme && !memeNom(ancien, valeur)) {
        etapes = etapes.map((e) => ({ ...e, texte: renommerReferences(e.texte, ancien, valeur.trim()) }))
      }
    }
    onChange({ ingredients: lignes.ingredients.map((l) => (l.cle === cle ? { ...l, [champ]: valeur } : l)), etapes })
  }

  const majEtape = (cle: number, texte: string) =>
    onChange({ ...lignes, etapes: lignes.etapes.map((l) => (l.cle === cle ? { ...l, texte } : l)) })

  return (
    <>
      <section className="flex flex-col gap-2.5">
        <TitreSection>Ingrédients</TitreSection>
        <div className="flex gap-2 pr-[52px] text-[13px] font-medium text-sourdine" aria-hidden="true">
          <span className="flex-1">Ingrédient</span>
          <span className="w-20">Quantité</span>
          <span className="w-24">Unité</span>
        </div>
        {lignes.ingredients.map((ligne, i) => (
          <div key={ligne.cle} className="flex items-center gap-2">
            <input id={idIngredient(ligne.cle)} aria-label={`Ingrédient ${i + 1}`} value={ligne.nom}
              onChange={(e) => majIngredient(ligne.cle, "nom", e.target.value)}
              className={`${classeChamp} min-w-0 flex-1`} />
            <input aria-label={`Quantité de l'ingrédient ${i + 1}`} inputMode="decimal" value={ligne.quantite}
              onChange={(e) => majIngredient(ligne.cle, "quantite", e.target.value)}
              className={`${classeChamp} w-20! shrink-0 font-mono`} />
            <input aria-label={`Unité de l'ingrédient ${i + 1}`} value={ligne.unite} placeholder="g"
              onChange={(e) => majIngredient(ligne.cle, "unite", e.target.value)}
              onKeyDown={(e) => {
                // Tab depuis la dernière ligne remplie : on en ajoute une nouvelle.
                // Si elle est vide, Tab sort de la liste.
                const remplie = Boolean(ligne.nom.trim() || ligne.quantite.trim() || ligne.unite.trim())
                if (e.key === "Tab" && !e.shiftKey && i === lignes.ingredients.length - 1 && remplie) {
                  e.preventDefault()
                  ajouterIngredient()
                }
              }}
              className={`${classeChamp} w-24! shrink-0`} />
            {/* Hors tabulation : Tab enchaîne Ingrédient → Quantité → Unité → ligne suivante. */}
            <button type="button" tabIndex={-1} aria-label={`Retirer l'ingrédient ${i + 1}`} className={classeBoutonRetrait}
              onClick={() => onChange({ ...lignes, ingredients: lignes.ingredients.filter((l) => l.cle !== ligne.cle) })}>
              <IconeCroix />
            </button>
          </div>
        ))}
        <button type="button" className={classeBoutonAjout} onClick={ajouterIngredient}>
          <IconePlus /> Ajouter un ingrédient
        </button>
      </section>

      <section className="flex flex-col gap-2.5">
        <TitreSection>Étapes</TitreSection>
        <p className="m-0 text-sm leading-snug text-sourdine">
          Tape <kbd className="font-mono text-encre">@</kbd> ou utilise les boutons pour insérer un ingrédient ou une
          durée. Touche un bloc pour en prendre une fraction ou le modifier ; Retour arrière l'efface en entier.
        </p>
        {lignes.etapes.map((ligne, i) => (
          <div key={ligne.cle} className="flex items-start gap-2">
            <span className="w-7 shrink-0 pt-3 font-mono text-sm text-seigle">{String(i + 1).padStart(2, "0")}</span>
            <EditeurEtape id={idEtape(ligne.cle)} numero={i + 1} texte={ligne.texte} ingredients={ingredientsCites}
              autresTextes={lignes.etapes.filter((l) => l.cle !== ligne.cle).map((l) => l.texte)}
              onChange={(texte) => majEtape(ligne.cle, texte)}
              onToucheLibre={(e) => {
                // Tab depuis la dernière étape remplie : on en ajoute une nouvelle.
                if (e.key === "Tab" && !e.shiftKey && i === lignes.etapes.length - 1 && ligne.texte.trim()) {
                  e.preventDefault()
                  ajouterEtape()
                }
              }} />
            <button type="button" tabIndex={-1} aria-label={`Retirer l'étape ${i + 1}`} className={classeBoutonRetrait}
              onClick={() => onChange({ ...lignes, etapes: lignes.etapes.filter((l) => l.cle !== ligne.cle) })}>
              <IconeCroix />
            </button>
          </div>
        ))}
        <button type="button" className={classeBoutonAjout} onClick={ajouterEtape}>
          <IconePlus /> Ajouter une étape
        </button>
      </section>
    </>
  )
}
