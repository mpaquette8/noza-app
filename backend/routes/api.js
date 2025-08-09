const express = require('express');
const Anthropic = require('@anthropic-ai/sdk');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const prisma = require('../utils/prisma');

// Initialisation du client Anthropic
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// Fonction pour créer le prompt selon le niveau - VERSION AMÉLIORÉE
function createPrompt(subject, detailLevel, vulgarizationLevel) {
    const detailInstructions = {
        1: "Crée une synthèse concise (~750) avec les points essentiels",
        2: "Crée un cours détaillé (~2250 mots) avec explications approfondies et exemples",
        3: "Crée une analyse exhaustive (~4200 mots) très complète avec références"
    };
    const vulgarizationInstructions = {
        1: "Langage simple, nombreuses analogies, accessible à tous sans prérequis",
        2: "Explications claires avec vocabulaire technique expliqué, analogies et exemples concrets",
        3: "Approche technique avec explication des termes spécialisés",
        4: "Utilise un vocabulaire spécialisé, concepts avancés, destiné aux experts"
    };

    return `Tu es un expert pédagogue qui cherche avant tout à faire comprendre. Décrypte le sujet : "${subject}"

NIVEAU DE DÉTAIL : ${detailInstructions[detailLevel]}
NIVEAU DE VULGARISATION : ${vulgarizationInstructions[vulgarizationLevel]}

PEDAGOGIE: Tu dois faire un effort de pédagogie, pour que ce soit bien clair.

FORMULES MATHEMATIQUES: 
1. Tu dois bien préciser les termes.
2. Tu dois expliquer également des sous termes, les différents blocs de la formule
3. Tu dois faire des analogies et interprétations: faire en sorte que ce soit bien compris car c'est ta priorité.

STRUCTURE REQUISE :
1. Titre principal avec <h1>
2. Introduction dans un bloc générique
3. Sections principales avec des blocs thématiques spécialisés
4. Conclusion dans un bloc conclusion

VOICI LES CLASSES CSS QUE TU DOIS ABSOLUMENT UTILISER :

1. BLOC GÉNÉRIQUE (pour introduction, concepts de base, pour aller plus loin) :
<div class="styled-block">
    <div class="block-title">Titre de la section</div>
    <p>Contenu...</p>
</div>

2. BLOC EXEMPLE PRATIQUE (pour cas concrets, applications) :
<div class="styled-block example-block">
    <div class="block-title">Exemple Pratique</div>
    <p>Contenu de l'exemple...</p>
</div>

3. BLOC CONSEILS PRATIQUES (pour tips, recommandations) :
<div class="styled-block practical-tips-block">
    <div class="block-title">Conseils Pratiques</div>
    <p>Conseils et recommandations...</p>
</div>

4. BLOC CONCLUSION (obligatoire en fin de cours) :
<div class="styled-block conclusion-block">
    <div class="block-title">Conclusion</div>
    <p>Synthèse finale...</p>
</div>

5. BLOC CONCEPT CLÉ (pour notions importantes) :
<div class="styled-block concept-block">
    <div class="block-title">Concept Clé</div>
    <p>Explication du concept...</p>
</div>

6. BLOC ANALOGIE (pour comparaisons et métaphores) :
<div class="styled-block analogy-block">
    <div class="block-title">Analogie</div>
    <p>Comparaison explicative...</p>
</div>

BLOCS SPÉCIALISÉS (utilise si approprié) :

7. FORMULE MATHÉMATIQUE :
<div class="formula">
    <p>Formule ou équation mathématique</p>
</div>

8. CITATION :
<div class="quote-block">
    <p>Citation importante ou définition officielle</p>
</div>

9. CODE (si applicable) :
<div class="code-block">
    <pre><code>Code ou pseudo-code</code></pre>
</div>

RÈGLES IMPORTANTES :
- TOUJOURS utiliser ces classes exactes (respecte la casse)
- TOUJOURS inclure un <div class="block-title"> dans chaque bloc styled-block
- TOUJOURS essayer d'interpreter les differents blocs d'une formule mathématique
- TOUJOURS réaliser un décryptage complet avec un début et une fin
- TOUJOURS ajouter un bloc après la conclusion "Pour aller plus loin": proposer 2 ou 3 questions et cours pour rentrer dans un des détails de ce cours.
- NE JAMAIS inclure une formule mathématique dans un autre bloc que "FORMULE MATHÉMATIQUE"
- NE JAMAIS inclure du code informatique dans un autre bloc que "CODE"
- Le titre H1 reste en dehors des blocs
- Assure-toi que chaque bloc a un contenu substantiel (minimum 2-3 phrases)
- Termine OBLIGATOIREMENT par un bloc conclusion-block

EXEMPLE DE STRUCTURE FINALE :
<h1>Titre du Cours</h1>

<div class="styled-block">
    <div class="block-title">Introduction</div>
    <p>Introduction générale...</p>
</div>

<div class="styled-block concept-block">
    <div class="block-title">Concepts Fondamentaux</div>
    <p>Explication des concepts...</p>
</div>

<div class="styled-block example-block">
    <div class="block-title">Exemple Pratique</div>
    <p>Application concrète...</p>
</div>

<div class="styled-block practical-tips-block">
    <div class="block-title">Points Clés à Retenir</div>
    <p>Conseils et astuces...</p>
</div>

<div class="styled-block conclusion-block">
    <div class="block-title">Conclusion</div>
    <p>Synthèse et perspectives...</p>
</div>

Le cours doit être informatif, bien structuré et engageant, avec une alternance visuelle entre les différents types de blocs.`;
}

// Fonction pour détecter le type de question
function detectQuestionType(question, courseContent) {
  if (!courseContent) {
    return 'general';
  }

  // Mots-clés qui indiquent EXPLICITEMENT une question liée au cours
  const courseKeywords = [
    'dans ce cours', 'selon le cours', 'dans la leçon', 'le cours dit',
    'mentionné dans', 'vu plus haut', 'cette section', 'ce chapitre',
    'explique cette partie', 'précise ce point', 'détaille cette section',
    'approfondir ce sujet du cours', 'peux-tu développer'
  ];

  // Mots-clés qui indiquent CLAIREMENT une question générale
  const generalKeywords = [
    "qu'est-ce que", "c'est quoi", "comment fonctionne", "pourquoi", 
    "quand", "où", "qui", "peux-tu m'expliquer", "explique-moi", 
    "parle-moi de", "que sais-tu sur", "donne-moi des exemples de",
    "différence entre", "comment faire", "qu'est-ce qui", "dis-moi",
    "raconte-moi", "je voudrais savoir", "peux-tu me dire"
  ];

  const questionLower = question.toLowerCase();
  
  // PREMIÈRE VÉRIFICATION : Mots-clés explicites du cours
  const hasCourseKeywords = courseKeywords.some(keyword => 
    questionLower.includes(keyword)
  );

  // DEUXIÈME VÉRIFICATION : Mots-clés généraux
  const hasGeneralKeywords = generalKeywords.some(keyword => 
    questionLower.includes(keyword)
  );

  // TROISIÈME VÉRIFICATION : Analyse contextuelle plus fine
  const courseWords = courseContent.toLowerCase().split(/\s+/);
  const questionWords = questionLower.split(/\s+/);
  
  // Filtrer les mots communs (articles, prépositions, etc.)
  const commonWords = ['le', 'la', 'les', 'un', 'une', 'des', 'du', 'de', 'et', 'ou', 'mais', 'donc', 'car', 'ni', 'or'];
  const meaningfulQuestionWords = questionWords.filter(word => 
    word.length > 3 && !commonWords.includes(word)
  );
  
  const sharedWords = meaningfulQuestionWords.filter(word => 
    courseWords.includes(word)
  );

  // LOGIQUE DE DÉCISION AMÉLIORÉE
  if (hasCourseKeywords) {
    return 'course-related';
  } else if (hasGeneralKeywords) {
    return 'general';
  } else if (sharedWords.length >= 3) {
    // Beaucoup de mots en commun = probablement lié au cours
    return 'course-related';
  } else {
    // Par défaut, traiter comme une question générale
    return 'general';
  }
}

// Route pour générer un cours
router.post('/generate-course', authenticate, async (req, res) => {
    try {
        const { subject, detailLevel, vulgarizationLevel } = req.body;

        if (!subject || !detailLevel || !vulgarizationLevel) {
            return res.status(400).json({
                error: 'Paramètres manquants'
            });
        }

        const prompt = createPrompt(subject, detailLevel, vulgarizationLevel);

        const response = await anthropic.messages.create({
            model: 'claude-3-5-sonnet-20241022',
            max_tokens: 6000,
            temperature: 0.2,
            messages: [
                {
                    role: 'user',
                    content: prompt
                }
            ]
        });

        const courseContent = response.content[0].text;

        // NOUVEAU: Sauvegarder automatiquement en base de données
        const savedCourse = await prisma.course.create({
            data: {
                subject,
                content: courseContent,
                detailLevel: parseInt(detailLevel),
                vulgarizationLevel: parseInt(vulgarizationLevel),
                userId: req.user.id
            }
        });

        res.json({
            success: true,
            course: {
                id: savedCourse.id,
                subject: savedCourse.subject,
                detailLevel: savedCourse.detailLevel,
                vulgarizationLevel: savedCourse.vulgarizationLevel,
                content: savedCourse.content,
                createdAt: savedCourse.createdAt
            }
        });

    } catch (error) {
        console.error('Erreur génération cours:', error);
        res.status(500).json({
            error: 'Erreur lors de la génération du cours',
            details: error.message
        });
    }
});

// Route améliorée pour les questions avec intelligence contextuelle
router.post('/ask-question', authenticate, async (req, res) => {
  try {
    const { question, courseContent, level = 'intermediate', questionType = 'auto' } = req.body;

    if (!question) {
      return res.status(400).json({
        error: 'Question requise'
      });
    }

    // Définir les instructions selon le niveau de vulgarisation
    const levelInstructions = {
        beginner: "Réponds de manière très simple, sans jargon technique, comme si tu t'adressais à un débutant complet. Utilise des analogies simples et du vocabulaire accessible.",
        intermediate: "Réponds de manière détaillée mais accessible, avec du vocabulaire technique de base expliqué. Équilibre entre précision et clarté.",
        expert: "Réponds de manière technique et précise, en utilisant le vocabulaire spécialisé approprié. Assume que l'utilisateur a des connaissances avancées.",
        hybrid: "Réponds de manière experte mais ajoute des analogies ou des exemples concrets pour faciliter la compréhension. Combine précision technique et pédagogie.",
        hybridExpert: "Réponds de manière très technique et complète avec tous les détails nécessaires, mais ajoute systématiquement des explications simples et des analogies du quotidien."
    };

    // Détecter le type de question automatiquement
    const questionTypeDetected = detectQuestionType(question, courseContent);
    const finalQuestionType = questionType === 'auto' ? questionTypeDetected : questionType;

    // LOG DE DÉBOGAGE - Retirez ces lignes une fois que ça fonctionne
    console.log('=== DÉBOGAGE DÉTECTION ===');
    console.log('Question:', question);
    console.log('Type détecté:', questionTypeDetected);
    console.log('Type final:', finalQuestionType);
    console.log('A du contenu de cours:', !!courseContent);
    console.log('===========================');

    let prompt;

    if (finalQuestionType === 'course-related' && courseContent) {
      // Question liée au cours
      prompt = `Contexte : Voici le contenu d'un cours :
${courseContent}

Niveau de vulgarisation : ${levelInstructions[level]}

Question de l'utilisateur : ${question}

Instructions :
- Si la question porte sur le contenu du cours ci-dessus, réponds en te basant sur ce contenu
- Si la question sort du contexte du cours, réponds avec tes connaissances générales
- Adapte ta réponse au niveau de vulgarisation demandé
- Garde une réponse concise (maximum 50 mots)
- Sois utile et informatif dans tous les cas

Réponse :`;

    } else {
      // Question générale - TOUJOURS répondre
      prompt = `Tu es un assistant pédagogique expert. Réponds à cette question en adaptant ton niveau de vulgarisation.

Niveau de vulgarisation : ${levelInstructions[level]}

Question : ${question}

Instructions :
- Donne une réponse claire et concise (maximum 50 mots)
- Adapte ton vocabulaire et tes explications au niveau demandé
- Utilise des exemples concrets si nécessaire
- Reste informatif tout en étant accessible
- Réponds toujours de manière utile, même pour des questions générales

Réponse :`;
    }

    const response = await anthropic.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 800,
      temperature: 0.7,
      messages: [
        {
          role: 'user',
          content: prompt
        }
      ]
    });

    res.json({
      success: true,
      answer: response.content[0].text,
      questionType: finalQuestionType,
      level: level
    });

  } catch (error) {
    console.error('Erreur réponse question:', error);
    res.status(500).json({
      error: 'Erreur lors de la génération de la réponse',
      details: error.message
    });
  }
});

// Route pour générer un quiz
router.post('/generate-quiz', authenticate, async (req, res) => {
  try {
    const { courseContent } = req.body;

    if (!courseContent) {
      return res.status(400).json({
        error: 'Contenu du cours requis'
      });
    }

    const prompt = `Basé sur ce cours :
${courseContent}

Crée un quiz de 5 questions à choix multiples (QCM) pour tester la compréhension.

Format JSON requis :
{
  "questions": [
    {
      "question": "Texte de la question",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "correct": 0,
      "explanation": "Explication de la bonne réponse"
    }
  ]
}

Assure-toi que les questions couvrent les points clés du cours et que les réponses incorrectes sont plausibles.`;

    const response = await anthropic.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 2000,
      temperature: 0.2,
      messages: [
        {
          role: 'user',
          content: prompt
        }
      ]
    });

    // Extraire le JSON de la réponse
    const content = response.content[0].text;
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    
    if (jsonMatch) {
      const quizData = JSON.parse(jsonMatch[0]);
      res.json({
        success: true,
        quiz: quizData
      });
    } else {
      throw new Error('Format de réponse invalide');
    }
  } catch (error) {
      console.error('Erreur génération quiz:', error);
      res.status(500).json({
          error: 'Erreur lors de la génération du quiz',
          details: error.message
      });
  }
});

// Route pour obtenir des suggestions de questions
router.post('/suggest-questions', async (req, res) => {
  try {
    const { courseContent, level = 'intermediate' } = req.body;

    if (!courseContent) {
      return res.status(400).json({
        error: 'Contenu du cours requis'
      });
    }

    const prompt = `Basé sur ce cours :
${courseContent}

Génère 3 questions pertinentes que l'utilisateur pourrait poser pour approfondir sa compréhension. 
Niveau : ${level}

Format JSON :
{
  "questions": [
    "Question 1 ?",
    "Question 2 ?",
    "Question 3 ?"
  ]
}`;

    const response = await anthropic.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 500,
      temperature: 0.8,
      messages: [
        {
          role: 'user',
          content: prompt
        }
      ]
    });

    // Extraire le JSON de la réponse
    const content = response.content[0].text;
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    
    if (jsonMatch) {
      const suggestionsData = JSON.parse(jsonMatch[0]);
      res.json({
        success: true,
        suggestions: suggestionsData.questions
      });
    } else {
      throw new Error('Format de réponse invalide');
    }

  } catch (error) {
    console.error('Erreur suggestions questions:', error);
    res.status(500).json({
      error: 'Erreur lors de la génération des suggestions',
      details: error.message
    });
  }
});

// Route pour obtenir un sujet aléatoire (optionnel)
router.get('/random-subject', async (req, res) => {
  try {
    const { category } = req.query;
    
    // Base de sujets côté serveur
    const serverSubjects = {
      physique: [/* Physique, chimie, astronomie */],
      mathematiques: [/* Arithmétique, nombres premiers, etc. */],
      biologie: [/* Évolution, neurosciences */],
      terre: [/* Climat, géologie */],
      appliees: [/* Ingénierie, informatique théorique */]
    };

    let selectedCategory;
    let availableSubjects;

    if (category && serverSubjects[category]) {
      selectedCategory = category;
      availableSubjects = serverSubjects[category];
    } else {
      // Sélectionner une catégorie aléatoire
      const categories = Object.keys(serverSubjects);
      selectedCategory = categories[Math.floor(Math.random() * categories.length)];
      availableSubjects = serverSubjects[selectedCategory];
    }

    // Sélectionner un sujet aléatoire
    const randomSubject = availableSubjects[Math.floor(Math.random() * availableSubjects.length)];

    res.json({
      success: true,
      subject: randomSubject,
      category: selectedCategory,
      totalSubjects: availableSubjects.length
    });

  } catch (error) {
    console.error('Erreur génération sujet aléatoire:', error);
    res.status(500).json({
      error: 'Erreur lors de la génération du sujet aléatoire',
      details: error.message
    });
  }
});

// Route pour obtenir toutes les catégories disponibles
router.get('/subject-categories', (req, res) => {
  try {
    const serverSubjects = {
      physique: 5,
      mathematiques: 5,
      biologie: 5,
      terre: 5,
      appliees: 5
    };

    res.json({
      success: true,
      categories: Object.keys(serverSubjects),
      stats: serverSubjects
    });

  } catch (error) {
    console.error('Erreur récupération catégories:', error);
    res.status(500).json({
      error: 'Erreur lors de la récupération des catégories'
    });
  }
});

module.exports = router;
