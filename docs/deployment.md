# Déploiement

## Local (V1 — recommandé pour un usage personnel)

```bash
npm install
npm run db:push   # crée dev.db (SQLite)
npm run seed       # aéroports, destinations, profils, réglages par défaut
npm run dev         # http://localhost:3020
npm run worker      # dans un second terminal — scans automatiques en continu
```

## Production (quand nécessaire)

1. PostgreSQL : changer `provider = "postgresql"` dans `prisma/schema.prisma` et
   `DATABASE_URL` dans l'environnement de production.
2. `npm run db:push` (ou migrer vers `prisma migrate` avec historique).
3. `npm run build && npm run start` pour l'app web ; le worker (`npm run worker`) tourne
   comme process séparé (systemd, PM2, ou service managé équivalent).
4. Renseigner les clés API réelles si on sort du mode simulation (voir
   `docs/providers.md`).

## Docker (optionnel, Phase 5+)

Non fourni en V1 car ni Docker ni PostgreSQL n'étaient disponibles sur la machine de
développement au moment de la construction (voir `docs/architecture.md`). Un
`docker-compose.yml` PostgreSQL + app peut être ajouté sans changement de code applicatif
une fois le provider PostgreSQL activé dans le schéma.
