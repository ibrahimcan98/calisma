'use client';

import { BarChart2, CheckCircle2, Circle, Target } from 'lucide-react';
import { collection } from 'firebase/firestore';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import type { Achievement } from '@/lib/types';

type StudentRoot = { userId: string; studentId: string } | null;

const statusProgress: Record<Achievement['status'], number> = {
  'Henüz başlamadık': 0,
  'Üzerinde çalışıyoruz': 40,
  'Neredeyse tamam': 80,
  'Başardım': 100,
};

export function AchievementRoadmap({
  studentRoot,
  fallbackAchievements = [],
}: {
  studentRoot: StudentRoot;
  fallbackAchievements?: Achievement[];
}) {
  const firestore = useFirestore();
  const achievementsRef = useMemoFirebase(() => {
    if (!studentRoot || studentRoot.userId === 'dummy') return null;
    return collection(firestore, 'users', studentRoot.userId, 'students', studentRoot.studentId, 'achievements');
  }, [firestore, studentRoot?.userId, studentRoot?.studentId]);
  const { data: storedAchievements } = useCollection<Omit<Achievement, 'id'>>(achievementsRef);
  const achievements = [...(storedAchievements || []), ...fallbackAchievements]
    .filter((achievement, index, list) => list.findIndex((item) => item.id === achievement.id) === index);
  const completed = achievements.filter((achievement) => (
    (achievement.progress ?? statusProgress[achievement.status]) >= 100
  )).length;

  return (
    <div className="relative flex h-full flex-col overflow-hidden rounded-2xl border border-[#eef3f0] bg-white p-4 shadow-sm sm:rounded-3xl sm:p-6">
      <div className="mb-5 flex flex-col items-start justify-between gap-3 sm:flex-row sm:gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1"><BarChart2 className="h-5 w-5 text-[#588157]" /><h2 className="text-[#3b5e4d] font-bold text-lg">Kazanım Yolculuğum</h2></div>
          <p className="text-xs text-slate-500">Hangi hedefe başladığını ve şu anda neyin üzerinde çalıştığını takip et.</p>
        </div>
        <div className="shrink-0 rounded-xl bg-[#eef3f0] px-3 py-2 text-center"><p className="text-[10px] text-[#6b8e7c]">Tamamlanan</p><p className="font-black text-[#2d4a3e]">{completed}/{achievements.length}</p></div>
      </div>

      <div className="flex flex-col gap-3 flex-1">
        {achievements.map((achievement) => {
          const progress = Math.max(0, Math.min(100, achievement.progress ?? statusProgress[achievement.status]));
          return (
            <article key={achievement.id} className="rounded-2xl border border-[#eef3f0] bg-[#fcfbf9] p-4">
              <div className="flex items-start gap-3">
                {achievement.status === 'Başardım' ? <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-[#588157]" /> : achievement.status === 'Henüz başlamadık' ? <Circle className="mt-0.5 h-5 w-5 shrink-0 text-slate-300" /> : <Target className="mt-0.5 h-5 w-5 shrink-0 text-[#e89b7b]" />}
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center justify-between gap-2"><h3 className="text-sm font-bold text-[#2d4a3e]">{achievement.title}</h3><span className="rounded-full bg-white px-2 py-1 text-[9px] font-bold text-[#6b8e7c]">{achievement.category}</span></div>
                  <p className="mt-1 text-xs leading-relaxed text-slate-500">{achievement.description || 'Öğretmenin bu hedefin detayını yakında ekleyecek.'}</p>
                  <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3"><div className="h-2 flex-1 overflow-hidden rounded-full bg-[#eeeae4]"><div className="h-full rounded-full bg-[#6b8e7c] transition-all" style={{ width: `${progress}%` }} /></div><span className="text-left text-[10px] font-semibold text-[#6b8e7c] sm:w-32 sm:text-right">%{progress} · {achievement.status}</span></div>
                </div>
              </div>
            </article>
          );
        })}
        {!achievements.length && <div className="flex min-h-40 flex-1 flex-col items-center justify-center rounded-2xl border border-dashed border-[#dbe7df] p-5 text-center"><Target className="mb-2 h-7 w-7 text-[#bfd4c7]" /><p className="text-sm font-semibold text-[#2d4a3e]">Henüz kazanım eklenmedi</p><p className="mt-1 text-xs text-slate-500">Öğretmenin yeni bir hedef paylaştığında burada göreceksin.</p></div>}
      </div>
    </div>
  );
}
