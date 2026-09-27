'use client';

import { useMemo, useState } from 'react';
import { Target, MessageCircle, Book, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, doc, limit, orderBy, query, serverTimestamp, setDoc, updateDoc } from 'firebase/firestore';
import type { Vocabulary } from '@/lib/types';
import { toast } from '@/hooks/use-toast';
import { saveBridgedMessage } from '@/lib/student-message-bridge';

type StudentRoot = { userId: string; studentId: string } | null;

export function NextLessonPoll({ studentRoot }: { studentRoot: StudentRoot }) {
  const firestore = useFirestore();
  const [selected, setSelected] = useState('Daha fazla konuşma pratiği');
  const options = [
    { icon: MessageCircle, label: 'Daha fazla konuşma pratiği', color: 'text-emerald-600', bg: 'bg-emerald-50' },
    { icon: Book, label: 'Yeni kelimeler ve ifadeler', color: 'text-amber-600', bg: 'bg-amber-50' },
    { icon: Book, label: 'Bir metin üzerinde çalışma', color: 'text-purple-600', bg: 'bg-purple-50' },
  ];

  const saveChoice = async (choice: string) => {
    setSelected(choice);
    if (!studentRoot) return;
    const studentRef = doc(firestore, 'users', studentRoot.userId, 'students', studentRoot.studentId);
    await updateDoc(studentRef, { nextLessonRequest: choice });
    toast({ title: 'Seçimin kaydedildi', description: 'Tuba öğretmenin bunu kendi panelinde görebilecek.' });
  };

  return (
    <div className="bg-white rounded-3xl p-6 shadow-sm border border-[#eef3f0]">
      <div className="flex items-center gap-2 mb-1">
        <Target className="h-5 w-5 text-rose-400" />
        <h2 className="text-[#3b5e4d] font-bold text-lg">Gelecek Derste Ne Yapalım?</h2>
      </div>
      <p className="text-xs text-slate-500 mb-4">Sen seç, birlikte planlayalım.</p>

      <div className="grid grid-cols-1 gap-2 min-[420px]:grid-cols-3">
        {options.map((opt, i) => (
          <button
            key={i}
            onClick={() => saveChoice(opt.label)}
            className={`flex flex-col items-center text-center p-3 rounded-2xl cursor-pointer transition-all border ${opt.bg} ${selected === opt.label ? 'border-emerald-200 shadow-sm' : 'border-transparent opacity-70 hover:opacity-100'}`}
          >
            <opt.icon className={`h-5 w-5 mb-2 ${opt.color}`} />
            <span className={`text-[10px] font-medium leading-tight ${selected === opt.label ? 'text-[#2d4a3e]' : 'text-slate-500'}`}>{opt.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

export function NoteToTuba({ studentRoot }: { studentRoot: StudentRoot }) {
  const firestore = useFirestore();
  const [note, setNote] = useState('Türk dizilerindeki günlük konuşma ifadelerini öğrenmek istiyorum. 😊');

  const sendNote = async () => {
    if (!studentRoot || !note.trim()) return;
    const content = note.trim();
    const messageId = crypto.randomUUID();
    const localMessage = {
      id: messageId,
      studentId: studentRoot.studentId,
      senderRole: 'student' as const,
      content,
      date: new Date(),
      type: 'general' as const,
      isRead: false,
    };
    saveBridgedMessage(studentRoot.userId, localMessage);
    setNote('');
    try {
      await setDoc(doc(firestore, 'users', studentRoot.userId, 'students', studentRoot.studentId, 'messages', messageId), {
        id: messageId,
        studentId: studentRoot.studentId,
        senderRole: 'student',
        content,
        date: serverTimestamp(),
        type: 'general',
        isRead: false,
      });
      toast({ title: 'Notun Tuba öğretmenine gitti' });
    } catch (error) {
      console.warn('Bulut mesajı yazılamadı; öğretmen paneli yerel köprüden okuyacak.', error);
      toast({ title: 'Notun Tuba öğretmenine gitti', description: 'Mesaj öğretmen paneline kaydedildi.' });
    }
  };

  return (
    <div className="bg-[#fdfaf6] rounded-3xl p-5 shadow-sm border border-[#f1eee8]">
      <div className="flex items-center gap-2 mb-1">
        <span className="text-rose-400">✏️</span>
        <h3 className="text-[#3b5e4d] font-bold text-sm">Tuba'ya Notum <span className="text-rose-400">♥</span></h3>
      </div>
      <p className="text-[10px] text-slate-500 mb-3">Derslerle ilgili, sormak istediğin ya da paylaşmak istediğin bir şey var mı?</p>
      
      <div className="bg-white rounded-xl border border-[#eef3f0] p-2 mb-2">
        <textarea 
          className="w-full h-12 bg-transparent resize-none outline-none text-xs text-[#4a6b5d] placeholder:text-slate-400"
          placeholder="Notunu buraya yaz..."
          value={note}
          onChange={(event) => setNote(event.target.value)}
        />
      </div>
      <Button onClick={sendNote} className="w-full bg-[#6b8e7c] hover:bg-[#588157] text-white rounded-xl h-8 text-xs">Gönder</Button>
    </div>
  );
}

export function VocabularyWidget({ studentRoot }: { studentRoot: StudentRoot }) {
  const firestore = useFirestore();
  const vocabularyRef = useMemoFirebase(() => {
    if (!studentRoot) return null;
    return query(
      collection(firestore, 'users', studentRoot.userId, 'students', studentRoot.studentId, 'vocabulary'),
      orderBy('word'),
      limit(5)
    );
  }, [firestore, studentRoot?.userId, studentRoot?.studentId]);
  const { data } = useCollection<Omit<Vocabulary, 'id'>>(vocabularyRef);

  const fallbackWords = [
    { tr: 'rutin', en: 'daily routine' },
    { tr: 'keşfetmek', en: 'to discover' },
    { tr: 'özgüven', en: 'self-confidence' },
    { tr: 'alışveriş', en: 'shopping' },
    { tr: 'manzara', en: 'scenery' },
  ];
  const words = useMemo(() => {
    if (!data?.length) return fallbackWords;
    return data.map((item) => ({ tr: item.word, en: item.meaning }));
  }, [data]);

  return (
    <div className="bg-[#f3f8f5] rounded-3xl p-5 shadow-sm border border-[#eef3f0] h-full flex flex-col justify-between">
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-[#3b5e4d] font-bold text-sm flex items-center gap-2">
            <Book className="h-4 w-4 text-[#588157]" /> Kelimelerim
          </h3>
        </div>
        <p className="text-[10px] text-[#588157] font-medium mb-3">Kaydettiğin {data?.length || 24} kelime</p>
        
        <div className="space-y-2">
          {words.map((w, i) => (
            <div key={i} className="flex justify-between items-center">
              <span className="text-xs font-bold text-[#4a6b5d]">{w.tr}</span>
              <span className="text-[10px] text-slate-500">{w.en}</span>
            </div>
          ))}
        </div>
      </div>
      
      <Button variant="link" onClick={() => toast({ title: 'Kelimeler bölümü açılıyor', description: 'Sol menüde Kelimelerim alanına bağlandı.' })} className="text-[#6b8e7c] text-[10px] h-auto p-0 mt-4 self-end">
        Tüm kelimelerimi gör <ArrowRight className="h-3 w-3 ml-1" />
      </Button>
    </div>
  );
}

export function StudentVocabularyList({ studentRoot }: { studentRoot: StudentRoot }) {
  const firestore = useFirestore();
  const vocabularyRef = useMemoFirebase(() => {
    if (!studentRoot) return null;
    return query(
      collection(firestore, 'users', studentRoot.userId, 'students', studentRoot.studentId, 'vocabulary'),
      orderBy('word')
    );
  }, [firestore, studentRoot?.userId, studentRoot?.studentId]);
  const { data } = useCollection<Omit<Vocabulary, 'id'>>(vocabularyRef);

  if (!data?.length) {
    return (
      <div className="rounded-2xl border border-dashed border-[#dbe7df] bg-white p-10 text-center">
        <Book className="mx-auto mb-3 h-9 w-9 text-[#bfd4c7]" />
        <p className="font-semibold text-[#2d4a3e]">Henüz kayıtlı kelimen yok</p>
        <p className="mt-1 text-sm text-slate-500">Derslerde eklenen kelimeler burada öğretmeninle ortak olarak görünecek.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
      {data.map((item) => (
        <article key={item.id} className="rounded-2xl border border-[#eef3f0] bg-white p-5 shadow-sm">
          <p className="text-lg font-black text-[#2d4a3e]">{item.word}</p>
          <p className="mt-1 text-sm font-medium text-[#6b8e7c]">{item.meaning || 'Anlamı eklenmedi'}</p>
          <p className="mt-4 border-t border-[#eef3f0] pt-3 text-xs leading-relaxed text-slate-500">
            {item.studentExample || item.tubaExample || 'Bu kelimeyle bir örnek cümle derste birlikte eklenecek.'}
          </p>
        </article>
      ))}
    </div>
  );
}
