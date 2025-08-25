class ModernCourseRenderer {
  constructor(container) {
    this.container = container;
    this.theme = {
      modern: {
        gradient: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        cardStyle: 'backdrop-filter: blur(10px); background: rgba(255,255,255,0.9);',
        animation: 'fade-slide'
      },
      minimalist: {
        gradient: 'linear-gradient(135deg, #f5f5f5 0%, #e0e0e0 100%)',
        cardStyle: 'background: white; border: 1px solid #e0e0e0;',
        animation: 'fade'
      },
      playful: {
        gradient: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
        cardStyle: 'background: white; box-shadow: 0 10px 40px rgba(0,0,0,0.1);',
        animation: 'bounce'
      }
    };
  }

  render(data) {
    if (data.legacy) {
      this.container.innerHTML = data.html;
      return;
    }

    const { metadata, hero, sections, conclusion, style } = data;
    const theme = this.theme[style?.tone || 'modern'];

    const html = `
      <div class="modern-course-wrapper" style="--primary: ${style?.primaryColor}; --accent: ${style?.accentColor};">
        ${this.renderHero(hero, metadata, theme)}
        ${this.renderMetadata(metadata)}
        <div class="course-sections">
          ${sections.map(section => this.renderSection(section, theme)).join('')}
        </div>
        ${this.renderConclusion(conclusion, theme)}
      </div>
    `;

    this.container.innerHTML = html;
    this.initializeInteractions();
    this.animateEntrance();
  }

  renderHero(hero, metadata, theme) {
    return `
      <div class="hero-section" style="background: ${theme.gradient};">
        <div class="hero-content">
          <div class="hero-emoji">${metadata.emoji}</div>
          <h1 class="hero-title animated-text">${metadata.title}</h1>
          <p class="hero-subtitle">${metadata.subtitle}</p>
          <div class="hero-intro">
            ${hero.content}
          </div>
          ${hero.visual ? `
            <div class="hero-visual">
              <div class="visual-placeholder" data-description="${hero.visual}">
                <i data-lucide="image" aria-hidden="true"></i>
                <span>${hero.visual}</span>
              </div>
            </div>
          ` : ''}
        </div>
        <div class="hero-wave">
          <svg viewBox="0 0 1440 120" preserveAspectRatio="none">
            <path d="M0,64 C360,96 720,32 1440,64 L1440,120 L0,120 Z" fill="white"></path>
          </svg>
        </div>
      </div>
    `;
  }

  renderMetadata(metadata) {
    return `
      <div class="metadata-bar">
        <div class="metadata-item">
          <i data-lucide="clock" aria-hidden="true"></i>
          <span>${metadata.readingTime} min</span>
        </div>
        <div class="metadata-item">
          <i data-lucide="bar-chart" aria-hidden="true"></i>
          <span>Niveau ${metadata.difficulty}/5</span>
        </div>
        <div class="metadata-tags">
          ${metadata.tags.map(tag => `<span class="tag">#${tag}</span>`).join('')}
        </div>
      </div>
    `;
  }

  renderSection(section, theme) {
    const sectionClass = `course-section section-${section.type}`;
    const hasInteraction = section.interaction?.question || section.interaction?.exercise;

    return `
      <section class="${sectionClass}" id="${section.id}" style="${theme.cardStyle}">
        <div class="section-header">
          <span class="section-emoji">${section.emoji}</span>
          <h2 class="section-title">${section.title}</h2>
        </div>

        <div class="section-content">
          <div class="content-main">
            ${this.parseMarkdown(section.content.main)}
          </div>

          ${section.content.example ? `
            <div class="content-example">
              <div class="example-header">
                <i data-lucide="lightbulb" aria-hidden="true"></i>
                <span>Exemple</span>
              </div>
              <div class="example-body">
                ${this.parseMarkdown(section.content.example)}
              </div>
            </div>
          ` : ''}

          ${section.content.insight ? `
            <div class="content-insight">
              <i data-lucide="star" aria-hidden="true"></i>
              <p>${section.content.insight}</p>
            </div>
          ` : ''}

          ${section.content.visual ? `
            <div class="content-visual">
              ${this.renderVisual(section.content.visual)}
            </div>
          ` : ''}
        </div>

        ${hasInteraction ? `
          <div class="section-interaction">
            ${section.interaction.question ? `
              <div class="interaction-question">
                <i data-lucide="help-circle" aria-hidden="true"></i>
                <p>${section.interaction.question}</p>
                <button class="btn-reflect" data-section="${section.id}">
                  Réfléchir
                </button>
              </div>
            ` : ''}

            ${section.interaction.exercise ? `
              <div class="interaction-exercise">
                <i data-lucide="edit-3" aria-hidden="true"></i>
                <p>${section.interaction.exercise}</p>
                <button class="btn-practice" data-section="${section.id}">
                  Pratiquer
                </button>
              </div>
            ` : ''}
          </div>
        ` : ''}
      </section>
    `;
  }

  renderConclusion(conclusion, theme) {
    return `
      <div class="conclusion-section" style="${theme.cardStyle}">
        <h2 class="conclusion-title">
          <i data-lucide="flag" aria-hidden="true"></i>
          Ce qu'il faut retenir
        </h2>

        <div class="key-points">
          ${conclusion.summary.map((point, i) => `
            <div class="key-point">
              <span class="point-number">${i + 1}</span>
              <p>${point}</p>
            </div>
          `).join('')}
        </div>

        <div class="next-steps">
          <h3>Pour aller plus loin</h3>
          <div class="steps-grid">
            ${conclusion.nextSteps.map(step => `
              <div class="next-step-card">
                <i data-lucide="arrow-right" aria-hidden="true"></i>
                <p>${step}</p>
              </div>
            `).join('')}
          </div>
        </div>

        ${conclusion.reflection ? `
          <div class="reflection-prompt">
            <i data-lucide="message-circle" aria-hidden="true"></i>
            <p>${conclusion.reflection}</p>
          </div>
        ` : ''}
      </div>
    `;
  }

  parseMarkdown(text) {
    return text
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/`(.*?)`/g, '<code>$1</code>')
      .replace(/\n\n/g, '</p><p>')
      .replace(/^/, '<p>')
      .replace(/$/, '</p>');
  }

  renderVisual(description) {
    return `
      <div class="visual-container">
        <div class="visual-placeholder">
          <i data-lucide="image" aria-hidden="true"></i>
          <p>${description}</p>
        </div>
      </div>
    `;
  }

  initializeInteractions() {
    document.querySelectorAll('.btn-reflect').forEach(btn => {
      btn.addEventListener('click', e => {
        const sectionId = e.target.dataset.section;
        this.handleReflection(sectionId);
      });
    });

    document.querySelectorAll('.btn-practice').forEach(btn => {
      btn.addEventListener('click', e => {
        const sectionId = e.target.dataset.section;
        this.handlePractice(sectionId);
      });
    });

    if (window.lucide) {
      window.lucide.createIcons();
    }
  }

  animateEntrance() {
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('animated-in');
        }
      });
    }, { threshold: 0.1 });

    document.querySelectorAll('.course-section').forEach(section => {
      observer.observe(section);
    });
  }

  handleReflection(sectionId) {
    console.log('Réflexion sur section:', sectionId);
  }

  handlePractice(sectionId) {
    console.log('Pratique sur section:', sectionId);
  }
}

window.ModernCourseRenderer = ModernCourseRenderer;
