import type { VisualizationData } from './types';
import BarChart from './BarChart';
import PieChart from './PieChart';
import LineChart from './LineChart';
import Flowchart from './Flowchart';
import TreeDiagram from './TreeDiagram';
import Automaton from './Automaton';
import Timeline from './Timeline';

interface Props {
  data: VisualizationData;
}

export default function VisualizationRenderer({ data }: Props) {
  switch (data.type) {
    case 'bar':
      return <BarChart data={data} />;
    case 'pie':
      return <PieChart data={data} />;
    case 'line':
      return <LineChart data={data} />;
    case 'flowchart':
      return <Flowchart data={data} />;
    case 'tree':
      return <TreeDiagram data={data} />;
    case 'automaton':
      return <Automaton data={data} />;
    case 'timeline':
      return <Timeline data={data} />;
    default:
      return null;
  }
}
