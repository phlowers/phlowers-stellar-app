# CRR de brins coupés

## Objectif

Lorsque certains brins d'un câble sont coupés, le câble perd une partie de sa résistance. L'outil
**CRR de brins coupés** permet de saisir le nombre de brins coupés dans les trois premières
couches du câble, et calcule :

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

### Brins coupés couche 1, 2 et 3

Un champ pour chacune des trois premières couches du câble qui ont des brins dans le catalogue de
câbles. Le nombre à côté du champ (par exemple **/ 12**) est le nombre de brins de la couche. Les
autres couches ne sont pas affichées : aucun brin n'y est considéré comme coupé.

Saisissez le nombre de brins coupés dans la couche : un nombre entier entre **0** et le nombre de
brins de la couche. Les champs sont obligatoires et valent **0** par défaut.

Si le catalogue de câbles n'a pas de données de brins pour le câble, le message **Aucune donnée
de couche de brins disponible pour ce câble** remplace ces champs, et le calcul est indisponible.

### Ajouter un marquage

Cochez cette case pour marquer la coupure sur le graphique du studio, en 2D comme en 3D. Le
marquage apparaît une fois l'entrée enregistrée : une icône de ciseaux, reliée par un trait en
pointillés à son point d'ancrage.

- Sans distance au support de référence, l'icône se tient au-dessus du support de référence.
- Avec une distance, elle se tient au-dessus du point du câble situé à cette distance du support de
  référence.

L'icône reste à la même distance de son point d'ancrage à l'écran, quel que soit le zoom. Survolez-la
pour afficher **Brins coupés**, et cliquez dessus pour ouvrir l'outil **CRR de brins coupés**. Le
marquage s'affiche aussi dans l'onglet **Vue graphique** du formulaire de canton : voir
[Consulter l'entrée depuis le formulaire de canton](#view-mode).

Le marquage n'est affiché que lorsque la portée fait partie des supports affichés. Il disparaît
quand l'entrée est supprimée, ou enregistrée sans la case cochée.

:::{note}
La portée, le support de référence et la distance situent la coupure, et le marquage est une
option d'affichage : aucun d'eux ne modifie les résultats. La résistance réduite s'applique au
canton entier, quelle que soit la portée sur laquelle les brins sont coupés.

Cocher ou décocher **Ajouter un marquage** après un calcul laisse **Enregistrer** disponible, avec
le marquage tel qu'il est maintenant.
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
| **Enregistrer** | Enregistre l'entrée avec le canton. Disponible uniquement après un calcul, tant qu'aucun champ autre que **Ajouter un marquage** n'a changé depuis. |
| **Supprimer** | Supprime l'entrée enregistrée. Disponible uniquement quand le canton en a une. |

Pendant un calcul, un enregistrement ou une suppression, les trois boutons sont indisponibles.

---

(view-mode)=
## Consulter l'entrée depuis le formulaire de canton

Sur la page de l'étude, l'onglet **Vue graphique** du formulaire de canton affiche lui aussi le
marquage. Un clic dessus ouvre l'outil **CRR de brins coupés** en consultation : l'entrée
enregistrée est affichée avec ses résultats, mais chaque champ est en lecture seule et aucun bouton
n'est affiché. Utilisez l'outil depuis le **Studio** pour modifier ou supprimer l'entrée.

---

## Effets dans le studio

Les brins coupés enregistrés s'appliquent au studio, même outil fermé :

- à l'ouverture du canton, puis après chaque enregistrement ou suppression, le studio en tient
  compte : le **Taux de travail** sous le graphique est calculé avec la CRR réduite ;
- l'icône de ciseaux à côté du **Taux de travail** est rouge quand au moins un brin est coupé dans
  l'entrée enregistrée, et grise sinon ;
- si le studio ne peut pas en tenir compte, le message **Échec de la mise à jour du studio avec les
  brins coupés CRR** s'affiche. Enregistrer de nouveau l'entrée retente.

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
Toute modification après un calcul, y compris la portée, le support de référence ou la distance,
rend **Enregistrer** indisponible. Cliquez de nouveau sur **Calculer** avant d'enregistrer :
l'entrée enregistrée correspond toujours aux résultats affichés. **Ajouter un marquage** fait
exception : il ne modifie pas les résultats.
:::

---

## Bon à savoir

- Lorsque vous ouvrez l'outil sur un canton qui a une entrée enregistrée, le formulaire est rempli
  avec celle-ci et le calcul se lance automatiquement : les résultats ne sont pas enregistrés.
- Fermer l'outil abandonne les modifications non enregistrées.
- Si la portée d'une entrée enregistrée disparaît du canton, par exemple quand l'un de ses
  supports est supprimé, l'entrée est supprimée aussi, et une notification vous en informe. Une
  entrée liée au canton entier est conservée.
- Si le câble du canton change, l'entrée enregistrée est supprimée, et une notification vous en
  informe : les brins coupés étaient comptés sur les couches du câble précédent.
- Le bouton **Détail des couches** n'est pas encore disponible.

## Messages

| Message | Signification |
|---|---|
| **Brins coupés CRR enregistrés** | L'entrée est enregistrée avec le canton. |
| **Brins coupés CRR supprimés** | L'entrée enregistrée est supprimée. |
| **Échec du calcul de la CRR** | Le calcul n'a pas pu aboutir. Les résultats sont effacés. |
| **Échec de l'enregistrement des brins coupés CRR** | L'entrée n'a pas pu être enregistrée. La précédente est conservée. |
| **Échec de la suppression des brins coupés CRR** | L'entrée n'a pas pu être supprimée. |
| **Échec de la mise à jour du studio avec les brins coupés CRR** | Les calculs du studio n'ont pas pu tenir compte de l'entrée enregistrée, après un enregistrement, une suppression ou un calcul. |
