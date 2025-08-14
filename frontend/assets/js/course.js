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

// Simple localStorage cache with TTL (5 minutes)
const CACHE_TTL = 1000 * 60 * 5;
function setCache(key, data) {
  const record = { data, expiry: Date.now() + CACHE_TTL };
  localStorage.setItem(key, JSON.stringify(record));
}

function getCache(key) {
  const record = JSON.parse(localStorage.getItem(key) || 'null');
  if (record && record.expiry > Date.now()) {
    return record.data;
  }
  localStorage.removeItem(key);
  return null;
}

class CourseManager {
  constructor() {
    this.currentCourse = null;
    this.history = JSON.parse(localStorage.getItem('noza-history') || '[]');
    this.page = 1;
    this.limit = 10;
    this.hasMore = true;
  }

  invalidateCache(courseId) {
    if (courseId) {
      localStorage.removeItem(`noza-course-${courseId}`);
    }
    Object.keys(localStorage).forEach(key => {
      if (key.startsWith('noza-course-list')) {
        localStorage.removeItem(key);
      }
    });
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
    utils.showLoading(['generateBtn', 'generateQuiz', 'copyContent', 'exportPdf', 'exportDocx']);
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
        this.invalidateCache();
        setCache(`noza-course-${this.currentCourse.id}`, this.currentCourse);
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
    } finally {
      utils.hideLoading(['generateBtn', 'generateQuiz', 'copyContent', 'exportPdf', 'exportDocx']);
    }
  }

  async generateQuiz() {
    if (!this.currentCourse) {
      utils.handleAuthError("Veuillez d'abord générer un cours");
      return null;
    }

    utils.showLoading(['generateQuiz']);
    try {
      const response = await fetch(`${API_BASE_URL}/ai/generate-quiz`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...authManager.getAuthHeaders()
        },
        body: JSON.stringify({ courseContent: this.currentCourse.content })
      });

      const data = await response.json();

      if (data.success && data.quiz) {
        utils.showNotification('Quiz généré avec succès !', 'success');
        return data.quiz;
      } else {
        throw new Error(data.error || 'Erreur lors de la génération du quiz');
      }
    } catch (error) {
      console.error('Erreur génération quiz:', error);
      utils.handleAuthError('Erreur lors de la génération du quiz: ' + error.message, true);
      throw error;
    } finally {
      utils.hideLoading(['generateQuiz']);
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
  async loadUserCourses(page = 1) {
    if (!authManager.isAuthenticated()) return;
    const cacheKey = `noza-course-list-${page}`;
    const cached = getCache(cacheKey);
    let courses;
    if (cached) {
      ({ courses, hasMore: this.hasMore } = cached);
    } else {
      try {
        const response = await fetch(`${API_BASE_URL}/courses?page=${page}&limit=${this.limit}`, {
          headers: authManager.getAuthHeaders()
        });

        const data = await response.json();

        if (data.success) {
          courses = data.courses.map(course => ({
            id: course.id,
            subject: course.subject,
            style: course.style,
            duration: course.duration,
            intent: course.intent,
            createdAt: course.createdAt
          }));
          this.hasMore = data.pagination.page * data.pagination.limit < data.pagination.total;
          setCache(cacheKey, { courses, hasMore: this.hasMore });
        } else {
          courses = [];
          this.hasMore = false;
        }
      } catch (error) {
        console.error('Erreur chargement historique:', error);
        return;
      }
    }

    if (page === 1) {
      this.history = courses;
    } else {
      this.history = [...this.history, ...courses];
    }
    this.page = page;
    this.updateHistoryDisplay();
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
      historyTab.innerHTML = this.history
        .map(course => {
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
        })
        .join('');

      if (this.hasMore) {
        historyTab.innerHTML += `
          <div class="load-more-container">
            <button id="loadMoreCourses">Charger plus</button>
          </div>
        `;
        document
          .getElementById('loadMoreCourses')
          .addEventListener('click', () => this.loadUserCourses(this.page + 1));
      }
    }

    utils.initializeLucide();
  }

  async fetchCourse(courseId) {
    const cacheKey = `noza-course-${courseId}`;
    const cached = getCache(cacheKey);
    if (cached) return cached;
    const response = await fetch(`${API_BASE_URL}/courses/${courseId}`, {
      headers: authManager.getAuthHeaders()
    });
    const data = await response.json();
    if (data.success) {
      setCache(cacheKey, data.course);
      return data.course;
    }
    throw new Error(data.error || 'Erreur lors du chargement du cours');
  }

  // Charger un cours depuis l'historique
  async loadCourseFromHistory(courseId) {
    let course = this.history.find(c => c.id === courseId);
    if (course) {
      if (!course.content) {
        try {
          const fullCourse = await this.fetchCourse(courseId);
          course = { ...course, ...fullCourse };
          const index = this.history.findIndex(c => c.id === courseId);
          this.history[index] = course;
        } catch (error) {
          utils.handleAuthError('Erreur lors du chargement du cours: ' + error.message, true);
          return;
        }
      }
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

  async deleteCourse(courseId) {
    try {
      const response = await fetch(`${API_BASE_URL}/courses/${courseId}`, {
        method: 'DELETE',
        headers: authManager.getAuthHeaders()
      });
      const data = await response.json();
      if (data.success) {
        this.history = this.history.filter(c => c.id !== courseId);
        localStorage.setItem('noza-history', JSON.stringify(this.history));
        this.invalidateCache(courseId);
        this.updateHistoryDisplay();
        utils.showNotification('Cours supprimé', 'success');
      } else {
        throw new Error(data.error || 'Erreur lors de la suppression');
      }
    } catch (error) {
      console.error('Erreur suppression cours:', error);
      utils.handleAuthError('Erreur lors de la suppression: ' + error.message, true);
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

