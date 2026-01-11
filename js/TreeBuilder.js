/**
 * TreeBuilder Utility
 * Converts flat JSON node list to nested tree structure for Sunburst chart
 */

import { Config } from './config.js';

export class TreeBuilder {
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
        // Skip brightness adjustment for thesis nodes
        if (node.type === 'thesis') {
            return baseColor;
        }
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