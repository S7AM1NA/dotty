import { Target } from "lucide-react";

function App() {
  return (
    // 这里的 h-screen, bg-stone-50 等都是 Tailwind 的类名
    <div className="h-screen w-full bg-stone-50 flex flex-col items-center justify-center space-y-4">
      
      {/* 图标 */}
      <div className="p-4 bg-white rounded-2xl shadow-sm border border-stone-200">
        <Target className="w-12 h-12 text-blue-500" />
      </div>

      {/* 标题 */}
      <h1 className="text-3xl font-bold text-stone-800 tracking-tight">
        Hello, Dotty!
      </h1>

      {/* 测试按钮 */}
      <button className="px-6 py-2 bg-black text-white rounded-lg hover:bg-stone-800 transition-colors">
        如果你看到这个变黑了，说明 Tailwind 成功了
      </button>

    </div>
  );
}

export default App;