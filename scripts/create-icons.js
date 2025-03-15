// Ce script génère des icônes PNG simples pour l'extension
// Pour l'utiliser, exécutez : node scripts/create-icons.js

const fs = require('fs');
const path = require('path');

// Fonction pour créer un fichier PNG simple avec une couleur de fond
function createSimplePNG(size, color) {
  // Créer un fichier texte avec des instructions pour l'utilisateur
  const content = `
Cette icône doit être remplacée par une véritable image PNG de taille ${size}x${size} pixels.

Pour résoudre le problème d'icône manquante :
1. Créez ou téléchargez une image PNG de taille ${size}x${size} pixels
2. Remplacez ce fichier par votre image
3. Reconstruisez l'extension avec 'npm run build'

Vous pouvez utiliser un outil en ligne comme https://www.favicon-generator.org/ pour créer des icônes.
`;

  return content;
}

// Tailles d'icônes requises
const sizes = [16, 48, 128];
const iconsDir = path.join(__dirname, '../public/icons');

// Vérifier si le dossier existe
if (!fs.existsSync(iconsDir)) {
  fs.mkdirSync(iconsDir, { recursive: true });
}

// Générer les fichiers d'instructions pour chaque taille d'icône
sizes.forEach(size => {
  const iconPath = path.join(iconsDir, `icon${size}.png`);
  const content = createSimplePNG(size, '#4A6CF7'); // Couleur bleue
  fs.writeFileSync(iconPath, content);
  console.log(`Instructions pour l'icône ${size}x${size} générées: ${iconPath}`);
});

console.log('\nIMPORTANT: Ces fichiers ne sont pas de véritables images PNG.');
console.log('Vous devez les remplacer par de vraies images PNG avant de publier votre extension.');
console.log('\nPour résoudre le problème d\'icône manquante :');
console.log('1. Créez ou téléchargez des images PNG de tailles 16x16, 48x48 et 128x128 pixels');
console.log('2. Remplacez les fichiers dans le dossier public/icons par vos images');
console.log('3. Reconstruisez l\'extension avec \'npm run build\'');
console.log('\nVous pouvez utiliser un outil en ligne comme https://www.favicon-generator.org/ pour créer des icônes.'); 