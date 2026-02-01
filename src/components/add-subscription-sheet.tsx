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
  SheetClose,
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
import { useToast } from '@/hooks/use-toast';
import type { Subscription, Category } from '@/lib/types';
import { startOfDay } from 'date-fns';

const formSchema = z.object({
  name: z.string().min(2, { message: 'Abonelik adı en az 2 karakter olmalıdır.' }),
  amount: z.coerce.number().positive({ message: 'Tutar pozitif olmalıdır.' }),
  category: z.string().min(1, { message: 'Lütfen bir kategori seçin.' }),
  frequency: z.enum(['monthly', 'yearly'], { required_error: 'Lütfen bir sıklık seçin.' }),
  startDate: z.string().min(1, { message: 'Bir başlangıç tarihi gereklidir.' }),
});

type AddSubscriptionSheetProps = {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  categories: Category[];
  onAddSubscription: (subscription: Omit<Subscription, 'id' | 'userId'>) => void;
};

export function AddSubscriptionSheet({
  isOpen,
  onOpenChange,
  categories,
  onAddSubscription,
}: AddSubscriptionSheetProps) {
  const { toast } = useToast();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      amount: '' as any,
      category: 'entertainment',
      frequency: 'monthly',
      startDate: new Date().toISOString().split('T')[0],
    },
  });

  function onSubmit(values: z.infer<typeof formSchema>) {
    const localDate = new Date(`${values.startDate}T00:00:00`);
    
    onAddSubscription({
      ...values,
      startDate: startOfDay(localDate),
    });
    form.reset();
    onOpenChange(false);
    toast({
      title: 'Abonelik Eklendi!',
      description: `${values.name} aboneliğiniz başarıyla oluşturuldu.`,
    });
  }

  return (
    <Sheet open={isOpen} onOpenChange={onOpenChange}>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>Yeni Abonelik Ekle</SheetTitle>
          <SheetDescription>
            Tekrarlayan abonelik veya düzenli ödeme bilgilerinizi girin.
          </SheetDescription>
        </SheetHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8 mt-8">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Abonelik Adı</FormLabel>
                  <FormControl>
                    <Input placeholder="örn. Netflix, Spotify" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="amount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Aylık/Yıllık Tutar</FormLabel>
                  <FormControl>
                    <Input type="number" placeholder="99.99" {...field} value={field.value ?? ''} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="category"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Kategori</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Bir kategori seçin" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {categories.filter(c => c.value !== 'salary').map((cat) => (
                        <SelectItem key={cat.value} value={cat.value}>
                           <div className="flex items-center gap-2">
                              <cat.icon className="h-4 w-4" />
                              {cat.label}
                            </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="frequency"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Ödeme Sıklığı</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Ödeme sıklığını seçin" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="monthly">Aylık</SelectItem>
                      <SelectItem value="yearly">Yıllık</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="startDate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Başlangıç / Sonraki Ödeme Tarihi</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <SheetFooter className="pt-4">
                <SheetClose asChild>
                  <Button type="button" variant="outline">İptal</Button>
                </SheetClose>
                <Button type="submit">Aboneliği Ekle</Button>
            </SheetFooter>
          </form>
        </Form>
      </SheetContent>
    </Sheet>
  );
}
