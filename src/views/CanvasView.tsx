import { useCallback, useState, useEffect } from 'react';
import {
    ReactFlow,
    Background,
    Controls,
    Node,
    NodeChange,
    applyNodeChanges,
    BackgroundVariant,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { useTaskStore, Task, GRID_SIZE } from '../store/useTaskStore';
import { Circle, CheckCircle2, Trash2 } from 'lucide-react';

// Node dimensions for collision detection
const NODE_WIDTH = 200;
const NODE_HEIGHT = 60;

// Override xyflow default node styles to remove padding/margin
const nodeStyleOverrides = `
  .react-flow__node {
    padding: 0 !important;
    margin: 0 !important;
  }
  .react-flow__node-taskNode {
    padding: 0 !important;
    margin: 0 !important;
  }
`;
// Custom node component for tasks - no margin/transform on outer div
function TaskNode({ data }: { data: { task: Task; onToggle: () => void; onDelete: () => void } }) {
    const { task, onToggle, onDelete } = data;

    return (
        <div className="bg-white rounded-xl shadow-sm border border-stone-200 p-4 min-w-[200px] group">
            <div className="flex items-center gap-3">
                <button
                    onClick={onToggle}
                    className="text-stone-400 hover:text-stone-600 transition-colors focus:outline-none"
                >
                    {task.status === 'done' ? (
                        <CheckCircle2 className="w-5 h-5 text-green-500/80" />
                    ) : (
                        <Circle className="w-5 h-5" />
                    )}
                </button>

                <span
                    className={`flex-1 text-sm transition-all ${task.status === 'done'
                        ? 'text-stone-400 line-through decoration-stone-300'
                        : 'text-stone-700'
                        }`}
                >
                    {task.title}
                </span>

                <button
                    onClick={onDelete}
                    className="opacity-0 group-hover:opacity-100 p-1 text-stone-300 hover:text-red-400 transition-all duration-200 focus:outline-none"
                >
                    <Trash2 className="w-4 h-4" />
                </button>
            </div>
        </div>
    );
}

const nodeTypes = {
    taskNode: TaskNode,
};

// Helper: snap value to grid
const snapToGrid = (value: number): number => {
    return Math.round(value / GRID_SIZE) * GRID_SIZE;
};

// Check if two nodes overlap
function isOverlapping(
    pos1: { x: number; y: number },
    pos2: { x: number; y: number },
    padding: number = 20
): boolean {
    return (
        pos1.x < pos2.x + NODE_WIDTH + padding &&
        pos1.x + NODE_WIDTH + padding > pos2.x &&
        pos1.y < pos2.y + NODE_HEIGHT + padding &&
        pos1.y + NODE_HEIGHT + padding > pos2.y
    );
}

// Find a non-overlapping position for a node
function getNonOverlappingPosition(
    draggedNode: Node,
    allNodes: Node[]
): { x: number; y: number } {
    let position = {
        x: snapToGrid(draggedNode.position.x),
        y: snapToGrid(draggedNode.position.y),
    };
    const otherNodes = allNodes.filter((n) => n.id !== draggedNode.id);

    // Try to find a non-overlapping position
    let attempts = 0;
    const maxAttempts = 50;

    while (attempts < maxAttempts) {
        const hasCollision = otherNodes.some((node) =>
            isOverlapping(position, node.position)
        );

        if (!hasCollision) {
            return position;
        }

        // Move down to find empty space
        position.y += NODE_HEIGHT + GRID_SIZE;

        // If we've gone too far down, move right and reset y
        if (attempts % 5 === 4) {
            position.x += NODE_WIDTH + GRID_SIZE;
            position.y = snapToGrid(draggedNode.position.y);
        }

        attempts++;
    }

    return position;
}

// Convert tasks to xyflow nodes
function tasksToNodes(
    tasks: Task[],
    toggleTask: (id: string) => void,
    deleteTask: (id: string) => void
): Node[] {
    return tasks.map((task, index) => ({
        id: task.id,
        type: 'taskNode',
        position: task.position || {
            x: snapToGrid(GRID_SIZE * 4 + (index % 3) * (NODE_WIDTH + 40)),
            y: snapToGrid(GRID_SIZE * 4 + Math.floor(index / 3) * (NODE_HEIGHT + 40)),
        },
        data: {
            task,
            onToggle: () => toggleTask(task.id),
            onDelete: () => deleteTask(task.id),
        },
    }));
}

export default function CanvasView() {
    const { tasks, toggleTask, deleteTask, updateTaskPosition, cleanupPositions } = useTaskStore();

    // Local state for nodes (for smooth dragging)
    const [nodes, setNodes] = useState<Node[]>([]);

    // Cleanup positions on first mount to align existing data to grid
    useEffect(() => {
        cleanupPositions();
    }, []); // Run once on mount

    // Sync nodes from store when tasks change
    useEffect(() => {
        setNodes(tasksToNodes(tasks, toggleTask, deleteTask));
    }, [tasks, toggleTask, deleteTask]);

    // Handle node changes (smooth dragging - NO snap during drag)
    const onNodesChange = useCallback((changes: NodeChange[]) => {
        setNodes((nds) => applyNodeChanges(changes, nds) as Node[]);
    }, []);

    // Handle drag stop - apply snap to grid + collision detection and save to store
    const onNodeDragStop = useCallback(
        (_event: React.MouseEvent, node: Node) => {
            setNodes((currentNodes) => {
                // Get non-overlapping position (already snaps to grid)
                const finalPosition = getNonOverlappingPosition(node, currentNodes);

                // Update store with final position
                updateTaskPosition(node.id, finalPosition);

                // Update local state with final position
                return currentNodes.map((n) =>
                    n.id === node.id ? { ...n, position: finalPosition } : n
                );
            });
        },
        [updateTaskPosition]
    );

    return (
        <div className="w-full h-[calc(100vh-140px)]">
            <style>{nodeStyleOverrides}</style>
            <ReactFlow
                nodes={nodes}
                edges={[]}
                onNodesChange={onNodesChange}
                onNodeDragStop={onNodeDragStop}
                nodeTypes={nodeTypes}
                fitView
                proOptions={{ hideAttribution: true }}
                className="bg-stone-50"
            >
                <Background
                    variant={BackgroundVariant.Dots}
                    gap={GRID_SIZE}
                    size={1}
                    color="#d6d3d1"
                    offset={0}
                />
                <Controls
                    className="bg-white border border-stone-200 rounded-lg shadow-sm"
                    showInteractive={false}
                />
            </ReactFlow>
        </div>
    );
}
