// Tests des durées : node --test src/lib/durees.test.ts (Node 24, types retirés à l'exécution).
import { deepStrictEqual, strictEqual } from "node:assert"
import { test } from "node:test"
import { dureesDansTexte, formatChrono, formatDuree, lireDuree } from "./durees.ts"

const secondes = (texte: string) => dureesDansTexte(texte).map((d) => d.secondes)

test("XXhYY et XX h YY", () => {
  deepStrictEqual(secondes("Pointage 1h30 à 24 °C"), [5400])
  deepStrictEqual(secondes("Apprêt 12h05 au froid"), [43500])
  deepStrictEqual(secondes("Pointage 1 h 30"), [5400])
  deepStrictEqual(secondes("Repos 2h"), [7200])
  deepStrictEqual(secondes("Repos 2 heures"), [7200])
  deepStrictEqual(secondes("1h75 n'existe pas"), [])
})

test("XX:YY : deux chiffres exactement après « : »", () => {
  deepStrictEqual(secondes("Cuire 1:30"), [5400])
  deepStrictEqual(secondes("Fermentation 125:00"), [450000])
  deepStrictEqual(secondes("Ratio 1:5"), [])
  deepStrictEqual(secondes("Code 1:305"), [])
  deepStrictEqual(secondes("Pas 1:75"), [])
  deepStrictEqual(secondes("12:30:45"), [])
})

test("minutes, secondes, décimales", () => {
  deepStrictEqual(secondes("Cuire 45 min à 240 °C"), [2700])
  deepStrictEqual(secondes("Cuire 45min."), [2700])
  deepStrictEqual(secondes("Mixer 30 s"), [30])
  deepStrictEqual(secondes("Repos 1,5 h"), [5400])
  deepStrictEqual(secondes("Ajouter 2 sachets et 3 sel"), [])
  deepStrictEqual(secondes("Autolyse 1 h puis pointage 3h30"), [3600, 12600])
})

test("positions pour l'affichage", () => {
  const [d] = dureesDansTexte("Pointage 1h30 à 24 °C")
  strictEqual("Pointage 1h30 à 24 °C".slice(d.debut, d.fin), "1h30")
})

test("saisie et affichage des durées", () => {
  strictEqual(lireDuree("1h30"), 5400)
  strictEqual(lireDuree("1:30"), 5400)
  strictEqual(lireDuree("45 min"), 2700)
  strictEqual(formatDuree(5400), "1 h 30")
  strictEqual(formatDuree(2700), "45 min")
  strictEqual(formatChrono(3725), "1:02:05")
})
