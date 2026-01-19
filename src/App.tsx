import { useState, useEffect } from 'react';
import { useTaskStore } from './store/useTaskStore';
import { List, LayoutGrid, Sun, Moon } from 'lucide-react';
import { register, unregisterAll } from '@tauri-apps/plugin-global-shortcut';
import { getCurrentWindow } from '@tauri-apps/api/window';
import ListView from './views/ListView';
import CanvasView from './views/CanvasView';
import TaskSidebar from './components/TaskSidebar';
import { useTheme } from './hooks/useTheme';

type ViewMode = 'list' | 'canvas';

export default function App() {
  const { addTask } = useTaskStore();
  const [inputValue, setInputValue] = useState('');
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const { isDark, toggleTheme } = useTheme();

  // 注册 Alt+S 全局快捷键
  useEffect(() => {
    const setupShortcut = async () => {
      try {
        const appWindow = getCurrentWindow();

        await register('Alt+S', async (event) => {
          if (event.state === 'Released') {
            return;
          }

          const visible = await appWindow.isVisible();

          if (visible) {
            await appWindow.hide();
          } else {
            await appWindow.unminimize();
            await appWindow.show();
            await appWindow.setFocus();
          }
        });
      } catch (error) {
        console.error('Failed to register global shortcut:', error);
      }
    };

    setupShortcut();

    return () => {
      unregisterAll().catch(console.error);
    };
  }, []);

  // 监听 Esc 键
  const { selectedTaskId, selectTask } = useTaskStore();

  useEffect(() => {
    const handleEsc = async (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (selectedTaskId) {
          selectTask(null);
        } else {
          const appWindow = getCurrentWindow();
          await appWindow.hide();
        }
      }
    };

    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [selectedTaskId, selectTask]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && inputValue.trim()) {
      addTask(inputValue.trim());
      setInputValue('');
    }
  };

  return (
    <div className="min-h-screen bg-stone-50 dark:bg-zinc-950 text-stone-900 dark:text-zinc-100 font-sans selection:bg-stone-200 dark:selection:bg-zinc-700 transition-colors duration-300">
      {/* Header with Input and View Toggle */}
      <div className="max-w-2xl mx-auto pt-12 px-6">
        <div className="flex items-center gap-4 mb-8">
          {/* Input Area */}
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="What needs to be done?"
            className="flex-1 bg-transparent text-2xl placeholder:text-stone-300 dark:placeholder:text-zinc-600 outline-none border-none py-2 px-3 rounded-lg transition-all focus:ring-1 focus:ring-stone-200 dark:focus:ring-zinc-700 focus:bg-white/30 dark:focus:bg-zinc-800/30"
            autoFocus
          />

          {/* View Toggle Buttons */}
          <div className="flex items-center gap-1 bg-white/50 dark:bg-zinc-800/50 rounded-lg p-1">
            <button
              onClick={() => setViewMode('list')}
              className={`p-2 rounded-md transition-all ${viewMode === 'list'
                  ? 'bg-white dark:bg-zinc-700 text-stone-700 dark:text-zinc-100 shadow-sm'
                  : 'text-stone-400 dark:text-zinc-500 hover:text-stone-600 dark:hover:text-zinc-300'
                }`}
              title="List View"
            >
              <List className="w-5 h-5" />
            </button>
            <button
              onClick={() => setViewMode('canvas')}
              className={`p-2 rounded-md transition-all ${viewMode === 'canvas'
                  ? 'bg-white dark:bg-zinc-700 text-stone-700 dark:text-zinc-100 shadow-sm'
                  : 'text-stone-400 dark:text-zinc-500 hover:text-stone-600 dark:hover:text-zinc-300'
                }`}
              title="Canvas View"
            >
              <LayoutGrid className="w-5 h-5" />
            </button>
          </div>

          {/* Theme Toggle Button */}
          <button
            onClick={toggleTheme}
            className="p-2 rounded-lg bg-white/50 dark:bg-zinc-800/50 text-stone-500 dark:text-zinc-400 hover:text-stone-700 dark:hover:text-zinc-200 transition-all"
            title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          >
            {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* View Content */}
      {viewMode === 'list' ? <ListView /> : <CanvasView />}

      {/* Task Sidebar */}
      <TaskSidebar />
    </div>
  );
}