# Tranchées forestières

## Objectif

Sous un câble, la végétation doit rester à bonne distance du câble, quelles que soient les
conditions météo. L'outil **Tranchées forestières** vérifie cette distance le long d'une ou
plusieurs portées consécutives : il découpe chaque portée en plusieurs points, et calcule en
chacun d'eux la position du câble dans les conditions climatiques des règles de conformité.

Pour chaque point, l'outil donne :

- l'**altitude du câble** et sa **hauteur au-dessus du sol** ;
- la **hauteur limite de conformité en surplomb** : la hauteur au-dessus du sol jusqu'à laquelle la
  végétation peut monter sous le câble sans atteindre la distance de surplomb de la règle ;
- la **distance latérale** du câble à l'axe de la portée, et la **limite latérale** de la règle.

Le résultat est un **graphique** en vue en plan, et un **tableau** de valeurs par portée.

---

## Accès

1. Ouvrez une étude, puis un canton dans le **Studio**.
2. Dans la barre d'outils du haut, ouvrez le menu **Outils**.
3. Cliquez sur **Tranchées forestières**.

Vous pouvez aussi ajouter l'outil aux raccourcis de la barre d'outils avec le bouton d'édition en
fin de barre d'outils.

:::{note}
La barre d'outils est indisponible tant que le {doc}`positionnement libre <plot/free-positioning>`
est actif.
:::

---

## Description des champs

### Support de départ

Le premier support de la plage étudiée. Par défaut, c'est le premier support du canton.

### Support d'arrivée

Le dernier support de la plage étudiée. Il doit être **après** le support de départ, sinon le
bouton **Calculer** reste indisponible. Toutes les portées comprises entre les deux supports sont
calculées.

### Nombre de points de découpage du sol

Le nombre de points répartis régulièrement sur chaque portée, supports d'extrémité compris. Les
valeurs proposées viennent du catalogue. Plus il y a de points, plus le profil est détaillé, et
plus le calcul est long.

### Tension électrique

La tension électrique du canton. Elle sélectionne les distances minimales de chaque règle. Elle ne
peut pas être modifiée ici, et le canton doit en avoir une pour calculer.

### Zone de vent

La zone de vent qui donne la pression du vent utilisée par les règles qui dépendent du vent. Une
zone par défaut est sélectionnée.

### Vent -

Inverse le sens du vent du cas **latéral**. Le câble latéral et le câble latéral inverse sont
échangés dans le graphique.

### Présence de zone rouge

Cochez cette case lorsque les portées se trouvent en zone rouge, où une pression du vent plus élevée
s'applique. La pression de la zone de vent sélectionnée devient alors celle de la zone rouge, pour
toutes les règles sélectionnées. La valeur par défaut vient du catalogue.

### Température de répartition (°C)

La température du câble pour le cas **surplomb** des règles qui ne fixent pas la leur. Une valeur par
défaut est proposée.

### Temp. de distance latérale (°C)

La température du câble pour le cas **latéral** des règles qui ne fixent pas la leur. Le libellé est
précédé du nom de la règle du catalogue dont la température latérale sert de référence, et
l'indication sous le champ vient également du catalogue.

Les deux températures sont obligatoires, entre **0** et **250 °C**, avec jusqu'à 2 décimales.

### Conformité

Les règles à vérifier. Les règles proposées sont celles des tranchées forestières dans le catalogue,
pour le surplomb et pour le latéral. Les règles actives pour le sol sont sélectionnées par défaut. Au
moins une règle doit être sélectionnée. Voir {doc}`Conformité <conformity>` pour le principe des
règles.

### Calculer

Lance le calcul. Le bouton est disponible lorsque le formulaire est valide, que la tension électrique
du canton est définie, que le support d'arrivée est après le support de départ et qu'au moins une
règle est sélectionnée.

Si la configuration des tranchées forestières est absente du catalogue, le bouton reste indisponible
et un message le signale. Fermez les autres onglets de Stellar, puis rechargez l'application.

---

## Résultats

### Graphique

Le graphique montre la portée vue du dessus (**vue en plan**) :

- l'axe horizontal est la **distance au support de gauche**, en mètres. Les repères portent le nom
  du support de gauche, les fractions de la portée (1/4, 1/2, 3/4…) et le nom du support de droite ;
- l'axe vertical est la **distance latérale signée depuis l'axe de la portée**, en mètres. Les deux
  axes ont la même échelle, et les valeurs positives sont tracées vers le bas.

La ligne en pointillés noirs est l'**axe de la portée**, avec une petite croix à chaque point de
découpage. Chaque règle sélectionnée trace :

- le **câble en surplomb**, dans la couleur du surplomb configurée dans le catalogue ;
- pour le latéral, le **câble latéral** et la **limite latérale**, puis le **câble latéral inverse** et
  la **limite latérale inverse**, dans la couleur de la règle.

Survolez une courbe pour lire ses coordonnées en mètres, et zoomez avec la molette de la souris. La
légende n'apparaît que lorsque la vue graphique est agrandie.

### Portée

La liste **Portée** choisit la portée affichée parmi celles calculées. Chaque option indique le
support de gauche et le support de droite. La première portée est sélectionnée par défaut.

### F1 médian à la répartition (m)

La flèche de la portée dans l'état de surplomb, à la température de répartition et sans vent.
Elle n'apparaît que lorsqu'au moins une règle de surplomb est sélectionnée.

### Tableau

Le tableau a une colonne par point de découpage, et les lignes suivantes, en mètres, avec deux
décimales. La température **T** entre parenthèses est celle de la règle si elle en fixe une, sinon
celle du formulaire : la température de répartition pour le surplomb, et la température de distance
latérale pour le latéral.

| Ligne | Signification |
|---|---|
| **Distance au support de gauche** | Position du point sur la portée. |
| **Altitude du sol** | Altitude du sol au point. |
| **Altitude du câble : <règle> surplomb (T °C)** | Altitude du câble dans l'état de surplomb. |
| **Altitude du câble : <règle> latéral (T °C)** | Altitude du câble dans l'état latéral. |
| **Hauteur du câble : <règle> surplomb (T °C, par rapport au sol)** | Altitude du câble moins l'altitude du sol. |
| **Hauteur limite de conformité en surplomb : <règle>** | Hauteur du câble moins la distance de surplomb de la règle : c'est la hauteur au-dessus du sol jusqu'à laquelle la végétation reste à la distance de surplomb. Une valeur négative signifie que le sol lui-même est plus proche du câble que la distance de surplomb. |
| **Axe de la portée au câble : <règle> latéral (T °C)** | Distance latérale signée du câble à l'axe de la portée, dans l'état latéral. |
| **Axe de la portée à la limite latérale : <règle>** | Distance latérale signée de la limite latérale à l'axe de la portée. |

Les distances sont mesurées dans un plan vertical perpendiculaire à l'axe de la portée, passant par
chaque point de découpage. Aux supports d'extrémité, c'est le point d'attache du câble qui est
utilisé.

### Agrandir le graphique

**Agrandir la vue graphique** masque le formulaire et le tableau, et affiche la légende.
**Réduire la vue graphique** les rétablit.

---

## Enregistrement

Il n'y a pas de bouton **Enregistrer**. Après un calcul réussi, les valeurs du formulaire sont
enregistrées automatiquement avec le canton. Les résultats, eux, ne sont pas enregistrés.

Lorsque vous rouvrez l'outil sur le canton, le formulaire est rempli avec les valeurs enregistrées,
mais le calcul ne se relance pas tout seul : cliquez sur **Calculer** pour afficher les résultats.

---

## Flux type

1. Ouvrez l'outil depuis **Outils** → **Tranchées forestières**.
2. Choisissez le **support de départ** et le **support d'arrivée**, puis le **nombre de points de
   découpage du sol**.
3. Vérifiez la tension électrique, la **zone de vent**, les températures et les règles.
4. Cliquez sur **Calculer**.
5. Parcourez les portées avec la liste **Portée**, et lisez le graphique et le tableau.

---

## Bon à savoir

- Les résultats ne sont pas enregistrés : fermer l'outil les fait disparaître.
- Un canton n'a qu'un seul jeu de valeurs enregistré, remplacé à chaque calcul réussi.
- Le sol utilisé est celui qui est enregistré pour chaque portée, dans l'onglet **Sol**. Après une
  modification du sol du canton, cliquez de nouveau sur **Calculer** : les résultats affichés ne
  suivent pas les changements.
- Une portée sans sol enregistré est calculée avec un sol rectiligne, entre les altitudes du sol au
  pied de ses deux supports.
- Les points situés au-delà du premier ou du dernier point du sol gardent l'altitude de ce point
  d'extrémité.
- Lorsque les valeurs enregistrées ne sont plus valides, par exemple une plage de supports qui n'existe
  plus, ou un nombre de points absent du catalogue, le formulaire revient aux valeurs par défaut. Les
  règles qui ne sont plus proposées sont retirées.

---

## Messages

| Message | Signification |
|---|---|
| **Les paramètres des tranchées forestières ont été enregistrés.** | Le calcul a réussi et les valeurs du formulaire sont enregistrées avec le canton. |
| **Échec du calcul des tranchées forestières : …** | Le calcul n'a pas pu aboutir. Le message indique la cause. Rien n'est enregistré. |
| *La configuration des tranchées forestières est absente du catalogue des obstacles…* | Le catalogue ne contient pas la configuration de l'outil. Fermez les autres onglets de Stellar, puis rechargez l'application. |

---

## Documentation associée

- {doc}`Conformité <conformity>` — les règles, les distances et la lecture du tableau de conformité.
- {doc}`Obstacles <obstacles>` — les obstacles du canton.
- {doc}`Positionnement libre <plot/free-positioning>` — placer les obstacles et le sol sur le graphique.
