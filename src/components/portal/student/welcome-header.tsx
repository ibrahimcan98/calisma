import { Search } from 'lucide-react';

export function WelcomeHeader({ name }: { name: string }) {
  return (
    <div className="relative w-full h-32 md:h-40 flex items-center justify-between px-8 border-b border-[#f1eee8] shrink-0 bg-[#fdfaf6]">
      {/* Background Illustration Simulation */}
      <div className="absolute inset-0 opacity-40 pointer-events-none overflow-hidden">
        <div className="w-full h-full bg-[url('https://api.dicebear.com/7.x/shapes/svg?seed=city&backgroundColor=transparent')] bg-cover bg-center mix-blend-multiply opacity-20" />
      </div>

      <div className="relative z-10 flex flex-col justify-center">
        <h1 className="text-4xl md:text-5xl font-bold text-[#1f3a2f] font-serif tracking-tight flex items-center gap-2">
          Merhaba {name}! <span className="text-[#e89b7b] text-3xl">✨</span>
        </h1>
        <p className="text-[#2d4a3e] mt-1 font-medium text-lg flex items-center gap-1">
          Burası tamamen sana ait. <span className="text-red-400">♥</span>
        </p>
      </div>

      <div className="relative z-10 hidden md:flex items-center gap-4">
        <div className="flex flex-col items-end mr-8">
          <p className="text-sm font-medium text-[#2d4a3e] italic">"Bugünün çabası,</p>
          <p className="text-sm font-medium text-[#2d4a3e] italic">yarının özgüvenidir." <span className="text-red-400">♥</span></p>
        </div>

        <button className="h-10 w-10 rounded-full bg-white border border-[#eef3f0] flex items-center justify-center text-slate-400 shadow-sm hover:text-[#6b8e7c]">
          <Search className="h-5 w-5" />
        </button>
        <div className="bg-[#fff9eb] px-4 py-2 rounded-full border border-[#fdeacc] flex items-center gap-2 text-sm text-[#8c6d46] font-medium shadow-sm">
          <span className="text-red-400">♥</span> İyi ki buradasın!
        </div>
        <div className="h-10 w-10 rounded-full bg-[#6b8e7c] text-white flex items-center justify-center font-bold text-lg shadow-sm">
          {name[0]}
        </div>
      </div>
    </div>
  );
}
