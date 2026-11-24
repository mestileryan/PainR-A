import { useEffect, useMemo, useState } from "react"
import { Link, useParams } from "react-router"
import { Chargement, Erreur, LienRetour, Page } from "../components/Commun"
import { IconeSuite } from "../components/Icones"
import { resumerDifferences } from "../lib/differences"
import { dateCourte, pluriel, versDate } from "../lib/format"
import { messageErreur, pb } from "../lib/pb"
import { urlPhoto } from "../lib/photos"
import type { Essai, Fournee, Recette, Version } from "../lib/types"

type Filtre = "tout" | "version" | "refuse"

interface Entree {
  cle: string
  type: "version" | "refuse"
  badge: string
  date: string
  titre: string
  detail: string
  raison?: string
  lien?: string
  fournees: Fournee[]
}

const filtres: { id: Filtre; libelle: string }[] = [
  { id: "tout", libelle: "Tout" },
  { id: "version", libelle: "Versions" },
  { id: "refuse", libelle: "Essais refusés" },
]

// Les versions de la recette, et les essais refusés en chemin.
function construireEntrees(recette: Recette, versions: Version[], essais: Essai[], fournees: Fournee[]): Entree[] {
  const parNumero = new Map(versions.map((v) => [v.numero, v]))
  const parId = new Map(versions.map((v) => [v.id, v]))
  const entrees: Entree[] = []

  for (const v of versions) {
    const origine = essais.find((e) => e.statut === "valide" && e.version_creee === v.id)
    const precedente = parNumero.get(v.numero - 1)
    entrees.push({
      cle: v.id,
      type: "version",
      badge: `Version ${v.numero}${v.id === recette.version_courante ? " · en vigueur" : ""}`,
      date: v.created,
      titre: origine?.titre ?? (v.numero === 1 ? "Recette de départ" : `Version ${v.numero}`),
      detail: precedente ? resumerDifferences(precedente, v).join(" · ") : "Création de la recette",
      lien: origine ? `/essais/${origine.id}` : undefined,
      fournees: fournees.filter((f) => f.version === v.id || (origine && f.essai === origine.id)),
    })
  }
  for (const e of essais.filter((x) => x.statut === "refuse")) {
    const base = parId.get(e.version_base)
    entrees.push({
      cle: e.id,
      type: "refuse",
      badge: "Essai refusé",
      date: e.date_decision || e.created,
      titre: e.titre,
      detail: base ? resumerDifferences(base, e).join(" · ") : "",
      raison: e.raison_refus,
      lien: `/essais/${e.id}`,
      fournees: fournees.filter((f) => f.essai === e.id),
    })
  }
  return entrees.sort((a, b) => versDate(b.date).getTime() - versDate(a.date).getTime())
}

export default function Historique() {
  const { id = "" } = useParams()
  const [donnees, setDonnees] = useState<{ recette: Recette; entrees: Entree[]; jeton: string } | null>(null)
  const [erreur, setErreur] = useState("")
  const [filtre, setFiltre] = useState<Filtre>("tout")

  useEffect(() => {
    let annule = false
    const filtreRecette = pb.filter("recette = {:id}", { id })
    Promise.all([
      pb.collection("recettes").getOne<Recette>(id),
      pb.collection("versions").getFullList<Version>({ filter: filtreRecette, sort: "numero" }),
      pb.collection("essais").getFullList<Essai>({ filter: `${filtreRecette} && statut != "en_cours"` }),
      pb.collection("fournees").getFullList<Fournee>({ filter: `${filtreRecette} && en_cours = false`, sort: "-date" }),
      pb.files.getToken(),
    ])
      .then(([recette, versions, essais, fournees, jeton]) => {
        if (!annule) setDonnees({ recette, entrees: construireEntrees(recette, versions, essais, fournees), jeton })
      })
      .catch((err) => !annule && setErreur(messageErreur(err)))
    return () => {
      annule = true
    }
  }, [id])

  const visibles = useMemo(
    () => (donnees?.entrees ?? []).filter((e) => filtre === "tout" || e.type === filtre),
    [donnees, filtre],
  )

  if (!donnees) {
    return (
      <Page>
        <LienRetour vers={`/recettes/${id}`}>Recette</LienRetour>
        {erreur ? <Erreur message={erreur} /> : <Chargement />}
      </Page>
    )
  }

  const { recette, jeton } = donnees

  return (
    <Page>
      <LienRetour vers={`/recettes/${recette.id}`}>{recette.nom}</LienRetour>
      <div className="flex flex-col gap-1.5">
        <h1 className="m-0 font-titre text-[32px] leading-[1.08] font-bold">Historique</h1>
        <p className="m-0 text-[15px] leading-snug text-sourdine">Les versions de la recette, et les essais refusés en chemin.</p>
      </div>

      <div role="group" aria-label="Filtrer l'historique" className="flex flex-wrap gap-2">
        {filtres.map((f) => (
          <button key={f.id} type="button" aria-pressed={filtre === f.id} onClick={() => setFiltre(f.id)}
            className={`h-11 rounded-full px-4 text-[15px] font-semibold ${filtre === f.id
              ? "border border-encre bg-encre text-white"
              : "border border-trait-fort bg-carte text-encre"}`}>
            {f.libelle}
          </button>
        ))}
      </div>

      {visibles.length === 0 && <p className="m-0 text-[15px] text-sourdine">Rien à afficher pour ce filtre.</p>}

      <ol className="m-0 flex list-none flex-col gap-2.5 p-0">
        {visibles.map((e) => {
          const vignettes = e.fournees.filter((f) => f.photos.length > 0).slice(0, 4)
          const contenu = (
            <>
              <span className="flex items-center justify-between gap-2.5">
                <span className={`rounded-full px-2.5 py-1 text-xs font-semibold tracking-[0.04em] uppercase ${e.type === "version"
                  ? "bg-version-fond text-version" : "bg-[#ecebe7] text-encre-douce"}`}>
                  {e.badge}
                </span>
                <span className="text-[13px] text-sourdine">{dateCourte(e.date)}</span>
              </span>
              <span className="flex items-center justify-between gap-2">
                <span className="text-base leading-snug font-semibold">{e.titre}</span>
                {e.lien && <IconeSuite taille={18} className="shrink-0 text-sourdine" />}
              </span>
              {e.detail && <span className="font-mono text-[13px] leading-relaxed text-sourdine">{e.detail}</span>}
              {e.raison && (
                <span className="rounded-xl bg-[#ecebe7] px-3 py-2.5 text-sm leading-snug text-encre-douce">
                  <strong className="font-semibold">Refusé car :</strong> {e.raison}
                </span>
              )}
              {e.fournees.length > 0 && (
                <span className="flex items-center gap-1.5">
                  {vignettes.map((f) => (
                    <img key={f.id} src={urlPhoto(f, f.photos[0], jeton, "300x300")} alt=""
                      className="h-14 w-14 rounded-lg bg-photo object-cover" loading="lazy" />
                  ))}
                  <span className="ml-1 text-[13px] text-sourdine">{pluriel(e.fournees.length, "fournée", "fournées")}</span>
                </span>
              )}
            </>
          )
          const classe = "flex flex-col gap-2 rounded-2xl border border-trait bg-carte p-4"
          return (
            <li key={e.cle}>
              {e.lien ? <Link to={e.lien} className={`${classe} hover:border-trait-fort`}>{contenu}</Link> : <div className={classe}>{contenu}</div>}
            </li>
          )
        })}
      </ol>
    </Page>
  )
}
