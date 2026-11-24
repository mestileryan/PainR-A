import { useCallback, useEffect, useState } from "react"
import { Link, useParams } from "react-router"
import {
  Chargement, Erreur, LienRetour, Page, TitreSection,
  classeBoutonPointille, classeBoutonPrincipal, classeBoutonSecondaire,
} from "../components/Commun"
import { IconeCroix, IconePhoto } from "../components/Icones"
import ListeDifferences from "../components/ListeDifferences"
import ListeFournees from "../components/ListeFournees"
import NouvelleFournee from "../components/NouvelleFournee"
import { differences } from "../lib/differences"
import { dateLongue, pluriel } from "../lib/format"
import { messageErreur, pb } from "../lib/pb"
import type { Essai as EssaiModele, Fournee, Recette, Version } from "../lib/types"

interface Donnees {
  essai: EssaiModele
  recette: Recette
  base: Version
  courante: Version
  fournees: Fournee[]
  jeton: string
}

type Panneau = "" | "valider" | "refuser"

export default function Essai() {
  const { id = "" } = useParams()
  const [donnees, setDonnees] = useState<Donnees | null>(null)
  const [erreur, setErreur] = useState("")
  const [ajoutFournee, setAjoutFournee] = useState(false)
  const [panneau, setPanneau] = useState<Panneau>("")
  const [raison, setRaison] = useState("")
  const [envoi, setEnvoi] = useState(false)

  const charger = useCallback(async () => {
    try {
      const essai = await pb.collection("essais").getOne<EssaiModele>(id, { expand: "version_base,version_creee" })
      const [recette, fournees, jeton] = await Promise.all([
        pb.collection("recettes").getOne<Recette>(essai.recette, { expand: "version_courante" }),
        pb.collection("fournees").getFullList<Fournee>({
          filter: pb.filter("essai = {:id}", { id }),
          sort: "-date,-created",
          expand: "essai",
        }),
        pb.files.getToken(),
      ])
      const base = essai.expand?.version_base
      const courante = recette.expand?.version_courante
      if (!base || !courante) throw new Error("Données de l'essai incomplètes.")
      setDonnees({ essai, recette, base, courante, fournees, jeton })
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

  const { essai, recette, base, courante, fournees, jeton } = donnees
  const enCours = essai.statut === "en_cours"
  const depasse = enCours && base.id !== courante.id
  const nombrePhotos = fournees.reduce((n, f) => n + f.photos.length, 0)

  async function decider(action: "valider" | "refuser") {
    setErreur("")
    setEnvoi(true)
    try {
      await pb.send(`/api/painrd/essais/${essai.id}/${action}`, {
        method: "POST",
        body: action === "refuser" ? { raison: raison.trim() } : {},
      })
      setPanneau("")
      await charger()
    } catch (err) {
      setErreur(messageErreur(err))
    } finally {
      setEnvoi(false)
    }
  }

  return (
    <Page>
      <LienRetour vers={`/recettes/${recette.id}`}>{recette.nom} · v{courante.numero}</LienRetour>

      <div className="flex flex-col gap-2.5">
        <span className="text-[13px] font-semibold tracking-[0.06em] text-essai uppercase">
          Essai n° {essai.numero} · sur la version {base.numero}
        </span>
        <h1 className="m-0 font-titre text-[30px] leading-[1.1] font-bold">{essai.titre}</h1>
        {essai.objectif && (
          <p className="m-0 text-base leading-relaxed text-encre-douce">
            <strong className="font-semibold">Ce que j'espère :</strong> {essai.objectif}
          </p>
        )}
      </div>

      {essai.statut === "valide" && (
        <div className="flex flex-col gap-2 rounded-2xl border border-[#b9d0ec] bg-version-fond p-4">
          <span className="text-[17px] font-semibold text-version">
            Validé : c'est devenu la version {essai.expand?.version_creee?.numero}
          </span>
          <span className="text-[15px] text-encre-douce">Décidé le {dateLongue(essai.date_decision)}.</span>
          <Link to={`/recettes/${recette.id}`} className="flex h-11 items-center self-start text-[15px] font-semibold text-version">
            Voir la recette
          </Link>
        </div>
      )}

      {essai.statut === "refuse" && (
        <div className="flex flex-col gap-2 rounded-2xl border-2 border-encre bg-carte p-4">
          <span className="text-[17px] font-semibold">Essai refusé le {dateLongue(essai.date_decision)}</span>
          <p className="m-0 rounded-xl bg-[#ecebe7] px-3 py-2.5 text-[15px] leading-snug text-encre-douce">
            <strong className="font-semibold">Raison :</strong> {essai.raison_refus}
          </p>
        </div>
      )}

      <section className="flex flex-col gap-2.5">
        <TitreSection aside={enCours ? <Link to={`/essais/${essai.id}/modifier`} className="font-semibold text-seigle">Modifier</Link> : undefined}>
          Ce qui change
        </TitreSection>
        <ListeDifferences differences={differences(base, essai)} ingredientsAvant={base.ingredients ?? []}
          ingredientsApres={essai.ingredients ?? []} />
      </section>

      <section className="flex flex-col gap-2.5">
        <TitreSection aside={fournees.length ? `${pluriel(fournees.length, "fournée", "fournées")} · ${pluriel(nombrePhotos, "photo", "photos")}` : undefined}>
          Fournées de test
        </TitreSection>
        <ListeFournees fournees={fournees} jeton={jeton} />
        {enCours && (ajoutFournee ? (
          <NouvelleFournee
            recetteId={recette.id}
            rattachement={{ essai: essai.id }}
            onAnnuler={() => setAjoutFournee(false)}
            onAjoutee={() => {
              setAjoutFournee(false)
              void charger()
            }}
          />
        ) : (
          <button type="button" onClick={() => setAjoutFournee(true)} className={classeBoutonPointille}>
            <IconePhoto />
            Ajouter une fournée
          </button>
        ))}
      </section>

      {depasse && (
        <p role="note" className="m-0 rounded-2xl bg-essai-fond px-4 py-3.5 text-[15px] leading-relaxed">
          La recette est passée en version {courante.numero} depuis le début de cet essai. Il ne peut plus être
          validé tel quel : refuse-le, ou propose un nouvel essai sur la version {courante.numero}.
        </p>
      )}

      <Erreur message={erreur} />

      {enCours && panneau === "" && (
        <div className="flex flex-col gap-2.5">
          <div className={`grid gap-2.5 ${depasse ? "grid-cols-1" : "grid-cols-2"}`}>
            <button type="button" onClick={() => setPanneau("refuser")} className={classeBoutonSecondaire}>
              <IconeCroix /> Refuser
            </button>
            {!depasse && (
              <button type="button" onClick={() => setPanneau("valider")}
                className="flex h-[52px] items-center justify-center gap-2 rounded-2xl border-0 bg-version px-5 text-base font-semibold text-white">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2}
                  strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 12.5 10 17 19 7" /></svg>
                Valider
              </button>
            )}
          </div>
          {!depasse && (
            <p className="m-0 text-center text-sm leading-snug text-sourdine">
              Fais autant de fournées que nécessaire avant de trancher. Validé, l'essai devient la version {courante.numero + 1} ;
              refusé, la version {courante.numero} reste en vigueur et l'essai est gardé dans l'historique.
            </p>
          )}
        </div>
      )}

      {enCours && panneau === "valider" && (
        <div className="flex flex-col gap-3 rounded-2xl border border-[#b9d0ec] bg-version-fond p-4">
          <span className="text-[17px] font-semibold text-version">Valider cet essai ?</span>
          <p className="m-0 text-[15px] leading-relaxed">
            Il deviendra la <strong className="font-mono font-medium">version {courante.numero + 1}</strong> de la recette.
            La version {courante.numero} restera consultable dans l'historique.
          </p>
          <div className="grid grid-cols-2 gap-2.5">
            <button type="button" disabled={envoi} onClick={() => setPanneau("")} className={classeBoutonSecondaire}>Annuler</button>
            <button type="button" disabled={envoi} onClick={() => decider("valider")}
              className="flex h-[52px] items-center justify-center rounded-2xl border-0 bg-version px-5 text-base font-semibold text-white disabled:opacity-60">
              {envoi ? "Validation…" : `Créer la v${courante.numero + 1}`}
            </button>
          </div>
        </div>
      )}

      {enCours && panneau === "refuser" && (
        <form className="flex flex-col gap-3 rounded-2xl border-2 border-encre bg-carte p-4"
          onSubmit={(ev) => { ev.preventDefault(); void decider("refuser") }}>
          <span className="text-[17px] font-semibold">Pourquoi tu refuses ?</span>
          <label htmlFor="raison" className="text-sm font-medium text-sourdine">Raison (gardée dans l'historique)</label>
          <textarea id="raison" rows={3} required value={raison} onChange={(e) => setRaison(e.target.value)}
            placeholder="Ex. : pâte trop collante, impossible à façonner"
            className="box-border resize-y rounded-xl border border-trait-fort bg-fond px-3.5 py-3 leading-snug" />
          <div className="grid grid-cols-2 gap-2.5">
            <button type="button" disabled={envoi} onClick={() => setPanneau("")} className={classeBoutonSecondaire}>Annuler</button>
            <button type="submit" disabled={envoi || !raison.trim()} className={classeBoutonPrincipal}>
              {envoi ? "Envoi…" : "Noter le refus"}
            </button>
          </div>
        </form>
      )}
    </Page>
  )
}
