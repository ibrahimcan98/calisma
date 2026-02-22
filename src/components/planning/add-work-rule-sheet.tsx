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
  FormDescription,
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
import { collection } from 'firebase/firestore';
import { addDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import { cn } from '@/lib/utils';
import { DollarSign } from 'lucide-react';

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
  type: z.enum(['Fixed', 'Shift', 'Flexible']),
  startTime: z.string().min(1),
  endTime: z.string().min(1),
  days: z.array(z.string()).min(1, { message: 'En az bir gün seçilmelidir.' }),
  breakMinutes: z.coerce.number().default(30),
  color: z.string().default('#3b82f6'),
  hourlyRate: z.coerce.number().min(0).default(0),
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
      breakMinutes: 30,
      color: '#3b82f6',
      hourlyRate: 15,
    },
  });

  function onSubmit(values: z.infer<typeof formSchema>) {
    if (!user) return;
    const ref = collection(firestore, 'users', user.uid, 'workRules');
    addDocumentNonBlocking(ref, {
      userId: user.uid,
      title: values.title,
      workScheduleType: values.type,
      defaultDailyStartTime: values.startTime,
      defaultDailyEndTime: values.endTime,
      daysOfWeek: values.days,
      customBreakDurationMinutes: values.breakMinutes,
      isActive: true,
      color: values.color,
      hourlyRate: values.hourlyRate,
    });
    form.reset();
    onOpenChange(false);
    toast({ title: 'Kural Oluşturuldu', description: 'Çalışma düzeni ve saatlik ücret başarıyla eklendi.' });
  }

  return (
    <Sheet open={isOpen} onOpenChange={onOpenChange}>
      <SheetContent className="overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Çalışma Düzeni Ekle</SheetTitle>
          <SheetDescription>Tekrarlayan mesai saatlerinizi, ücretinizi ve renginizi belirleyin.</SheetDescription>
        </SheetHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 mt-6">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Düzen Adı</FormLabel>
                  <FormControl><Input {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="hourlyRate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Saatlik Ücret (€)</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input type="number" step="0.5" className="pl-10" {...field} />
                    </div>
                  </FormControl>
                  <FormDescription>Bu düzendeki mesailer için kazanç hesabı yapılacaktır.</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="color"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Renk Seçimi</FormLabel>
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
                        title={color.name}
                      />
                    ))}
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Düzen Türü</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                    <SelectContent>
                      <SelectItem value="Fixed">Sabit Saatli</SelectItem>
                      <SelectItem value="Shift">Vardiyalı</SelectItem>
                      <SelectItem value="Flexible">Esnek</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="startTime"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Başlangıç</FormLabel>
                    <FormControl><Input type="time" {...field} /></FormControl>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="endTime"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Bitiş</FormLabel>
                    <FormControl><Input type="time" {...field} /></FormControl>
                  </FormItem>
                )}
              />
            </div>
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
                        render={({ field }) => {
                          return (
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
                          );
                        }}
                      />
                    ))}
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />
            <SheetFooter>
              <Button type="submit" className="w-full">Düzeni Kaydet</Button>
            </SheetFooter>
          </form>
        </Form>
      </SheetContent>
    </Sheet>
  );
}
