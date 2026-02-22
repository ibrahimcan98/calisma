'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, Trash2, Clock, PlayCircle } from 'lucide-react';
import type { WorkRule, WorkLog } from '@/lib/types';
import { useUser, useFirestore } from '@/firebase';
import { doc, collection } from 'firebase/firestore';
import { deleteDocumentNonBlocking, addDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { AddWorkRuleSheet } from './add-work-rule-sheet';
import { cn } from '@/lib/utils';

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
    const ruleRef = doc(firestore, 'users', user.uid, 'workRules', id);
    deleteDocumentNonBlocking(ruleRef);
    toast({ title: "Kural Silindi", description: "Çalışma kuralı kaldırıldı." });
  };

  const handleStartShift = (rule: WorkRule) => {
    if (!user) return;
    const logsRef = collection(firestore, 'users', user.uid, 'workLogs');
    
    const now = new Date();
    const startTime = new Date(now);
    const [h, m] = rule.defaultDailyStartTime.split(':').map(Number);
    startTime.setHours(h, m, 0, 0);

    const endTime = new Date(now);
    const [eh, em] = rule.defaultDailyEndTime.split(':').map(Number);
    endTime.setHours(eh, em, 0, 0);

    const molaSuresi = rule.customBreakDurationMinutes || 30;
    const totalMinutes = (endTime.getTime() - startTime.getTime()) / (1000 * 60) - molaSuresi;

    addDocumentNonBlocking(logsRef, {
        userId: user.uid,
        date: now,
        actualStartTime: startTime,
        actualEndTime: endTime,
        actualBreakDurationMinutes: molaSuresi,
        totalWorkDurationMinutes: totalMinutes,
        isBusy: true,
        workRuleId: rule.id,
        notes: `${rule.title} kapsamında otomatik oluşturuldu.`,
        color: rule.color,
    });

    toast({ title: "Mesai Başlatıldı", description: `${rule.title} baz alınarak bugüne kayıt eklendi.` });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">Çalışma Düzenleri</h2>
          <p className="text-sm text-muted-foreground">Sabit veya esnek çalışma rutinlerinizi tanımlayın.</p>
        </div>
        <Button onClick={() => setIsAddRuleOpen(true)}>
          <Plus className="mr-2 h-4 w-4" /> Kural Ekle
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {rules.map(rule => (
          <Card key={rule.id} className="overflow-hidden">
            <div 
              className="h-1.5 w-full" 
              style={{ backgroundColor: rule.color || (user?.email === 'tubakodak8@gmail.com' ? '#a855f7' : '#ef4444') }} 
            />
            <CardHeader className="pb-2">
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle className="text-lg">{rule.title}</CardTitle>
                  <CardDescription>{rule.workScheduleType === 'Fixed' ? 'Sabit Mesai' : 'Esnek / Vardiyalı'}</CardDescription>
                </div>
                <Button variant="ghost" size="icon" onClick={() => handleDeleteRule(rule.id)}>
                  <Trash2 className="h-4 w-4 text-muted-foreground hover:text-destructive" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-2 text-sm">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span>{rule.defaultDailyStartTime} - {rule.defaultDailyEndTime}</span>
              </div>
              <div className="flex flex-wrap gap-1">
                {rule.daysOfWeek.map(day => (
                  <Badge key={day} variant="secondary" className="text-[10px]">{day}</Badge>
                ))}
              </div>
              <div className="pt-2">
                <Button variant="outline" className="w-full text-xs h-8" onClick={() => handleStartShift(rule)}>
                   <PlayCircle className="mr-2 h-3 w-3" /> Bugüne İşle
                </Button>
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
