// backend/src/services/visualizationService.js

// Service pour analyser le contenu et détecter les opportunités de visualisation
class VisualizationService {
  // Patterns de détection pour chaque type de visualisation
  static DETECTION_PATTERNS = {
    MATH_EQUATIONS: {
      regex: /[fx]\(.*\)|∫|∑|\√|[∂∇]|lim.*→|sin|cos|tan|log|ln|e\^|x\^2/gi,
      type: 'math_graph',
      confidence: 0.8
    },
    TEMPORAL_SEQUENCES: {
      regex: /\d{4}|\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4}|siècle|époque|ère|chronologie|timeline|avant|après|pendant/gi,
      type: 'timeline',
      confidence: 0.7
    },
    COMPARATIVE_DATA: {
      regex: /\d+%|pourcentage|compare|versus|vs\.|différence|rapport|ratio|\d+[\s\.]fois|supérieur|inférieur/gi,
      type: 'comparison_chart',
      confidence: 0.6
    },
    PROCESS_STEPS: {
      regex: /étape\s*\d+|phase\s*\d+|processus|procédure|méthode|algorithme|flux|workflow|séquence/gi,
      type: 'flowchart',
      confidence: 0.7
    },
    STATISTICS: {
      regex: /statistiques?|probabilité|distribution|moyenne|médiane|écart[- ]type|variance|corrélation/gi,
      type: 'statistics',
      confidence: 0.8
    },
    GEOMETRIC_CONCEPTS: {
      regex: /géométrie|triangle|cercle|sphère|cube|pyramide|volume|aire|périmètre|3D|coordonnées/gi,
      type: 'geometry_3d',
      confidence: 0.7
    }
  };

  // Analyser le contenu pour détecter les opportunités de visualisation
  static analyzeContentForVisualizations(content) {
    const detectedVisualizations = [];

    for (const [patternName, pattern] of Object.entries(this.DETECTION_PATTERNS)) {
      const matches = content.match(pattern.regex);
      if (matches && matches.length >= 2) {
        detectedVisualizations.push({
          type: pattern.type,
          confidence: pattern.confidence,
          matchCount: matches.length,
          patternName: patternName,
          preview: this.generateVisualizationPreview(pattern.type, content)
        });
      }
    }

    return detectedVisualizations
      .sort((a, b) => (b.confidence * b.matchCount) - (a.confidence * a.matchCount))
      .slice(0, 3);
  }

  // Générer un aperçu de la visualisation possible
  static generateVisualizationPreview(type, content) {
    const previews = {
      math_graph: 'Graphique interactif de fonction mathématique',
      timeline: 'Timeline chronologique interactive',
      comparison_chart: 'Diagramme comparatif en barres',
      flowchart: 'Schéma de processus étape par étape',
      statistics: 'Graphiques statistiques (histogramme/camembert)',
      geometry_3d: 'Modèle géométrique 3D manipulable'
    };
    return previews[type] || 'Visualisation interactive';
  }

  // Extraire les données structurées pour la visualisation
  static extractDataForVisualization(content, visualizationType) {
    switch (visualizationType) {
      case 'math_graph':
        return this.extractMathData(content);
      case 'timeline':
        return this.extractTimelineData(content);
      case 'comparison_chart':
        return this.extractComparisonData(content);
      case 'flowchart':
        return this.extractProcessData(content);
      case 'statistics':
        return this.extractStatisticsData(content);
      case 'geometry_3d':
        return this.extractGeometryData(content);
      default:
        return null;
    }
  }

  // Méthodes d'extraction de données spécifiques
  static extractMathData(content) {
    const equations = content.match(/[fx]\(.*?\)|y\s*=\s*.+|\\[a-zA-Z]+\{.*?\}/g) || [];
    return {
      equations: equations.slice(0, 3),
      domain: { min: -10, max: 10 },
      samples: 100
    };
  }

  static extractTimelineData(content) {
    const dateMatches = content.match(/\d{4}(?:\s*[-–]\s*\d{4})?/g) || [];
    const events = content
      .split(/[\.!?]/)
      .filter(sentence => /\d{4}/.test(sentence) && sentence.length > 10)
      .slice(0, 8);

    return {
      events: events.map((event, index) => ({
        year: dateMatches[index] || `Event ${index + 1}`,
        description: event.trim().substring(0, 80) + '...',
        category: index % 3 === 0 ? 'major' : 'minor'
      }))
    };
  }

  static extractComparisonData(content) {
    const percentages = content.match(/\d+(?:\.\d+)?%/g) || [];
    const items = content.match(/(?:entre|versus|vs\.|compare)\s+(.+?)(?:\s+et\s+(.+?))?/gi) || [];

    return {
      categories: ['Catégorie A', 'Catégorie B', 'Catégorie C'],
      values: percentages.slice(0, 3).map(p => parseFloat(p)) || [25, 45, 30],
      labels: items.slice(0, 3).map(item => item.substring(0, 20)) || ['Item 1', 'Item 2', 'Item 3']
    };
  }

  static extractProcessData(content) {
    const steps = content.match(/(?:étape|phase)\s*\d+[^.!?]*/gi) || [];
    return { steps: steps.slice(0, 5) };
  }

  static extractStatisticsData(content) {
    const values = content.match(/\d+(?:\.\d+)?/g) || [];
    return { values: values.slice(0, 10).map(Number) };
  }

  static extractGeometryData(content) {
    const shapes = content.match(/triangle|cercle|sphère|cube|pyramide/gi) || [];
    return { shapes: shapes.slice(0, 3) };
  }
}

module.exports = { VisualizationService };

