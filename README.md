# Debate Logic Visualizer
## دیدگاه منطق مباحثه

An interactive web application for visualizing debate argument structures using Sunburst charts. Built with D3.js, this tool helps explore complex argument mappings in a hierarchical, visual format. Perfect for analyzing debates, dissecting arguments, and understanding logical relationships between propositions.

## How It Works

The application visualizes debate arguments as hierarchical sunburst charts. Each node represents a proposition (a claim that can be true or false), connected through support or attack relationships. Users can navigate through the argument structure by clicking nodes to zoom in/out and hovering to see detailed information.

### Loading Data

The application supports two ways to load debate data:

**1. Pre-loaded JSON Files**
- JSON files stored in the `json/` directory are automatically loaded
- The sidebar displays all available debate files for easy selection

**2. Upload Custom Files**
- Users can upload their own JSON files using the system prompt
- Generate your own argument maps by following the system prompt format below
- No server or backend required - everything runs in your browser

## Features

- **Interactive Sunburst Visualization**: Navigate through complex argument structures using D3.js-powered sunburst charts
- **Zoom & Navigate**: Click on nodes to zoom in, breadcrumb navigation for easy traversal
- **Node Types**:
  - 🟦 **Thesis (گزاره اصلی)**: Central claim or position - the core argument of the debate
  - 🟨 **Foundational (بنیادین)**: Foundational arguments - deep philosophical or logical premises
  - 🟩 **Practical (عملی)**: Practical arguments - real-world implications and consequences
- **Relation Types**:
  - 🟢 **Support (حمایت)**: Arguments that support the parent node
  - 🔴 **Attack (انتقاد)**: Arguments that critique the parent node
- **Intensity Scoring**: Visual representation of argument strength through color brightness
- **Rich Detail Cards**: Hover over nodes to view detailed information including:
  - Speaker attribution
  - Argument description
  - Supporting quotes
  - Reasoning and relation types
  - Intensity scores
- **Persian/Farsi Support**: Full RTL (right-to-left) support with Vazirmatn font
- **Responsive Design**: Adapts to different screen sizes

## File Structure

```
argument-mapping/
├── css/
│   └── styles.css          # Application styles
├── js/
│   ├── app.js              # Main application logic
│   └── config.js           # Configuration settings
├── json/
│   ├── files.json          # Manifest of available debate files
│   ├── hijab.json          # Sample debate data
│   ├── gpu.json            # GPU-related debate
│   ├── gpu_2.json          # GPU debate variant
│   └── veganism.json       # Veganism debate
├── input/                  # Input transcripts for AI processing
│   ├── Chavoshi.md
│   ├── Ghanbari.md
│   ├── Noorian.md
│   ├── Shahdoost.md
│   ├── Soltani.md
│   ├── Tajdin+Chavoshi.md
│   └── Zohdi.md
├── index.html              # Main HTML structure
├── system_prompt.md        # System prompt for generating argument maps
├── AGENTS.md               # Guidelines for AI assistants
└── README.md               # This file
```

## Technology Stack

- **D3.js v7**: Data visualization library for sunburst charts
- **Vanilla JavaScript**: No framework dependencies
- **HTML5/CSS3**: Modern web standards
- **Vazirmatn Font**: Persian typeface via Google Fonts

## Data Format

The application expects JSON files with the following structure:

```json
{
  "new_nodes": [
    {
      "id": "unique_id",
      "type": "thesis|foundational|practical",
      "title": "Argument title",
      "description": "Detailed description",
      "speaker": "Speaker name",
      "quote": "Direct quote",
      "score": {
        "intensity": 0.5,
        "confidence": 0.8
      },
      "relations": [
        {
          "target_node_id": "parent_id",
          "relation_type": "support|attack",
          "reasoning": "Explanation of relationship"
        }
      ]
    }
  ]
}
```

**Important Rules:**
- Each node MUST have a title that is a complete proposition (contains a verb)
- Title should be 3-8 words long
- One node must have `type: "thesis"` as the root
- Relations should form a Directed Acyclic Graph (DAG) - no loops

## Usage

### Viewing Pre-loaded Debates

1. Open `index.html` in a web browser
2. Select a debate file from the sidebar (currently includes `hijab.json`, `gpu.json`, `veganism.json`, etc.)
3. Navigate the argument structure:
   - **Click** on nodes to zoom in
   - **Click** on the center node to zoom out
   - **Hover** over nodes to view detailed information
   - Use **breadcrumbs** to jump to any level in the hierarchy

### Creating Your Own Debate Maps

You can generate your own argument maps using the system prompt. Here's how:

1. **Prepare your data:**
   - A transcript of the debate (preferably in Farsi)
   - A list of speakers participating in the debate
   - Optionally, an existing graph if you're building incrementally

2. **Use the system prompt below** with an AI assistant (like Claude, GPT, etc.)
   - Copy the entire system prompt
   - Replace the placeholders with your data
   - Request the AI to generate the JSON structure

3. **Upload to the visualizer:**
   - Save the generated JSON as a file
   - Open the visualizer in your browser
   - Use the upload feature (if available) or add to the `json/` directory

## System Prompt

Use this prompt to generate argument maps from debate transcripts:

```
# Role
You are a Lead Logic Analyst. Your mission is to structure chaotic debates into a hierarchical Argument Graph (DAG). You identify the **CORE ARGUMENT** and ensure every node is a distinct **proposition**, not just a topic.

# Input Data
1. <transcript>: Raw text from the debate (Farsi).
2. <existing_graph>: Current JSON of the argument map.
3. <speakers_list>: Names of the main participants.

# PHASE 1: The Core Argument (Thesis)
**IF** `<existing_graph>` is EMPTY, define Node "1":
- It must be the central **Claim** of the debate (e.g., "The government must not interfere in clothing").
- Mark as `"type": "thesis"`.

# PHASE 2: Argument Extraction
Process the transcript to add/update nodes.
1. **Segmentation:** Break text into atomic logical units.
2. **Attribution:** Assign correct speaker.
3. **Depth Analysis (Tagging):** `thesis`, `foundational`, `practical`.

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
</transcript>
```

## Adding New Debates

**Option 1: Manual JSON Creation**
1. Create a new JSON file in the `json/` directory following the data format above
2. Add the filename to the `files` array in `json/files.json`
3. Ensure the JSON includes a node with `type: "thesis"` as the root
4. The application will automatically discover and load the new file on page refresh

**Option 2: AI-Generated JSON**
1. Prepare your debate transcript and speaker list
2. Use the system prompt above with an AI assistant
3. Save the generated JSON output
4. Add to the `json/` directory or upload directly to the application

## Running the Application

This is a static web application with no build system required:

```bash
# Start a local server (choose one)
python -m http.server 8000
# or
npx serve
# or
php -S localhost:8000

# Open in browser
# Navigate to http://localhost:8000
```

**Note:** The application requires a local server to load JSON files properly due to browser CORS restrictions. Opening `index.html` directly from the file system may not work correctly.

## Roadmap - Future Improvements

### Immediate Enhancements
- [x] **Dynamic File Loading**: Automatically discover and load all JSON files from the `json/` directory without manual configuration
- [ ] **Search Functionality**: Add search bar to filter debates or find specific arguments within loaded debates
- [ ] **Export Features**: Allow users to export the current visualization as PNG/SVG or data as JSON/CSV

### User Experience
- [ ] **Dark Mode**: Implement a toggle for dark/light theme
- [ ] **Keyboard Navigation**: Add keyboard shortcuts for zooming (↑/↓ keys) and navigation
- [ ] **Animation Controls**: Add play/pause functionality for animated transitions between nodes
- [ ] **Multi-language Support**: Add English language toggle alongside Persian

### Visualization Improvements
- [ ] **Alternative Visualizations**: Offer different chart types (tree diagram, node-link diagram, force-directed graph)
- [ ] **Color Customization**: Allow users to customize color schemes for different node/relation types
- [ ] **Filter Controls**: Add UI controls to show/hide specific node types or relation types
- [ ] **Path Highlighting**: When hovering a node, highlight the complete path from root to that node

### Data Management
- [ ] **JSON Schema Validation**: Add schema validation to ensure uploaded JSON files meet requirements
- [ ] **Batch Import**: Support uploading multiple JSON files at once
- [ ] **Data Editor**: Built-in editor for creating and modifying argument structures directly in the browser
- [ ] **Local Storage**: Cache loaded debates in browser local storage for faster loading

### Advanced Features
- [ ] **Collaboration Mode**: Real-time collaboration for multiple users viewing/editing the same debate
- [ ] **Argument Scoring System**: Implement a more sophisticated scoring algorithm that considers depth, breadth, and intensity
- [ ] **Conflict Detection**: Automatically detect and highlight logical contradictions in the argument structure
- [ ] **Export to Presentations**: Generate presentation slides (PowerPoint/Keynote) from argument structures
- [ ] **API Integration**: Provide REST API for programmatic access to debate data and visualizations

### Performance & Accessibility
- [ ] **Virtual Scrolling**: For very large argument trees, implement virtual scrolling to maintain performance
- [ ] **Accessibility Improvements**: Add ARIA labels, keyboard navigation support, and screen reader compatibility
- [ ] **Progressive Loading**: Load debate data progressively for faster initial render times
- [ ] **Mobile Optimization**: Improve touch interactions and layout for mobile devices

### Testing & Documentation
- [ ] **Unit Tests**: Add comprehensive unit tests for core functionality
- [ ] **E2E Tests**: Implement end-to-end testing with tools like Playwright or Cypress
- [ ] **Interactive Tutorial**: Add an onboarding tutorial for first-time users
- [ ] **API Documentation**: Document all classes, methods, and data structures

## Roadmap - Future Enhancements

### Immediate Enhancements
- [ ] **Search Functionality**: Add search bar to filter debates or find specific arguments within loaded debates
- [ ] **Export Features**: Allow users to export the current visualization as PNG/SVG or data as JSON/CSV
- [ ] **JSON Schema Validation**: Add schema validation to ensure uploaded JSON files meet requirements
- [ ] **Upload UI**: Implement a file upload button in the interface for easier custom JSON loading

### User Experience
- [ ] **Dark Mode**: Implement a toggle for dark/light theme
- [ ] **Keyboard Navigation**: Add keyboard shortcuts for zooming (↑/↓ keys) and navigation
- [ ] **Animation Controls**: Add play/pause functionality for animated transitions between nodes
- [ ] **Multi-language Support**: Add English language toggle alongside Persian

### Visualization Improvements
- [ ] **Alternative Visualizations**: Offer different chart types (tree diagram, node-link diagram, force-directed graph)
- [ ] **Color Customization**: Allow users to customize color schemes for different node/relation types
- [ ] **Filter Controls**: Add UI controls to show/hide specific node types or relation types
- [ ] **Path Highlighting**: When hovering a node, highlight the complete path from root to that node

### Data Management
- [ ] **Batch Import**: Support uploading multiple JSON files at once
- [ ] **Data Editor**: Built-in editor for creating and modifying argument structures directly in the browser
- [ ] **Local Storage**: Cache loaded debates in browser local storage for faster loading
- [ ] **Download Templates**: Provide downloadable JSON templates to help users get started

### Advanced Features
- [ ] **Collaboration Mode**: Real-time collaboration for multiple users viewing/editing the same debate
- [ ] **Argument Scoring System**: Implement a more sophisticated scoring algorithm that considers depth, breadth, and intensity
- [ ] **Conflict Detection**: Automatically detect and highlight logical contradictions in the argument structure
- [ ] **Export to Presentations**: Generate presentation slides (PowerPoint/Keynote) from argument structures
- [ ] **API Integration**: Provide REST API for programmatic access to debate data and visualizations

### Performance & Accessibility
- [ ] **Virtual Scrolling**: For very large argument trees, implement virtual scrolling to maintain performance
- [ ] **Accessibility Improvements**: Add ARIA labels, keyboard navigation support, and screen reader compatibility
- [ ] **Progressive Loading**: Load debate data progressively for faster initial render times
- [ ] **Mobile Optimization**: Improve touch interactions and layout for mobile devices

### Testing & Documentation
- [ ] **Unit Tests**: Add comprehensive unit tests for core functionality
- [ ] **E2E Tests**: Implement end-to-end testing with tools like Playwright or Cypress
- [ ] **Interactive Tutorial**: Add an onboarding tutorial for first-time users
- [ ] **API Documentation**: Document all classes, methods, and data structures
