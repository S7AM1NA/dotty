import { format, differenceInDays } from 'date-fns';
import { Circle, CheckCircle2, Trash2, Lock, Calendar, ListChecks } from 'lucide-react';
import { useTaskStore, getSortedTasks, isTaskBlocked, getDueDateStatus, getSubtaskProgress } from '../store/useTaskStore';

export default function ListView() {
    const { tasks, toggleTask, deleteTask, selectTask } = useTaskStore();

    const sortedTasks = getSortedTasks(tasks);

    const handleTaskClick = (taskId: string, e: React.MouseEvent) => {
        if ((e.target as HTMLElement).closest('button')) {
            return;
        }
        selectTask(taskId);
    };

    const getDueDateDisplay = (dueDate: number | null) => {
        if (!dueDate) return null;

        const status = getDueDateStatus(dueDate);
        const date = new Date(dueDate);
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
            text = `${diffDays}d left`;
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

    return (
        <div className="max-w-2xl mx-auto px-6">
            <ul className="space-y-1">
                {sortedTasks.map((task) => {
                    const blocked = isTaskBlocked(task, tasks);

                    return (
                        <li
                            key={task.id}
                            onClick={(e) => handleTaskClick(task.id, e)}
                            className={`group flex items-center gap-4 p-3 rounded-xl hover:bg-white/50 dark:hover:bg-zinc-800/50 transition-all duration-300 ease-out cursor-pointer ${blocked ? 'opacity-50' : ''
                                }`}
                        >
                            <div className="relative">
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        toggleTask(task.id);
                                    }}
                                    className="text-stone-400 dark:text-zinc-500 hover:text-stone-600 dark:hover:text-zinc-300 transition-colors focus:outline-none"
                                >
                                    {task.status === 'done' ? (
                                        <CheckCircle2 className="w-6 h-6 text-green-500/80" />
                                    ) : (
                                        <Circle className="w-6 h-6" />
                                    )}
                                </button>

                                {blocked && task.status === 'todo' && (
                                    <Lock className="w-3 h-3 text-stone-400 dark:text-zinc-500 absolute -top-1 -right-1" />
                                )}
                            </div>

                            <div className="flex-1 min-w-0">
                                <span
                                    className={`block text-lg transition-all duration-300 truncate ${task.status === 'done'
                                            ? 'text-stone-400 dark:text-zinc-600 line-through decoration-stone-300 dark:decoration-zinc-700'
                                            : blocked
                                                ? 'text-stone-400 dark:text-zinc-500'
                                                : 'text-stone-700 dark:text-zinc-200'
                                        }`}
                                >
                                    {task.title}
                                </span>
                                <div className="flex items-center gap-3 mt-1">
                                    {task.dueDate && task.status !== 'done' && getDueDateDisplay(task.dueDate)}
                                    {(task.subtasks?.length ?? 0) > 0 && (() => {
                                        const progress = getSubtaskProgress(task);
                                        return (
                                            <span
                                                className={`flex items-center gap-1 text-xs px-1.5 py-0.5 rounded ${progress.done === progress.total
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
                                    deleteTask(task.id);
                                }}
                                className="opacity-0 group-hover:opacity-100 p-2 text-stone-300 dark:text-zinc-600 hover:text-red-400 transition-all duration-200 focus:outline-none"
                            >
                                <Trash2 className="w-5 h-5" />
                            </button>
                        </li>
                    );
                })}
            </ul>

            {tasks.length === 0 && (
                <div className="text-center mt-20 text-stone-300 dark:text-zinc-600 pointer-events-none">
                    <p>No tasks yet</p>
                </div>
            )}
        </div>
    );
}
