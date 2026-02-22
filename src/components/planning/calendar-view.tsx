'use client';

import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, Plus, Info } from 'lucide-react';
import { 
  format, 
  startOfMonth, 
  endOfMonth, 
  startOfWeek, 
  endOfWeek, 
  eachDayOfInterval, 
  isSameMonth, 
  isSameDay, 
  addMonths, 
  subMonths,
  isWeekend
} from 'date-fns';
import { tr } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import type { CalendarEvent, WorkRule, WorkLog, Birthday } from '@/lib/types';
import { Badge } from '@/components/ui/badge';
import { AddEventSheet } from './add-event-sheet';

type CalendarViewProps = {
  events: CalendarEvent[];
  workRules: WorkRule[];
  workLogs: WorkLog[];
  birthdays: Birthday[];
};

export function CalendarView({ events, workRules, workLogs, birthdays }: CalendarViewProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [isAddEventOpen, setIsAddEventOpen] = useState(false);

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(monthStart);
  const startDate = startOfWeek(monthStart, { weekStartsOn: 1 });
  const endDate = endOfWeek(monthEnd, { weekStartsOn: 1 });

  const days = eachDayOfInterval({
    start: startDate,
    end: endDate,
  });

  const nextMonth = () => setCurrentDate(addMonths(currentDate, 1));
  const prevMonth = () => setCurrentDate(subMonths(currentDate, 1));

  const getEventsForDay = (day: Date) => {
    const dayEvents = events.filter(e => isSameDay(e.startTime, day));
    const dayLogs = workLogs.filter(l => isSameDay(l.date, day));
    const dayBirthdays = birthdays.filter(b => {
        const bDate = b.birthDate;
        return bDate.getDate() === day.getDate() && bDate.getMonth() === day.getMonth();
    });

    // Virtual events from rules if no log exists
    const dayName = format(day, 'eee', { locale: tr });
    const virtualShifts = workRules
        .filter(r => r.isActive && r.daysOfWeek.includes(dayName))
        .filter(r => !dayLogs.some(l => isSameDay(l.date, day)));

    return {
        events: dayEvents,
        logs: dayLogs,
        birthdays: dayBirthdays,
        virtualShifts
    };
  };

  return (
    <Card className="w-full">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <div className="flex items-center gap-4">
          <CardTitle className="text-xl capitalize">
            {format(currentDate, 'MMMM yyyy', { locale: tr })}
          </CardTitle>
          <div className="flex items-center border rounded-md overflow-hidden">
            <Button variant="ghost" size="icon" onClick={prevMonth} className="h-8 w-8 rounded-none border-r">
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" onClick={nextMonth} className="h-8 w-8 rounded-none">
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
        <Button onClick={() => setIsAddEventOpen(true)}>
          <Plus className="mr-2 h-4 w-4" /> Etkinlik Ekle
        </Button>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-7 border-t border-l">
          {['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz'].map(day => (
            <div key={day} className="p-2 text-center text-sm font-semibold border-r border-b bg-muted/30">
              {day}
            </div>
          ))}
          {days.map((day, idx) => {
            const { events, logs, birthdays, virtualShifts } = getEventsForDay(day);
            const isToday = isSameDay(day, new Date());
            const isCurrentMonth = isSameMonth(day, monthStart);

            return (
              <div
                key={idx}
                className={cn(
                  "min-h-[120px] p-2 border-r border-b transition-colors",
                  !isCurrentMonth && "bg-muted/10 text-muted-foreground/50",
                  isToday && "bg-primary/5",
                  isWeekend(day) && isCurrentMonth && "bg-muted/5"
                )}
              >
                <div className="flex justify-between items-center mb-1">
                  <span className={cn(
                    "text-sm font-medium h-6 w-6 flex items-center justify-center rounded-full",
                    isToday && "bg-primary text-primary-foreground"
                  )}>
                    {format(day, 'd')}
                  </span>
                </div>
                
                <div className="space-y-1">
                  {birthdays.map(b => (
                    <div key={b.id} className="text-[10px] bg-pink-100 text-pink-700 px-1 py-0.5 rounded flex items-center gap-1">
                        🎂 {b.personName}
                    </div>
                  ))}
                  {logs.map(l => (
                    <div key={l.id} className="text-[10px] bg-blue-100 text-blue-700 px-1 py-0.5 rounded border border-blue-200">
                        💼 Mesai: {format(l.actualStartTime, 'HH:mm')}-{format(l.actualEndTime, 'HH:mm')}
                    </div>
                  ))}
                  {virtualShifts.map(v => (
                    <div key={v.id} className="text-[10px] bg-blue-50 text-blue-400 px-1 py-0.5 rounded border border-dashed border-blue-200 opacity-70">
                        🔄 Planlı: {v.defaultDailyStartTime}-{v.defaultDailyEndTime}
                    </div>
                  ))}
                  {events.map(e => (
                    <div key={e.id} className={cn(
                        "text-[10px] px-1 py-0.5 rounded truncate",
                        e.eventType === 'Work' ? "bg-indigo-100 text-indigo-700" : "bg-emerald-100 text-emerald-700"
                    )}>
                        {e.title}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-6 flex flex-wrap gap-4 text-xs">
            <div className="flex items-center gap-2"><div className="h-3 w-3 rounded bg-blue-100 border border-blue-200"></div> Gerçekleşen Mesai</div>
            <div className="flex items-center gap-2"><div className="h-3 w-3 rounded bg-blue-50 border border-dashed border-blue-200"></div> Planlı Mesai</div>
            <div className="flex items-center gap-2"><div className="h-3 w-3 rounded bg-emerald-100"></div> Özel Etkinlik</div>
            <div className="flex items-center gap-2"><div className="h-3 w-3 rounded bg-indigo-100"></div> İş Etkinliği</div>
            <div className="flex items-center gap-2"><div className="h-3 w-3 rounded bg-pink-100"></div> Doğum Günü</div>
        </div>
      </CardContent>

      <AddEventSheet 
        isOpen={isAddEventOpen} 
        onOpenChange={setIsAddEventOpen} 
      />
    </Card>
  );
}
