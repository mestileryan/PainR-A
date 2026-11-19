import { useEffect, useMemo, useState, type FormEvent } from "react"
import { useNavigate, useParams } from "react-router"
import { Chargement, Erreur, LienRetour, Page, TitreSection, classeBoutonPrincipal, classeChamp } from "../components/Commun"
import EditeurContenu, { contenuDepuis, lignesDepuis, type Lignes } from "../components/EditeurContenu"
import ListeDifferences from "../components/ListeDifferences"
import { differences } from "../lib/differences"
import { messageErreur, pb } from "../lib/pb"
import type { Essai, Recette, Version } from "../lib/types"

interface Contexte {
  recette: Recette
  base: Version
  essai?: Essai
}

// Proposer un essai (/recettes/:id/essais/nouveau) ou retoucher un essai en cours (/essais/:id/modifier).
export default function EditionEssai({ mode }: { mode: "nouveau" | "modifier" }) {
  const { id = "" } = useParams()
  const naviguer = useNavigate()
  const [contexte, setContexte] = useState<Contexte | null>(null)
  const [titre, setTitre] = useState("")
  const [objectif, setObjectif] = useState("")
  const [lignes, setLignes] = useState<Lignes | null>(null)
  const [erreur, setErreur] = useState("")
  const [envoi, setEnvoi] = useState(false)

  useEffect(() => {
    let annule = false
    async function charger() {
      try {
        if (mode === "nouveau") {
          const recette = await pb.collection("recettes").getOne<Recette>(id, { expand: "version_courante" })
          const base = recette.expand?.version_courante
          if (!base) throw new Error("Version en vigueur introuvable.")
          if (annule) return
          setContexte({ recette, base })
          setLignes(lignesDepuis(base))
        } else {
          const essai = await pb.collection("essais").getOne<Essai>(id, { expand: "recette,version_base" })
          const recette = essai.expand?.recette
          const base = essai.expand?.version_base
          if (!recette || !base) throw new Error("Essai incomplet.")
          if (annule) return
          setContexte({ recette, base, essai })
          setTitre(essai.titre)
          setObjectif(essai.objectif)
          setLignes(lignesDepuis(essai))
        }
      } catch (err) {
        if (!annule) setErreur(err instanceof Error && !("status" in err) ? err.message : messageErreur(err))
      }
    }
    void charger()
    return () => {
      annule = true
    }
  }, [id, mode])

  const changements = useMemo(
    () => (contexte && lignes ? differences(contexte.base, contenuDepuis(lignes)) : []),
    [contexte, lignes],
  )

  if (!contexte || !lignes) {
    return (
      <Page>
        <LienRetour vers={mode === "nouveau" ? `/recettes/${id}` : `/essais/${id}`}>Retour</LienRetour>
        {erreur ? <Erreur message={erreur} /> : <Chargement />}
      </Page>
    )
  }

  const { recette, base, essai } = contexte
  if (essai && essai.statut !== "en_cours") {
    return (
      <Page>
        <LienRetour vers={`/essais/${essai.id}`}>Essai n° {essai.numero}</LienRetour>
        <Erreur message="Cet essai est tranché : il ne peut plus être modifié." />
      </Page>
    )
  }

  async function enregistrer(ev: FormEvent) {
    ev.preventDefault()
    setErreur("")
    if (changements.length === 0) {
      setErreur("L'essai ne change rien à la version de départ : modifie au moins un ingrédient ou une étape.")
      return
    }
    setEnvoi(true)
    try {
      const donnees = { titre: titre.trim(), objectif: objectif.trim(), ...contenuDepuis(lignes!) }
      if (essai) {
        await pb.collection("essais").update(essai.id, donnees)
        naviguer(`/essais/${essai.id}`, { replace: true })
      } else {
        const cree = await pb.collection("essais").create<Essai>({ ...donnees, recette: recette.id, version_base: base.id })
        naviguer(`/essais/${cree.id}`, { replace: true })
      }
    } catch (err) {
      setErreur(messageErreur(err))
      setEnvoi(false)
    }
  }

  return (
    <Page>
      <LienRetour vers={essai ? `/essais/${essai.id}` : `/recettes/${recette.id}`}>
        {essai ? `Essai n° ${essai.numero}` : `${recette.nom} · v${base.numero}`}
      </LienRetour>
      <div className="flex flex-col gap-2">
        <span className="text-[13px] font-semibold tracking-[0.06em] text-essai uppercase">
          {essai ? "Modifier l'essai" : `Nouvel essai sur la version ${base.numero}`}
        </span>
        <h1 className="m-0 font-titre text-[30px] leading-tight font-bold">{recette.nom}</h1>
        {!essai && (
          <p className="m-0 text-[15px] leading-relaxed text-encre-douce">
            Modifie ce que tu veux tester. La version {base.numero} reste en vigueur tant que l'essai n'est pas validé.
          </p>
        )}
      </div>

      <form onSubmit={enregistrer} className="flex flex-col gap-7">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="titre" className="text-sm font-medium text-sourdine">Ce que tu changes, en quelques mots</label>
          <input id="titre" required value={titre} onChange={(e) => setTitre(e.target.value)}
            placeholder="Plus d'hydratation, pointage plus court" className={classeChamp} />
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="objectif" className="text-sm font-medium text-sourdine">Ce que tu espères obtenir</label>
          <textarea id="objectif" rows={2} value={objectif} onChange={(e) => setObjectif(e.target.value)}
            placeholder="Une mie plus alvéolée sans perdre la tenue au façonnage."
            className="box-border resize-y rounded-xl border border-trait-fort bg-carte px-3.5 py-3 leading-snug" />
        </div>

        <EditeurContenu lignes={lignes} onChange={setLignes} />

        <section className="flex flex-col gap-2.5">
          <TitreSection>Ce qui change</TitreSection>
          <ListeDifferences differences={changements} />
        </section>

        <Erreur message={erreur} />
        <button type="submit" disabled={envoi} className={classeBoutonPrincipal}>
          {envoi ? "Enregistrement…" : essai ? "Enregistrer les modifications" : "Lancer l'essai"}
        </button>
      </form>
    </Page>
  )
}
