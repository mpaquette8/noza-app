// backend/src/services/anthropicService.js
const Anthropic = require('@anthropic-ai/sdk');
const { logger } = require('../utils/helpers');
const { LIMITS, STYLES, DURATIONS, INTENTS } = require('../utils/constants');

// Mapping duration presets to approximate word counts
const DURATION_TO_WORDS = {
  [DURATIONS.SHORT]: 750,
  [DURATIONS.MEDIUM]: 2250,
  [DURATIONS.LONG]: 4200
};

// Instructions to adapt tone and style
const STYLE_INSTRUCTIONS = {
  [STYLES.NEUTRAL]: "Utilise un ton neutre et informatif.",
  [STYLES.PEDAGOGICAL]: "Adopte un ton pédagogique, clair et structuré.",
  [STYLES.STORYTELLING]: "Présente les informations sous la forme d'un récit engageant."
};

// Additional guidance based on learner intent
const INTENT_ENHANCEMENTS = {
  [INTENTS.DISCOVER]: "Mets l'accent sur la découverte des notions principales.",
  [INTENTS.LEARN]: "Développe les concepts pour faciliter l'apprentissage.",
  [INTENTS.MASTER]: "Fournis des détails approfondis et des exemples concrets pour maîtriser le sujet.",
  [INTENTS.EXPERT]: "Approfondis chaque aspect avec un niveau d'expertise avancé."
};

class AnthropicService {
  constructor() {
    if (!process.env.ANTHROPIC_API_KEY) {
      throw new Error('ANTHROPIC_API_KEY manquante');
    }
    
    this.client = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    });
  }

  
  // Obtenir la contrainte de longueur selon la durée souhaitée
  getDurationConstraint(duration) {
    const words = DURATION_TO_WORDS[duration];
    return words ? `Le cours doit contenir environ ${words} mots.` : '';
  }

  // Créer un prompt selon les paramètres fournis
  createPrompt(subject, style, duration, intent) {
    const styleInstruction = STYLE_INSTRUCTIONS[style] || STYLE_INSTRUCTIONS[STYLES.NEUTRAL];
    const intentInstruction = INTENT_ENHANCEMENTS[intent] || '';
    const durationConstraint = this.getDurationConstraint(duration);

    return `Tu es un expert pédagogue qui cherche avant tout à faire comprendre. Décrypte le sujet : "${subject}"

${styleInstruction}
${intentInstruction}
${durationConstraint}

Structure :
- Titre principal avec <h1>
- Contenu organisé en blocs <div class="styled-block"> avec <div class="block-title">.
- Utilise les variantes example-block, practical-tips-block, conclusion-block, concept-block et analogy-block si nécessaire.
- Termine par un bloc conclusion-block.`;
  }

  // Générer un cours
  async generateCourse(subject, style, duration, intent) {
    try {
      const prompt = this.createPrompt(subject, style, duration, intent);

      logger.info('Génération cours', { subject, style, duration, intent });

      const response = await this.client.messages.create({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: LIMITS.MAX_COURSE_LENGTH,
        temperature: 0.2,
        messages: [{
          role: 'user',
          content: prompt
        }]
      });

      const courseContent = response.content[0].text;
      logger.success('Cours généré', { length: courseContent.length });

      return courseContent;
    } catch (error) {
      logger.error('Erreur génération cours', error);
      throw new Error('Erreur lors de la génération du cours');
    }
  }

  // Répondre à une question
  async answerQuestion(question, courseContent = null, level = 'intermediate') {
    try {
      const levelInstructions = {
        beginner: "Réponds de manière très simple, sans jargon technique, comme si tu t'adressais à un débutant complet. Utilise des analogies simples et du vocabulaire accessible.",
        intermediate: "Réponds de manière détaillée mais accessible, avec du vocabulaire technique de base expliqué. Équilibre entre précision et clarté.",
        expert: "Réponds de manière technique et précise, en utilisant le vocabulaire spécialisé approprié. Assume que l'utilisateur a des connaissances avancées.",
        hybrid: "Réponds de manière experte mais ajoute des analogies ou des exemples concrets pour faciliter la compréhension. Combine précision technique et pédagogie.",
        hybridExpert: "Réponds de manière très technique et complète avec tous les détails nécessaires, mais ajoute systématiquement des explications simples et des analogies du quotidien."
      };

      // Détecter le type de question automatiquement
      const questionType = this.detectQuestionType(question, courseContent);

      let prompt;

      if (questionType === 'course-related' && courseContent) {
        // Question liée au cours
        prompt = `Contexte : Voici le contenu d'un cours :
${courseContent}

Niveau de vulgarisation : ${levelInstructions[level]}

Question de l'utilisateur : ${question}

Instructions :
- Si la question porte sur le contenu du cours ci-dessus, réponds en te basant sur ce contenu
- Si la question sort du contexte du cours, réponds avec tes connaissances générales
- Adapte ta réponse au niveau de vulgarisation demandé
- Garde une réponse concise (maximum 300 mots)
- Sois utile et informatif dans tous les cas

Réponse :`;

      } else {
        // Question générale - TOUJOURS répondre
        prompt = `Tu es un assistant pédagogique expert. Réponds à cette question en adaptant ton niveau de vulgarisation.

Niveau de vulgarisation : ${levelInstructions[level]}

Question : ${question}

Instructions :
- Donne une réponse claire et concise (maximum 300 mots)
- Adapte ton vocabulaire et tes explications au niveau demandé
- Utilise des exemples concrets si nécessaire
- Reste informatif tout en étant accessible
- Réponds toujours de manière utile, même pour des questions générales

Réponse :`;
      }

      const response = await this.client.messages.create({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 800,
        temperature: 0.7,
        messages: [{
          role: 'user',
          content: prompt
        }]
      });

      return {
        answer: response.content[0].text,
        questionType,
        level
      };
    } catch (error) {
      logger.error('Erreur réponse question', error);
      throw new Error('Erreur lors de la génération de la réponse');
    }
  }

  // Fonction pour détecter le type de question
  detectQuestionType(question, courseContent) {
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

  // Générer un quiz
  async generateQuiz(courseContent) {
    try {
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

      const response = await this.client.messages.create({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 2000,
        temperature: 0.2,
        messages: [{
          role: 'user',
          content: prompt
        }]
      });

      // Extraire le JSON de la réponse
      const content = response.content[0].text;
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      
      if (jsonMatch) {
        const quizData = JSON.parse(jsonMatch[0]);
        return quizData;
      } else {
        throw new Error('Format de réponse invalide');
      }
    } catch (error) {
      logger.error('Erreur génération quiz', error);
      throw new Error('Erreur lors de la génération du quiz');
    }
  }

  // Suggérer des questions
  async suggestQuestions(courseContent, level = 'intermediate') {
    try {
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

      const response = await this.client.messages.create({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 500,
        temperature: 0.8,
        messages: [{
          role: 'user',
          content: prompt
        }]
      });

      // Extraire le JSON de la réponse
      const content = response.content[0].text;
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      
      if (jsonMatch) {
        const suggestionsData = JSON.parse(jsonMatch[0]);
        return suggestionsData.questions;
      } else {
        throw new Error('Format de réponse invalide');
      }

    } catch (error) {
      logger.error('Erreur suggestions questions', error);
      throw new Error('Erreur lors de la génération des suggestions');
    }
  }

  // Obtenir un sujet aléatoire (optionnel)
  getRandomSubject(category = null) {
    try {
      const serverSubjects = {
        physique: [
          "Pourquoi E=mc² a révolutionné le monde",
          "Comment votre GPS utilise la relativité d'Einstein",
          "Les trous noirs et la relativité générale",
          "La mécanique quantique et le principe d'incertitude",
          "La physique quantique sans les maths compliquées"
        ],
        mathematiques: [
          "Le mystère des nombres premiers expliqué simplement",
          "Les bases de l'arithmétique et des nombres premiers",
          "La géométrie euclidienne expliquée simplement",
          "Statistiques de base et leur importance",
          "Introduction aux concepts de topologie"
        ],
        biologie: [
          "Pourquoi les vaccins fonctionnent : immunologie 101",
          "L'évolution et la sélection naturelle",
          "La structure de l'ADN et la génétique",
          "Les neurones et le fonctionnement du cerveau",
          "La neuroplasticité et l'apprentissage"
        ],
        terre: [
          "Le réchauffement climatique et ses causes",
          "La théorie de la dérive des continents",
          "Les propriétés de l'eau et son cycle naturel",
          "Le climat et son impact sur les sociétés",
          "Fondements de la géologie et des tremblements de terre"
        ],
        appliees: [
          "Principes de base de l'ingénierie électrique",
          "Informatique théorique : algorithmes et complexité",
          "Introduction aux énergies renouvelables",
          "Les principes de la cybersécurité",
          "Informatique quantique et ses applications"
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

      return {
        subject: randomSubject,
        category: selectedCategory,
        totalSubjects: availableSubjects.length
      };

    } catch (error) {
      logger.error('Erreur génération sujet aléatoire', error);
      throw new Error('Erreur lors de la génération du sujet aléatoire');
    }
  }

  // Obtenir toutes les catégories disponibles
  getSubjectCategories() {
    try {
      const serverSubjects = {
        physique: 5,
        mathematiques: 5,
        biologie: 5,
        terre: 5,
        appliees: 5
      };

      return {
        categories: Object.keys(serverSubjects),
        stats: serverSubjects
      };

    } catch (error) {
      logger.error('Erreur récupération catégories', error);
      throw new Error('Erreur lors de la récupération des catégories');
    }
  }
}

module.exports = new AnthropicService();