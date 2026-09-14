import { Calendar as CalendarIcon, ArrowRight, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function LessonTimeline() {
  const lessons = [
    { day: 'Pzt', date: '21 Nis', topic: 'Alışveriş', status: 'past' },
    { day: 'Çar', date: '23 Nis', topic: 'Tekrar', status: 'past' },
    { day: 'Per', date: '24 Nis', topic: 'Günlük rutinler', status: 'current' },
    { day: 'Pzt', date: '28 Nis', topic: 'Yiyecekler', status: 'future' },
    { day: 'Çar', date: '30 Nis', topic: 'Şehirde yaşam', status: 'future' },
    { day: 'Pzt', date: '5 May', topic: 'Sağlık', status: 'future' },
    { day: 'Çar', date: '7 May', topic: 'Planlar', status: 'future' },
    { day: 'Pzt', date: '12 May', topic: 'Seyahat', status: 'future' },
  ];

  return (
    <div className="w-full">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-[#3b5e4d] font-bold flex items-center gap-2 text-lg">
          <CalendarIcon className="h-5 w-5" /> Derslerim
        </h2>
        <Button variant="link" className="text-[#6b8e7c] text-xs h-auto p-0">
          Tüm derslerimi gör <ArrowRight className="h-3 w-3 ml-1" />
        </Button>
      </div>

      <div className="flex items-center gap-3 overflow-x-auto pb-4 scrollbar-hide snap-x">
        {lessons.map((lesson, i) => (
          <div key={i} className={`snap-center shrink-0 w-[100px] flex flex-col items-center justify-between p-3 rounded-2xl border bg-white cursor-pointer hover:shadow-md transition-shadow
            ${lesson.status === 'current' ? 'border-[#6b8e7c] ring-1 ring-[#6b8e7c] shadow-sm' : 'border-[#eef3f0]'}`}
          >
            <div className="text-center mb-3">
              <p className={`text-xs ${lesson.status === 'current' ? 'text-[#3b5e4d] font-bold' : 'text-slate-500'}`}>{lesson.day}</p>
              <p className={`font-bold ${lesson.status === 'current' ? 'text-[#3b5e4d]' : 'text-[#6b8e7c]'}`}>{lesson.date}</p>
            </div>
            
            <div className="w-full flex justify-center mb-3 relative">
              <div className="h-px w-full bg-[#eef3f0] absolute top-1/2 -z-10" />
              <div className={`h-3 w-3 rounded-full border-2 border-white ${
                lesson.status === 'past' ? 'bg-[#c8ded3]' :
                lesson.status === 'current' ? 'bg-[#6b8e7c]' :
                'bg-[#f1eee8]'
              }`} />
            </div>

            <p className={`text-xs text-center line-clamp-1 ${lesson.status === 'current' ? 'text-[#3b5e4d] font-semibold' : 'text-slate-500'}`}>
              {lesson.topic}
            </p>
          </div>
        ))}
        
        <div className="snap-center shrink-0 w-[100px] h-[116px] flex flex-col items-center justify-center p-3 rounded-2xl border border-dashed border-[#d3e3d9] bg-[#f9fcfab3] cursor-pointer hover:bg-[#f3f8f5] transition-colors text-[#6b8e7c]">
          <Plus className="h-6 w-6 mb-1" />
          <p className="text-xs font-semibold text-center leading-tight">Yeni ders planla</p>
        </div>
      </div>
    </div>
  );
}
