# Visées tangentes

## À quoi servent-elles ?

La méthode **Visées tangentes** calcule le paramètre du câble d'une portée à partir d'une seule visée : l'angle de la **tangente au câble** vu depuis l'appareil de mesure, complété par les angles verticaux vers les points d'accrochage du câble des deux supports.

Selon l'endroit où l'opérateur place l'appareil, trois variantes sont proposées dans l'onglet **Calcul du paramètre** :

| Variante | Option du sélecteur | Position de l'appareil |
|---|---|---|
| **Support** | Visées tangentes (Support) | À la verticale du point d'accrochage du câble du support de gauche |
| **Intérieur** | Visées tangentes (Intérieur) | Dans la portée, à droite du support de gauche |
| **Extérieur** | Visées tangentes (Extérieur) | En dehors de la portée, à gauche du support de gauche |

Dans les trois cas, le résultat est le même type de grandeur : le paramètre du câble, son incertitude et un contrôle de validité. Il alimente l'onglet **Paramètre à 15 °C sans vent**, comme le résultat PAPOTO.

```{note}
Les angles sont exprimés en **grades (gr)** et les longueurs en **mètres**. Tous les champs affichés sont **obligatoires** pour lancer le calcul.
```

## Champs communs aux trois variantes

| Libellé | Unité | Signification |
|---|---|---|
| **Support de gauche** | — | Extrémité de la portée considérée comme le support « gauche ». Par défaut, le support de gauche de la portée sélectionnée. |
| **Dist. horizontale entre accr. câble mesurée** | m | Distance mesurée entre les deux points d'accrochage du câble. Une **valeur calculée** (lecture seule) issue de l'analyse du terrain permet de la comparer à votre mesure. |
| **Angle tangent au câble** | gr | Angle de visée de la tangente au câble, entre −200 et 200 gr. |
| **Type de calcul** | — | **Tangente** : le paramètre est déduit de l'angle tangent. Le type **Paramètre** peut être sélectionné et enregistré, mais le calcul n'est pas encore disponible pour lui. |

## Variante Support

L'appareil est placé **directement sous (ou sur) le point d'accrochage du câble du support de gauche** : il n'y a donc aucun décalage horizontal.

| Libellé | Unité | Signification |
|---|---|---|
| **Dist. verticale de l'appareil à l'accr. câble du support de gauche** | m | Hauteur entre l'appareil et le point d'accrochage du câble gauche. |
| **Angle vertical de l'appareil à l'accr. câble du support de droite** | gr | Angle de visée vers le point d'accrochage du câble du support de droite. |

L'angle vers le support de gauche n'est pas saisi : il est nul par construction.

## Variante Intérieur

L'appareil est placé **dans la portée**, à une distance horizontale du support de gauche mesurée vers le support de droite.

| Libellé | Unité | Signification |
|---|---|---|
| **Dist. horizontale de l'appareil à l'accr. câble du support gauche** | m | Distance horizontale entre l'appareil et le support de gauche. |
| **Angle vertical de l'appareil à l'accr. câble du support de gauche** | gr | Angle de visée vers le point d'accrochage du câble du support de gauche. |
| **Angle vertical de l'appareil à l'accr. câble du support de droite** | gr | Angle de visée vers le point d'accrochage du câble du support de droite. |

## Variante Extérieur

L'appareil est placé **hors de la portée, du côté du support de gauche** (à gauche de celui-ci). Les champs sont identiques à ceux de la variante Intérieur ; seule la position de l'appareil change : la distance horizontale saisie est mesurée **vers l'extérieur** de la portée, à partir du support de gauche.

## Lancer le calcul

Le bouton **Calculer** est actif lorsque :

- tous les champs affichés sont renseignés et dans leurs bornes ;
- le type de calcul sélectionné est **Tangente** (avec le type **Paramètre**, le bouton reste inactif) ;
- aucun calcul n'est en cours (un indicateur de chargement s'affiche pendant le traitement).

Si le calcul échoue, un message d'erreur s'affiche sous le bouton (« Échec du calcul du paramètre par visées tangentes », avec la variante entre parenthèses pour Extérieur et Intérieur).

## Lire le résultat

Après clic sur **Calculer**, la section **Résultats** affiche :

- le **paramètre** (en m) ;
- l'**incertitude** sur le paramètre (en m) ;
- le **critère 1 %** : « Oui » (critère respecté) ou « Non » (critère non respecté).

Modifier un champ affiché invalide le résultat précédent (et le paramètre à 15 °C automatique qui en dépendait) : relancez le calcul.

```{note}
Une seule méthode de calcul est conservée à l'enregistrement de la mesure. Les saisies des autres méthodes (PAPOTO, autres variantes de visées tangentes, PEP) sont effacées.
```

## Rapport et export

Une fois la mesure enregistrée, les boutons **Rapport** et **Exporter** de la boîte de dialogue sont disponibles pour les trois variantes (voir {doc}`terrain_data`). Seule la variante retenue est reportée :

- le **rapport PDF** présente la méthode et le support de gauche, les longueurs de portée mesurée et calculée, la distance et les angles saisis, le type de calcul avec la valeur saisie (angle tangent ou paramètre), puis le paramètre, l'incertitude et le critère 1 % ;
- l'**export JSON** décrit la variante dans `parameterCalculation` : `methodName` vaut `VISEES_TANGENTES`, `subMethodName` vaut `SUPPORT`, `EXTERIEUR` ou `INTERIEUR`, et le bloc `tangentialSights` contient les mesures saisies et, si le calcul a été fait, le paramètre calculé avec son critère (`threshold` de 1 %).

Dans l'export, la distance de la variante **Support** est reportée comme distance verticale côté gauche (`leftSupportMeasures.verticalDistance`) et son angle vertical comme angle côté droit (`rightSupportMeasures.verticalAngle`). Les variantes **Intérieur** et **Extérieur** reportent la distance horizontale et l'angle vertical côté gauche (`leftSupportMeasures.horizontalDistance`, `leftSupportMeasures.verticalAngle`) ainsi que l'angle vertical côté droit.
