# Produit ATLAS

## Vision

ATLAS ne répond pas à "trouve-moi un vol Nice-Tokyo" : il surveille en continu le marché
mondial des vols et signale les combinaisons origine/destination/dates exceptionnelles,
en croisant prix, saisonnalité, événements, qualité de vol et préférences personnelles.

## Durée intelligente des séjours

Règle par défaut (configurable dans Settings, `UserSettings.durationRules`) :

| Temps de trajet total | Séjour minimum |
|---|---|
| < 2h | 2 jours |
| 2h – 4h | 4 jours |
| 4h – 7h | 7 jours |
| 7h – 10h | 10 jours |
| > 10h | 15 jours |

Le "temps de trajet total" utilise la durée totale (vol + escales), pas seulement le temps
de vol : un trajet 3h de vol + 6h d'escale est traité comme 9h de trajet, pas 3h.

## Profils de voyage

- **FAMILLE** — peu d'escales, horaires raisonnables, pénalise les longues attentes.
- **COUPLE** — équilibre prix/confort (profil par défaut).
- **DEAL HUNTER** — tolère plus de contraintes, priorité maximale au prix.

Profils personnalisés possibles via `TravelProfile`.

## Ce qui est construit (V1)

Voir `TASKS.md` pour le détail coché/non coché. En résumé : moteur de scan autonome avec
file de tâches et backoff, 5 sous-scores + ATLAS Score avec explication, historique de
prix, alertes hiérarchisées dédupliquées, 11 écrans (Dashboard, Map, Deals, Destination
Explorer, Price History, Alerts, Search Engine Status, Travel Profiles, Settings,
Automation, System Health), tout en mode simulation sans clé API.

## Ce qui n'est pas construit (V2/V3, architecture préparée)

- Providers réels (Duffel/Amadeus/Kiwi) — architecture prête, clé API à fournir par
  l'utilisateur.
- True Trip Cost (coût réel incluant accès aéroport, parking, hôtel de départ...).
- Intégration calendrier externe (Google Calendar) — calendrier interne simple existe.
- Achat/réservation autonome — Purchase Policy Engine prêt, **aucune intégration de
  paiement**, kill switch engagé par défaut.
