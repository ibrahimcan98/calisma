'use client';

import { useState } from 'react';
import { Heart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useFirestore } from '@/firebase';
import { doc, increment, serverTimestamp, setDoc, updateDoc } from 'firebase/firestore';
import { toast } from '@/hooks/use-toast';
import type { CheckIn } from '@/lib/types';
import { saveBridgedCheckIn } from '@/lib/student-message-bridge';

type StudentRoot = { userId: string; studentId: string } | null;

export function CheckInCard({ studentRoot }: { studentRoot: StudentRoot }) {
  const firestore = useFirestore();
  const [selectedMood, setSelectedMood] = useState<CheckIn['mood']>('Fena değil');
  const [note, setNote] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const moods = [
    { label: 'Harika', emoji: '😄', color: 'text-green-500' },
    { label: 'İyi', emoji: '🙂', color: 'text-emerald-400' },
    { label: 'Fena değil', emoji: '😐', color: 'text-orange-400' },
    { label: 'Biraz zor', emoji: '😕', color: 'text-blue-400' },
    { label: 'Kötü', emoji: '😞', color: 'text-indigo-400' },
  ];

  const saveCheckIn = async () => {
    if (!studentRoot || isSaving) return;
    const checkInId = crypto.randomUUID();
    const checkIn: CheckIn = {
      id: checkInId,
      studentId: studentRoot.studentId,
      mood: selectedMood,
      note: note.trim(),
      date: new Date(),
      isRead: false,
    };
    setIsSaving(true);
    setSaveError('');
    try {
      if (studentRoot.userId !== 'dummy') {
        try {
          await setDoc(doc(firestore, 'users', studentRoot.userId, 'students', studentRoot.studentId, 'checkIns', checkInId), {
            ...checkIn,
            date: serverTimestamp(),
          });
          await updateDoc(doc(firestore, 'users', studentRoot.userId, 'students', studentRoot.studentId), {
            pendingTeacherUpdates: increment(1),
            lastStudentUpdate: 'Yeni bir duygu paylaşımı yaptı',
          });
        } catch (error) {
          console.warn('Duygu paylaşımı Firebase kaydına yazılamadı; yerel bağlantı kullanılacak.', error);
        }
      }
      saveBridgedCheckIn(studentRoot.userId, checkIn);
      setNote('');
      toast({ title: 'Duygun kaydedildi', description: 'Tuba öğretmenin panelinde görebilecek.' });
    } catch (error) {
      console.error(error);
      setSaveError('Duygun kaydedilemedi. Lütfen tekrar dene.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="flex h-full flex-col rounded-2xl border border-[#eef3f0] bg-white p-4 shadow-sm sm:rounded-3xl sm:p-6">
      <div className="flex items-center gap-2 mb-2">
        <Heart className="h-5 w-5 fill-[#e89b7b] text-[#e89b7b]" />
        <h2 className="text-[#3b5e4d] font-bold text-lg">Bu Hafta Nasılsın?</h2>
      </div>
      <p className="text-xs text-slate-500 mb-4">Duygularını bizimle paylaş.</p>

      <div className="touch-scroll mb-4 flex gap-3 overflow-x-auto pb-2 sm:justify-between sm:overflow-visible">
        {moods.map((m, i) => (
          <button key={i} type="button" onClick={() => setSelectedMood(m.label as CheckIn['mood'])} className="flex flex-col items-center gap-1 cursor-pointer">
            <div className={`flex h-11 w-11 items-center justify-center rounded-full border-2 text-xl transition-all sm:h-12 sm:w-12 sm:text-2xl ${
              selectedMood === m.label ? 'border-[#e89b7b] bg-[#fff5f2]' : 'border-transparent bg-[#fdfaf6] opacity-70 hover:opacity-100 hover:bg-[#eef3f0]'
            }`}>
              {m.emoji}
            </div>
            <span className={`text-[10px] font-medium ${selectedMood === m.label ? 'text-[#e89b7b]' : 'text-slate-500'}`}>{m.label}</span>
          </button>
        ))}
      </div>

      <div className="flex-1 bg-[#fdfaf6] border border-[#f1eee8] rounded-xl p-3 mb-3 relative">
        <textarea 
          className="w-full h-full bg-transparent resize-none outline-none text-sm text-[#4a6b5d] placeholder:text-slate-400"
          placeholder="Bu hafta nasıl hissettiğini buraya yaz..."
          value={note}
          onChange={(event) => setNote(event.target.value.slice(0, 300))}
        />
        <span className="absolute bottom-2 right-2 text-[10px] text-slate-400">{note.length}/300</span>
      </div>

      <div className="flex justify-between items-end">
        <div>
          <Button onClick={() => void saveCheckIn()} disabled={isSaving || !note.trim()} className="bg-[#4a6b5d] hover:bg-[#3b5e4d] text-white rounded-xl px-8 h-9 text-sm">
            {isSaving ? 'Kaydediliyor...' : 'Kaydet'}
          </Button>
          {saveError && <p className="mt-2 max-w-48 text-xs font-medium text-red-500">{saveError}</p>}
        </div>
        <div className="text-right">
          <p className="text-[#e89b7b] font-serif italic text-sm -rotate-6">Duyguların<br/>önemli ♥</p>
        </div>
      </div>
    </div>
  );
}
