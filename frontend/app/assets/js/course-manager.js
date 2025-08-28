// frontend/app/assets/js/course-manager.js

import { utils, API_BASE_URL } from './utils/utils.js';
import { authManager } from './auth.js';

// Mapping for human-readable labels and icons
export const VULGARIZATION_LABELS = {
  general_public: 'Grand public',
  enlightened: 'Éclairé',
  knowledgeable: 'Connaisseur',
  expert: 'Expert'
};

export const DURATION_LABELS = {
  short: 'Courte',
  medium: 'Moyenne',
  long: 'Longue'
};

export const TEACHER_TYPE_LABELS = {
  calculator: '📐 Pour calculer',
  experimenter: '🔬 Pour expérimenter',
  memorizer: '📖 Pour mémoriser'
};

const LEGACY_TEACHER_TYPE_MAP = {
  spark: 'experimenter',
  builder: 'calculator',
  storyteller: 'memorizer',
  lightning: 'memorizer',
  methodical: 'calculator',
  pragmatic: 'calculator',
  analogist: 'memorizer',
  benevolent: 'memorizer',
  passionate: 'experimenter',
  synthetic: 'memorizer'
};

export function getTeacherTypeLabel(type) {
  const normalized = LEGACY_TEACHER_TYPE_MAP[type] || type;
  return TEACHER_TYPE_LABELS[normalized] || normalized;
}

// Rate limit between costly actions
const REQUEST_COOLDOWN = 5000; // 5 seconds
const LAST_REQUEST_KEY = 'noza-last-request';

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

  checkRateLimit() {
    const last = parseInt(localStorage.getItem(LAST_REQUEST_KEY) || '0', 10);
    const now = Date.now();
    if (now - last < REQUEST_COOLDOWN) {
      utils.showNotification('Veuillez patienter quelques secondes avant une nouvelle requête', 'error');
      return false;
    }
    localStorage.setItem(LAST_REQUEST_KEY, String(now));
    return true;
  }

  resetRateLimit() {
    localStorage.removeItem(LAST_REQUEST_KEY);
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
    // Place notifications within the course tab when available to match the new in-tab layout
    const container = document.querySelector('#courseTab') || document.body;
    container.appendChild(notification);
  }

  savePendingRequest(payload) {
    localStorage.setItem('noza-pending', JSON.stringify(payload));
    utils.showNotification('Requête sauvegardée pour plus tard', 'success');
  }

  // Générer un cours
  async generateCourse(subject, vulgarization, duration, teacher_type, intensity) {
    if (!this.checkRateLimit()) {
      return null;
    }
    utils.showLoading(['generateBtn', 'generateQuiz', 'copyContent', 'exportPdf', 'exportDocx']);
    const controller = new AbortController();
    const slowRequest = setTimeout(() => {
      this.showAction('La génération est plus longue que prévu', 'Annuler', () => controller.abort());
    }, 25000);
    try {
      const payload = {
        subject: utils.sanitizeInput(subject, 500)
      };
      if (vulgarization && VULGARIZATION_LABELS[vulgarization]) {
        payload.vulgarization = utils.sanitizeInput(vulgarization);
      }
      if (duration && DURATION_LABELS[duration]) {
        payload.duration = utils.sanitizeInput(duration);
      }
      if (teacher_type && TEACHER_TYPE_LABELS[teacher_type]) {
        payload.teacher_type = utils.sanitizeInput(teacher_type);
      }
      if (intensity) {
        payload.intensity = utils.sanitizeInput(intensity);
      }

      const response = await fetch(`${API_BASE_URL}/courses`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...authManager.getAuthHeaders()
        },
        body: JSON.stringify(payload),
        signal: controller.signal
      });
      if (response.status === 503) {
        this.showAction('Service IA indisponible, réessayez plus tard', 'OK', () => {});
        return null;
      }
      const data = await response.json();
      if (response.status === 429) {
        let wait = parseInt(response.headers.get('Retry-After'), 10);
        if (isNaN(wait)) {
          wait = data.retryAfter || data.retry_after || data.wait || data.delay || 5;
        }
        utils.showNotification(`Veuillez patienter ${wait} secondes avant une nouvelle requête`, 'error');
        this.resetRateLimit();
        return null;
      }

      if (data.success) {
        this.currentCourse = {
          ...data.course,
          vulgarization: data.course?.vulgarization || vulgarization,
          duration: data.course?.duration || duration,
          teacher_type: data.course?.teacher_type || teacher_type
        };
        this.invalidateCache();
        setCache(`noza-course-${this.currentCourse.id}`, this.currentCourse);
        this.displayCourse(this.currentCourse);
        this.addToHistory(this.currentCourse);
        utils.showNotification('Cours généré avec succès !', 'success');
        return this.currentCourse;
      } else if (data.code === 'IA_TIMEOUT') {
        this.showAction(data.error || 'Le service IA a expiré', 'Réessayer', () => this.generateCourse(subject, vulgarization, duration, teacher_type));
      } else if (data.code === 'QUOTA_EXCEEDED') {
        this.showAction(data.error || 'Quota IA dépassé', 'Sauvegarder', () => this.savePendingRequest(payload));
      } else {
        throw new Error(data.error || 'Erreur lors de la génération');
      }
    } catch (error) {
      if (error.name === 'AbortError') {
        utils.showNotification('Génération annulée', 'error');
        return null;
      }
      console.error('Erreur:', error);
      utils.handleAuthError('Erreur lors de la génération du cours: ' + error.message, true);
      throw error;
    } finally {
      clearTimeout(slowRequest);
      utils.hideLoading(['generateBtn', 'generateQuiz', 'copyContent', 'exportPdf', 'exportDocx']);
    }
  }

  async generateQuiz() {
    if (!this.currentCourse) {
      utils.handleAuthError("Veuillez d'abord générer un cours");
      return null;
    }
    if (!this.checkRateLimit()) {
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
      if (response.status === 503) {
        this.showAction('Service IA indisponible, réessayez plus tard', 'OK', () => {});
        return null;
      }

      const data = await response.json();
      if (response.status === 429) {
        let wait = parseInt(response.headers.get('Retry-After'), 10);
        if (isNaN(wait)) {
          wait = data.retryAfter || data.retry_after || data.wait || data.delay || 5;
        }
        utils.showNotification(`Veuillez patienter ${wait} secondes avant une nouvelle requête`, 'error');
        this.resetRateLimit();
        return null;
      }

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

  // Afficher un cours avec formatage conversationnel
  displayCourse(course) {
    document.getElementById('courseContent').style.display = 'block';
    
    // Appliquer le post-traitement de formatage
    const formattedContent = this.formatConversationalContent(course.content);
    
    // Sanitiser le contenu
    const sanitizedContent = typeof utils.sanitizeHTML === 'function'
      ? utils.sanitizeHTML(formattedContent)
      : formattedContent;
    
    // Convertir le markdown léger en HTML
    const htmlContent = this.convertMarkdownToHTML(sanitizedContent);
    
    document.getElementById('generatedCourse').innerHTML = htmlContent;
    
    // Réinitialiser le chat
    const chatMessages = document.getElementById('chatMessages');
    chatMessages.innerHTML = '';
    chatMessages.style.display = 'none';
    
    // Masquer le quiz s'il était affiché
    document.getElementById('quizSection').style.display = 'none';
    document.getElementById('quizSection').innerHTML = '';
    
    utils.initializeLucide();
  }

  // Fonction de post-traitement pour améliorer le formatage
  formatConversationalContent(rawContent) {
    return rawContent
      // Nettoyer les sections mal formatées
      .replace(/INTRODUCTION\s*/gi, '## 🎯 Introduction\n')
      .replace(/POINTS CLÉ?S?\s*/gi, '## 📚 Points clés\n')
      .replace(/POINTS? IMPORTANT?S?\s*/gi, '## 📚 Points importants\n')
      .replace(/L'ESSENTIEL\s*/gi, '## 📚 L\'essentiel\n')
      .replace(/EXEMPLE?S?\s*PRATIQUE?S?\s*/gi, '## 💡 Exemple pratique\n')
      .replace(/CONCLUSION\s*/gi, '## 🎯 Conclusion\n')
      .replace(/POUR ALLER PLUS LOIN\s*/gi, '## 🔍 Pour aller plus loin\n')
      .replace(/APPLICATIONS?\s*PRATIQUES?\s*/gi, '## 💡 Applications pratiques\n')
      .replace(/LIMITES?\s*DU\s*MODÈLE\s*/gi, '## ⚠️ Limites à connaître\n')
      
      // Transformer les listes mal formatées
      .replace(/^\s*[•\-\*]\s+(.+)/gm, '- $1')
      .replace(/^\s*\d+\.\s+(.+)/gm, '1. $1')

      // === NETTOYAGE AVANCÉ DES TABLEAUX MALFORMÉS ===
      .replace(/(\*\s*)?\|\s*([^|]+(?:\|\s*[^|]+)*)\s*\|\s*(\|\s*[-:\s|]+\s*\|)?\s*((?:\|\s*[^|]+)*)/g, function(match, bullet, content) {
        // Détecter si c'est un tableau condensé sur une ligne
        if (content.includes('|') && content.split('|').length >= 4) {
          const parts = content.split('|').map(p => p.trim()).filter(p => p.length > 0);

          // Détecter les séparateurs (lignes avec des tirets)
          let headerIndex = -1;
          let separatorIndex = -1;

          for (let i = 0; i < parts.length; i++) {
            if (parts[i].match(/^[-:\s]+$/)) {
              separatorIndex = i;
              headerIndex = i - 3; // Les 3 éléments précédents sont l'en-tête
              break;
            }
          }

          // Si on trouve une structure cohérente, reformater
          if (headerIndex >= 0 && separatorIndex > headerIndex) {
            const headers = parts.slice(headerIndex, separatorIndex);
            const remainingParts = parts.slice(separatorIndex + 1);

            // Construire l'en-tête
            let result = '\n| ' + headers.join(' | ') + ' |\n';

            // Ajouter la ligne séparatrice
            result += '|' + headers.map(() => '-------').join('|') + '|\n';

            // Ajouter les lignes de données (groupées par nombre de colonnes)
            const colCount = headers.length;
            for (let i = 0; i < remainingParts.length; i += colCount) {
              const row = remainingParts.slice(i, i + colCount);
              if (row.length === colCount) {
                result += '| ' + row.join(' | ') + ' |\n';
              }
            }

            return result;
          }
        }

        // Fallback : nettoyage simple pour autres cas
        return match.replace(/\|\s*([^|]+)\s*\|/g, '| $1 |');
      })

      // Nettoyage supplémentaire pour tableaux markdown standards malformés  
      .replace(/\n\s*\|\s*([^|\n]+(?:\s*\|\s*[^|\n]+)*)\s*\|\s*\n/g, function(match, row) {
        const cells = row.split('|').map(cell => cell.trim());
        return '\n| ' + cells.join(' | ') + ' |\n';
      })

      // Assurer la cohérence des lignes de séparation
      .replace(/\n\s*\|\s*([-:\s|]+)\s*\|\s*\n/g, function(match, separator) {
        const parts = separator.split('|').map(p => p.trim());
        const cleanSeps = parts.map(p => p.match(/[-:\s]/) ? '-------' : p);
        return '\n|' + cleanSeps.join('|') + '|\n';
      })

      // Ajouter des espaces entre les sections
      .replace(/\n([#]{1,3}\s)/g, '\n\n$1')
      .replace(/([.!?])\n([A-Z])/g, '$1\n\n$2')
      
      // Nettoyer les espaces multiples
      .replace(/\n{3,}/g, '\n\n')
      .trim();
  }

  // Convertir markdown + LaTeX + tableaux en HTML esthétique
  convertMarkdownToHTML(content) {
    return content
      // Convertir les titres
      .replace(/^# (.+)$/gm, '<h1>$1</h1>')
      .replace(/^## (.+)$/gm, '<h2>$1</h2>')
      .replace(/^### (.+)$/gm, '<h3>$1</h3>')
      
      // Convertir les formules en blocs centrés
      .replace(/```\n([\s\S]*?)\n```/g, '<div class="formula">$1</div>')
      .replace(/`([^`]+)`/g, '<code>$1</code>')
      
      // Convertir les tableaux markdown en HTML stylé
      .replace(/\|(.+)\|\n\|[-\s|:]+\|\n((?:\|.+\|\n?)*)/g, function(match, header, rows) {
        const headerCells = header.split('|').filter(cell => cell.trim()).map(cell => 
          `<th>${cell.trim()}</th>`
        ).join('');
        
        const bodyRows = rows.trim().split('\n').map(row => {
          const cells = row.split('|').filter(cell => cell.trim()).map(cell => 
            `<td>${cell.trim()}</td>`
          ).join('');
          return `<tr>${cells}</tr>`;
        }).join('');
        
        return `<table class="styled-table"><thead><tr>${headerCells}</tr></thead><tbody>${bodyRows}</tbody></table>`;
      })
      
      // Convertir les listes
      .replace(/^- (.+)$/gm, '<li>$1</li>')
      .replace(/(<li>.*<\/li>)/s, '<ul>$1</ul>')
      
      // Convertir les paragraphes
      .replace(/\n\n(.+?)(?=\n\n|$)/gs, '<p>$1</p>')
      
      // Nettoyer les balises imbriquées
      .replace(/<\/ul>\s*<ul>/g, '')
      .replace(/<\/ol>\s*<ol>/g, '');
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
            vulgarization: course.vulgarization,
            duration: course.duration,
            teacher_type: course.teacher_type,
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
      vulgarization: course.vulgarization,
      duration: course.duration,
      teacher_type: course.teacher_type,
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
          const vulgarizationLabel = VULGARIZATION_LABELS[course.vulgarization] || course.vulgarization;
          const durationLabel = DURATION_LABELS[course.duration] || course.duration;
          const teacherTypeLabel = getTeacherTypeLabel(course.teacher_type);

          return `
        <div class="history-item" onclick="courseManager.loadCourseFromHistory('${course.id}')">
          <h4>${course.subject}</h4>
          <p>
            <span><i data-lucide="pen-line"></i> ${vulgarizationLabel}</span>
            | <span><i data-lucide="clock"></i> ${durationLabel}</span>
            | <span><i data-lucide="user"></i> ${teacherTypeLabel}</span>
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
        const vulgarizationLabel = VULGARIZATION_LABELS[course.vulgarization] || course.vulgarization;
        const durationLabel = DURATION_LABELS[course.duration] || course.duration;
        const teacherTypeLabel = getTeacherTypeLabel(course.teacher_type);
        displayCourseMetadata(vulgarizationLabel, durationLabel, teacherTypeLabel);
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
export const courseManager = new CourseManager();
window.courseManager = courseManager;

