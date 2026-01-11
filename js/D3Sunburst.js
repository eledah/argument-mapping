/**
 * D3 Sunburst Chart
 * Handles D3.js sunburst chart visualization and interactions
 */

import { Config } from './config.js';
import { TreeBuilder } from './TreeBuilder.js';

export class D3Sunburst {
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