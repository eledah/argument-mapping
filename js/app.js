/**
 * Debate Logic Visualizer - Main Application
 * Implements Sunburst chart visualization for argument mapping using D3.js
 */

console.log('[app.js] Script loaded');
console.log('[app.js] d3 object:', typeof d3 !== 'undefined' ? d3 : 'NOT DEFINED');

// ==================== TreeBuilder Utility ====================
/**
 * Converts flat JSON node list to nested tree structure for Sunburst chart
 */
class TreeBuilder {
    /**
     * Build tree from flat node list
     * @param {Array} nodes - Array of node objects
     * @returns {Object} Root node with children
     */
    static buildTree(nodes) {
        console.log('[TreeBuilder] buildTree() called with nodes:', nodes);

        // Create a map for quick lookup
        const nodeMap = new Map();

        // Initialize all nodes with empty children array
        nodes.forEach(node => {
            nodeMap.set(node.id, {
                ...node,
                children: [],
                value: node.score?.intensity || 1
            });
        });

        // Find the thesis node (root)
        const thesisNode = Array.from(nodeMap.values()).find(n => n.type === 'thesis');
        if (!thesisNode) {
            console.error('No thesis node found in the data');
            return null;
        }

        console.log('[TreeBuilder] Thesis node found:', thesisNode);

        // Recursively build tree from thesis
        const visited = new Set();
        const buildTreeRecursive = (parentNode) => {
            if (visited.has(parentNode.id)) return;
            visited.add(parentNode.id);

            // Find all nodes that target this parent node
            const children = Array.from(nodeMap.values()).filter(n => {
                if (!n.relations || n.relations.length === 0) return false;
                return n.relations.some(r => r.target_node_id === parentNode.id);
            });

            console.log(`[TreeBuilder] Found ${children.length} children for node ${parentNode.id}:`, children.map(c => c.id));

            children.forEach(childNode => {
                // Add relation info to child
                const relation = childNode.relations.find(r => r.target_node_id === parentNode.id);
                const childWithRelation = {
                    ...childNode,
                    relationType: relation?.relation_type,
                    relationReasoning: relation?.reasoning
                };
                parentNode.children.push(childWithRelation);
                buildTreeRecursive(childWithRelation);
            });
        };

        buildTreeRecursive(thesisNode);

        console.log('[TreeBuilder] Final tree with children:', thesisNode);
        return thesisNode;
    }

    /**
     * Get color for node based on type and relation, with brightness based on intensity
     * @param {Object} node - Node object
     * @returns {string} Color hex code
     */
    static getNodeColor(node) {
        let baseColor;

        // For thesis, use light blue color
        if (node.type === 'thesis') {
            baseColor = Config.colors.thesis;
        } else {
            // For other nodes, color based on relation type
            baseColor = node.relationType === 'attack' ? Config.colors.attack : Config.colors.support;
        }

        // Apply brightness based on intensity (higher intensity = darker)
        const intensity = node.score?.intensity || 0.5;
        return this.adjustBrightness(baseColor, intensity);
    }

    static adjustBrightness(hexColor, intensity) {
        const r = parseInt(hexColor.slice(1, 3), 16);
        const g = parseInt(hexColor.slice(3, 5), 16);
        const b = parseInt(hexColor.slice(5, 7), 16);

        const factor = 1.0 - (intensity * Config.brightness.maxFactor);

        const adjustedR = Math.round(r * factor);
        const adjustedG = Math.round(g * factor);
        const adjustedB = Math.round(b * factor);

        return `#${adjustedR.toString(16).padStart(2, '0')}${adjustedG.toString(16).padStart(2, '0')}${adjustedB.toString(16).padStart(2, '0')}`;
    }

    /**
     * Get border color for node
     * @param {Object} node - Node object
     * @returns {string} Border color hex code
     */
    static getBorderColor(node) {
        return Config.colors.border;
    }

    static getBorderWidth(node) {
        if (node.type === 'thesis') return Config.border.width.thesis;
        if (node.type === 'foundational') return Config.border.width.foundational;
        return Config.border.width.default;
    }
}

// ==================== D3 Sunburst Chart ====================
class D3Sunburst {
    constructor(containerId) {
        console.log('[D3Sunburst] Constructor called with containerId:', containerId);
        this.container = document.getElementById(containerId);
        console.log('[D3Sunburst] Container element:', this.container);
        this.width = 0;
        this.height = 0;
        this.radius = 0;
        this.svg = null;
        this.partition = null;
        this.arc = null;
        this.root = null;
        this.currentRoot = null;
        this.zoomStack = [];
        this.centerScale = Config.chart.defaultCenterScale;

        this.onHover = null;
        this.onMouseOut = null;
        this.onClick = null;

        this.init();
    }

    init() {
        console.log('[D3Sunburst] init() called');
        console.log('[D3Sunburst] d3 object:', d3);
        console.log('[D3Sunburst] d3.version:', d3.version);
        
        // Create SVG
        this.svg = d3.select(this.container)
            .append('svg')
            .attr('width', '100%')
            .attr('height', '100%')
            .attr('viewBox', `0 0 ${Config.chart.viewBoxWidth} ${Config.chart.viewBoxHeight}`)
            .attr('preserveAspectRatio', 'xMidYMid meet');
        
        console.log('[D3Sunburst] SVG created:', this.svg);
        
        // Create group for chart
        this.g = this.svg.append('g')
            .attr('transform', `translate(${Config.chart.viewBoxWidth / 2}, ${Config.chart.viewBoxHeight / 2})`);
        
        console.log('[D3Sunburst] Group created:', this.g);
        
        // Create partition layout
        this.partition = d3.partition()
            .size([2 * Math.PI, this.radius]);
        
        // Create arc generator
        // Scale factor adjusted dynamically based on tree depth
        this.arc = d3.arc()
            .startAngle(d => d.x0)
            .endAngle(d => d.x1)
            .padAngle(0.03)
            .innerRadius(d => d.y0 * this.centerScale)
            .outerRadius(d => d.y1 * this.centerScale);
        
        // Handle resize
        window.addEventListener('resize', () => this.resize());
        // Don't call resize during init - container may be hidden
        // Resize will be called when chart becomes visible
    }

    resize() {
        const containerRect = this.container.getBoundingClientRect();
        this.width = containerRect.width;
        this.height = containerRect.height;
        this.radius = Math.min(this.width, this.height) / 2 - Config.chart.radiusPadding;

        console.log('[D3Sunburst] resize() - width:', this.width, 'height:', this.height, 'radius:', this.radius);

        if (this.radius < Config.chart.minRadius) {
            console.log('[D3Sunburst] Radius too small, skipping render');
            return;
        }
        
        // Update partition and arc
        this.partition.size([2 * Math.PI, this.radius]);
        this.arc.innerRadius(d => d.y0 * this.centerScale)
            .outerRadius(d => d.y1 * this.centerScale)
            .padAngle(Config.spacing.padAngle.inner);
        
        // Update SVG viewBox
        this.svg.attr('viewBox', `0 0 ${this.width} ${this.height}`);
        this.g.attr('transform', `translate(${this.width / 2}, ${this.height / 2})`);
        
        // Re-render if data exists
        if (this.root) {
            this.render(this.currentRoot);
        }
    }

    /**
     * Render the sunburst chart
     * @param {Object} rootNode - Root node to render
     */
    render(rootNode) {
        console.log('[D3Sunburst] render() called with rootNode:', rootNode);
        this.currentRoot = rootNode;

        // Create hierarchy
        // Don't use .sum() - it accumulates descendant values
        // We'll manually assign equal angular space
        this.root = d3.hierarchy(rootNode);

        console.log('[D3Sunburst] Hierarchy created:', this.root);
        console.log('[D3Sunburst] Descendants:', this.root.descendants());

        // Calculate max depth to adjust scaling
        let maxDepth = 0;
        this.root.each(d => { maxDepth = Math.max(maxDepth, d.depth); });
        console.log('[D3Sunburst] Max depth:', maxDepth);

        // Apply partition with dummy values
        this.partition(this.root);

        // Manually assign equal angular space to siblings at each level
        const setEqualAngles = (node, x0, x1) => {
            node.x0 = x0;
            node.x1 = x1;

            if (node.children && node.children.length > 0) {
                const span = x1 - x0;
                const childSpan = span / node.children.length;
                node.children.forEach((child, i) => {
                    setEqualAngles(child, x0 + i * childSpan, x0 + (i + 1) * childSpan);
                });
            }
        };
        setEqualAngles(this.root, 0, 2 * Math.PI);

        console.log('[D3Sunburst] After manual angle assignment');

        console.log('[D3Sunburst] After manual angle assignment');

        const getRadius = (y) => {
            const normalized = y / this.radius;
            const exponent = Config.spacing.radiusExponent.base + (maxDepth - Config.spacing.exponentDepthThreshold) * Config.spacing.radiusExponent.perLevel;
            return Math.pow(normalized, exponent) * this.radius;
        };

        console.log('[D3Sunburst] Radius exponent:', Config.spacing.radiusExponent.base + (maxDepth - Config.spacing.exponentDepthThreshold) * Config.spacing.radiusExponent.perLevel);

        const verticalGap = this.radius * Config.spacing.verticalGap;

        const getPadAngle = (d) => {
            const depthFraction = d.depth / maxDepth;
            return Config.spacing.padAngle.inner - (depthFraction * (Config.spacing.padAngle.inner - Config.spacing.padAngle.outer));
        };

        this.arc.innerRadius(d => getRadius(d.y0) + verticalGap)
            .outerRadius(d => getRadius(d.y1) - verticalGap)
            .padAngle(getPadAngle);
        
        // Clear previous content
        this.g.selectAll('*').remove();
        
        // Create paths
        const paths = this.g.selectAll('path')
            .data(this.root.descendants())
            .enter()
            .append('path')
            .attr('d', this.arc)
            .style('fill', d => TreeBuilder.getNodeColor(d.data))
            .style('cursor', 'pointer')
            .style('opacity', 1);
        
        console.log('[D3Sunburst] Paths created:', paths.size());
        
        // Add hover events
        paths.on('mouseover', (event, d) => {
            // Dim all paths
            paths.style('opacity', 0.3);
            // Highlight hovered path
            d3.select(event.currentTarget)
                .style('opacity', 1)
                .style('filter', 'brightness(1.2)');
            
            if (this.onHover) {
                this.onHover(d.data, event);
            }
        })
        .on('mouseout', (event, d) => {
            // Reset all paths
            paths.style('opacity', 1)
                .style('filter', 'none');
            
            if (this.onMouseOut) {
                this.onMouseOut();
            }
        })
        .on('click', (event, d) => {
            if (this.onClick) {
                this.onClick(d.data, d);
            }
        });
    }

    /**
     * Zoom to a specific node
     * @param {Object} node - Node to zoom to
     */
    zoomTo(node) {
        this.currentRoot = node;
        this.render(node);
    }

    /**
     * Reset to original root
     */
    reset() {
        if (this.root) {
            this.currentRoot = this.root.data;
            this.render(this.root.data);
        }
    }
}

// ==================== Application ====================
class DebateVisualizer {
    constructor() {
        this.chart = null;
        this.currentData = null;
        this.currentTree = null;
        this.zoomStack = [];
        this.activeFile = null;
        
        this.init();
    }

    init() {
        console.log('[DebateVisualizer] init() called');
        console.log('[DebateVisualizer] d3 available:', typeof d3 !== 'undefined');

        // Initialize D3 Sunburst chart
        this.chart = new D3Sunburst('sunburstChart');

        // Set up event handlers
        this.chart.onHover = (nodeData, event) => this.handleHover(nodeData, event);
        this.chart.onMouseOut = () => this.handleMouseOut();
        this.chart.onClick = (nodeData, d3Node) => this.handleClick(nodeData, d3Node);

        // Load file list
        this.loadFileList();

        // Set up upload functionality
        this.setupUpload();

        // Set up copy prompt functionality
        this.setupCopyPrompt();
    }

    /**
     * Load list of JSON files from json directory
     * Dynamically discovers JSON files by attempting to fetch them
     */
    async loadFileList() {
        const fileList = document.getElementById('fileList');
        fileList.innerHTML = '<div class="loading">در حال بارگذاری...</div>';

        try {
            // Try to fetch a manifest file first
            const files = await this.discoverJsonFiles();
            
            fileList.innerHTML = '';
            
            for (const filename of files) {
                const fileItem = await this.createFileItem(filename);
                fileList.appendChild(fileItem);
            }
        } catch (error) {
            console.error('Error loading file list:', error);
            fileList.innerHTML = '<div class="loading">خطا در بارگذاری فایل‌ها</div>';
        }
    }

    /**
     * Discover JSON files in the json directory
     * Tries multiple methods to find available JSON files
     * @returns {Promise<Array<string>>} Array of JSON filenames
     */
    async discoverJsonFiles() {
        let files = [];
        
        try {
            // Method 1: Try to fetch a manifest file
            const manifestResponse = await fetch('json/files.json');
            if (manifestResponse.ok) {
                const manifest = await manifestResponse.json();
                if (Array.isArray(manifest.files)) {
                    files = manifest.files;
                    console.log('[DebateVisualizer] Loaded file list from manifest:', files);
                    return files;
                }
            }
        } catch (e) {
            console.log('[DebateVisualizer] No manifest file found, trying fallback methods');
        }
        
        try {
            // Method 2: Try to fetch an index file (common in static hosting)
            const indexResponse = await fetch('json/?t=' + Date.now(), { method: 'HEAD' });
            if (indexResponse.ok) {
                console.log('[DebateVisualizer] Index listing available, but parsing not supported in pure JS');
            }
        } catch (e) {
            console.log('[DebateVisualizer] Cannot list directory directly');
        }
        
        try {
            // Method 3: Try to discover files by attempting common filenames
            const potentialFiles = ['hijab.json', 'debate.json', 'argument.json', 'logic.json'];
            
            for (const filename of potentialFiles) {
                try {
                    const response = await fetch(`json/${filename}`, { method: 'HEAD' });
                    if (response.ok) {
                        if (!files.includes(filename)) {
                            files.push(filename);
                            console.log('[DebateVisualizer] Discovered file:', filename);
                        }
                    }
                } catch (e) {
                    // File doesn't exist, skip
                }
            }
        } catch (e) {
            console.log('[DebateVisualizer] File discovery failed:', e);
        }
        
        // Fallback: Return hijab.json if no files found
        if (files.length === 0) {
            console.log('[DebateVisualizer] No files discovered, using fallback');
            files = ['hijab.json'];
        }
        
        return files;
    }

    /**
     * Create a file list item
     * @param {string} filename - Name of the JSON file
     * @returns {Promise<HTMLElement>} File item element
     */
    async createFileItem(filename) {
        const item = document.createElement('div');
        item.className = 'file-item';
        item.dataset.filename = filename;

        try {
            const data = await this.loadJsonFile(filename);
            const thesisNode = data.new_nodes?.find(n => n.type === 'thesis');
            const title = thesisNode?.title || filename.replace('.json', '');
            const nodeCount = data.new_nodes?.length || 0;

            item.innerHTML = `
                <div class="file-item-title">${title}</div>
                <div class="file-item-meta">${nodeCount} گزاره</div>
            `;

            item.addEventListener('click', () => this.loadFile(filename, item));
        } catch (error) {
            item.innerHTML = `
                <div class="file-item-title">${filename}</div>
                <div class="file-item-meta">خطا در بارگذاری</div>
            `;
        }

        return item;
    }

    /**
     * Load a JSON file
     * @param {string} filename - Name of the file to load
     * @returns {Promise<Object>} Parsed JSON data
     */
    async loadJsonFile(filename) {
        const response = await fetch(`json/${filename}`);
        if (!response.ok) {
            throw new Error(`Failed to load ${filename}`);
        }
        return await response.json();
    }

    /**
     * Load and visualize a debate file
     * @param {string} filename - Name of the file
     * @param {HTMLElement} fileItem - The clicked file item element
     */
    async loadFile(filename, fileItem) {
        console.log('[DebateVisualizer] loadFile() called with filename:', filename);
        
        // Update active state
        document.querySelectorAll('.file-item').forEach(item => {
            item.classList.remove('active');
        });
        fileItem.classList.add('active');

        this.activeFile = filename;

        try {
            const data = await this.loadJsonFile(filename);
            console.log('[DebateVisualizer] Data loaded:', data);
            this.currentData = data;
            
            // Build tree from flat nodes
            this.currentTree = TreeBuilder.buildTree(data.new_nodes);
            console.log('[DebateVisualizer] Tree built:', this.currentTree);
            
            if (!this.currentTree) {
                console.error('Failed to build tree from data');
                return;
            }

            // Reset zoom stack
            this.zoomStack = [this.currentTree];

            // Show chart, hide empty state
            document.getElementById('chartWrapper').classList.add('active');
            document.getElementById('emptyState').style.display = 'none';
            
            // Update UI - after chart is visible
            this.updateChartHeader(this.currentTree);
            console.log('[DebateVisualizer] About to call chart.render()');
            this.chart.render(this.currentTree);
            
            setTimeout(() => this.chart.resize(), Config.animation.resizeDelay);

        } catch (error) {
            console.error('Error loading file:', error);
            alert('خطا در بارگذاری فایل');
        }
    }

    /**
     * Update chart header with current node info
     * @param {Object} node - Current root node
     */
    updateChartHeader(node) {
        const titleEl = document.getElementById('chartTitle');
        const breadcrumbEl = document.getElementById('breadcrumb');
        
        titleEl.textContent = node.title;
        
        // Build breadcrumb
        if (this.zoomStack.length > 1) {
            const breadcrumbItems = this.zoomStack.map((n, index) => {
                return `<span class="breadcrumb-item" data-index="${index}">${n.title}</span>`;
            });
            breadcrumbEl.innerHTML = breadcrumbItems.join('<span class="breadcrumb-separator"> / </span>');
            
            // Add click handlers to breadcrumb items
            breadcrumbEl.querySelectorAll('.breadcrumb-item').forEach(item => {
                item.addEventListener('click', (e) => {
                    const index = parseInt(e.target.dataset.index);
                    this.zoomToLevel(index);
                });
            });
        } else {
            breadcrumbEl.innerHTML = '';
        }
    }

    /**
     * Handle hover event on chart nodes
     * @param {Object} nodeData - Node data object
     * @param {Event} event - Mouse event
     */
    handleHover(nodeData, event) {
        this.showDetailCard(nodeData, event);
    }

    /**
     * Handle mouse out event
     */
    handleMouseOut() {
        this.hideDetailCard();
    }

    /**
     * Handle click event on chart nodes
     * @param {Object} nodeData - Node data object
     * @param {Object} d3Node - D3 node object
     */
    handleClick(nodeData, d3Node) {
        // If clicking on center node (depth 0)
        if (d3Node.depth === 0) {
            // Only zoom out if not at the top level
            if (this.zoomStack.length > 1) {
                this.zoomOut();
            }
            // If at top level, do nothing
        } else if (nodeData.children && nodeData.children.length > 0) {
            // Zoom in to clicked node
            this.zoomIn(nodeData.id);
        }
    }

    /**
     * Show detail card with node information
     * @param {Object} nodeData - Node data object
     * @param {Event} event - Mouse event for positioning
     */
    showDetailCard(nodeData, event) {
        const card = document.getElementById('detailCard');
        
        // Update card content
        document.getElementById('detailType').textContent = this.translateType(nodeData.type);
        document.getElementById('detailType').className = `detail-type ${nodeData.type}`;
        document.getElementById('detailSpeaker').textContent = nodeData.speaker || 'ناشناس';
        document.getElementById('detailTitle').textContent = nodeData.title;
        document.getElementById('detailDescription').textContent = nodeData.description;
        document.getElementById('detailQuote').textContent = `"${nodeData.quote || ''}"`;
        
        // Update relation info via border color
        const relationReasoning = document.getElementById('detailReasoning');
        
        if (nodeData.relationType) {
            card.classList.remove('border-support', 'border-attack');
            card.classList.add(`border-${nodeData.relationType}`);
            relationReasoning.style.display = 'none';
        } else {
            card.classList.remove('border-support', 'border-attack');
            relationReasoning.style.display = 'none';
        }
        
        // Update score
        const intensity = nodeData.score?.intensity || 0;
        document.getElementById('scoreFill').style.width = `${intensity * 100}%`;
        document.getElementById('scoreValue').textContent = intensity.toFixed(2);
        
        // Position card near mouse
        const x = event.clientX;
        const y = event.clientY;
        const cardWidth = 350;
        const cardHeight = 400;
        
        let posX = x + 20;
        let posY = y + 20;
        
        // Prevent card from going off screen
        if (posX + cardWidth > window.innerWidth) {
            posX = x - cardWidth - 20;
        }
        if (posY + cardHeight > window.innerHeight) {
            posY = y - cardHeight - 20;
        }
        
        card.style.left = `${posX}px`;
        card.style.top = `${posY}px`;
        card.classList.add('visible');
    }

    /**
     * Hide detail card
     */
    hideDetailCard() {
        document.getElementById('detailCard').classList.remove('visible');
    }

    /**
     * Zoom in to a specific node
     * @param {string} nodeId - ID of node to zoom to
     */
    zoomIn(nodeId) {
        // Find the node in the current tree
        const node = this.findNodeById(this.currentTree, nodeId);
        if (node) {
            this.zoomStack.push(node);
            this.updateChartHeader(node);
            this.chart.zoomTo(node);
        }
    }

    /**
     * Zoom out one level
     */
    zoomOut() {
        if (this.zoomStack.length > 1) {
            this.zoomStack.pop();
            const node = this.zoomStack[this.zoomStack.length - 1];
            this.updateChartHeader(node);
            this.chart.zoomTo(node);
        }
    }

    /**
     * Zoom to a specific level in the stack
     * @param {number} level - Level index to zoom to
     */
    zoomToLevel(level) {
        if (level >= 0 && level < this.zoomStack.length) {
            this.zoomStack = this.zoomStack.slice(0, level + 1);
            const node = this.zoomStack[this.zoomStack.length - 1];
            this.updateChartHeader(node);
            this.chart.zoomTo(node);
        }
    }

    /**
     * Find a node by ID in the tree
     * @param {Object} node - Root node to search from
     * @param {string} id - ID to find
     * @returns {Object|null} Found node or null
     */
    findNodeById(node, id) {
        if (node.id === id) {
            return node;
        }
        
        if (node.children) {
            for (const child of node.children) {
                const found = this.findNodeById(child, id);
                if (found) return found;
            }
        }
        
        return null;
    }

    /**
     * Translate node type to Persian
     * @param {string} type - Node type
     * @returns {string} Persian translation
     */
    translateType(type) {
        const translations = {
            thesis: 'گزاره اصلی',
            foundational: 'بنیادین',
            practical: 'عملی'
        };
        return translations[type] || type;
    }

    /**
     * Translate relation type to Persian
     * @param {string} relation - Relation type
     * @returns {string} Persian translation
     */
    translateRelation(relation) {
        const translations = {
            support: 'حمایت',
            attack: 'انتقاد'
        };
        return translations[relation] || relation;
    }

    /**
     * Set up file upload functionality
     */
    setupUpload() {
        const uploadBtn = document.getElementById('uploadBtn');
        const fileInput = document.getElementById('fileInput');

        uploadBtn.addEventListener('click', () => {
            fileInput.click();
        });

        fileInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) {
                this.handleFileUpload(file);
            }
            // Reset input so same file can be selected again
            fileInput.value = '';
        });
    }

    /**
     * Handle uploaded file
     * @param {File} file - Uploaded file object
     */
    async handleFileUpload(file) {
        try {
            const text = await file.text();
            const data = JSON.parse(text);

            // Validate data structure
            if (!this.validateUploadedData(data)) {
                alert('خطا: ساختار فایل نامعتبر است. فایل باید دارای آرایه "new_nodes" با حداقل یک گزاره اصلی (thesis) باشد.');
                return;
            }

            // Clear active state from file list
            document.querySelectorAll('.file-item').forEach(item => {
                item.classList.remove('active');
            });

            this.activeFile = file.name;

            console.log('[DebateVisualizer] Uploaded data:', data);
            this.currentData = data;

            // Build tree from flat nodes
            this.currentTree = TreeBuilder.buildTree(data.new_nodes);
            console.log('[DebateVisualizer] Tree built:', this.currentTree);

            if (!this.currentTree) {
                console.error('Failed to build tree from data');
                alert('خطا: نتوانستیم ساختار درختی را از داده‌ها بسازیم.');
                return;
            }

            // Reset zoom stack
            this.zoomStack = [this.currentTree];

            // Show chart, hide empty state
            document.getElementById('chartWrapper').classList.add('active');
            document.getElementById('emptyState').style.display = 'none';

            // Update UI
            this.updateChartHeader(this.currentTree);
            console.log('[DebateVisualizer] About to call chart.render()');
            this.chart.render(this.currentTree);

            setTimeout(() => this.chart.resize(), Config.animation.resizeDelay);

        } catch (error) {
            console.error('Error uploading file:', error);
            alert('خطا: فایل نامعتبر است یا خواندن آن ممکن نیست.');
        }
    }

    /**
     * Validate uploaded data structure
     * @param {Object} data - Parsed JSON data
     * @returns {boolean} True if valid
     */
    validateUploadedData(data) {
        if (!data || typeof data !== 'object') return false;
        if (!Array.isArray(data.new_nodes)) return false;
        if (data.new_nodes.length === 0) return false;

        // Check for at least one thesis node
        const hasThesis = data.new_nodes.some(node => node.type === 'thesis');
        return hasThesis;
    }

    /**
     * Set up copy system prompt functionality
     */
    setupCopyPrompt() {
        const copyBtn = document.getElementById('copyPromptBtn');

        copyBtn.addEventListener('click', async () => {
            let promptText = '';

            try {
                // Fetch the system prompt file
                const response = await fetch('system_prompt.md');
                if (!response.ok) {
                    throw new Error('Failed to fetch system prompt');
                }
                promptText = await response.text();

            } catch (error) {
                console.error('Error fetching system prompt:', error);
                // Use fallback hardcoded text
                promptText = await this.getSystemPromptFallback();
            }

            // Try modern clipboard API first
            if (navigator.clipboard && navigator.clipboard.writeText) {
                try {
                    await navigator.clipboard.writeText(promptText);
                    this.showToast('کپی شد!');
                    return;
                } catch (clipboardError) {
                    console.error('Clipboard API failed:', clipboardError);
                    // Fall through to fallback method
                }
            }

            // Fallback: use execCommand (works on HTTP)
            try {
                this.copyTextFallback(promptText);
                this.showToast('کپی شد!');
            } catch (fallbackError) {
                console.error('Fallback copy also failed:', fallbackError);
                alert('خطا در کپی کردن سیستم پرامپت');
            }
        });
    }

    /**
     * Fallback copy method using execCommand
     * @param {string} text - Text to copy
     */
    copyTextFallback(text) {
        const textarea = document.createElement('textarea');
        textarea.value = text;
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);

        textarea.select();

        try {
            const successful = document.execCommand('copy');
            if (!successful) {
                throw new Error('execCommand failed');
            }
        } finally {
            document.body.removeChild(textarea);
        }
    }

    /**
     * Fallback method to get system prompt text
     * @returns {Promise<string>} System prompt text
     */
    async getSystemPromptFallback() {
        return `# Role
You are a Lead Logic Analyst. Your mission is to structure chaotic debates into a hierarchical Argument Graph (DAG). You identify the **CORE ARGUMENT** and ensure every node is a distinct **proposition**, not just a topic.

# Input Data
1. <transcript>: Raw text from the debate (Farsi).
2. <existing_graph>: Current JSON of the argument map.
3. <speakers_list>: Names of the main participants.

# PHASE 1: The Core Argument (Thesis)
**IF** \`<existing_graph>\` is EMPTY, define Node "1":
- It must be the central **Claim** of the debate (e.g., "The government must not interfere in clothing").
- Mark as \`"type": "thesis"\`.

# PHASE 2: Argument Extraction
Process the transcript to add/update nodes.
1. **Segmentation:** Break text into atomic logical units.
2. **Attribution:** Assign correct speaker.
3. **Depth Analysis (Tagging):** \`thesis\`, \`foundational\`, \`practical\`.

# Content Rules (Strict)
1. **Title (The Proposition):**
   - **Constraint:** MUST be a complete sentence with a **Verb**. It represents a claim that can be True or False.
   - **Negative Example:** "Economic Cost" (This is a topic, NOT a title).
   - **Positive Example:** "The plan causes inflation" (این طرح تورم‌زا است).
   - Length: Short (3-8 words).
2. **Description:** The full logical argument, clarifying the reasoning.
3. **Quote:** Verbatim substring from text.

# Linking Logic
- Link new nodes to the most relevant existing node.
- **NO LOOPS:** Ensure DAG structure.

# Output Schema (JSON Only)
{
  "new_nodes": [
    {
      "id": "String (Integer, sequential)",
      "title": "String (Farsi Proposition with VERB)",
      "description": "String (Full Farsi argument)",
      "quote": "String (Verbatim text)",
      "speaker": "String",
      "type": "thesis" | "foundational" | "practical",
      "score": {
        "intensity": Float (0-1),
        "confidence": Float (0-1)
      },
      "relations": [
        {
          "target_node_id": "String (Target ID)",
          "relation_type": "support" | "attack",
          "reasoning": "String"
        }
      ]
    }
  ]
}

---
<speakers_list>
{{INSERT_SPEAKER_NAMES_HERE}}
</speakers_list>

<existing_graph>
{{INSERT_EXISTING_JSON_HERE}}
</existing_graph>

<transcript>
{{INSERT_RAW_TEXT_HERE}}
</transcript>`;
    }

    /**
     * Show toast notification
     * @param {string} message - Message to display
     */
    showToast(message) {
        const toast = document.getElementById('toast');
        toast.textContent = message;
        toast.classList.add('visible');

        setTimeout(() => {
            toast.classList.remove('visible');
        }, 2000);
    }
}

// Initialize application when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.app = new DebateVisualizer();
});
