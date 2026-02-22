'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetFooter,
} from '@/components/ui/sheet';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { useUser, useFirestore } from '@/firebase';
import { collection, addDoc } from 'firebase/firestore';
import { addDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import { cn } from '@/lib/utils';
import { DollarSign, CalendarCheck, Coffee, Clock } from 'lucide-react';
import { startOfWeek, endOfWeek, startOfMonth, endOfMonth, eachDayOfInterval, format } from 'date-fns';
import { tr } from 'date-fns/locale';

const DAYS = ['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz'];

const COLORS = [
  { name: 'Mavi', value: '#3b82f6' },
  { name: 'Yeşil', value: '#22c55e' },
  { name: 'Mor', value: '#a855f7' },
  { name: 'Kırmızı', value: '#ef4444' },
  { name: 'Turuncu', value: '#f97316' },
  { name: 'İndigo', value: '#6366f1' },
];

const formSchema = z.object({
  title: z.string().min(2, { message: 'Başlık gereklidir.' }),
  type: z.enum(['Fixed', 'Flexible']),
  startTime: z.string().min(1),
  endTime: z.string().min(1),
  days: z.array(z.string()).min(1, { message: 'En az bir gün seçilmelidir.' }),
  daySpecificTimes: z.record(z.object({
    startTime: z.string(),
    endTime: z.string(),
  })).optional(),
  breakMinutes: z.coerce.number().min(0).default(30),
  color: z.string().default('#3b82f6'),
  hourlyRate: z.coerce.number().min(0).default(0),
  applyTo: z.enum(['none', 'this-week', 'this-month']).default('none'),
});

export function AddWorkRuleSheet({ isOpen, onOpenChange }: { isOpen: boolean; onOpenChange: (isOpen: boolean) => void }) {
  const { user } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: 'Yeni Çalışma Düzeni',
      type: 'Fixed',
      startTime: '09:00',
      endTime: '18:00',
      days: ['Pzt', 'Sal', 'Çar', 'Per', 'Cum'],
      daySpecificTimes: {},
      breakMinutes: 30,
      color: '#3b82f6',
      hourlyRate: 15,
      applyTo: 'none',
    },
  });

  const watchType = form.watch('type');
  const watchDays = form.watch('days');

  async function onSubmit(values: z.infer<typeof formSchema>) {
    if (!user) return;
    
    const ruleRef = collection(firestore, 'users', user.uid, 'workRules');
    const newRule = {
      userId: user.uid,
      title: values.title,
      workScheduleType: values.type,
      defaultDailyStartTime: values.startTime,
      defaultDailyEndTime: values.endTime,
      daysOfWeek: values.days,
      daySpecificTimes: values.type === 'Flexible' ? values.daySpecificTimes : {},
      customBreakDurationMinutes: values.breakMinutes,
      isActive: true,
      color: values.color,
      hourlyRate: values.hourlyRate,
    };

    const docRef = await addDoc(ruleRef, newRule);
    const ruleId = docRef.id;

    if (values.applyTo !== 'none') {
      const logsRef = collection(firestore, 'users', user.uid, 'workLogs');
      const now = new Date();
      let start, end;

      if (values.applyTo === 'this-week') {
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
        if (values.days.includes(dayName)) {
          let sTime = values.startTime;
          let eTime = values.endTime;

          if (values.type === 'Flexible' && values.daySpecificTimes?.[dayName]) {
            sTime = values.daySpecificTimes[dayName].startTime || values.startTime;
            eTime = values.daySpecificTimes[dayName].endTime || values.endTime;
          }

          const startTime = new Date(day);
          const [h, m] = sTime.split(':').map(Number);
          startTime.setHours(h, m, 0, 0);

          const endTime = new Date(day);
          const [eh, em] = eTime.split(':').map(Number);
          endTime.setHours(eh, em, 0, 0);

          const molaSuresi = values.breakMinutes || 0;
          const totalMinutes = Math.max(0, (endTime.getTime() - startTime.getTime()) / (1000 * 60) - molaSuresi);

          addDocumentNonBlocking(logsRef, {
            userId: user.uid,
            date: day,
            actualStartTime: startTime,
            actualEndTime: endTime,
            actualBreakDurationMinutes: molaSuresi,
            totalWorkDurationMinutes: totalMinutes,
            isBusy: true,
            workRuleId: ruleId,
            notes: `${values.title} kapsamında toplu oluşturuldu.`,
            color: values.color,
          });
          count++;
        }
      });

      if (count > 0) {
        toast({ title: 'Planlama Tamamlandı', description: `${count} günlük mesai takvime işlendi.` });
      }
    }

    form.reset();
    onOpenChange(false);
    toast({ title: 'Kural Oluşturuldu', description: 'Çalışma düzeni başarıyla eklendi.' });
  }

  return (
    <Sheet open={isOpen} onOpenChange={onOpenChange}>
      <SheetContent className="overflow-y-auto sm:max-w-md">
        <SheetHeader>
          <SheetTitle>Çalışma Düzeni Ekle</SheetTitle>
          <SheetDescription>Mesai saatlerinizi ve düzeninizi belirleyin.</SheetDescription>
        </SheetHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 mt-6">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Düzen Adı</FormLabel>
                  <FormControl><Input {...field} value={field.value ?? ''} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Mesai Türü</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Mesai türünü seçin" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="Fixed">Sabit Mesai</SelectItem>
                      <SelectItem value="Flexible">Esnek Mesai</SelectItem>
                    </SelectContent>
                  </Select>
                </FormItem>
              )}
            />
            
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="hourlyRate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Saatlik Ücret (€)</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input type="number" step="0.5" className="pl-10" {...field} value={field.value ?? 0} />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="breakMinutes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Mola (Dakika)</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Coffee className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input type="number" className="pl-10" {...field} value={field.value ?? 0} />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="color"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Takvim Rengi</FormLabel>
                  <div className="flex flex-wrap gap-2">
                    {COLORS.map((color) => (
                      <button
                        key={color.value}
                        type="button"
                        className={cn(
                          "h-8 w-8 rounded-full border-2 transition-all",
                          field.value === color.value ? "border-foreground scale-110 shadow-sm" : "border-transparent"
                        )}
                        style={{ backgroundColor: color.value }}
                        onClick={() => field.onChange(color.value)}
                      />
                    ))}
                  </div>
                </FormItem>
              )}
            />

            {watchType === 'Fixed' && (
              <div className="grid grid-cols-2 gap-4 bg-muted/30 p-4 rounded-lg">
                <FormField
                  control={form.control}
                  name="startTime"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Başlangıç</FormLabel>
                      <FormControl><Input type="time" {...field} value={field.value ?? ''} /></FormControl>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="endTime"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Bitiş</FormLabel>
                      <FormControl><Input type="time" {...field} value={field.value ?? ''} /></FormControl>
                    </FormItem>
                  )}
                />
              </div>
            )}

            <FormField
              control={form.control}
              name="days"
              render={() => (
                <FormItem>
                  <FormLabel>Uygulanacak Günler</FormLabel>
                  <div className="grid grid-cols-4 gap-2">
                    {DAYS.map((day) => (
                      <FormField
                        key={day}
                        control={form.control}
                        name="days"
                        render={({ field }) => (
                          <FormItem key={day} className="flex items-center space-x-2 space-y-0">
                            <FormControl>
                              <Checkbox
                                checked={field.value?.includes(day)}
                                onCheckedChange={(checked) => {
                                  return checked
                                    ? field.onChange([...field.value, day])
                                    : field.onChange(field.value?.filter((value) => value !== day));
                                }}
                              />
                            </FormControl>
                            <FormLabel className="text-xs font-normal">{day}</FormLabel>
                          </FormItem>
                        )}
                      />
                    ))}
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

            {watchType === 'Flexible' && watchDays.length > 0 && (
              <div className="space-y-4">
                <FormLabel>Gün Bazlı Saatler</FormLabel>
                {watchDays.map(day => (
                  <div key={day} className="flex items-center gap-2 bg-muted/20 p-2 rounded-md border border-dashed">
                    <span className="text-sm font-bold w-12">{day}:</span>
                    <FormField
                      control={form.control}
                      name={`daySpecificTimes.${day}.startTime`}
                      render={({ field }) => (
                        <FormItem className="flex-1">
                          <FormControl><Input type="time" {...field} value={field.value ?? ''} className="h-8 text-xs" /></FormControl>
                        </FormItem>
                      )}
                    />
                    <span className="text-muted-foreground">-</span>
                    <FormField
                      control={form.control}
                      name={`daySpecificTimes.${day}.endTime`}
                      render={({ field }) => (
                        <FormItem className="flex-1">
                          <FormControl><Input type="time" {...field} value={field.value ?? ''} className="h-8 text-xs" /></FormControl>
                        </FormItem>
                      )}
                    />
                  </div>
                ))}
              </div>
            )}

            <div className="bg-primary/5 p-4 rounded-lg space-y-4 border border-primary/20">
              <div className="flex items-center gap-2">
                <CalendarCheck className="h-4 w-4 text-primary" />
                <span className="text-sm font-semibold">Takvime Toplu Ekle</span>
              </div>
              <FormField
                control={form.control}
                name="applyTo"
                render={({ field }) => (
                  <FormItem>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger className="bg-background">
                          <SelectValue placeholder="Seçim yapın" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="none">Sadece Kuralı Kaydet</SelectItem>
                        <SelectItem value="this-week">Bu Haftaya İşle</SelectItem>
                        <SelectItem value="this-month">Bu Aya İşle</SelectItem>
                      </SelectContent>
                    </Select>
                  </FormItem>
                )}
              />
            </div>

            <SheetFooter>
              <Button type="submit" className="w-full">Düzeni Kaydet</Button>
            </SheetFooter>
          </form>
        </Form>
      </SheetContent>
    </Sheet>
  );
}