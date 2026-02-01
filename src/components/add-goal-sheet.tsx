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
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import type { Goal } from '@/lib/types';

const formSchema = z.object({
  name: z.string().min(2, {
    message: 'Hedef adı en az 2 karakter olmalıdır.',
  }),
  targetAmount: z.coerce.number().positive({ message: 'Hedef tutarı pozitif olmalıdır.' }),
});

type AddGoalSheetProps = {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onAddGoal: (goal: Omit<Goal, 'id' | 'userId' | 'currentAmount' | 'createdAt'>) => void;
};

export function AddGoalSheet({
  isOpen,
  onOpenChange,
  onAddGoal,
}: AddGoalSheetProps) {
  const { toast } = useToast();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      targetAmount: '' as any,
    },
  });

  function onSubmit(values: z.infer<typeof formSchema>) {
    onAddGoal(values);
    form.reset();
    onOpenChange(false);
    toast({
      title: 'Hedef Eklendi!',
      description: `${values.name} hedefiniz başarıyla oluşturuldu.`,
    });
  }

  return (
    <Sheet open={isOpen} onOpenChange={onOpenChange}>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>Yeni Birikim Hedefi Ekle</SheetTitle>
          <SheetDescription>
            Ulaşmak istediğiniz hedef ve biriktirmeniz gereken tutarı girin.
          </SheetDescription>
        </SheetHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8 mt-8">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Hedef Adı</FormLabel>
                  <FormControl>
                    <Input placeholder="örn. Yeni Araba" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="targetAmount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Hedef Tutar</FormLabel>
                  <FormControl>
                    <Input type="number" placeholder="100000" {...field} value={field.value ?? ''} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <SheetFooter className="pt-4">
                <SheetClose asChild>
                  <Button type="button" variant="outline">İptal</Button>
                </SheetClose>
                <Button type="submit">Hedefi Ekle</Button>
            </SheetFooter>
          </form>
        </Form>
      </SheetContent>
    </Sheet>
  );
}
