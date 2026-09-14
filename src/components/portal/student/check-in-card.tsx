import { Heart } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function CheckInCard() {
  const moods = [
    { label: 'Harika', emoji: '😄', color: 'text-green-500' },
    { label: 'İyi', emoji: '🙂', color: 'text-emerald-400' },
    { label: 'Fena değil', emoji: '😐', color: 'text-orange-400', selected: true },
    { label: 'Biraz zor', emoji: '😕', color: 'text-blue-400' },
    { label: 'Kötü', emoji: '😞', color: 'text-indigo-400' },
  ];

  return (
    <div className="bg-white rounded-3xl p-6 shadow-sm border border-[#eef3f0] flex flex-col h-full">
      <div className="flex items-center gap-2 mb-2">
        <Heart className="h-5 w-5 fill-[#e89b7b] text-[#e89b7b]" />
        <h2 className="text-[#3b5e4d] font-bold text-lg">Bu Hafta Nasılsın?</h2>
      </div>
      <p className="text-xs text-slate-500 mb-4">Duygularını bizimle paylaş.</p>

      <div className="flex justify-between mb-4">
        {moods.map((m, i) => (
          <div key={i} className="flex flex-col items-center gap-1 cursor-pointer">
            <div className={`h-12 w-12 rounded-full flex items-center justify-center text-2xl border-2 transition-all ${
              m.selected ? 'border-[#e89b7b] bg-[#fff5f2]' : 'border-transparent bg-[#fdfaf6] opacity-70 hover:opacity-100 hover:bg-[#eef3f0]'
            }`}>
              {m.emoji}
            </div>
            <span className={`text-[10px] font-medium ${m.selected ? 'text-[#e89b7b]' : 'text-slate-500'}`}>{m.label}</span>
          </div>
        ))}
      </div>

      <div className="flex-1 bg-[#fdfaf6] border border-[#f1eee8] rounded-xl p-3 mb-3 relative">
        <textarea 
          className="w-full h-full bg-transparent resize-none outline-none text-sm text-[#4a6b5d] placeholder:text-slate-400"
          placeholder="Bu hafta okul biraz yoğundu ama Türkçe çalışmak bana iyi geliyor. Özellikle yeni kelimeler öğrenmek motive ediyor."
          defaultValue="Bu hafta okul biraz yoğundu ama Türkçe çalışmak bana iyi geliyor. Özellikle yeni kelimeler öğrenmek motive ediyor."
        />
        <span className="absolute bottom-2 right-2 text-[10px] text-slate-400">92/300</span>
      </div>

      <div className="flex justify-between items-end">
        <Button className="bg-[#4a6b5d] hover:bg-[#3b5e4d] text-white rounded-xl px-8 h-9 text-sm">
          Kaydet
        </Button>
        <div className="text-right">
          <p className="text-[#e89b7b] font-serif italic text-sm -rotate-6">Duyguların<br/>önemli ♥</p>
        </div>
      </div>
    </div>
  );
}
