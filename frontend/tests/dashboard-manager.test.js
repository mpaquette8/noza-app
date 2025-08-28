import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import DashboardManager from '../app/assets/js/dashboard-manager.js';

describe('DashboardManager', () => {
    let dashboardManager;
    let container;

    beforeEach(() => {
        // Setup DOM
        document.body.innerHTML = `
            <div id="dashboardGrid"></div>
            <select id="periodFilter">
                <option value="week">7 jours</option>
            </select>
        `;
        
        container = document.getElementById('dashboardGrid');
        dashboardManager = new DashboardManager('dashboardGrid');
        
        // Mock fetch
        global.fetch = jest.fn();
    });

    describe('Initialisation', () => {
        it('devrait initialiser correctement le dashboard', async () => {
            expect(dashboardManager.container).toBe(container);
            expect(dashboardManager.widgets.size).toBeGreaterThan(0);
            expect(dashboardManager.filters.period).toBe('week');
        });

        it('devrait charger la configuration utilisateur', async () => {
            fetch.mockResolvedValueOnce({
                json: async () => ({
                    widgets: [
                        { id: 'test-widget', type: 'kpi', config: {} }
                    ]
                })
            });

            await dashboardManager.loadUserConfig();
            
            expect(fetch).toHaveBeenCalledWith('/api/user/dashboard-config');
        });
    });

    describe('Gestion des widgets', () => {
        it('devrait ajouter un widget correctement', () => {
            const widgetConfig = {
                id: 'new-widget',
                type: 'kpi',
                gridArea: { col: 1, row: 1, width: 3, height: 1 },
                config: { title: 'Test Widget' }
            };

            const widget = dashboardManager.addWidget(widgetConfig);
            
            expect(dashboardManager.widgets.has('new-widget')).toBe(true);
            expect(widget.id).toBe('new-widget');
        });

        it('devrait rendre un widget dans le container', () => {
            const widgetConfig = {
                id: 'render-test',
                type: 'kpi',
                gridArea: { col: 1, row: 1, width: 3, height: 1 },
                config: { title: 'Render Test' }
            };

            dashboardManager.addWidget(widgetConfig);
            
            const widgetElement = container.querySelector('[data-widget-id="render-test"]');
            expect(widgetElement).toBeTruthy();
        });
    });

    describe('Chargement des données', () => {
        it('devrait charger les données du dashboard', async () => {
            const mockData = {
                courses_completed: 10,
                quiz_average: 85,
                learning_time: 120,
                current_streak: 5
            };

            fetch.mockResolvedValueOnce({
                json: async () => ({ success: true, data: { metrics: mockData } })
            });

            await dashboardManager.loadDashboardData();
            
            expect(fetch).toHaveBeenCalledWith(
                expect.stringContaining('/api/analytics/dashboard')
            );
        });

        it('devrait utiliser le cache pour les requêtes répétées', async () => {
            const mockData = { metrics: { courses: 10 } };
            
            fetch.mockResolvedValueOnce({
                json: async () => mockData
            });

            // Première requête
            await dashboardManager.fetchWithCache('/api/test', {
                params: {},
                cacheTime: 60000
            });

            // Deuxième requête (devrait utiliser le cache)
            await dashboardManager.fetchWithCache('/api/test', {
                params: {},
                cacheTime: 60000
            });

            expect(fetch).toHaveBeenCalledTimes(1);
        });
    });

    describe('Event Handlers', () => {
        it('devrait réagir au changement de période', async () => {
            const periodFilter = document.getElementById('periodFilter');
            const loadSpy = jest.spyOn(dashboardManager, 'loadDashboardData');

            periodFilter.value = 'month';
            periodFilter.dispatchEvent(new Event('change'));

            expect(dashboardManager.filters.period).toBe('month');
            expect(loadSpy).toHaveBeenCalled();
        });

        it('devrait gérer les interactions entre widgets', () => {
            const mockInteraction = {
                sourceWidget: 'widget1',
                targetWidget: 'widget2',
                action: 'filter'
            };

            const handleSpy = jest.spyOn(dashboardManager, 'handleWidgetInteraction');
            
            dashboardManager.eventBus.dispatchEvent(
                new CustomEvent('widget-interaction', { detail: mockInteraction })
            );

            expect(handleSpy).toHaveBeenCalledWith(mockInteraction);
        });
    });

    describe('Export Dashboard', () => {
        it('devrait exporter le dashboard en PNG', async () => {
            const exportSpy = jest.spyOn(dashboardManager, 'exportDashboard');
            
            const result = await dashboardManager.exportDashboard('png');
            
            expect(exportSpy).toHaveBeenCalledWith('png');
            expect(result).toBeDefined();
        });
    });
});
