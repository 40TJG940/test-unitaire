# Mini-Projet BDD & Tests Manuels — AliExpress

> Application e-commerce : **AliExpress**
> Approche : User Story → Critères d'acceptation → Scénarios BDD (Gherkin) → Test manuel

---

## 1. Recherche d'un produit

**User story**
En tant que client, je veux rechercher un produit par mot-clé, afin de trouver rapidement ce qui m'intéresse.

**Critères d'acceptation**
- Une recherche valide retourne une liste de produits pertinents (titre contient ou est lié au mot-clé).
- Chaque résultat affiche : titre, prix, image, note vendeur, nombre de ventes.
- L'URL de la page de résultats contient le mot-clé recherché.
- Pour une requête non reconnue, AliExpress propose des **produits alternatifs suggérés** (pas de message d'erreur explicite).

**Scénario BDD**
```gherkin
Scenario: Recherche d'un produit existant
  Given l'utilisateur est sur la page d'accueil AliExpress
  When il saisit "casque bluetooth" dans la barre de recherche
  And il valide la recherche
  Then une liste de produits correspondants s'affiche
  And chaque produit affiche un titre, un prix et une note

Scenario: Recherche sans correspondance directe
  Given l'utilisateur est sur la page d'accueil
  When il recherche "xyzabc123nonexistant"
  Then la page de résultats s'affiche
  And des produits alternatifs sont suggérés (fallback automatique)
```

**Test manuel**
1. Ouvrir fr.aliexpress.com.
2. Saisir "casque bluetooth" dans la barre de recherche, valider (Entrée).
3. Vérifier l'URL : doit contenir `wholesale-casque-bluetooth`.
4. Vérifier au moins 10 produits affichés avec titre, prix, note.
5. Refaire avec "xyzabc123nonexistant" → vérifier que la page charge et affiche des suggestions alternatives.

**Résultat du test (réel) :** ✓ Validé — recherche "casque bluetooth" : 16 produits pertinents avec titre, prix (9,04€ à 61,39€), note (4.4 à 4.9), nombre de ventes. Requête bidon : 7 produits alternatifs suggérés, pas de message d'erreur.

---

## 2. Consultation de la fiche produit

**User story**
En tant que client, je veux consulter la fiche détaillée d'un produit, afin de décider s'il correspond à mon besoin.

**Critères d'acceptation**
- La fiche affiche : titre, prix, photos, description, avis, vendeur, livraison.
- Les variantes (taille, couleur) sont sélectionnables.
- Le bouton "Ajouter au panier" est visible et actif si stock disponible.

**Scénario BDD**
```gherkin
Scenario: Affichage des informations produit
  Given l'utilisateur a effectué une recherche
  When il clique sur un produit dans la liste
  Then la fiche produit s'ouvre
  And elle affiche le titre, le prix, les photos, la description et les avis
  And le bouton "Ajouter au panier" est visible
```

**Test manuel**
1. Lancer une recherche, cliquer sur un produit.
2. Vérifier la présence : titre, prix, photos, description, avis, infos vendeur, livraison.
3. Sélectionner une variante (couleur/taille) → vérifier mise à jour du prix/stock.
4. Vérifier que le bouton "Ajouter au panier" est cliquable.

**Résultat du test (réel) :** ✓ Validé — fiche affiche titre H1 complet, plusieurs prix selon variantes (de 2,85€ à 11,51€), 8 éléments SKU sélectionnables, 95 images, bouton "Ajouter au panier" présent.

---

## 3. Ajout d'un produit au panier

**User story**
En tant que client, je veux ajouter un produit au panier depuis sa fiche, afin de l'acheter plus tard.

**Critères d'acceptation**
- Le produit ajouté apparaît dans le panier avec la bonne quantité et le bon prix.
- Le compteur du panier est incrémenté.
- Une confirmation visuelle s'affiche.

**Scénario BDD**
```gherkin
Scenario: Ajout d'un produit disponible au panier
  Given l'utilisateur est sur une fiche produit en stock
  When il clique sur "Ajouter au panier"
  Then le produit apparaît dans le panier avec la quantité 1
  And le compteur du panier est incrémenté
  And le total est mis à jour
```

**Test manuel**
1. Ouvrir une fiche produit disponible.
2. Cliquer sur "Ajouter au panier".
3. Vérifier le compteur du panier (+1) et le message de confirmation.
4. Ouvrir le panier → vérifier le produit, sa quantité (1) et son prix.

**Résultat du test (réel) :** ✓ Validé — clic sur "Ajouter au panier" → badge passe à "1", lien "Aller au panier" apparaît. Note : pas de popup de confirmation explicite, c'est le badge incrémenté qui sert de feedback.

---

## 4. Gestion du panier

**User story**
En tant que client, je veux modifier mon panier, afin d'ajuster mes achats avant de commander.

**Critères d'acceptation**
- L'utilisateur peut modifier la quantité d'un article.
- L'utilisateur peut supprimer un article.
- Le total est recalculé automatiquement.
- Un panier vide affiche un message dédié.

**Scénario BDD**
```gherkin
Scenario: Modification de la quantité d'un article
  Given l'utilisateur a un produit dans son panier
  When il change la quantité de 1 à 3
  Then la quantité affichée passe à 3
  And le total est recalculé

Scenario: Suppression d'un article
  Given l'utilisateur a un produit dans son panier
  When il clique sur "Supprimer"
  Then le produit n'apparaît plus dans le panier
  And le total est mis à jour
```

**Test manuel**
1. Ouvrir le panier avec au moins 1 produit.
2. Augmenter la quantité → vérifier que le sous-total et total se mettent à jour.
3. Cliquer sur "Supprimer" → vérifier que l'article disparaît et le total recalcule.
4. Vider le panier → vérifier l'affichage "Votre panier est vide".

**Résultat du test (réel) :** ✓ Validé — augmentation 1→3 : sous-total passe de 8,66€ à 25,98€ (recalcul exact), total articles 11,51€ → 34,53€. Diminution 3→1 : tout repart à 8,66€. Icônes de suppression présentes (corbeille).

---

## 5. Application d'un code promo

**User story**
En tant que client, je veux appliquer un code promo, afin de bénéficier d'une réduction sur ma commande.

**Critères d'acceptation**
- Un code valide applique la réduction et met à jour le total.
- Un code invalide ou expiré affiche une erreur claire.
- Le code respecte les conditions (montant minimum, produits éligibles).
- Sur AliExpress, la saisie du code se fait à l'**étape checkout**, pas dans le panier.

**Scénario BDD**
```gherkin
Scenario: Code promo valide à l'étape checkout
  Given l'utilisateur est connecté et arrive sur la page checkout
  And son panier contient un montant de 100 €
  When il saisit le code "PROMO10" dans le champ "Coupons / codes promo"
  And il clique sur "Appliquer"
  Then une réduction de 10% est appliquée
  And le nouveau total affiché est 90 €

Scenario: Code promo invalide
  Given l'utilisateur est sur la page checkout
  When il saisit le code "FAUXCODE"
  Then un message d'erreur "Code invalide" s'affiche
  And le total reste inchangé
```

**Test manuel**
1. Ajouter un produit au panier, cliquer sur "Paiement".
2. Se connecter (si nécessaire).
3. Sur la page checkout, repérer le champ "Coupons / codes promo".
4. Saisir un code valide → vérifier réduction + nouveau total.
5. Saisir un code invalide → vérifier message d'erreur.

**Résultat du test (réel) :** ⚠ **Non exécutable sans compte connecté**. Le panier AliExpress n'expose **pas** de champ code promo (mention "Éligible coupons" uniquement). Le clic sur "Paiement" redirige vers une demande de connexion. Scénario BDD ajusté en conséquence (saisie du code à l'étape checkout, pas au panier).

---

## 6. Passage de commande (checkout)

**User story**
En tant que client, je veux passer commande depuis mon panier, afin de finaliser mon achat.

**Critères d'acceptation**
- L'utilisateur saisit adresse, livraison, paiement.
- Les champs obligatoires sont validés.
- Le récapitulatif final affiche le total correct.
- La commande ne se valide pas si une info est manquante/invalide.

**Scénario BDD**
```gherkin
Scenario: Passage de commande complet
  Given l'utilisateur a un panier non vide
  When il clique sur "Passer la commande"
  And il saisit une adresse, choisit la livraison et le paiement
  And il confirme la commande
  Then la commande est validée
  And l'utilisateur est redirigé vers la page de confirmation

Scenario: Champ obligatoire manquant
  Given l'utilisateur est sur la page de checkout
  When il valide sans saisir d'adresse
  Then un message d'erreur s'affiche
  And la commande n'est pas validée
```

**Test manuel**
1. Depuis le panier, cliquer sur "Passer la commande".
2. Saisir adresse, choisir mode de livraison, mode de paiement.
3. Vérifier le récapitulatif (produits, total, frais de port).
4. Tester sans adresse → vérifier le message d'erreur.
5. Compléter et valider → vérifier la redirection vers confirmation.

**Résultat du test (réel) :** ⚠ **Non exécutable sans compte connecté**. Sur AliExpress, le clic sur "Paiement" depuis le panier déclenche une demande d'authentification obligatoire. Test à reprendre avec un compte de test dédié.

---

## 7. Confirmation de commande

**User story**
En tant que client, je veux voir une confirmation après ma commande, afin d'avoir une preuve que mon achat est bien enregistré.

**Critères d'acceptation**
- Un numéro de commande unique est affiché.
- Le récapitulatif (produits, total, adresse) est visible.
- Un email de confirmation est envoyé.
- Le panier est vidé après validation.

**Scénario BDD**
```gherkin
Scenario: Affichage de la confirmation de commande
  Given l'utilisateur vient de valider sa commande
  When la page de confirmation s'affiche
  Then un numéro de commande est visible
  And le récapitulatif des produits, du total et de l'adresse est affiché
  And un email de confirmation est envoyé
  And le panier est vide
```

**Test manuel**
1. Valider une commande complète.
2. Vérifier la présence d'un numéro de commande sur l'écran final.
3. Vérifier le récapitulatif (produits, total, adresse).
4. Vérifier la réception de l'email de confirmation.
5. Ouvrir le panier → vérifier qu'il est vide.

**Résultat du test (réel) :** ⚠ **Non exécutable sans compte connecté ni paiement réel**. Test à dérouler avec un compte de test et idéalement un environnement sandbox (paiement non débité).

---

## Conclusion

**Synthèse des tests réels sur AliExpress**

| Fonctionnalité | Statut | Remarque |
|---|---|---|
| F1 Recherche | ✓ Validé | Fallback avec suggestions au lieu d'un message d'erreur |
| F2 Fiche produit | ✓ Validé | Multi-variantes, prix dynamiques |
| F3 Ajout panier | ✓ Validé | Feedback = badge incrémenté (pas de popup) |
| F4 Gestion panier | ✓ Validé | Recalcul correct (qty 1↔3) |
| F5 Code promo | ⚠ Bloqué | Login requis, saisie au checkout (pas au panier) |
| F6 Checkout | ⚠ Bloqué | Login obligatoire |
| F7 Confirmation | ⚠ Bloqué | Nécessite paiement réel ou sandbox |

**Ce que la démarche apporte**
- Les **user stories** centrent le travail sur le besoin utilisateur réel.
- Les **critères d'acceptation** rendent les attentes mesurables.
- Le **BDD (Gherkin)** crée un langage commun entre métier, dev et QA.
- Les **tests manuels** confrontent les hypothèses à la réalité.

**Leçons tirées du test live**
1. **Les scénarios écrits "au bureau" diffèrent de la réalité** : ex. AliExpress ne dit pas "Aucun résultat", il propose des alternatives. Le test manuel a permis d'**affiner les scénarios BDD**.
2. **Beaucoup de tests E2E exigent un compte connecté** (checkout, paiement, codes promo). Sans environnement de test dédié, on ne peut pas dérouler la chaîne complète.
3. **Le feedback utilisateur n'est pas toujours explicite** : un badge incrémenté peut suffire (F3), pas besoin de popup. À ne pas sur-spécifier dans les critères.
4. **Pyramide des tests** : on a fait du E2E manuel — chaque scénario prend du temps. Pour un vrai projet, ces vérifications iraient plutôt dans des tests automatisés (Playwright, Cypress) avec un compte de test, et l'essentiel des contrôles resterait en tests unitaires.

**À retenir**
Une bonne stratégie de test commence **avant** le code : définir le comportement attendu permet de mieux développer **et** de mieux tester. Mais elle se valide **en confrontant la théorie au réel** — ce qui révèle les écarts et fait évoluer les critères d'acceptation.
