import { Mail } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function TubaMessageCard() {
  const reactions = [
    { emoji: '💛', label: 'Çok mutlu' },
    { emoji: '🤩', label: 'Motive oldum' },
    { emoji: '🥺', label: 'Özel hissettim' },
    { emoji: '👍', label: 'Teşekkür ederim' },
  ];

  return (
    <div className="bg-[#fff4e6] rounded-3xl p-6 shadow-sm border border-[#ffe4c4] relative w-full h-full flex flex-col justify-between">
      <div>
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-[#d98a5e] font-bold flex items-center gap-2 text-lg">
            <Mail className="h-5 w-5" /> Tuba'dan Mesaj
          </h2>
          <span className="text-xs text-[#d98a5e] bg-white px-3 py-1 rounded-full opacity-80">Bugün</span>
        </div>
        
        <div className="text-[#6b503b] text-sm leading-relaxed mb-4">
          <p className="font-semibold mb-2">Merhaba Ada!</p>
          <p>
            Geçen dersteki konuşma pratiğinde gösterdiğin özgüven beni çok mutlu etti. 
            Türkçe ile kurduğun bağ her geçen gün daha da güçleniyor. Aynı merak ve 
            enerjiyle devam et. Seninle bu yolculuk gerçekten çok keyifli!
          </p>
          <p className="mt-3 font-semibold">Tuba 💛</p>
        </div>
      </div>

      <div className="absolute right-4 bottom-16 -rotate-6 hidden md:block">
        <div className="bg-[#fff9eb] border border-[#fdeacc] p-3 rounded-lg shadow-sm text-[#d98a5e] font-serif italic text-sm text-center">
          Sen<br/>yaparsın<br/>♡
        </div>
      </div>

      <div>
        <p className="text-xs text-[#b88c67] mb-2 font-medium">Bu mesaj sana nasıl hissettirdi?</p>
        <div className="flex gap-2 flex-wrap">
          {reactions.map((r, i) => (
            <button key={i} className="flex items-center gap-1.5 bg-white border border-[#ffe4c4] text-[#8c6d46] px-3 py-1.5 rounded-full text-xs font-medium hover:bg-[#fff9eb] hover:border-[#d98a5e] transition-colors shadow-sm">
              <span className="text-sm">{r.emoji}</span> {r.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
