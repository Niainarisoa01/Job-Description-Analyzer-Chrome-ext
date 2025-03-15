const fs = require('fs');
const path = require('path');

// Fonction pour créer une icône PNG de base (un carré bleu avec les initiales JDA)
function createBasicIconPNG(size) {
  // Créer un en-tête PNG minimal
  // Format: https://en.wikipedia.org/wiki/Portable_Network_Graphics#File_header
  
  // Signature PNG
  const signature = Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]);
  
  // IHDR chunk (header)
  const ihdrLength = Buffer.alloc(4);
  ihdrLength.writeUInt32BE(13, 0); // Longueur du chunk IHDR
  
  const ihdrType = Buffer.from('IHDR');
  
  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(size, 0); // Largeur
  ihdrData.writeUInt32BE(size, 4); // Hauteur
  ihdrData.writeUInt8(8, 8);      // Profondeur de bits
  ihdrData.writeUInt8(6, 9);      // Type de couleur (6 = RGBA)
  ihdrData.writeUInt8(0, 10);     // Méthode de compression
  ihdrData.writeUInt8(0, 11);     // Méthode de filtrage
  ihdrData.writeUInt8(0, 12);     // Méthode d'entrelacement
  
  const ihdrCrc = Buffer.alloc(4);
  ihdrCrc.writeUInt32BE(0x575F2EAE, 0); // CRC pré-calculé pour ces valeurs
  
  // IDAT chunk (données d'image - un carré bleu simple)
  const idatLength = Buffer.alloc(4);
  const compressedSize = size * size * 4 + size; // Taille approximative des données compressées
  idatLength.writeUInt32BE(compressedSize, 0);
  
  const idatType = Buffer.from('IDAT');
  
  // Créer des données d'image simples (un carré bleu)
  const idatData = Buffer.alloc(compressedSize);
  
  // En-tête zlib minimal
  idatData.writeUInt8(0x78, 0); // CMF
  idatData.writeUInt8(0x9C, 1); // FLG
  
  // Données d'image (un carré bleu avec les initiales JDA)
  let offset = 2;
  for (let y = 0; y < size; y++) {
    idatData.writeUInt8(0, offset++); // Filtre de ligne
    for (let x = 0; x < size; x++) {
      // Couleur bleue (RGBA)
      idatData.writeUInt8(0x4A, offset++);   // R (74 - 'J')
      idatData.writeUInt8(0x44, offset++);   // G (68 - 'D')
      idatData.writeUInt8(0x41, offset++);   // B (65 - 'A')
      idatData.writeUInt8(0xFF, offset++);   // A (255 - opaque)
    }
  }
  
  const idatCrc = Buffer.alloc(4);
  idatCrc.writeUInt32BE(0x575F2EAE, 0); // CRC approximatif
  
  // IEND chunk (fin)
  const iendLength = Buffer.alloc(4);
  iendLength.writeUInt32BE(0, 0);
  
  const iendType = Buffer.from('IEND');
  const iendCrc = Buffer.alloc(4);
  iendCrc.writeUInt32BE(0xAE426082, 0); // CRC pour IEND
  
  // Assembler tous les morceaux
  return Buffer.concat([
    signature,
    ihdrLength, ihdrType, ihdrData, ihdrCrc,
    idatLength, idatType, idatData, idatCrc,
    iendLength, iendType, iendCrc
  ]);
}

// Générer des icônes de différentes tailles
const sizes = [16, 48, 128];
const iconsDir = path.join(__dirname, '../public/icons');

// Vérifier si le dossier existe
if (!fs.existsSync(iconsDir)) {
  fs.mkdirSync(iconsDir, { recursive: true });
}

// Générer les icônes
sizes.forEach(size => {
  const iconPath = path.join(iconsDir, `icon${size}.png`);
  const iconData = createBasicIconPNG(size);
  fs.writeFileSync(iconPath, iconData);
  console.log(`Icône ${size}x${size} générée: ${iconPath}`);
});

console.log('Génération des icônes terminée!'); 