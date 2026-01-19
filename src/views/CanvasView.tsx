import { useCallback, useState, useEffect, useRef } from 'react';
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
import { useTaskStore, Task, GRID_SIZE, isTaskBlocked, getDueDateStatus, getSubtaskProgress } from '../store/useTaskStore';
import { Circle, CheckCircle2, Trash2, Lock, Calendar, ListChecks } from 'lucide-react';
import { useTheme } from '../hooks/useTheme';

// Node dimensions for collision detection
const NODE_WIDTH = 200;
const NODE_HEIGHT = 60;

// Override xyflow default node styles (dynamic via CSS variables)
const getNodeStyleOverrides = (isDark: boolean) => `
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
    background: ${isDark ? '#52525b' : '#d6d3d1'};
    border: 2px solid ${isDark ? '#71717a' : '#a8a29e'};
  }
  .react-flow__handle:hover {
    background: ${isDark ? '#a1a1aa' : '#78716c'};
  }
  .react-flow__edge.selected .react-flow__edge-path {
    stroke: #ef4444 !important;
    stroke-width: 3px !important;
  }
  .react-flow__edge:hover .react-flow__edge-path {
    stroke: ${isDark ? '#a1a1aa' : '#78716c'} !important;
  }
  /* Controls dark mode fix */
  .react-flow__controls {
    background: ${isDark ? '#27272a' : '#ffffff'} !important;
    border: 1px solid ${isDark ? '#3f3f46' : '#e7e5e4'} !important;
    box-shadow: ${isDark ? '0 1px 3px rgba(0,0,0,0.3)' : '0 1px 3px rgba(0,0,0,0.1)'} !important;
  }
  .react-flow__controls-button {
    background: ${isDark ? '#27272a' : '#ffffff'} !important;
    border-bottom: 1px solid ${isDark ? '#3f3f46' : '#e7e5e4'} !important;
    fill: ${isDark ? '#a1a1aa' : '#78716c'} !important;
  }
  .react-flow__controls-button:hover {
    background: ${isDark ? '#3f3f46' : '#f5f5f4'} !important;
  }
  .react-flow__controls-button svg {
    fill: ${isDark ? '#a1a1aa' : '#78716c'} !important;
  }
`;

// Custom node component for tasks with connection handles
function TaskNode({ data }: { data: { task: Task; blocked: boolean; isDark: boolean; onToggle: () => void; onDelete: () => void; onSelect: () => void } }) {
    const { task, blocked, isDark, onToggle, onDelete, onSelect } = data;

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
            colorClass = 'text-yellow-600 dark:text-yellow-500';
        } else {
            text = format(date, 'MMM d');
            colorClass = 'text-stone-400 dark:text-zinc-500';
        }

        return (
            <span className={`flex items-center gap-1 text-xs ${colorClass}`}>
                <Calendar className="w-3 h-3" />
                {text}
            </span>
        );
    };

    const handleClick = (e: React.MouseEvent) => {
        if ((e.target as HTMLElement).closest('button') || (e.target as HTMLElement).closest('.react-flow__handle')) {
            return;
        }
        onSelect();
    };

    return (
        <div
            onClick={handleClick}
            className={`bg-white dark:bg-zinc-900 rounded-xl shadow-sm border border-stone-200 dark:border-zinc-700 p-4 min-w-[200px] group relative cursor-pointer hover:shadow-md transition-shadow ${blocked ? 'opacity-50' : ''}`}
        >
            <Handle
                type="target"
                position={Position.Left}
                className={isDark ? '!bg-zinc-600 !border-zinc-500' : '!bg-stone-300 !border-stone-400'}
            />

            <div className="flex items-center gap-3">
                <div className="relative">
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            onToggle();
                        }}
                        className="text-stone-400 dark:text-zinc-500 hover:text-stone-600 dark:hover:text-zinc-300 transition-colors focus:outline-none"
                    >
                        {task.status === 'done' ? (
                            <CheckCircle2 className="w-5 h-5 text-green-500/80" />
                        ) : (
                            <Circle className="w-5 h-5" />
                        )}
                    </button>

                    {blocked && task.status === 'todo' && (
                        <Lock className="w-3 h-3 text-stone-400 dark:text-zinc-500 absolute -top-1 -right-1" />
                    )}
                </div>

                <div className="flex-1 min-w-0">
                    <span
                        className={`block text-sm transition-all truncate ${task.status === 'done'
                            ? 'text-stone-400 dark:text-zinc-600 line-through decoration-stone-300 dark:decoration-zinc-700'
                            : blocked
                                ? 'text-stone-400 dark:text-zinc-500'
                                : 'text-stone-700 dark:text-zinc-200'
                            }`}
                    >
                        {task.title}
                    </span>
                    <div className="flex items-center gap-2 mt-0.5">
                        {getDueDateDisplay()}
                        {(task.subtasks?.length ?? 0) > 0 && (() => {
                            const progress = getSubtaskProgress(task);
                            return (
                                <span
                                    className={`flex items-center gap-0.5 text-xs px-1 py-0.5 rounded ${progress.done === progress.total
                                        ? 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400'
                                        : 'bg-stone-100 dark:bg-zinc-800 text-stone-500 dark:text-zinc-400'
                                        }`}
                                >
                                    <ListChecks className="w-3 h-3" />
                                    {progress.done}/{progress.total}
                                </span>
                            );
                        })()}
                    </div>
                </div>

                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        onDelete();
                    }}
                    className="opacity-0 group-hover:opacity-100 p-1 text-stone-300 dark:text-zinc-600 hover:text-red-400 transition-all duration-200 focus:outline-none"
                >
                    <Trash2 className="w-4 h-4" />
                </button>
            </div>

            <Handle
                type="source"
                position={Position.Right}
                className={isDark ? '!bg-zinc-600 !border-zinc-500' : '!bg-stone-300 !border-stone-400'}
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

// Convert task dependencies to xyflow edges (dynamic color based on theme)
function tasksToEdges(tasks: Task[], isDark: boolean): Edge[] {
    const edges: Edge[] = [];
    const edgeColor = isDark ? '#71717a' : '#a8a29e';

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
                style: { stroke: edgeColor, strokeWidth: 2 },
                markerEnd: {
                    type: MarkerType.ArrowClosed,
                    color: edgeColor,
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

    const { isDark } = useTheme();

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
                isDark,
                onToggle: () => toggleTaskRef.current(task.id),
                onDelete: () => deleteTaskRef.current(task.id),
                onSelect: () => selectTaskRef.current(task.id),
            },
        }));
        setNodes(newNodes);
    }, [tasks, isDark]);

    // Sync edges from store when tasks change
    useEffect(() => {
        setEdges(tasksToEdges(tasks, isDark));
    }, [tasks, isDark]);

    // Handle node changes (smooth dragging + selection)
    const onNodesChange = useCallback((changes: NodeChange[]) => {
        setNodes((nds) => applyNodeChanges(changes, nds) as Node[]);
    }, []);

    // Handle edge changes (selection)
    const onEdgesChange = useCallback((changes: EdgeChange[]) => {
        setEdges((eds) => applyEdgeChanges(changes, eds) as Edge[]);
    }, []);

    // Handle node drag end
    const onNodeDragStop = useCallback(
        (_: React.MouseEvent, node: Node) => {
            setNodes((currentNodes) => {
                const snappedPosition = getNonOverlappingPosition(node, currentNodes);
                updateTaskPosition(node.id, snappedPosition);

                return currentNodes.map((n) =>
                    n.id === node.id ? { ...n, position: snappedPosition } : n
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
            <style>{getNodeStyleOverrides(isDark)}</style>
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
                className={isDark ? 'bg-zinc-950' : 'bg-stone-50'}
                deleteKeyCode="Backspace"
            >
                <Background
                    variant={BackgroundVariant.Dots}
                    gap={GRID_SIZE}
                    size={1}
                    color={isDark ? '#3f3f46' : '#d6d3d1'}
                    offset={0}
                />
                <Controls
                    className={isDark ? 'bg-zinc-800 border border-zinc-700 rounded-lg shadow-sm' : 'bg-white border border-stone-200 rounded-lg shadow-sm'}
                    showInteractive={false}
                />
            </ReactFlow>
        </div>
    );
}
