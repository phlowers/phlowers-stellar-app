# Positionnement libre

Le mode **Positionnement libre** permet de placer des éléments ({doc}`obstacles <../obstacles>`,
sol, charges, repères de distance) sur une **portée unique et stable**. Pour
cela, le mode **fige** la portée courante ainsi que tous les contrôles susceptibles
de la modifier.

## Activer le positionnement libre

- Chaque onglet concerné (obstacle, sol, charges, distance) expose un interrupteur
  de positionnement libre.
- L'interrupteur est **désactivé tant que l'onglet n'a rien à positionner** :
  - Charges et distance exigent qu'une **portée soit sélectionnée** (portée de
    charge / support de distance).
  - Obstacle et sol exigent en plus qu'**au moins un point soit ajouté**
    (un point d'obstacle / un point de sol). Sélectionner la portée seule ne suffit
    pas : l'interrupteur reste désactivé tant qu'aucun point n'existe.
- Lorsque l'interrupteur est activé (**on**) :
  - La portée actuellement **sélectionnée dans l'onglet** (sa liste déroulante de
    portées) est **capturée une fois** et devient la *portée figée* pour toute la
    session de positionnement libre. La portée sur laquelle le graphique du studio
    a été zoomée en dernier n'a pas d'importance — la sélection de l'onglet prime.
  - La vue dans laquelle se trouvait le studio (3D / 2D, profil / face, fenêtre de
    supports, inversion, et la position de la caméra 3D) est **enregistrée**, afin
    de pouvoir être restaurée lorsque le mode est désactivé.
  - Le graphique est forcé en **vue 2D mono-portée** de la portée figée, quelle que
    soit la vue précédente.
  - L'onglet ouvert charge ses données pour cette portée figée.
  - Le graphique affiche cette portée et ne bouge pas.

### Repère de coordonnées dans l'onglet obstacle

Dans l'onglet **obstacle**, le positionnement libre fonctionne dans un repère de
coordonnées unique : **support de référence gauche**, **type d'altitude absolue** et
**type de distance latérale le long de la portée**. Lorsque le positionnement libre
est activé, ces trois champs du formulaire d'obstacle sont forcés à ces valeurs et
désactivés pour toute la session.

- Si le formulaire d'obstacle utilisait un repère différent (support de référence
  droit, altitude relative, ou un autre type de distance latérale), un
  **avertissement** s'affiche à l'entrée : *« Le mode de positionnement libre n'est
  disponible qu'avec un support de référence gauche, un type d'altitude absolue et
  un type de distance latérale le long de la portée. Les réglages actuels de
  l'obstacle diffèrent, les résultats peuvent donc être inexacts. »*
- Les coordonnées des points existants ne sont **pas converties** entre les repères :
  elles sont réinterprétées dans le repère forcé. Vérifiez les positions affichées
  après l'avertissement.

## Côté du support de référence (onglet sol)

Dans l'onglet **sol**, le support de référence peut être GAUCHE ou DROITE et reste
**modifiable** pendant que le positionnement libre est actif :

- Les points de sol sont enregistrés comme une *distance au support de référence*.
  Le graphique mesure les positions depuis le support **gauche** de la portée, donc
  lorsque le support de référence est DROIT, les points sont **inversés le long de
  la portée** (un point à la distance `d` du support droit est dessiné à
  `longueur de portée − d`).
- Changer de support de référence **conserve les points déjà placés en place** :
  le même profil de sol est simplement lu depuis l'autre extrémité, à la fois sur le
  graphique et dans le formulaire (qui inverse déjà les distances enregistrées et
  renverse l'ordre des points).
- Cliquer sur le graphique alors que le support de référence est DROIT remplit la
  distance du point **au support droit**, en cohérence avec ce que le formulaire
  affiche.

## Contrôles figés

Pendant que le positionnement libre est actif, les contrôles suivants sont
**désactivés** afin que rien ne puisse changer la portée de référence :

- Les boutons de zoom (retour à la portée / zoom sur la portée) de chaque onglet
  concerné.
- Le sélecteur de portée de chaque onglet (portée d'obstacle, portée de sol,
  portée de distance, portée de charge).
- La navigation globale entre portées (boutons portée précédente / suivante).
- Le sélecteur de nombre de portées et le curseur de portées.
- Le sélecteur de vue 3D / 2D.
- Le sélecteur profil / face.
- L'interrupteur d'inversion.

Il n'existe **aucun comportement réactif** susceptible de changer silencieusement la
portée sélectionnée pendant que le positionnement libre est actif. La portée figée
reste constante pendant toute la session.

## Changer de portée

La portée étant figée, elle ne peut pas être changée pendant que le positionnement
libre est actif. Pour travailler sur une autre portée :

1. Désactivez l'interrupteur de positionnement libre.
2. Changez de portée à l'aide de la navigation / du sélecteur de portée habituel.
3. Réactivez l'interrupteur de positionnement libre.

À la réactivation, la portée nouvellement sélectionnée est capturée comme nouvelle
portée figée (et la vue courante est à nouveau enregistrée comme celle à restaurer
à la sortie).

## Quitter le positionnement libre

Lorsque l'interrupteur est désactivé, tous les contrôles figés redeviennent
interactifs et le studio retrouve son comportement réactif normal. La vue
enregistrée lors de l'activation du mode — 3D / 2D, profil / face, fenêtre de
supports, inversion, et position de la caméra 3D — est **restaurée**, de sorte que
vous reveniez exactement là où vous étiez avant d'entrer dans le mode. Cela se
produit quelle que soit la manière dont le mode est désactivé (interrupteur,
changement d'onglet, ou sortie automatique).

Dans les onglets **obstacle** et **sol**, le positionnement libre se **désactive
également de lui-même** lorsque le dernier point modifiable est supprimé
(l'interrupteur repasse automatiquement sur off). Il n'y a alors plus rien à
positionner, et l'interrupteur resterait sinon désactivé sans moyen de quitter le
mode depuis cet onglet — l'interrupteur exige au moins un point pour être
interactif.
