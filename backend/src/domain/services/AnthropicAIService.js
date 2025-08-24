// backend/src/domain/services/AnthropicAIService.js
const { logger } = require('../../infrastructure/utils/helpers');
const {
  DURATIONS,
  TEACHER_TYPES,
  VULGARIZATION_LEVELS,
  LIMITS,
  ERROR_CODES
} = require('../../infrastructure/utils/constants');
const {
  DomainError,
  ValidationError,
  BusinessRuleError
} = require('../errors');

const MAX_COURSE_LENGTH = LIMITS.MAX_COURSE_LENGTH;


// Mapping duration presets to approximate word counts
const DURATION_TO_WORDS = {
  [DURATIONS.SHORT]: 750,
  [DURATIONS.MEDIUM]: 2250,
  [DURATIONS.LONG]: 4200
};

// Instructions to adapt tone and approach based on teacher type
const TEACHER_STYLE_INSTRUCTIONS = {
  [TEACHER_TYPES.METHODICAL]: "Adopte une approche méthodique et structurée.",
  [TEACHER_TYPES.PASSIONATE]: "Transmets l'information avec passion et enthousiasme.",
  [TEACHER_TYPES.ANALOGIST]: "Utilise des analogies pour expliquer les concepts.",
  [TEACHER_TYPES.PRAGMATIC]: "Mets l'accent sur les applications pratiques.",
  [TEACHER_TYPES.BENEVOLENT]: "Adopte un ton bienveillant et encourageant.",
  [TEACHER_TYPES.SYNTHETIC]: "Propose des synthèses claires et concises."
};

// Guidance based on vulgarization level
const VULGARIZATION_INSTRUCTIONS = {
  [VULGARIZATION_LEVELS.GENERAL_PUBLIC]: "Explique les concepts de manière simple pour le grand public.",
  [VULGARIZATION_LEVELS.ENLIGHTENED]: "Suppose un public curieux avec quelques connaissances préalables.",
  [VULGARIZATION_LEVELS.KNOWLEDGEABLE]: "Adresse un public possédant de bonnes connaissances de base.",
  [VULGARIZATION_LEVELS.EXPERT]: "Utilise un niveau de détail adapté à un public expert."
};

class AnthropicAIService {
  constructor(aiService) {
    this.aiService = aiService;
  }

  isOffline() {
    return this.aiService.isOffline();
  }

  getOfflineMessage() {
    return this.aiService.getOfflineMessage();
  }

  async recoverIfOffline() {
    return this.aiService.recoverIfOffline();
  }

// Obtenir la contrainte de longueur selon la durée souhaitée
  getDurationConstraint(duration) {
    const words = DURATION_TO_WORDS[duration];
    return words ? `Le cours doit contenir environ ${words} mots.` : '';
  }

  getAdaptiveInstructions(teacherType, vulgarization, duration) {
    return {
      teacherStyle:
        TEACHER_STYLE_INSTRUCTIONS[teacherType] ||
        TEACHER_STYLE_INSTRUCTIONS[TEACHER_TYPES.METHODICAL],
      vulgarizationLevel: VULGARIZATION_INSTRUCTIONS[vulgarization] || '',
      durationConstraint: this.getDurationConstraint(duration)
    };
  }

  getEngagementInstructions(vulgarization, teacherType) {
    const teacherTone = {
      [TEACHER_TYPES.PASSIONATE]:
        "Utilise des anecdotes personnelles et un ton enthousiaste.",
      [TEACHER_TYPES.ANALOGIST]:
        "Multiplie les comparaisons créatives pour clarifier chaque notion.",
      [TEACHER_TYPES.PRAGMATIC]:
        "Souligne systématiquement l'utilité concrète des concepts.",
      [TEACHER_TYPES.METHODICAL]:
        "Progresse étape par étape avec une logique claire.",
      [TEACHER_TYPES.BENEVOLENT]:
        "Rassure et encourage régulièrement le lecteur.",
      [TEACHER_TYPES.SYNTHETIC]:
        "Va à l'essentiel en proposant des synthèses percutantes."
    };

    const vocab = {
      [VULGARIZATION_LEVELS.GENERAL_PUBLIC]:
        "Adopte un langage familier avec des analogies du quotidien.",
      [VULGARIZATION_LEVELS.ENLIGHTENED]:
        "Mélange vocabulaire courant et notions scientifiques accessibles.",
      [VULGARIZATION_LEVELS.KNOWLEDGEABLE]:
        "Suppose les bases acquises et propose des analogies plus techniques.",
      [VULGARIZATION_LEVELS.EXPERT]:
        "Conserve un registre technique mais reste créatif dans les explications."
    };

    return [
      "Commence par une accroche captivante (question intrigante ou fait surprenant) et évite les formules génériques comme 'Ce cours traite de...'.",
      "Crée une connexion émotionnelle immédiate avec le lecteur.",
      "Découpe le cours en modules courts (2–4 phrases) en alternant théorie et exemples concrets.",
      "Intègre des émojis et des encadrés colorés pour rythmer la lecture.",
      "Ajoute des mini-questions pour maintenir l'attention.",
      "Utilise systématiquement des analogies et des exemples du quotidien pour expliquer les concepts abstraits.",
      "Décompose chaque idée complexe en étapes simples liées à l'expérience personnelle du lecteur.",
      "Insère toutes les 2–3 sections des blocs interactifs : 💡 Le saviez-vous ?, 🔍 En pratique, ⚠️ Attention piège !.",
      "Pose des questions rhétoriques pour impliquer le lecteur."
    ].concat([teacherTone[teacherType], vocab[vulgarization]].filter(Boolean));
  }

  createPrompt(subject, vulgarization, duration, teacherType) {
    const adaptive = this.getAdaptiveInstructions(
      teacherType,
      vulgarization,
      duration
    );
    const engagement = this.getEngagementInstructions(
      vulgarization,
      teacherType
    );

    const pedagogicText = [
      adaptive.teacherStyle,
      adaptive.vulgarizationLevel,
      adaptive.durationConstraint
    ]
      .filter(Boolean)
      .map(line => `- ${line}`)
      .join('\\n');

    const engagementText = engagement
      .filter(Boolean)
      .map(line => `- ${line}`)
      .join('\\n');

    return `<h1>Titre du Cours</h1>

PHILOSOPHIE PÉDAGOGIQUE :
${pedagogicText}

ENGAGEMENT ET COMPRÉHENSION :
${engagementText}

STRUCTURE :
- Génère des sections <section class="module"> de 2 à 4 phrases.
- Alterne théorie et exemples concrets.
- Utilise des émojis et des encadrés colorés (<aside class="hint|practice|warning">).
- Termine par une conclusion puis un bloc générique 'Pour aller plus loin' avec 2–3 questions de réflexion et 2–3 pistes de cours ou lectures.

Sujet : '${subject}'

RENDU ATTENDU :
- Retourne UNIQUEMENT le HTML final prêt à être injecté (aucun commentaire extérieur).`;
  }


// Générer un cours
  async generateCourse(subject, vulgarization, duration, teacherType) {
    if (this.isOffline()) {
      return this.getOfflineMessage();
    }

    // Fallback for legacy parameter order
    if (Object.values(TEACHER_TYPES).includes(vulgarization)) {
      const legacyTeacher = vulgarization;
      const legacyVulgarization = teacherType;
      teacherType = legacyTeacher;
      vulgarization = legacyVulgarization;
    }

    teacherType = teacherType || TEACHER_TYPES.METHODICAL;

    try {
      const prompt = this.createPrompt(subject, vulgarization, duration, teacherType);

      logger.info('Génération cours', { subject, vulgarization, duration, teacherType });

      const response = await this.aiService.sendWithTimeout({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: MAX_COURSE_LENGTH,
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
      const code = this.aiService.categorizeError(error);
      logger.error('Erreur génération cours', { code, error });
      if (code === ERROR_CODES.IA_ERROR) {
        this.aiService.setOffline(true);
        const err = new DomainError(this.getOfflineMessage());
        err.code = code;
        err.offline = true;
        throw err;
      }
      const err = new DomainError('Erreur lors de la génération du cours');
      err.code = code;
      throw err;
    }
  }

  // Répondre à une question
  async answerQuestion(question, courseContent = null, level = 'intermediate') {
    if (this.isOffline()) {
      return { answer: this.getOfflineMessage(), questionType: 'general', level };
    }
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
- Limite ta réponse à 2–3 phrases ou à moins de 100 mots
- Sois utile et informatif dans tous les cas

Réponse :`;

      } else {
        // Question générale - TOUJOURS répondre
        prompt = `Tu es un assistant pédagogique expert. Réponds à cette question en adaptant ton niveau de vulgarisation.

Niveau de vulgarisation : ${levelInstructions[level]}

Question : ${question}

Instructions :
- Donne une réponse claire et conversationnelle en 2–3 phrases ou moins de 100 mots
- Adapte ton vocabulaire et tes explications au niveau demandé
- Utilise des exemples concrets si nécessaire
- Reste informatif tout en étant accessible
- Réponds toujours de manière utile, même pour des questions générales

Réponse :`;
      }

      const response = await this.aiService.sendWithTimeout({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 180,
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
      const code = this.aiService.categorizeError(error);
      logger.error('Erreur réponse question', { code, error });
      if (code === ERROR_CODES.IA_ERROR) {
        this.aiService.setOffline(true);
        const err = new DomainError(this.getOfflineMessage());
        err.code = code;
        err.offline = true;
        throw err;
      }
      const err = new DomainError('Erreur lors de la génération de la réponse');
      err.code = code;
      throw err;
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
    if (this.isOffline()) {
      return { questions: [] };
    }
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

      const response = await this.aiService.sendWithTimeout({
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
        throw new ValidationError('Format de réponse invalide');
      }
    } catch (error) {
      const code = this.aiService.categorizeError(error);
      logger.error('Erreur génération quiz', { code, error });
      if (code === ERROR_CODES.IA_ERROR) {
        this.aiService.setOffline(true);
        const err = new DomainError(this.getOfflineMessage());
        err.code = code;
        err.offline = true;
        throw err;
      }
      const err = new DomainError('Erreur lors de la génération du quiz');
      err.code = code;
      throw err;
    }
  }

  async generateOnDemandQuiz(subject, level = 'intermediate', questionCount = 5) {
    if (this.isOffline()) {
      return [];
    }
    try {
      const levelInstructions = {
        beginner: "Réponds de manière très simple, sans jargon technique, comme si tu t'adressais à un débutant complet. Utilise des analogies simples et du vocabulaire accessible.",
        intermediate: "Réponds de manière détaillée mais accessible, avec du vocabulaire technique de base expliqué. Équilibre entre précision et clarté.",
        expert: "Réponds de manière technique et précise, en utilisant le vocabulaire spécialisé approprié. Assume que l'utilisateur a des connaissances avancées.",
        hybrid: "Réponds de manière experte mais ajoute des analogies ou des exemples concrets pour faciliter la compréhension. Combine précision technique et pédagogie.",
        hybridExpert: "Réponds de manière très technique et complète avec tous les détails nécessaires, mais ajoute systématiquement des explications simples et des analogies du quotidien."
      };

      const prompt = `Tu es un expert pédagogique. Génère un quiz de ${questionCount} questions à choix multiples sur le sujet suivant :
"${subject}"

Niveau de vulgarisation : ${levelInstructions[level]}

Format JSON attendu :
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

Assure-toi que les questions couvrent les points clés du sujet et que les réponses incorrectes sont plausibles.`;

      const response = await this.aiService.sendWithTimeout({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 3000,
        temperature: 0.2,
        messages: [{
          role: 'user',
          content: prompt
        }]
      });

      const content = response.content[0].text;
      const jsonMatch = content.match(/\{[\s\S]*\}/);

      if (jsonMatch) {
        const quizData = JSON.parse(jsonMatch[0]);
        return quizData.questions;
      } else {
        throw new ValidationError('Format de réponse invalide');
      }
    } catch (error) {
      const code = this.aiService.categorizeError(error);
      logger.error('Erreur génération quiz à la demande', { code, error });
      if (code === ERROR_CODES.IA_ERROR) {
        this.aiService.setOffline(true);
        const err = new DomainError(this.getOfflineMessage());
        err.code = code;
        err.offline = true;
        throw err;
      }
      const err = new DomainError('Erreur lors de la génération du quiz à la demande');
      err.code = code;
      throw err;
    }
  }

  // Suggérer des questions
  async suggestQuestions(courseContent, level = 'intermediate') {
    if (this.isOffline()) {
      return [];
    }
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

      const response = await this.aiService.sendWithTimeout({
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
        throw new ValidationError('Format de réponse invalide');
      }

    } catch (error) {
      const code = this.aiService.categorizeError(error);
      logger.error('Erreur suggestions questions', { code, error });
      if (code === ERROR_CODES.IA_ERROR) {
        this.aiService.setOffline(true);
        const err = new DomainError(this.getOfflineMessage());
        err.code = code;
        err.offline = true;
        throw err;
      }
      const err = new DomainError('Erreur lors de la génération des suggestions');
      err.code = code;
      throw err;
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
      throw new BusinessRuleError('Erreur lors de la génération du sujet aléatoire');
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
      throw new BusinessRuleError('Erreur lors de la récupération des catégories');
    }
  }

}

module.exports = AnthropicAIService;
