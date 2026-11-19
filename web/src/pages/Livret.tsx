import { useEffect, useMemo, useState } from "react"
import { Link } from "react-router"
import { Chargement, Erreur, Page, classeChamp } from "../components/Commun"
import { IconeEssai, IconePlus, IconeSortie } from "../components/Icones"
import { dateCourte, pluriel, sansAccents } from "../lib/format"
import { messageErreur, pb } from "../lib/pb"
import type { Essai, Recette } from "../lib/types"

export default function Livret() {
  const [recettes, setRecettes] = useState<Recette[] | null>(null)
  const [essaisParRecette, setEssaisParRecette] = useState<Map<string, number>>(new Map())
  const [recherche, setRecherche] = useState("")
  const [erreur, setErreur] = useState("")

  useEffect(() => {
    let annule = false
    Promise.all([
      pb.collection("recettes").getFullList<Recette>({ expand: "version_courante" }),
      pb.collection("essais").getFullList<Essai>({ filter: 'statut = "en_cours"', fields: "id,recette" }),
    ])
      .then(([listeRecettes, essais]) => {
        if (annule) return
        listeRecettes.sort((a, b) => a.nom.localeCompare(b.nom, "fr"))
        setRecettes(listeRecettes)
        const compte = new Map<string, number>()
        for (const e of essais) compte.set(e.recette, (compte.get(e.recette) ?? 0) + 1)
        setEssaisParRecette(compte)
      })
      .catch((err) => !annule && setErreur(messageErreur(err)))
    return () => {
      annule = true
    }
  }, [])

  const visibles = useMemo(() => {
    const filtre = sansAccents(recherche.trim())
    return (recettes ?? []).filter((r) => !filtre || sansAccents(r.nom).includes(filtre))
  }, [recettes, recherche])

  const totalEssais = [...essaisParRecette.values()].reduce((a, b) => a + b, 0)

  return (
    <Page>
      <header className="flex items-end justify-between gap-3">
        <div className="flex flex-col gap-1">
          <span className="text-[13px] font-semibold tracking-[0.08em] text-seigle uppercase">PainR&amp;D</span>
          <h1 className="m-0 font-titre text-[34px] leading-[1.05] font-bold">Mon livret</h1>
        </div>
        <button
          type="button"
          onClick={() => pb.authStore.clear()}
          aria-label="Se déconnecter"
          className="flex h-11 w-11 items-center justify-center rounded-full border-0 bg-transparent text-sourdine hover:text-encre"
        >
          <IconeSortie />
        </button>
      </header>

      <Erreur message={erreur} />

      {recettes === null && !erreur && <Chargement />}

      {recettes !== null && recettes.length > 0 && (
        <div className="flex flex-col gap-1.5">
          <label htmlFor="recherche" className="text-[13px] font-medium text-sourdine">
            Rechercher une recette
          </label>
          <input id="recherche" type="search" value={recherche} onChange={(e) => setRecherche(e.target.value)}
            placeholder="Levain, brioche…" className={classeChamp} />
        </div>
      )}

      {totalEssais > 0 && (
        <div className="flex items-center gap-3 rounded-2xl bg-essai-fond px-4 py-3.5">
          <IconeEssai taille={22} className="shrink-0 text-essai" />
          <span className="text-[15px] font-semibold">{pluriel(totalEssais, "essai à tester", "essais à tester")}</span>
        </div>
      )}

      {recettes !== null && recettes.length === 0 && (
        <p className="m-0 text-base leading-relaxed text-encre-douce">
          Ton livret est vide. Commence par ta première recette.
        </p>
      )}

      <ul className="m-0 flex list-none flex-col gap-2.5 p-0">
        {visibles.map((recette) => {
          const version = recette.expand?.version_courante
          const essais = essaisParRecette.get(recette.id) ?? 0
          return (
            <li key={recette.id}>
              <Link to={`/recettes/${recette.id}`}
                className="flex flex-col gap-2 rounded-2xl border border-trait bg-carte p-4 hover:border-trait-fort">
                <span className="flex items-baseline justify-between gap-3">
                  <span className="font-titre text-[19px] font-semibold">{recette.nom}</span>
                  {version && <span className="font-mono text-[13px] text-sourdine">v{version.numero}</span>}
                </span>
                <span className="flex flex-wrap items-center gap-2">
                  {essais > 0 && (
                    <span className="rounded-full bg-essai-fond px-2.5 py-0.5 text-[13px] font-semibold text-essai">
                      {pluriel(essais, "essai en cours", "essais en cours")}
                    </span>
                  )}
                  {version && (
                    <span className="text-[13px] text-sourdine">
                      {version.numero === 1 ? "Créée" : `Version ${version.numero}`} le {dateCourte(version.created)}
                    </span>
                  )}
                </span>
              </Link>
            </li>
          )
        })}
      </ul>

      <div className="pointer-events-none fixed inset-x-0 bottom-0 flex justify-end px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))]">
        <Link to="/recettes/nouvelle"
          className="pointer-events-auto flex h-[52px] items-center gap-2 rounded-full bg-encre px-5 text-base font-semibold text-white shadow-lg">
          <IconePlus />
          Nouvelle recette
        </Link>
      </div>
    </Page>
  )
}
