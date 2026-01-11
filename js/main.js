/**
 * Main entry point for the Debate Logic Visualizer application
 */

import { DebateVisualizer } from './DebateVisualizer.js';

// Initialize application when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.app = new DebateVisualizer();
});