import { useEffect, useRef, useState } from 'react';
import { format } from 'date-fns';
import { X, Trash2, Calendar, Clock, CheckSquare, Square, Plus } from 'lucide-react';
import { useTaskStore, getDueDateStatus, getSubtaskProgress } from '../store/useTaskStore';

export default function TaskSidebar() {
    const {
        tasks,
        selectedTaskId,
        selectTask,
        updateTask,
        deleteTask,
        addSubtask,
        toggleSubtask,
        deleteSubtask,
    } = useTaskStore();
    const task = tasks.find((t) => t.id === selectedTaskId);
    const titleInputRef = useRef<HTMLInputElement>(null);
    const [newSubtaskTitle, setNewSubtaskTitle] = useState('');

    useEffect(() => {
        const handleEsc = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && selectedTaskId) {
                selectTask(null);
            }
        };
        window.addEventListener('keydown', handleEsc);
        return () => window.removeEventListener('keydown', handleEsc);
    }, [selectedTaskId, selectTask]);

    useEffect(() => {
        if (task && titleInputRef.current) {
            titleInputRef.current.focus();
        }
    }, [task?.id]);

    useEffect(() => {
        setNewSubtaskTitle('');
    }, [task?.id]);

    if (!task) return null;

    const dueDateStatus = getDueDateStatus(task.dueDate);
    const subtaskProgress = getSubtaskProgress(task);
    const subtasks = task.subtasks || [];

    const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        updateTask(task.id, { title: e.target.value });
    };

    const handleDescriptionChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        updateTask(task.id, { description: e.target.value });
    };

    const handleDueDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;
        if (value) {
            const date = new Date(value);
            date.setHours(23, 59, 59, 999);
            updateTask(task.id, { dueDate: date.getTime() });
        } else {
            updateTask(task.id, { dueDate: null });
        }
    };

    const handleDelete = () => {
        deleteTask(task.id);
        selectTask(null);
    };

    const handleClose = () => {
        selectTask(null);
    };

    const handleAddSubtask = () => {
        if (newSubtaskTitle.trim()) {
            addSubtask(task.id, newSubtaskTitle.trim());
            setNewSubtaskTitle('');
        }
    };

    const handleSubtaskKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            handleAddSubtask();
        }
    };

    const dueDateValue = task.dueDate
        ? format(new Date(task.dueDate), 'yyyy-MM-dd')
        : '';

    return (
        <>
            {/* Backdrop */}
            <div
                className="fixed inset-0 bg-black/20 dark:bg-black/50 z-40 transition-opacity duration-300"
                onClick={handleClose}
            />

            {/* Sidebar */}
            <div className="fixed top-0 right-0 h-full w-96 bg-white/90 dark:bg-zinc-900/95 backdrop-blur-xl shadow-2xl z-50 transform transition-transform duration-300 ease-out flex flex-col border-l border-stone-200 dark:border-zinc-800">
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-stone-100 dark:border-zinc-800">
                    <h2 className="text-sm font-medium text-stone-500 dark:text-zinc-400">Task Details</h2>
                    <button
                        onClick={handleClose}
                        className="p-1 text-stone-400 dark:text-zinc-500 hover:text-stone-600 dark:hover:text-zinc-300 transition-colors rounded-lg hover:bg-stone-100 dark:hover:bg-zinc-800"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-4 space-y-6">
                    {/* Title */}
                    <div>
                        <input
                            ref={titleInputRef}
                            type="text"
                            value={task.title}
                            onChange={handleTitleChange}
                            placeholder="Task title..."
                            className="w-full text-xl font-medium text-stone-800 dark:text-zinc-100 bg-transparent border-none outline-none placeholder:text-stone-300 dark:placeholder:text-zinc-600"
                        />
                    </div>

                    {/* Due Date */}
                    <div className="space-y-2">
                        <label className="flex items-center gap-2 text-sm text-stone-500 dark:text-zinc-400">
                            <Calendar className="w-4 h-4" />
                            Due Date
                        </label>
                        <div className="flex items-center gap-3">
                            <input
                                type="date"
                                value={dueDateValue}
                                onChange={handleDueDateChange}
                                className={`flex-1 px-3 py-2 rounded-lg border text-sm outline-none transition-colors ${dueDateStatus === 'overdue' || dueDateStatus === 'urgent'
                                        ? 'border-red-300 dark:border-red-800 bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-400'
                                        : dueDateStatus === 'soon'
                                            ? 'border-yellow-300 dark:border-yellow-800 bg-yellow-50 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400'
                                            : 'border-stone-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-stone-700 dark:text-zinc-200'
                                    } focus:ring-2 focus:ring-stone-200 dark:focus:ring-zinc-700`}
                            />
                            {task.dueDate && (
                                <button
                                    onClick={() => updateTask(task.id, { dueDate: null })}
                                    className="p-2 text-stone-400 dark:text-zinc-500 hover:text-stone-600 dark:hover:text-zinc-300 hover:bg-stone-100 dark:hover:bg-zinc-800 rounded-lg transition-colors"
                                    title="Clear due date"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            )}
                        </div>
                        {dueDateStatus && (
                            <p
                                className={`text-xs ${dueDateStatus === 'overdue' || dueDateStatus === 'urgent'
                                        ? 'text-red-500'
                                        : dueDateStatus === 'soon'
                                            ? 'text-yellow-600 dark:text-yellow-500'
                                            : 'text-stone-400 dark:text-zinc-500'
                                    }`}
                            >
                                {dueDateStatus === 'overdue' && '⚠️ Overdue'}
                                {dueDateStatus === 'urgent' && '🔥 Due today'}
                                {dueDateStatus === 'soon' && '⏰ Due soon'}
                                {dueDateStatus === 'normal' && `📅 ${format(new Date(task.dueDate!), 'MMM d, yyyy')}`}
                            </p>
                        )}
                    </div>

                    {/* Checklist */}
                    <div className="space-y-3">
                        <div className="flex items-center justify-between">
                            <label className="flex items-center gap-2 text-sm text-stone-500 dark:text-zinc-400">
                                <CheckSquare className="w-4 h-4" />
                                Checklist
                            </label>
                            {subtasks.length > 0 && (
                                <span
                                    className={`text-xs px-2 py-0.5 rounded-full ${subtaskProgress.done === subtaskProgress.total
                                            ? 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400'
                                            : 'bg-stone-100 dark:bg-zinc-800 text-stone-500 dark:text-zinc-400'
                                        }`}
                                >
                                    {subtaskProgress.done}/{subtaskProgress.total}
                                </span>
                            )}
                        </div>

                        {/* Subtask Input */}
                        <div className="flex items-center gap-2">
                            <Plus className="w-4 h-4 text-stone-300 dark:text-zinc-600" />
                            <input
                                type="text"
                                value={newSubtaskTitle}
                                onChange={(e) => setNewSubtaskTitle(e.target.value)}
                                onKeyDown={handleSubtaskKeyDown}
                                placeholder="Add a step..."
                                className="flex-1 text-sm text-stone-700 dark:text-zinc-200 bg-transparent border-none outline-none placeholder:text-stone-300 dark:placeholder:text-zinc-600"
                            />
                        </div>

                        {/* Subtask List */}
                        {subtasks.length > 0 && (
                            <ul className="space-y-1">
                                {subtasks.map((subtask) => (
                                    <li
                                        key={subtask.id}
                                        className="group flex items-center gap-2 py-1 px-1 -mx-1 rounded hover:bg-stone-50 dark:hover:bg-zinc-800 transition-colors"
                                    >
                                        <button
                                            onClick={() => toggleSubtask(task.id, subtask.id)}
                                            className="text-stone-400 dark:text-zinc-500 hover:text-stone-600 dark:hover:text-zinc-300 transition-colors"
                                        >
                                            {subtask.done ? (
                                                <CheckSquare className="w-4 h-4 text-green-500" />
                                            ) : (
                                                <Square className="w-4 h-4" />
                                            )}
                                        </button>
                                        <span
                                            className={`flex-1 text-sm ${subtask.done
                                                    ? 'text-stone-400 dark:text-zinc-600 line-through'
                                                    : 'text-stone-700 dark:text-zinc-200'
                                                }`}
                                        >
                                            {subtask.title}
                                        </span>
                                        <button
                                            onClick={() => deleteSubtask(task.id, subtask.id)}
                                            className="opacity-0 group-hover:opacity-100 p-1 text-stone-300 dark:text-zinc-600 hover:text-red-400 transition-all"
                                        >
                                            <X className="w-3 h-3" />
                                        </button>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>

                    {/* Description */}
                    <div className="space-y-2">
                        <label className="text-sm text-stone-500 dark:text-zinc-400">Notes</label>
                        <textarea
                            value={task.description}
                            onChange={handleDescriptionChange}
                            placeholder="Add notes..."
                            rows={4}
                            className="w-full px-3 py-2 rounded-lg border border-stone-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-sm text-stone-700 dark:text-zinc-200 placeholder:text-stone-300 dark:placeholder:text-zinc-600 outline-none resize-none focus:ring-2 focus:ring-stone-200 dark:focus:ring-zinc-700 transition-colors"
                        />
                    </div>

                    {/* Metadata */}
                    <div className="pt-4 border-t border-stone-100 dark:border-zinc-800 space-y-2">
                        <div className="flex items-center gap-2 text-xs text-stone-400 dark:text-zinc-500">
                            <Clock className="w-3 h-3" />
                            Created {format(new Date(task.createdAt), 'MMM d, yyyy \'at\' h:mm a')}
                        </div>
                        {task.dependencies.length > 0 && (
                            <div className="text-xs text-stone-400 dark:text-zinc-500">
                                {task.dependencies.length} dependencies
                            </div>
                        )}
                    </div>
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-stone-100 dark:border-zinc-800">
                    <button
                        onClick={handleDelete}
                        className="w-full flex items-center justify-center gap-2 px-4 py-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors text-sm"
                    >
                        <Trash2 className="w-4 h-4" />
                        Delete Task
                    </button>
                </div>
            </div>
        </>
    );
}
