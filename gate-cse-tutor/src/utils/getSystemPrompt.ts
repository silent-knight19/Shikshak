const VISUALISE_ADDON = `

When explaining concepts, you can generate visualizations inside <visualization> tags whenever a diagram, chart, or interactive demo helps understanding. You can generate MULTIPLE <visualization> blocks in a single response if the topic needs more than one visual.

CRITICAL — ONLY JSON, NO CODE:
Never generate HTML, CSS, JavaScript, SVG, or Mermaid. Always output a JSON object inside each <visualization> tag. The frontend renders beautiful, interactive charts automatically using Recharts (https://recharts.org).

=== AVAILABLE VISUALIZATION TYPES ===

--- TYPE: bar (bar chart for comparing values) ---
{
  "type": "bar",
  "title": "Time Complexity Comparison",
  "labels": ["O(1)", "O(log n)", "O(n)", "O(n log n)", "O(n²)"],
  "datasets": [
    { "label": "n=10",  "values": [1, 3, 10, 33, 100] },
    { "label": "n=100", "values": [1, 7, 100, 700, 10000] },
    { "label": "n=1000","values": [1, 10, 1000, 9966, 1000000] }
  ],
  "controls": [
    { "type": "toggle", "name": "show100", "label": "Show n=100", "default": false },
    { "type": "toggle", "name": "show1000", "label": "Show n=1000", "default": false }
  ]
}
Use datasets[] for multi-series comparisons. Use controls[] to let the student toggle datasets on/off interactively.

--- TYPE: pie (proportions / percentages) ---
{
  "type": "pie",
  "title": "GATE Exam Weightage by Topic",
  "labels": ["Theory of Comp.", "Data Structures", "Algorithms", "CO & Architecture", "Others"],
  "values": [8, 10, 7, 5, 6]
}

--- TYPE: line (trends / algorithm performance curves) ---
{
  "type": "line",
  "title": "Comparison of Sorting Algorithms",
  "labels": ["100", "1K", "10K", "100K", "1M"],
  "datasets": [
    { "label": "QuickSort",  "values": [0.1, 0.8, 8, 85, 950] },
    { "label": "MergeSort",  "values": [0.2, 1.2, 12, 125, 1300] },
    { "label": "BubbleSort", "values": [0.5, 45, 4500, null, null] }
  ],
  "controls": [
    { "type": "toggle", "name": "showBubble", "label": "Show BubbleSort", "default": false }
  ]
}
Use null for missing data points. Use controls for interactive toggles.

--- TYPE: flowchart (algorithms, processes, step-by-step) ---
{
  "type": "flowchart",
  "title": "QuickSort Algorithm",
  "nodes": [
    { "id": "n1", "label": "Choose pivot (last element)" },
    { "id": "n2", "label": "Partition around pivot", "shape": "diamond" },
    { "id": "n3", "label": "Recursively sort left" },
    { "id": "n4", "label": "Recursively sort right" },
    { "id": "n5", "label": "Combine" }
  ],
  "edges": [
    { "from": "n1", "to": "n2" },
    { "from": "n2", "to": "n3", "label": "left > 1" },
    { "from": "n2", "to": "n4", "label": "right > 1" },
    { "from": "n3", "to": "n5" },
    { "from": "n4", "to": "n5" }
  ]
}
Use shape: "diamond" for decision nodes, shape: "circle" for terminator nodes.

--- TYPE: tree (BST, heap, parse trees, hierarchies) ---
{
  "type": "tree",
  "title": "Binary Search Tree Insertion",
  "nodes": [
    { "id": "r", "label": "50" },
    { "id": "a", "label": "30", "parent": "r" },
    { "id": "b", "label": "70", "parent": "r" },
    { "id": "c", "label": "20", "parent": "a" },
    { "id": "d", "label": "40", "parent": "a", "highlight": true }
  ]
}
Use "highlight": true on the most important node (e.g., the answer).

--- TYPE: automaton (DFA, NFA, PDA, state machines) ---
{
  "type": "automaton",
  "title": "DFA for strings ending with '01'",
  "states": [
    { "id": "q0", "label": "q0", "start": true },
    { "id": "q1", "label": "q1" },
    { "id": "q2", "label": "q2*", "accept": true }
  ],
  "transitions": [
    { "from": "q0", "to": "q1", "label": "0" },
    { "from": "q0", "to": "q0", "label": "1" },
    { "from": "q1", "to": "q2", "label": "1" },
    { "from": "q1", "to": "q1", "label": "0" },
    { "from": "q2", "to": "q2", "label": "0,1" }
  ]
}
Mark start states with "start": true and accept states with "accept": true.

--- TYPE: timeline (scheduling, process states, project phases) ---
{
  "type": "timeline",
  "title": "Process States in OS",
  "items": [
    { "label": "New", "description": "Process created" },
    { "label": "Ready", "description": "In main memory, waiting for CPU" },
    { "label": "Running", "description": "Executing on CPU" },
    { "label": "Waiting", "description": "Waiting for I/O" },
    { "label": "Terminated", "description": "Process finished" }
  ]
}

=== RELEVANCE RULES (IMPORTANT) ===
Choose the visualization type that BEST matches the topic:

GATE TOPIC → RECOMMENDED VISUALIZATION:
- Time/space complexity analysis → bar or line (with multiple datasets)
- Algorithm running time comparison → line (with controls to toggle algorithms)
- Sorting/searching algorithm steps → flowchart
- BST, heap, trie, parse tree → tree
- DFA, NFA, PDA, Turing machine → automaton
- CPU scheduling (FCFS, SJF, RR) → timeline or bar
- Process states, deadlock → timeline or automaton
- Memory management (paging, segmentation) → bar
- Network topologies, protocols → flowchart
- DB normalization, ER diagrams → tree or flowchart
- Cache mapping (direct, set-associative) → bar
- Number representations, IEEE 754 → timeline
- Graph algorithms (BFS, DFS, MST) → flowchart
- Propositional logic, Boolean algebra → tree
- Comparison of algorithm variants → line with toggle controls
- Any topic with numeric data → bar or line
- Any topic with sequential steps → flowchart or timeline
- Any topic with hierarchical data → tree
- Any topic with state transitions → automaton
- Distribution of marks, weightage → pie

Use MULTIPLE visualizations when a topic has multiple distinct aspects:
- Example: "Explain sorting algorithms" → one bar chart comparing time, one flowchart for QuickSort steps, one line chart for performance curves
- Example: "DB normalization" → one tree for normal forms hierarchy, one flowchart for normalization process
- Example: "OS scheduling" → one timeline for process states, one bar chart comparing scheduling algorithms

INTERACTIVE CONTROLS (use when helpful):
- Add controls with toggle checkboxes to let students show/hide different datasets or scenarios
- Use for: comparing different input sizes, algorithm variants, best/average/worst cases
- Students love being able to click and explore different scenarios themselves

RULES:
1. Only use types listed above
2. Always include a clear title
3. Use null for missing/infinite data points
4. controls[] is optional — use it when comparing multiple scenarios
5. Multiple <visualization> blocks encouraged for complex topics
6. Never output HTML, CSS, JS, SVG, or Mermaid inside the tags
7. Validate JSON syntax before outputting
8. Make sure all IDs in edges/transitions exist in nodes/states`;

export function appendVisualiseAddon(prompt: string, visualiseMode: boolean): string {
  return visualiseMode ? prompt + VISUALISE_ADDON : prompt;
}
