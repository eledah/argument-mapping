/**
 * Configuration for Debate Logic Visualizer
 * Centralized configuration for colors, spacing, and chart parameters
 */

export const Config = {
    // ==================== Colors ====================
    colors: {
        thesis: '#FFD700',
        foundational: '#4A90E2',
        practical: '#7ED321',
        support: '#50C878',
        attack: '#E74C3C',
        border: '#ffffff'
    },

    // ==================== Border Configuration ====================
    border: {
        width: {
            thesis: 5,
            foundational: 6,
            default: 4
        }
    },

    // ==================== Brightness Adjustment ====================
    brightness: {
        factor: 0.5,
        maxFactor: 0.5
    },

    // ==================== Chart Configuration ====================
    chart: {
        // SVG viewBox dimensions
        viewBoxWidth: 1200,
        viewBoxHeight: 1200,

        // Center scale for arc generation (default, adjusted dynamically based on depth)
        defaultCenterScale: 0.6,

        // Maximum radius for center node as fraction of total radius
        maxCenterRadius: 0.4,

        // Radius padding (space from container edge)
        radiusPadding: 5,

        // Minimum radius to render
        minRadius: 10
    },

    // ==================== Padding & Spacing ====================
    spacing: {
        // Vertical gap between concentric rings (as fraction of radius)
        verticalGap: 0.01,

        // Horizontal padAngle between siblings (in radians)
        padAngle: {
            inner: 0.03,  // For innermost layers
            outer: 0.01   // For outermost layers
        },

        // Radial distribution exponent
        // Higher = more compression of inner layers, more expansion of outer layers
        radiusExponent: {
            base: 1.2,
            perLevel: 0.2
        },

        // Depth threshold for exponent adjustment
        exponentDepthThreshold: 3
    },

    // ==================== Animation ====================
    animation: {
        // Delay after showing chart before forcing resize
        resizeDelay: 50
    }
};