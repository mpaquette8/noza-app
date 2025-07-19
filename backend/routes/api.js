const express = require('express');
const Anthropic = require('@anthropic-ai/sdk');
const router = express.Router();

// Initialisation du client Anthropic
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// Fonction pour créer le prompt selon le niveau
function createPrompt(subject, level, length) {
  const levelInstructions = {
    beginner: "Explique de manière très simple, sans jargon technique, accessible à un débutant complet.",
    intermediate: "Explique de manière détaillée avec du vocabulaire technique de base, pour quelqu'un qui a des connaissances préalables.",
    expert: "Explique de manière approfondie et technique, destiné à un public expert dans le domaine.",
    hybrid: "Explique de manière experte ET ajoute des sections [Analogie], [Exemple Concret] et [Image Conceptuelle] pour faciliter la compréhension. Le contenu doit être techniquement dense mais enrichi d'éléments pédagogiques.",
    hybridExpert: "Explique de manière très approfondie et hautement technique, avec tous les détails techniques nécessaires, MAIS enrichi de sections [Vulgarisation Simple], [Analogie du Quotidien] et [En Termes Simples]. Le contenu doit être d'un niveau académique/recherche complet, mais chaque concept complexe doit être expliqué avec des mots simples et des exemples de la vie courante que tout le monde peut comprendre."
  };

  const lengthInstructions = {
    short: "environ 500 mots (synthèse)",
    medium: "environ 1500 mots (leçon détaillée)",
    long: "environ 3000 mots ou plus (chapitre complet)"
  };

  return `Tu es un expert pédagogue. Crée un cours structuré sur le sujet suivant : "${subject}"

NIVEAU : ${levelInstructions[level]}
LONGUEUR : ${lengthInstructions[length]}

STRUCTURE REQUISE :
- Titre principal (H1)
- Introduction claire
- Sections principales avec sous-titres (H2, H3)
- Conclusion

${level === 'hybrid' ? `
ÉLÉMENTS SPÉCIAUX à inclure (mode Hybride) :
- [Analogie] : Comparaisons simples pour expliquer des concepts complexes
- [Exemple Concret] : Cas pratiques avec chiffres et calculs
- [Image Conceptuelle] : Descriptions de diagrammes ou schémas explicatifs
` : ''}

${level === 'hybridExpert' ? `
ÉLÉMENTS SPÉCIAUX à inclure (mode Hybride Expert) :
- [Vulgarisation Simple] : Explication en mots simples des concepts les plus complexes
- [Analogie du Quotidien] : Comparaisons avec des situations de la vie de tous les jours
- [En Termes Simples] : Reformulation accessible des termes techniques
- [Exemple Concret] : Cas pratiques avec des chiffres et situations réelles
- [Schéma Mental] : Description d'images mentales faciles à retenir
` : ''}

FORMATAGE :
- Utilise les balises HTML appropriées (h1, h2, h3, p, ul, li, strong)
- Pour les formules mathématiques, utilise la classe CSS "formula"
- Pour les blocs spéciaux, utilise les classes "special-block vulgarisation-simple-block", "daily-analogy-block", "simple-terms-block", "concrete-example-block", ou "mental-schema-block"

Le cours doit être informatif, bien structuré et engageant.`;
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
router.post('/generate-course', async (req, res) => {
  try {
    const { subject, level, length } = req.body;

    if (!subject || !level || !length) {
      return res.status(400).json({
        error: 'Paramètres manquants : subject, level et length sont requis'
      });
    }

    const prompt = createPrompt(subject, level, length);

    const response = await anthropic.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 4000,
      temperature: 0.7,
      messages: [
        {
          role: 'user',
          content: prompt
        }
      ]
    });

    const courseContent = response.content[0].text;

    // Sauvegarder dans l'historique (en mémoire pour cette démo)
    const courseData = {
      id: Date.now().toString(),
      subject,
      level,
      length,
      content: courseContent,
      createdAt: new Date().toISOString()
    };

    res.json({
      success: true,
      course: courseData
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
router.post('/ask-question', async (req, res) => {
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
      hybridExpert: "Réponds de manière très technique et complète avec tous les détails nécessaires, mais ajoute systématiquement des explications simples et des analogies du quotidien. Utilise tout le vocabulaire spécialisé requis, mais explique chaque terme technique avec des mots que tout le monde peut comprendre."
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
- Garde une réponse concise (maximum 150 mots)
- Sois utile et informatif dans tous les cas

Réponse :`;

    } else {
      // Question générale - TOUJOURS répondre
      prompt = `Tu es un assistant pédagogique expert. Réponds à cette question en adaptant ton niveau de vulgarisation.

Niveau de vulgarisation : ${levelInstructions[level]}

Question : ${question}

Instructions :
- Donne une réponse claire et concise (maximum 150 mots)
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
router.post('/generate-quiz', async (req, res) => {
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
      temperature: 0.7,
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
  } finally {
      // Pas de finally ici car le bouton sera remis en état côté client
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
      sciences: [
        "La photosynthèse et son rôle dans l'écosystème",
        "Les trous noirs et la relativité générale",
        "La mécanique quantique et le principe d'incertitude",
        "L'évolution et la sélection naturelle",
        "La structure de l'ADN et la génétique"
      ],
      technologie: [
        "Introduction aux algorithmes de machine learning",
        "Les bases de la cryptographie moderne",
        "L'architecture des processeurs modernes",
        "Les réseaux neuronaux et l'intelligence artificielle",
        "La blockchain et les cryptomonnaies"
      ],
      economie: [
        "Le modèle d'évaluation d'actifs financiers (CAPM)",
        "L'inflation et ses mécanismes économiques",
        "Les marchés financiers et leur régulation",
        "L'économie comportementale et les biais cognitifs",
        "La théorie des jeux en économie"
      ],
      philosophie: [
        "L'éthique de l'intelligence artificielle",
        "Le libre arbitre face au déterminisme",
        "La philosophie de l'esprit et la conscience",
        "L'existentialisme de Sartre et Camus",
        "L'éthique médicale et les dilemmes bioéthiques"
      ]
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
      sciences: 5,
      technologie: 5,
      economie: 5,
      philosophie: 5
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