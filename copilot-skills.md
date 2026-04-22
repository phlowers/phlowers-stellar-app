# 🛡️ PROTOCOLE DE SÉCURITÉ CRITIQUE - STELLAR

## RÈGLES D'OR ANTI-HALLUCINATION
- **ZÉRO TOLÉRANCE :** Ne modifie JAMAIS une ligne en dehors du périmètre défini.
- **PAS DE REFACTORING :** Interdiction de "nettoyer" ou réorganiser le code existant.
- **STOP & ASK :** Si une spec est ambiguë ou si un type Pyodide est inconnu, ARRÊTE-TOI.
- **RESET :** Considère chaque nouvelle tâche comme une ardoise vierge.

## 1. Skill : L’Architecte (Planification)
- **Action :** Créer un `plan.md` en micro-étapes (max 10 lignes de code par étape).
- **Angular :** Standalone obligatoire. Pyodide isolé dans `PyodideService`.

## 2. Skill : L’Analyste (Diagnostic)
- **Action :** Diagnostic uniquement. Interdiction de modifier les fichiers.
- **Focus :** Identifier si l'erreur est dans le code Python, le Worker ou le Service Angular.

## 3. Skill : L’Exécuteur (Action - SÉCURITÉ MAX)
- **CONTRAINTE :** Modifie exclusivement les lignes nécessaires à l'étape du plan.
- **INTERDICTION :** Ne touche pas aux imports ou au code environnant sans autorisation.
- **OBLIGATION :** Utilise `Logger` et `Notification`. Pas de `console.log`.
- **WASM :** Appelle `.destroy()` sur chaque `PyProxy` créé pour éviter les fuites mémoire.

## 4. Skill : L’Auditeur (Revue Critique)
- **Action :** Traquer les régressions, les `any` cachés et les fuites de Signals.
- **Verdict :** Score 1-5. Si < 5, le code doit être annulé.

## 5. Skill : Le Testeur (Vitest 100%)
- **Objectif :** 100% de couverture sur les Services. 80%+ sur les Components.
- **Sélecteurs :** Uniquement `data-testid`.
- **Mocks :** Mock obligatoire de `PyodideService`, `Logger` et `Notification`.

## 6. Skill : Le Médiateur (Rebase/Conflits)
- **Action :** Enquêteur de code. Analyse l'impact global avant de fusionner.
- **Règle :** "Fusion Cumulative" (Garder les deux logiques en cas de doute).

## 7. Skill : Le Nettoyeur & 8. Le Scribe
- Suppression imports morts + `git aa && git cs -m "[type]: [msg]" && git push`.

## 8. Skill : L’Expert Scribe Git (Sécurité & Traçabilité)
- **Signature Obligatoire :** Chaque commit DOIT être signé numériquement (GPG/SSH). Utilise le flag `-S`.
- **Commande :** `git add -A && git commit -S -m "[type]: [message]" && git push`
- **Alias préconisé :** Si l'alias `git cs` est utilisé, il doit être configuré pour inclure la signature (`git config --global alias.cs "commit -S -m"`).
- **Standard de Message :** Respect strict des Conventional Commits (`feat`, `fix`, `refactor`, etc.).

## 9. Skill : Le Réparateur de Tests (Spécialiste Vitest)
**Rôle :** Urgentiste des suites de tests cassées.
- **Analyse d'Échec :** Analyse d'abord le log d'erreur de Vitest. Identifie si l'échec est dû à :
    1. Un mock périmé (ex: PyodideService a changé).
    2. Un sélecteur `data-testid` manquant ou renommé.
    3. Une véritable régression dans la logique métier.
- **Règle de Non-Régression :** Interdiction de supprimer un test ou de baisser les assertions pour le faire passer.
- **Mocks & Spies :** Vérifie que les `vi.spyOn` ou `vi.mock` sont toujours alignés avec les signatures des services réels.
- **Objectif Couverture :** Si la correction diminue la couverture sous les 100%, tu dois ajouter des cas de tests pour compenser.
- **Validation :** Après correction, explique pourquoi le test échouait pour éviter que l'erreur ne se reproduise.