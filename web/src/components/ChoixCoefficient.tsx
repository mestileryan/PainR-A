import { useEffect, useId, useState } from "react"
import { lireCoefficient, nombre } from "../lib/format"

const raccourcis = [0.5, 1, 1.5, 2]

const libelle = (valeur: number) => (valeur === 0.5 ? "×½" : `×${nombre(valeur)}`)

// Choix du coefficient appliqué aux quantités : raccourcis, ou valeur libre.
export default function ChoixCoefficient({ valeur, onChange }: { valeur: number; onChange: (v: number) => void }) {
  const id = useId()
  const [saisie, setSaisie] = useState(raccourcis.includes(valeur) ? "" : nombre(valeur))

  // Une saisie en cours qui correspond déjà au coefficient est gardée telle quelle (« 1, » en tapant « 1,25 »).
  // Sinon, un raccourci vide le champ libre et une valeur libre venue de l'adresse le remplit.
  useEffect(() => {
    setSaisie((actuelle) =>
      lireCoefficient(actuelle) === valeur ? actuelle : raccourcis.includes(valeur) ? "" : nombre(valeur))
  }, [valeur])

  return (
    <div className="flex flex-wrap items-center gap-2">
      <div role="group" aria-label="Multiplier les quantités" className="flex gap-1.5">
        {raccourcis.map((r) => (
          <button key={r} type="button" aria-pressed={valeur === r} onClick={() => onChange(r)}
            className={`h-11 min-w-12 rounded-full px-3 font-mono text-[15px] font-medium ${valeur === r
              ? "border border-encre bg-encre text-white"
              : "border border-trait-fort bg-carte text-encre"}`}>
            {libelle(r)}
          </button>
        ))}
      </div>
      <label htmlFor={id} className="flex items-center gap-1.5 text-[15px] text-sourdine">
        ou ×
        <input id={id} inputMode="decimal" placeholder="1,25" value={saisie}
          aria-label="Coefficient libre"
          onChange={(e) => {
            setSaisie(e.target.value)
            const lu = lireCoefficient(e.target.value)
            if (lu !== null) onChange(lu)
          }}
          className={`h-11 w-20 rounded-xl border bg-carte px-3 font-mono text-encre ${!raccourcis.includes(valeur) ? "border-encre" : "border-trait-fort"}`} />
      </label>
    </div>
  )
}
