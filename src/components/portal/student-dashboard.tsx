'use client';

import { useState, useEffect } from 'react';
import { useFirestore } from '@/firebase';
import { collectionGroup, query, where, getDocs } from 'firebase/firestore';
import type { Student } from '@/lib/types';
import { Loader2 } from 'lucide-react';

import { LeftMenu } from './student/left-menu';
import { ProfileCard } from './student/profile-card';
import { WelcomeHeader } from './student/welcome-header';
import { TubaMessageCard } from './student/tuba-message-card';
import { NextLessonCard } from './student/next-lesson-card';
import { LessonTimeline } from './student/lesson-timeline';
import { CheckInCard } from './student/check-in-card';
import { AchievementRoadmap } from './student/achievement-roadmap';
import { NextLessonPoll, NoteToTuba, VocabularyWidget } from './student/student-widgets';

export function StudentDashboard({ studentId }: { studentId: string }) {
  const firestore = useFirestore();
  const [student, setStudent] = useState<Student | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('Ana Sayfa');

  useEffect(() => {
    const fetchStudent = async () => {
      if (studentId === '1234') {
        setStudent({
          id: 'dummy', userId: 'dummy', name: 'Ada', preferredName: 'Ada', 
          themeColor: '#6b8e7c', backgroundTheme: 'doğa', balance: 0, lessonPrice: 0, createdAt: new Date(),
          avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Ada'
        });
        setLoading(false);
        return;
      }

      try {
        const q = query(collectionGroup(firestore, 'students'), where('pin', '==', studentId));
        const snap = await getDocs(q);
        if (!snap.empty) {
          const doc = snap.docs[0];
          const data = doc.data() as Student;
          setStudent({
            ...data,
            id: doc.id,
            avatar: data.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${data.name}`,
            themeColor: data.themeColor || '#6b8e7c',
            preferredName: data.preferredName || data.name
          });
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    fetchStudent();
  }, [studentId, firestore]);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#fdfaf6]">
        <Loader2 className="h-8 w-8 animate-spin text-[#6b8e7c]" />
      </div>
    );
  }

  if (!student) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#fdfaf6]">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-[#2d4a3e]">Öğrenci bulunamadı.</h2>
          <p className="text-slate-500 mt-2">Lütfen girdiğiniz PIN kodunu kontrol edin.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-white font-sans overflow-hidden">
      <LeftMenu activeTab={activeTab} setActiveTab={setActiveTab} />
      
      <div className="flex-1 flex flex-col h-screen overflow-y-auto overflow-x-hidden">
        <WelcomeHeader name={student.preferredName || student.name} />
        
        <div className="flex flex-1 p-8 gap-8 max-w-[1400px] mx-auto w-full">
          {/* LEFT COLUMN: PROFILE */}
          <ProfileCard student={student} />
          
          {/* RIGHT COLUMN: MAIN CONTENT */}
          <div className="flex-1 flex flex-col gap-8 min-w-[700px]">
            {/* TOP ROW: Message & Next Lesson */}
            <div className="grid grid-cols-5 gap-6 h-[260px]">
              <div className="col-span-3 h-full">
                <TubaMessageCard />
              </div>
              <div className="col-span-2 h-full">
                <NextLessonCard />
              </div>
            </div>

            {/* MIDDLE ROW: Timeline */}
            <LessonTimeline />

            {/* BOTTOM ROW: Check-in, Roadmap, Widgets */}
            <div className="grid grid-cols-12 gap-6 items-stretch">
              <div className="col-span-4 h-full">
                <CheckInCard />
              </div>
              <div className="col-span-4 h-full">
                <AchievementRoadmap />
              </div>
              <div className="col-span-4 flex flex-col gap-4 h-full">
                <NextLessonPoll />
                <div className="flex-1 grid grid-cols-2 gap-4">
                  <NoteToTuba />
                  <VocabularyWidget />
                </div>
              </div>
            </div>
            
            <div className="h-12 shrink-0" /> {/* Bottom Padding */}
          </div>
        </div>
      </div>
    </div>
  );
}
