import { useCallback, useEffect, useState } from "react"
import { Link, useParams } from "react-router"
import {
  Chargement, Erreur, LienRetour, Page, TitreSection, classeBoutonPointille, classeBoutonSecondaire,
} from "../components/Commun"
import { IconeCrayon, IconeHorloge, IconePhoto, IconeSuite } from "../components/Icones"
import ListeFournees from "../components/ListeFournees"
import NouvelleFournee from "../components/NouvelleFournee"
import { resumerDifferences } from "../lib/differences"
import { dateCourte, pluriel, quantiteTexte } from "../lib/format"
import { messageErreur, pb } from "../lib/pb"
import type { Essai, Fournee, Recette as RecetteModele } from "../lib/types"

interface Donnees {
  recette: RecetteModele
  essais: Essai[]
  fournees: Fournee[]
  jeton: string
}

export default function Recette() {
  const { id = "" } = useParams()
  const [donnees, setDonnees] = useState<Donnees | null>(null)
  const [erreur, setErreur] = useState("")
  const [ajoutFournee, setAjoutFournee] = useState(false)

  const charger = useCallback(async () => {
    try {
      const filtreRecette = pb.filter("recette = {:id}", { id })
      const [recette, essais, fournees, jeton] = await Promise.all([
        pb.collection("recettes").getOne<RecetteModele>(id, { expand: "version_courante" }),
        pb.collection("essais").getFullList<Essai>({
          filter: `${filtreRecette} && statut = "en_cours"`,
          sort: "-created",
        }),
        pb.collection("fournees").getFullList<Fournee>({ filter: filtreRecette, sort: "-date,-created", expand: "version,essai" }),
        pb.files.getToken(),
      ])
      setDonnees({ recette, essais, fournees, jeton })
    } catch (err) {
      setErreur(messageErreur(err))
    }
  }, [id])

  useEffect(() => {
    void charger()
  }, [charger])

  if (!donnees) {
    return (
      <Page>
        <LienRetour vers="/">Livret</LienRetour>
        {erreur ? <Erreur message={erreur} /> : <Chargement />}
      </Page>
    )
  }

  const { recette, essais, fournees, jeton } = donnees
  const version = recette.expand?.version_courante
  const ingredients = version?.ingredients ?? []
  const etapes = version?.etapes ?? []

  return (
    <Page>
      <div className="flex items-center justify-between">
        <LienRetour vers="/">Livret</LienRetour>
        <Link to={`/recettes/${recette.id}/historique`}
          className="flex h-11 items-center gap-1.5 text-[15px] font-medium text-seigle">
          <IconeHorloge taille={18} />
          Historique
        </Link>
      </div>

      <div className="flex flex-col gap-2.5">
        <h1 className="m-0 font-titre text-[32px] leading-[1.08] font-bold">{recette.nom}</h1>
        {version && (
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-encre px-2.5 py-1 font-mono text-[13px] font-medium text-white">
              Version {version.numero}
            </span>
            <span className="text-sm text-sourdine">en vigueur depuis le {dateCourte(version.created)}</span>
          </div>
        )}
      </div>

      {essais.map((essai) => {
        const changements = version ? resumerDifferences(version, essai) : []
        return (
          <Link key={essai.id} to={`/essais/${essai.id}`}
            className="flex flex-col gap-2.5 rounded-2xl border border-essai-trait bg-essai-fond p-4">
            <span className="flex items-center justify-between gap-3">
              <span className="text-[13px] font-semibold tracking-[0.06em] text-essai uppercase">
                Essai n° {essai.numero} en cours
              </span>
              <span className="flex items-center gap-0.5 text-sm font-semibold">Tester <IconeSuite taille={16} /></span>
            </span>
            <span className="text-base font-semibold">{essai.titre}</span>
            {changements.length > 0 && (
              <span className="font-mono text-[13px] leading-relaxed text-sourdine">{changements.join(" · ")}</span>
            )}
          </Link>
        )
      })}

      <section className="flex flex-col gap-2.5">
        <TitreSection aside={fournees.length > 0 ? `faite ${pluriel(fournees.length, "fois", "fois")}` : undefined}>
          Mes fournées
        </TitreSection>
        <ListeFournees fournees={fournees} jeton={jeton} />
        {version && (ajoutFournee ? (
          <NouvelleFournee
            recetteId={recette.id}
            rattachement={{ version: version.id }}
            onAnnuler={() => setAjoutFournee(false)}
            onAjoutee={() => {
              setAjoutFournee(false)
              void charger()
            }}
          />
        ) : (
          <button type="button" onClick={() => setAjoutFournee(true)} className={classeBoutonPointille}>
            <IconePhoto />
            J'ai refait cette recette
          </button>
        ))}
      </section>

      <section className="flex flex-col gap-2.5">
        <TitreSection>Ingrédients</TitreSection>
        {ingredients.length === 0 ? (
          <p className="m-0 text-[15px] text-sourdine">Aucun ingrédient.</p>
        ) : (
          <ul className="m-0 flex list-none flex-col rounded-2xl border border-trait bg-carte p-0">
            {ingredients.map((ingredient, i) => (
              <li key={i} className="flex justify-between gap-3 border-b border-[#ecebe7] px-4 py-3.5 text-base last:border-b-0">
                <span>{ingredient.nom}</span>
                <span className="font-mono text-[15px]">{quantiteTexte(ingredient)}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="flex flex-col gap-2.5">
        <TitreSection>Étapes</TitreSection>
        {etapes.length === 0 ? (
          <p className="m-0 text-[15px] text-sourdine">Aucune étape.</p>
        ) : (
          <ol className="m-0 flex list-none flex-col gap-2 p-0">
            {etapes.map((etape, i) => (
              <li key={i} className="flex gap-3.5 rounded-2xl border border-trait bg-carte px-4 py-3.5">
                <span className="pt-0.5 font-mono text-sm text-seigle">{String(i + 1).padStart(2, "0")}</span>
                <span className="text-base leading-normal whitespace-pre-line">{etape.texte}</span>
              </li>
            ))}
          </ol>
        )}
      </section>

      {version && (
        <div className="flex flex-col gap-2">
          <Link to={`/recettes/${recette.id}/essais/nouveau`} className={classeBoutonSecondaire}>
            <IconeCrayon />
            Proposer une modification
          </Link>
          <p className="m-0 text-center text-sm leading-snug text-sourdine">
            La version {version.numero} reste en vigueur tant que l'essai n'est pas validé.
          </p>
        </div>
      )}
    </Page>
  )
}
