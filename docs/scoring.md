# Scoring ATLAS

## ATLAS Score

Agrégation pondérée de 6 sous-scores (0-100 chacun). Pondération par défaut, modifiable
dans Settings sans toucher au code (`src/lib/scoring/atlasScore.ts`) :

| Composante | Poids par défaut | Fichier |
|---|---|---|
| Fare Intelligence | 35% | `fareScore.ts` |
| Season | 20% | `seasonScore.ts` |
| Experience | 15% | `experienceScore.ts` |
| Flight Quality | 10% | `flightQualityScore.ts` |
| Adéquation durée | 10% | `duration/rules.ts` |
| Préférences | 10% | `preferenceScore.ts` |

ATLAS génère systématiquement une explication humaine (`generateExplanation`) — jamais un
chiffre seul.

## Fare Intelligence

Compare le prix **à l'historique de la même route**, jamais à un plafond absolu. Combine
z-score vs médiane, écart au plus bas historique (rareté) et percentile. Avec moins de 3
observations historiques, le score reste neutre (50) : ATLAS ne peut pas juger la rareté
sans historique — c'est un choix délibéré plutôt que d'inventer un signal.

## Season Score

Part d'un score éditorial de base par mois (`SeasonMonth.seasonScore`), pénalisé fortement
pour mousson/saison des pluies/risque cyclonique/chaleur ou froid extrême, légèrement
ajusté selon l'affluence touristique.

## Experience Score

Détecte le chevauchement entre les dates du voyage et les événements connus de la
destination (`DestinationEvent`), avec tolérance de dates proportionnelle à la variabilité
de l'événement (HIGH pour les cerisiers, dates très variables d'une année sur l'autre).

## Flight Quality Score

Pénalise les escales, les trajets démesurément longs par rapport au meilleur itinéraire
connu sur la route, les horaires extrêmes, les correspondances non protégées
(self-transfer) et l'absence de bagage inclus. Un vol à 35h de trajet ne peut jamais
obtenir un bon score, même à prix cassé.

## Adéquation durée / trajet

Voir `/docs/product.md` (section durée intelligente). Score maximal entre 1x et 2x la
durée minimale requise pour le temps de trajet, dégradé fortement en dessous du minimum.

## Preference Score

Combine deux familles de critères, tous configurables dans Settings sans toucher au
code : destinations/régions/compagnies/escales (exclusions et priorités explicites), et
confort personnel — température souhaitée vs température moyenne du mois de départ,
tolérance à la pluie vs précipitations du mois, importance de la plage vs
`DestinationProfile.isBeachDestination`, bagage requis et classe souhaitée vs l'offre
observée. Chaque composante n'agit que si son "importance" (0-100) est non nulle, pour ne
jamais pénaliser un utilisateur qui n'a pas exprimé de préférence sur ce point.

## Cas limites testés (`tests/scoring.test.ts`, `tests/purchasePolicy.test.ts`)

- Un tarif bas en absolu mais cher pour sa route (Nice→Rome à 170€) reçoit un Fare Score
  bas.
- Une destination en pleine mousson reçoit une pénalité Season forte même à prix cassé.
- Un ATLAS Score élevé (98) avec un Season Score bas (50) est **rejeté** par le Purchase
  Policy Engine si le mandat impose Season ≥ 85 — le score global ne masque jamais un
  sous-score disqualifiant au niveau du mandat d'achat.
