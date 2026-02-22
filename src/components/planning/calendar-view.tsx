'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, Plus, Calendar as CalendarIcon, Clock, Cake } from 'lucide-react';
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
import { AddEventSheet } from './add-event-sheet';
import { useUser } from '@/firebase';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

type CalendarViewProps = {
  events: CalendarEvent[];
  workRules: WorkRule[];
  workLogs: WorkLog[];
  birthdays: Birthday[];
};

export function CalendarView({ events, workRules, workLogs, birthdays }: CalendarViewProps) {
  const { user: currentUser } = useUser();
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

  const getUserStyle = (userId: string) => {
    const isTuba = userId === currentUser?.uid && currentUser?.email === 'tubakodak8@gmail.com';
    if (isTuba) return "border-l-4 border-l-purple-500 bg-purple-50 text-purple-700";
    return "border-l-4 border-l-red-500 bg-red-50 text-red-700";
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
        <TooltipProvider>
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

              const hasContent = events.length > 0 || logs.length > 0 || birthdays.length > 0 || virtualShifts.length > 0;

              return (
                <Tooltip key={idx}>
                  <TooltipTrigger asChild>
                    <div
                      className={cn(
                        "min-h-[140px] p-2 border-r border-b transition-colors cursor-default",
                        !isCurrentMonth && "bg-muted/10 text-muted-foreground/50",
                        isToday && "bg-primary/5",
                        isWeekend(day) && isCurrentMonth && "bg-muted/5",
                        hasContent && "hover:bg-accent/50"
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
                        {birthdays.slice(0, 2).map(b => (
                          <div key={b.id} className="text-[10px] bg-pink-100 text-pink-700 px-1 py-0.5 rounded flex items-center gap-1 border border-pink-200 truncate">
                              🎂 {b.personName}
                          </div>
                        ))}
                        
                        {logs.slice(0, 2).map(l => {
                          const rule = workRules.find(r => r.id === l.workRuleId);
                          const customColor = l.color || rule?.color;
                          return (
                            <div 
                              key={l.id} 
                              className={cn("text-[10px] px-1 py-0.5 rounded border truncate", !customColor && getUserStyle(l.userId))}
                              style={customColor ? { backgroundColor: `${customColor}20`, borderColor: customColor, color: customColor } : {}}
                            >
                                💼 {format(l.actualStartTime, 'HH:mm')}-{format(l.actualEndTime, 'HH:mm')}
                            </div>
                          );
                        })}

                        {virtualShifts.slice(0, 1).map(v => (
                          <div 
                            key={v.id} 
                            className="text-[10px] px-1 py-0.5 rounded border border-dashed opacity-70 truncate"
                            style={v.color ? { borderColor: v.color, color: v.color } : {}}
                          >
                              🔄 {v.defaultDailyStartTime}-{v.defaultDailyEndTime}
                          </div>
                        ))}

                        {events.slice(0, 2).map(e => (
                          <div 
                            key={e.id} 
                            className="text-[10px] px-1 py-0.5 rounded truncate border"
                            style={e.color ? { backgroundColor: `${e.color}20`, borderColor: e.color, color: e.color } : {}}
                          >
                              {e.title}
                          </div>
                        ))}

                        {hasContent && (events.length + logs.length + birthdays.length + virtualShifts.length > 5) && (
                          <p className="text-[9px] text-muted-foreground text-center">...</p>
                        )}
                      </div>
                    </div>
                  </TooltipTrigger>
                  {hasContent && (
                    <TooltipContent side="right" className="w-64 p-3">
                      <div className="space-y-3">
                        <p className="font-bold border-b pb-1">{format(day, 'd MMMM yyyy, EEEE', { locale: tr })}</p>
                        
                        {birthdays.length > 0 && (
                          <div className="space-y-1">
                            <p className="text-[10px] uppercase font-semibold text-pink-600 flex items-center gap-1"><Cake className="h-3 w-3"/> Doğum Günleri</p>
                            {birthdays.map(b => <div key={b.id} className="text-sm">🎂 {b.personName} {b.notes && <span className="text-xs text-muted-foreground italic">- {b.notes}</span>}</div>)}
                          </div>
                        )}

                        {logs.length > 0 && (
                          <div className="space-y-1">
                            <p className="text-[10px] uppercase font-semibold text-blue-600 flex items-center gap-1"><Clock className="h-3 w-3"/> Gerçekleşen Mesai</p>
                            {logs.map(l => <div key={l.id} className="text-sm">💼 {format(l.actualStartTime, 'HH:mm')} - {format(l.actualEndTime, 'HH:mm')} {l.notes && <span className="text-xs text-muted-foreground italic">- {l.notes}</span>}</div>)}
                          </div>
                        )}

                        {virtualShifts.length > 0 && (
                          <div className="space-y-1">
                            <p className="text-[10px] uppercase font-semibold text-orange-600 flex items-center gap-1"><Clock className="h-3 w-3"/> Beklenen Vardiya</p>
                            {virtualShifts.map(v => <div key={v.id} className="text-sm">🔄 {v.defaultDailyStartTime} - {v.defaultDailyEndTime} ({v.title})</div>)}
                          </div>
                        )}

                        {events.length > 0 && (
                          <div className="space-y-1">
                            <p className="text-[10px] uppercase font-semibold text-primary flex items-center gap-1"><CalendarIcon className="h-3 w-3"/> Etkinlikler</p>
                            {events.map(e => <div key={e.id} className="text-sm">📌 {e.title} ({format(e.startTime, 'HH:mm')}-{format(e.endTime, 'HH:mm')})</div>)}
                          </div>
                        )}
                      </div>
                    </TooltipContent>
                  )}
                </Tooltip>
              );
            })}
          </div>
        </TooltipProvider>

        <div className="mt-6 flex flex-wrap gap-4 text-[10px] text-muted-foreground border-t pt-4">
            <div className="flex items-center gap-2"><div className="h-3 w-3 rounded bg-purple-100 border-l-4 border-l-purple-500"></div> Tuba (Mor)</div>
            <div className="flex items-center gap-2"><div className="h-3 w-3 rounded bg-red-100 border-l-4 border-l-red-500"></div> İbrahim (Kırmızı)</div>
            <div className="flex items-center gap-2"><div className="h-3 w-3 rounded bg-pink-100 border border-pink-200"></div> Doğum Günü</div>
            <div className="flex items-center gap-2"><div className="h-3 w-3 rounded border border-dashed border-muted-foreground opacity-50"></div> Beklenen Vardiya</div>
        </div>
      </CardContent>

      <AddEventSheet 
        isOpen={isAddEventOpen} 
        onOpenChange={setIsAddEventOpen} 
      />
    </Card>
  );
}
