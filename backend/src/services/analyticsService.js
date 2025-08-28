// backend/src/services/analyticsService.js

// Service pour tracker l'utilisation des visualisations
class AnalyticsService {
  static VISUALIZATION_EVENTS = {
    DETECTED: 'visualization_detected',
    GENERATED: 'visualization_generated',
    VIEWED: 'visualization_viewed',
    EXPORTED: 'visualization_exported',
    FEEDBACK: 'visualization_feedback'
  };

  // Logger les événements de visualisation
  static async logVisualizationEvent(eventType, data) {
    try {
      const eventData = {
        event: eventType,
        timestamp: new Date().toISOString(),
        ...data
      };

      console.log('📊 Visualization Analytics:', eventData);
      // En production, envoyer à votre service d'analytics
      // await this.sendToAnalytics(eventData);
    } catch (error) {
      console.error('Erreur logging analytics:', error);
    }
  }

  // Calculer les métriques d'engagement
  static calculateEngagementMetrics(courseId) {
    const metrics = {
      visualizationsGenerated: 0,
      timeSpentOnVisualizations: 0,
      feedbackScore: 0,
      mostUsedVisualizationType: null
    };

    // Logic pour calculer les métriques depuis localStorage ou DB
    return metrics;
  }
}

module.exports = { AnalyticsService };

