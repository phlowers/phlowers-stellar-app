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