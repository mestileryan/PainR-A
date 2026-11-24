import { useId, useLayoutEffect, useMemo, useRef, useState, type KeyboardEvent } from "react"
import { sansAccents } from "../lib/format"
import { motifReference, rechercheEnCours } from "../lib/references"
import type { Ingredient } from "../lib/types"
import TexteEtape from "./TexteEtape"

interface Props {
  id: string
  numero: number
  texte: string
  ingredients: Ingredient[]
  onChange: (texte: string) => void
  // Touche pressée quand la liste des ingrédients n'est pas utilisée (ex. Tab pour ajouter une étape).
  onToucheLibre?: (e: KeyboardEvent<HTMLTextAreaElement>) => void
}

// Champ d'une étape : taper « @ » propose les ingrédients de la recette.
export default function ChampEtape({ id, numero, texte, ingredients, onChange, onToucheLibre }: Props) {
  const zone = useRef<HTMLTextAreaElement>(null)
  const idListe = useId()
  const [recherche, setRecherche] = useState<{ debut: number; requete: string } | null>(null)
  const [actif, setActif] = useState(0)
  const curseurApres = useRef<number | null>(null)

  const propositions = useMemo(() => {
    if (!recherche) return []
    const requete = sansAccents(recherche.requete)
    return ingredients.filter((i) => sansAccents(i.nom).includes(requete)).slice(0, 8)
  }, [recherche, ingredients])

  // Après une insertion, le curseur se place juste derrière la référence.
  useLayoutEffect(() => {
    if (curseurApres.current !== null && zone.current) {
      zone.current.setSelectionRange(curseurApres.current, curseurApres.current)
      curseurApres.current = null
    }
  })

  function suivreCurseur(el: HTMLTextAreaElement) {
    const nouvelle = rechercheEnCours(el.value, el.selectionStart)
    setRecherche((ancienne) => {
      if (ancienne?.requete !== nouvelle?.requete) setActif(0)
      return nouvelle
    })
  }

  function choisir(ingredient: Ingredient) {
    if (!recherche) return
    const insertion = `@[${ingredient.nom.trim()}]`
    const fin = recherche.debut + 1 + recherche.requete.length
    curseurApres.current = recherche.debut + insertion.length
    setRecherche(null)
    onChange(texte.slice(0, recherche.debut) + insertion + texte.slice(fin))
    zone.current?.focus()
  }

  function touche(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (recherche && e.key === "Escape") {
      e.preventDefault()
      setRecherche(null)
      return
    }
    if (recherche && propositions.length > 0) {
      if (e.key === "ArrowDown") {
        e.preventDefault()
        setActif((a) => (a + 1) % propositions.length)
        return
      }
      if (e.key === "ArrowUp") {
        e.preventDefault()
        setActif((a) => (a - 1 + propositions.length) % propositions.length)
        return
      }
      if (e.key === "Enter" || e.key === "Tab") {
        e.preventDefault()
        choisir(propositions[Math.min(actif, propositions.length - 1)])
        return
      }
    }
    onToucheLibre?.(e)
  }

  const ouverte = recherche !== null
  const aDesReferences = motifReference().test(texte)

  return (
    <div className="relative flex min-w-0 flex-1 flex-col gap-1.5">
      <textarea
        ref={zone}
        id={id}
        aria-label={`Étape ${numero}`}
        aria-autocomplete="list"
        aria-expanded={ouverte}
        aria-controls={ouverte ? idListe : undefined}
        aria-activedescendant={ouverte && propositions.length ? `${idListe}-${actif}` : undefined}
        rows={2}
        value={texte}
        onChange={(e) => {
          onChange(e.target.value)
          suivreCurseur(e.target)
        }}
        onSelect={(e) => suivreCurseur(e.currentTarget)}
        onKeyDown={touche}
        onBlur={() => setRecherche(null)}
        className="box-border resize-y rounded-xl border border-trait-fort bg-carte px-3.5 py-3 leading-snug"
      />

      {ouverte && (
        <ul id={idListe} role="listbox" aria-label="Ingrédients"
          className="absolute top-full right-0 left-0 z-10 m-0 mt-1 list-none overflow-hidden rounded-xl border border-trait-fort bg-carte p-1 shadow-lg">
          {propositions.length === 0 ? (
            <li className="px-3 py-2.5 text-sm text-sourdine">
              {ingredients.length === 0
                ? "Ajoute d'abord des ingrédients pour pouvoir les citer."
                : `Aucun ingrédient ne correspond à « ${recherche.requete} ».`}
            </li>
          ) : (
            propositions.map((ingredient, i) => (
              <li key={ingredient.nom} id={`${idListe}-${i}`} role="option" aria-selected={i === actif}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => choisir(ingredient)}
                className={`flex min-h-11 cursor-pointer items-center justify-between gap-3 rounded-lg px-3 text-[15px] ${i === actif ? "bg-[#f3e6da] text-seigle" : ""}`}>
                <span className="font-medium">{ingredient.nom}</span>
                <span className="font-mono text-sm text-sourdine">
                  {[ingredient.quantite, ingredient.unite].filter((v) => v !== undefined && v !== "").join(" ")}
                </span>
              </li>
            ))
          )}
        </ul>
      )}

      {aDesReferences && (
        <p className="m-0 text-sm leading-relaxed whitespace-pre-line text-encre-douce">
          <span className="text-sourdine">Aperçu : </span>
          <TexteEtape texte={texte} ingredients={ingredients} />
        </p>
      )}
    </div>
  )
}
