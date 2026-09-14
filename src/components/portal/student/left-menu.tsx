import { Home, Calendar, Book, BarChart, MessageCircle, Settings } from 'lucide-react';

export function LeftMenu({ activeTab, setActiveTab }: { activeTab: string, setActiveTab: (tab: string) => void }) {
  const menuItems = [
    { name: 'Ana Sayfa', icon: Home },
    { name: 'Derslerim', icon: Calendar },
    { name: 'Kelimelerim', icon: Book },
    { name: 'Kazanımlarım', icon: BarChart },
    { name: 'Mesajlar', icon: MessageCircle },
    { name: 'Ayarlar', icon: Settings },
  ];

  return (
    <aside className="w-48 flex flex-col items-start px-2 py-8 bg-[#fdfaf6] border-r border-[#f1eee8] h-full shrink-0">
      <div className="mb-10 px-4">
        <h1 className="text-2xl font-bold text-[#2d4a3e] font-serif leading-tight">
          Türkçe
          <span className="text-[#e89b7b] text-xl ml-1">♥</span>
        </h1>
        <p className="text-[10px] text-slate-500 mt-1 italic">daha fazlasını<br/>mümkün kılar</p>
      </div>

      <nav className="w-full flex flex-col gap-2">
        {menuItems.map((item) => {
          const isActive = activeTab === item.name;
          return (
            <button
              key={item.name}
              onClick={() => setActiveTab(item.name)}
              className={`flex items-center gap-3 w-full px-4 py-3 rounded-2xl transition-all ${
                isActive 
                  ? 'bg-[#eef3f0] text-[#4a6b5d] font-semibold' 
                  : 'text-slate-500 hover:bg-white hover:text-[#4a6b5d]'
              }`}
            >
              <item.icon className={`h-4 w-4 ${isActive ? 'text-[#6b8e7c]' : 'text-slate-400'}`} />
              <span className="text-sm">{item.name}</span>
            </button>
          )
        })}
      </nav>

      <div className="mt-auto px-4 w-full opacity-60">
        <div className="w-full h-24 bg-[url('https://api.dicebear.com/7.x/shapes/svg?seed=istanbul&backgroundColor=transparent')] bg-contain bg-no-repeat bg-bottom mix-blend-multiply opacity-50 mb-2"></div>
        <p className="text-[9px] text-center text-[#2d4a3e] italic">Küçük adımlarla<br/>büyük hikayeler ♥</p>
      </div>
    </aside>
  );
}
