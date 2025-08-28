class PerformanceMonitor {
    constructor() {
        this.metrics = {
            fps: [],
            memory: [],
            loadTimes: new Map(),
            errors: [],
            userInteractions: []
        };
        
        this.observers = {
            fps: null,
            memory: null,
            errors: null
        };
        
        this.config = {
            fpsThreshold: 30,
            memoryThreshold: 100 * 1024 * 1024, // 100MB
            errorRateThreshold: 5, // erreurs par minute
            samplingRate: 1000 // ms
        };
        
        this.initialize();
    }

    initialize() {
        this.startFPSMonitoring();
        this.startMemoryMonitoring();
        this.startErrorTracking();
        this.setupPerformanceObserver();
        this.setupUserActivityTracking();
        
        // Envoyer métriques périodiquement
        setInterval(() => this.sendMetrics(), 30000); // 30 secondes
    }

    startFPSMonitoring() {
        let lastTime = performance.now();
        let frames = 0;
        
        const measureFPS = () => {
            frames++;
            const currentTime = performance.now();
            
            if (currentTime >= lastTime + 1000) {
                const fps = Math.round(frames * 1000 / (currentTime - lastTime));
                this.metrics.fps.push({
                    value: fps,
                    timestamp: Date.now()
                });
                
                if (this.metrics.fps.length > 60) {
                    this.metrics.fps.shift();
                }
                
                if (fps < this.config.fpsThreshold) {
                    this.reportPerformanceIssue('low-fps', { fps });
                }
                
                frames = 0;
                lastTime = currentTime;
            }
            
            requestAnimationFrame(measureFPS);
        };
        
        requestAnimationFrame(measureFPS);
    }

    startMemoryMonitoring() {
        if (!performance.memory) {
            console.warn('Memory monitoring not supported');
            return;
        }
        
        setInterval(() => {
            const memory = {
                used: performance.memory.usedJSHeapSize,
                total: performance.memory.totalJSHeapSize,
                limit: performance.memory.jsHeapSizeLimit,
                timestamp: Date.now()
            };
            
            this.metrics.memory.push(memory);
            
            if (this.metrics.memory.length > 300) {
                this.metrics.memory.shift();
            }
            
            if (memory.used > this.config.memoryThreshold) {
                this.reportPerformanceIssue('high-memory', { memory });
            }
        }, this.config.samplingRate);
    }

    startErrorTracking() {
        window.addEventListener('error', (event) => {
            this.trackError({
                message: event.message,
                source: event.filename,
                line: event.lineno,
                column: event.colno,
                stack: event.error?.stack,
                type: 'javascript-error'
            });
        });
        
        window.addEventListener('unhandledrejection', (event) => {
            this.trackError({
                message: event.reason?.message || event.reason,
                stack: event.reason?.stack,
                type: 'unhandled-rejection'
            });
        });
        
        const originalFetch = window.fetch;
        window.fetch = async (...args) => {
            const startTime = performance.now();
            
            try {
                const response = await originalFetch(...args);
                const duration = performance.now() - startTime;
                
                this.trackNetworkRequest({
                    url: args[0],
                    method: args[1]?.method || 'GET',
                    status: response.status,
                    duration,
                    success: response.ok
                });
                
                if (!response.ok) {
                    this.trackError({
                        message: `HTTP ${response.status}: ${response.statusText}`,
                        url: args[0],
                        type: 'network-error'
                    });
                }
                
                return response;
            } catch (error) {
                const duration = performance.now() - startTime;
                
                this.trackError({
                    message: error.message,
                    url: args[0],
                    type: 'network-failure',
                    duration
                });
                
                throw error;
            }
        };
    }

    setupPerformanceObserver() {
        if (!window.PerformanceObserver) {
            console.warn('PerformanceObserver not supported');
            return;
        }
        
        const navigationObserver = new PerformanceObserver((list) => {
            for (const entry of list.getEntries()) {
                if (entry.entryType === 'navigation') {
                    this.trackNavigationTiming(entry);
                }
            }
        });
        navigationObserver.observe({ entryTypes: ['navigation'] });
        
        const resourceObserver = new PerformanceObserver((list) => {
            for (const entry of list.getEntries()) {
                if (entry.entryType === 'resource') {
                    this.trackResourceTiming(entry);
                }
            }
        });
        resourceObserver.observe({ entryTypes: ['resource'] });
        
        if (PerformanceObserver.supportedEntryTypes.includes('longtask')) {
            const longTaskObserver = new PerformanceObserver((list) => {
                for (const entry of list.getEntries()) {
                    this.trackLongTask(entry);
                }
            });
            longTaskObserver.observe({ entryTypes: ['longtask'] });
        }
        
        if (PerformanceObserver.supportedEntryTypes.includes('layout-shift')) {
            let clsValue = 0;
            const clsObserver = new PerformanceObserver((list) => {
                for (const entry of list.getEntries()) {
                    if (!entry.hadRecentInput) {
                        clsValue += entry.value;
                        this.trackLayoutShift(entry);
                    }
                }
            });
            clsObserver.observe({ entryTypes: ['layout-shift'] });
        }
        
        if (PerformanceObserver.supportedEntryTypes.includes('first-input')) {
            const fidObserver = new PerformanceObserver((list) => {
                for (const entry of list.getEntries()) {
                    this.trackFirstInputDelay(entry);
                }
            });
            fidObserver.observe({ entryTypes: ['first-input'] });
        }
    }

    setupUserActivityTracking() {
        document.addEventListener('click', (event) => {
            this.trackUserInteraction({
                type: 'click',
                target: event.target.tagName,
                id: event.target.id,
                class: event.target.className,
                timestamp: Date.now()
            });
        });
        
        document.addEventListener('submit', (event) => {
            this.trackUserInteraction({
                type: 'form-submit',
                formId: event.target.id,
                timestamp: Date.now()
            });
        });
        
        document.addEventListener('visibilitychange', () => {
            this.trackUserInteraction({
                type: 'visibility-change',
                visible: !document.hidden,
                timestamp: Date.now()
            });
        });
    }

    trackError(errorData) {
        this.metrics.errors.push({
            ...errorData,
            timestamp: Date.now(),
            userAgent: navigator.userAgent,
            url: window.location.href
        });
        
        if (this.metrics.errors.length > 100) {
            this.metrics.errors.shift();
        }
        
        const recentErrors = this.metrics.errors.filter(
            e => Date.now() - e.timestamp < 60000
        );
        
        if (recentErrors.length > this.config.errorRateThreshold) {
            this.reportPerformanceIssue('high-error-rate', {
                count: recentErrors.length,
                errors: recentErrors
            });
        }
        
        if (errorData.type === 'javascript-error') {
            this.sendError(errorData);
        }
    }

    trackNetworkRequest(requestData) {
        if (requestData.duration > 3000) {
            this.reportPerformanceIssue('slow-network', requestData);
        }
    }

    trackNavigationTiming(entry) {
        const timing = {
            dns: entry.domainLookupEnd - entry.domainLookupStart,
            tcp: entry.connectEnd - entry.connectStart,
            request: entry.responseStart - entry.requestStart,
            response: entry.responseEnd - entry.responseStart,
            dom: entry.domComplete - entry.domInteractive,
            load: entry.loadEventEnd - entry.loadEventStart,
            total: entry.loadEventEnd - entry.fetchStart
        };
        
        this.metrics.navigationTiming = timing;
        
        if (timing.total > 5000) {
            this.reportPerformanceIssue('slow-page-load', timing);
        }
    }

    trackResourceTiming(entry) {
        if (entry.duration > 1000) {
            this.reportPerformanceIssue('slow-resource', {
                name: entry.name,
                duration: entry.duration,
                type: entry.initiatorType
            });
        }
    }

    trackLongTask(entry) {
        if (entry.duration > 50) {
            this.reportPerformanceIssue('long-task', {
                duration: entry.duration,
                startTime: entry.startTime
            });
        }
    }

    trackLayoutShift(entry) {
        if (entry.value > 0.1) {
            this.reportPerformanceIssue('layout-shift', {
                value: entry.value,
                sources: entry.sources
            });
        }
    }

    trackFirstInputDelay(entry) {
        const fid = entry.processingStart - entry.startTime;
        
        if (fid > 100) {
            this.reportPerformanceIssue('high-fid', {
                delay: fid,
                target: entry.target
            });
        }
    }

    trackUserInteraction(interaction) {
        this.metrics.userInteractions.push(interaction);
        if (this.metrics.userInteractions.length > 100) {
            this.metrics.userInteractions.shift();
        }
    }

    reportPerformanceIssue(type, data) {
        console.warn(`Performance issue detected: ${type}`, data);
        this.sendMetrics({
            type: 'performance-issue',
            issue: type,
            data,
            timestamp: Date.now()
        });
    }

    getCurrentMetrics() {
        const avgFPS = this.metrics.fps.length > 0
            ? this.metrics.fps.reduce((sum, m) => sum + m.value, 0) / this.metrics.fps.length
            : 0;
        
        const currentMemory = this.metrics.memory[this.metrics.memory.length - 1];
        
        return {
            fps: {
                current: this.metrics.fps[this.metrics.fps.length - 1]?.value || 0,
                average: Math.round(avgFPS),
                min: Math.min(...this.metrics.fps.map(m => m.value)),
                max: Math.max(...this.metrics.fps.map(m => m.value))
            },
            memory: currentMemory || {},
            errors: {
                total: this.metrics.errors.length,
                recent: this.metrics.errors.filter(
                    e => Date.now() - e.timestamp < 300000
                ).length
            },
            navigation: this.metrics.navigationTiming || {},
            interactions: this.metrics.userInteractions.length
        };
    }

    async sendMetrics(additionalData = {}) {
        const metrics = {
            ...this.getCurrentMetrics(),
            ...additionalData,
            timestamp: Date.now(),
            url: window.location.href,
            userAgent: navigator.userAgent
        };
        
        try {
            await fetch('/api/monitoring/metrics', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(metrics)
            });
        } catch (error) {
            console.error('Failed to send metrics:', error);
        }
    }

    async sendError(errorData) {
        try {
            await fetch('/api/monitoring/errors', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(errorData)
            });
        } catch (error) {
            console.error('Failed to send error:', error);
        }
    }

    getReport() {
        return {
            summary: this.getCurrentMetrics(),
            timeline: {
                fps: this.metrics.fps,
                memory: this.metrics.memory
            },
            errors: this.metrics.errors,
            interactions: this.metrics.userInteractions
        };
    }

    reset() {
        this.metrics = {
            fps: [],
            memory: [],
            loadTimes: new Map(),
            errors: [],
            userInteractions: []
        };
    }

    destroy() {
        if (this.observers.fps) {
            cancelAnimationFrame(this.observers.fps);
        }
        // additional cleanup could be added here
    }
}

if (typeof window !== 'undefined' && window.location.hostname !== 'localhost') {
    window.performanceMonitor = new PerformanceMonitor();
}

export default PerformanceMonitor;
