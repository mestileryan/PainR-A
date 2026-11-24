import { nombre, quantiteTexte, sansAccents } from "./format"
import type { Etape, Ingredient } from "./types"

// Une étape peut citer un ingrédient de la recette :
//   @[Eau]        → toute la quantité
//   @[Eau|1/2]    → une partie (aussi : ½, 0,5, 50%)
// La référence se fait par le nom de l'ingrédient (sans tenir compte des accents ni de la casse).

export const motifReference = () => /@\[([^\]|\n]+)(?:\|([^\]\n]*))?\]/g

const fractions: Record<string, number> = { "½": 1 / 2, "⅓": 1 / 3, "⅔": 2 / 3, "¼": 1 / 4, "¾": 3 / 4 }

// Portion lue après « | » ; null si elle est illisible.
export function lirePortion(brut: string | undefined): number | null {
  const texte = (brut ?? "").replace(/\s/g, "").replace(",", ".")
  if (!texte) return 1
  if (texte in fractions) return fractions[texte]
  const pourcentage = texte.match(/^(\d+(?:\.\d+)?)%$/)
  if (pourcentage) return Number(pourcentage[1]) > 0 ? Number(pourcentage[1]) / 100 : null
  const fraction = texte.match(/^(\d+(?:\.\d+)?)\/(\d+(?:\.\d+)?)$/)
  if (fraction) {
    const valeur = Number(fraction[1]) / Number(fraction[2])
    return Number.isFinite(valeur) && valeur > 0 ? valeur : null
  }
  const valeur = Number(texte)
  return Number.isFinite(valeur) && valeur > 0 ? valeur : null
}

export const memeNom = (a: string, b: string) => sansAccents(a.trim()) === sansAccents(b.trim())

export const trouverIngredient = (nom: string, ingredients: Ingredient[]) =>
  ingredients.find((i) => memeNom(i.nom, nom))

export type Morceau =
  | { type: "texte"; texte: string }
  | { type: "reference"; nom: string; portion: number | null; ingredient?: Ingredient; brut: string }
  | { type: "duree"; secondes: number; brut: string }

// Blocs d'une étape : ingrédients cités @[Nom|portion] et durées #[secondes].
const motifBlocs = () => /@\[([^\]|\n]+)(?:\|([^\]\n]*))?\]|#\[(\d+)\]/g

export function decouperEtape(texte: string, ingredients: Ingredient[]): Morceau[] {
  const morceaux: Morceau[] = []
  let position = 0
  for (const m of texte.matchAll(motifBlocs())) {
    const debut = m.index ?? 0
    if (debut > position) morceaux.push({ type: "texte", texte: texte.slice(position, debut) })
    if (m[3] !== undefined) {
      morceaux.push({ type: "duree", secondes: Number(m[3]), brut: m[0] })
    } else {
      const nom = m[1].trim()
      morceaux.push({ type: "reference", nom, portion: lirePortion(m[2]), ingredient: trouverIngredient(nom, ingredients), brut: m[0] })
    }
    position = debut + m[0].length
  }
  if (position < texte.length) morceaux.push({ type: "texte", texte: texte.slice(position) })
  return morceaux
}

export const contientBlocs = (texte: string) => motifBlocs().test(texte)

// Portion lisible pour un bloc : 0.5 → « ½ », 0.3 → « 30 % ».
const portionsUsuelles: [number, string][] = [[1 / 2, "½"], [1 / 3, "⅓"], [2 / 3, "⅔"], [1 / 4, "¼"], [3 / 4, "¾"]]
export function libellePortion(portion: number): string {
  const usuelle = portionsUsuelles.find(([v]) => Math.abs(v - portion) < 1e-3)
  if (usuelle) return usuelle[1]
  return `${nombre(portion * 100, 1)} %`
}

// Jeton d'un ingrédient cité, avec sa portion (1 = tout).
export function jetonReference(nom: string, portion = 1): string {
  if (Math.abs(portion - 1) < 1e-9) return `@[${nom}]`
  const usuelle: Record<string, string> = { "½": "1/2", "⅓": "1/3", "⅔": "2/3", "¼": "1/4", "¾": "3/4" }
  const libelle = libellePortion(portion)
  return `@[${nom}|${usuelle[libelle] ?? `${nombre(portion * 100, 1)}%`}]`
}

// Quantité citée : la portion de l'ingrédient, multipliée par le coefficient de la recette.
export function quantiteReference(ingredient: Ingredient, portion: number, coefficient = 1): string {
  if (typeof ingredient.quantite === "number") return quantiteTexte(ingredient, portion * coefficient)
  const base = quantiteTexte(ingredient)
  return portion === 1 || !base ? base : `${nombre(portion, 2)} × ${base}`
}

// Références introuvables ou portions illisibles, avec le numéro de l'étape.
export function problemesReferences(etapes: Etape[], ingredients: Ingredient[]): string[] {
  const problemes: string[] = []
  etapes.forEach((etape, i) => {
    for (const m of decouperEtape(etape.texte, ingredients)) {
      if (m.type !== "reference") continue
      if (!m.ingredient) problemes.push(`Étape ${i + 1} : l'ingrédient « ${m.nom} » n'est pas dans la liste des ingrédients.`)
      else if (m.portion === null) problemes.push(`Étape ${i + 1} : la portion de « ${m.nom} » est illisible (exemples : 1/2, 30%, 0,25).`)
    }
  })
  return problemes
}

// Renomme les références à un ingrédient, en gardant leur portion.
export function renommerReferences(texte: string, ancien: string, nouveau: string): string {
  return texte.replace(motifReference(), (brut, nom: string, portion?: string) =>
    memeNom(nom, ancien) ? `@[${nouveau}${portion !== undefined ? `|${portion}` : ""}]` : brut)
}

// Saisie d'une référence en cours : « @ea » juste avant le curseur.
export function rechercheEnCours(texte: string, curseur: number): { debut: number; requete: string } | null {
  const m = texte.slice(0, curseur).match(/@([^\s@[\]|]*)$/)
  return m ? { debut: curseur - m[0].length, requete: m[1] } : null
}
