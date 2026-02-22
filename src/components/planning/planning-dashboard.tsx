'use client';

import { useState, useMemo, useEffect } from 'react';
import { useUser, useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, orderBy } from 'firebase/firestore';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CalendarView } from './calendar-view';
import { WorkRulesManager } from './work-rules-manager';
import { BirthdayManager } from './birthday-manager';
import type { CalendarEvent, WorkRule, WorkLog, Birthday } from '@/lib/types';
import { Loader2, Calendar, Clock, Cake } from 'lucide-react';

export function PlanningDashboard() {
  const { user } = useUser();
  const firestore = useFirestore();
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Events
  const eventsQuery = useMemoFirebase(() => {
    if (!user) return null;
    return query(collection(firestore, 'users', user.uid, 'events'), orderBy('startTime', 'asc'));
  }, [firestore, user]);
  const { data: rawEvents, isLoading: isEventsLoading } = useCollection<CalendarEvent>(eventsQuery);

  // Work Rules
  const workRulesQuery = useMemoFirebase(() => {
    if (!user) return null;
    return collection(firestore, 'users', user.uid, 'workRules');
  }, [firestore, user]);
  const { data: rawWorkRules, isLoading: isWorkRulesLoading } = useCollection<WorkRule>(workRulesQuery);

  // Work Logs
  const workLogsQuery = useMemoFirebase(() => {
    if (!user) return null;
    return query(collection(firestore, 'users', user.uid, 'workLogs'), orderBy('date', 'desc'));
  }, [firestore, user]);
  const { data: rawWorkLogs, isLoading: isWorkLogsLoading } = useCollection<WorkLog>(workLogsQuery);

  // Birthdays
  const birthdaysQuery = useMemoFirebase(() => {
    if (!user) return null;
    return collection(firestore, 'users', user.uid, 'birthdays');
  }, [firestore, user]);
  const { data: rawBirthdays, isLoading: isBirthdaysLoading } = useCollection<Birthday>(birthdaysQuery);

  const events = useMemo(() => {
    if (!rawEvents) return [];
    return rawEvents.map(e => ({
      ...e,
      startTime: (e.startTime as any)?.toDate() ?? new Date(),
      endTime: (e.endTime as any)?.toDate() ?? new Date(),
    }));
  }, [rawEvents]);

  const workLogs = useMemo(() => {
    if (!rawWorkLogs) return [];
    return rawWorkLogs.map(l => ({
      ...l,
      date: (l.date as any)?.toDate() ?? new Date(),
      actualStartTime: (l.actualStartTime as any)?.toDate() ?? new Date(),
      actualEndTime: (l.actualEndTime as any)?.toDate() ?? new Date(),
    }));
  }, [rawWorkLogs]);

  const birthdays = useMemo(() => {
    if (!rawBirthdays) return [];
    return rawBirthdays.map(b => ({
      ...b,
      birthDate: (b.birthDate as any)?.toDate() ?? new Date(),
    }));
  }, [rawBirthdays]);

  if (!isMounted || isEventsLoading || isWorkRulesLoading || isBirthdaysLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Online Planlama</h1>
      </div>

      <Tabs defaultValue="calendar" className="w-full">
        <TabsList className="grid w-full grid-cols-3 max-w-md">
          <TabsTrigger value="calendar" className="flex items-center gap-2">
            <Calendar className="h-4 w-4" /> Takvim
          </TabsTrigger>
          <TabsTrigger value="work" className="flex items-center gap-2">
            <Clock className="h-4 w-4" /> Çalışma Takibi
          </TabsTrigger>
          <TabsTrigger value="birthdays" className="flex items-center gap-2">
            <Cake className="h-4 w-4" /> Doğum Günleri
          </TabsTrigger>
        </TabsList>

        <TabsContent value="calendar" className="mt-6">
          <CalendarView 
            events={events} 
            workLogs={workLogs} 
            workRules={rawWorkRules || []} 
            birthdays={birthdays}
          />
        </TabsContent>

        <TabsContent value="work" className="mt-6">
          <WorkRulesManager 
            rules={rawWorkRules || []} 
            logs={workLogs}
          />
        </TabsContent>

        <TabsContent value="birthdays" className="mt-6">
          <BirthdayManager 
            birthdays={birthdays}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
