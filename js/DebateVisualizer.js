/**
 * Debate Visualizer Application
 * Main application logic for loading, visualizing, and interacting with debate data
 */

import { Config } from './config.js';
import { D3Sunburst } from './D3Sunburst.js';
import { TreeBuilder } from './TreeBuilder.js';

export class DebateVisualizer {
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