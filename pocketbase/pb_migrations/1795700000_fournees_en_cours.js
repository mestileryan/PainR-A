/// <reference path="../pb_data/types.d.ts" />

// Une fournée peut être « en cours » : on suit la recette étape par étape et on reprend
// là où on en était, éventuellement sur plusieurs recettes à la fois.
// Les fournées existantes deviennent des fournées terminées (en_cours = false).

migrate((app) => {
  const fournees = app.findCollectionByNameOrId("fournees")
  fournees.fields.add(new Field({ name: "en_cours", type: "bool" }))
  // Index des étapes cochées, par exemple [0, 1, 3].
  fournees.fields.add(new Field({ name: "etapes_faites", type: "json", maxSize: 20000 }))
  // Coefficient de quantités utilisé (0 ou vide = 1).
  fournees.fields.add(new Field({ name: "coefficient", type: "number", min: 0, max: 100 }))
  app.save(fournees)
}, (app) => {
  const fournees = app.findCollectionByNameOrId("fournees")
  for (const nom of ["en_cours", "etapes_faites", "coefficient"]) fournees.fields.removeByName(nom)
  app.save(fournees)
})
