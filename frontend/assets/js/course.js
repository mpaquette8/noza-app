// frontend/assets/js/course.js

class CourseManager {
  constructor() {
    this.currentCourse = null;
    this.history = JSON.parse(localStorage.getItem('noza-history') || '[]');
  }

  // Générer un cours
  async generateCourse(subject, style, duration, intent) {
    try {
      const response = await fetch(`${API_BASE_URL}/courses`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...authManager.getAuthHeaders()
        },
        body: JSON.stringify({
          subject: utils.sanitizeInput(subject),
          style: utils.sanitizeInput(style),
          duration: utils.sanitizeInput(duration),
          intent: utils.sanitizeInput(intent)
        })
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
      } else {
        throw new Error(data.error || 'Erreur lors de la génération');
      }
    } catch (error) {
      console.error('Erreur:', error);
      
      if (utils.handleAuthError(error)) {
        return null;
      }
      
      utils.showNotification('Erreur lors de la génération du cours: ' + error.message, 'error');
      throw error;
    }
  }

  // Afficher un cours
  displayCourse(course) {
    document.getElementById('emptyState').style.display = 'none';
    document.getElementById('courseContent').style.display = 'block';
    document.getElementById('generatedCourse').innerHTML = course.content;
    
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
    this.history.unshift(course);
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
      historyTab.innerHTML = this.history.map(course => `
        <div class="history-item" onclick="courseManager.loadCourseFromHistory('${course.id}')">
          <h4>${course.subject}</h4>
          <p>Style: ${course.style} | Durée: ${course.duration} | Intention: ${course.intent}</p>
          <small>${new Date(course.createdAt).toLocaleDateString()}</small>
        </div>
      `).join('');
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
        displayCourseMetadata(course.style, course.duration, course.intent);
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
        utils.showNotification('Erreur lors de la copie', 'error');
      });
    }
  }
}

// Instance globale
window.courseManager = new CourseManager();
