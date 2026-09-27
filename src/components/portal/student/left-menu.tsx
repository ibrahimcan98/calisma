import { Home, Calendar, MessageCircle } from 'lucide-react';

export function LeftMenu({ activeTab, setActiveTab }: { activeTab: string, setActiveTab: (tab: string) => void }) {
  const menuItems = [
    { name: 'Ana Sayfa', icon: Home },
    { name: 'Derslerim', icon: Calendar },
    { name: 'Mesajlar', icon: MessageCircle },
  ];

  return (
    <aside className="flex w-full shrink-0 flex-col border-b border-[#f1eee8] bg-[#fdfaf6] px-3 py-3 lg:h-full lg:w-48 lg:items-start lg:border-b-0 lg:border-r lg:px-2 lg:py-8">
      <div className="hidden mb-10 px-4 lg:block">
        <h1 className="text-2xl font-bold text-[#2d4a3e] font-serif leading-tight">
          Türkçe
          <span className="text-[#e89b7b] text-xl ml-1">♥</span>
        </h1>
        <p className="text-[10px] text-slate-500 mt-1 italic">daha fazlasını<br/>mümkün kılar</p>
      </div>

      <nav className="touch-scroll flex w-full gap-2 overflow-x-auto pb-1 pr-24 lg:flex-col lg:overflow-visible lg:pb-0 lg:pr-0">
        {menuItems.map((item) => {
          const isActive = activeTab === item.name;
          return (
            <button
              key={item.name}
              onClick={() => setActiveTab(item.name)}
              className={`flex shrink-0 items-center gap-2 rounded-xl px-3 py-2.5 transition-all lg:w-full lg:gap-3 lg:rounded-2xl lg:px-4 lg:py-3 ${
                isActive 
                  ? 'bg-[#eef3f0] text-[#4a6b5d] font-semibold' 
                  : 'text-slate-500 hover:bg-white hover:text-[#4a6b5d]'
              }`}
            >
              <item.icon className={`h-4 w-4 ${isActive ? 'text-[#6b8e7c]' : 'text-slate-400'}`} />
              <span className="whitespace-nowrap text-xs lg:text-sm">{item.name}</span>
            </button>
          )
        })}
      </nav>

      <div className="mt-auto hidden px-4 w-full opacity-60 lg:block">
        <div className="w-full h-24 bg-[url('https://api.dicebear.com/7.x/shapes/svg?seed=istanbul&backgroundColor=transparent')] bg-contain bg-no-repeat bg-bottom mix-blend-multiply opacity-50 mb-2"></div>
        <p className="text-[9px] text-center text-[#2d4a3e] italic">Küçük adımlarla<br/>büyük hikayeler ♥</p>
      </div>
    </aside>
  );
}
