# Déploiement

## Local (développement — recommandé pour un usage personnel au quotidien)

```bash
npm install
npm run db:push   # crée dev.db (SQLite)
npm run seed       # aéroports, destinations, profils, réglages par défaut
npm run dev         # http://localhost:3020
npm run worker      # dans un second terminal — scans automatiques en continu
```

## Mise en ligne (production)

Cible recommandée : **Vercel** (hébergeur de Next.js, zéro-config, cron jobs intégrés) +
**PostgreSQL managé**. Le code est déjà prêt pour cette cible ; il reste des étapes qui
nécessitent tes propres comptes/identifiants (je ne peux pas les créer à ta place).

### 1. Provisionner une base PostgreSQL

N'importe quel Postgres managé convient (le schéma est portable — voir
`docs/architecture.md`). Options simples :
- **Vercel Postgres** (Neon) — le plus rapide si tu déploies sur Vercel : provisionné
  depuis l'onglet Storage du projet Vercel, `DATABASE_URL` injectée automatiquement.
- **Supabase** ou **Neon** (comptes séparés) — copier l'URL de connexion (mode
  "pooled"/`?pgbouncer=true` recommandé en serverless).
- **Railway** — alternative également simple.

### 2. Basculer le schéma sur PostgreSQL

Une seule ligne à changer, jamais modifiée automatiquement pour ne pas casser le dev
local :

```prisma
// prisma/schema.prisma
datasource db {
  provider = "postgresql"  // au lieu de "sqlite"
  url      = env("DATABASE_URL")
}
```

Puis, avec `DATABASE_URL` pointant vers la base Postgres :

```bash
npx prisma db push       # crée les tables
npx tsx prisma/seed.ts   # données de démonstration (aéroports, destinations, profils)
```

### 3. Déployer sur Vercel

```bash
npm i -g vercel   # si pas déjà installé
vercel login       # nécessite ton compte — étape que tu dois faire toi-même
vercel             # suit les instructions, lie le dossier ATLAS à un nouveau projet
```

Ou via l'interface web (vercel.com → New Project → importer le dépôt Git).

### 4. Variables d'environnement à renseigner sur Vercel

Dans Project Settings → Environment Variables :

| Variable | Obligatoire | Valeur |
|---|---|---|
| `DATABASE_URL` | oui | URL de connexion Postgres (étape 1) |
| `SITE_PASSWORD` | **oui avant tout accès public** | mot de passe de ton choix — sans lui, le site reste entièrement ouvert (voir `docs/security.md`) |
| `CRON_SECRET` | fortement recommandé | valeur aléatoire (`openssl rand -hex 32`) — protège `/api/engine/scan` contre un déclenchement par un tiers une fois le site public |
| `DUFFEL_API_KEY` / autres clés provider | optionnel | seulement pour sortir du mode simulation, voir `docs/providers.md` |
| `TELEGRAM_BOT_TOKEN` / `TELEGRAM_CHAT_ID` | optionnel | pour activer les alertes Telegram |

`CRON_SECRET` : Vercel l'envoie automatiquement en en-tête `Authorization: Bearer
<CRON_SECRET>` sur les appels cron dès qu'elle est définie comme variable d'environnement
du projet — aucune config supplémentaire nécessaire côté `vercel.json`.

`SITE_PASSWORD` : protège tout le site (sauf `/login`, `/api/health` et
`/api/engine/scan`) derrière un mot de passe unique — voir `docs/security.md`. **Ni
`SITE_PASSWORD` ni `CRON_SECRET` ne sont définis par défaut** : sans eux, un déploiement
Vercel serait entièrement public et son endpoint de scan déclenchable par n'importe qui.

### 5. Le moteur de scan en production : Vercel Cron

`vercel.json` (déjà présent à la racine) déclare un cron qui appelle
`GET /api/engine/scan` toutes les 15 minutes :

```json
{ "crons": [{ "path": "/api/engine/scan", "schedule": "*/15 * * * *" }] }
```

**Limite du plan Hobby (gratuit) de Vercel** : les cron jobs y sont restreints à **une
exécution par jour** par cron, quelle que soit la fréquence indiquée dans `schedule`. Sur
le plan Hobby, ATLAS ne tournera donc qu'une fois par jour tant qu'aucun plan Pro n'est
souscrit. Deux options, à ta discrétion (ni l'une ni l'autre n'est requise pour un premier
déploiement fonctionnel) :
1. Rester sur Hobby avec un scan quotidien — suffisant pour découvrir le produit en
   production sans dépense.
2. Passer sur le plan Pro (payant, décision qui t'appartient) pour retrouver la cadence de
   15 minutes.

`npm run worker` (le worker local à base de `node-cron`) ne doit **pas** être utilisé en
production sur Vercel : les fonctions serverless ne supportent pas de process persistant.
C'est `vercel.json` qui prend le relais une fois déployé.

### 6. Vérification post-déploiement

```bash
curl https://<ton-domaine>.vercel.app/api/health
```

Doit renvoyer `{"status":"ok", ...}`. Puis ouvrir le dashboard dans le navigateur.

## Docker (optionnel)

Non fourni : inutile avec Vercel + Postgres managé. Peut être ajouté sans changement de
code applicatif si tu préfères t'auto-héberger (VPS, etc.) — demande-le explicitement si
c'est la direction que tu veux prendre plutôt que Vercel.
