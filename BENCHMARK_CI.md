# 📊 Benchmark CI — comparaison des back-ends par langage

Comparaison du **temps de validation en intégration continue** (GitHub Actions)
des 6 implémentations du back-end de la calculatrice, chacune exposant **le même
contrat d'API** (mêmes routes, mêmes réponses, mêmes codes HTTP).

> **Source des chiffres** — toutes les durées proviennent d'un **run réel et vert**
> de la CI, mesurées via l'API GitHub Actions (pas d'estimation) :
> - Run : [`#28093317419`](https://github.com/40TJG940/test-unitaire/actions/runs/28093317419) · commit `4cb9eb9`
> - Date : 2026-06-24 · Conclusion : ✅ `success` · Durée totale du pipeline : **98 s**
> - Runner : `ubuntu-latest` (2 vCPU) pour **tous** les jobs → base de comparaison identique

---

## 🏁 Classement — temps de validation par langage

Temps du job « Tests back-end » de chaque langage (du plus rapide au plus lent) :

| Rang | Langage | Job CI | Temps | Écart vs. 1ᵉʳ |
|:---:|---|---|:---:|:---:|
| 🥇 | **C** | `Tests back-end C` | **5 s** | — |
| 🥈 | **Python** | `Tests back-end Python` | **12 s** | ×2,4 |
| 🥉 | **JavaScript** (Node 22) | `Tests back-end — Node.js 22.x` | **13 s** | ×2,6 |
| 4 | **Rust** | `Tests back-end Rust` | **15 s** | ×3,0 |
| 5 | **JavaScript** (Node 24) | `Tests back-end — Node.js 24.x` | **16 s** | ×3,2 |
| 6 | **C#** | `Tests back-end C#` | **17 s** | ×3,4 |
| 7 | **Go** | `Tests back-end Go` | **27 s** | ×5,4 |

```
C       █████                              5 s
Python  ████████████                      12 s
JS (22) █████████████                     13 s
Rust    ███████████████                   15 s
JS (24) ████████████████                  16 s
C#      █████████████████                 17 s
Go      ███████████████████████████       27 s
```

> ⚠️ **À lire absolument (méthodologie).** Ce temps mesure le **coût complet du job CI**
> = `checkout` + installation de la chaîne d'outils + installation des dépendances +
> **compilation** + exécution des tests. Il ne mesure **pas** la vitesse d'exécution
> brute du langage : l'arithmétique elle-même prend quelques microsecondes partout.
> On compare donc le **coût de validation d'un écosystème en CI**, pas la performance
> du langage.

---

## 🧩 Caractéristiques de chaque back-end

| Langage | Runtime (CI) | Pile HTTP | Outil de test | Compilé ? | Cache deps CI |
|---|---|---|---|:---:|:---:|
| JavaScript | Node 22.x **et** 24.x | `http` natif | Jest 29 | ❌ interprété | ✅ `cache: npm` |
| Python | 3.12 | FastAPI + Uvicorn | pytest 8 + httpx | ❌ interprété | ❌ |
| Go | 1.21 | `net/http` (stdlib) | `go test` (+ `go vet`) | ✅ | ❌ |
| Rust | stable (préinstallé) | std uniquement | `cargo test` | ✅ | ❌ |
| C | gcc/cc (préinstallé) | sockets POSIX | harnais maison (`make test`) | ✅ | ❌ |
| C# | .NET 9.0 | `HttpListener` | harnais maison (`dotnet run -- test`) | ✅ (build/JIT) | ❌ |

### Volume de code & couverture de tests

| Langage | LOC source | LOC tests | Cas de test | Note de comptage |
|---|:---:|:---:|:---:|---|
| JavaScript | 150 | 370 | **62** | `it.each` → 62 cas exécutés (couverture **100 %**, seuil 90 %) |
| C | 477 | 69 | 18 | 18 assertions `check()` (sockets bruts ⇒ source la plus volumineuse) |
| C# | 270 | 54 | 19 | 19 assertions `Check()` |
| Go | 207 | 524 | 45 | 45 fonctions `TestXxx` (+ profil de couverture exporté) |
| Rust | 396 (tests intégrés) | — | 14 | 14 `#[test]` dans `#[cfg(test)]` |
| Python | 211 | 230 | 49 | 49 fonctions `test_*` (dont 2 paramétrées) |

> Les **cas de test** ne se comptent pas de façon identique d'un écosystème à l'autre
> (assertions vs. fonctions vs. cas paramétrés). Seul le **temps CI** est strictement
> comparable, car mesuré sur le même runner.

---

## 🔍 Analyse — pourquoi ces écarts ?

- **C (5 s) — le plus rapide.** Le compilateur `gcc` est **préinstallé** sur le runner,
  aucune dépendance à télécharger, compilation d'un binaire minuscule en < 1 s, test
  natif instantané. Le « coût d'écosystème » est quasi nul.
- **Python (12 s) & JavaScript (13 s) — interprétés.** Pas de compilation, mais une
  **taxe d'installation de dépendances** : `pip install` (FastAPI, Uvicorn, pytest…)
  pour Python, `npm ci` (Jest…) pour JS. JS limite la casse grâce au **cache npm**.
- **Rust (15 s) & C# (17 s) — compilés à froid.** Le temps est dominé par la
  **compilation** du crate / la build .NET (restore + build + JIT), sur des chaînes
  préinstallées (donc pas de téléchargement de toolchain).
- **Go (27 s) — le plus lent.** Trois facteurs cumulés :
  1. `actions/setup-go` **provisionne la toolchain** (téléchargement + extraction) ;
  2. une **étape supplémentaire `go vet ./...`** (analyse statique) absente des autres jobs ;
  3. compilation + `go test -v` **sans cache de build** → tout est recompilé à chaque run.

**Conclusion d'efficacité :** le classement reflète surtout (a) si la chaîne d'outils
est **préinstallée** ou téléchargée, (b) la présence d'une étape de **compilation**, et
(c) l'usage d'un **cache de dépendances**. Le langage « le plus rapide à valider » n'est
pas le « langage le plus performant » : c'est celui dont l'**écosystème CI** est le plus léger.

---

## ⏱️ Coût total du pipeline (chemin critique)

Le graphe de dépendances des jobs (`needs:`) détermine le temps de bout en bout. Les
jobs back-end par langage **démarrent immédiatement** (aucun `needs`) et s'exécutent en
parallèle ; le chemin critique passe ailleurs :

```
lint (17s) ─┬─> test-backend (max 16s) ─┬─> e2e firefox (55s)   ← chemin critique
            └─> test-frontend (13s) ────┘
            (en parallèle) test-go/python/rust/c/csharp ─┐
                                                          └─> docker (49s)
```

| Étape cross-cutting | Job | Temps |
|---|---|:---:|
| Lint | `Lint (ESLint)` | 17 s |
| Tests front-end unitaires | `Tests front-end unitaires (Jest)` | 13 s |
| E2E navigateur | `Tests E2E — chromium` | 48 s |
| E2E navigateur | `Tests E2E — firefox` | 55 s |
| Build images | `Build Docker (tous les backends)` | 49 s |

➡️ **Durée totale réelle du run : 98 s (~1 min 38).** Le pipeline est donc gouverné par
les **tests E2E Playwright** (Firefox 55 s) et le **build Docker** (49 s), pas par les
tests back-end par langage — qui, eux, sont « gratuits » car parallélisés dès t = 0.

---

## ⚠️ Limites & pistes d'amélioration

1. **Mesure unique.** Les durées CI varient (±15-20 %) selon la charge des runners.
   Pour un benchmark rigoureux : moyenner sur **N runs** et prendre la **médiane**.
2. **Pas de cache** sur 5 jobs sur 6. Activer le cache (`actions/cache`, `cache: true`
   de `setup-go`, cache `~/.cargo` et `~/.cache/pip`) rapprocherait les temps « à chaud »
   et changerait probablement le classement (Go et Rust en bénéficieraient le plus).
3. **Périmètres non identiques.** Le job Go fait en plus `go vet` + export de couverture ;
   tous les langages n'exécutent pas le même nombre/type d'assertions.
4. **Cross-cutting exclu du classement.** Lint, E2E et Docker dépendent de l'écosystème
   JS/Node et ne sont pas attribuables à un langage de back-end en particulier.

---

## 🔁 Reproductibilité

Récupérer soi-même les durées exactes d'un run (nécessite le [GitHub CLI](https://cli.github.com/) authentifié) :

```bash
# Lister les runs récents
gh run list --limit 5

# Durée de chaque job d'un run donné
gh api repos/40TJG940/test-unitaire/actions/runs/<RUN_ID>/jobs --paginate \
  --jq '.jobs[] | [.name, .conclusion,
        (((.completed_at|fromdateiso8601)-(.started_at|fromdateiso8601))|tostring)+"s"] | @tsv'
```

---

<sub>Généré à partir du run CI #28093317419 (commit `4cb9eb9`, 2026-06-24). Configuration : <a href="./.github/workflows/ci.yml">.github/workflows/ci.yml</a>.</sub>
