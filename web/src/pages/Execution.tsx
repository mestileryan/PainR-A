import { useCallback, useEffect, useRef, useState, type FormEvent } from "react"
import { Link, useNavigate, useParams } from "react-router"
import {
  Chargement, Erreur, LienRetour, Page, TitreSection, classeBoutonPrincipal, classeBoutonSecondaire,
} from "../components/Commun"
import ChoixCoefficient from "../components/ChoixCoefficient"
import { IconeChrono, IconeCroix, IconeLecture, IconePause, IconePhoto } from "../components/Icones"
import TexteEtape from "../components/TexteEtape"
import { dureesDansTexte, formatChrono, formatDuree } from "../lib/durees"
import { dateCourte, dateLongue, nombre, pluriel, quantiteTexte } from "../lib/format"
import { coefficientFournee, contenuFournee, progression } from "../lib/fournees"
import {
  ajouterMinute, demanderNotifications, deverrouillerSon, etatMinuteur, mettreEnPause, nouveauMinuteur, reprendre,
  signalerMinuteurs,
} from "../lib/minuteurs"
import { messageErreur, pb } from "../lib/pb"
import { reduirePhoto } from "../lib/photos"
import { decouperEtape } from "../lib/references"
import type { Fournee, Minuteur } from "../lib/types"

// Durées d'une étape : blocs « durée », puis durées écrites en toutes lettres (« Cuire 45 min »).
function dureesEtape(texte: string): { secondes: number }[] {
  const durees: { secondes: number }[] = []
  for (const m of decouperEtape(texte, [])) {
    if (m.type === "duree") durees.push({ secondes: m.secondes })
    else if (m.type === "texte") durees.push(...dureesDansTexte(m.texte))
  }
  return durees.filter((d, i) => durees.findIndex((x) => x.secondes === d.secondes) === i)
}

// Garde l'écran allumé pendant la cuisson, quand le navigateur le permet.
function useEcranAllume(actif: boolean) {
  useEffect(() => {
    if (!actif || !("wakeLock" in navigator)) return
    let verrou: WakeLockSentinel | null = null
    let fini = false
    const demander = () => {
      if (document.visibilityState !== "visible") return
      navigator.wakeLock.request("screen").then((v) => {
        if (fini) void v.release()
        else verrou = v
      }).catch(() => {})
    }
    demander()
    document.addEventListener("visibilitychange", demander)
    return () => {
      fini = true
      document.removeEventListener("visibilitychange", demander)
      void verrou?.release()
    }
  }, [actif])
}

function Coche({ faite }: { faite: boolean }) {
  return (
    <span aria-hidden="true"
      className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 ${faite ? "border-version bg-version text-white" : "border-trait-fort bg-carte"}`}>
      {faite && (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.6}
          strokeLinecap="round" strokeLinejoin="round"><path d="M5 12.5 10 17 19 7" /></svg>
      )}
    </span>
  )
}

type Panneau = "" | "terminer" | "abandonner"

// Mode cuisine : suivre une fournée en cours étape par étape, et la reprendre plus tard.
export default function Execution() {
  const { id = "" } = useParams()
  const naviguer = useNavigate()
  const [fournee, setFournee] = useState<Fournee | null>(null)
  const [erreur, setErreur] = useState("")
  const [panneau, setPanneau] = useState<Panneau>("")
  const [notes, setNotes] = useState("")
  const [photos, setPhotos] = useState<File[]>([])
  const [envoi, setEnvoi] = useState(false)
  const [voirPrecedentes, setVoirPrecedentes] = useState(false)
  const defilement = useRef(false)

  const charger = useCallback(async () => {
    try {
      const f = await pb.collection("fournees").getOne<Fournee>(id, { expand: "recette,version,essai" })
      setFournee(f)
      setNotes(f.notes)
    } catch (err) {
      setErreur(messageErreur(err))
    }
  }, [id])

  useEffect(() => {
    void charger()
  }, [charger])

  useEcranAllume(fournee?.en_cours === true)

  // Les décomptes avancent chaque seconde tant qu'un minuteur existe.
  const [maintenant, setMaintenant] = useState(Date.now())
  const aDesMinuteurs = (fournee?.minuteurs ?? []).length > 0
  useEffect(() => {
    if (!aDesMinuteurs) return
    const tic = window.setInterval(() => setMaintenant(Date.now()), 1000)
    return () => window.clearInterval(tic)
  }, [aDesMinuteurs])

  // À l'ouverture, on amène l'étape en cours à l'écran.
  useEffect(() => {
    if (!fournee || defilement.current) return
    defilement.current = true
    const { courante, faites } = progression(fournee)
    if (faites > 0) document.getElementById(`etape-${courante}`)?.scrollIntoView({ block: "center" })
  }, [fournee])

  if (!fournee) {
    return (
      <Page>
        <LienRetour vers="/">Livret</LienRetour>
        {erreur ? <Erreur message={erreur} /> : <Chargement />}
      </Page>
    )
  }

  const recette = fournee.expand?.recette
  const essai = fournee.expand?.essai
  const { ingredients, etapes } = contenuFournee(fournee)
  const coefficient = coefficientFournee(fournee)
  const faites = new Set(fournee.etapes_faites ?? [])
  const { courante, faites: nbFaites, total } = progression(fournee)
  const retour = essai ? `/essais/${essai.id}` : `/recettes/${fournee.recette}`
  const libelleSource = essai ? `Essai n° ${essai.numero}` : `Version ${fournee.expand?.version?.numero ?? ""}`

  // --- Minuteurs ----------------------------------------------------------
  async function enregistrerMinuteurs(liste: Minuteur[]) {
    if (!fournee) return
    const avant = fournee
    setFournee({ ...fournee, minuteurs: liste })
    try {
      await pb.collection("fournees").update(fournee.id, { minuteurs: liste })
      signalerMinuteurs()
    } catch (err) {
      setFournee(avant)
      setErreur(messageErreur(err))
    }
  }
  const minuteurs = fournee.minuteurs ?? []
  const lancer = (etape: number, secondes: number) => {
    deverrouillerSon()
    void demanderNotifications()
    void enregistrerMinuteurs([...minuteurs, nouveauMinuteur(etape, `Étape ${etape + 1}`, secondes)])
  }
  const changer = (id: string, f: (m: Minuteur) => Minuteur) =>
    enregistrerMinuteurs(minuteurs.map((m) => (m.id === id ? f(m) : m)))
  const arreter = (id: string) => enregistrerMinuteurs(minuteurs.filter((m) => m.id !== id))

  // Le coefficient se change en cours de route ; il est gardé sur la fournée.
  async function changerCoefficient(valeur: number) {
    if (!fournee || valeur === coefficientFournee(fournee)) return
    const avant = fournee
    setFournee({ ...fournee, coefficient: valeur })
    try {
      await pb.collection("fournees").update(fournee.id, { coefficient: valeur })
      setErreur("")
    } catch (err) {
      setFournee(avant)
      setErreur(messageErreur(err))
    }
  }

  async function basculer(index: number) {
    if (!fournee) return
    const suivantes = new Set(faites)
    if (suivantes.has(index)) suivantes.delete(index)
    else suivantes.add(index)
    const liste = [...suivantes].sort((a, b) => a - b)
    const avant = fournee
    setFournee({ ...fournee, etapes_faites: liste })
    try {
      await pb.collection("fournees").update(fournee.id, { etapes_faites: liste })
      setErreur("")
    } catch (err) {
      setFournee(avant)
      setErreur(messageErreur(err))
    }
  }

  async function terminer(ev: FormEvent) {
    ev.preventDefault()
    if (!fournee) return
    setEnvoi(true)
    setErreur("")
    try {
      const donnees = new FormData()
      donnees.append("notes", notes.trim())
      donnees.append("en_cours", "false")
      for (const p of await Promise.all(photos.map((p) => reduirePhoto(p)))) donnees.append("photos+", p)
      await pb.collection("fournees").update(fournee.id, donnees)
      naviguer(retour, { replace: true })
    } catch (err) {
      setErreur(messageErreur(err))
      setEnvoi(false)
    }
  }

  async function abandonner() {
    if (!fournee) return
    setEnvoi(true)
    try {
      await pb.collection("fournees").delete(fournee.id)
      naviguer(retour, { replace: true })
    } catch (err) {
      setErreur(messageErreur(err))
      setEnvoi(false)
    }
  }

  if (!fournee.en_cours) {
    return (
      <Page>
        <LienRetour vers={retour}>{recette?.nom ?? "Recette"}</LienRetour>
        <h1 className="m-0 font-titre text-[30px] leading-tight font-bold">{recette?.nom}</h1>
        <p className="m-0 text-base text-encre-douce">Cette fournée est terminée (commencée le {dateLongue(fournee.date)}).</p>
        <Link to={retour} className={classeBoutonSecondaire}>Retour à la recette</Link>
      </Page>
    )
  }

  return (
    <Page>
      <LienRetour vers={retour}>{essai ? `Essai n° ${essai.numero}` : (recette?.nom ?? "Recette")}</LienRetour>

      <div className="flex flex-col gap-2">
        <span className="text-[13px] font-semibold tracking-[0.06em] text-version uppercase">
          En cours · {libelleSource} · commencée le {dateCourte(fournee.date)}
        </span>
        <h1 className="m-0 font-titre text-[30px] leading-[1.1] font-bold">{recette?.nom}</h1>
      </div>

      <div className="flex flex-col gap-1.5">
        <span className="text-sm font-medium text-sourdine">
          Quantités{coefficient !== 1 && <span className="font-mono text-seigle"> ×{nombre(coefficient)}</span>}
        </span>
        <ChoixCoefficient valeur={coefficient} onChange={changerCoefficient} />
      </div>

      <div className="flex flex-col gap-2" aria-live="polite">
        <span className="text-[15px] font-semibold">
          {total === 0 ? "Pas d'étapes" : nbFaites >= total ? "Toutes les étapes sont faites" : `Étape ${courante + 1} sur ${total}`}
        </span>
        <div className="h-2 overflow-hidden rounded-full bg-trait" role="progressbar" aria-label="Progression"
          aria-valuemin={0} aria-valuemax={total} aria-valuenow={nbFaites}>
          <div className="h-full rounded-full bg-version" style={{ width: total ? `${(nbFaites / total) * 100}%` : "0%" }} />
        </div>
      </div>

      <details open={nbFaites === 0} className="rounded-2xl border border-trait bg-carte">
        <summary className="flex min-h-12 cursor-pointer items-center justify-between px-4 font-titre text-lg font-semibold">
          Ingrédients
          <span className="font-sans text-sm font-normal text-sourdine">{pluriel(ingredients.length, "ingrédient", "ingrédients")}</span>
        </summary>
        <ul className="m-0 flex list-none flex-col border-t border-[#ecebe7] p-0">
          {ingredients.map((ingredient, i) => (
            <li key={i} className="flex justify-between gap-3 border-b border-[#ecebe7] px-4 py-3 text-base last:border-b-0">
              <span>{ingredient.nom}</span>
              <span className="font-mono text-[15px]">{quantiteTexte(ingredient, coefficient)}</span>
            </li>
          ))}
        </ul>
      </details>

      <section className="flex flex-col gap-2.5">
        <TitreSection aside="touche une étape pour la cocher">Étapes</TitreSection>
        {courante > 0 && (
          <button type="button" aria-expanded={voirPrecedentes} onClick={() => setVoirPrecedentes((v) => !v)}
            className="flex h-11 items-center justify-center rounded-xl border border-dashed border-pointille bg-transparent text-[15px] font-semibold text-encre-douce">
            {voirPrecedentes
              ? "Masquer les étapes précédentes"
              : `Afficher les étapes précédentes (${courante})`}
          </button>
        )}
        <ol start={voirPrecedentes ? 1 : courante + 1} className="m-0 flex list-none flex-col gap-2 p-0">
          {etapes.map((etape, i) => {
            // Les étapes déjà faites avant l'étape en cours sont repliées.
            if (!voirPrecedentes && i < courante) return null
            const faite = faites.has(i)
            const enCours = i === courante && !faite
            const durees = dureesEtape(etape.texte)
            return (
              <li key={i} id={`etape-${i}`}
                className={`flex flex-col rounded-2xl ${enCours
                  ? "border-2 border-encre bg-carte"
                  : faite ? "border border-trait bg-fond text-sourdine" : "border border-trait bg-carte"}`}>
                <button type="button" aria-pressed={faite} onClick={() => basculer(i)}
                  className="flex w-full items-start gap-3.5 rounded-2xl border-0 bg-transparent px-4 py-4 text-left text-inherit">
                  <Coche faite={faite} />
                  <span className="flex min-w-0 flex-col gap-1">
                    <span className="font-mono text-sm text-seigle">
                      {String(i + 1).padStart(2, "0")}{enCours && <span className="ml-2 font-sans font-semibold text-encre">En cours</span>}
                    </span>
                    <span className={`text-[17px] leading-normal whitespace-pre-line ${faite ? "line-through decoration-1" : ""}`}>
                      <TexteEtape texte={etape.texte} ingredients={ingredients} coefficient={coefficient} />
                    </span>
                  </span>
                </button>
                {durees.length > 0 && (
                  <div className="-mt-1 flex flex-wrap gap-2 px-4 pb-4 pl-[62px]">
                    {durees.map((d, j) => {
                      const actuel = (fournee.minuteurs ?? []).find((m) => m.etape === i && m.duree === d.secondes)
                      if (actuel) {
                        const { etat, reste } = etatMinuteur(actuel, maintenant)
                        return (
                          <span key={j} className="flex h-11 items-center gap-1.5 rounded-xl bg-version-fond px-3 font-mono text-[15px] font-medium text-version">
                            <IconeChrono taille={18} />
                            {etat === "fini" ? "Terminé" : formatChrono(reste)}{etat === "pause" && " (pause)"}
                          </span>
                        )
                      }
                      return (
                        <button key={j} type="button" onClick={() => lancer(i, d.secondes)}
                          className="flex h-11 items-center gap-1.5 rounded-xl border border-version bg-carte px-3 text-[15px] font-semibold text-version">
                          <IconeLecture taille={16} />
                          {formatDuree(d.secondes)}
                        </button>
                      )
                    })}
                  </div>
                )}
              </li>
            )
          })}
        </ol>
      </section>

      <Erreur message={erreur} />

      {panneau === "" && (
        <div className="flex flex-col gap-2">
          <button type="button" onClick={() => setPanneau("terminer")} className={classeBoutonPrincipal}>
            Terminer la fournée
          </button>
          <button type="button" onClick={() => setPanneau("abandonner")}
            className="h-11 border-0 bg-transparent text-[15px] font-semibold text-sourdine underline">
            Abandonner cette fournée
          </button>
        </div>
      )}

      {panneau === "terminer" && (
        <form onSubmit={terminer} className="flex flex-col gap-4 rounded-2xl border-2 border-encre bg-carte p-4">
          <span className="text-[17px] font-semibold">Terminer la fournée</span>
          <div className="flex flex-col gap-1.5">
            <span className="text-sm font-medium text-sourdine">Photos</span>
            <label className="relative flex h-[52px] cursor-pointer items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-pointille text-base font-semibold focus-within:outline-2 focus-within:outline-encre">
              <IconePhoto />
              {photos.length ? pluriel(photos.length, "photo choisie", "photos choisies") : "Prendre ou choisir des photos"}
              <input type="file" accept="image/*" multiple className="absolute h-px w-px opacity-0"
                onChange={(e) => setPhotos(Array.from(e.target.files ?? []))} />
            </label>
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="notes-fournee" className="text-sm font-medium text-sourdine">Ce que j'ai constaté</label>
            <textarea id="notes-fournee" rows={3} value={notes} onChange={(e) => setNotes(e.target.value)}
              placeholder="Mie, croûte, goût, tenue de la pâte…"
              className="box-border resize-y rounded-xl border border-trait-fort bg-fond px-3.5 py-3 leading-snug" />
          </div>
          <div className="grid grid-cols-2 gap-2.5">
            <button type="button" disabled={envoi} onClick={() => setPanneau("")} className={classeBoutonSecondaire}>Annuler</button>
            <button type="submit" disabled={envoi} className={classeBoutonPrincipal}>{envoi ? "Envoi…" : "Enregistrer"}</button>
          </div>
        </form>
      )}

      {minuteurs.length > 0 && (
        <>
          <div aria-hidden="true" style={{ height: `${minuteurs.length * 64 + 24}px` }} />
          <section aria-label="Minuteurs"
            className="fixed inset-x-0 bottom-0 z-40 border-t border-trait bg-carte/95 px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] shadow-[0_-4px_16px_rgba(0,0,0,0.08)] backdrop-blur">
            <ul className="mx-auto m-0 flex max-w-xl list-none flex-col gap-2 p-0">
              {minuteurs.map((m) => {
                const { etat, reste } = etatMinuteur(m, maintenant)
                return (
                  <li key={m.id} className={`flex items-center gap-2 rounded-xl px-3 py-1.5 ${etat === "fini" ? "bg-essai text-white" : "bg-version-fond"}`}>
                    <span className="flex min-w-0 flex-1 flex-col">
                      <span className={`text-sm ${etat === "fini" ? "" : "text-encre-douce"}`}>{m.libelle} · {formatDuree(m.duree)}</span>
                      <span className={`font-mono text-xl font-medium ${etat === "fini" ? "" : "text-version"}`} aria-live={etat === "fini" ? "assertive" : "off"}>
                        {etat === "fini" ? "Terminé !" : formatChrono(reste)}{etat === "pause" && <span className="ml-2 font-sans text-sm">en pause</span>}
                      </span>
                    </span>
                    {etat === "marche" && (
                      <button type="button" aria-label={`Mettre en pause : ${m.libelle}`} onClick={() => changer(m.id, mettreEnPause)}
                        className="flex h-11 w-11 items-center justify-center rounded-xl border-0 bg-carte text-version"><IconePause /></button>
                    )}
                    {etat === "pause" && (
                      <button type="button" aria-label={`Reprendre : ${m.libelle}`} onClick={() => changer(m.id, reprendre)}
                        className="flex h-11 w-11 items-center justify-center rounded-xl border-0 bg-carte text-version"><IconeLecture /></button>
                    )}
                    <button type="button" onClick={() => changer(m.id, ajouterMinute)}
                      className={`h-11 rounded-xl border-0 px-2.5 text-sm font-semibold ${etat === "fini" ? "bg-white/20 text-white" : "bg-carte text-version"}`}>
                      +1 min
                    </button>
                    <button type="button" aria-label={`Arrêter : ${m.libelle}`} onClick={() => arreter(m.id)}
                      className={`flex h-11 w-11 items-center justify-center rounded-xl border-0 ${etat === "fini" ? "bg-white text-essai" : "bg-carte text-sourdine"}`}>
                      <IconeCroix />
                    </button>
                  </li>
                )
              })}
            </ul>
          </section>
        </>
      )}

      {panneau === "abandonner" && (
        <div className="flex flex-col gap-3 rounded-2xl border-2 border-encre bg-carte p-4">
          <span className="text-[17px] font-semibold">Abandonner cette fournée ?</span>
          <p className="m-0 text-[15px] leading-relaxed text-encre-douce">Elle sera supprimée, avec sa progression.</p>
          <div className="grid grid-cols-2 gap-2.5">
            <button type="button" disabled={envoi} onClick={() => setPanneau("")} className={classeBoutonSecondaire}>Garder</button>
            <button type="button" disabled={envoi} onClick={abandonner} className={classeBoutonPrincipal}>Abandonner</button>
          </div>
        </div>
      )}
    </Page>
  )
}
