class PromptBuilder {
  constructor() {
    this.sections = [];
  }

  addSystemContext(params) {
    const { teacherType, userPreferences, context } = params;

    const teacherPersona = this.getTeacherPersona(teacherType);
    const learningAdaptation = this.getLearningAdaptation(userPreferences.learningStyle);
    const goalOrientation = this.getGoalOrientation(context.goal);

    this.sections.push(`
      RÔLE ET APPROCHE:
      ${teacherPersona}
      ${learningAdaptation}
      ${goalOrientation}

      STYLE DE PRÉSENTATION:
      - Style visuel: ${userPreferences.outputStyle}
      - Niveau d'interaction: ${userPreferences.interactionLevel}
      - Adaptation au niveau: ${context.userLevel}
    `);

    return this;
  }

  addContentStructure(params) {
    const { duration, vulgarization, visualStyle, userPreferences } = params;

    const structure = this.generateAdaptiveStructure(duration, userPreferences.outputStyle);
    const complexity = this.getComplexityGuidelines(vulgarization);
    const visualElements = this.getVisualElements(visualStyle, userPreferences.learningStyle);

    this.sections.push(`
      STRUCTURE DU CONTENU:
      ${structure}

      COMPLEXITÉ:
      ${complexity}

      ÉLÉMENTS VISUELS:
      ${visualElements}
    `);

    return this;
  }

  addOutputFormat() {
    this.sections.push(`
      FORMAT DE SORTIE STRUCTURÉ:

      Génère un objet JSON avec cette structure EXACTE:
      {
        "metadata": {
          "title": "Titre accrocheur avec emoji",
          "subtitle": "Sous-titre explicatif",
          "emoji": "🎯",
          "readingTime": 10,
          "difficulty": 3,
          "tags": ["tag1", "tag2"],
          "summary": "Résumé en une phrase"
        },
        "hero": {
          "type": "gradient",
          "content": "Introduction captivante de 2-3 phrases",
          "visual": "Description d'une visualisation pertinente"
        },
        "sections": [
          {
            "id": "section-1",
            "type": "concept",
            "title": "Titre de section",
            "emoji": "💡",
            "content": {
              "main": "Contenu principal en markdown",
              "example": "Exemple concret",
              "insight": "Point clé à retenir",
              "visual": "Description d'élément visuel"
            },
            "interaction": {
              "question": "Question de réflexion",
              "exercise": "Mini-exercice optionnel"
            }
          }
        ],
        "conclusion": {
          "summary": ["Point clé 1", "Point clé 2", "Point clé 3"],
          "nextSteps": ["Suggestion 1", "Suggestion 2"],
          "reflection": "Question ouverte pour approfondir"
        },
        "style": {
          "tone": "conversational|academic|playful",
          "highlights": ["terme1", "terme2"],
          "primaryColor": "#3182ce",
          "accentColor": "#805ad5"
        }
      }

      IMPORTANT: Retourne UNIQUEMENT le JSON, sans texte avant ou après.
    `);

    return this;
  }

  build(subject) {
    const prompt = `
      ${this.sections.join('\n\n')}

      SUJET À TRAITER: "${subject}"

      Génère maintenant le contenu structuré en respectant EXACTEMENT le format JSON demandé.
    `;

    return prompt;
  }

  // Helper methods
  getTeacherPersona(type) {
    const personas = {
      methodical: 'Tu es un professeur méthodique qui structure l\'information de manière logique et progressive.',
      passionate: 'Tu es un enseignant passionné qui transmet l\'enthousiasme et rend le sujet vivant.',
      analogist: 'Tu es un pédagogue qui excelle dans les analogies et les comparaisons parlantes.',
      pragmatic: 'Tu es un formateur pragmatique qui privilégie les applications concrètes.',
      benevolent: 'Tu es un mentor bienveillant qui encourage et adapte ton approche à chacun.'
    };
    return personas[type] || personas.methodical;
  }

  getLearningAdaptation(style) {
    const adaptations = {
      visual: 'Privilégie les descriptions visuelles, diagrammes et métaphores imagées.',
      auditory: 'Utilise un langage rythmé, des répétitions et des formulations mémorables.',
      kinesthetic: 'Intègre des exemples pratiques et des exercices d\'application.',
      reading: 'Structure le contenu avec des sections claires et une progression logique.',
      mixed: 'Combine différentes approches pour toucher tous les styles d\'apprentissage.'
    };
    return adaptations[style] || adaptations.mixed;
  }

  getGoalOrientation(goal) {
    const goals = {
      understand: 'L\'objectif est de comprendre les concepts clés.',
      memorize: 'L\'objectif est de mémoriser efficacement les notions importantes.',
      apply: 'L\'objectif est de savoir appliquer les concepts dans des situations réelles.',
      teach: 'L\'objectif est de pouvoir enseigner ou expliquer le sujet à quelqu\'un d\'autre.'
    };
    return goals[goal] || goals.understand;
  }

  generateAdaptiveStructure(duration, style) {
    const baseStructure = {
      short: '3-4 sections concises de 200-300 mots',
      medium: '5-6 sections détaillées de 300-400 mots',
      long: '7-8 sections approfondies de 400-500 mots'
    };

    const styleAdaptation = {
      modern: 'avec des encadrés visuels et des points d\'interaction',
      classic: 'avec une progression académique traditionnelle',
      minimalist: 'épurée avec l\'essentiel mis en valeur',
      playful: 'avec des éléments ludiques et des surprises'
    };

    return `${baseStructure[duration]} ${styleAdaptation[style]}`;
  }

  getComplexityGuidelines(vulgarization) {
    const guidelines = {
      general_public: 'Utilise un langage simple et des exemples du quotidien.',
      enlightened: 'Adopte un langage accessible avec quelques termes techniques expliqués.',
      knowledgeable: 'Suppose des connaissances de base et va plus en profondeur.',
      expert: 'Utilise un langage technique et détaille les concepts avancés.'
    };
    return guidelines[vulgarization] || guidelines.enlightened;
  }

  getVisualElements(visualStyle, learningStyle) {
    const visuals = {
      diagram: 'Inclure des descriptions de diagrammes ou schémas.',
      chart: 'Suggérer des graphiques simples pour illustrer les données.',
      image: 'Proposer des images illustratives pertinentes.'
    };

    const learningHints = {
      visual: 'Mettre l\'accent sur les éléments visuels décrits.',
      auditory: 'Suggérer des descriptions audio ou narrations.',
      kinesthetic: 'Inclure des exercices pratiques.',
      reading: 'Fournir des explications textuelles détaillées.',
      mixed: 'Combiner différents types de médias.'
    };

    return `${visuals[visualStyle] || ''} ${learningHints[learningStyle] || ''}`.trim();
  }
}

module.exports = PromptBuilder;
