import {
  useEffect, useId, useLayoutEffect, useMemo, useRef, useState,
  type ClipboardEvent, type FocusEvent, type KeyboardEvent, type MouseEvent,
} from "react"
import { formatDuree, jetonDuree, lireDuree } from "../lib/durees"
import { sansAccents } from "../lib/format"
import {
  contientBlocs, decouperEtape, jetonReference, libellePortion, lirePortion, memeNom, quantiteReference,
} from "../lib/references"
import type { Ingredient } from "../lib/types"
import { IconeChrono, IconePlus } from "./Icones"

// Éditeur d'une étape « en blocs » : les ingrédients cités et les durées sont des blocs
// insécables (Retour arrière les efface en entier). Le texte stocké reste lisible :
// « Ajouter @[Eau|1/2] et pétrir #[480] » = « Ajouter [Eau ½ · 350 g] et pétrir [8 min] ».

const classeBloc = "mx-px inline-block cursor-pointer rounded-md px-1.5 align-baseline whitespace-nowrap"
const classesBloc = {
  ingredient: `${classeBloc} bg-[#f3e6da] text-seigle`,
  duree: `${classeBloc} bg-version-fond text-version`,
  erreur: `${classeBloc} bg-erreur-fond text-erreur`,
}
const iconeChrono = '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" ' +
  'stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" style="display:inline;vertical-align:-1px;margin-right:3px">' +
  '<circle cx="12" cy="14" r="7"/><path d="M12 10.5V14l2.5 1.5M10 3h4M12 3v4"/></svg>'

const echapper = (t: string) => t.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")

// Libellé et couleur d'un bloc, d'après son jeton.
function habiller(el: HTMLElement, ingredients: Ingredient[]) {
  const [m] = decouperEtape(el.dataset.jeton ?? "", ingredients)
  if (!m || m.type === "texte") return
  if (m.type === "duree") {
    el.className = classesBloc.duree
    el.innerHTML = iconeChrono + echapper(formatDuree(m.secondes))
    el.setAttribute("aria-label", `Durée : ${formatDuree(m.secondes)}`)
    return
  }
  if (!m.ingredient || m.portion === null) {
    el.className = classesBloc.erreur
    el.textContent = `${m.nom} ?`
    el.setAttribute("aria-label", `Ingrédient introuvable : ${m.nom}`)
    return
  }
  const portion = m.portion !== 1 ? ` ${libellePortion(m.portion)}` : ""
  const quantite = quantiteReference(m.ingredient, m.portion)
  el.className = classesBloc.ingredient
  el.textContent = `${m.ingredient.nom}${portion}${quantite ? ` · ${quantite}` : ""}`
  el.setAttribute("aria-label", `Ingrédient : ${el.textContent}`)
}

function creerBloc(jeton: string, ingredients: Ingredient[]): HTMLSpanElement {
  const bloc = document.createElement("span")
  bloc.contentEditable = "false"
  bloc.dataset.jeton = jeton
  habiller(bloc, ingredients)
  return bloc
}

function remplir(zone: HTMLElement, texte: string, ingredients: Ingredient[]) {
  zone.replaceChildren()
  for (const m of decouperEtape(texte, ingredients)) {
    if (m.type !== "texte") {
      zone.appendChild(creerBloc(m.brut, ingredients))
      continue
    }
    m.texte.split("\n").forEach((ligne, i) => {
      if (i > 0) zone.appendChild(document.createElement("br"))
      if (ligne) zone.appendChild(document.createTextNode(ligne))
    })
  }
}

function serialiser(zone: HTMLElement): string {
  let s = ""
  const parcourir = (n: Node) => {
    if (n.nodeType === Node.TEXT_NODE) {
      s += (n.textContent ?? "").replace(/ /g, " ")
      return
    }
    if (!(n instanceof HTMLElement)) return
    if (n.dataset.jeton) {
      s += n.dataset.jeton
      return
    }
    if (n.tagName === "BR") {
      s += "\n"
      return
    }
    if ((n.tagName === "DIV" || n.tagName === "P") && s && !s.endsWith("\n")) s += "\n"
    n.childNodes.forEach(parcourir)
  }
  zone.childNodes.forEach(parcourir)
  return s.replace(/\n+$/, "")
}

// Un jeton tapé ou collé à la main reste du texte brut tant qu'on n'a pas réaffiché.
function aDesJetonsBruts(zone: HTMLElement): boolean {
  const marcheur = document.createTreeWalker(zone, NodeFilter.SHOW_TEXT)
  for (let n = marcheur.nextNode(); n; n = marcheur.nextNode()) {
    if (contientBlocs(n.textContent ?? "")) return true
  }
  return false
}

const portionsProposees: [string, number][] = [["½", 1 / 2], ["⅓", 1 / 3], ["¼", 1 / 4], ["⅔", 2 / 3], ["¾", 3 / 4]]
const dureesProposees = [300, 900, 1800, 3600, 7200]

type Ouvert =
  | null
  | { type: "recherche"; requete: string }
  | { type: "bloc"; el: HTMLElement }
  | { type: "nouvelle-duree" }

interface Props {
  id: string
  numero: number
  texte: string
  ingredients: Ingredient[]
  // Texte des autres étapes, pour proposer « le reste » d'un ingrédient déjà en partie utilisé.
  autresTextes: string[]
  onChange: (texte: string) => void
  // Touche pressée hors de la liste des ingrédients (ex. Tab pour ajouter une étape).
  onToucheLibre?: (e: KeyboardEvent<HTMLDivElement>) => void
}

export default function EditeurEtape({ id, numero, texte, ingredients, autresTextes, onChange, onToucheLibre }: Props) {
  const conteneur = useRef<HTMLDivElement>(null)
  const zone = useRef<HTMLDivElement>(null)
  const dernierePlage = useRef<Range | null>(null)
  const idListe = useId()
  const [ouvert, setOuvert] = useState<Ouvert>(null)
  const [actif, setActif] = useState(0)
  const [saisieDuree, setSaisieDuree] = useState("")
  const [saisiePortion, setSaisiePortion] = useState("")
  const [erreurPanneau, setErreurPanneau] = useState("")

  // Texte reçu différent de l'affichage (chargement, renommage d'un ingrédient…) : on réaffiche.
  useLayoutEffect(() => {
    const el = zone.current
    if (el && serialiser(el) !== texte) remplir(el, texte, ingredients)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [texte])

  // Les blocs suivent les ingrédients (nom, quantité) sans déplacer le curseur.
  useEffect(() => {
    zone.current?.querySelectorAll<HTMLElement>("[data-jeton]").forEach((el) => habiller(el, ingredients))
  }, [ingredients])

  // On retient la dernière position du curseur dans l'étape, pour y insérer un bloc.
  useEffect(() => {
    const suivre = () => {
      const sel = document.getSelection()
      if (sel?.rangeCount && zone.current?.contains(sel.anchorNode)) dernierePlage.current = sel.getRangeAt(0).cloneRange()
    }
    document.addEventListener("selectionchange", suivre)
    return () => document.removeEventListener("selectionchange", suivre)
  }, [])

  // Un panneau ouvert se ferme quand on touche ailleurs dans la page.
  const panneauOuvert = ouvert !== null && ouvert.type !== "recherche"
  useEffect(() => {
    if (!panneauOuvert) return
    const ailleurs = (e: PointerEvent) => {
      if (!conteneur.current?.contains(e.target as Node)) setOuvert(null)
    }
    document.addEventListener("pointerdown", ailleurs)
    return () => document.removeEventListener("pointerdown", ailleurs)
  }, [panneauOuvert])

  const propositions = useMemo(() => {
    if (ouvert?.type !== "recherche") return []
    const requete = sansAccents(ouvert.requete)
    return ingredients.filter((i) => sansAccents(i.nom).includes(requete)).slice(0, 8)
  }, [ouvert, ingredients])

  function rechercheAuCurseur() {
    const sel = document.getSelection()
    const noeud = sel?.anchorNode
    if (!sel?.isCollapsed || !noeud || noeud.nodeType !== Node.TEXT_NODE || !zone.current?.contains(noeud)) return null
    const m = (noeud.textContent ?? "").slice(0, sel.anchorOffset).match(/@([^\s@]*)$/)
    return m ? { noeud: noeud as Text, debut: sel.anchorOffset - m[0].length, fin: sel.anchorOffset, requete: m[1] } : null
  }

  function publier() {
    if (zone.current) onChange(serialiser(zone.current))
  }

  // Une ponctuation tapée juste après un bloc se colle au bloc : « Eau, » plutôt que « Eau , ».
  function collerPonctuation() {
    const sel = document.getSelection()
    const ponctuation = /^[,.;:!?)]/
    zone.current?.querySelectorAll<HTMLElement>("[data-jeton]").forEach((bloc) => {
      // L'insertion d'un bloc peut laisser des morceaux de texte vides : on les saute.
      let n = bloc.nextSibling
      while (n && n.nodeType === Node.TEXT_NODE && n.textContent === "") n = n.nextSibling
      if (!n || n.nodeType !== Node.TEXT_NODE) return
      const texteN = n.textContent ?? ""
      const suivant = n.nextSibling
      if (texteN.startsWith(" ") && ponctuation.test(texteN.slice(1))) {
        // Espace et ponctuation dans le même morceau de texte : on retire l'espace.
        const curseur = sel?.anchorNode === n ? sel.anchorOffset : null
        n.textContent = texteN.slice(1)
        if (curseur !== null) sel?.collapse(n, Math.max(0, curseur - 1))
      } else if (texteN === " " && suivant?.nodeType === Node.TEXT_NODE && ponctuation.test(suivant.textContent ?? "")) {
        // Le navigateur a mis la ponctuation dans un morceau à part : on retire le morceau « espace ».
        n.remove()
      }
    })
  }

  function apresSaisie() {
    collerPonctuation()
    publier()
    const r = rechercheAuCurseur()
    setOuvert((o) => {
      if (r) {
        if (o?.type !== "recherche" || o.requete !== r.requete) setActif(0)
        return { type: "recherche", requete: r.requete }
      }
      // Taper referme aussi le choix de portion ouvert juste après une insertion.
      return o?.type === "recherche" || o?.type === "bloc" ? null : o
    })
  }

  function insererBloc(jeton: string, plage?: Range | null): HTMLElement | null {
    const el = zone.current
    if (!el) return null
    el.focus()
    let r = plage ?? dernierePlage.current
    if (!r || !el.contains(r.startContainer)) {
      r = document.createRange()
      r.selectNodeContents(el)
      r.collapse(false)
    }
    r.deleteContents()
    const espace = document.createTextNode(" ")
    const bloc = creerBloc(jeton, ingredients)
    r.insertNode(espace)
    r.insertNode(bloc)
    const apres = document.createRange()
    apres.setStart(espace, 1)
    apres.collapse(true)
    const sel = document.getSelection()
    sel?.removeAllRanges()
    sel?.addRange(apres)
    publier()
    return bloc
  }

  // Part d'un ingrédient déjà citée dans la recette (autres étapes et autres blocs de celle-ci).
  function portionUtilisee(nom: string, sauf: HTMLElement): number {
    let total = 0
    const ajouter = (jeton: string) => {
      for (const m of decouperEtape(jeton, ingredients)) {
        if (m.type === "reference" && m.portion !== null && memeNom(m.nom, nom)) total += m.portion
      }
    }
    autresTextes.forEach(ajouter)
    zone.current?.querySelectorAll<HTMLElement>("[data-jeton]").forEach((el) => {
      if (el !== sauf) ajouter(el.dataset.jeton ?? "")
    })
    return total
  }

  function choisirIngredient(ingredient: Ingredient) {
    const r = rechercheAuCurseur()
    let plage: Range | null = null
    if (r) {
      plage = document.createRange()
      plage.setStart(r.noeud, r.debut)
      plage.setEnd(r.noeud, r.fin)
    }
    setOuvert(null)
    const bloc = insererBloc(jetonReference(ingredient.nom.trim()), plage)
    // Le choix de la portion s'affiche tout de suite ; continuer à taper le referme (tout l'ingrédient).
    if (bloc) {
      setSaisiePortion("")
      setErreurPanneau("")
      setOuvert({ type: "bloc", el: bloc })
    }
  }

  function modifierBloc(el: HTMLElement, jeton: string) {
    el.dataset.jeton = jeton
    habiller(el, ingredients)
    publier()
    setOuvert(null)
  }

  function retirerBloc(el: HTMLElement) {
    el.remove()
    publier()
    setOuvert(null)
    zone.current?.focus()
  }

  function touche(e: KeyboardEvent<HTMLDivElement>) {
    if (ouvert?.type === "recherche") {
      if (e.key === "Escape") {
        e.preventDefault()
        setOuvert(null)
        return
      }
      if (propositions.length > 0) {
        if (e.key === "ArrowDown" || e.key === "ArrowUp") {
          e.preventDefault()
          const pas = e.key === "ArrowDown" ? 1 : -1
          setActif((a) => (a + pas + propositions.length) % propositions.length)
          return
        }
        if (e.key === "Enter" || e.key === "Tab") {
          e.preventDefault()
          choisirIngredient(propositions[Math.min(actif, propositions.length - 1)])
          return
        }
      }
    }
    if (e.key === "Enter") {
      // Retour à la ligne simple, sans créer de paragraphe.
      e.preventDefault()
      document.execCommand("insertLineBreak")
      publier()
      return
    }
    onToucheLibre?.(e)
  }

  function clic(e: MouseEvent<HTMLDivElement>) {
    const bloc = (e.target as HTMLElement).closest<HTMLElement>("[data-jeton]")
    if (!bloc || !zone.current?.contains(bloc)) return
    e.preventDefault()
    const [m] = decouperEtape(bloc.dataset.jeton ?? "", ingredients)
    setSaisieDuree(m?.type === "duree" ? formatDuree(m.secondes) : "")
    setSaisiePortion("")
    setErreurPanneau("")
    setOuvert({ type: "bloc", el: bloc })
  }

  function coller(e: ClipboardEvent<HTMLDivElement>) {
    e.preventDefault()
    document.execCommand("insertText", false, e.clipboardData.getData("text/plain"))
  }

  function sortie(e: FocusEvent<HTMLDivElement>) {
    if (conteneur.current?.contains(e.relatedTarget as Node | null)) return
    setOuvert((o) => (o?.type === "recherche" ? null : o))
    if (zone.current && aDesJetonsBruts(zone.current)) remplir(zone.current, texte, ingredients)
  }

  function ouvrirListe() {
    const el = zone.current
    if (!el) return
    el.focus()
    const r = dernierePlage.current
    if (r && el.contains(r.startContainer)) {
      const sel = document.getSelection()
      sel?.removeAllRanges()
      sel?.addRange(r)
    }
    document.execCommand("insertText", false, "@")
  }

  // Panneau d'un bloc touché, ou d'une durée à insérer.
  const bloc = ouvert?.type === "bloc" ? ouvert.el : null
  const morceauBloc = bloc ? decouperEtape(bloc.dataset.jeton ?? "", ingredients)[0] : null

  function validerPortion() {
    if (!bloc || morceauBloc?.type !== "reference") return
    const portion = lirePortion(saisiePortion)
    if (!saisiePortion.trim() || portion === null) {
      setErreurPanneau("Portion illisible : écris par exemple 1/5, 30% ou 0,2.")
      return
    }
    modifierBloc(bloc, jetonReference(morceauBloc.nom, portion))
  }

  function validerDuree() {
    const secondes = lireDuree(saisieDuree)
    if (!secondes) {
      setErreurPanneau("Durée illisible : écris par exemple 45 min, 1 h 30 ou 2 h.")
      return
    }
    if (bloc) modifierBloc(bloc, jetonDuree(secondes))
    else {
      setOuvert(null)
      insererBloc(jetonDuree(secondes))
    }
  }

  const classeChoix = "flex h-11 items-center justify-center rounded-xl border border-trait-fort bg-carte px-2 text-[15px] font-medium whitespace-nowrap"

  return (
    <div ref={conteneur} className="relative flex min-w-0 flex-1 flex-col gap-1">
      <div
        ref={zone}
        id={id}
        role="textbox"
        aria-multiline="true"
        aria-label={`Étape ${numero}`}
        aria-autocomplete="list"
        aria-expanded={ouvert?.type === "recherche"}
        aria-controls={ouvert?.type === "recherche" ? idListe : undefined}
        aria-activedescendant={ouvert?.type === "recherche" && propositions.length ? `${idListe}-${actif}` : undefined}
        contentEditable
        tabIndex={0}
        onInput={apresSaisie}
        onKeyDown={touche}
        onClick={clic}
        onPaste={coller}
        onBlur={sortie}
        className="box-border min-h-[76px] rounded-xl border border-trait-fort bg-carte px-3.5 py-3 leading-relaxed break-words whitespace-pre-wrap focus:border-encre focus:outline-none"
      />

      <div className="flex gap-1">
        <button type="button" tabIndex={-1} onMouseDown={(e) => e.preventDefault()} onClick={ouvrirListe}
          className="flex h-11 items-center gap-1 rounded-lg border-0 bg-transparent px-2 text-sm font-semibold text-seigle">
          <IconePlus taille={16} /> Ingrédient
        </button>
        <button type="button" tabIndex={-1} onMouseDown={(e) => e.preventDefault()}
          onClick={() => {
            setSaisieDuree("")
            setErreurPanneau("")
            setOuvert({ type: "nouvelle-duree" })
          }}
          className="flex h-11 items-center gap-1 rounded-lg border-0 bg-transparent px-2 text-sm font-semibold text-version">
          <IconeChrono taille={16} /> Durée
        </button>
      </div>

      {ouvert?.type === "recherche" && (
        <ul id={idListe} role="listbox" aria-label="Ingrédients"
          className="absolute top-full right-0 left-0 z-10 -mt-12 m-0 list-none overflow-hidden rounded-xl border border-trait-fort bg-carte p-1 shadow-lg">
          {propositions.length === 0 ? (
            <li className="px-3 py-2.5 text-sm text-sourdine">
              {ingredients.length === 0
                ? "Ajoute d'abord des ingrédients pour pouvoir les citer."
                : `Aucun ingrédient ne correspond à « ${ouvert.requete} ».`}
            </li>
          ) : (
            propositions.map((ingredient, i) => (
              <li key={ingredient.nom} id={`${idListe}-${i}`} role="option" aria-selected={i === actif}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => choisirIngredient(ingredient)}
                className={`flex min-h-11 cursor-pointer items-center justify-between gap-3 rounded-lg px-3 text-[15px] ${i === actif ? "bg-[#f3e6da] text-seigle" : ""}`}>
                <span className="font-medium">{ingredient.nom}</span>
                <span className="font-mono text-sm text-sourdine">{quantiteReference(ingredient, 1)}</span>
              </li>
            ))
          )}
        </ul>
      )}

      {(morceauBloc?.type === "reference" && bloc) && (
        <div role="dialog" aria-label={`Bloc ${morceauBloc.nom}`}
          className="absolute top-full right-0 left-0 z-10 -mt-12 flex flex-col gap-2.5 rounded-xl border border-trait-fort bg-carte p-3 shadow-lg">
          <span className="text-[15px] font-semibold">{morceauBloc.nom} : quelle quantité ?</span>
          {morceauBloc.ingredient && (() => {
            const reste = 1 - portionUtilisee(morceauBloc.nom, bloc)
            if (reste <= 0.001 || reste >= 0.999) return null
            return (
              <button type="button" onClick={() => modifierBloc(bloc, jetonReference(morceauBloc.nom, reste))}
                className="flex h-11 items-center justify-center gap-2 rounded-xl border-2 border-seigle bg-[#f3e6da] px-3 text-[15px] font-semibold text-seigle">
                Le reste · {libellePortion(reste)}
                <span className="font-mono text-sm">{quantiteReference(morceauBloc.ingredient, reste)}</span>
              </button>
            )
          })()}
          {morceauBloc.ingredient && (
            <div className="grid grid-cols-3 gap-1.5">
              <button type="button" className={classeChoix}
                onClick={() => modifierBloc(bloc, jetonReference(morceauBloc.nom))}>
                Tout
              </button>
              {portionsProposees.map(([libelle, valeur]) => (
                <button key={libelle} type="button" className={classeChoix}
                  onClick={() => modifierBloc(bloc, jetonReference(morceauBloc.nom, valeur))}>
                  {libelle} <span className="ml-1 font-mono text-xs whitespace-nowrap text-sourdine">{quantiteReference(morceauBloc.ingredient!, valeur)}</span>
                </button>
              ))}
            </div>
          )}
          {/* Pas de <form> ici : l'éditeur est déjà dans le formulaire de la recette. */}
          <div role="group" aria-label="Autre portion" className="flex items-center gap-2">
            <label htmlFor={`${idListe}-portion`} className="text-sm text-sourdine">Autre</label>
            <input id={`${idListe}-portion`} value={saisiePortion} onChange={(e) => setSaisiePortion(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault()
                  validerPortion()
                }
              }}
              placeholder="1/5, 30%…" className="h-11 w-28 rounded-xl border border-trait-fort bg-carte px-3 font-mono" />
            <button type="button" onClick={validerPortion} className={classeChoix}>OK</button>
          </div>
          {erreurPanneau && <p role="alert" className="m-0 text-sm text-erreur">{erreurPanneau}</p>}
          <div className="flex justify-between">
            <button type="button" onClick={() => retirerBloc(bloc)} className="h-11 border-0 bg-transparent text-sm font-semibold text-erreur">
              Retirer le bloc
            </button>
            <button type="button" onClick={() => setOuvert(null)} className="h-11 border-0 bg-transparent text-sm font-semibold">
              Fermer
            </button>
          </div>
        </div>
      )}

      {(ouvert?.type === "nouvelle-duree" || morceauBloc?.type === "duree") && (
        <div role="dialog" aria-label="Durée"
          className="absolute top-full right-0 left-0 z-10 -mt-12 flex flex-col gap-2.5 rounded-xl border border-trait-fort bg-carte p-3 shadow-lg">
          <span className="text-[15px] font-semibold">{bloc ? "Modifier la durée" : "Insérer une durée"}</span>
          <div className="flex flex-wrap gap-1.5">
            {dureesProposees.map((s) => (
              <button key={s} type="button" className={classeChoix} onClick={() => setSaisieDuree(formatDuree(s))}>
                {formatDuree(s)}
              </button>
            ))}
          </div>
          <div role="group" aria-label="Saisir la durée" className="flex items-center gap-2">
            <label htmlFor={`${idListe}-duree`} className="text-sm text-sourdine">Durée</label>
            <input id={`${idListe}-duree`} autoFocus value={saisieDuree} onChange={(e) => setSaisieDuree(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault()
                  validerDuree()
                }
              }}
              placeholder="1 h 30" className="h-11 w-28 rounded-xl border border-trait-fort bg-carte px-3 font-mono" />
            <button type="button" onClick={validerDuree} className={classeChoix}>{bloc ? "OK" : "Insérer"}</button>
          </div>
          {erreurPanneau && <p role="alert" className="m-0 text-sm text-erreur">{erreurPanneau}</p>}
          <div className="flex justify-between">
            {bloc ? (
              <button type="button" onClick={() => retirerBloc(bloc)} className="h-11 border-0 bg-transparent text-sm font-semibold text-erreur">
                Retirer le bloc
              </button>
            ) : <span />}
            <button type="button" onClick={() => setOuvert(null)} className="h-11 border-0 bg-transparent text-sm font-semibold">
              Fermer
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
