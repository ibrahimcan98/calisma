import { BarChart2 } from 'lucide-react';

export function AchievementRoadmap() {
  const achievements = [
    { label: 'Konuşma', status: 'Üzerinde çalışıyoruz', progress: 40, color: 'bg-[#f4a261]' },
    { label: 'Dinleme', status: 'Neredeyse tamam', progress: 75, color: 'bg-[#e76f51]' },
    { label: 'Okuma', status: 'Üzerinde çalışıyoruz', progress: 50, color: 'bg-[#a3b18a]' },
    { label: 'Yazma', status: 'Başardım', progress: 100, color: 'bg-[#588157]' },
    { label: 'Kelime bilgisi', status: 'Neredeyse tamam', progress: 85, color: 'bg-[#d4a373]' },
    { label: 'Dil bilgisi', status: 'Üzerinde çalışıyoruz', progress: 30, color: 'bg-[#e9c46a]' },
  ];

  return (
    <div className="bg-white rounded-3xl p-6 shadow-sm border border-[#eef3f0] flex flex-col h-full relative overflow-hidden">
      <div className="flex items-center gap-2 mb-2">
        <BarChart2 className="h-5 w-5 text-[#588157]" />
        <h2 className="text-[#3b5e4d] font-bold text-lg">Kazanım Yolculuğum</h2>
      </div>
      <p className="text-xs text-slate-500 mb-6">Hedeflerine adım adım.</p>

      <div className="flex flex-col gap-4 flex-1">
        {achievements.map((a, i) => (
          <div key={i} className="flex items-center justify-between gap-4">
            <span className="text-xs font-medium text-[#4a6b5d] w-20">{a.label}</span>
            <div className="flex-1 h-3 bg-[#f1eee8] rounded-full overflow-hidden">
              <div className={`h-full ${a.color} rounded-full opacity-80`} style={{ width: `${a.progress}%` }} />
            </div>
            <span className={`text-[9px] font-semibold w-24 text-right ${
              a.status === 'Başardım' ? 'text-[#588157]' : 
              a.status === 'Neredeyse tamam' ? 'text-[#a28cd1]' : 
              'text-[#f4a261]'
            }`}>{a.status}</span>
          </div>
        ))}
      </div>

      <div className="mt-6 text-center">
        <p className="text-[#588157] font-serif italic text-sm">"Her küçük ilerleme, büyük bir fark yaratır." ♥</p>
      </div>
    </div>
  );
}
