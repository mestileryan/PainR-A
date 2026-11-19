import { useState, type FormEvent } from "react"
import { useNavigate } from "react-router"
import { Erreur, LienRetour, Page, TitreSection, classeBoutonPrincipal, classeChamp } from "../components/Commun"
import { IconeCroix, IconePlus } from "../components/Icones"
import { lireQuantite } from "../lib/format"
import { messageErreur, pb } from "../lib/pb"
import type { Etape, Ingredient } from "../lib/types"

interface LigneIngredient {
  cle: number
  nom: string
  quantite: string
  unite: string
}

interface LigneEtape {
  cle: number
  texte: string
}

let compteur = 0
const nouvelIngredient = (): LigneIngredient => ({ cle: ++compteur, nom: "", quantite: "", unite: "" })
const nouvelleEtape = (): LigneEtape => ({ cle: ++compteur, texte: "" })

const classeBoutonAjout =
  "flex h-11 items-center gap-1.5 self-start rounded-xl border-0 bg-transparent px-1 text-[15px] font-semibold text-seigle"
const classeBoutonRetrait =
  "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border-0 bg-transparent text-sourdine hover:text-encre"

export default function NouvelleRecette() {
  const naviguer = useNavigate()
  const [nom, setNom] = useState("")
  const [ingredients, setIngredients] = useState<LigneIngredient[]>(() => [nouvelIngredient(), nouvelIngredient(), nouvelIngredient()])
  const [etapes, setEtapes] = useState<LigneEtape[]>(() => [nouvelleEtape(), nouvelleEtape()])
  const [erreur, setErreur] = useState("")
  const [envoi, setEnvoi] = useState(false)

  const majIngredient = (cle: number, champ: keyof Omit<LigneIngredient, "cle">, valeur: string) =>
    setIngredients((liste) => liste.map((l) => (l.cle === cle ? { ...l, [champ]: valeur } : l)))
  const majEtape = (cle: number, texte: string) =>
    setEtapes((liste) => liste.map((l) => (l.cle === cle ? { ...l, texte } : l)))

  async function enregistrer(ev: FormEvent) {
    ev.preventDefault()
    setErreur("")
    const listeIngredients: Ingredient[] = ingredients
      .filter((l) => l.nom.trim())
      .map((l) => {
        const ingredient: Ingredient = { nom: l.nom.trim() }
        const quantite = lireQuantite(l.quantite)
        if (quantite !== undefined) ingredient.quantite = quantite
        if (l.unite.trim()) ingredient.unite = l.unite.trim()
        return ingredient
      })
    const listeEtapes: Etape[] = etapes.filter((l) => l.texte.trim()).map((l) => ({ texte: l.texte.trim() }))

    setEnvoi(true)
    try {
      const reponse = await pb.send<{ recette: string }>("/api/painrd/recettes", {
        method: "POST",
        body: { nom: nom.trim(), ingredients: listeIngredients, etapes: listeEtapes },
      })
      naviguer(`/recettes/${reponse.recette}`, { replace: true })
    } catch (err) {
      setErreur(messageErreur(err))
      setEnvoi(false)
    }
  }

  return (
    <Page>
      <LienRetour vers="/">Livret</LienRetour>
      <h1 className="m-0 font-titre text-[32px] leading-tight font-bold">Nouvelle recette</h1>

      <form onSubmit={enregistrer} className="flex flex-col gap-7">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="nom" className="text-sm font-medium text-sourdine">Nom de la recette</label>
          <input id="nom" required value={nom} onChange={(e) => setNom(e.target.value)}
            placeholder="Pain de campagne au levain" className={classeChamp} />
        </div>

        <section className="flex flex-col gap-2.5">
          <TitreSection>Ingrédients</TitreSection>
          <div className="flex gap-2 pr-[52px] text-[13px] font-medium text-sourdine" aria-hidden="true">
            <span className="flex-1">Ingrédient</span>
            <span className="w-20">Quantité</span>
            <span className="w-16">Unité</span>
          </div>
          {ingredients.map((ligne, i) => (
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
                onClick={() => setIngredients((liste) => liste.filter((l) => l.cle !== ligne.cle))}>
                <IconeCroix />
              </button>
            </div>
          ))}
          <button type="button" className={classeBoutonAjout}
            onClick={() => setIngredients((liste) => [...liste, nouvelIngredient()])}>
            <IconePlus /> Ajouter un ingrédient
          </button>
        </section>

        <section className="flex flex-col gap-2.5">
          <TitreSection>Étapes</TitreSection>
          {etapes.map((ligne, i) => (
            <div key={ligne.cle} className="flex items-start gap-2">
              <span className="w-7 shrink-0 pt-3 font-mono text-sm text-seigle">{String(i + 1).padStart(2, "0")}</span>
              <textarea aria-label={`Étape ${i + 1}`} rows={2} value={ligne.texte}
                onChange={(e) => majEtape(ligne.cle, e.target.value)}
                className="box-border min-w-0 flex-1 resize-y rounded-xl border border-trait-fort bg-carte px-3.5 py-3 leading-snug" />
              <button type="button" aria-label={`Retirer l'étape ${i + 1}`} className={classeBoutonRetrait}
                onClick={() => setEtapes((liste) => liste.filter((l) => l.cle !== ligne.cle))}>
                <IconeCroix />
              </button>
            </div>
          ))}
          <button type="button" className={classeBoutonAjout}
            onClick={() => setEtapes((liste) => [...liste, nouvelleEtape()])}>
            <IconePlus /> Ajouter une étape
          </button>
        </section>

        <Erreur message={erreur} />
        <button type="submit" disabled={envoi} className={classeBoutonPrincipal}>
          {envoi ? "Enregistrement…" : "Enregistrer la version 1"}
        </button>
      </form>
    </Page>
  )
}
