import { Target, MessageCircle, Book, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function NextLessonPoll() {
  const options = [
    { icon: MessageCircle, label: 'Daha fazla konuşma pratiği', selected: true, color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-200' },
    { icon: Book, label: 'Yeni kelimeler ve ifadeler', selected: false, color: 'text-amber-600', bg: 'bg-amber-50', border: 'border-transparent' },
    { icon: Book, label: 'Bir metin üzerinde çalışma', selected: false, color: 'text-purple-600', bg: 'bg-purple-50', border: 'border-transparent' },
  ];

  return (
    <div className="bg-white rounded-3xl p-6 shadow-sm border border-[#eef3f0]">
      <div className="flex items-center gap-2 mb-1">
        <Target className="h-5 w-5 text-rose-400" />
        <h2 className="text-[#3b5e4d] font-bold text-lg">Gelecek Derste Ne Yapalım?</h2>
      </div>
      <p className="text-xs text-slate-500 mb-4">Sen seç, birlikte planlayalım.</p>

      <div className="grid grid-cols-3 gap-2">
        {options.map((opt, i) => (
          <div key={i} className={`flex flex-col items-center text-center p-3 rounded-2xl cursor-pointer transition-all border ${opt.bg} ${opt.border} ${opt.selected ? 'shadow-sm' : 'opacity-70 hover:opacity-100'}`}>
            <opt.icon className={`h-5 w-5 mb-2 ${opt.color}`} />
            <span className={`text-[10px] font-medium leading-tight ${opt.selected ? 'text-[#2d4a3e]' : 'text-slate-500'}`}>{opt.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function NoteToTuba() {
  return (
    <div className="bg-[#fdfaf6] rounded-3xl p-5 shadow-sm border border-[#f1eee8]">
      <div className="flex items-center gap-2 mb-1">
        <span className="text-rose-400">✏️</span>
        <h3 className="text-[#3b5e4d] font-bold text-sm">Tuba'ya Notum <span className="text-rose-400">♥</span></h3>
      </div>
      <p className="text-[10px] text-slate-500 mb-3">Derslerle ilgili, sormak istediğin ya da paylaşmak istediğin bir şey var mı?</p>
      
      <div className="bg-white rounded-xl border border-[#eef3f0] p-2 mb-2">
        <textarea 
          className="w-full h-12 bg-transparent resize-none outline-none text-xs text-[#4a6b5d] placeholder:text-slate-400"
          placeholder="Notunu buraya yaz..."
          defaultValue="Türk dizilerindeki günlük konuşma ifadelerini öğrenmek istiyorum. 😊"
        />
      </div>
      <Button className="w-full bg-[#6b8e7c] hover:bg-[#588157] text-white rounded-xl h-8 text-xs">Gönder</Button>
    </div>
  );
}

export function VocabularyWidget() {
  const words = [
    { tr: 'rutin', en: 'daily routine' },
    { tr: 'keşfetmek', en: 'to discover' },
    { tr: 'özgüven', en: 'self-confidence' },
    { tr: 'alışveriş', en: 'shopping' },
    { tr: 'manzara', en: 'scenery' },
  ];

  return (
    <div className="bg-[#f3f8f5] rounded-3xl p-5 shadow-sm border border-[#eef3f0] h-full flex flex-col justify-between">
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-[#3b5e4d] font-bold text-sm flex items-center gap-2">
            <Book className="h-4 w-4 text-[#588157]" /> Kelimelerim
          </h3>
        </div>
        <p className="text-[10px] text-[#588157] font-medium mb-3">Kaydettiğin 24 kelime</p>
        
        <div className="space-y-2">
          {words.map((w, i) => (
            <div key={i} className="flex justify-between items-center">
              <span className="text-xs font-bold text-[#4a6b5d]">{w.tr}</span>
              <span className="text-[10px] text-slate-500">{w.en}</span>
            </div>
          ))}
        </div>
      </div>
      
      <Button variant="link" className="text-[#6b8e7c] text-[10px] h-auto p-0 mt-4 self-end">
        Tüm kelimelerimi gör <ArrowRight className="h-3 w-3 ml-1" />
      </Button>
    </div>
  );
}
