// frontend/assets/js/course.js

// Mapping for human-readable labels and icons
const STYLE_LABELS = {
  neutral: 'Neutre',
  pedagogical: 'Pédagogique',
  storytelling: 'Narratif'
};

const DURATION_LABELS = {
  short: 'Courte',
  medium: 'Moyenne',
  long: 'Longue'
};

const INTENT_LABELS = {
  discover: 'Découvrir',
  learn: 'Apprendre',
  master: 'Maîtriser',
  expert: 'Expert'
};

class CourseManager {
  constructor() {
    this.currentCourse = null;
    this.history = JSON.parse(localStorage.getItem('noza-history') || '[]');
  }

  // Afficher un message d'erreur avec action
  showAction(message, actionLabel, actionCallback) {
    const notification = document.createElement('div');
    notification.className = 'notification error';
    const text = document.createElement('span');
    text.textContent = message;
    const btn = document.createElement('button');
    btn.textContent = actionLabel;
    btn.onclick = () => {
      notification.remove();
      actionCallback();
    };
    notification.appendChild(text);
    notification.appendChild(btn);
    document.body.appendChild(notification);
  }

  savePendingRequest(payload) {
    localStorage.setItem('noza-pending', JSON.stringify(payload));
    utils.showNotification('Requête sauvegardée pour plus tard', 'success');
  }

  // Générer un cours
  async generateCourse(subject, style, duration, intent) {
    try {
      const payload = {
        subject: utils.sanitizeInput(subject, 500)
      };
      if (style && STYLE_LABELS[style]) {
        payload.style = utils.sanitizeInput(style);
      }
      if (duration && DURATION_LABELS[duration]) {
        payload.duration = utils.sanitizeInput(duration);
      }
      if (intent && INTENT_LABELS[intent]) {
        payload.intent = utils.sanitizeInput(intent);
      }

      const response = await fetch(`${API_BASE_URL}/courses`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...authManager.getAuthHeaders()
        },
        body: JSON.stringify(payload)
      });

      const data = await response.json();

      if (data.success) {
        this.currentCourse = {
          ...data.course,
          style: data.course?.style || style,
          duration: data.course?.duration || duration,
          intent: data.course?.intent || intent
        };
        this.displayCourse(this.currentCourse);
        this.addToHistory(this.currentCourse);
        utils.showNotification('Cours généré avec succès !', 'success');
        return this.currentCourse;
      } else if (data.code === 'IA_TIMEOUT') {
        this.showAction(data.error || 'Le service IA a expiré', 'Réessayer', () => this.generateCourse(subject, style, duration, intent));
      } else if (data.code === 'QUOTA_EXCEEDED') {
        this.showAction(data.error || 'Quota IA dépassé', 'Sauvegarder', () => this.savePendingRequest(payload));
      } else {
        throw new Error(data.error || 'Erreur lors de la génération');
      }
    } catch (error) {
      console.error('Erreur:', error);
      utils.handleAuthError('Erreur lors de la génération du cours: ' + error.message, true);
      throw error;
    }
  }

  // Afficher un cours
  displayCourse(course) {
    document.getElementById('emptyState').style.display = 'none';
    document.getElementById('courseContent').style.display = 'block';
    const sanitizedContent = typeof DOMPurify !== 'undefined'
      ? DOMPurify.sanitize(course.content)
      : course.content;
    document.getElementById('generatedCourse').innerHTML = sanitizedContent;
    
    // Réinitialiser le chat
    const chatMessages = document.getElementById('chatMessages');
    chatMessages.innerHTML = '';
    chatMessages.style.display = 'none';
    
    // Masquer le quiz s'il était affiché
    document.getElementById('quizSection').style.display = 'none';
    document.getElementById('quizSection').innerHTML = '';
    
    utils.initializeLucide();
  }

  // Charger l'historique utilisateur
  async loadUserCourses() {
    if (!authManager.isAuthenticated()) return;

    try {
      const response = await fetch(`${API_BASE_URL}/courses`, {
        headers: authManager.getAuthHeaders()
      });

      const data = await response.json();

      if (data.success) {
        this.history = data.courses.map(course => ({
          id: course.id,
          subject: course.subject,
          style: course.style,
          duration: course.duration,
          intent: course.intent,
          createdAt: course.createdAt
        }));
        this.updateHistoryDisplay();
      }
    } catch (error) {
      console.error('Erreur chargement historique:', error);
    }
  }

  // Ajouter à l'historique
  addToHistory(course) {
    const entry = {
      id: course.id,
      subject: course.subject,
      content: course.content,
      style: course.style,
      duration: course.duration,
      intent: course.intent,
      createdAt: course.createdAt || new Date().toISOString()
    };

    this.history.unshift(entry);
    if (this.history.length > 10) {
      this.history = this.history.slice(0, 10);
    }
    localStorage.setItem('noza-history', JSON.stringify(this.history));
    this.updateHistoryDisplay();
  }

  // Mettre à jour l'affichage de l'historique
  updateHistoryDisplay() {
    const historyTab = document.getElementById('historyTab');
    
    if (this.history.length === 0) {
      historyTab.innerHTML = `
        <div class="empty-state">
          <i data-lucide="history"></i>
          <h3>Aucun historique</h3>
          <p>Vos cours générés apparaîtront ici automatiquement.</p>
        </div>
      `;
    } else {
      historyTab.innerHTML = this.history.map(course => {
        const styleLabel = STYLE_LABELS[course.style] || course.style;
        const durationLabel = DURATION_LABELS[course.duration] || course.duration;
        const intentLabel = INTENT_LABELS[course.intent] || course.intent;

        return `
        <div class="history-item" onclick="courseManager.loadCourseFromHistory('${course.id}')">
          <h4>${course.subject}</h4>
          <p>
            <span><i data-lucide="pen-line"></i> ${styleLabel}</span>
            | <span><i data-lucide="clock"></i> ${durationLabel}</span>
            | <span><i data-lucide="target"></i> ${intentLabel}</span>
          </p>
          <small>${new Date(course.createdAt).toLocaleDateString()}</small>
        </div>
        `;
      }).join('');
    }

    utils.initializeLucide();
  }

  // Charger un cours depuis l'historique
  loadCourseFromHistory(courseId) {
    const course = this.history.find(c => c.id === courseId);
    if (course) {
      this.currentCourse = course;
      this.displayCourse(course);
      if (typeof displayCourseMetadata === 'function') {
        const styleLabel = STYLE_LABELS[course.style] || course.style;
        const durationLabel = DURATION_LABELS[course.duration] || course.duration;
        const intentLabel = INTENT_LABELS[course.intent] || course.intent;
        displayCourseMetadata(styleLabel, durationLabel, intentLabel);
      }
      utils.showNotification('Cours chargé depuis l\'historique', 'success');
    }
  }

  // Copier le contenu
  copyContent() {
    if (this.currentCourse) {
      const textContent = this.currentCourse.content.replace(/<[^>]*>/g, '');
      navigator.clipboard.writeText(textContent).then(() => {
        utils.showNotification('Contenu copié dans le presse-papiers !', 'success');
      }).catch(() => {
        utils.handleAuthError('Erreur lors de la copie');
      });
    }
  }
}

// Instance globale
window.courseManager = new CourseManager();
