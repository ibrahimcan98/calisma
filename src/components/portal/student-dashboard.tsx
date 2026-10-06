'use client';

import { useState, useEffect, useMemo } from 'react';
import type React from 'react';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, collectionGroup, doc as firestoreDoc, getDocs, onSnapshot, query, setDoc, updateDoc, where, type DocumentData } from 'firebase/firestore';
import type { Homework, LessonLog, Student } from '@/lib/types';
import { BookOpen, CalendarDays, ClipboardList, GraduationCap, Loader2, MessageCircle, Palette, Settings, ShieldCheck, Star, TrendingUp, Trophy, UserRound } from 'lucide-react';

import { ProfileCard } from './student/profile-card';
import { WelcomeHeader } from './student/welcome-header';
import { TubaMessageCard } from './student/tuba-message-card';
import { NextLessonCard } from './student/next-lesson-card';
import { LessonTimeline } from './student/lesson-timeline';
import { CheckInCard } from './student/check-in-card';
import { AchievementRoadmap } from './student/achievement-roadmap';
import { NextLessonPoll, NoteToTuba, StudentVocabularyList, VocabularyWidget } from './student/student-widgets';
import { readBridgedProfile, sanitizeForFirestore, subscribeBridge } from '@/lib/student-message-bridge';
import { defaultTimeZoneForCountry } from '@/lib/time-zones';

function studentThemeStyle(theme?: string): React.CSSProperties {
  switch (theme) {
    case 'sade':
      return {
        backgroundColor: '#fdfaf6',
        backgroundImage: 'radial-gradient(circle at 20% 10%, rgba(203, 190, 168, 0.18), transparent 34%)',
      };
    case 'gece':
      return {
        backgroundColor: '#142536',
        backgroundImage: 'radial-gradient(circle at 15% 10%, rgba(255, 235, 153, 0.15), transparent 28%), radial-gradient(circle at 85% 25%, rgba(119, 158, 203, 0.18), transparent 32%)',
      };
    case 'kahve':
      return {
        backgroundColor: '#fff3ee',
        backgroundImage: 'radial-gradient(circle at 18% 12%, rgba(181, 125, 91, 0.16), transparent 32%)',
      };
    case 'doğa':
    default:
      return {
        backgroundColor: '#edf6f1',
        backgroundImage: 'radial-gradient(circle at 15% 12%, rgba(107, 142, 124, 0.17), transparent 34%)',
      };
  }
}

export function StudentDashboard({ studentId }: { studentId: string }) {
  const firestore = useFirestore();
  const [student, setStudent] = useState<Student | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('Ana Sayfa');

  useEffect(() => {
    let unsubscribe: (() => void) | undefined;
    let waitingForRealtimeStudent = false;
    setLoading(true);
    setStudent(null);
    const fetchStudent = async () => {
      try {
        if (studentId.startsWith('local:')) {
          const pin = studentId.replace('local:', '');
          const remoteQuery = query(collectionGroup(firestore, 'students'), where('pin', '==', pin));
          const remoteSnapshot = await getDocs(remoteQuery);

          if (!remoteSnapshot.empty) {
            const remoteDoc = remoteSnapshot.docs[0];
            const remoteData = remoteDoc.data() as Student;
            const teacherId = remoteDoc.ref.parent.parent?.id || remoteData.userId;

            if (teacherId) {
              localStorage.setItem('student_portal_token', `student:${teacherId}:${remoteDoc.id}`);
              const studentRef = firestoreDoc(firestore, 'users', teacherId, 'students', remoteDoc.id);
              const localProfile = readBridgedProfile(remoteDoc.id, remoteData.name, pin);

              if (localProfile) {
                const {
                  studentId: _studentId,
                  studentName: _studentName,
                  pin: _pin,
                  ...profileFields
                } = localProfile;
                const profilePayload: DocumentData = sanitizeForFirestore({
                  ...profileFields,
                  updatedAt: new Date().toISOString(),
                });

                await updateDoc(studentRef, profilePayload).catch((error) => {
                  console.warn('Yerel profil ana öğrenci kaydına taşınamadı; senkron belgesi kullanılacak.', error);
                });
                await setDoc(
                  firestoreDoc(firestore, 'users', teacherId, 'students', remoteDoc.id, 'checkIns', 'profile_sync'),
                  {
                    type: 'profile_sync',
                    studentId: remoteDoc.id,
                    studentName: remoteData.name,
                    ...profilePayload,
                  },
                  { merge: true }
                ).catch((error) => console.warn('Yerel profil senkron belgesine taşınamadı.', error));
              }

              waitingForRealtimeStudent = true;
              unsubscribe = onSnapshot(studentRef, (snap) => {
                if (!snap.exists()) {
                  setLoading(false);
                  return;
                }
                setStudent(normalizeStudent(snap.data() as Student, snap.id, teacherId));
                setLoading(false);
              }, (error) => {
                console.error(error);
                setLoading(false);
              });
              return;
            }
          }

          const rawCache = typeof window !== 'undefined' ? localStorage.getItem('student_portal_students_cache') : null;
          const cachedStudents = rawCache ? JSON.parse(rawCache) as Student[] : [];
          const cachedStudent = cachedStudents.find((item) => item.pin === pin || item.id === pin);
          const bridged = readBridgedProfile(cachedStudent?.id, cachedStudent?.name, pin);

          if (cachedStudent || bridged) {
            const base = (cachedStudent || {}) as Student;
            setStudent(normalizeStudent({
              ...base,
              name: base.name || bridged?.studentName || 'Öğrenci',
              pin: base.pin || pin,
            }, base.id || bridged?.studentId || pin, base.userId || 'dummy'));
          }
        } else if (studentId.startsWith('student:')) {
          const [, teacherId, realStudentId] = studentId.split(':');
          const studentRef = firestoreDoc(firestore, 'users', teacherId, 'students', realStudentId);
          waitingForRealtimeStudent = true;
          unsubscribe = onSnapshot(studentRef, (snap) => {
            if (!snap.exists()) {
              setLoading(false);
              return;
            }
            const data = snap.data() as Student;
            setStudent(normalizeStudent(data, snap.id, teacherId));
            setLoading(false);
          }, (error) => {
            console.error(error);
            setLoading(false);
          });
        } else {
          const q = query(collectionGroup(firestore, 'students'), where('pin', '==', studentId));
          const snap = await getDocs(q);
          if (!snap.empty) {
            const doc = snap.docs[0];
            const data = doc.data() as Student;
            const teacherId = doc.ref.parent.parent?.id || data.userId;
            setStudent(normalizeStudent(data, doc.id, teacherId));
          }
        }
      } catch (e) {
        console.error(e);
      } finally {
        if (!waitingForRealtimeStudent) setLoading(false);
      }
    };
    void fetchStudent();
    return () => unsubscribe?.();
  }, [studentId, firestore]);

  // Subscribe to instant cross-tab bridge events
  useEffect(() => {
    return subscribeBridge(() => {
      if (student) {
        const bridged = readBridgedProfile(student.id, student.name, student.pin);
        if (bridged) {
          setStudent((current) => current ? normalizeStudent({
            ...current,
            ...bridged,
            birthDate: bridged.birthDate ? new Date(bridged.birthDate) : current.birthDate,
          }, current.id, current.userId) : current);
        }
      }
    });
  }, [student?.id, student?.name, student?.pin]);

  const studentRoot = student?.userId && student?.id
    ? { userId: student.userId, studentId: student.id }
    : null;
  const lessonLogsRef = useMemoFirebase(() => {
    if (!studentRoot || studentRoot.userId === 'dummy') return null;
    return query(
      collection(firestore, 'users', studentRoot.userId, 'lessonLogs'),
      where('studentId', '==', studentRoot.studentId),
    );
  }, [firestore, studentRoot?.userId, studentRoot?.studentId]);
  const { data: rawLessonLogs } = useCollection<Omit<LessonLog, 'id'>>(lessonLogsRef);
  const lessons = useMemo(() => (rawLessonLogs || [])
    .filter((lesson) => lesson.studentId === studentRoot?.studentId && lesson.status !== 'cancelled')
    .map((lesson) => ({ ...lesson, date: normalizeFirestoreDate(lesson.date) }))
    .sort((a, b) => a.date.getTime() - b.date.getTime()), [rawLessonLogs, studentRoot?.studentId]);
  const nextLesson = useMemo(
    () => lessons.find((lesson) => lesson.status !== 'completed' && lesson.date >= new Date()) || null,
    [lessons]
  );

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

  const renderTabContent = () => {
    if (activeTab === 'Derslerim') {
      return (
        <StudentModuleShell
          icon={CalendarDays}
          title="Derslerim"
          description="Geçmiş ve gelecek derslerini buradan takip et."
        >
          <LessonTimeline lessons={lessons} timeZone={student.timeZone || defaultTimeZoneForCountry(student.country)} />
          <LessonHistory lessons={lessons} timeZone={student.timeZone || defaultTimeZoneForCountry(student.country)} />
        </StudentModuleShell>
      );
    }

    if (activeTab === 'Kelimelerim') {
      return (
        <StudentModuleShell
          icon={BookOpen}
          title="Kelimelerim"
          description="Kaydettiğin kelimeleri tekrar et ve örnek cümlelerini yaz."
        >
          <button type="button" onClick={() => setActiveTab('Ana Sayfa')} className="mb-4 w-fit rounded-xl border border-[#dbe7df] bg-white px-4 py-2 text-sm font-semibold text-[#3b5e4d] hover:bg-[#eef3f0]">← Ana sayfaya dön</button>
          <StudentVocabularyList studentRoot={studentRoot} />
        </StudentModuleShell>
      );
    }

    if (activeTab === 'Ödevlerim') {
      return (
        <StudentModuleShell icon={ClipboardList} title="Ödevlerim" description="Tuba öğretmenin tarafından paylaşılan çalışmalar.">
          <StudentHomeworkList homeworks={student.homeworks || []} />
        </StudentModuleShell>
      );
    }

    if (activeTab === 'Kazanımlarım') {
      return (
        <StudentModuleShell
          icon={Trophy}
          title="Kazanımlarım"
          description="Hedeflerinde nerede olduğunu gör."
        >
          <AchievementRoadmap studentRoot={studentRoot} fallbackAchievements={student.portalAchievements || []} />
        </StudentModuleShell>
      );
    }

    if (activeTab === 'Mesajlar') {
      return (
        <StudentModuleShell
          icon={MessageCircle}
          title="Mesajlar"
          description="Tuba öğretmeninden gelen mesajlar ve senin notların."
        >
          <TubaMessageCard student={student} studentRoot={studentRoot} />
          <NoteToTuba studentRoot={studentRoot} />
        </StudentModuleShell>
      );
    }

    if (activeTab === 'Ayarlar') {
      return (
        <StudentModuleShell
          icon={Settings}
          title="Ayarlar"
          description="Profil görünümünü ve portal tercihlerini düzenle."
        >
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <SettingInfo icon={UserRound} title="Kişisel bilgilerim" description="Ülke, doğum günü, diller ve ilgi alanlarını Burası Benim kartındaki Düzenle düğmesinden değiştirebilirsin." />
            <SettingInfo icon={Palette} title="Avatar ve görünüm" description="Avatarını ve portal temasını profil kartının altındaki seçeneklerden anında değiştirebilirsin." />
            <SettingInfo icon={GraduationCap} title="Ders bilgilerim" description="Başlangıç tarihin, seviyen, derslerin ve gelişim hedeflerin öğretmenin tarafından güncellenir." />
            <SettingInfo icon={ShieldCheck} title="Ortak ve güvenli alan" description="Profil değişikliklerin öğretmen ekranında; öğretmenin ders ve ödev güncellemeleri de burada görünür." />
          </div>
        </StudentModuleShell>
      );
    }

    return (
      <>
        <div className="grid grid-cols-1 xl:grid-cols-5 gap-6 items-stretch">
          <div className="xl:col-span-3 min-h-[300px]">
            <TubaMessageCard student={student} studentRoot={studentRoot} />
          </div>
          <div className="xl:col-span-2 min-h-[300px]">
            <NextLessonCard lesson={nextLesson} timeZone={student.timeZone || defaultTimeZoneForCountry(student.country)} />
          </div>
        </div>

        <StudentDevelopmentSummary
          strengths={student.strengths || []}
          areasToImprove={student.areasToImprove || []}
        />

        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-stretch">
          <div className="xl:col-span-4">
            <CheckInCard studentRoot={studentRoot} />
          </div>
          <div className="xl:col-span-4">
            <AchievementRoadmap studentRoot={studentRoot} fallbackAchievements={student.portalAchievements || []} />
          </div>
          <div className="xl:col-span-4 flex flex-col gap-4">
            <NextLessonPoll studentRoot={studentRoot} />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <NoteToTuba studentRoot={studentRoot} />
              <VocabularyWidget studentRoot={studentRoot} onShowAll={() => setActiveTab('Kelimelerim')} />
            </div>
          </div>
        </div>
      </>
    );
  };

  return (
    <div
      className="flex min-h-screen flex-col font-sans transition-[background-color,background-image] duration-500 lg:h-screen lg:overflow-hidden"
      style={studentThemeStyle(student.backgroundTheme)}
    >
      <div className="flex min-w-0 flex-1 flex-col lg:h-screen lg:overflow-y-auto lg:overflow-x-hidden">
        <WelcomeHeader name={student.preferredName || student.name} />
        
        <div className="mx-auto grid w-full max-w-[1540px] flex-1 grid-cols-1 gap-5 p-3 sm:gap-6 sm:p-6 xl:grid-cols-[280px_minmax(0,1fr)] xl:gap-6 xl:p-8 2xl:grid-cols-[300px_minmax(0,1fr)] 2xl:gap-8">
          {/* LEFT COLUMN: PROFILE */}
          <ProfileCard
            student={student}
            studentRoot={studentRoot}
            onStudentUpdate={(updated) => setStudent((current) => current ? { ...current, ...updated } : current)}
          />
          
          {/* RIGHT COLUMN: MAIN CONTENT */}
          <div className="flex min-w-0 flex-col gap-5 sm:gap-8">
            {renderTabContent()}
            <div className="h-12 shrink-0" />
          </div>
        </div>
      </div>
    </div>
  );
}

function SettingInfo({ icon: Icon, title, description }: { icon: React.ElementType; title: string; description: string }) {
  return (
    <section className="rounded-2xl border border-[#eef3f0] bg-white p-5">
      <div className="flex items-start gap-3">
        <span className="rounded-xl bg-[#eef5f1] p-2 text-[#6b8e7c]"><Icon className="h-5 w-5" /></span>
        <div><h3 className="font-bold text-[#2d4a3e]">{title}</h3><p className="mt-2 text-sm leading-relaxed text-slate-500">{description}</p></div>
      </div>
    </section>
  );
}

function normalizeStudent(data: Student, id: string, userId: string): Student {
  const bridged = readBridgedProfile(id, data.name, data.pin);

  const directAvatar = typeof window !== 'undefined'
    ? (localStorage.getItem(`student_portal_avatar_${id}`) ||
       (data.name ? localStorage.getItem(`student_portal_avatar_${data.name.trim().toLowerCase()}`) : null) ||
       (data.pin ? localStorage.getItem(`student_portal_avatar_${data.pin}`) : null))
    : null;

  const localAvatar = directAvatar || bridged?.avatar || data.avatar;
  const localPreferredName = bridged?.preferredName || data.preferredName || data.name;
  const localCountry = bridged?.country || data.country || 'Türkiye';
  const localBirthDate = bridged?.birthDate ? new Date(bridged.birthDate) : data.birthDate;
  const localLanguages = bridged?.languages || data.languages;
  const localInterests = bridged?.interests || data.interests;
  const localFavoriteThings = bridged?.favoriteThings ?? data.favoriteThings;
  const localHasPet = bridged?.hasPet ?? data.hasPet;
  const localPetName = bridged?.petName ?? data.petName;
  const localBackgroundTheme = bridged?.backgroundTheme || data.backgroundTheme;
  const localImprovementGoal = bridged?.improvementGoal || data.improvementGoal;

  return {
    ...data,
    ...bridged,
    id,
    userId,
    avatar: localAvatar || '/student-avatars/robot.png',
    themeColor: data.themeColor || '#6b8e7c',
    preferredName: localPreferredName,
    country: localCountry,
    birthDate: localBirthDate,
    languages: localLanguages,
    interests: localInterests,
    favoriteThings: localFavoriteThings,
    hasPet: localHasPet,
    petName: localPetName,
    backgroundTheme: localBackgroundTheme,
    improvementGoal: localImprovementGoal,
  };
}

function normalizeFirestoreDate(value: LessonLog['date']) {
  if (value instanceof Date) return value;
  const timestamp = value as unknown as { toDate?: () => Date };
  if (typeof timestamp?.toDate === 'function') return timestamp.toDate();
  return new Date(value as unknown as string);
}

function LessonHistory({ lessons, timeZone }: { lessons: LessonLog[]; timeZone: string }) {
  const now = new Date();
  const upcoming = lessons.filter((lesson) => lesson.status !== 'completed' && lesson.date >= now);
  const past = lessons.filter((lesson) => lesson.date < now).reverse();
  const groups = [{ title: 'Yaklaşan dersler', lessons: upcoming }, { title: 'Geçmiş dersler', lessons: past }];
  return (
    <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
      {groups.map((group) => (
        <section key={group.title} className="rounded-2xl border border-[#eef3f0] bg-white p-5">
          <h3 className="font-bold text-[#2d4a3e]">{group.title}</h3>
          <div className="mt-4 space-y-3">
            {group.lessons.slice(0, 8).map((lesson) => (
              <div key={lesson.id} className="flex items-center justify-between gap-4 rounded-xl bg-[#fcfbf9] p-3">
                <div><p className="text-sm font-semibold text-[#2d4a3e]">Türkçe dersi</p><p className="mt-1 text-xs capitalize text-slate-500">{lesson.date.toLocaleDateString('tr-TR', { timeZone, weekday: 'long', day: 'numeric', month: 'long' })}</p></div>
                <p className="text-xs font-bold text-[#6b8e7c]">{lesson.date.toLocaleTimeString('tr-TR', { timeZone, hour: '2-digit', minute: '2-digit' })}</p>
              </div>
            ))}
            {!group.lessons.length && <p className="rounded-xl border border-dashed border-[#dbe7df] p-5 text-center text-sm text-slate-400">Kayıt yok</p>}
          </div>
        </section>
      ))}
    </div>
  );
}

function StudentDevelopmentSummary({ strengths, areasToImprove }: { strengths: string[]; areasToImprove: string[] }) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <section className="relative overflow-hidden rounded-2xl border border-[#f4ddd2] bg-white p-6 shadow-sm">
        <Star className="absolute right-5 top-5 h-10 w-10 text-[#f8e8a7]" />
        <h3 className="mb-4 flex items-center gap-2 text-lg font-bold text-[#e89b7b]"><Star className="h-5 w-5 fill-[#f4cf55] text-[#f4cf55]" /> Güçlü Yönlerim</h3>
        <ul className="space-y-2 text-sm font-medium text-slate-600">
          {(strengths.length ? strengths : ['Öğretmenin yakında buraya güçlü yönlerini ekleyecek.']).map((item) => (
            <li key={item} className="flex items-start gap-2"><span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[#e89b7b]" />{item}</li>
          ))}
        </ul>
      </section>

      <section className="relative overflow-hidden rounded-2xl border border-[#e6ddec] bg-white p-6 shadow-sm">
        <TrendingUp className="absolute right-5 top-5 h-10 w-10 text-[#eee8f3]" />
        <h3 className="mb-4 flex items-center gap-2 text-lg font-bold text-[#a58bbb]"><TrendingUp className="h-5 w-5" /> Birlikte Güçlendirdiğimiz Alanlar</h3>
        <ul className="space-y-2 text-sm font-medium text-slate-600">
          {(areasToImprove.length ? areasToImprove : ['Yeni gelişim hedeflerin burada görünecek.']).map((item) => (
            <li key={item} className="flex items-start gap-2"><span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[#b098c4]" />{item}</li>
          ))}
        </ul>
      </section>
    </div>
  );
}

function StudentHomeworkList({ homeworks }: { homeworks: Homework[] }) {
  const sortedHomeworks = [...homeworks].sort((a, b) => (a.dueDate || '9999').localeCompare(b.dueDate || '9999'));
  return (
    <div className="space-y-4">
      {sortedHomeworks.map((homework) => (
        <article key={homework.id} className="rounded-2xl border border-[#eef3f0] bg-white p-5 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2"><h3 className={`font-bold ${homework.status === 'completed' ? 'text-slate-400 line-through' : 'text-[#2d4a3e]'}`}>{homework.title}</h3><span className={`rounded-full px-2 py-1 text-[10px] font-bold ${homework.status === 'completed' ? 'bg-[#eef3f0] text-[#6b8e7c]' : 'bg-[#fff9eb] text-amber-700'}`}>{homework.status === 'completed' ? 'Tamamlandı' : 'Yapılacak'}</span></div>
              <p className="mt-2 text-sm leading-relaxed text-slate-500">{homework.description || 'Bu ödev için ek açıklama bulunmuyor.'}</p>
            </div>
            {homework.dueDate && <div className="rounded-xl bg-[#f8f4fb] px-3 py-2 text-right"><p className="text-[10px] text-[#9d84b2]">Teslim tarihi</p><p className="text-xs font-bold text-[#725d82]">{new Date(`${homework.dueDate}T00:00:00`).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' })}</p></div>}
          </div>
        </article>
      ))}
      {!sortedHomeworks.length && <div className="rounded-2xl border border-dashed border-[#dbe7df] bg-white p-10 text-center"><ClipboardList className="mx-auto mb-3 h-9 w-9 text-[#bfd4c7]" /><p className="font-semibold text-[#2d4a3e]">Henüz ödevin yok</p><p className="mt-1 text-sm text-slate-500">Yeni bir çalışma paylaşıldığında burada göreceksin.</p></div>}
    </div>
  );
}

function StudentModuleShell({
  icon: Icon,
  title,
  description,
  children,
}: {
  icon: React.ElementType;
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-[#eef3f0] bg-[#fcfbf9] p-4 shadow-sm sm:rounded-3xl sm:p-6">
      <div className="flex items-start justify-between gap-4 mb-6">
        <div>
          <h2 className="flex items-center gap-2 text-xl font-black text-[#2d4a3e] sm:text-2xl">
            <Icon className="h-6 w-6 text-[#6b8e7c]" /> {title}
          </h2>
          <p className="text-sm text-slate-500 mt-1">{description}</p>
        </div>
      </div>
      <div className="space-y-6">{children}</div>
    </div>
  );
}
