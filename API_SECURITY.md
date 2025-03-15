# Sécurité des clés API

## Alerte de sécurité résolue

Une clé API Google (Gemini) était précédemment exposée dans le code source. Cette clé a été supprimée et le code a été modifié pour utiliser uniquement les clés stockées dans le stockage local de l'extension Chrome.

## Actions recommandées

Si vous avez cloné ce dépôt avant la correction de cette vulnérabilité, veuillez prendre les mesures suivantes :

1. **Révoquer immédiatement la clé API exposée** :
   - Accédez à la [Console Google Cloud](https://console.cloud.google.com/)
   - Naviguez vers "APIs & Services" > "Credentials"
   - Trouvez la clé API exposée et cliquez sur "Regenerate" ou supprimez-la complètement

2. **Créer une nouvelle clé API** :
   - Créez une nouvelle clé API avec les restrictions appropriées
   - Limitez l'utilisation de la clé à l'API Gemini uniquement
   - Envisagez d'ajouter des restrictions de référent HTTP pour limiter l'utilisation aux domaines autorisés

## Configuration sécurisée des clés API

Pour utiliser cette extension de manière sécurisée, suivez ces étapes :

1. **Obtenir une clé API Gemini** :
   - Accédez à [Google AI Studio](https://ai.google.dev/)
   - Créez un compte si vous n'en avez pas déjà un
   - Générez une clé API pour Gemini

2. **Configurer l'extension** :
   - Installez l'extension dans Chrome
   - Accédez aux paramètres de l'extension en cliquant sur l'icône de l'extension puis sur "Settings"
   - Dans l'onglet "API Keys", entrez votre clé API Gemini
   - Cliquez sur "Save API Keys"

3. **Bonnes pratiques** :
   - Ne partagez jamais vos clés API
   - N'incluez jamais de clés API dans le code source
   - Utilisez des restrictions appropriées pour vos clés API
   - Surveillez régulièrement l'utilisation de vos clés API pour détecter toute activité suspecte

## Pourquoi cette approche est plus sécurisée

- Les clés API sont stockées localement dans le navigateur de l'utilisateur, pas dans le code source
- Chaque utilisateur utilise sa propre clé API, ce qui limite l'impact en cas de compromission
- Les clés ne sont jamais exposées dans le dépôt Git ou dans le code distribué

## Pour les développeurs

Si vous contribuez à ce projet, assurez-vous de :

1. Ne jamais committer de clés API, tokens, ou autres secrets dans le code source
2. Utiliser des variables d'environnement ou le stockage local pour les informations sensibles
3. Vérifier votre code avec des outils comme `git-secrets` avant de le committer
4. Configurer des hooks pre-commit pour détecter les fuites de secrets 