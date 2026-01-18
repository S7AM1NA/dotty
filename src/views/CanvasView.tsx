import { useCallback, useState, useEffect, useMemo, useRef } from 'react';
import {
    ReactFlow,
    Background,
    Controls,
    Node,
    Edge,
    NodeChange,
    EdgeChange,
    Connection,
    applyNodeChanges,
    applyEdgeChanges,
    BackgroundVariant,
    Handle,
    Position,
    MarkerType,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { format, differenceInDays } from 'date-fns';
import { useTaskStore, Task, GRID_SIZE, isTaskBlocked, getDueDateStatus } from '../store/useTaskStore';
import { Circle, CheckCircle2, Trash2, Lock, Calendar } from 'lucide-react';

// Node dimensions for collision detection
const NODE_WIDTH = 200;
const NODE_HEIGHT = 60;

// Override xyflow default node styles
const nodeStyleOverrides = `
  .react-flow__node {
    padding: 0 !important;
    margin: 0 !important;
  }
  .react-flow__node-taskNode {
    padding: 0 !important;
    margin: 0 !important;
  }
  .react-flow__handle {
    width: 8px;
    height: 8px;
    background: #d6d3d1;
    border: 2px solid #a8a29e;
  }
  .react-flow__handle:hover {
    background: #78716c;
  }
  .react-flow__edge.selected .react-flow__edge-path {
    stroke: #ef4444 !important;
    stroke-width: 3px !important;
  }
  .react-flow__edge:hover .react-flow__edge-path {
    stroke: #78716c !important;
  }
`;

// Custom node component for tasks with connection handles
function TaskNode({ data }: { data: { task: Task; blocked: boolean; onToggle: () => void; onDelete: () => void; onSelect: () => void } }) {
    const { task, blocked, onToggle, onDelete, onSelect } = data;

    const getDueDateDisplay = () => {
        if (!task.dueDate || task.status === 'done') return null;

        const status = getDueDateStatus(task.dueDate);
        const date = new Date(task.dueDate);
        const diffDays = differenceInDays(date, new Date());

        let text = '';
        let colorClass = '';

        if (status === 'overdue') {
            text = 'Overdue';
            colorClass = 'text-red-500';
        } else if (status === 'urgent') {
            text = 'Today';
            colorClass = 'text-red-500';
        } else if (status === 'soon') {
            text = `${diffDays}d`;
            colorClass = 'text-yellow-600';
        } else {
            text = format(date, 'MMM d');
            colorClass = 'text-stone-400';
        }

        return (
            <span className={`flex items-center gap-1 text-xs ${colorClass}`}>
                <Calendar className="w-3 h-3" />
                {text}
            </span>
        );
    };

    const handleClick = (e: React.MouseEvent) => {
        // Don't open sidebar if clicking on buttons or handles
        if ((e.target as HTMLElement).closest('button') || (e.target as HTMLElement).closest('.react-flow__handle')) {
            return;
        }
        onSelect();
    };

    return (
        <div
            onClick={handleClick}
            className={`bg-white rounded-xl shadow-sm border border-stone-200 p-4 min-w-[200px] group relative cursor-pointer hover:shadow-md transition-shadow ${blocked ? 'opacity-50' : ''}`}
        >
            {/* Left Handle - Target (incoming dependencies) */}
            <Handle
                type="target"
                position={Position.Left}
                className="!bg-stone-300 !border-stone-400"
            />

            <div className="flex items-center gap-3">
                <div className="relative">
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            onToggle();
                        }}
                        className="text-stone-400 hover:text-stone-600 transition-colors focus:outline-none"
                    >
                        {task.status === 'done' ? (
                            <CheckCircle2 className="w-5 h-5 text-green-500/80" />
                        ) : (
                            <Circle className="w-5 h-5" />
                        )}
                    </button>

                    {/* Lock icon for blocked tasks */}
                    {blocked && task.status === 'todo' && (
                        <Lock className="w-3 h-3 text-stone-400 absolute -top-1 -right-1" />
                    )}
                </div>

                <div className="flex-1 min-w-0">
                    <span
                        className={`block text-sm transition-all truncate ${task.status === 'done'
                            ? 'text-stone-400 line-through decoration-stone-300'
                            : blocked
                                ? 'text-stone-400'
                                : 'text-stone-700'
                            }`}
                    >
                        {task.title}
                    </span>
                    {getDueDateDisplay()}
                </div>

                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        onDelete();
                    }}
                    className="opacity-0 group-hover:opacity-100 p-1 text-stone-300 hover:text-red-400 transition-all duration-200 focus:outline-none"
                >
                    <Trash2 className="w-4 h-4" />
                </button>
            </div>

            {/* Right Handle - Source (outgoing to dependents) */}
            <Handle
                type="source"
                position={Position.Right}
                className="!bg-stone-300 !border-stone-400"
            />
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

    let attempts = 0;
    const maxAttempts = 50;

    while (attempts < maxAttempts) {
        const hasCollision = otherNodes.some((node) =>
            isOverlapping(position, node.position)
        );

        if (!hasCollision) {
            return position;
        }

        position.y += NODE_HEIGHT + GRID_SIZE;

        if (attempts % 5 === 4) {
            position.x += NODE_WIDTH + GRID_SIZE;
            position.y = snapToGrid(draggedNode.position.y);
        }

        attempts++;
    }

    return position;
}

// Convert task dependencies to xyflow edges
function tasksToEdges(tasks: Task[]): Edge[] {
    const edges: Edge[] = [];

    tasks.forEach((task) => {
        const deps = task.dependencies || [];
        deps.forEach((depId) => {
            edges.push({
                id: `${depId}->${task.id}`,
                source: depId,
                target: task.id,
                type: 'smoothstep',
                animated: false,
                selectable: true,
                style: { stroke: '#a8a29e', strokeWidth: 2 },
                markerEnd: {
                    type: MarkerType.ArrowClosed,
                    color: '#a8a29e',
                    width: 20,
                    height: 20,
                },
            });
        });
    });

    return edges;
}

export default function CanvasView() {
    const {
        tasks,
        toggleTask,
        deleteTask,
        updateTaskPosition,
        cleanupPositions,
        addDependency,
        removeDependency,
        selectTask,
    } = useTaskStore();

    // Use ref to avoid stale closures
    const toggleTaskRef = useRef(toggleTask);
    const deleteTaskRef = useRef(deleteTask);
    const selectTaskRef = useRef(selectTask);
    toggleTaskRef.current = toggleTask;
    deleteTaskRef.current = deleteTask;
    selectTaskRef.current = selectTask;

    // Local state for nodes and edges
    const [nodes, setNodes] = useState<Node[]>([]);
    const [edges, setEdges] = useState<Edge[]>([]);

    // Track if cleanup has been done
    const cleanupDone = useRef(false);

    // Cleanup positions on first mount (only once)
    useEffect(() => {
        if (!cleanupDone.current) {
            cleanupDone.current = true;
            // Use setTimeout to avoid setState during render
            setTimeout(() => {
                cleanupPositions();
            }, 0);
        }
    }, [cleanupPositions]);

    // Sync nodes from store when tasks change
    useEffect(() => {
        const newNodes = tasks.map((task, index) => ({
            id: task.id,
            type: 'taskNode',
            position: task.position || {
                x: snapToGrid(GRID_SIZE * 4 + (index % 3) * (NODE_WIDTH + 40)),
                y: snapToGrid(GRID_SIZE * 4 + Math.floor(index / 3) * (NODE_HEIGHT + 40)),
            },
            data: {
                task,
                blocked: isTaskBlocked(task, tasks),
                onToggle: () => toggleTaskRef.current(task.id),
                onDelete: () => deleteTaskRef.current(task.id),
                onSelect: () => selectTaskRef.current(task.id),
            },
        }));
        setNodes(newNodes);
    }, [tasks]);

    // Sync edges from store when tasks change
    useEffect(() => {
        setEdges(tasksToEdges(tasks));
    }, [tasks]);

    // Handle node changes (smooth dragging + selection)
    const onNodesChange = useCallback((changes: NodeChange[]) => {
        setNodes((nds) => applyNodeChanges(changes, nds) as Node[]);
    }, []);

    // Handle edge changes (selection)
    const onEdgesChange = useCallback((changes: EdgeChange[]) => {
        setEdges((eds) => applyEdgeChanges(changes, eds) as Edge[]);
    }, []);

    // Handle drag stop
    const onNodeDragStop = useCallback(
        (_event: React.MouseEvent, node: Node) => {
            setNodes((currentNodes) => {
                const finalPosition = getNonOverlappingPosition(node, currentNodes);
                updateTaskPosition(node.id, finalPosition);
                return currentNodes.map((n) =>
                    n.id === node.id ? { ...n, position: finalPosition } : n
                );
            });
        },
        [updateTaskPosition]
    );

    // Handle new connection (create dependency)
    const onConnect = useCallback(
        (connection: Connection) => {
            if (connection.source && connection.target) {
                const success = addDependency(connection.source, connection.target);
                if (!success) {
                    console.log('Failed to add dependency (cycle detected or already exists)');
                }
            }
        },
        [addDependency]
    );

    // Handle edge deletion (remove dependency)
    const onEdgesDelete = useCallback(
        (deletedEdges: Edge[]) => {
            deletedEdges.forEach((edge) => {
                removeDependency(edge.source, edge.target);
            });
        },
        [removeDependency]
    );

    return (
        <div className="w-full h-[calc(100vh-140px)]">
            <style>{nodeStyleOverrides}</style>
            <ReactFlow
                nodes={nodes}
                edges={edges}
                onNodesChange={onNodesChange}
                onEdgesChange={onEdgesChange}
                onNodeDragStop={onNodeDragStop}
                onConnect={onConnect}
                onEdgesDelete={onEdgesDelete}
                nodeTypes={nodeTypes}
                fitView
                proOptions={{ hideAttribution: true }}
                className="bg-stone-50"
                deleteKeyCode="Backspace"
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
