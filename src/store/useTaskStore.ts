import { create } from 'zustand';
import { v4 as uuidv4 } from 'uuid';
import { persist, createJSONStorage } from 'zustand/middleware';

// Grid size constant - must match CanvasView grid settings
export const GRID_SIZE = 20;

// Subtask interface
export interface Subtask {
    id: string;
    title: string;
    done: boolean;
}

export interface Task {
    id: string;
    title: string;
    status: 'todo' | 'done';
    createdAt: number;
    position?: { x: number; y: number }; // For Canvas view
    dependencies: string[]; // IDs of tasks that this task depends on (predecessors)
    dueDate: number | null; // Deadline timestamp
    description: string; // Task notes/markdown
    subtasks: Subtask[]; // Checklist items
}

interface TaskState {
    // Data
    tasks: Task[];
    // UI State
    selectedTaskId: string | null;
    // Actions
    addTask: (title: string) => void;
    toggleTask: (id: string) => void;
    deleteTask: (id: string) => void;
    updateTask: (id: string, updates: Partial<Task>) => void;
    updateTaskPosition: (id: string, position: { x: number; y: number }) => void;
    cleanupPositions: () => void;
    addDependency: (sourceId: string, targetId: string) => boolean;
    removeDependency: (sourceId: string, targetId: string) => void;
    selectTask: (id: string | null) => void;
    // Subtask actions
    addSubtask: (taskId: string, title: string) => void;
    toggleSubtask: (taskId: string, subtaskId: string) => void;
    deleteSubtask: (taskId: string, subtaskId: string) => void;
}

// Helper: snap value to grid
const snapToGrid = (value: number): number => {
    return Math.round(value / GRID_SIZE) * GRID_SIZE;
};

// Helper: calculate initial position for new task based on index
const getInitialPosition = (index: number): { x: number; y: number } => {
    const NODE_WIDTH = 200;
    const NODE_HEIGHT = 60;
    const GAP = 40;

    return {
        x: snapToGrid(GRID_SIZE * 4 + (index % 3) * (NODE_WIDTH + GAP)),
        y: snapToGrid(GRID_SIZE * 4 + Math.floor(index / 3) * (NODE_HEIGHT + GAP)),
    };
};

// Helper: Cycle detection using DFS
const wouldCreateCycle = (
    tasks: Task[],
    sourceId: string,
    targetId: string
): boolean => {
    const dependentsMap = new Map<string, string[]>();
    tasks.forEach((task) => {
        (task.dependencies || []).forEach((depId) => {
            const dependents = dependentsMap.get(depId) || [];
            dependents.push(task.id);
            dependentsMap.set(depId, dependents);
        });
    });

    const visited = new Set<string>();
    const stack = [targetId];

    while (stack.length > 0) {
        const current = stack.pop()!;
        if (current === sourceId) {
            return true;
        }
        if (visited.has(current)) {
            continue;
        }
        visited.add(current);
        const dependents = dependentsMap.get(current) || [];
        stack.push(...dependents);
    }

    return false;
};

// ==================== Selectors ====================

/**
 * Check if a task is blocked (has unfinished dependencies)
 */
export const isTaskBlocked = (task: Task, allTasks: Task[]): boolean => {
    const deps = task.dependencies || [];
    if (deps.length === 0) return false;

    return deps.some((depId) => {
        const depTask = allTasks.find((t) => t.id === depId);
        return depTask && depTask.status === 'todo';
    });
};

/**
 * Get tasks sorted by topological order
 */
export const getSortedTasks = (tasks: Task[]): Task[] => {
    const getTaskPriority = (task: Task): number => {
        const deps = task.dependencies || [];

        if (deps.length === 0) {
            return 0;
        }

        const allDepsCompleted = deps.every((depId) => {
            const depTask = tasks.find((t) => t.id === depId);
            return depTask && depTask.status === 'done';
        });

        if (allDepsCompleted) {
            return 1;
        }

        return 2;
    };

    return [...tasks].sort((a, b) => {
        const priorityA = getTaskPriority(a);
        const priorityB = getTaskPriority(b);

        if (priorityA !== priorityB) {
            return priorityA - priorityB;
        }

        return b.createdAt - a.createdAt;
    });
};

/**
 * Get due date status for color coding
 */
export const getDueDateStatus = (dueDate: number | null): 'overdue' | 'urgent' | 'soon' | 'normal' | null => {
    if (!dueDate) return null;

    const now = Date.now();
    const diffMs = dueDate - now;
    const diffDays = diffMs / (1000 * 60 * 60 * 24);

    if (diffDays < 0) return 'overdue';
    if (diffDays < 1) return 'urgent';
    if (diffDays < 3) return 'soon';
    return 'normal';
};

/**
 * Get subtask progress for a task
 */
export const getSubtaskProgress = (task: Task): { done: number; total: number } => {
    const subtasks = task.subtasks || [];
    const done = subtasks.filter((s) => s.done).length;
    return { done, total: subtasks.length };
};

// ==================== Store ====================

export const useTaskStore = create<TaskState>()(
    persist(
        (set, get) => ({
            tasks: [],
            selectedTaskId: null,

            addTask: (title: string) =>
                set((state) => {
                    const newTask: Task = {
                        id: uuidv4(),
                        title,
                        status: 'todo',
                        createdAt: Date.now(),
                        position: getInitialPosition(state.tasks.length),
                        dependencies: [],
                        dueDate: null,
                        description: '',
                        subtasks: [],
                    };
                    return {
                        tasks: [newTask, ...state.tasks],
                    };
                }),

            toggleTask: (id: string) =>
                set((state) => ({
                    tasks: state.tasks.map((task) =>
                        task.id === id
                            ? { ...task, status: task.status === 'done' ? 'todo' : 'done' }
                            : task
                    ),
                })),

            deleteTask: (id: string) =>
                set((state) => ({
                    tasks: state.tasks
                        .filter((task) => task.id !== id)
                        .map((task) => ({
                            ...task,
                            dependencies: (task.dependencies || []).filter((depId) => depId !== id),
                        })),
                    selectedTaskId: state.selectedTaskId === id ? null : state.selectedTaskId,
                })),

            updateTask: (id: string, updates: Partial<Task>) =>
                set((state) => ({
                    tasks: state.tasks.map((task) =>
                        task.id === id ? { ...task, ...updates } : task
                    ),
                })),

            updateTaskPosition: (id: string, position: { x: number; y: number }) =>
                set((state) => ({
                    tasks: state.tasks.map((task) =>
                        task.id === id
                            ? {
                                ...task,
                                position: {
                                    x: snapToGrid(position.x),
                                    y: snapToGrid(position.y),
                                },
                            }
                            : task
                    ),
                })),

            cleanupPositions: () =>
                set((state) => ({
                    tasks: state.tasks.map((task, index) => ({
                        ...task,
                        position: task.position
                            ? {
                                x: snapToGrid(task.position.x),
                                y: snapToGrid(task.position.y),
                            }
                            : getInitialPosition(index),
                        dependencies: task.dependencies || [],
                        dueDate: task.dueDate ?? null,
                        description: task.description ?? '',
                        subtasks: task.subtasks || [],
                    })),
                })),

            addDependency: (sourceId: string, targetId: string): boolean => {
                const state = get();

                if (sourceId === targetId) {
                    console.warn('Cannot add self-dependency');
                    return false;
                }

                const targetTask = state.tasks.find((t) => t.id === targetId);
                if (targetTask?.dependencies?.includes(sourceId)) {
                    console.warn('Dependency already exists');
                    return false;
                }

                if (wouldCreateCycle(state.tasks, sourceId, targetId)) {
                    console.warn('Cannot add dependency: would create a cycle');
                    return false;
                }

                set((state) => ({
                    tasks: state.tasks.map((task) =>
                        task.id === targetId
                            ? { ...task, dependencies: [...(task.dependencies || []), sourceId] }
                            : task
                    ),
                }));

                return true;
            },

            removeDependency: (sourceId: string, targetId: string) =>
                set((state) => ({
                    tasks: state.tasks.map((task) =>
                        task.id === targetId
                            ? {
                                ...task,
                                dependencies: (task.dependencies || []).filter((id) => id !== sourceId),
                            }
                            : task
                    ),
                })),

            selectTask: (id: string | null) =>
                set({ selectedTaskId: id }),

            // Subtask actions
            addSubtask: (taskId: string, title: string) =>
                set((state) => ({
                    tasks: state.tasks.map((task) =>
                        task.id === taskId
                            ? {
                                ...task,
                                subtasks: [
                                    ...(task.subtasks || []),
                                    { id: uuidv4(), title, done: false },
                                ],
                            }
                            : task
                    ),
                })),

            toggleSubtask: (taskId: string, subtaskId: string) =>
                set((state) => ({
                    tasks: state.tasks.map((task) =>
                        task.id === taskId
                            ? {
                                ...task,
                                subtasks: (task.subtasks || []).map((sub) =>
                                    sub.id === subtaskId ? { ...sub, done: !sub.done } : sub
                                ),
                            }
                            : task
                    ),
                })),

            deleteSubtask: (taskId: string, subtaskId: string) =>
                set((state) => ({
                    tasks: state.tasks.map((task) =>
                        task.id === taskId
                            ? {
                                ...task,
                                subtasks: (task.subtasks || []).filter((sub) => sub.id !== subtaskId),
                            }
                            : task
                    ),
                })),
        }),
        {
            name: 'dotty-storage',
            version: 3,
            storage: createJSONStorage(() => localStorage),
            partialize: (state) => ({
                tasks: state.tasks,
            }),
            migrate: (persistedState: unknown, version: number) => {
                const state = persistedState as { tasks?: Task[] };

                if (version < 3) {
                    // Migration: ensure all tasks have new fields including subtasks
                    if (state.tasks) {
                        state.tasks = state.tasks.map((task) => ({
                            ...task,
                            dependencies: task.dependencies || [],
                            dueDate: task.dueDate ?? null,
                            description: task.description ?? '',
                            subtasks: task.subtasks || [],
                        }));
                    }
                }

                return state as TaskState;
            },
        }
    )
);
