# Paramètre à 15 °C sans vent

## Vue d'ensemble

Cet onglet calcule le **paramètre du câble dans une condition de référence normalisée** — température de 15 °C et vent nul — à partir de vos mesures de terrain. Le résultat est une valeur centrale avec des bornes d'incertitude inférieure et supérieure.

Ce paramètre standardisé est utile car :
- il permet de comparer des mesures prises dans des conditions météorologiques différentes
- il fournit une base pour identifier l'usure ou la dégradation du câble au fil du temps
- il sert de donnée d'entrée pour créer une **condition initiale** dans le modèle mécanique

## Mode de mise à jour : auto vs manuel

### Mode auto

**Auto** (par défaut) récupère automatiquement les quatre valeurs requises depuis les onglets précédents :
- **Paramètre** : depuis l'onglet **Calcul du paramètre** (résultat PAPOTO, visée tangente ou PEP)
- **Incertitude du paramètre** : également depuis l'onglet **Calcul du paramètre**
- **Température du câble** : depuis l'onglet **Calcul de la température**
- **Incertitude de la température** : également depuis l'onglet **Calcul de la température**

Utilisez **Auto** si vous faites confiance aux valeurs calculées dans les onglets précédents.

### Mode manuel

**Manuel** permet de saisir directement les quatre valeurs. Utilisez cette option si :
- vous disposez de mesures indépendantes ou corrigées
- vous souhaitez remplacer les valeurs des onglets précédents
- vous testez différents scénarios

Lorsque vous passez de **Auto** à **Manuel**, les champs non encore remplis sont automatiquement préremplis avec les valeurs **Auto** (tronquées pour l'affichage). Vos entrées manuelles existantes ne sont jamais écrasées.

## Champs d'entrée

En mode **Manuel**, vous devez saisir tous les éléments suivants :

| Champ | Unité | Signification | Exemple |
|---|---|---|---|
| **Paramètre (Papoto, etc.)** | m | Flèche ou extension mesurée du câble | 2500,1 |
| **Incertitude du paramètre** | m | Incertitude de mesure (écart type ou équivalent) | 15,5 |
| **Température du câble** | °C | Température du câble au moment de la mesure | 18,5 |
| **Incertitude de la température du câble** | °C | Incertitude de mesure de la température | 1,8 |

Les quatre champs sont **obligatoires**. Si l'un d'entre eux manque ou est vide lorsque vous cliquez sur **Calculer le paramètre du réglage à 15 °C**, vous voyez l'erreur :

> **Tous les champs sont obligatoires pour le calcul du paramètre à 15 °C**

## Comment calculer

1. Choisissez votre **mode de mise à jour** (**Auto** ou **Manuel**)
   - En **Auto**, les champs se remplissent automatiquement et sont en lecture seule
   - En **Manuel**, saisissez les quatre valeurs dans les champs
2. Cliquez sur **Calculer le paramètre du réglage à 15 °C**
3. Attendez la fin du calcul (un indicateur de chargement apparaît pendant le traitement)
4. Trois résultats apparaissent ci-dessous :
   - **Paramètre à 15 °C − incertitude** (borne inférieure)
   - **Paramètre à 15 °C** (valeur centrale)
   - **Paramètre à 15 °C + incertitude** (borne supérieure)

## Comprendre les résultats

Les trois résultats représentent :

$$P_{min} = \text{calibrate}(P - 0.5 \times 1.65 \times Inc_P, \, T - 0.9 \times 1.65 \times Inc_T)$$

$$P = \text{calibrate}(P, \, T)$$

$$P_{max} = \text{calibrate}(P + 0.5 \times 1.65 \times Inc_P, \, T + 0.9 \times 1.65 \times Inc_T)$$

où :
- $P$ = paramètre mesuré, $Inc_P$ = son incertitude
- $T$ = température mesurée du câble, $Inc_T$ = son incertitude
- 1,65 est le **facteur de couverture**
- 0,9 et 0,5 sont les coefficients appliqués aux incertitudes de température et de paramètre

## Créer une condition initiale

Chacun des trois résultats dispose d'un bouton **Créer une condition initiale**. En cliquant dessus :

1. une boîte de dialogue s'ouvre pour créer une nouvelle **condition initiale** (état de référence pour les calculs mécaniques)
2. le **paramètre de base** est prérempli avec le résultat sélectionné (arrondi à 1 décimale au niveau Python)
3. la **température de base** est préremplie avec 15 °C
4. vous pouvez saisir un nom et d'autres champs optionnels
5. la condition initiale est enregistrée lorsque vous cliquez sur le bouton de confirmation dans la boîte de dialogue

Ensuite, vous pouvez utiliser cette condition initiale dans l'onglet **Studio** pour exécuter des études mécaniques (tension, fléchage) à cet état de référence.

## Message d'erreur

Si vous voyez :

> **Tous les champs sont obligatoires pour le calcul du paramètre à 15 °C**

Vérifiez que :
- en mode **Auto** : tous les onglets précédents ont terminé leurs calculs avec succès
- en mode **Manuel** : les quatre champs d'entrée contiennent des valeurs numériques et ne sont pas vides
