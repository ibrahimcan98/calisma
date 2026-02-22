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
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { useUser, useFirestore } from '@/firebase';
import { collection } from 'firebase/firestore';
import { addDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import { cn } from '@/lib/utils';

const COLORS = [
  { name: 'Mor', value: '#a855f7' },
  { name: 'Kırmızı', value: '#ef4444' },
  { name: 'Mavi', value: '#3b82f6' },
  { name: 'Yeşil', value: '#22c55e' },
  { name: 'Turuncu', value: '#f97316' },
  { name: 'İndigo', value: '#6366f1' },
];

const formSchema = z.object({
  title: z.string().min(2, { message: 'Başlık en az 2 karakter olmalıdır.' }),
  description: z.string().optional(),
  date: z.string().min(1, { message: 'Tarih gereklidir.' }),
  startTime: z.string().min(1, { message: 'Başlangıç saati gereklidir.' }),
  endTime: z.string().min(1, { message: 'Bitiş saati gereklidir.' }),
  eventType: z.enum(['Work', 'Private']),
  isShared: z.boolean().default(true),
  color: z.string().optional(),
});

type AddEventSheetProps = {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
};

export function AddEventSheet({ isOpen, onOpenChange }: AddEventSheetProps) {
  const { user } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: '',
      description: '',
      date: new Date().toISOString().split('T')[0],
      startTime: '09:00',
      endTime: '10:00',
      eventType: 'Private',
      isShared: true,
      color: user?.email === 'tubakodak8@gmail.com' ? '#a855f7' : '#ef4444',
    },
  });

  function onSubmit(values: z.infer<typeof formSchema>) {
    if (!user) return;

    const start = new Date(`${values.date}T${values.startTime}:00`);
    const end = new Date(`${values.date}T${values.endTime}:00`);

    const eventsRef = collection(firestore, 'users', user.uid, 'events');
    addDocumentNonBlocking(eventsRef, {
      creatorUserId: user.uid,
      title: values.title,
      description: values.description,
      startTime: start,
      endTime: end,
      eventType: values.eventType,
      isShared: values.isShared,
      color: values.color,
    });

    form.reset();
    onOpenChange(false);
    toast({ title: 'Etkinlik Eklendi', description: 'Takvime yeni etkinlik kaydedildi.' });
  }

  return (
    <Sheet open={isOpen} onOpenChange={onOpenChange}>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>Yeni Etkinlik</SheetTitle>
          <SheetDescription>Takvime iş veya özel bir plan ekleyin.</SheetDescription>
        </SheetHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 mt-6">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Başlık</FormLabel>
                  <FormControl><Input placeholder="örn. Toplantı, Sinema" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="color"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Renk</FormLabel>
                  <div className="flex flex-wrap gap-2">
                    {COLORS.map((color) => (
                      <button
                        key={color.value}
                        type="button"
                        className={cn(
                          "h-6 w-6 rounded-full border-2 transition-all",
                          field.value === color.value ? "border-foreground scale-110" : "border-transparent"
                        )}
                        style={{ backgroundColor: color.value }}
                        onClick={() => field.onChange(color.value)}
                      />
                    ))}
                  </div>
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="eventType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Kategori</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                    <SelectContent>
                      <SelectItem value="Private">Özel</SelectItem>
                      <SelectItem value="Work">İş</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="date"
                render={({ field }) => (
                  <FormItem className="col-span-2">
                    <FormLabel>Tarih</FormLabel>
                    <FormControl><Input type="date" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="startTime"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Başlangıç</FormLabel>
                    <FormControl><Input type="time" {...field} /></FormControl>
                    <FormMessage />
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
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notlar</FormLabel>
                  <FormControl><Textarea {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <SheetFooter className="pt-4">
              <Button type="submit" className="w-full">Kaydet</Button>
            </SheetFooter>
          </form>
        </Form>
      </SheetContent>
    </Sheet>
  );
}
