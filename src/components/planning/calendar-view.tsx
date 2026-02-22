'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, Plus, Calendar as CalendarIcon, Clock, Cake, Trash2 } from 'lucide-react';
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
  subMonths
} from 'date-fns';
import { tr } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import type { CalendarEvent, WorkRule, WorkLog, Birthday } from '@/lib/types';
import { AddEventSheet } from './add-event-sheet';
import { useUser, useFirestore } from '@/firebase';
import { doc } from 'firebase/firestore';
import { deleteDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import { useToast } from '@/hooks/use-toast';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

type CalendarViewProps = {
  events: CalendarEvent[];
  workRules: WorkRule[];
  workLogs: WorkLog[];
  birthdays: Birthday[];
};

const TR_DAYS = ['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz'];

export function CalendarView({ events, workRules, workLogs, birthdays }: CalendarViewProps) {
  const { user: currentUser } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
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

    return {
        events: dayEvents,
        logs: dayLogs,
        birthdays: dayBirthdays
    };
  };

  const handleDeleteItem = (id: string, type: 'events' | 'workLogs' | 'birthdays') => {
    if (!currentUser) return;
    const ref = doc(firestore, 'users', currentUser.uid, type, id);
    deleteDocumentNonBlocking(ref);
    toast({ title: "Silindi", description: "Kayıt başarıyla kaldırıldı." });
  };

  const handleClearDay = (day: Date) => {
    if (!currentUser) return;
    const { events: dayEvents, logs: dayLogs } = getEventsForDay(day);
    
    dayEvents.forEach(e => {
        const ref = doc(firestore, 'users', currentUser.uid, 'events', e.id);
        deleteDocumentNonBlocking(ref);
    });

    dayLogs.forEach(l => {
        const ref = doc(firestore, 'users', currentUser.uid, 'workLogs', l.id);
        deleteDocumentNonBlocking(ref);
    });

    toast({ 
        title: "Gün Temizlendi", 
        description: "Tüm etkinlik ve mesailer silindi." 
    });
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
          {TR_DAYS.map(day => (
            <div key={day} className="p-2 text-center text-sm font-semibold border-r border-b bg-muted/30">
              {day}
            </div>
          ))}
          {days.map((day, idx) => {
            const { events: dayEvents, logs: dayLogs, birthdays: dayBirthdays } = getEventsForDay(day);
            const isToday = isSameDay(day, new Date());
            const isCurrentMonth = isSameMonth(day, monthStart);
            const hasContent = dayEvents.length > 0 || dayLogs.length > 0 || dayBirthdays.length > 0;

            return (
              <Popover key={idx}>
                <PopoverTrigger asChild>
                  <div
                    className={cn(
                      "min-h-[140px] p-2 border-r border-b transition-colors cursor-pointer",
                      !isCurrentMonth && "bg-muted/10 text-muted-foreground/50",
                      isToday && "bg-primary/5",
                      hasContent && "hover:bg-accent/5"
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
                      {dayBirthdays.map(b => (
                        <div key={b.id} className="text-[10px] bg-pink-100 text-pink-700 px-1 py-0.5 rounded border border-pink-200 truncate">
                            🎂 {b.personName}
                        </div>
                      ))}
                      
                      {dayLogs.map(l => (
                        <div 
                          key={l.id} 
                          className="text-[10px] px-1 py-0.5 rounded border truncate shadow-sm"
                          style={{ backgroundColor: `${l.color || '#3b82f6'}30`, borderColor: l.color || '#3b82f6', color: l.color || '#3b82f6', borderLeftWidth: '4px' }}
                        >
                            💼 {format(l.actualStartTime, 'HH:mm')}
                        </div>
                      ))}

                      {dayEvents.map(e => (
                        <div 
                          key={e.id} 
                          className="text-[10px] px-1 py-0.5 rounded truncate border"
                          style={e.color ? { backgroundColor: `${e.color}20`, borderColor: e.color, color: e.color } : { backgroundColor: '#f1f5f9', borderColor: '#cbd5e1', color: '#475569' }}
                        >
                            {e.title}
                        </div>
                      ))}
                    </div>
                  </div>
                </PopoverTrigger>
                <PopoverContent side="right" className="w-80 p-4 shadow-xl">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between border-b pb-2">
                        <p className="font-bold">{format(day, 'd MMMM yyyy, EEEE', { locale: tr })}</p>
                        {(dayEvents.length > 0 || dayLogs.length > 0) && (
                            <AlertDialog>
                                <AlertDialogTrigger asChild>
                                    <Button variant="ghost" size="sm" className="h-8 text-destructive">
                                        <Trash2 className="h-4 w-4 mr-2" /> Günü Temizle
                                    </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                    <AlertDialogHeader>
                                        <AlertDialogTitle>Günü Temizle?</AlertDialogTitle>
                                        <AlertDialogDescription>
                                            Bu güne ait tüm özel etkinlikler ve mesai kayıtları (loglar) silinecektir.
                                        </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                        <AlertDialogCancel>Vazgeç</AlertDialogCancel>
                                        <AlertDialogAction onClick={() => handleClearDay(day)} className="bg-destructive text-destructive-foreground">
                                            Temizle
                                        </AlertDialogAction>
                                    </AlertDialogFooter>
                                </AlertDialogContent>
                            </AlertDialog>
                        )}
                    </div>
                    
                    {dayBirthdays.length > 0 && (
                      <div className="space-y-1">
                        <p className="text-[10px] uppercase font-bold text-pink-600 flex items-center gap-1"><Cake className="h-3 w-3"/> Doğum Günleri</p>
                        {dayBirthdays.map(b => (
                            <div key={b.id} className="flex items-center justify-between group py-1 border-b border-pink-50 last:border-0">
                                <span className="text-sm">🎂 {b.personName}</span>
                                <Button variant="ghost" size="icon" className="h-6 w-6 opacity-0 group-hover:opacity-100" onClick={() => handleDeleteItem(b.id, 'birthdays')}>
                                    <Trash2 className="h-3 w-3 text-muted-foreground" />
                                </Button>
                            </div>
                        ))}
                      </div>
                    )}

                    {dayLogs.length > 0 && (
                      <div className="space-y-1">
                        <p className="text-[10px] uppercase font-bold text-blue-600 flex items-center gap-1"><Clock className="h-3 w-3"/> İşlenen Mesai</p>
                        {dayLogs.map(l => (
                            <div key={l.id} className="flex items-center justify-between group py-1 border-b border-blue-50 last:border-0">
                                <span className="text-sm font-medium">💼 {format(l.actualStartTime, 'HH:mm')} - {format(l.actualEndTime, 'HH:mm')}</span>
                                <Button variant="ghost" size="icon" className="h-6 w-6 opacity-0 group-hover:opacity-100" onClick={() => handleDeleteItem(l.id, 'workLogs')}>
                                    <Trash2 className="h-3 w-3 text-muted-foreground" />
                                </Button>
                            </div>
                        ))}
                      </div>
                    )}

                    {dayEvents.length > 0 && (
                      <div className="space-y-1">
                        <p className="text-[10px] uppercase font-bold text-primary flex items-center gap-1"><CalendarIcon className="h-3 w-3"/> Etkinlikler</p>
                        {dayEvents.map(e => (
                             <div key={e.id} className="flex items-center justify-between group py-1 border-b border-blue-50 last:border-0">
                                <span className="text-sm">📌 {e.title}</span>
                                <Button variant="ghost" size="icon" className="h-6 w-6 opacity-0 group-hover:opacity-100" onClick={() => handleDeleteItem(e.id, 'events')}>
                                    <Trash2 className="h-3 w-3 text-muted-foreground" />
                                </Button>
                            </div>
                        ))}
                      </div>
                    )}
                    {!hasContent && <p className="text-sm text-muted-foreground text-center py-4">Kayıt yok.</p>}
                  </div>
                </PopoverContent>
              </Popover>
            );
          })}
        </div>
      </CardContent>

      <AddEventSheet 
        isOpen={isAddEventOpen} 
        onOpenChange={setIsAddEventOpen} 
      />
    </Card>
  );
}
