import { quantiteTexte, sansAccents } from "./format"
import type { Etape, Ingredient } from "./types"

interface Contenu {
  ingredients: Ingredient[] | null
  etapes: Etape[] | null
}

export type Difference =
  | { type: "ingredient-modifie"; nom: string; avant: string; apres: string }
  | { type: "ingredient-ajoute"; nom: string; apres: string }
  | { type: "ingredient-retire"; nom: string; avant: string }
  | { type: "etape-modifiee"; numero: number; avant: string; apres: string }
  | { type: "etape-ajoutee"; numero: number; apres: string }
  | { type: "etape-retiree"; numero: number; avant: string }

// Ce qui change entre deux contenus. Les ingrédients sont rapprochés par leur nom
// (sans tenir compte des accents ni de la casse), les étapes par leur position.
export function differences(avant: Contenu, apres: Contenu): Difference[] {
  const liste: Difference[] = []
  const cle = (i: Ingredient) => sansAccents(i.nom.trim())

  const ingredientsAvant = avant.ingredients ?? []
  const ingredientsApres = apres.ingredients ?? []
  const indexAvant = new Map(ingredientsAvant.map((i) => [cle(i), i]))
  const indexApres = new Map(ingredientsApres.map((i) => [cle(i), i]))

  for (const nouveau of ingredientsApres) {
    const ancien = indexAvant.get(cle(nouveau))
    if (!ancien) {
      liste.push({ type: "ingredient-ajoute", nom: nouveau.nom, apres: quantiteTexte(nouveau) })
    } else if (quantiteTexte(ancien) !== quantiteTexte(nouveau)) {
      liste.push({ type: "ingredient-modifie", nom: nouveau.nom, avant: quantiteTexte(ancien), apres: quantiteTexte(nouveau) })
    }
  }
  for (const ancien of ingredientsAvant) {
    if (!indexApres.has(cle(ancien))) liste.push({ type: "ingredient-retire", nom: ancien.nom, avant: quantiteTexte(ancien) })
  }

  const etapesAvant = avant.etapes ?? []
  const etapesApres = apres.etapes ?? []
  const communes = Math.min(etapesAvant.length, etapesApres.length)
  for (let i = 0; i < communes; i++) {
    if (etapesAvant[i].texte.trim() !== etapesApres[i].texte.trim()) {
      liste.push({ type: "etape-modifiee", numero: i + 1, avant: etapesAvant[i].texte, apres: etapesApres[i].texte })
    }
  }
  for (let i = communes; i < etapesApres.length; i++) liste.push({ type: "etape-ajoutee", numero: i + 1, apres: etapesApres[i].texte })
  for (let i = communes; i < etapesAvant.length; i++) liste.push({ type: "etape-retiree", numero: i + 1, avant: etapesAvant[i].texte })

  return liste
}

// Version courte, sur une ligne : « Eau 700 g → 750 g · Étape 3 modifiée ».
export function resumerDifferences(avant: Contenu, apres: Contenu): string[] {
  return differences(avant, apres).map((d) => {
    switch (d.type) {
      case "ingredient-modifie": return `${d.nom} ${d.avant || "—"} → ${d.apres || "—"}`
      case "ingredient-ajoute": return `+ ${d.nom} ${d.apres}`.trim()
      case "ingredient-retire": return `− ${d.nom}`
      case "etape-modifiee": return `Étape ${d.numero} modifiée`
      case "etape-ajoutee": return `+ Étape ${d.numero}`
      case "etape-retiree": return `− Étape ${d.numero}`
    }
  })
}
