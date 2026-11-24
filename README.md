# PainR-A

## Ce que ça fait

Un livret de recettes qu'on fait évoluer en testant.

- **Recettes versionnées** : chaque recette a une version en vigueur (v1, v2, v3…) avec ses ingrédients et ses étapes. Une version n'est jamais modifiée après coup.
- **Essais** : pour changer une recette, on propose un essai (par exemple « Eau 700 g → 750 g »). Il reste un essai tant qu'on le teste.
  - **Validé**, il devient la version suivante de la recette.
  - **Refusé**, la recette ne change pas et l'essai reste dans l'historique avec la raison du refus.
- **Fournées** : chaque fois qu'on fait la recette, ou qu'on teste un essai, on enregistre une fournée avec sa date, ses notes et ses photos.

L'application s'installe sur le téléphone comme une app (PWA). Les données et les photos restent sur ton serveur, et les photos ne sont visibles qu'une fois connecté.

## Installation

### Ce qu'il faut

Un serveur Linux avec Docker et Docker Compose.

### 1. Lancer le livret sur le serveur

```bash
git clone https://github.com/mestileryan/PainR-A.git
cd PainR-A
docker compose up -d --build
```

Le livret est alors accessible depuis le réseau local, sur `http://ip-du-serveur:8090`.

### 2. Créer les comptes

Crée d'abord le compte d'administration de PocketBase :

```bash
docker compose exec painrd /pb/pocketbase superuser upsert ton@email.fr 'un-mot-de-passe-solide' --dir /pb/pb_data
```

Ensuite, ouvre `http://ip-du-serveur:8090/_/`, connecte-toi avec ce compte, et crée ton compte utilisateur dans la collection **users**. C'est avec lui que tu te connecteras au livret. L'inscription publique est fermée.

### 3. Activer les sauvegardes

Dans l'administration (`/_/`), va dans **Settings › Backups** :

- active les sauvegardes automatiques (par exemple tous les jours) ;
- renseigne un stockage S3 externe (Cloudflare R2, Backblaze B2…), pour qu'une panne du serveur n'emporte pas les photos.

### 4. Sur le téléphone

Ouvre `http://ip-du-serveur:8090`, puis **Ajouter à l'écran d'accueil**.

En `http://`, le navigateur crée un simple raccourci. Pour une vraie app installable, il faut un accès en HTTPS (voir ci-dessous).

### Accès depuis l'extérieur (optionnel)

Ne pas ouvrir le port 8090 sur la box : le mot de passe passerait en clair.

- **Tailscale** (le plus simple) : installe Tailscale sur le serveur et sur le téléphone, avec le même compte. Ensuite, sur le serveur, lance `sudo tailscale serve --bg 8090`. Le livret est accessible en HTTPS sur l'adresse `https://<serveur>.<ton-réseau>.ts.net` qu'affiche la commande, uniquement depuis tes appareils.
- **Tunnel Cloudflare** (avec un nom de domaine géré par Cloudflare) :
  1. Dans le tableau de bord Cloudflare, ouvre **Networking › Tunnels**, puis **Create a tunnel**. Copie le jeton qui commence par `eyJ…`, sans exécuter la commande proposée.
  2. Mets-le dans le fichier `.env` (`TUNNEL_TOKEN=…`, voir `.env.example`), puis lance `docker compose --profile cloudflare up -d`.
  3. Dans le tunnel, ouvre **Routes › Add route › Published application** : choisis le sous-domaine et le domaine, avec la **Service URL** `http://painrd:8090`.

### Mettre à jour

```bash
git pull
docker compose up -d --build    # ajouter --profile cloudflare si le tunnel est utilisé
```

Les migrations de base de données s'appliquent toutes seules au démarrage.

### Développer en local

Il faut Node.js 24 et le binaire PocketBase 0.40.6 ([releases](https://github.com/pocketbase/pocketbase/releases/tag/v0.40.6)).

```bash
# Terminal 1 : PocketBase sur le port 8090
cd pocketbase
pocketbase serve --dir pb_data --migrationsDir pb_migrations --hooksDir pb_hooks

# Terminal 2 : l'interface, avec rechargement à chaud
cd web
npm install
npm run dev
```

Les tests de l'API (`pocketbase/tests/api.mjs`) se lancent sur une instance de test vide. Les instructions sont en tête du fichier.
