'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, Trash2, Clock, PlayCircle, CalendarDays, CalendarRange, DollarSign, Coffee } from 'lucide-react';
import type { WorkRule, WorkLog } from '@/lib/types';
import { useUser, useFirestore } from '@/firebase';
import { doc, collection } from 'firebase/firestore';
import { deleteDocumentNonBlocking, addDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { AddWorkRuleSheet } from './add-work-rule-sheet';
import { 
  startOfWeek, 
  endOfWeek, 
  startOfMonth, 
  endOfMonth, 
  eachDayOfInterval, 
  format, 
  isSameDay 
} from 'date-fns';
import { tr } from 'date-fns/locale';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type WorkRulesManagerProps = {
  rules: WorkRule[];
  logs: WorkLog[];
};

export function WorkRulesManager({ rules, logs }: WorkRulesManagerProps) {
  const { user } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  const [isAddRuleOpen, setIsAddRuleOpen] = useState(false);

  const handleDeleteRule = (id: string) => {
    if (!user) return;
    
    // 1. Kuralı sil
    const ruleRef = doc(firestore, 'users', user.uid, 'workRules', id);
    deleteDocumentNonBlocking(ruleRef);

    // 2. Bu kurala bağlı olan tüm mesai kayıtlarını (logs) bul ve sil
    const logsToDelete = logs.filter(log => log.workRuleId === id);
    logsToDelete.forEach(log => {
      const logRef = doc(firestore, 'users', user.uid, 'workLogs', log.id);
      deleteDocumentNonBlocking(logRef);
    });

    toast({ 
      title: "Kural ve Kayıtlar Silindi", 
      description: `Çalışma kuralı ve buna bağlı ${logsToDelete.length} mesai kaydı takvimden kaldırıldı.` 
    });
  };

  const handleApplyShift = (rule: WorkRule, period: 'today' | 'week' | 'month') => {
    if (!user) return;
    const logsRef = collection(firestore, 'users', user.uid, 'workLogs');
    const now = new Date();
    
    let start, end;
    if (period === 'today') {
      start = now;
      end = now;
    } else if (period === 'week') {
      start = startOfWeek(now, { weekStartsOn: 1 });
      end = endOfWeek(now, { weekStartsOn: 1 });
    } else {
      start = startOfMonth(now);
      end = endOfMonth(now);
    }

    const daysToApply = eachDayOfInterval({ start, end });
    let count = 0;

    daysToApply.forEach(day => {
      const dayName = format(day, 'eee', { locale: tr }).replace('.', '');
      if (rule.daysOfWeek.includes(dayName)) {
        const alreadyExists = logs.some(l => isSameDay(l.date, day) && l.workRuleId === rule.id);
        
        if (!alreadyExists) {
          let sTime = rule.defaultDailyStartTime;
          let eTime = rule.defaultDailyEndTime;

          if (rule.workScheduleType === 'Flexible' && rule.daySpecificTimes?.[dayName]) {
            sTime = rule.daySpecificTimes[dayName].startTime;
            eTime = rule.daySpecificTimes[dayName].endTime;
          }

          const startTime = new Date(day);
          const [h, m] = sTime.split(':').map(Number);
          startTime.setHours(h, m, 0, 0);

          const endTime = new Date(day);
          const [eh, em] = eTime.split(':').map(Number);
          endTime.setHours(eh, em, 0, 0);

          const molaSuresi = rule.customBreakDurationMinutes || 0;
          const totalMinutes = Math.max(0, (endTime.getTime() - startTime.getTime()) / (1000 * 60) - molaSuresi);

          addDocumentNonBlocking(logsRef, {
            userId: user.uid,
            date: day,
            actualStartTime: startTime,
            actualEndTime: endTime,
            actualBreakDurationMinutes: molaSuresi,
            totalWorkDurationMinutes: totalMinutes,
            isBusy: true,
            workRuleId: rule.id,
            notes: `${rule.title} kapsamında ${period === 'today' ? 'bugün' : 'toplu'} oluşturuldu.`,
            color: rule.color,
          });
          count++;
        }
      }
    });

    if (count > 0) {
      toast({ 
        title: "İşlem Başarılı", 
        description: `${count} günlük mesai kaydı sisteme eklendi.` 
      });
    } else if (period !== 'today') {
      toast({ 
        title: "Kayıt Eklenmedi", 
        description: "Bu dönem için uygun gün bulunamadı veya kayıtlar zaten mevcut." 
      });
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('de-DE', {
      style: 'currency',
      currency: 'EUR',
    }).format(amount);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">Çalışma Düzenleri</h2>
          <p className="text-sm text-muted-foreground">Sabit veya esnek çalışma rutinlerinizi yönetin.</p>
        </div>
        <Button onClick={() => setIsAddRuleOpen(true)}>
          <Plus className="mr-2 h-4 w-4" /> Düzen Ekle
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {rules.map(rule => (
          <Card key={rule.id} className="overflow-hidden border-t-4" style={{ borderTopColor: rule.color || '#3b82f6' }}>
            <CardHeader className="pb-2">
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle className="text-lg">{rule.title}</CardTitle>
                  <CardDescription>
                    {rule.workScheduleType === 'Fixed' ? 'Sabit Mesai' : 'Esnek Mesai'}
                  </CardDescription>
                </div>
                <Button variant="ghost" size="icon" onClick={() => handleDeleteRule(rule.id)}>
                  <Trash2 className="h-4 w-4 text-muted-foreground hover:text-destructive" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 gap-2">
                <div className="flex items-center gap-2 text-sm">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  {rule.workScheduleType === 'Fixed' ? (
                    <span className="font-medium">{rule.defaultDailyStartTime} - {rule.defaultDailyEndTime}</span>
                  ) : (
                    <span className="font-medium">Gün bazlı değişken saatler</span>
                  )}
                </div>
                <div className="flex items-center gap-2 text-sm text-blue-600">
                  <Coffee className="h-4 w-4" />
                  <span>Mola: {rule.customBreakDurationMinutes || 0} dk.</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-green-600">
                  <DollarSign className="h-4 w-4" />
                  <span className="font-bold">{formatCurrency(rule.hourlyRate || 0)} / saat</span>
                </div>
              </div>
              <div className="flex flex-wrap gap-1">
                {rule.daysOfWeek.map(day => (
                  <Badge key={day} variant="secondary" className="text-[10px]">{day}</Badge>
                ))}
              </div>
              <div className="pt-2">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" className="w-full text-xs h-9">
                      <PlayCircle className="mr-2 h-4 w-4" /> Takvime İşle
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-48">
                    <DropdownMenuItem onClick={() => handleApplyShift(rule, 'today')}>
                      <Clock className="mr-2 h-4 w-4" /> Bugüne İşle
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleApplyShift(rule, 'week')}>
                      <CalendarDays className="mr-2 h-4 w-4" /> Bu Haftaya İşle
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleApplyShift(rule, 'month')}>
                      <CalendarRange className="mr-2 h-4 w-4" /> Bu Aya İşle
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </CardContent>
          </Card>
        ))}

        {rules.length === 0 && (
          <div className="col-span-full py-12 text-center border-2 border-dashed rounded-lg">
             <Clock className="mx-auto h-12 w-12 text-muted-foreground/30" />
             <p className="mt-4 text-muted-foreground">Henüz bir çalışma düzeni eklenmemiş.</p>
          </div>
        )}
      </div>

      <AddWorkRuleSheet 
        isOpen={isAddRuleOpen} 
        onOpenChange={setIsAddRuleOpen} 
      />
    </div>
  );
}
