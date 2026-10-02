# Calcul de la température

## Vue d'ensemble

L'onglet **Calcul de la température** permet de calculer la température du câble dans les conditions réelles du terrain. En combinant la température ambiante, le transit, la vitesse la direction du vent ainsi que le rayonnement solaire, {{app_name}} applique les équations d'équilibre thermique via la librairie mechaphlowers pour estimer la température du conducteur à l'état stationnaire. Cette valeur est essentielle pour évaluer la position du câble.

Tous les champs affichés dans cet onglet sont obligatoires pour lancer le calcul, à l'exception du champ **Rayonnement solaire direct (non requis)**, qui peut être laissé vide si vous choisissez de ne pas le mesurer directement.

---

## Entrées

| Libellé | Unité | Obligatoire ? | Signification et plage |
|-------|------|-----------|-----------------|
| **Nom du câble** | — | Oui | Nom du conducteur mesuré (affiché depuis le catalogue). |
| **Température ambiante** | °C | Héritée | Température de l'air au moment de la mesure (lecture seule, copiée depuis l'onglet **Données terrain**). |
| **Transit** | A | Oui | Courant circulant dans le conducteur au moment de la mesure. **Plage : 0–4000 A**. Validation : minimum 0 A, maximum 4000 A. |
| **Vitesse du vent** | km/h ou m/s | Héritée | Vitesse du vent depuis l'onglet **Données terrain** (avec bascule d'unité). Par défaut 0 si non renseignée. |
| **Direction du vent** | — | Héritée | Direction cardinale (Nord, Nord-Est, Est, Sud-Est, Sud, Sud-Ouest, Ouest, Nord-Ouest) depuis l'onglet **Données terrain**. |
| **Incidence du vent** | degrés | Calculée | Angle d'attaque du vent sur le câble. **Mode auto** (par défaut) : calculé à partir de l'azimut du câble et de la direction du vent ; **mode perpendiculaire** : fixé à 90°. Nécessite l'azimut et la direction du vent pour calculer. |
| **Rayonnement solaire direct** | W/m² | Non | Rayonnement solaire direct mesuré en option. **Plage : 0–2000 W/m²**. S'il est laissé vide, il ne sera pas utilisé dans le calcul (voir la note ci-dessous). Cliquez sur **Estimer** pour le calculer automatiquement à partir de la couverture nuageuse et de la position. |
| **Couverture nuageuse** | — | Oui | Couverture nuageuse sur l'échelle N0–N8 (N0 = ciel clair, N8 = totalement couvert). Sélectionnez dans la liste déroulante. Peut être estimée automatiquement à partir du rayonnement solaire mesuré si vous cliquez sur **Estimer**. |
| **Rayonnement solaire diffus** | W/m² | Calculé | Rayonnement solaire diffus (diffus) sur un plan horizontal, calculé automatiquement à partir de la date, de l'heure, de la position et de la couverture nuageuse. |
| **Rayonnement solaire direct** | W/m² | Calculé | Rayonnement solaire direct sur un plan horizontal, calculé automatiquement. |
| **Rayonnement diffus + direct** | W/m² | Calculé | Rayonnement global horizontal total (somme du diffus et du direct). |

---

## Comment l'utiliser

### 1. Remplir les entrées obligatoires

Assurez-vous que l'onglet **Données terrain** est bien complété au préalable (coordonnées, date, heure, nom du câble, etc.). L'onglet de calcul de température hérite de :
- la température ambiante
- la date et l'heure
- les coordonnées (longitude, latitude, altitude)
- l'azimut du câble
- la vitesse et la direction du vent

### 2. Sélectionner la couverture nuageuse

Choisissez une valeur de couverture nuageuse (N0–N8) dans la liste déroulante **Couverture nuageuse**. En cas d'incertitude :

1. Saisissez ou mesurez la valeur du **Rayonnement solaire direct** (0–2000 W/m²).
2. Cliquez sur le bouton **Estimer**.
   - {{app_name}} utilisera la géométrie solaire et votre mesure pour déduire la couverture nuageuse.
   - La liste déroulante se remplira automatiquement ; vous pouvez néanmoins la remplacer manuellement.
   - Si l'heure correspond à la nuit, un message d'erreur s'affiche : « La couverture nuageuse n'a pas pu être estimée à partir des valeurs fournies. Veuillez vérifier les valeurs et réessayer. »

### 3. Saisir le transit (courant)

Saisissez le courant mesuré (0–4000 A) dans le champ **Transit**. Il s'agit du courant de régime permanent ou du courant instantané au moment de la mesure.

### 4. Ajuster l'incidence du vent (facultatif)

- **Mode auto** (par défaut) : l'incidence du vent est calculée automatiquement à partir de l'azimut du câble et de la direction du vent.
  - Si l'azimut ou la direction du vent manque, un avertissement apparaît : « La direction du vent et l'azimut sont requis. »
- **Mode perpendiculaire** : le vent frappe le câble perpendiculairement (90°). Utilisez cette option si les conditions de mesure diffèrent de l'azimut canonique.

### 5. Cliquer sur Calculer

Une fois tous les champs obligatoires remplis et dans les limites autorisées, le bouton **Calculer** devient actif. Cliquez dessus pour lancer le calcul de l'équilibre thermique.

---

## Résultats

Après le calcul, une section de résultats s'ouvre en dessous affichant :

| Libellé | Unité | Signification |
|-------|------|---------|
| **Température du câble** | °C | Température de cœur du câble à l'état stationnaire dans les conditions mesurées. Elle varie généralement de 20 à 80 °C selon le courant et les conditions ambiantes. |
| **Température du câble (incertitude)** | °C | Intervalle d'incertitude (par exemple ±1,0 °C) prenant en compte les erreurs de mesure et les approximations du modèle. |
| **Flux solaire sur le câble** | W/m² | Rayonnement solaire absorbé par la section du câble (actuellement vide / nul dans le calcul, réservé à une utilisation future). |

### Exemple de résultat
```
Température du câble : 45,3 °C
Température du câble (incertitude) : 1,1 °C
Flux solaire sur le câble : —
```

---

## Remarques importantes

### Champ de rayonnement solaire direct

Le champ **Rayonnement solaire direct (non requis)** est optionnel. Son objectif est de vous aider à estimer la couverture nuageuse si vous disposez d'une mesure directe. Après estimation, le champ affiche : **« Il ne sera pas utilisé dans le calcul. »**

Le calcul thermique utilise le total **Rayonnement diffus + direct** (calculé automatiquement à partir de la couverture nuageuse), et non la valeur mesurée que vous saisissez.

### Erreurs de validation

- **« Valeur minimale de transit : 0 A. »** — Votre valeur de transit est inférieure à 0 A.
- **« Valeur maximale de transit : 4000 A. »** — Votre valeur de transit dépasse 4000 A.
- **« Tous les champs sont obligatoires pour le calcul de la température. »** — Un ou plusieurs champs obligatoires sont vides (affiché en haut de l'onglet). 

### Limites selon les conditions météorologiques

- Une mesure effectuée **de nuit** (quand le soleil est sous l'horizon) fera échouer le bouton **Estimer**, car le rayonnement solaire est nul. Fournissez plutôt une couverture nuageuse manuelle.
- Le calcul suppose des conditions **stationnaires** ; les effets transitoires (par exemple, un changement brusque du courant) ne sont pas modélisés.

---

## Liens vers les pages associées

- {doc}`Données terrain <terrain_data>` — Définissez les coordonnées, la date, l'heure et les détails du câble.
- {doc}`Calcul du paramètre <parameter_calculation>` — Utilisez les méthodes PAPOTO ou visée tangentielle pour calculer le paramètre de fléchage de la portée.
- {doc}`Paramètre à 15 °C sans vent <parameter_15c_without_wind>` — Calibrez le paramètre dans des conditions standard à l'aide de la température calculée du câble.
