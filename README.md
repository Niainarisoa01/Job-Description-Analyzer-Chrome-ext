# Job Description Analyzer - Extension Chrome

Une extension Chrome qui utilise l'IA pour analyser les descriptions de poste, extraire les compétences clés et fournir des informations précieuses aux chercheurs d'emploi.

![Job Description Analyzer](https://img.shields.io/badge/Chrome%20Extension-v1.0.0-blue)
![TypeScript](https://img.shields.io/badge/TypeScript-4.9.5-blue)
![Gemini AI](https://img.shields.io/badge/Gemini%20AI-Powered-green)

## 🌟 Fonctionnalités

* **Analyse de descriptions de poste** : Extrait et analyse les descriptions de poste de n'importe quelle page web
* **Identification des compétences** : Identifie automatiquement les compétences techniques, les soft skills et les qualifications
* **Interface utilisateur flottante** : Visualisez les résultats d'analyse dans un panneau déplaçable et rétractable
* **Mise en évidence des mots-clés** : Surligne les mots-clés importants directement dans l'offre d'emploi
* **Authentification utilisateur** : Inscrivez-vous et connectez-vous pour sauvegarder votre historique d'analyses
* **Fonctionnalités Premium** : 
  * Estimation de la fourchette salariale
  * Analyse avancée des compétences
  * Mise en évidence personnalisée des mots-clés
  * Analyses de postes illimitées
  * Support prioritaire

## 🛠️ Technologies utilisées

* **TypeScript** : Pour un code typé et sécurisé
* **API Chrome Extension** : Pour l'intégration au navigateur
* **Google Gemini AI** : Pour le traitement du langage naturel et l'analyse des offres d'emploi
* **Supabase** : Pour l'authentification des utilisateurs et le stockage des données
* **Stripe** (simulation) : Pour le traitement des paiements
* **Bootstrap** : Pour les composants d'interface utilisateur

## 📋 Prérequis

* Node.js (v14 ou supérieur)
* npm ou yarn
* Google Chrome

## 🚀 Installation pour le développement

1. Clonez le dépôt :
```bash
git clone https://github.com/Niainarisoa01/Job-Description-Analyzer-Chrome-ext.git
cd Job-Description-Analyzer-Chrome-ext
```

2. Installez les dépendances :
```bash
npm install
```

3. Construisez l'extension :
```bash
npm run build
```

4. Chargez l'extension dans Chrome :
   * Ouvrez Chrome et naviguez vers `chrome://extensions/`
   * Activez le "Mode développeur"
   * Cliquez sur "Charger l'extension non empaquetée" et sélectionnez le dossier `dist`

## ⚙️ Configuration

Avant d'utiliser l'extension, vous devez configurer les éléments suivants :

1. **Clé API Gemini** : Obtenez une clé API depuis [Google AI Studio](https://ai.google.dev/)
2. **Projet Supabase** : Créez un projet sur [Supabase](https://supabase.com/) et obtenez votre URL et clé anonyme
3. **Configuration de l'extension** : Ajoutez ces clés dans la page des paramètres de l'extension après l'installation

## 💻 Développement

* Lancez la construction en mode développement avec surveillance des fichiers :
```bash
npm run watch
```

* L'extension utilise une architecture modulaire :
  * `background/` : Service worker en arrière-plan
  * `content/` : Scripts de contenu pour l'interaction avec les pages web
  * `popup/` : Interface utilisateur popup de l'extension
  * `api/` : Intégrations de services API
  * `utils/` : Fonctions utilitaires et types
  * `components/` : Composants d'interface utilisateur réutilisables

## 🔒 Gestion des abonnements Premium

L'extension propose un système d'abonnement Premium simulé :

1. Les utilisateurs peuvent s'inscrire et se connecter via Supabase
2. L'option "Upgrade to Premium" ouvre une page de paiement simulée
3. Après "paiement", l'utilisateur obtient accès aux fonctionnalités premium
4. Les abonnements peuvent être gérés dans la section "Manage Subscription"

## 🤝 Contribution

Les contributions sont les bienvenues ! N'hésitez pas à soumettre une Pull Request.

## 📝 Licence

Ce projet est sous licence ISC - voir le fichier LICENSE pour plus de détails.

## 📧 Contact

Niaina - [GitHub](https://github.com/Niainarisoa01)

Lien du projet : [https://github.com/Niainarisoa01/Job-Description-Analyzer-Chrome-ext](https://github.com/Niainarisoa01/Job-Description-Analyzer-Chrome-ext) 