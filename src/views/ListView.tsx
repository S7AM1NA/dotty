import { Circle, CheckCircle2, Trash2 } from 'lucide-react';
import { useTaskStore } from '../store/useTaskStore';

export default function ListView() {
    const { tasks, toggleTask, deleteTask } = useTaskStore();

    return (
        <div className="max-w-2xl mx-auto px-6">
            {/* Task List */}
            <ul className="space-y-1">
                {tasks.map((task) => (
                    <li
                        key={task.id}
                        className="group flex items-center gap-4 p-3 rounded-xl hover:bg-white/50 transition-all duration-300 ease-out"
                    >
                        <button
                            onClick={() => toggleTask(task.id)}
                            className="text-stone-400 hover:text-stone-600 transition-colors focus:outline-none"
                        >
                            {task.status === 'done' ? (
                                <CheckCircle2 className="w-6 h-6 text-green-500/80" />
                            ) : (
                                <Circle className="w-6 h-6" />
                            )}
                        </button>

                        <span
                            className={`flex-1 text-lg transition-all duration-300 ${task.status === 'done'
                                    ? 'text-stone-400 line-through decoration-stone-300'
                                    : 'text-stone-700'
                                }`}
                        >
                            {task.title}
                        </span>

                        <button
                            onClick={() => deleteTask(task.id)}
                            className="opacity-0 group-hover:opacity-100 p-2 text-stone-300 hover:text-red-400 transition-all duration-200 focus:outline-none"
                        >
                            <Trash2 className="w-5 h-5" />
                        </button>
                    </li>
                ))}
            </ul>

            {tasks.length === 0 && (
                <div className="text-center mt-20 text-stone-300 pointer-events-none">
                    <p>No tasks yet</p>
                </div>
            )}
        </div>
    );
}
