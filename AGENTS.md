# AGENTS.md

This file provides guidelines and commands for agentic coding assistants working on this repository.

## Build & Test Commands

This is a static web application with no build system. To run and test:

```bash
# Start a local server (any of these methods)
python -m http.server 8000
# or
npx serve
# or
php -S localhost:8000

# Open in browser
# Navigate to http://localhost:8000

# Manual testing steps:
# 1. Load index.html
# 2. Verify debate files load from json/ directory
# 3. Test sunburst chart interactions (hover, click, zoom)
# 4. Test RTL layout for Persian text
# 5. Test responsive design at different viewport sizes
```

No automated tests exist currently. When adding tests, use a testing framework compatible with vanilla JS/D3.js (e.g., Jest, Mocha, or Playwright for E2E).

## Code Style Guidelines

### JavaScript

**Imports & Dependencies:**
- Use ES6+ syntax (const/let, arrow functions, async/await)
- No build tools - load D3.js from CDN in HTML
- Modular architecture with ES6 modules: main.js imports from config.js, TreeBuilder.js, D3Sunburst.js, DebateVisualizer.js

**Classes & Structure:**
- Use ES6 class syntax with JSDoc comments
- Class names: PascalCase (TreeBuilder, D3Sunburst, DebateVisualizer)
- Method names: camelCase (buildTree, getNodeColor, zoomTo)
- Private methods: prefix with underscore (e.g., _privateMethod)
- Static methods: use static keyword for utility methods

**Naming Conventions:**
- Variables: camelCase (nodeData, fileList, zoomStack)
- Constants: UPPER_SNAKE_CASE for truly immutable values
- Config keys: snake_case (viewBoxWidth, padAngle, resizeDelay)
- DOM elements: prefix descriptive name (chartWrapper, detailCard)
- Event handlers: handleX pattern (handleHover, handleClick)

**Error Handling:**
- Use try-catch for async operations (fetch, JSON parsing)
- Console.error with descriptive messages including context
- User-facing errors: show in UI (alert, inline message) in Persian
- Validate data structure before processing (check for thesis node)

**Comments & Documentation:**
- JSDoc comments for all classes and public methods
- Format: @param {type} name Description
- Prefix console logs with [ClassName] for debugging
- Use Persian/Farsi for user-facing text, English for code

**D3.js Specifics:**
- Use d3.select() and method chaining
- Store references (this.svg, this.g) for reuse
- Clean up with .selectAll('*').remove() before re-render
- Use event data parameter (d) for node information

**Code Organization:**
- Separate concerns: TreeBuilder (data), D3Sunburst (visualization), DebateVisualizer (app logic)
- Keep Config object in separate file
- Initialize app in DOMContentLoaded event

### CSS

**Structure:**
- Use CSS custom properties (variables) in :root
- Prefix with --color-, --shadow-, etc.
- Follow BEM naming convention for classes (block__element--modifier)
- Use flexbox for layout, avoid floats

**Responsive Design:**
- Mobile breakpoint at 768px
- Test sidebar layout in RTL direction
- Ensure animations are performant (transform/opacity)

### HTML

**Structure:**
- Semantic HTML5 elements (aside, main, header)
- Include lang="fa" and dir="rtl" attributes
- Load external fonts (Vazirmatn) from Google Fonts
- Load scripts at end of body for performance

### JSON Data Files

**Structure:**
- Files in json/ directory for debate data
- Must have "new_nodes" array
- One node with type: "thesis" as root
- Relations point to parent via target_node_id
- Update json/files.json manifest when adding new debates

**Node Schema:**
```json
{
  "id": "unique_id",
  "type": "thesis|foundational|practical",
  "title": "Title text",
  "description": "Full description",
  "speaker": "Speaker name",
  "quote": "Direct quote or empty string",
  "score": { "intensity": 0.5, "confidence": 0.8 },
  "relations": [
    {
      "target_node_id": "parent_id",
      "relation_type": "support|attack",
      "reasoning": "Explanation"
    }
  ]
}
```

### General Principles

- Keep code DRY - extract repeated logic into methods
- Use meaningful variable names, no abbreviations
- Add console.log for debugging with clear context
- Test in RTL mode (Persian text displays right-to-left)
- Ensure accessibility: keyboard navigation, ARIA labels
- Optimize for performance: debounce resize handlers, use CSS transforms
