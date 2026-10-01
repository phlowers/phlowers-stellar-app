# Données terrain

## Qu'est-ce que l'onglet Données terrain ?

L'onglet **Données terrain** de l'outil de mesure de terrain collecte les informations environnementales et géographiques enregistrées lors de votre visite sur site. Ces données sont essentielles pour calculer le paramètre et la température du câble dans les conditions spécifiques observées au moment de la mesure.

Utilisez cet onglet pour enregistrer :
- quand vous avez effectué la mesure (date et heure)
- où la mesure a été prise (portée, coordonnées, altitude)
- quelles étaient les conditions météorologiques (vent, température, nébulosité)

## Démarrage : créer ou sélectionner une mesure

Quand vous ouvrez l'outil de mesure de terrain, {{app_name}} affiche un écran d'initialisation vous permettant de créer une nouvelle mesure ou de sélectionner une mesure existante.

### Créer une nouvelle mesure

1. Saisissez un nom unique pour votre mesure dans le champ **Nom de la mesure** (ou conservez le nom généré automatiquement par défaut, comme « TM 1 », « TM 2 », etc.).
2. Cliquez sur **Créer une nouvelle mesure**.
3. La boîte de dialogue principale s'ouvre avec l'onglet Données terrain actif.

### Sélectionner une mesure existante

1. Faites défiler la liste déroulante **Choisir une mesure existante** pour trouver une mesure précédente.
2. Cliquez sur **Choisir**.
3. La boîte de dialogue principale s'ouvre avec les données de cette mesure préchargées.

```{note}
Vous pouvez supprimer une mesure existante en cliquant sur l'icône de suppression dans la liste déroulante. Une fois supprimée, elle ne peut plus être récupérée.
```

## En-tête partagé : informations sur la ligne et son emplacement

En haut de tous les onglets, {{app_name}} affiche un **en-tête** avec les informations sur le circuit que vous mesurez :

| **Champ** | **Description** | **Notes** |
|---|---|---|
| **Liaison** | Nom de la ligne de transport ou de distribution | Lecture seule ; défini dans la section |
| **Tension** | Tension nominale de la ligne | Lecture seule ; défini dans la section |
| **Type de portée** | « Phase » ou « Garde » | Lecture seule ; défini dans la section |
| **Numéro de phase** | Quelle phase (si le type de portée est Phase) | Lecture seule ; affiché uniquement pour les portées de type Phase |
| **Nombre de câbles** | Nombre de conducteurs dans la portée | Lecture seule ; défini dans la section |

Sous les informations en lecture seule, saisissez le **lieu où vous avez enregistré la mesure** :

| **Champ** | **Unité** | **Plage** | **Obligatoire** | **Notes** |
|---|---|---|---|---|
| **Portée** | — | liste déroulante | Oui | Sélectionne la portée entre deux supports. {{app_name}} sélectionne automatiquement la première portée disponible. |
| **Longitude** | degrés (°) | −180 à +180 | Oui | Coordonnée GPS ou cartographique (l'ouest est négatif, l'est est positif). Si la portée de l'étude sélectionnée contient une localisation enregistrée, {{app_name}} la complète automatiquement à partir de ces données d'étude. |
| **Latitude** | degrés (°) | −90 à +90 | Oui | Coordonnée GPS ou cartographique (le sud est négatif, le nord est positif). Si la portée de l'étude sélectionnée contient une localisation enregistrée, {{app_name}} la complète automatiquement à partir de ces données d'étude. |
| **Altitude** | mètres (m) | −100 à 9000 | Oui | Altitude au-dessus du niveau de la mer (NGF). {{app_name}} la calcule automatiquement à partir des hauteurs de support de la portée ; vous pouvez la modifier manuellement. |
| **Azimut** | degrés (°) | −180 à +180 | Oui | Direction du câble, mesurée dans le sens horaire à partir du nord (0°). L'application peut la remplir à partir de la localisation de la portée dans l'étude, si elle existe. |

### Localisation automatique depuis l'étude

Lorsqu'une portée est sélectionnée, {{app_name}} tente de préremplir la longitude, la latitude et l'azimut à partir de la localisation déjà enregistrée dans l'étude en cours pour cette portée.

La valeur utilisée dépend de la portée sélectionnée et du support de référence choisi :
- L'application prend la localisation étudiée de la portée sélectionnée.
- Si un support de référence a été choisi, elle utilise la localisation associée à ce support.
- Si aucun support de référence n'est sélectionné, elle revient au support gauche de la portée courante.
- Le résultat est ensuite écrit dans les champs de mesure afin que l'utilisateur puisse le valider ou le modifier avant de sauvegarder.

Si l'étude ne contient pas assez de données de localisation pour cette portée, {{app_name}} affiche le message d'information : **Localisation non disponible dans l'étude**. Dans ce cas, l'utilisateur peut toujours saisir les valeurs manuellement.

## Onglet Données terrain : conditions environnementales

Saisissez les conditions environnementales observées lors de la mesure :

| **Champ** | **Unité** | **Plage** | **Obligatoire** | **Notes** |
|---|---|---|---|---|
| **Nom de la mesure** | — | texte, unique | Oui | Nom de cette session de mesure. Il ne doit pas dupliquer une mesure existante dans la même section. Si vous essayez d'utiliser un nom en double, un message d'erreur apparaît : **Le nom de la mesure doit être unique.** |
| **Date** | — | jj/mm/aa | Oui | Date de la mesure. Utilisez le sélecteur de date. |
| **Heure** | format 24 h (HH:mm) | heure valide | Oui | Heure de la mesure (au format 24 h). |
| **Saison** | — | Été / Hiver | Oui | {{app_name}} la détecte automatiquement à partir des règles de l'heure d'été. Vous pouvez la modifier si nécessaire. |
| **Température ambiante** | °C | −50 à +99 | Oui | Température de l'air au point de mesure. |
| **Vitesse du vent** | km/h ou m/s | 0 à 50 | Oui | Vitesse moyenne du vent pendant la mesure. Choisissez votre unité préférée (km/h ou m/s) via le bouton de bascule. |
| **Direction du vent** | — | 8 points cardinaux | Oui | Direction d'où vient le vent (Nord, Nord-Est, Est, Sud-Est, Sud, Sud-Ouest, Ouest, Nord-Ouest). |
| **Couverture nuageuse** | N0 à N8 (nébulosité) | 9 valeurs | Oui | Couverture nuageuse sur une échelle de N0 (ciel clair) à N8 (ciel entièrement couvert). N0, N3, N4, N7 sont non étiquetés ; N1 = Ensoleillé, N2 = Partiellement nuageux, N5 = Nuageux, N6 = Ciel couvert, N8 = Couvert / enfumé. |

```{note}
Tous les champs de l'onglet Données terrain sont obligatoires. {{app_name}} affiche un message d'information en haut : **Tous les champs sont obligatoires**.
```

## Validation et messages d'erreur

Pendant que vous saisissez, {{app_name}} valide vos entrées :

- **Nom de mesure en double** : si votre nom correspond à une mesure existante, un message d'erreur apparaît sous le champ du nom : **Le nom de la mesure doit être unique.** Modifiez le nom pour corriger le problème.
- **Plages invalides** : si un champ numérique (par exemple, la vitesse du vent) sort de la plage autorisée, {{app_name}} peut mettre le champ en surbrillance lorsque vous essayez d'enregistrer.
- **Champ obligatoire vide** : si vous laissez un champ requis vide, les boutons **Enregistrer** et **Exporter** restent désactivés.

Dès que tous les champs sont valides et que vous avez apporté des modifications, le bouton **Enregistrer** devient actif. Si les quatre onglets (Données terrain, Calcul du paramètre, Calcul de la température, Paramètre à 15 °C sans vent) sont valides, le bouton **Exporter** devient également actif.

## Actions de la boîte de dialogue

Au bas de la boîte de dialogue, trois boutons contrôlent la session de mesure :

- **Rapport** (désactivé dans la version actuelle) : réservé à une future fonctionnalité de reporting.
- **Exporter** : génère un fichier JSON avec toutes les données de mesure et les résultats calculés. Il est activé uniquement lorsque tous les onglets sont valides. Le nom du fichier suit le motif : `Export Mesure de terrain_<nom de mesure>_<nom de section>_<date>.json`.
- **Enregistrer** : enregistre vos saisies dans la base de données. Il est activé quand le formulaire est valide et que des modifications non enregistrées sont présentes.

## Conseils

```{tip}
**Valeurs préremplies automatiquement** : lorsque vous créez une nouvelle mesure, {{app_name}} préremplit :
  - la date et l'heure avec « aujourd'hui / maintenant »
  - la saison avec la saison courante (selon les règles de l'heure d'été)
  - la portée avec la première portée disponible de la section
  - l'altitude avec le milieu des hauteurs de support de la portée (modifiable)
```

```{tip}
**Saisie des coordonnées** : utilisez des degrés décimaux pour les coordonnées (par exemple, 45,1234 pour la latitude, 2,5678 pour la longitude). Évitez de mélanger les formats degrés/minutes/secondes.
```

Voir aussi : {doc}`Calcul du paramètre <parameter_calculation>`, {doc}`Calcul de la température <temperature_calculation>`, {doc}`Paramètre à 15 °C sans vent <parameter_15c_without_wind>`.
