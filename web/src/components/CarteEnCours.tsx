import { Link } from "react-router"
import { dateCourte, nombre } from "../lib/format"
import { coefficientFournee, libelleProgression, progression } from "../lib/fournees"
import type { Fournee } from "../lib/types"
import { IconeSuite } from "./Icones"

// Fournée en cours : un appui ramène à l'étape où on en était.
export default function CarteEnCours({ fournee, titre }: { fournee: Fournee; titre: string }) {
  const { faites, total } = progression(fournee)
  const coefficient = coefficientFournee(fournee)
  const essai = fournee.expand?.essai
  const details = [
    essai ? `Essai n° ${essai.numero}` : null,
    coefficient !== 1 ? `×${nombre(coefficient)}` : null,
    `commencée le ${dateCourte(fournee.date)}`,
  ].filter(Boolean).join(" · ")

  return (
    <Link to={`/fournees/${fournee.id}`}
      className="flex flex-col gap-2 rounded-2xl border border-[#b9d0ec] bg-version-fond p-4">
      <span className="flex items-center justify-between gap-3">
        <span className="text-base font-semibold">{titre}</span>
        <span className="flex shrink-0 items-center gap-0.5 text-sm font-semibold text-version">
          Reprendre <IconeSuite taille={16} />
        </span>
      </span>
      <span className="text-[15px] text-encre-douce">{libelleProgression(fournee)}</span>
      <span className="h-1.5 overflow-hidden rounded-full bg-carte" aria-hidden="true">
        <span className="block h-full rounded-full bg-version" style={{ width: total ? `${(faites / total) * 100}%` : "0%" }} />
      </span>
      <span className="text-[13px] text-sourdine">{details}</span>
    </Link>
  )
}
