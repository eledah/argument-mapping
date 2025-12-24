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

        // Build relationships
        nodeMap.forEach((node, id) => {
            if (node.relations && node.relations.length > 0) {
                node.relations.forEach(relation => {
                    const targetNode = nodeMap.get(relation.target_node_id);
                    if (targetNode) {
                        // Add this node as a child of the target
                        // Store relation info on the child
                        const childNode = {
                            ...node,
                            relationType: relation.relation_type,
                            relationReasoning: relation.reasoning
                        };
                        targetNode.children.push(childNode);
                    }
                });
            }
        });

        console.log('[TreeBuilder] Final tree with children:', thesisNode);
        return thesisNode;
    }

    /**
     * Get color for node based on type and relation
     * @param {Object} node - Node object
     * @returns {string} Color hex code
     */
    static getNodeColor(node) {
        const colors = {
            thesis: '#87CEFA',
            foundational: '#4A90E2',
            practical: '#7ED321',
            support: '#50C878',
            attack: '#E74C3C'
        };

        // For thesis, use light blue color
        if (node.type === 'thesis') {
            return colors.thesis;
        }

        // For other nodes, color based on relation type
        return node.relationType === 'attack' ? colors.attack : colors.support;
    }

    /**
     * Get border color for node
     * @param {Object} node - Node object
     * @returns {string} Border color hex code
     */
    static getBorderColor(node) {
        const colors = {
            thesis: '#4A90E2',
            foundational: '#4A90E2',
            default: 'rgba(255,255,255,0.2)'
        };

        if (node.type === 'thesis') {
            return colors.thesis;
        }

        if (node.type === 'foundational') {
            return colors.foundational;
        }

        return colors.default;
    }

    /**
     * Get border width for node
     * @param {Object} node - Node object
     * @returns {number} Border width in pixels
     */
    static getBorderWidth(node) {
        if (node.type === 'thesis') return 3;
        if (node.type === 'foundational') return 4;
        return 2;
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
            .attr('viewBox', '0 0 800 800')
            .attr('preserveAspectRatio', 'xMidYMid meet');
        
        console.log('[D3Sunburst] SVG created:', this.svg);
        
        // Create group for chart
        this.g = this.svg.append('g')
            .attr('transform', 'translate(400, 400)');
        
        console.log('[D3Sunburst] Group created:', this.g);
        
        // Create partition layout
        this.partition = d3.partition()
            .size([2 * Math.PI, this.radius]);
        
        // Create arc generator
        // Scale factor: 0.6 = 40% reduction in center circle size
        const centerScale = 0.6;
        this.arc = d3.arc()
            .startAngle(d => d.x0)
            .endAngle(d => d.x1)
            .padAngle(0.005) // Add small gap between segments
            .innerRadius(d => d.y0 * centerScale)
            .outerRadius(d => d.y1 * centerScale - 1);
        
        // Handle resize
        window.addEventListener('resize', () => this.resize());
        // Don't call resize during init - container may be hidden
        // Resize will be called when chart becomes visible
    }

    resize() {
        const containerRect = this.container.getBoundingClientRect();
        this.width = containerRect.width;
        this.height = containerRect.height;
        this.radius = Math.min(this.width, this.height) / 2 - 20;
        
        console.log('[D3Sunburst] resize() - width:', this.width, 'height:', this.height, 'radius:', this.radius);
        
        // Don't render if radius is too small
        if (this.radius < 10) {
            console.log('[D3Sunburst] Radius too small, skipping render');
            return;
        }
        
        // Update partition and arc
        this.partition.size([2 * Math.PI, this.radius]);
        const centerScale = 0.6;
        this.arc.innerRadius(d => d.y0 * centerScale)
            .outerRadius(d => d.y1 * centerScale - 1)
            .padAngle(0.005); // Maintain gap between segments on resize
        
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
        // Only count leaf nodes' values so single children fill parent's angular span
        this.root = d3.hierarchy(rootNode)
            .sum(d => d.children && d.children.length > 0 ? 0 : (d.value || 1))
            .sort((a, b) => b.value - a.value);
        
        console.log('[D3Sunburst] Hierarchy created:', this.root);
        console.log('[D3Sunburst] Descendants:', this.root.descendants());
        
        // Apply partition
        this.partition(this.root);
        
        console.log('[D3Sunburst] After partition, root:', this.root);
        
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
    }

    /**
     * Load list of JSON files from json directory
     */
    async loadFileList() {
        const fileList = document.getElementById('fileList');
        fileList.innerHTML = '<div class="loading">در حال بارگذاری...</div>';

        try {
            // List of known JSON files (in production, this would be fetched from server)
            const files = ['hijab.json'];
            
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
            
            // Force resize after chart becomes visible
            setTimeout(() => this.chart.resize(), 50);

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
        // If clicking on center node, zoom out
        if (nodeData.type === 'thesis' && this.zoomStack.length > 1) {
            this.zoomOut();
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
        
        // Update relation info
        const relationLabel = document.getElementById('relationLabel');
        const relationType = document.getElementById('relationType');
        const relationReasoning = document.getElementById('detailReasoning');
        
        if (nodeData.relationType) {
            relationLabel.style.display = 'inline';
            relationType.style.display = 'inline';
            relationType.textContent = this.translateRelation(nodeData.relationType);
            relationType.className = `relation-type ${nodeData.relationType}`;
            relationReasoning.textContent = nodeData.relationReasoning || '';
            relationReasoning.style.display = 'block';
        } else {
            relationLabel.style.display = 'none';
            relationType.style.display = 'none';
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
}

// Initialize application when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.app = new DebateVisualizer();
});
