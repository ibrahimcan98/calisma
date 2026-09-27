'use client';

import { Calendar, Clock, CalendarCheck2 } from 'lucide-react';
import type { LessonLog } from '@/lib/types';
import { timeZoneLabel } from '@/lib/time-zones';

export function NextLessonCard({ lesson, timeZone }: { lesson: LessonLog | null; timeZone: string }) {
  if (!lesson) {
    return (
      <div className="flex min-h-[260px] w-full flex-col items-center justify-center rounded-3xl border border-dashed border-[#bfd4c7] bg-[#eef3f0]/70 p-6 text-center">
        <CalendarCheck2 className="mb-3 h-10 w-10 text-[#6b8e7c]" />
        <h2 className="text-lg font-bold text-[#2d4a3e]">Planlanmış dersin yok</h2>
        <p className="mt-2 max-w-sm text-sm text-slate-500">Tuba öğretmenin yeni bir ders planladığında tarihi ve saati burada göreceksin.</p>
      </div>
    );
  }

  const date = normalizeLessonDate(lesson.date);

  return (
    <div className="flex min-h-full w-full flex-col justify-between gap-5 rounded-3xl border border-[#d3e3d9] bg-[#eaf3ed] p-6 shadow-sm">
      <div>
        <div className="mb-6 flex items-center justify-between gap-3">
          <h2 className="flex items-center gap-2 text-lg font-bold text-[#3b5e4d]"><Calendar className="h-5 w-5" /> Bir Sonraki Dersim</h2>
          {lesson.seriesLength === 8 && <span className="rounded-full bg-white px-3 py-1 text-[10px] font-bold text-[#6b8e7c]">{lesson.seriesWeek}/8. hafta</span>}
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="flex items-center gap-3 rounded-2xl border border-[#d3e3d9] bg-white p-4 shadow-sm">
            <Calendar className="h-5 w-5 shrink-0 text-[#6b8e7c]" />
            <div><p className="text-xs font-medium capitalize text-slate-500">{date.toLocaleDateString('tr-TR', { timeZone, weekday: 'long' })}</p><p className="text-sm font-bold text-[#2d4a3e]">{date.toLocaleDateString('tr-TR', { timeZone, day: 'numeric', month: 'long', year: 'numeric' })}</p></div>
          </div>
          <div className="flex items-center gap-3 rounded-2xl border border-[#d3e3d9] bg-white p-4 shadow-sm">
            <Clock className="h-5 w-5 shrink-0 text-[#6b8e7c]" />
            <div><p className="text-sm font-bold text-[#2d4a3e]">{date.toLocaleTimeString('tr-TR', { timeZone, hour: '2-digit', minute: '2-digit' })}</p><p className="text-xs font-medium text-slate-500">{timeZoneLabel(timeZone)} yerel saati</p></div>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-[#d3e3d9] bg-white/60 p-4 text-sm text-[#3b5e4d]">
        <p className="font-bold">Türkçe dersi</p>
        <p className="mt-1 text-xs leading-relaxed text-slate-500">Dersinden önce önceki notlarına ve kelimelerine kısa bir göz atabilirsin.</p>
      </div>
    </div>
  );
}

export function normalizeLessonDate(value: LessonLog['date']) {
  if (value instanceof Date) return value;
  const timestamp = value as unknown as { toDate?: () => Date };
  if (typeof timestamp?.toDate === 'function') return timestamp.toDate();
  return new Date(value as unknown as string);
}
