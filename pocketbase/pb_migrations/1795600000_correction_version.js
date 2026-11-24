/// <reference path="../pb_data/types.d.ts" />

// Une version peut être corrigée sur place (coquille, oubli), sans créer de nouvelle version.
// La date de la dernière correction est gardée pour l'afficher.

migrate((app) => {
  const versions = app.findCollectionByNameOrId("versions")
  versions.fields.add(new Field({ name: "corrigee_le", type: "date" }))
  app.save(versions)
}, (app) => {
  const versions = app.findCollectionByNameOrId("versions")
  versions.fields.removeByName("corrigee_le")
  app.save(versions)
})
