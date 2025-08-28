describe('Dashboard E2E Tests', () => {
    beforeEach(() => {
        // Login et navigation vers dashboard
        cy.login('test@example.com', 'password123');
        cy.visit('/dashboard');
        cy.wait('@dashboardLoad');
    });

    describe('Affichage initial', () => {
        it('devrait afficher tous les widgets KPI', () => {
            cy.get('[data-widget-type="kpi"]').should('have.length', 4);
            cy.get('[data-widget-id="courses-completed"]').should('be.visible');
            cy.get('[data-widget-id="quiz-average"]').should('be.visible');
            cy.get('[data-widget-id="learning-time"]').should('be.visible');
            cy.get('[data-widget-id="current-streak"]').should('be.visible');
        });

        it('devrait afficher le graphique de progression', () => {
            cy.get('[data-widget-id="progression-chart"]').should('be.visible');
            cy.get('canvas').should('exist');
        });

        it('devrait afficher la heatmap d\'activité', () => {
            cy.get('[data-widget-id="activity-heatmap"]').should('be.visible');
        });
    });

    describe('Interactions et filtres', () => {
        it('devrait filtrer par période', () => {
            // Sélectionner période mensuelle
            cy.get('#periodFilter').select('month');
            cy.wait('@metricsUpdate');
            
            // Vérifier mise à jour des widgets
            cy.get('[data-widget-id="progression-chart"]')
                .should('contain', '30 derniers jours');
        });

        it('devrait permettre le rafraîchissement d\'un widget', () => {
            cy.get('[data-widget-id="courses-completed"] .widget-refresh')
                .click();
            
            cy.wait('@widgetRefresh');
            
            // Vérifier animation de chargement
            cy.get('[data-widget-id="courses-completed"] .widget-loading')
                .should('not.be.visible');
        });

        it('devrait permettre l\'expansion d\'un widget', () => {
            cy.get('[data-widget-id="progression-chart"] .widget-expand')
                .click();
            
            cy.get('[data-widget-id="progression-chart"]')
                .should('have.class', 'fullscreen');
            
            // Fermer fullscreen
            cy.get('body').type('{esc}');
            
            cy.get('[data-widget-id="progression-chart"]')
                .should('not.have.class', 'fullscreen');
        });
    });

    describe('Drag and Drop', () => {
        it('devrait permettre de réorganiser les widgets', () => {
            const dataTransfer = new DataTransfer();
            
            cy.get('[data-widget-id="courses-completed"]')
                .trigger('dragstart', { dataTransfer });
            
            cy.get('[data-widget-id="quiz-average"]')
                .trigger('drop', { dataTransfer });
            
            cy.get('[data-widget-id="courses-completed"]')
                .trigger('dragend');
            
            // Vérifier nouvelle position
            cy.get('.widget-card').first()
                .should('have.attr', 'data-widget-id', 'quiz-average');
        });

        it('devrait sauvegarder la configuration après réorganisation', () => {
            // Réorganiser
            const dataTransfer = new DataTransfer();
            
            cy.get('[data-widget-id="courses-completed"]')
                .trigger('dragstart', { dataTransfer });
            
            cy.get('[data-widget-id="quiz-average"]')
                .trigger('drop', { dataTransfer });
            
            // Attendre sauvegarde automatique
            cy.wait('@saveConfig');
            
            // Recharger la page
            cy.reload();
            cy.wait('@dashboardLoad');
            
            // Vérifier que la configuration est persistée
            cy.get('.widget-card').first()
                .should('have.attr', 'data-widget-id', 'quiz-average');
        });
    });

    describe('Graphiques interactifs', () => {
        it('devrait afficher tooltip au survol du graphique', () => {
            cy.get('[data-widget-id="progression-chart"] canvas')
                .trigger('mousemove', { clientX: 200, clientY: 150 });
            
            cy.get('.chart-tooltip').should('be.visible');
        });

        it('devrait permettre de masquer/afficher des séries', () => {
            cy.get('[data-widget-id="progression-chart"] .legend-item')
                .first()
                .click();
            
            // Vérifier que la série est masquée
            cy.get('[data-widget-id="progression-chart"] .legend-item')
                .first()
                .should('have.class', 'disabled');
        });
    });

    describe('Export et partage', () => {
        it('devrait exporter le dashboard en PDF', () => {
            cy.get('#exportButton').click();
            cy.get('[data-export-format="pdf"]').click();
            
            cy.wait('@exportPDF');
            
            // Vérifier le téléchargement
            cy.readFile('cypress/downloads/dashboard.pdf').should('exist');
        });

        it('devrait permettre le partage du dashboard', () => {
            cy.get('#shareButton').click();
            
            cy.get('#shareModal').should('be.visible');
            
            // Copier le lien
            cy.get('#copyLinkButton').click();
            
            cy.window().its('navigator.clipboard')
                .invoke('readText')
                .should('contain', '/dashboard/shared/');
        });
    });

    describe('Performance', () => {
        it('devrait charger le dashboard en moins de 3 secondes', () => {
            cy.visit('/dashboard', {
                onBeforeLoad: (win) => {
                    win.performance.mark('dashboard-start');
                }
            });
            
            cy.get('[data-widget-id="progression-chart"] canvas').should('exist');
            
            cy.window().then((win) => {
                win.performance.mark('dashboard-end');
                win.performance.measure(
                    'dashboard-load',
                    'dashboard-start',
                    'dashboard-end'
                );
                
                const measure = win.performance.getEntriesByName('dashboard-load')[0];
                expect(measure.duration).to.be.lessThan(3000);
            });
        });

        it('devrait gérer efficacement 100+ data points', () => {
            // Charger beaucoup de données
            cy.intercept('GET', '/api/analytics/progression*', {
                fixture: 'large-dataset.json' // 100+ points
            }).as('largeDataset');
            
            cy.get('#periodFilter').select('year');
            cy.wait('@largeDataset');
            
            // Vérifier que le graphique reste fluide
            cy.get('[data-widget-id="progression-chart"] canvas')
                .trigger('mousemove', { clientX: 100, clientY: 100 })
                .trigger('mousemove', { clientX: 200, clientY: 150 })
                .trigger('mousemove', { clientX: 300, clientY: 100 });
            
            // Pas de lag visible
            cy.get('.chart-tooltip').should('be.visible');
        });
    });

    describe('Collaboration temps réel', () => {
        it('devrait afficher les curseurs des autres utilisateurs', () => {
            // Simuler autre utilisateur
            cy.task('connectSecondUser', { dashboardId: 'test-dashboard' });
            
            // Attendre curseur distant
            cy.get('.remote-cursor').should('be.visible');
        });

        it('devrait synchroniser les modifications de widgets', () => {
            // Autre utilisateur modifie un widget
            cy.task('modifyWidget', {
                widgetId: 'courses-completed',
                data: { value: 15 }
            });
            
            // Vérifier mise à jour locale
            cy.get('[data-widget-id="courses-completed"] .kpi-value')
                .should('contain', '15');
        });
    });
});
