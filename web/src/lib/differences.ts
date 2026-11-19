import { quantiteTexte, sansAccents } from "./format"
import type { Etape, Ingredient } from "./types"

interface Contenu {
  ingredients: Ingredient[] | null
  etapes: Etape[] | null
}

// Résumé lisible de ce qui change entre une version et un essai :
// « Eau 700 g → 750 g », « + Graines de lin 50 g », « Étape 3 modifiée »…
export function resumerDifferences(avant: Contenu, apres: Contenu): string[] {
  const lignes: string[] = []
  const cle = (i: Ingredient) => sansAccents(i.nom.trim())

  const ingredientsAvant = avant.ingredients ?? []
  const ingredientsApres = apres.ingredients ?? []
  const indexAvant = new Map(ingredientsAvant.map((i) => [cle(i), i]))
  const indexApres = new Map(ingredientsApres.map((i) => [cle(i), i]))

  for (const nouveau of ingredientsApres) {
    const ancien = indexAvant.get(cle(nouveau))
    if (!ancien) {
      lignes.push(`+ ${nouveau.nom} ${quantiteTexte(nouveau)}`.trim())
    } else if (quantiteTexte(ancien) !== quantiteTexte(nouveau)) {
      lignes.push(`${nouveau.nom} ${quantiteTexte(ancien) || "—"} → ${quantiteTexte(nouveau) || "—"}`)
    }
  }
  for (const ancien of ingredientsAvant) {
    if (!indexApres.has(cle(ancien))) lignes.push(`− ${ancien.nom}`)
  }

  const etapesAvant = avant.etapes ?? []
  const etapesApres = apres.etapes ?? []
  const communes = Math.min(etapesAvant.length, etapesApres.length)
  for (let i = 0; i < communes; i++) {
    if (etapesAvant[i].texte.trim() !== etapesApres[i].texte.trim()) lignes.push(`Étape ${i + 1} modifiée`)
  }
  for (let i = communes; i < etapesApres.length; i++) lignes.push(`+ Étape ${i + 1}`)
  for (let i = communes; i < etapesAvant.length; i++) lignes.push(`− Étape ${i + 1}`)

  return lignes
}
