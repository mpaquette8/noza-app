// backend/src/services/anthropicService.js
const Anthropic = require('@anthropic-ai/sdk');
const { logger } = require('../utils/helpers');
const {
  LIMITS,
  DURATIONS,
  TEACHER_TYPES,
  VULGARIZATION_LEVELS,
  ERROR_CODES,
  CONTENT_DETECTION_KEYWORDS,
  ADAPTIVE_FORMAT_INSTRUCTIONS
} = require('../utils/constants');

const OFFLINE_MESSAGE = 'Service IA indisponible';
const REQUEST_TIMEOUT = 30 * 1000; // 30s timeout for IA requests

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

class AnthropicService {
  constructor() {
    this.offline = false;
    if (!process.env.ANTHROPIC_API_KEY) {
      logger.warn('ANTHROPIC_API_KEY manquante, mode offline activé');
      this.offline = true;
      return;
    }
    try {
      this.client = new Anthropic({
        apiKey: process.env.ANTHROPIC_API_KEY,
      });
    } catch (error) {
      logger.error('Échec de connexion au service Anthropic', error);
      this.offline = true;
    }
  }

  isOffline() {
    return this.offline;
  }

  getOfflineMessage() {
    return OFFLINE_MESSAGE;
  }

  // Attempt a lightweight request to see if the service is reachable again
  async recoverIfOffline() {
    if (!this.offline || !this.client) {
      return false;
    }
    try {
      await this.sendWithTimeout({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 1,
        messages: [{ role: 'user', content: 'ping' }]
      }, 5000);
      this.offline = false;
      logger.success('Service Anthropic rétabli');
      return true;
    } catch (error) {
      logger.warn('Tentative de reconnexion Anthropic échouée');
      return false;
    }
  }

  // Wrapper around Anthropic API with timeout support and retry on overload
  async sendWithTimeout(options, timeoutMs = REQUEST_TIMEOUT, retryDelays = [1000, 2000, 4000]) {
    for (let attempt = 0; ; attempt++) {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeoutMs);
      try {
        return await this.client.messages.create(
          options,
          { signal: controller.signal }
        );
      } catch (error) {
        const isOverloaded =
          error?.response?.status === 529 ||
          error?.response?.data?.type === 'overloaded_error';
        if (attempt < retryDelays.length && isOverloaded) {
          await new Promise(res => setTimeout(res, retryDelays[attempt]));
          continue;
        }
        throw error;
      } finally {
        clearTimeout(timer);
      }
    }
  }


  // Obtenir la contrainte de longueur selon la durée souhaitée
  getDurationConstraint(duration) {
    const words = DURATION_TO_WORDS[duration];
    return words ? `Le cours doit contenir environ ${words} mots.` : '';
  }

  detectContentType(subject) {
    const lower = subject.toLowerCase();
    for (const [type, keywords] of Object.entries(CONTENT_DETECTION_KEYWORDS)) {
      if (keywords.some(keyword => lower.includes(keyword.toLowerCase()))) {
        return type;
      }
    }
    return 'GENERAL';
  }

  getAdaptiveInstructions(contentType, teacherType, vulgarization, duration) {
    const teacherInstruction =
      TEACHER_STYLE_INSTRUCTIONS[teacherType] ||
      TEACHER_STYLE_INSTRUCTIONS[TEACHER_TYPES.METHODICAL];
    const vulgarizationInstruction =
      VULGARIZATION_INSTRUCTIONS[vulgarization] || '';
    const durationConstraint = this.getDurationConstraint(duration);

    const contentInstruction =
      ADAPTIVE_FORMAT_INSTRUCTIONS[contentType] ||
      ADAPTIVE_FORMAT_INSTRUCTIONS.GENERAL;

    return [
      teacherInstruction,
      vulgarizationInstruction,
      durationConstraint,
      contentInstruction
    ]
      .filter(Boolean)
      .join('\n');
  }

  createPrompt(subject, vulgarization, duration, teacherType) {
    const contentType = this.detectContentType(subject);
    const adaptiveInstructions = this.getAdaptiveInstructions(
      contentType,
      teacherType,
      vulgarization,
      duration
    );

    const baseBlocks = [
      `1) BLOC GÉNÉRIQUE :
<div class="styled-block">
  <div class="block-title">Titre de la section</div>
  <p>Contenu substantiel…</p>
</div>`,
      `2) BLOC CONCEPT CLÉ :
<div class="styled-block concept-block">
  <div class="block-title">Concept Clé</div>
  <p>Explication claire…</p>
</div>`,
      `3) BLOC EXEMPLE PRATIQUE :
<div class="styled-block example-block">
  <div class="block-title">Exemple Pratique</div>
  <p>Cas concret…</p>
</div>`,
      `4) BLOC CONSEILS PRATIQUES :
<div class="styled-block practical-tips-block">
  <div class="block-title">Conseils Pratiques</div>
  <ul>
    <li>Conseil 1…</li>
  </ul>
</div>`,
      `5) BLOC ANALOGIE :
<div class="styled-block analogy-block">
  <div class="block-title">Analogie</div>
  <p>Comparaison explicative…</p>
</div>`,
      `6) BLOC CONCLUSION (obligatoire) :
<div class="styled-block conclusion-block">
  <div class="block-title">Conclusion</div>
  <p>Synthèse…</p>
</div>`,
    ];

    const specializedBlocks = [];
    if (contentType === 'MATHEMATICAL') {
      specializedBlocks.push(`FORMULE MATHÉMATIQUE :
<div class="formula">
  <p>Formule ou équation…</p>
</div>`);
    }
    if (contentType === 'LITERARY') {
      specializedBlocks.push(`CITATION :
<div class="quote-block">
  <p>“Citation exacte…” — Auteur</p>
</div>`);
    }
    if (contentType === 'TECHNICAL') {
      specializedBlocks.push(`CODE :
<div class="code-block">
  <pre><code>// Code ou pseudo-code
</code></pre>
</div>`);
    }

    const specializedText = specializedBlocks.length
      ? '\nBLOCS SPÉCIALISÉS (uniquement si nécessaire) :\n' +
        specializedBlocks.join('\n\n') +
        '\n'
      : '';

    return `Tu es un expert pédagogue qui cherche avant tout à faire comprendre. Décrypte le sujet : "${subject}"

${adaptiveInstructions}

OBJECTIF GÉNÉRAL :
- Le cours doit être informatif, bien structuré et engageant, avec une alternance visuelle entre différents types de blocs.

CONTRAINTES DE MISE EN FORME (HTML + CSS fournis) :
- Le <h1> du titre principal est EN DEHORS de tout bloc.
- Tout le reste du contenu est structuré UNIQUEMENT via les blocs ci-dessous.
- Chaque bloc .styled-block DOIT contenir un <div class="block-title"> avec un intitulé clair.
- Utilise une alternance de blocs pour le rythme visuel (générique → concept → exemple → conseils → analogie, etc.).

BLOCS DISPONIBLES :
${baseBlocks.join('\n\n')}${specializedText}
RÈGLES IMPORTANTES :
- TOUJOURS inclure un <div class="block-title"> dans chaque .styled-block.
- NE JAMAIS mettre une formule dans un autre bloc que <div class="formula">.
- NE JAMAIS mettre du code hors <div class="code-block">.
- Chaque bloc doit avoir un contenu substantiel (≥ 2–3 phrases).
- Le cours doit démarrer par une INTRO dans un bloc générique et se terminer par un bloc conclusion-block.
- Après la conclusion, AJOUTE OBLIGATOIREMENT un bloc “Pour aller plus loin” (générique) avec 2–3 questions de réflexion et 2–3 pistes de cours/lectures.

STRUCTURE REQUISE (ordre conseillé) :
<h1>Titre du Cours</h1>
<div class="styled-block">...</div>
<div class="styled-block conclusion-block">...</div>

RENDU ATTENDU :
- Retourne UNIQUEMENT le HTML final prêt à être injecté (aucun commentaire extérieur).`;
  }

// Générer un cours
  async generateCourse(subject, vulgarization, duration, teacherType) {
    if (this.offline) {
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

      const response = await this.sendWithTimeout({
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
      const code = this.categorizeError(error);
      logger.error('Erreur génération cours', { code, error });
      if (code === ERROR_CODES.IA_ERROR) {
        this.offline = true;
        const err = new Error(this.getOfflineMessage());
        err.code = code;
        err.offline = true;
        throw err;
      }
      const err = new Error('Erreur lors de la génération du cours');
      err.code = code;
      throw err;
    }
  }

  // Répondre à une question
  async answerQuestion(question, courseContent = null, level = 'intermediate') {
    if (this.offline) {
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

      const response = await this.sendWithTimeout({
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
      const code = this.categorizeError(error);
      logger.error('Erreur réponse question', { code, error });
      if (code === ERROR_CODES.IA_ERROR) {
        this.offline = true;
        const err = new Error(this.getOfflineMessage());
        err.code = code;
        err.offline = true;
        throw err;
      }
      const err = new Error('Erreur lors de la génération de la réponse');
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
    if (this.offline) {
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

      const response = await this.sendWithTimeout({
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
      const code = this.categorizeError(error);
      logger.error('Erreur génération quiz', { code, error });
      if (code === ERROR_CODES.IA_ERROR) {
        this.offline = true;
        const err = new Error(this.getOfflineMessage());
        err.code = code;
        err.offline = true;
        throw err;
      }
      const err = new Error('Erreur lors de la génération du quiz');
      err.code = code;
      throw err;
    }
  }

  async generateOnDemandQuiz(subject, level = 'intermediate', questionCount = 5) {
    if (this.offline) {
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

      const response = await this.sendWithTimeout({
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
        throw new Error('Format de réponse invalide');
      }
    } catch (error) {
      const code = this.categorizeError(error);
      logger.error('Erreur génération quiz à la demande', { code, error });
      if (code === ERROR_CODES.IA_ERROR) {
        this.offline = true;
        const err = new Error(this.getOfflineMessage());
        err.code = code;
        err.offline = true;
        throw err;
      }
      const err = new Error('Erreur lors de la génération du quiz à la demande');
      err.code = code;
      throw err;
    }
  }

  // Suggérer des questions
  async suggestQuestions(courseContent, level = 'intermediate') {
    if (this.offline) {
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

      const response = await this.sendWithTimeout({
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
      const code = this.categorizeError(error);
      logger.error('Erreur suggestions questions', { code, error });
      if (code === ERROR_CODES.IA_ERROR) {
        this.offline = true;
        const err = new Error(this.getOfflineMessage());
        err.code = code;
        err.offline = true;
        throw err;
      }
      const err = new Error('Erreur lors de la génération des suggestions');
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

  // Déterminer le code d'erreur selon la réponse de l'API Anthropic
  categorizeError(error) {
    if (error?.response?.status === 529 || error?.response?.data?.type === 'overloaded_error') {
      return ERROR_CODES.IA_OVERLOADED;
    }
    if (error?.response?.status === 429) {
      return ERROR_CODES.QUOTA_EXCEEDED;
    }
    const message = error?.message?.toLowerCase() || '';
    if (
      error?.name === 'AbortError' ||
      error?.name === 'APIUserAbortError' ||
      error?.code === 'ETIMEDOUT' ||
      message.includes('timeout') ||
      message.includes('abort')
    ) {
      return ERROR_CODES.IA_TIMEOUT;
    }
    return ERROR_CODES.IA_ERROR;
  }
}

module.exports = new AnthropicService();
