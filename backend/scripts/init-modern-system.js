// Script pour initialiser le nouveau système
const fs = require('fs');
const path = require('path');

console.log('🚀 Initialisation du système moderne de décryptage...');

// Vérifier les dépendances
const requiredFiles = [
  'backend/src/domain/services/PromptBuilder.js',
  'frontend/app/assets/js/courseRenderer.js'
];

requiredFiles.forEach(file => {
  const filePath = path.join(process.cwd(), file);
  if (!fs.existsSync(filePath)) {
    console.error(`❌ Fichier manquant: ${file}`);
    console.log('Créez ce fichier avec le code fourni.');
  } else {
    console.log(`✅ ${file} trouvé`);
  }
});

// Vérifier les imports
console.log('\n📦 Vérification des imports...');
console.log("Assurez-vous d'avoir importé:");
console.log('- PromptBuilder dans AnthropicAIService.js');
console.log('- courseRenderer.js dans index.html');
console.log('- Les nouveaux styles CSS dans app.css');

console.log('\n✨ Configuration terminée!');
console.log('Redémarrez le serveur pour appliquer les changements.');
