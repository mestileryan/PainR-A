import { useState } from "react"
import { dateCourte, dateLongue, pluriel } from "../lib/format"
import { urlPhoto } from "../lib/photos"
import type { Fournee } from "../lib/types"
import { IconePhoto } from "./Icones"

function CasePhotoVide({ libelle }: { libelle: string }) {
  return (
    <div role="img" aria-label={libelle}
      className="flex h-40 items-center justify-center rounded-xl bg-photo text-sourdine">
      <IconePhoto taille={26} strokeWidth={1.8} />
    </div>
  )
}

function etiquette(fournee: Fournee): string {
  if (fournee.expand?.essai) return `Essai n° ${fournee.expand.essai.numero}`
  if (fournee.expand?.version) return `v${fournee.expand.version.numero}`
  return ""
}

// Fournées en bandeau horizontal ; un appui ouvre le détail (toutes les photos et les notes).
export default function ListeFournees({ fournees, jeton }: { fournees: Fournee[]; jeton: string }) {
  const [ouverte, setOuverte] = useState<string | null>(null)
  const detail = fournees.find((f) => f.id === ouverte)

  if (fournees.length === 0) {
    return <p className="m-0 text-[15px] text-sourdine">Pas encore de fournée enregistrée.</p>
  }

  return (
    <div className="flex flex-col gap-3">
      <ul className="-mx-5 m-0 flex list-none gap-2.5 overflow-x-auto px-5 pb-1">
        {fournees.map((f) => (
          <li key={f.id} className="w-[132px] shrink-0">
            <button type="button" aria-expanded={ouverte === f.id}
              onClick={() => setOuverte(ouverte === f.id ? null : f.id)}
              className={`flex w-full flex-col gap-1.5 rounded-xl border-0 bg-transparent p-0 text-left ${ouverte === f.id ? "outline-2 outline-offset-2 outline-encre" : ""}`}>
              {f.photos.length > 0 && jeton ? (
                <img src={urlPhoto(f, f.photos[0], jeton, "300x300")} alt={`Fournée du ${dateLongue(f.date)}`}
                  className="h-40 w-full rounded-xl bg-photo object-cover" loading="lazy" />
              ) : (
                <CasePhotoVide libelle={`Fournée du ${dateLongue(f.date)}, sans photo`} />
              )}
              <span className="text-sm font-semibold">{dateCourte(f.date)}</span>
              <span className="font-mono text-xs text-sourdine">
                {[etiquette(f), pluriel(f.photos.length, "photo", "photos")].filter(Boolean).join(" · ")}
              </span>
            </button>
          </li>
        ))}
      </ul>

      {detail && (
        <article className="flex flex-col gap-3 rounded-2xl border border-trait bg-carte p-4">
          <div className="flex items-baseline justify-between gap-3">
            <span className="text-base font-semibold">Fournée du {dateLongue(detail.date)}</span>
            <span className="font-mono text-xs text-sourdine">{etiquette(detail)}</span>
          </div>
          {detail.photos.length > 0 && jeton && (
            <div className="grid grid-cols-2 gap-2">
              {detail.photos.map((photo, i) => (
                <a key={photo} href={urlPhoto(detail, photo, jeton)} target="_blank" rel="noreferrer">
                  <img src={urlPhoto(detail, photo, jeton, "800x0")} alt={`Photo ${i + 1} de la fournée`}
                    className="aspect-square w-full rounded-xl bg-photo object-cover" loading="lazy" />
                </a>
              ))}
            </div>
          )}
          <p className="m-0 text-[15px] leading-relaxed whitespace-pre-line text-encre-douce">
            {detail.notes || "Pas de notes."}
          </p>
        </article>
      )}
    </div>
  )
}
