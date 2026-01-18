import { useEffect, useRef } from 'react';
import { format } from 'date-fns';
import { X, Trash2, Calendar, Clock } from 'lucide-react';
import { useTaskStore, getDueDateStatus } from '../store/useTaskStore';

export default function TaskSidebar() {
    const { tasks, selectedTaskId, selectTask, updateTask, deleteTask } = useTaskStore();
    const task = tasks.find((t) => t.id === selectedTaskId);
    const titleInputRef = useRef<HTMLInputElement>(null);

    // Close on Escape
    useEffect(() => {
        const handleEsc = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && selectedTaskId) {
                selectTask(null);
            }
        };
        window.addEventListener('keydown', handleEsc);
        return () => window.removeEventListener('keydown', handleEsc);
    }, [selectedTaskId, selectTask]);

    // Focus title input when opening
    useEffect(() => {
        if (task && titleInputRef.current) {
            titleInputRef.current.focus();
        }
    }, [task?.id]);

    if (!task) return null;

    const dueDateStatus = getDueDateStatus(task.dueDate);

    const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        updateTask(task.id, { title: e.target.value });
    };

    const handleDescriptionChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        updateTask(task.id, { description: e.target.value });
    };

    const handleDueDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;
        if (value) {
            // Convert date string to timestamp (end of day)
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

    // Format dueDate for input
    const dueDateValue = task.dueDate
        ? format(new Date(task.dueDate), 'yyyy-MM-dd')
        : '';

    return (
        <>
            {/* Backdrop */}
            <div
                className="fixed inset-0 bg-black/20 z-40 transition-opacity duration-300"
                onClick={handleClose}
            />

            {/* Sidebar */}
            <div className="fixed top-0 right-0 h-full w-96 bg-white/90 backdrop-blur-xl shadow-2xl z-50 transform transition-transform duration-300 ease-out flex flex-col border-l border-stone-200">
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-stone-100">
                    <h2 className="text-sm font-medium text-stone-500">Task Details</h2>
                    <button
                        onClick={handleClose}
                        className="p-1 text-stone-400 hover:text-stone-600 transition-colors rounded-lg hover:bg-stone-100"
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
                            className="w-full text-xl font-medium text-stone-800 bg-transparent border-none outline-none placeholder:text-stone-300"
                        />
                    </div>

                    {/* Due Date */}
                    <div className="space-y-2">
                        <label className="flex items-center gap-2 text-sm text-stone-500">
                            <Calendar className="w-4 h-4" />
                            Due Date
                        </label>
                        <div className="flex items-center gap-3">
                            <input
                                type="date"
                                value={dueDateValue}
                                onChange={handleDueDateChange}
                                className={`flex-1 px-3 py-2 rounded-lg border text-sm outline-none transition-colors ${dueDateStatus === 'overdue'
                                        ? 'border-red-300 bg-red-50 text-red-700'
                                        : dueDateStatus === 'urgent'
                                            ? 'border-red-300 bg-red-50 text-red-700'
                                            : dueDateStatus === 'soon'
                                                ? 'border-yellow-300 bg-yellow-50 text-yellow-700'
                                                : 'border-stone-200 bg-white text-stone-700'
                                    } focus:ring-2 focus:ring-stone-200`}
                            />
                            {task.dueDate && (
                                <button
                                    onClick={() => updateTask(task.id, { dueDate: null })}
                                    className="p-2 text-stone-400 hover:text-stone-600 hover:bg-stone-100 rounded-lg transition-colors"
                                    title="Clear due date"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            )}
                        </div>
                        {dueDateStatus && (
                            <p
                                className={`text-xs ${dueDateStatus === 'overdue'
                                        ? 'text-red-500'
                                        : dueDateStatus === 'urgent'
                                            ? 'text-red-500'
                                            : dueDateStatus === 'soon'
                                                ? 'text-yellow-600'
                                                : 'text-stone-400'
                                    }`}
                            >
                                {dueDateStatus === 'overdue' && '⚠️ Overdue'}
                                {dueDateStatus === 'urgent' && '🔥 Due today'}
                                {dueDateStatus === 'soon' && '⏰ Due soon'}
                                {dueDateStatus === 'normal' && `📅 ${format(new Date(task.dueDate!), 'MMM d, yyyy')}`}
                            </p>
                        )}
                    </div>

                    {/* Description */}
                    <div className="space-y-2">
                        <label className="text-sm text-stone-500">Notes</label>
                        <textarea
                            value={task.description}
                            onChange={handleDescriptionChange}
                            placeholder="Add notes..."
                            rows={6}
                            className="w-full px-3 py-2 rounded-lg border border-stone-200 bg-white text-sm text-stone-700 placeholder:text-stone-300 outline-none resize-none focus:ring-2 focus:ring-stone-200 transition-colors"
                        />
                    </div>

                    {/* Metadata */}
                    <div className="pt-4 border-t border-stone-100 space-y-2">
                        <div className="flex items-center gap-2 text-xs text-stone-400">
                            <Clock className="w-3 h-3" />
                            Created {format(new Date(task.createdAt), 'MMM d, yyyy \'at\' h:mm a')}
                        </div>
                        {task.dependencies.length > 0 && (
                            <div className="text-xs text-stone-400">
                                {task.dependencies.length} dependencies
                            </div>
                        )}
                    </div>
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-stone-100">
                    <button
                        onClick={handleDelete}
                        className="w-full flex items-center justify-center gap-2 px-4 py-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors text-sm"
                    >
                        <Trash2 className="w-4 h-4" />
                        Delete Task
                    </button>
                </div>
            </div>
        </>
    );
}
