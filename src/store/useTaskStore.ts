import { create } from 'zustand';
import { v4 as uuidv4 } from 'uuid';
import { persist } from 'zustand/middleware';

// Grid size constant - must match CanvasView grid settings
export const GRID_SIZE = 20;

export interface Task {
    id: string;
    title: string;
    status: 'todo' | 'done';
    createdAt: number;
    position?: { x: number; y: number }; // For Canvas view
}

interface TaskState {
    tasks: Task[];
    addTask: (title: string) => void;
    toggleTask: (id: string) => void;
    deleteTask: (id: string) => void;
    updateTaskPosition: (id: string, position: { x: number; y: number }) => void;
    cleanupPositions: () => void; // Force align all positions to grid
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

export const useTaskStore = create<TaskState>()(
    persist(
        (set) => ({
            tasks: [],
            addTask: (title: string) =>
                set((state) => {
                    const newTask: Task = {
                        id: uuidv4(),
                        title,
                        status: 'todo',
                        createdAt: Date.now(),
                        // Generate grid-aligned position for new task
                        position: getInitialPosition(state.tasks.length),
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
                    tasks: state.tasks.filter((task) => task.id !== id),
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
            // Force cleanup all positions to align to grid
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
                    })),
                })),
        }),
        {
            name: 'dotty-storage',
        }
    )
);
