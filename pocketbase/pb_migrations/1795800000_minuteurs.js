/// <reference path="../pb_data/types.d.ts" />

// Minuteurs d'une fournée en cours, gardés sur le serveur pour survivre à la fermeture de l'app :
// [{ id, etape, libelle, duree, fin, restant }] — fin = heure de fin (en marche), restant = secondes (en pause).

migrate((app) => {
  const fournees = app.findCollectionByNameOrId("fournees")
  fournees.fields.add(new Field({ name: "minuteurs", type: "json", maxSize: 50000 }))
  app.save(fournees)
}, (app) => {
  const fournees = app.findCollectionByNameOrId("fournees")
  fournees.fields.removeByName("minuteurs")
  app.save(fournees)
})
