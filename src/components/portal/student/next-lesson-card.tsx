import { Calendar, Clock, BookOpen, Edit3, CalendarPlus } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function NextLessonCard() {
  return (
    <div className="bg-[#eaf3ed] rounded-3xl p-6 shadow-sm border border-[#d3e3d9] relative w-full h-full flex flex-col justify-between">
      <div>
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-[#3b5e4d] font-bold flex items-center gap-2 text-lg">
            <Calendar className="h-5 w-5 fill-[#3b5e4d] text-white" /> Bir Sonraki Dersim
          </h2>
          <Button variant="outline" size="sm" className="h-7 text-xs bg-white text-[#4a6b5d] border-[#d3e3d9] hover:bg-[#f3f8f5] rounded-full">
            <CalendarPlus className="h-3 w-3 mr-1" /> Takvime ekle
          </Button>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="bg-white p-3 rounded-2xl flex items-center gap-3 shadow-sm border border-[#d3e3d9]">
            <Calendar className="h-5 w-5 text-[#6b8e7c]" />
            <div>
              <p className="text-xs text-slate-500 font-medium">Perşembe</p>
              <p className="text-sm font-bold text-[#2d4a3e]">24 Nisan 2025</p>
            </div>
          </div>
          <div className="bg-white p-3 rounded-2xl flex items-center gap-3 shadow-sm border border-[#d3e3d9]">
            <Clock className="h-5 w-5 text-[#6b8e7c]" />
            <div>
              <p className="text-sm font-bold text-[#2d4a3e]">16:00 - 17:00</p>
              <p className="text-xs text-slate-500 font-medium">(TSİ)</p>
            </div>
          </div>
        </div>

        <div className="mb-4">
          <div className="flex gap-2 items-start text-[#3b5e4d]">
            <BookOpen className="h-5 w-5 mt-0.5" />
            <div>
              <p className="text-xs font-semibold opacity-80 mb-0.5">Ders konusu</p>
              <p className="font-bold">Günlük rutinler ve zaman ifadeleri</p>
            </div>
          </div>
        </div>
      </div>

      <div className="absolute right-4 bottom-14 rotate-6 hidden md:block">
        <div className="bg-[#fff4e6] border border-[#fdeacc] p-2 rounded-lg shadow-sm text-[#d98a5e] font-serif italic text-xs text-center">
          Her ders<br/>yeni bir<br/>şey keşfet!<br/>♥
        </div>
      </div>

      <div className="bg-[#d3e3d9]/40 p-4 rounded-2xl border border-[#d3e3d9] text-[#3b5e4d] text-sm">
        <p className="flex items-center gap-2 font-bold mb-1"><Edit3 className="h-4 w-4" /> Hazırlık notu</p>
        <p>Lütfen geçen derste gördüğümüz kelimeleri kısaca tekrar et ve sabah rutinini anlatmaya çalış. 😊</p>
      </div>
    </div>
  );
}
