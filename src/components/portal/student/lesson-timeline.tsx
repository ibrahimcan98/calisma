'use client';

import { Calendar as CalendarIcon, ArrowRight } from 'lucide-react';
import type { LessonLog } from '@/lib/types';
import { normalizeLessonDate } from './next-lesson-card';

export function LessonTimeline({ lessons, timeZone, onViewAll }: { lessons: LessonLog[]; timeZone: string; onViewAll?: () => void }) {
  const now = new Date();
  const visibleLessons = [...lessons].sort((a, b) => normalizeLessonDate(a.date).getTime() - normalizeLessonDate(b.date).getTime()).slice(-10);

  return (
    <section className="w-full">
      <div className="mb-4 flex items-center justify-between gap-4">
        <h2 className="flex items-center gap-2 text-lg font-bold text-[#3b5e4d]"><CalendarIcon className="h-5 w-5" /> Ders Takvimim</h2>
        {onViewAll && <button onClick={onViewAll} className="flex items-center text-xs font-semibold text-[#6b8e7c] hover:text-[#3b5e4d]">Tüm dersler <ArrowRight className="ml-1 h-3 w-3" /></button>}
      </div>

      {visibleLessons.length ? (
        <div className="flex snap-x items-stretch gap-3 overflow-x-auto pb-3">
          {visibleLessons.map((lesson) => {
            const date = normalizeLessonDate(lesson.date);
            const isPast = date < now;
            const isNext = !isPast && lessons.filter((item) => normalizeLessonDate(item.date) >= now).sort((a, b) => normalizeLessonDate(a.date).getTime() - normalizeLessonDate(b.date).getTime())[0]?.id === lesson.id;
            return (
              <article key={lesson.id} className={`min-h-[116px] w-[124px] shrink-0 snap-start rounded-2xl border bg-white p-3 ${isNext ? 'border-[#6b8e7c] ring-1 ring-[#6b8e7c]' : 'border-[#eef3f0]'}`}>
                <p className="text-xs font-medium capitalize text-slate-400">{date.toLocaleDateString('tr-TR', { timeZone, weekday: 'short' })}</p>
                <p className="mt-1 font-black text-[#2d4a3e]">{date.toLocaleDateString('tr-TR', { timeZone, day: 'numeric', month: 'short' })}</p>
                <p className="mt-2 text-xs font-semibold text-[#6b8e7c]">{date.toLocaleTimeString('tr-TR', { timeZone, hour: '2-digit', minute: '2-digit' })}</p>
                <p className="mt-2 text-[10px] text-slate-400">{isPast ? 'Tamamlandı' : isNext ? 'Sıradaki ders' : 'Planlandı'}</p>
              </article>
            );
          })}
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-[#dbe7df] bg-white p-7 text-center"><p className="font-semibold text-[#2d4a3e]">Henüz ders kaydı yok</p><p className="mt-1 text-sm text-slate-500">Tuba öğretmenin planladığı dersler burada görünecek.</p></div>
      )}
    </section>
  );
}
