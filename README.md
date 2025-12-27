# Debate Logic Visualizer
## دیدگاه منطق مباحثه

An interactive web application for visualizing debate argument structures using Sunburst charts. Built with D3.js, this tool helps explore complex argument mappings in a hierarchical, visual format.

## Features

- **Interactive Sunburst Visualization**: Navigate through complex argument structures using D3.js-powered sunburst charts
- **Zoom & Navigate**: Click on nodes to zoom in, breadcrumb navigation for easy traversal
- **Node Types**:
  - 🟦 **Thesis (گزاره اصلی)**: Central claim or position
  - 🟨 **Foundational (بنیادین)**: Foundational arguments
  - 🟩 **Practical (عملی)**: Practical arguments
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
│   └── app.js              # Main application logic
├── json/
│   ├── files.json          # Manifest of available debate files
│   └── hijab.json          # Sample debate data
├── index.html              # Main HTML structure
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
        "intensity": 0.5
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

## Usage

1. Open `index.html` in a web browser
2. Select a debate file from the sidebar (currently includes `hijab.json`)
3. Navigate the argument structure:
   - **Click** on nodes to zoom in
   - **Click** on the center node to zoom out
   - **Hover** over nodes to view detailed information
   - Use **breadcrumbs** to jump to any level in the hierarchy

## Adding New Debates

1. Create a new JSON file in the `json/` directory following the data format above
2. Add the filename to the `files` array in `json/files.json`
3. Ensure the JSON includes a node with `type: "thesis"` as the root
4. The application will automatically discover and load the new file on page refresh

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

## License

[Specify your license here]

## Contributing

Contributions are welcome! Please feel free to submit issues or pull requests.

## Author

[Add author information here]
