# CRR de brins coupés

## Objectif

Lorsque certains brins d'un câble sont coupés, le câble perd une partie de sa résistance. L'outil
**CRR de brins coupés** permet de saisir le nombre de brins coupés dans chaque couche du câble, et
calcule :

- la **CRR** (charge de rupture résiduelle) du câble, en daN : la résistance qu'il reste au câble ;
- le **nouveau taux de travail max** du canton avec cette résistance réduite, en %.

Vous pouvez ensuite enregistrer les brins coupés avec le canton.

---

## Accès

1. Ouvrez une étude, puis un canton dans le **Studio**.
2. Dans la barre d'outils du haut, ouvrez le menu **Outils**.
3. Cliquez sur **CRR de brins coupés**.

Vous pouvez aussi ajouter l'outil aux raccourcis de la barre d'outils avec le bouton d'édition en
fin de barre d'outils.

:::{note}
La barre d'outils est indisponible tant que le {doc}`positionnement libre <plot/free-positioning>`
est actif.
:::

---

## Informations affichées

| Information | Description |
|---|---|
| **Nom du câble** | Le câble du canton. |
| **Taux de travail max actuel** | Le taux de travail le plus élevé du canton, tel que calculé actuellement dans le studio : le **Taux de travail** affiché sous le graphique du studio en mode **Max canton**. |
| **Présence du personnel** | Indique si le personnel est présent sur le cas de charge sélectionné. Voir [Présence du personnel](#staff-presence). |

---

## Description des champs

### Portée

Sélectionnez la portée où les brins sont coupés. Le champ est facultatif : laissez-le vide pour
lier les brins coupés au canton entier.

Les champs **Support de référence**, **Distance au support de référence** et **Ajouter un
marquage** ne sont disponibles qu'une fois une portée sélectionnée. Retirer la portée les vide.

### Support de référence

Choisissez le support à partir duquel la distance est mesurée : le support gauche ou le support
droit de la portée. Le support gauche est sélectionné par défaut.

### Distance au support de référence (m)

Saisissez la distance en mètres entre le support de référence et la coupure. Le champ est
facultatif. La valeur doit être comprise entre **0** et **5 000 m**, avec au plus 2 décimales.

### Brins coupés couche 1, 2, …

Un champ pour chaque couche du câble qui a des brins dans le catalogue de câbles. Le nombre à côté
du champ (par exemple **/ 12**) est le nombre de brins de la couche.

Saisissez le nombre de brins coupés dans la couche : un nombre entier entre **0** et le nombre de
brins de la couche. Les champs sont obligatoires et valent **0** par défaut.

Si le catalogue de câbles n'a pas de données de brins pour le câble, le message **Aucune donnée
de couche de brins disponible pour ce câble** remplace ces champs, et le calcul est indisponible.

### Ajouter un marquage

Cochez cette case pour indiquer que la coupure doit être marquée sur le graphique du studio.

:::{note}
La portée, le support de référence et la distance situent la coupure, et le marquage est une
option d'affichage : aucun d'eux ne modifie les résultats. La résistance réduite s'applique au
canton entier, quelle que soit la portée sur laquelle les brins sont coupés.
:::

---

## Résultats

Cliquez sur **Calculer** pour afficher les résultats :

| Résultat | Description |
|---|---|
| **CRR du câble** | La résistance du câble une fois les brins coupés retirés, en daN. |
| **Nouveau taux de travail max** | Le taux de travail le plus élevé du canton avec cette CRR, en %, suivi d'une icône de statut. |

La CRR est la charge de rupture assignée (CRA) du câble, diminuée de la résistance de chaque brin
coupé :

$$\text{CRR} = \text{CRA}_{\text{câble}} - \sum_{\text{couches}} \text{brins coupés} \times \text{CRA d'un brin de la couche}$$

Le taux de travail d'une portée compare sa tension maximale, multipliée par le coefficient de
sécurité, à la CRR :

$$\text{taux de travail (\%)} = \frac{\text{tension maximale} \times \text{coefficient de sécurité}}{\text{CRR}} \times 100$$

Les résistances et le coefficient de sécurité proviennent du catalogue de câbles. Sans coefficient
de sécurité dans le catalogue, **1,5** est utilisé.

L'icône de statut évalue le nouveau taux de travail max :

| Icône | Nouveau taux de travail max | Signification |
|---|---|---|
| Coche verte | De 0 à 75 % | Satisfaisant |
| Point d'exclamation orange | Au-dessus de 75 %, jusqu'à 100 % | Préoccupant |
| Croix rouge | Au-dessus de 100 %, ou négatif | Dangereux |
| Icône grise, valeur **-** | Aucune valeur | Aucun nouveau taux de travail max |

Si le calcul échoue, par exemple quand le catalogue de câbles ne donne pas la résistance d'une
couche avec des brins coupés, le message **Échec du calcul de la CRR** s'affiche et les résultats
sont effacés.

---

(staff-presence)=
## Présence du personnel

Lorsque le personnel est présent, le coefficient de sécurité est multiplié par **1,5**, le taux de
travail est donc 1,5 fois plus élevé.

- La présence du personnel est l'option **Présence du personnel** du cas de charge sélectionné
  dans le studio. Vous la réglez à la création du cas de charge, et pouvez la modifier dans le
  tableau de charges.
- Sans cas de charge sélectionné, le personnel est considéré comme présent, ce qui est le cas le
  plus sûr. La barre de menu affiche alors **Personnel présent**.
- La présence du personnel s'applique à tout le studio : le **Taux de travail** sous le graphique
  du studio suit aussi le cas de charge sélectionné, et se met à jour quand le cas de charge ou sa
  présence du personnel change.

---

## Boutons

| Bouton | Rôle |
|---|---|
| **Calculer** | Calcule la CRR et le nouveau taux de travail max. Disponible uniquement quand chaque champ de brins coupés est valide. |
| **Enregistrer** | Enregistre l'entrée avec le canton. Disponible uniquement après un calcul, tant qu'aucun champ n'a changé depuis. |
| **Supprimer** | Supprime l'entrée enregistrée. Disponible uniquement quand le canton en a une. |

Pendant un calcul, un enregistrement ou une suppression, les trois boutons sont indisponibles.

---

## Flux type

1. Ouvrez l'outil depuis **Outils** → **CRR de brins coupés**.
2. Facultativement, sélectionnez la **portée** de la coupure, son **support de référence** et la
   **distance** à celui-ci, et cochez **Ajouter un marquage**.
3. Saisissez le nombre de **brins coupés** de chaque couche.
4. Cliquez sur **Calculer**, et vérifiez le **nouveau taux de travail max** et son statut.
5. Cliquez sur **Enregistrer** pour conserver l'entrée avec le canton.

:::{note}
Un canton contient une seule entrée de CRR de brins coupés. Enregistrer une nouvelle entrée
remplace la précédente.
:::

:::{note}
Toute modification après un calcul, y compris la portée, la distance ou le marquage, rend
**Enregistrer** indisponible. Cliquez de nouveau sur **Calculer** avant d'enregistrer : l'entrée
enregistrée correspond toujours aux résultats affichés.
:::

---

## Bon à savoir

- Lorsque vous ouvrez l'outil sur un canton qui a une entrée enregistrée, le formulaire est rempli
  avec celle-ci et le calcul se lance automatiquement : les résultats ne sont pas enregistrés.
- Fermer l'outil abandonne les modifications non enregistrées.
- Si la portée d'une entrée enregistrée disparaît du canton, par exemple quand l'un de ses
  supports est supprimé, l'entrée est supprimée aussi, et une notification vous en informe. Une
  entrée liée au canton entier est conservée.
- Le bouton **Détail des couches** n'est pas encore disponible, et aucun marquage n'est encore
  dessiné sur le graphique du studio.

## Messages

| Message | Signification |
|---|---|
| **Brins coupés CRR enregistrés** | L'entrée est enregistrée avec le canton. |
| **Brins coupés CRR supprimés** | L'entrée enregistrée est supprimée. |
| **Échec du calcul de la CRR** | Le calcul n'a pas pu aboutir. Les résultats sont effacés. |
| **Échec de l'enregistrement des brins coupés CRR** | L'entrée n'a pas pu être enregistrée. La précédente est conservée. |
| **Échec de la suppression des brins coupés CRR** | L'entrée n'a pas pu être supprimée. |
| **Échec de la mise à jour du studio avec les brins coupés CRR** | L'entrée est enregistrée ou supprimée, mais les calculs du studio n'ont pas pu en tenir compte. |
