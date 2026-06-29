export interface InteractiveControl {
  type: 'toggle' | 'slider';
  name: string;
  label: string;
  default: boolean | number;
  min?: number;
  max?: number;
  step?: number;
}

/* Chart types */
export interface BarData {
  type: 'bar';
  title?: string;
  labels: string[];
  datasets: { label: string; values: number[]; color?: string }[];
  controls?: InteractiveControl[];
}

export interface PieData {
  type: 'pie';
  title?: string;
  labels: string[];
  values: number[];
  colors?: string[];
}

export interface LineDataSet {
  label: string;
  values: number[];
  color?: string;
}

export interface LineData {
  type: 'line';
  title?: string;
  labels: string[];
  datasets: LineDataSet[];
  controls?: InteractiveControl[];
}

/* Flowchart */
export interface FlowNode {
  id: string;
  label: string;
  shape?: 'box' | 'diamond' | 'circle';
}

export interface FlowEdge {
  from: string;
  to: string;
  label?: string;
}

export interface FlowchartData {
  type: 'flowchart';
  title?: string;
  nodes: FlowNode[];
  edges: FlowEdge[];
}

/* Tree */
export interface TreeNode {
  id: string;
  label: string;
  parent?: string;
  highlight?: boolean;
}

export interface TreeData {
  type: 'tree';
  title?: string;
  nodes: TreeNode[];
}

/* Automaton */
export interface AutoState {
  id: string;
  label: string;
  accept?: boolean;
  start?: boolean;
}

export interface AutoTransition {
  from: string;
  to: string;
  label: string;
}

export interface AutomatonData {
  type: 'automaton';
  title?: string;
  states: AutoState[];
  transitions: AutoTransition[];
}

/* Timeline */
export interface TimelineItem {
  label: string;
  date?: string;
  description?: string;
}

export interface TimelineData {
  type: 'timeline';
  title?: string;
  items: TimelineItem[];
}

export type VisualizationData =
  | BarData
  | PieData
  | LineData
  | FlowchartData
  | TreeData
  | AutomatonData
  | TimelineData;

export const CHART_COLORS = [
  '#4361ee', '#f72585', '#4cc9f0', '#f8961e',
  '#90be6d', '#f94144', '#577590', '#e9c46a',
];
