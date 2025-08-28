import * as THREE from 'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js';

class KnowledgeGraph3D {
    constructor(container) {
        this.container = container;
        this.nodes = [];
        this.edges = [];
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.controls = null;
        this.raycaster = new THREE.Raycaster();
        this.mouse = new THREE.Vector2();
        this.selectedNode = null;
        
        this.init();
    }

    init() {
        // Créer scène
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0xf0f0f0);
        this.scene.fog = new THREE.Fog(0xf0f0f0, 100, 500);

        // Caméra
        const aspect = this.container.clientWidth / this.container.clientHeight;
        this.camera = new THREE.PerspectiveCamera(75, aspect, 0.1, 1000);
        this.camera.position.set(0, 0, 100);

        // Renderer
        this.renderer = new THREE.WebGLRenderer({ 
            antialias: true,
            alpha: true 
        });
        this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
        this.renderer.setPixelRatio(window.devicePixelRatio);
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        this.container.appendChild(this.renderer.domElement);

        // Contrôles orbit
        this.setupControls();

        // Éclairage
        this.setupLighting();

        // Post-processing
        this.setupPostProcessing();

        // Event listeners
        this.setupEventListeners();

        // Animation loop
        this.animate();
    }

    setupControls() {
        // Contrôles personnalisés pour navigation
        this.controls = {
            rotateSpeed: 0.002,
            zoomSpeed: 0.1,
            autoRotate: true,
            autoRotateSpeed: 0.001
        };

        this.isMouseDown = false;
        this.mouseX = 0;
        this.mouseY = 0;
    }

    setupLighting() {
        // Lumière ambiante
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
        this.scene.add(ambientLight);

        // Lumière directionnelle
        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
        directionalLight.position.set(50, 50, 50);
        directionalLight.castShadow = true;
        directionalLight.shadow.mapSize.width = 2048;
        directionalLight.shadow.mapSize.height = 2048;
        this.scene.add(directionalLight);

        // Point lights pour effet dramatique
        const colors = [0x667eea, 0x764ba2, 0xf093fb, 0xf5576c];
        colors.forEach((color, i) => {
            const light = new THREE.PointLight(color, 0.5, 100);
            light.position.set(
                Math.cos(i * Math.PI / 2) * 50,
                Math.sin(i * Math.PI / 2) * 50,
                0
            );
            this.scene.add(light);
        });
    }

    setupPostProcessing() {
        // Bloom effect pour nodes importants
        // FXAA pour antialiasing
        // Depth of field pour focus
    }

    setupEventListeners() {
        // Mouse events
        this.renderer.domElement.addEventListener('mousedown', (e) => this.onMouseDown(e));
        this.renderer.domElement.addEventListener('mousemove', (e) => this.onMouseMove(e));
        this.renderer.domElement.addEventListener('mouseup', () => this.onMouseUp());
        this.renderer.domElement.addEventListener('wheel', (e) => this.onWheel(e));
        
        // Touch events pour mobile
        this.renderer.domElement.addEventListener('touchstart', (e) => this.onTouchStart(e));
        this.renderer.domElement.addEventListener('touchmove', (e) => this.onTouchMove(e));
        this.renderer.domElement.addEventListener('touchend', () => this.onTouchEnd());

        // Resize
        window.addEventListener('resize', () => this.onWindowResize());

        // Click pour sélection
        this.renderer.domElement.addEventListener('click', (e) => this.onNodeClick(e));
    }

    createNode(data) {
        const geometry = new THREE.SphereGeometry(data.size || 2, 32, 32);
        
        // Matériau avec gradient
        const material = new THREE.MeshPhongMaterial({
            color: new THREE.Color(data.color || 0x667eea),
            emissive: new THREE.Color(data.color || 0x667eea),
            emissiveIntensity: 0.2,
            shininess: 100,
            specular: 0xffffff
        });

        const mesh = new THREE.Mesh(geometry, material);
        mesh.position.set(data.x || 0, data.y || 0, data.z || 0);
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        mesh.userData = data;

        // Ajouter label
        if (data.label) {
            const label = this.createLabel(data.label);
            label.position.y = (data.size || 2) + 2;
            mesh.add(label);
        }

        // Animation d'apparition
        mesh.scale.set(0, 0, 0);
        this.animateScale(mesh, 1, 500);

        this.scene.add(mesh);
        this.nodes.push(mesh);
        
        return mesh;
    }

    createLabel(text) {
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        canvas.width = 256;
        canvas.height = 64;
        
        context.fillStyle = 'white';
        context.fillRect(0, 0, 256, 64);
        
        context.font = 'Bold 24px Arial';
        context.fillStyle = 'black';
        context.textAlign = 'center';
        context.fillText(text, 128, 40);

        const texture = new THREE.CanvasTexture(canvas);
        const spriteMaterial = new THREE.SpriteMaterial({ map: texture });
        const sprite = new THREE.Sprite(spriteMaterial);
        sprite.scale.set(10, 2.5, 1);
        
        return sprite;
    }

    createEdge(node1, node2, data = {}) {
        const points = [];
        points.push(node1.position);
        
        // Courbe de Bézier pour connexion élégante
        const midPoint = new THREE.Vector3(
            (node1.position.x + node2.position.x) / 2,
            (node1.position.y + node2.position.y) / 2,
            (node1.position.z + node2.position.z) / 2
        );
        midPoint.z += 10; // Courber la connexion
        
        points.push(midPoint);
        points.push(node2.position);

        const curve = new THREE.CatmullRomCurve3(points);
        const tubeGeometry = new THREE.TubeGeometry(curve, 20, 0.5, 8, false);
        
        const material = new THREE.MeshPhongMaterial({
            color: data.color || 0xcccccc,
            opacity: 0.6,
            transparent: true
        });

        const mesh = new THREE.Mesh(tubeGeometry, material);
        mesh.userData = { node1, node2, ...data };
        
        this.scene.add(mesh);
        this.edges.push(mesh);
        
        // Animation de flux de données
        this.animateDataFlow(mesh);
        
        return mesh;
    }

    animateDataFlow(edge) {
        // Particules qui suivent l'edge
        const particleGeometry = new THREE.SphereGeometry(0.3, 8, 8);
        const particleMaterial = new THREE.MeshBasicMaterial({
            color: 0xffffff,
            emissive: 0xffffff,
            emissiveIntensity: 1
        });
        
        const particle = new THREE.Mesh(particleGeometry, particleMaterial);
        this.scene.add(particle);
        
        // Animation le long de la courbe
        let progress = 0;
        const animateParticle = () => {
            progress += 0.01;
            if (progress > 1) progress = 0;
            
            // Position sur la courbe
            const position = this.getPositionOnEdge(edge, progress);
            particle.position.copy(position);
            
            requestAnimationFrame(animateParticle);
        };
        
        animateParticle();
    }

    getPositionOnEdge(edge, t) {
        // Calculer position sur courbe de Bézier
        const node1 = edge.userData.node1.position;
        const node2 = edge.userData.node2.position;
        
        const x = (1 - t) * node1.x + t * node2.x;
        const y = (1 - t) * node1.y + t * node2.y;
        const z = (1 - t) * node1.z + t * node2.z;
        
        return new THREE.Vector3(x, y, z);
    }

    loadData(graphData) {
        // Charger nodes
        graphData.nodes.forEach(nodeData => {
            this.createNode(nodeData);
        });
        
        // Charger edges
        graphData.edges.forEach(edgeData => {
            const node1 = this.nodes.find(n => n.userData.id === edgeData.source);
            const node2 = this.nodes.find(n => n.userData.id === edgeData.target);
            
            if (node1 && node2) {
                this.createEdge(node1, node2, edgeData);
            }
        });
        
        // Layout automatique
        this.applyForceDirectedLayout();
    }

    applyForceDirectedLayout() {
        // Simulation physique pour positionnement optimal
        const iterations = 100;
        const repulsion = 50;
        const attraction = 0.01;
        
        for (let i = 0; i < iterations; i++) {
            // Forces de répulsion entre tous les nodes
            this.nodes.forEach((node1, i) => {
                this.nodes.forEach((node2, j) => {
                    if (i !== j) {
                        const force = this.calculateRepulsion(
                            node1.position, 
                            node2.position, 
                            repulsion
                        );
                        node1.position.add(force);
                    }
                });
            });
            
            // Forces d'attraction le long des edges
            this.edges.forEach(edge => {
                const force = this.calculateAttraction(
                    edge.userData.node1.position,
                    edge.userData.node2.position,
                    attraction
                );
                edge.userData.node1.position.add(force);
                edge.userData.node2.position.sub(force);
            });
        }
    }

    calculateRepulsion(pos1, pos2, strength) {
        const diff = pos1.clone().sub(pos2);
        const distance = diff.length() || 1;
        return diff.normalize().multiplyScalar(strength / (distance * distance));
    }

    calculateAttraction(pos1, pos2, strength) {
        const diff = pos2.clone().sub(pos1);
        return diff.multiplyScalar(strength);
    }

    onNodeClick(event) {
        // Raycasting pour sélection
        this.mouse.x = (event.clientX / this.container.clientWidth) * 2 - 1;
        this.mouse.y = -(event.clientY / this.container.clientHeight) * 2 + 1;
        
        this.raycaster.setFromCamera(this.mouse, this.camera);
        const intersects = this.raycaster.intersectObjects(this.nodes);
        
        if (intersects.length > 0) {
            const node = intersects[0].object;
            this.selectNode(node);
        }
    }

    selectNode(node) {
        // Désélectionner ancien node
        if (this.selectedNode) {
            this.animateScale(this.selectedNode, 1, 200);
        }
        
        // Sélectionner nouveau node
        this.selectedNode = node;
        this.animateScale(node, 1.5, 200);
        
        // Émettre événement
        this.container.dispatchEvent(new CustomEvent('node:selected', {
            detail: node.userData
        }));
        
        // Focus caméra
        this.focusOnNode(node);
    }

    focusOnNode(node) {
        const targetPosition = node.position.clone();
        targetPosition.z += 50;
        
        // Animation smooth de la caméra
        const startPosition = this.camera.position.clone();
        const startTime = performance.now();
        const duration = 1000;
        
        const animateCamera = (currentTime) => {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);
            const easeProgress = this.easeInOutCubic(progress);
            
            this.camera.position.lerpVectors(
                startPosition, 
                targetPosition, 
                easeProgress
            );
            
            this.camera.lookAt(node.position);
            
            if (progress < 1) {
                requestAnimationFrame(animateCamera);
            }
        };
        
        requestAnimationFrame(animateCamera);
    }

    animateScale(mesh, targetScale, duration) {
        const startScale = mesh.scale.x;
        const startTime = performance.now();
        
        const animate = (currentTime) => {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);
            const scale = startScale + (targetScale - startScale) * this.easeInOutCubic(progress);
            
            mesh.scale.set(scale, scale, scale);
            
            if (progress < 1) {
                requestAnimationFrame(animate);
            }
        };
        
        requestAnimationFrame(animate);
    }

    easeInOutCubic(t) {
        return t < 0.5 
            ? 4 * t * t * t 
            : 1 - Math.pow(-2 * t + 2, 3) / 2;
    }

    onMouseDown(event) {
        this.isMouseDown = true;
        this.mouseX = event.clientX;
        this.mouseY = event.clientY;
    }

    onMouseMove(event) {
        if (!this.isMouseDown) return;
        
        const deltaX = event.clientX - this.mouseX;
        const deltaY = event.clientY - this.mouseY;
        
        // Rotation de la scène
        this.scene.rotation.y += deltaX * this.controls.rotateSpeed;
        this.scene.rotation.x += deltaY * this.controls.rotateSpeed;
        
        this.mouseX = event.clientX;
        this.mouseY = event.clientY;
    }

    onMouseUp() {
        this.isMouseDown = false;
    }

    onWheel(event) {
        // Zoom
        const zoomDelta = event.deltaY * this.controls.zoomSpeed;
        this.camera.position.z += zoomDelta;
        this.camera.position.z = Math.max(20, Math.min(200, this.camera.position.z));
    }

    onTouchStart(event) {
        if (event.touches.length === 1) {
            this.isMouseDown = true;
            this.mouseX = event.touches[0].clientX;
            this.mouseY = event.touches[0].clientY;
        }
    }

    onTouchMove(event) {
        if (event.touches.length === 1 && this.isMouseDown) {
            const deltaX = event.touches[0].clientX - this.mouseX;
            const deltaY = event.touches[0].clientY - this.mouseY;
            
            this.scene.rotation.y += deltaX * this.controls.rotateSpeed;
            this.scene.rotation.x += deltaY * this.controls.rotateSpeed;
            
            this.mouseX = event.touches[0].clientX;
            this.mouseY = event.touches[0].clientY;
        }
    }

    onTouchEnd() {
        this.isMouseDown = false;
    }

    onWindowResize() {
        const width = this.container.clientWidth;
        const height = this.container.clientHeight;
        
        this.camera.aspect = width / height;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(width, height);
    }

    animate() {
        requestAnimationFrame(() => this.animate());
        
        // Auto-rotation
        if (this.controls.autoRotate && !this.isMouseDown) {
            this.scene.rotation.y += this.controls.autoRotateSpeed;
        }
        
        // Pulsation des nodes
        this.nodes.forEach(node => {
            const pulse = Math.sin(performance.now() * 0.001 + node.userData.id) * 0.1 + 1;
            node.material.emissiveIntensity = 0.2 * pulse;
        });
        
        // Render
        this.renderer.render(this.scene, this.camera);
    }

    destroy() {
        // Nettoyer ressources
        this.nodes.forEach(node => {
            node.geometry.dispose();
            node.material.dispose();
        });
        
        this.edges.forEach(edge => {
            edge.geometry.dispose();
            edge.material.dispose();
        });
        
        this.renderer.dispose();
        this.container.removeChild(this.renderer.domElement);
    }
}

export default KnowledgeGraph3D;
