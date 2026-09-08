# Modification de longueur de câble — onglet « Manip. câble par travée »

## Objectif

Cet onglet permet de simuler l'effet d'un **allongement ou d'un raccourcissement de câble** sur une travée donnée. La modification est appliquée localement à la travée sélectionnée et entraîne un changement visible de la flèche du câble sur le graphique.

---

## Accès

1. Ouvrez une étude dans l'application.
2. Naviguez vers l'onglet **Studio**.
3. Sélectionnez la vue **Charges**.
4. Cliquez sur l'onglet **Manip. câble par travée**.

---

## Description des champs

### Travée

Sélectionnez la travée sur laquelle appliquer la modification. La liste déroulante affiche les travées au format **Numéro du support gauche → Numéro du support droit**. Un champ de recherche permet de filtrer la liste.

### Support de référence

Choisissez le support utilisé comme point de référence pour la mesure de distance :

- **Gauche** : le support situé à gauche de la travée.
- **Droite** : le support situé à droite de la travée.

### Type de modification

Précisez si vous souhaitez :

- **Allonger** le câble (ajouter de la longueur).
- **Raccourcir** le câble (retirer de la longueur).

### Longueur (m)

Saisissez la valeur de la modification en mètres. La valeur doit être comprise entre **0** et **1 000 m**.

### Distance au support de référence (m)

Saisissez la distance en mètres à partir du support de référence à laquelle la modification est appliquée. La valeur doit être comprise entre **0** et **5 000 m**.

---

## Boutons

| Bouton | Rôle |
|---|---|
| **Réinitialiser** | Réinitialise le formulaire aux valeurs par défaut ou à la dernière modification enregistrée pour cette travée. |
| **Supprimer** | Supprime la modification enregistrée pour la travée sélectionnée. Ce bouton n'est disponible que si une modification a déjà été enregistrée. |
| **Enregistrer** | Enregistre la modification saisie pour la travée sélectionnée. Ce bouton n'est disponible que si des changements ont été effectués depuis le dernier enregistrement. |
| **Calculer** | Lance le calcul et met à jour le graphique pour refléter la modification appliquée à la travée. |

---

## Flux type

1. Sélectionnez la **travée** à modifier dans la liste déroulante.
2. Choisissez le **support de référence** (Gauche ou Droite).
3. Sélectionnez le **type de modification** (Allonger ou Raccourcir).
4. Saisissez la **longueur** de la modification (en mètres).
5. Saisissez la **distance au support de référence** (en mètres).
6. Cliquez sur **Enregistrer** pour sauvegarder la modification.
7. Cliquez sur **Calculer** pour visualiser l'effet sur le graphique.

:::{note}
Lorsque vous changez de travée, le formulaire se recharge automatiquement avec toute modification précédemment enregistrée pour cette travée.
:::

:::{note}
Une seule modification peut être enregistrée par travée. Enregistrer une nouvelle modification sur une travée remplace la précédente.
:::
