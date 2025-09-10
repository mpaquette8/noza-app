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

export const TEACHER_TYPES = {
  DIRECT: 'direct',
  STRUCTURE: 'structure',
  IMMERSIF: 'immersif'
};

export const TEACHER_TYPE_LABELS = {
  direct: '💡 Direct',
  structure: '🏗️ Structuré',
  immersif: '🎭 Immersif'
};

export const TEACHER_TYPE_DESCRIPTIONS = {
  direct: 'Je vais droit au but, sans détours',
  structure: 'Je bâtis ta compréhension bloc par bloc',
  immersif: "Je te plonge dans l'univers du sujet"
};

export const DEFAULT_TEACHER_TYPE = 'direct';

export function getTeacherTypeLabel(type) {
  return TEACHER_TYPE_LABELS[type] || type;
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
      const teacherType = Object.values(TEACHER_TYPES).includes(teacher_type)
        ? teacher_type
        : DEFAULT_TEACHER_TYPE;
      payload.teacher_type = utils.sanitizeInput(teacherType);
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
    const formattedContent = this.cleanMarkdownContent(course.content);
    
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

  // Corrige les tableaux condensés sans séparateurs de colonnes
  fixCondensedTables(content) {
    // Pattern pour détecter tableau condensé : **en-têtes** suivi de tirets puis données
    const condensedPattern = /\*\*([^*]+)\*\*\s*([-=]{8,})\s*((?:[A-Za-zÀ-ÿ0-9\s,.%€$-]+(?:\d+[-—]\d+%|[\d,.]+-[\d,.]%|[\d,.]+-[\d,.]+€|[\d,.]+%|[\d,.]+€)\s*)+)/g;

    return content.replace(condensedPattern, (fullMatch, headerText, separator, dataText) => {
      console.log("Correction d'un tableau condensé détecté");

      // 1. Analyser l'en-tête pour identifier les colonnes
      const keywordMarkers = /(Rendement|Coût|Prix|Puissance|Efficacité|Température|Durée|Type|Source|Valeur)/gi;
      const headers = [];

      // Trouver les mots-clés qui marquent le début de nouvelles colonnes
      const keywords = [...headerText.matchAll(keywordMarkers)];

      if (keywords.length > 0) {
        // Extraire chaque segment entre les mots-clés
        headers.push(headerText.substring(0, keywords[0].index).trim());

        for (let i = 0; i < keywords.length - 1; i++) {
          const start = keywords[i].index;
          const end = keywords[i + 1].index;
          headers.push(headerText.substring(start, end).trim());
        }

        // Dernier segment
        const lastKeyword = keywords[keywords.length - 1];
        headers.push(headerText.substring(lastKeyword.index).trim());
      } else {
        // Fallback: division sur les majuscules après minuscules
        const segments = headerText.split(/(?<=[a-zà-ÿ])(?=[A-ZÀ-Ÿ])/);
        headers.push(...segments.map(s => s.trim()).filter(s => s));
      }

      // Nettoyer les en-têtes vides ou trop courts
      const cleanHeaders = headers.filter(h => h && h.length > 1);

      // 2. Analyser les données ligne par ligne
      const rows = [];
      // Split sur les noms propres (majuscule au début de mot)
      const lines = dataText.split(/(?=\n?[A-ZÀ-Ÿ][a-zà-ÿ])/).filter(l => l.trim());

      for (let line of lines) {
        line = line.trim().replace(/\n/g, ' ');
        if (!line) continue;

        // Pattern pour extraire: nom, pourcentage/valeur numérique, prix/unité
        const patterns = [
          // Pattern 1: Nom + pourcentage + prix (ex: "Solaire PV15-20%0,06-0,10€")
          /^([A-Za-zÀ-ÿ\s]+?)([\d-]+%)([\d,.-]+€)$/,
          // Pattern 2: Nom + valeur + unité (ex: "Charbon 850kg CO2/MWh")
          /^([A-Za-zÀ-ÿ\s]+?)([\d,.-]+)\s*([A-Za-z€%/]+)$/,
          // Pattern 3: Nom + deux valeurs numériques
          /^([A-Za-zÀ-ÿ\s]+?)([\d,.-]+)\s*([\d,.-]+)$/
        ];

        let matched = false;
        for (let pattern of patterns) {
          const lineMatch = line.match(pattern);
          if (lineMatch) {
            const row = [
              lineMatch[1].trim(),
              lineMatch[2],
              lineMatch[3] || ''
            ].filter(cell => cell);

            rows.push(row);
            matched = true;
            break;
          }
        }

        // Si aucun pattern ne matche, essayer de diviser manuellement
        if (!matched && line.length > 10) {
          // Chercher les valeurs numériques comme points de division
          const numericMatches = [...line.matchAll(/[\d,.-]+[%€]?/g)];
          if (numericMatches.length >= 2) {
            const lastNumeric = numericMatches[numericMatches.length - 1];
            const secondLastNumeric = numericMatches[numericMatches.length - 2];

            const name = line.substring(0, secondLastNumeric.index).trim();
            const value1 = line.substring(secondLastNumeric.index, lastNumeric.index).trim();
            const value2 = line.substring(lastNumeric.index).trim();

            if (name && value1 && value2) {
              rows.push([name, value1, value2]);
            }
          }
        }
      }

      // 3. Construire le tableau markdown correctement formaté
      if (cleanHeaders.length > 0 && rows.length > 0) {
        let result = '\n\n| ' + cleanHeaders.join(' | ') + ' |\n';
        result += '|' + cleanHeaders.map(() => ' ------- ').join('|') + '|\n';

        for (let row of rows) {
          // Ajuster le nombre de colonnes
          while (row.length < cleanHeaders.length) row.push('');
          while (row.length > cleanHeaders.length) row.pop();

          result += '| ' + row.join(' | ') + ' |\n';
        }

        return result + '\n';
      }

      // Si échec du parsing, retourner tel quel
      console.warn("Échec du parsing du tableau condensé:", fullMatch.substring(0, 50));
      return fullMatch;
    });
  }

  // Fonction de post-traitement pour améliorer le formatage
  cleanMarkdownContent(rawContent) {
    if (!rawContent) return '';

    let content = rawContent
      .replace(/^/gm, '') // Nettoyer les débuts de ligne
      .replace(/\r\n/g, '\n'); // Normaliser les fins de ligne

    // Corriger les tableaux condensés avant tout autre traitement
    content = this.fixCondensedTables(content);

    return content
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

