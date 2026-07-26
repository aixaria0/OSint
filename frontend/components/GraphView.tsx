"use client";

import ReactFlow, {
  type Node,
  type Edge,
  Background,
  Controls,
  MiniMap,
} from "reactflow";
import "reactflow/dist/style.css";

interface GraphViewProps {
  nodes: Node[];
  edges: Edge[];
}

export default function GraphView({ nodes, edges }: GraphViewProps) {
  return (
    <ReactFlow nodes={nodes} edges={edges} fitView attributionPosition="bottom-right">
      <Background color="#265d36" gap={24} />
      <Controls />
      <MiniMap nodeColor="#22c55e" maskColor="rgba(0,0,0,0.82)" />
    </ReactFlow>
  );
}
