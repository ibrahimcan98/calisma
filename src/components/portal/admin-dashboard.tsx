'use client';

import { useEffect, useState, useMemo, useRef } from 'react';
import { 
  Home, CalendarDays, BookOpen, FileText, MessageSquare, 
  StickyNote, BarChart2, Settings, Search, Plus, Calendar as CalendarIcon,
  Send, MoreHorizontal, ChevronRight, ChevronLeft, LogOut, Trash2, Pencil, Sparkles, Check
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useAuth, useUser, useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { addDoc, arrayUnion, collection, deleteDoc, doc, limit, onSnapshot, orderBy, query, serverTimestamp, setDoc, Timestamp, updateDoc } from 'firebase/firestore';
import type { Achievement, CheckIn, Homework, LessonLog, Message, Student } from '@/lib/types';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { firebaseConfig } from '@/firebase/config';
import { 
  readBridgedCheckIns, 
  readBridgedMessages, 
  readBridgedReactions, 
  saveBridgedMessage, 
  saveBridgedProfile, 
  readBridgedProfile, 
  subscribeBridge, 
  sanitizeForFirestore, 
  STUDENT_BRIDGE_EVENT 
} from '@/lib/student-message-bridge';
import { Slider } from '@/components/ui/slider';
import { toast } from '@/hooks/use-toast';
import { addDaysToDateInput, defaultTimeZoneForCountry, STUDENT_TIME_ZONES, TEACHER_TIME_ZONE, timeZoneLabel, zonedDateTimeToUtc } from '@/lib/time-zones';

const monthFormatter = new Intl.DateTimeFormat('tr-TR', { month: 'long', year: 'numeric' });
const lessonDateFormatter = new Intl.DateTimeFormat('tr-TR', { timeZone: TEACHER_TIME_ZONE, day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' });
const achievementStatuses: Achievement['status'][] = ['Henüz başlamadık', 'Üzerinde çalışıyoruz', 'Neredeyse tamam', 'Başardım'];
const achievementCategories: Achievement['category'][] = ['Konuşma', 'Dinleme', 'Okuma', 'Yazma', 'Kelime Bilgisi', 'Dil Bilgisi', 'Diğer'];

function progressToAchievementStatus(progress: number): Achievement['status'] {
  if (progress <= 0) return 'Henüz başlamadık';
  if (progress < 70) return 'Üzerinde çalışıyoruz';
  if (progress < 100) return 'Neredeyse tamam';
  return 'Başardım';
}
const studentsToRestore = ['Beliz', 'Lila', 'Ozan', 'Selen', 'Leo', 'Ozan UK', 'Leyla', 'Layla', 'Ali', 'Batu', 'Mila', 'Ata'];

function toDate(value: unknown) {
  if (value instanceof Date) return value;
  if (value && typeof value === 'object' && 'toDate' in value && typeof value.toDate === 'function') {
    return value.toDate();
  }
  return new Date(value as string | number);
}

function startOfToday() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return today;
}

function formatMessageTime(value: unknown) {
  const date = toDate(value);
  if (Number.isNaN(date.getTime())) return '';
  return new Intl.DateTimeFormat('tr-TR', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

const reactionEmojiMap: Record<string, string> = {
  'Çok mutlu': '💛',
  'Motive oldum': '🤩',
  'Özel hissettim': '🥺',
  'Teşekkür ederim': '👍',
};

function formatReactionText(reaction: string | undefined): string {
  if (!reaction) return '';
  const emoji = reactionEmojiMap[reaction];
  if (emoji && !reaction.includes(emoji)) {
    return `${emoji} ${reaction}`;
  }
  return reaction;
}

function formatMessageDateBadge(dateValue: unknown): string {
  if (!dateValue) return 'Bugün';
  const d = toDate(dateValue);
  if (Number.isNaN(d.getTime())) return 'Bugün';

  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const msgDate = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const diffDays = Math.round((today.getTime() - msgDate.getTime()) / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return 'Bugün';
  if (diffDays === 1) return 'Dün';

  const isThisYear = d.getFullYear() === now.getFullYear();
  return new Intl.DateTimeFormat('tr-TR', {
    day: 'numeric',
    month: 'short',
    ...(isThisYear ? {} : { year: 'numeric' }),
  }).format(d);
}

function deduplicateMessages(messages: Message[]): Message[] {
  const result: Message[] = [];
  for (const msg of messages) {
    if (!msg || !msg.content) continue;
    const existingIndex = result.findIndex((existing) => {
      if (existing.id === msg.id) return true;
      const sameSender = existing.senderRole === msg.senderRole;
      const sameContent = existing.content.trim() === msg.content.trim();
      const timeDiff = Math.abs(toDate(existing.date).getTime() - toDate(msg.date).getTime());
      return sameSender && sameContent && timeDiff < 10 * 60 * 1000;
    });

    if (existingIndex >= 0) {
      const existing = result[existingIndex];
      result[existingIndex] = {
        ...existing,
        ...msg,
        emojiReaction: existing.emojiReaction || msg.emojiReaction,
        isRead: existing.isRead || msg.isRead,
      };
    } else {
      result.push(msg);
    }
  }
  return result;
}

function splitDevelopmentItems(value: string) {
  return value
    .split(/[\n,]/)
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, 8);
}

function formatStudentStartDate(value?: string) {
  if (!value) return 'Henüz eklenmedi';
  const date = new Date(`${value}T00:00:00`);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' });
}

function formatStudentBirthDate(value: unknown) {
  if (!value) return 'Henüz eklenmedi';
  const date = toDate(value);
  if (Number.isNaN(date.getTime())) return typeof value === 'string' ? value : 'Henüz eklenmedi';
  return date.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' });
}

type StudentProfileSync = Partial<Omit<Student, 'birthDate'>> & {
  birthDate?: Date | string;
  updatedAt?: string;
};

export function AdminDashboard() {
  const auth = useAuth();
  const { user } = useUser();
  const firestore = useFirestore();
  const restorationStarted = useRef(false);
  const historicalRecoveryStarted = useRef(false);
  
  const [activeTab, setActiveTab] = useState('Ana Sayfa');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
  const [editingPin, setEditingPin] = useState('');
  const [teacherMessage, setTeacherMessage] = useState('');
  const [isSendingMessage, setIsSendingMessage] = useState(false);
  const [messageError, setMessageError] = useState('');
  const [calendarMonth, setCalendarMonth] = useState(() => new Date());
  const [isLessonOpen, setIsLessonOpen] = useState(false);
  const [lessonToDelete, setLessonToDelete] = useState<(LessonLog & { id: string }) | null>(null);
  const [newLesson, setNewLesson] = useState({ studentId: '', date: '', time: '' });
  const [isAddStudentOpen, setIsAddStudentOpen] = useState(false);
  const [isDeleteStudentOpen, setIsDeleteStudentOpen] = useState(false);
  const [isDevelopmentOpen, setIsDevelopmentOpen] = useState(false);
  const [isEducationOpen, setIsEducationOpen] = useState(false);
  const [educationDraft, setEducationDraft] = useState({ startDate: '', currentLevel: '', timeZone: 'Europe/Berlin' });
  const [isGoalOpen, setIsGoalOpen] = useState(false);
  const [goalDraft, setGoalDraft] = useState('');
  const [strengthsDraft, setStrengthsDraft] = useState('');
  const [areasDraft, setAreasDraft] = useState('');
  const [isAchievementOpen, setIsAchievementOpen] = useState(false);
  const [editingAchievementId, setEditingAchievementId] = useState<string | null>(null);
  const [newAchievement, setNewAchievement] = useState({
    title: '',
    description: '',
    category: 'Konuşma' as Achievement['category'],
    status: 'Henüz başlamadık' as Achievement['status'],
    progress: 25,
  });
  const [achievementError, setAchievementError] = useState('');
  const [isHomeworkOpen, setIsHomeworkOpen] = useState(false);
  const [homeworkFilterId, setHomeworkFilterId] = useState('all');
  const [newHomework, setNewHomework] = useState({ studentId: '', title: '', description: '', dueDate: '' });
  const [newStudent, setNewStudent] = useState({
    name: '',
    country: 'Türkiye',
    currentLevel: 'A1 - Başlangıç',
    lessonPrice: '0',
    pin: '',
  });
  const [bridgeRevision, setBridgeRevision] = useState(0);
  const [remoteProfileSyncs, setRemoteProfileSyncs] = useState<Record<string, StudentProfileSync>>({});

  const menuItems = [
    { name: 'Ana Sayfa', icon: Home },
    { name: 'Ders Takvimi', icon: CalendarDays },
    { name: 'Ödevler', icon: BookOpen },
    { name: 'Mesajlar', icon: MessageSquare, badge: 2 },
    { name: 'Ayarlar', icon: Settings },
  ];

  // Fetch real students from Firestore
  const studentsCollectionRef = useMemoFirebase(() => {
    if (!user) return null;
    return collection(firestore, 'users', user.uid, 'students');
  }, [firestore, user]);
  
  const { data: rawStudents } = useCollection<Omit<Student, 'id'>>(studentsCollectionRef);

  useEffect(() => {
    if (!user || !rawStudents?.length) {
      setRemoteProfileSyncs({});
      return;
    }

    const unsubscribers = rawStudents.map((student) => onSnapshot(
      doc(firestore, 'users', user.uid, 'students', student.id, 'checkIns', 'profile_sync'),
      (snapshot) => {
        if (!snapshot.exists()) return;
        const profile = snapshot.data() as StudentProfileSync;
        setRemoteProfileSyncs((current) => ({
          ...current,
          [student.id]: profile,
        }));
      },
      (error) => console.warn(`Profil senkronu okunamadı (${student.id}):`, error)
    ));

    return () => unsubscribers.forEach((unsubscribe) => unsubscribe());
  }, [firestore, rawStudents, user]);

  const lessonLogsCollectionRef = useMemoFirebase(() => {
    if (!user) return null;
    return collection(firestore, 'users', user.uid, 'lessonLogs');
  }, [firestore, user]);

  const { data: rawLessonLogs } = useCollection<Omit<LessonLog, 'id'>>(lessonLogsCollectionRef);

  const lessonLogs = useMemo(() => (rawLessonLogs || []).map((lesson) => ({
    ...lesson,
    date: toDate(lesson.date),
  })).filter((lesson) => !Number.isNaN(lesson.date.getTime())), [rawLessonLogs]);

  const allStudents = useMemo(() => {
    if (!rawStudents) return [];

    let parsedCache: Array<Partial<Student> & { id?: string; pin?: string; name?: string }> = [];
    try {
      const rawCache = typeof window !== 'undefined' ? localStorage.getItem('student_portal_students_cache') : null;
      if (rawCache) {
        parsedCache = JSON.parse(rawCache) as Array<Partial<Student> & { id?: string; pin?: string; name?: string }>;
      }
    } catch {
      // Ignore cache parse error
    }

    return rawStudents.filter((student) => !student.isArchived).map(s => {
      const sName = s.name.trim().toLowerCase();
      const cached: Partial<Student> = parsedCache.find((c) =>
        (c.id && c.id === s.id) ||
        (s.pin && c.pin === s.pin) ||
        (c.name && c.name.trim().toLowerCase() === sName)
      ) || {};

      const bridged: Partial<NonNullable<ReturnType<typeof readBridgedProfile>>> = readBridgedProfile(s.id, s.name, s.pin) || {};
      const remoteProfile = remoteProfileSyncs[s.id] || {};

      const directAvatar = typeof window !== 'undefined'
        ? (localStorage.getItem(`student_portal_avatar_${s.id}`) ||
           localStorage.getItem(`student_portal_avatar_${sName}`) ||
           (s.pin ? localStorage.getItem(`student_portal_avatar_${s.pin}`) : null))
        : null;

      const activeAvatar = remoteProfile.avatar || bridged.avatar || directAvatar || s.avatar || cached.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(s.name)}`;
      const activeCountry = remoteProfile.country || bridged.country || s.country || cached.country || 'Türkiye';
      const activePreferredName = remoteProfile.preferredName || bridged.preferredName || s.preferredName || cached.preferredName || s.name;
      const syncedBirthDate = remoteProfile.birthDate || bridged.birthDate;
      const activeBirthDate = syncedBirthDate ? toDate(syncedBirthDate) : (s.birthDate || cached.birthDate);
      const activeLanguages = remoteProfile.languages || bridged.languages || s.languages || cached.languages || [];
      const activeInterests = remoteProfile.interests || bridged.interests || s.interests || cached.interests || [];
      const activeFavoriteThings = remoteProfile.favoriteThings ?? bridged.favoriteThings ?? s.favoriteThings ?? cached.favoriteThings ?? '';
      const activeHasPet = remoteProfile.hasPet ?? bridged.hasPet ?? s.hasPet ?? cached.hasPet ?? false;
      const activePetName = remoteProfile.petName || bridged.petName || s.petName || cached.petName || '';
      const activeBackgroundTheme = remoteProfile.backgroundTheme || bridged.backgroundTheme || s.backgroundTheme || cached.backgroundTheme || 'doğa';
      const activeImprovementGoal = remoteProfile.improvementGoal || bridged.improvementGoal || s.improvementGoal || cached.improvementGoal || '';

      return {
        ...s,
        ...cached,
        ...bridged,
        ...remoteProfile,
        avatar: activeAvatar,
        preferredName: activePreferredName,
        country: activeCountry,
        birthDate: activeBirthDate,
        languages: activeLanguages,
        interests: activeInterests,
        favoriteThings: activeFavoriteThings,
        hasPet: activeHasPet,
        petName: activePetName,
        backgroundTheme: activeBackgroundTheme,
        improvementGoal: activeImprovementGoal,
        flag: activeCountry === 'Almanya' ? '🇩🇪' : activeCountry === 'Hollanda' ? '🇳🇱' : activeCountry === 'ABD' ? '🇺🇸' : '🇹🇷',
        color: s.themeColor || '#6b8e7c',
        nextLesson: 'Planlanmadı',
        status: s.isActive === false ? 'Pasif' : 'Aktif'
      };
    });
  }, [rawStudents, bridgeRevision, remoteProfileSyncs]);

  const visibleLessonLogs = useMemo(() => {
    const activeStudentIds = new Set(allStudents.map((student) => student.id));
    return lessonLogs.filter((lesson) => activeStudentIds.has(lesson.studentId));
  }, [lessonLogs, allStudents]);

  const students = useMemo(() => allStudents.filter((student) => (
    student.name.toLowerCase().includes(searchQuery.toLowerCase())
  )), [allStudents, searchQuery]);

  useEffect(() => {
    if (!user || !studentsCollectionRef || !rawStudents || restorationStarted.current) return;
    const restorationKey = `student_restore_2026_09_19_v2_${user.uid}`;
    if (localStorage.getItem(restorationKey) === 'complete') return;
    const existingNames = new Set(rawStudents.map((student) => student.name.trim().toLocaleLowerCase('tr-TR')));
    const missingNames = studentsToRestore.filter((name) => !existingNames.has(name.toLocaleLowerCase('tr-TR')));
    if (!missingNames.length) {
      localStorage.setItem(restorationKey, 'complete');
      return;
    }

    restorationStarted.current = true;
    void Promise.all(missingNames.map((name, index) => addDoc(studentsCollectionRef, {
      userId: user.uid,
      name,
      preferredName: name,
      country: 'Türkiye',
      currentLevel: 'Seviye belirtilmedi',
      lessonPrice: 0,
      balance: 0,
      pin: '',
      order: rawStudents.length + index,
      isActive: true,
      themeColor: '#6b8e7c',
      backgroundTheme: 'doğa',
      avatar: `https://api.dicebear.com/7.x/notionists/svg?seed=${encodeURIComponent(name)}&backgroundColor=e8f1ec`,
      createdAt: serverTimestamp(),
      restoredAt: serverTimestamp(),
    }))).then(() => {
      localStorage.setItem(restorationKey, 'complete');
    }).catch((error) => {
        restorationStarted.current = false;
        console.error('Öğrenciler geri yüklenemedi:', error);
      });
  }, [rawStudents, studentsCollectionRef, user]);

  useEffect(() => {
    if (!user || !rawStudents || !rawLessonLogs || historicalRecoveryStarted.current) return;
    const recoveryKey = `firestore_history_recovery_2026_09_19_${user.uid}`;
    if (localStorage.getItem(recoveryKey) === 'complete') return;

    historicalRecoveryStarted.current = true;
    const recoverDeletedPortalData = async () => {
      const token = await user.getIdToken();
      const readTime = new Date(Date.now() - 20 * 60 * 1000).toISOString();
      const baseUrl = `https://firestore.googleapis.com/v1/projects/${firebaseConfig.projectId}/databases/(default)/documents`;
      const queryAtTime = async (collectionId: string) => {
        const response = await fetch(`${baseUrl}/users/${user.uid}:runQuery`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ structuredQuery: { from: [{ collectionId }] }, readTime }),
        });
        if (!response.ok) throw new Error(`Geçmiş ${collectionId} kayıtları okunamadı (${response.status})`);
        const rows = await response.json() as Array<{ document?: { name: string; fields: Record<string, unknown> } }>;
        return rows.flatMap((row) => row.document ? [row.document] : []);
      };

      const [oldStudents, oldLessons] = await Promise.all([queryAtTime('students'), queryAtTime('lessonLogs')]);
      const currentStudentIds = new Set(rawStudents.map((student) => student.id));
      const currentLessonIds = new Set(rawLessonLogs.map((lesson) => lesson.id));
      const missingDocuments = [
        ...oldStudents.filter((document) => !currentStudentIds.has(document.name.split('/').pop() || '')),
        ...oldLessons.filter((document) => !currentLessonIds.has(document.name.split('/').pop() || '')),
      ];

      if (missingDocuments.length) {
        const response = await fetch(`${baseUrl}:commit`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ writes: missingDocuments.map((document) => ({ update: document })) }),
        });
        if (!response.ok) throw new Error(`Geçmiş kayıtlar geri yazılamadı (${response.status})`);
      }

      const reconstructedStudents = rawStudents.filter((student) => 'restoredAt' in student);
      await Promise.all(reconstructedStudents.map((student) => (
        deleteDoc(doc(firestore, 'users', user.uid, 'students', student.id))
      )));
      localStorage.setItem(recoveryKey, 'complete');
    };

    void recoverDeletedPortalData().catch((error) => {
      historicalRecoveryStarted.current = false;
      console.error('Geçmiş kayıt kurtarma başarısız:', error);
    });
  }, [firestore, rawLessonLogs, rawStudents, user]);

  useEffect(() => {
    if (!user || !rawStudents?.length) return;

    const rawCache = localStorage.getItem('student_portal_pin_cache');
    const cache = rawCache ? JSON.parse(rawCache) as Record<string, string> : {};
    
    // Read existing student cache so locally selected avatars are preserved before firestore sync
    const existingRaw = localStorage.getItem('student_portal_students_cache');
    const existingList = existingRaw ? JSON.parse(existingRaw) as Array<Partial<Student> & { id?: string; pin?: string; name?: string }> : [];

    const studentCache: Array<Partial<Student> & { id: string; userId: string }> = [];
    let changed = false;

    rawStudents.filter((student) => !student.isArchived).forEach((student) => {
      if (student.pin && cache[student.pin] !== `student:${user.uid}:${student.id}`) {
        cache[student.pin] = `student:${user.uid}:${student.id}`;
        changed = true;
      }

      const sName = student.name.trim().toLowerCase();
      const cached = existingList.find((c) =>
        (c.id && c.id === student.id) ||
        (student.pin && c.pin === student.pin) ||
        (c.name && c.name.trim().toLowerCase() === sName)
      );

      const directAvatar = typeof window !== 'undefined'
        ? (localStorage.getItem(`student_portal_avatar_${student.id}`) ||
           localStorage.getItem(`student_portal_avatar_${sName}`) ||
           (sName === 'leo' ? localStorage.getItem('student_portal_active_avatar') : null))
        : null;

      const chosenAvatar = directAvatar || cached?.avatar || student.avatar;

      // If student updated avatar locally and firestore doesn't have it yet, write it to Firestore
      if (chosenAvatar && chosenAvatar !== student.avatar) {
        updateDoc(doc(firestore, 'users', user.uid, 'students', student.id), {
          avatar: chosenAvatar,
        }).catch((err) => console.warn('Avatar sync to firestore failed:', err));
      }

      studentCache.push({
        ...student,
        ...cached,
        avatar: chosenAvatar,
        id: student.id,
        userId: user.uid,
      });
    });

    if (changed) {
      localStorage.setItem('student_portal_pin_cache', JSON.stringify(cache));
    }

    localStorage.setItem('student_portal_students_cache', JSON.stringify(studentCache));
  }, [rawStudents, user, firestore]);

  const selectedStudent = useMemo(() => {
    if (!allStudents.length) return null;
    if (selectedStudentId) {
      return allStudents.find(s => s.id === selectedStudentId) || allStudents[0];
    }
    return allStudents[0];
  }, [allStudents, selectedStudentId]);

  const [isDialogOpen, setIsDialogOpen] = useState(false);

  // Listen for real-time avatar and profile sync from student portal via checkIns
  useEffect(() => {
    if (!user || !selectedStudent) return;
    const syncDocRef = doc(firestore, 'users', user.uid, 'students', selectedStudent.id, 'checkIns', 'avatar_sync');
    const profileSyncDocRef = doc(firestore, 'users', user.uid, 'students', selectedStudent.id, 'checkIns', 'profile_sync');

    const unsubAvatar = onSnapshot(syncDocRef, (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        if (data?.avatar && data.avatar !== selectedStudent.avatar) {
          saveBridgedProfile({
            studentId: selectedStudent.id,
            studentName: selectedStudent.name,
            pin: selectedStudent.pin,
            avatar: data.avatar,
          });
          updateDoc(doc(firestore, 'users', user.uid, 'students', selectedStudent.id), {
            avatar: data.avatar,
          }).catch(console.warn);
          setBridgeRevision((v) => v + 1);
        }
      }
    }, () => {});

    const unsubProfile = onSnapshot(profileSyncDocRef, (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        if (data) {
          saveBridgedProfile({
            studentId: selectedStudent.id,
            studentName: selectedStudent.name,
            pin: selectedStudent.pin,
            ...data,
          });
          setBridgeRevision((v) => v + 1);
        }
      }
    }, () => {});

    return () => {
      unsubAvatar();
      unsubProfile();
    };
  }, [firestore, user, selectedStudent?.id, selectedStudent?.name, selectedStudent?.pin, selectedStudent?.avatar]);

  const selectedMessagesRef = useMemoFirebase(() => {
    if (!user || !selectedStudent) return null;
    return query(
      collection(firestore, 'users', user.uid, 'students', selectedStudent.id, 'messages'),
      orderBy('date', 'desc'),
      limit(100)
    );
  }, [firestore, user, selectedStudent?.id]);

  const selectedCheckInsRef = useMemoFirebase(() => {
    if (!user || !selectedStudent) return null;
    return query(
      collection(firestore, 'users', user.uid, 'students', selectedStudent.id, 'checkIns'),
      orderBy('date', 'desc'),
      limit(1)
    );
  }, [firestore, user, selectedStudent?.id]);

  const selectedAchievementsRef = useMemoFirebase(() => {
    if (!user || !selectedStudent) return null;
    return collection(firestore, 'users', user.uid, 'students', selectedStudent.id, 'achievements');
  }, [firestore, user, selectedStudent?.id]);

  const { data: selectedMessages } = useCollection<Omit<Message, 'id'>>(selectedMessagesRef);
  const { data: selectedCheckIns } = useCollection<Omit<CheckIn, 'id'>>(selectedCheckInsRef);
  const { data: selectedAchievements } = useCollection<Omit<Achievement, 'id'>>(selectedAchievementsRef);
  const displayAchievements = useMemo(() => {
    const achievements = [...(selectedAchievements || []), ...(selectedStudent?.portalAchievements || [])];
    return achievements.filter((achievement, index, list) => list.findIndex((item) => item.id === achievement.id) === index);
  }, [selectedAchievements, selectedStudent?.portalAchievements]);
  const latestCheckIn = useMemo(() => {
    const bridgedCheckIns = user && selectedStudent ? readBridgedCheckIns(user.uid, selectedStudent.id) : [];
    const isLegacyLeoTest = selectedStudent?.pin === '1234' || selectedStudent?.name.trim().toLocaleLowerCase('tr-TR') === 'leo';
    const legacyTestCheckIns = isLegacyLeoTest ? readBridgedCheckIns('dummy', 'dummy') : [];
    return [...(selectedCheckIns || []), ...bridgedCheckIns, ...legacyTestCheckIns]
      .filter((checkIn, index, list) => list.findIndex((item) => item.id === checkIn.id) === index)
      .sort((a, b) => toDate(b.date).getTime() - toDate(a.date).getTime())[0];
  }, [bridgeRevision, selectedCheckIns, selectedStudent?.id, selectedStudent?.pin, user]);
  const bridgedReactions = useMemo(() => {
    return user && selectedStudent ? readBridgedReactions(user.uid, selectedStudent.id) : {};
  }, [bridgeRevision, user, selectedStudent?.id]);

  const conversationMessages = useMemo(() => {
    const bridgedMessages = user && selectedStudent ? readBridgedMessages(user.uid, selectedStudent.id) : [];
    const messages = [...(selectedMessages || []), ...(selectedStudent?.portalMessages || []), ...bridgedMessages];
    const mapped = messages
      .filter((message) => Boolean(message && message.content))
      .map((message) => {
        const contentKey = `content:${message.content.trim()}`;
        const reaction =
          message.emojiReaction ||
          bridgedReactions[message.id] ||
          bridgedReactions[contentKey] ||
          undefined;
        return {
          ...message,
          emojiReaction: reaction,
        };
      });
    return deduplicateMessages(mapped as Message[]).sort((a, b) => toDate(a.date).getTime() - toDate(b.date).getTime());
  }, [bridgeRevision, selectedMessages, selectedStudent?.portalMessages, selectedStudent?.id, user]);
  const latestStudentMessage = [...conversationMessages].reverse().find((message) => message.senderRole === 'student');
  const latestAdminMessage = [...conversationMessages].reverse().find((message) => message.senderRole === 'admin');

  const [adminMsgIndex, setAdminMsgIndex] = useState<number | null>(null);
  const [studentMsgIndex, setStudentMsgIndex] = useState<number | null>(null);

  useEffect(() => {
    setAdminMsgIndex(null);
    setStudentMsgIndex(null);
  }, [selectedStudent?.id]);

  const adminTeacherMessages = useMemo(() => {
    return conversationMessages.filter((m) => m.senderRole === 'admin' && Boolean(m.content));
  }, [conversationMessages]);

  const studentNotes = useMemo(() => {
    return conversationMessages.filter((m) => m.senderRole === 'student' && Boolean(m.content));
  }, [conversationMessages]);

  const totalAdminMsgs = adminTeacherMessages.length;
  const currentAdminIndex =
    adminMsgIndex !== null && adminMsgIndex >= 0 && adminMsgIndex < totalAdminMsgs
      ? adminMsgIndex
      : totalAdminMsgs - 1;
  const currentAdminMsg = totalAdminMsgs > 0 ? adminTeacherMessages[currentAdminIndex] : null;

  const totalStudentNotes = studentNotes.length;
  const currentStudentIndex =
    studentMsgIndex !== null && studentMsgIndex >= 0 && studentMsgIndex < totalStudentNotes
      ? studentMsgIndex
      : totalStudentNotes - 1;
  const currentStudentNote = totalStudentNotes > 0 ? studentNotes[currentStudentIndex] : null;

  useEffect(() => {
    return subscribeBridge(() => setBridgeRevision((value) => value + 1));
  }, []);

  useEffect(() => {
    setStrengthsDraft((selectedStudent?.strengths || []).join('\n'));
    setAreasDraft((selectedStudent?.areasToImprove || []).join('\n'));
  }, [selectedStudent?.id, selectedStudent?.strengths, selectedStudent?.areasToImprove]);

  useEffect(() => {
    setEducationDraft({
      startDate: selectedStudent?.startDate || '',
      currentLevel: selectedStudent?.currentLevel || '',
      timeZone: selectedStudent?.timeZone || defaultTimeZoneForCountry(selectedStudent?.country),
    });
  }, [selectedStudent?.id, selectedStudent?.startDate, selectedStudent?.currentLevel, selectedStudent?.timeZone]);

  useEffect(() => {
    setGoalDraft(selectedStudent?.improvementGoal || '');
  }, [selectedStudent?.id, selectedStudent?.improvementGoal]);

  const calendarDays = useMemo(() => {
    const year = calendarMonth.getFullYear();
    const month = calendarMonth.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const mondayFirstOffset = (new Date(year, month, 1).getDay() + 6) % 7;
    const cellCount = Math.ceil((mondayFirstOffset + daysInMonth) / 7) * 7;

    return Array.from({ length: cellCount }, (_, index) => {
      const day = index - mondayFirstOffset + 1;
      const lessons = day > 0 && day <= daysInMonth
        ? visibleLessonLogs.filter((lesson) => (
          lesson.date.getFullYear() === year
          && lesson.date.getMonth() === month
          && lesson.date.getDate() === day
          && lesson.status !== 'cancelled'
        ))
        : [];
      return { day, isCurrentMonth: day > 0 && day <= daysInMonth, lessons };
    });
  }, [calendarMonth, visibleLessonLogs]);

  const upcomingLessons = useMemo(() => visibleLessonLogs
    .filter((lesson) => lesson.status !== 'cancelled' && lesson.date >= startOfToday())
    .sort((a, b) => a.date.getTime() - b.date.getTime())
    .slice(0, 8), [visibleLessonLogs]);

  const allHomeworks = useMemo(() => allStudents.flatMap((student) => (
    (student.homeworks || []).map((homework) => ({ ...homework, student }))
  )).filter(({ student }) => homeworkFilterId === 'all' || student.id === homeworkFilterId)
    .sort((a, b) => (a.dueDate || '9999').localeCompare(b.dueDate || '9999')), [allStudents, homeworkFilterId]);

  const handleUpdatePin = async () => {
    if (!user || !selectedStudent || !editingPin) return;
    try {
      const studentRef = doc(firestore, 'users', user.uid, 'students', selectedStudent.id);
      await updateDoc(studentRef, { pin: editingPin });
      const rawCache = localStorage.getItem('student_portal_pin_cache');
      const cache = rawCache ? JSON.parse(rawCache) as Record<string, string> : {};
      cache[editingPin] = `student:${user.uid}:${selectedStudent.id}`;
      localStorage.setItem('student_portal_pin_cache', JSON.stringify(cache));

      const rawStudentCache = localStorage.getItem('student_portal_students_cache');
      const studentCache = rawStudentCache ? JSON.parse(rawStudentCache) as Array<Partial<Student> & { id: string; userId: string }> : [];
      const nextStudentCache = [
        ...studentCache.filter((student) => student.id !== selectedStudent.id),
        {
          ...selectedStudent,
          id: selectedStudent.id,
          userId: user.uid,
          pin: editingPin,
        },
      ];
      localStorage.setItem('student_portal_students_cache', JSON.stringify(nextStudentCache));
      setEditingPin('');
      setIsDialogOpen(false);
      // Removed alert for better UX
    } catch (e) {
      console.error(e);
      alert('PIN güncellenirken hata oluştu.');
    }
  };

  const handleSendTeacherMessage = async () => {
    if (!user || !selectedStudent || !teacherMessage.trim()) return;
    const content = teacherMessage.trim();
    const messageId = crypto.randomUUID();
    const message = {
      id: messageId,
      studentId: selectedStudent.id,
      senderRole: 'admin',
      content,
      date: Timestamp.now(),
      type: 'motivation' as const,
      isRead: false,
    };

    setIsSendingMessage(true);
    setMessageError('');
    try {
      const localMessage: Message = {
        id: messageId,
        studentId: selectedStudent.id,
        senderRole: 'admin',
        content,
        date: new Date(),
        type: 'motivation',
        isRead: false,
      };
      saveBridgedMessage(user.uid, localMessage);
      try {
        await setDoc(doc(firestore, 'users', user.uid, 'students', selectedStudent.id, 'messages', messageId), {
          ...message,
          date: serverTimestamp(),
        });
      } catch (subcollectionError) {
        console.warn('Mesaj alt koleksiyona yazılamadı, öğrenci kaydına yazılıyor.', subcollectionError);
        await updateDoc(doc(firestore, 'users', user.uid, 'students', selectedStudent.id), {
          portalMessages: arrayUnion(message),
        });
      }
      setTeacherMessage('');
      setAdminMsgIndex(null);
    } catch (error) {
      console.error('Mesaj gönderilemedi:', error);
      setMessageError('Mesaj gönderilemedi. Öğretmen hesabını yenileyip tekrar deneyin.');
    } finally {
      setIsSendingMessage(false);
    }
  };

  const handleDeleteStudent = async () => {
    if (!user || !selectedStudent) return;

    const removedStudentId = selectedStudent.id;
    const nextStudent = allStudents.find((student) => student.id !== removedStudentId) || null;

    await updateDoc(doc(firestore, 'users', user.uid, 'students', removedStudentId), {
      isActive: false,
      isArchived: true,
      archivedAt: serverTimestamp(),
    });

    const rawPinCache = localStorage.getItem('student_portal_pin_cache');
    const pinCache = rawPinCache ? JSON.parse(rawPinCache) as Record<string, string> : {};
    Object.keys(pinCache).forEach((pin) => {
      if (pinCache[pin] === `student:${user.uid}:${removedStudentId}`) delete pinCache[pin];
    });
    localStorage.setItem('student_portal_pin_cache', JSON.stringify(pinCache));

    const rawStudentCache = localStorage.getItem('student_portal_students_cache');
    const studentCache = rawStudentCache ? JSON.parse(rawStudentCache) as Array<Partial<Student> & { id: string; userId: string }> : [];
    localStorage.setItem('student_portal_students_cache', JSON.stringify(
      studentCache.filter((student) => student.id !== removedStudentId)
    ));

    setTeacherMessage('');
    setSelectedStudentId(nextStudent?.id || null);
    setIsDeleteStudentOpen(false);
  };

  const handleSaveDevelopment = async () => {
    if (!user || !selectedStudent) return;

    const strengths = splitDevelopmentItems(strengthsDraft);
    const areasToImprove = splitDevelopmentItems(areasDraft);
    await updateDoc(doc(firestore, 'users', user.uid, 'students', selectedStudent.id), {
      strengths,
      areasToImprove,
    });

    const rawStudentCache = localStorage.getItem('student_portal_students_cache');
    const studentCache = rawStudentCache ? JSON.parse(rawStudentCache) as Array<Partial<Student> & { id: string; userId: string }> : [];
    localStorage.setItem('student_portal_students_cache', JSON.stringify(studentCache.map((student) => (
      student.id === selectedStudent.id ? { ...student, strengths, areasToImprove } : student
    ))));
    setIsDevelopmentOpen(false);
  };

  const handleSaveEducation = async () => {
    if (!user || !selectedStudent) return;
    const data = {
      startDate: educationDraft.startDate,
      currentLevel: educationDraft.currentLevel.trim() || 'Seviye belirtilmedi',
      timeZone: educationDraft.timeZone,
    };
    await updateDoc(doc(firestore, 'users', user.uid, 'students', selectedStudent.id), data);
    const rawStudentCache = localStorage.getItem('student_portal_students_cache');
    const studentCache = rawStudentCache ? JSON.parse(rawStudentCache) as Array<Partial<Student> & { id: string; userId: string }> : [];
    localStorage.setItem('student_portal_students_cache', JSON.stringify(studentCache.map((student) => (
      student.id === selectedStudent.id ? { ...student, ...data } : student
    ))));
    setIsEducationOpen(false);
  };

  const handleSaveGoal = async () => {
    if (!user || !selectedStudent) return;
    const improvementGoal = goalDraft.trim();
    await updateDoc(doc(firestore, 'users', user.uid, 'students', selectedStudent.id), { improvementGoal });
    const rawStudentCache = localStorage.getItem('student_portal_students_cache');
    const studentCache = rawStudentCache ? JSON.parse(rawStudentCache) as Array<Partial<Student> & { id: string; userId: string }> : [];
    localStorage.setItem('student_portal_students_cache', JSON.stringify(studentCache.map((student) => (
      student.id === selectedStudent.id ? { ...student, improvementGoal } : student
    ))));
    setIsGoalOpen(false);
  };

  const resetAchievementDraft = () => {
    setEditingAchievementId(null);
    setNewAchievement({ title: '', description: '', category: 'Konuşma', status: 'Henüz başlamadık', progress: 25 });
    setAchievementError('');
  };

  const openNewAchievementDialog = () => {
    resetAchievementDraft();
    setIsAchievementOpen(true);
  };

  const openEditAchievementDialog = (achievement: Achievement) => {
    const progress = achievement.progress ?? (achievementStatuses.indexOf(achievement.status) * 30 + (achievement.status === 'Başardım' ? 10 : 0));
    setEditingAchievementId(achievement.id);
    setNewAchievement({
      title: achievement.title,
      description: achievement.description || '',
      category: achievement.category,
      status: achievement.status,
      progress,
    });
    setAchievementError('');
    setIsAchievementOpen(true);
  };

  const handleSaveAchievement = async () => {
    if (!user || !selectedStudent || !newAchievement.title.trim()) return;
    const achievementId = editingAchievementId || crypto.randomUUID();
    const achievement: Achievement = {
      id: achievementId,
      studentId: selectedStudent.id,
      title: newAchievement.title.trim(),
      description: newAchievement.description.trim(),
      category: newAchievement.category,
      progress: newAchievement.progress,
      status: progressToAchievementStatus(newAchievement.progress),
    };
    setAchievementError('');

    if (editingAchievementId) {
      const isCollectionAchievement = (selectedAchievements || []).some((item) => item.id === editingAchievementId);
      const isEmbeddedAchievement = (selectedStudent.portalAchievements || []).some((item) => item.id === editingAchievementId);
      try {
        if (isCollectionAchievement) {
          await updateDoc(
            doc(firestore, 'users', user.uid, 'students', selectedStudent.id, 'achievements', editingAchievementId),
            { ...achievement, updatedAt: serverTimestamp() }
          );
        }
        if (isEmbeddedAchievement) {
          const portalAchievements = (selectedStudent.portalAchievements || []).map((item) => (
            item.id === editingAchievementId ? achievement : item
          ));
          await updateDoc(doc(firestore, 'users', user.uid, 'students', selectedStudent.id), { portalAchievements });
        }
        if (!isCollectionAchievement && !isEmbeddedAchievement) {
          throw new Error('Güncellenecek kazanım bulunamadı.');
        }
      } catch (error) {
        console.error(error);
        setAchievementError('Kazanım güncellenemedi. Bağlantıyı kontrol edip tekrar deneyin.');
        return;
      }
      resetAchievementDraft();
      setIsAchievementOpen(false);
      return;
    }

    try {
      await setDoc(doc(firestore, 'users', user.uid, 'students', selectedStudent.id, 'achievements', achievement.id), {
        ...achievement,
        createdAt: serverTimestamp(),
      });
    } catch (subcollectionError) {
      console.warn('Kazanım alt koleksiyona yazılamadı, öğrenci kaydına yazılıyor.', subcollectionError);
      try {
        await updateDoc(doc(firestore, 'users', user.uid, 'students', selectedStudent.id), {
          portalAchievements: arrayUnion(achievement),
        });
      } catch (fallbackError) {
        console.error(fallbackError);
        setAchievementError('Kazanım kaydedilemedi. Bağlantıyı kontrol edip tekrar deneyin.');
        return;
      }
    }
    resetAchievementDraft();
    setIsAchievementOpen(false);
  };

  const handleAchievementProgress = async (achievementId: string, progress: number) => {
    if (!user || !selectedStudent) return;
    const status = progressToAchievementStatus(progress);
    const isCollectionAchievement = (selectedAchievements || []).some((achievement) => achievement.id === achievementId);
    const isEmbeddedAchievement = (selectedStudent.portalAchievements || []).some((achievement) => achievement.id === achievementId);
    if (isCollectionAchievement) {
      await updateDoc(doc(firestore, 'users', user.uid, 'students', selectedStudent.id, 'achievements', achievementId), { progress, status });
    }
    if (isEmbeddedAchievement) {
      const portalAchievements = (selectedStudent.portalAchievements || []).map((achievement) => (
        achievement.id === achievementId ? { ...achievement, progress, status } : achievement
      ));
      await updateDoc(doc(firestore, 'users', user.uid, 'students', selectedStudent.id), { portalAchievements });
    }
  };

  const handleDeleteAchievement = async (achievementId: string) => {
    if (!user || !selectedStudent) return;
    const isCollectionAchievement = (selectedAchievements || []).some((achievement) => achievement.id === achievementId);
    const isEmbeddedAchievement = (selectedStudent.portalAchievements || []).some((achievement) => achievement.id === achievementId);
    if (isCollectionAchievement) {
      await deleteDoc(doc(firestore, 'users', user.uid, 'students', selectedStudent.id, 'achievements', achievementId));
    }
    if (isEmbeddedAchievement) {
      await updateDoc(doc(firestore, 'users', user.uid, 'students', selectedStudent.id), {
        portalAchievements: (selectedStudent.portalAchievements || []).filter((achievement) => achievement.id !== achievementId),
      });
    }
  };

  const handleAddHomework = async () => {
    if (!user || !newHomework.studentId || !newHomework.title.trim()) return;
    const homework: Homework = {
      id: crypto.randomUUID(),
      title: newHomework.title.trim(),
      description: newHomework.description.trim(),
      dueDate: newHomework.dueDate,
      status: 'assigned',
      createdAt: new Date().toISOString(),
    };
    await updateDoc(doc(firestore, 'users', user.uid, 'students', newHomework.studentId), {
      homeworks: arrayUnion(homework),
    });
    setNewHomework({ studentId: '', title: '', description: '', dueDate: '' });
    setIsHomeworkOpen(false);
  };

  const updateHomeworkList = async (student: Student & { color?: string }, updater: (homeworks: Homework[]) => Homework[]) => {
    if (!user) return;
    await updateDoc(doc(firestore, 'users', user.uid, 'students', student.id), {
      homeworks: updater(student.homeworks || []),
    });
  };

  const handleAddLesson = async (weekCount: 1 | 8) => {
    if (!user || !lessonLogsCollectionRef || !newLesson.studentId || !newLesson.date || !newLesson.time) return;
    const student = allStudents.find((item) => item.id === newLesson.studentId);
    if (!student) return;
    const firstLessonDate = zonedDateTimeToUtc(newLesson.date, newLesson.time, TEACHER_TIME_ZONE);
    await Promise.all(Array.from({ length: weekCount }, (_, weekIndex) => {
      const lessonLocalDate = addDaysToDateInput(newLesson.date, weekIndex * 7);
      const lessonDate = zonedDateTimeToUtc(lessonLocalDate, newLesson.time, TEACHER_TIME_ZONE);
      return addDoc(lessonLogsCollectionRef, {
        userId: user.uid,
        studentId: student.id,
        studentName: student.name,
        date: Timestamp.fromDate(lessonDate),
        lessonPrice: student.lessonPrice || 0,
        topic: 'Türkçe dersi',
        status: 'scheduled',
        seriesLength: weekCount,
        seriesWeek: weekIndex + 1,
        teacherTimeZone: TEACHER_TIME_ZONE,
        studentTimeZone: student.timeZone || defaultTimeZoneForCountry(student.country),
      });
    }));
    setCalendarMonth(new Date(firstLessonDate.getFullYear(), firstLessonDate.getMonth(), 1));
    setNewLesson({ studentId: '', date: '', time: '' });
    setIsLessonOpen(false);
  };

  const handleDeleteLesson = async () => {
    if (!user || !lessonToDelete) return;
    await deleteDoc(doc(firestore, 'users', user.uid, 'lessonLogs', lessonToDelete.id));
    setLessonToDelete(null);
  };

  const handleAddStudent = async () => {
    if (!user || !studentsCollectionRef || !newStudent.name.trim()) return;

    const trimmedName = newStudent.name.trim();
    const studentDoc = await addDoc(studentsCollectionRef, {
      userId: user.uid,
      name: trimmedName,
      preferredName: trimmedName.split(' ')[0],
      country: newStudent.country.trim() || 'Türkiye',
      currentLevel: newStudent.currentLevel.trim() || 'A1 - Başlangıç',
      lessonPrice: Number(newStudent.lessonPrice) || 0,
      balance: 0,
      pin: newStudent.pin.trim(),
      order: students.length,
      isActive: true,
      themeColor: '#6b8e7c',
      backgroundTheme: 'doğa',
      avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(trimmedName)}`,
      createdAt: serverTimestamp(),
    });

    if (newStudent.pin.trim()) {
      const rawCache = localStorage.getItem('student_portal_pin_cache');
      const cache = rawCache ? JSON.parse(rawCache) as Record<string, string> : {};
      cache[newStudent.pin.trim()] = `student:${user.uid}:${studentDoc.id}`;
      localStorage.setItem('student_portal_pin_cache', JSON.stringify(cache));
    }

    const rawStudentCache = localStorage.getItem('student_portal_students_cache');
    const studentCache = rawStudentCache ? JSON.parse(rawStudentCache) as Array<Partial<Student> & { id: string; userId: string }> : [];
    studentCache.push({
      id: studentDoc.id,
      userId: user.uid,
      name: trimmedName,
      preferredName: trimmedName.split(' ')[0],
      country: newStudent.country.trim() || 'Türkiye',
      currentLevel: newStudent.currentLevel.trim() || 'A1 - Başlangıç',
      lessonPrice: Number(newStudent.lessonPrice) || 0,
      balance: 0,
      pin: newStudent.pin.trim(),
      order: students.length,
      isActive: true,
      themeColor: '#6b8e7c',
      backgroundTheme: 'doğa',
      avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(trimmedName)}`,
      createdAt: new Date(),
    });
    localStorage.setItem('student_portal_students_cache', JSON.stringify(studentCache));

    setSelectedStudentId(studentDoc.id);
    setActiveTab('Ana Sayfa');
    setIsAddStudentOpen(false);
    setNewStudent({
      name: '',
      country: 'Türkiye',
      currentLevel: 'A1 - Başlangıç',
      lessonPrice: '0',
      pin: '',
    });
  };

  return (
    <div className="flex min-h-screen flex-col overflow-x-hidden bg-[#fcfbf9] font-sans text-slate-800 xl:h-screen xl:flex-row xl:overflow-hidden">
      
      {/* 1. SIDEBAR */}
      <aside className="flex w-full shrink-0 items-center gap-3 border-b border-[#eef3f0] bg-white px-3 py-3 xl:h-full xl:w-64 xl:flex-col xl:items-stretch xl:justify-between xl:overflow-y-auto xl:border-b-0 xl:border-r xl:py-4">
        <div className="flex min-w-0 flex-1 items-center gap-3 xl:block xl:flex-none">
          <div className="hidden px-2 xl:mb-6 xl:block">
            <h1 className="text-xl font-bold text-[#2d4a3e] flex items-center gap-2">
              Kelimeyle <br/> Daha Fazlası
              <span className="text-lg">🌿</span>
            </h1>
            <p className="text-[10px] text-slate-500 mt-1">Türkçe, daha geniş bir dünya</p>
          </div>

          <nav className="touch-scroll flex min-w-0 flex-1 gap-1 overflow-x-auto pb-1 xl:block xl:space-y-1 xl:overflow-visible xl:pb-0">
            {menuItems.map((item) => (
              <button
                key={item.name}
                onClick={() => setActiveTab(item.name)}
                className={`flex shrink-0 items-center justify-between gap-2 rounded-xl px-3 py-2 transition-colors xl:w-full ${
                  activeTab === item.name 
                    ? 'bg-[#eef3f0] text-[#2d4a3e] font-semibold' 
                    : 'text-slate-600 hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center gap-3">
                  <item.icon className={`h-4 w-4 ${activeTab === item.name ? 'text-[#6b8e7c]' : 'text-slate-400'}`} />
                  <span className="text-sm">{item.name}</span>
                </div>
                {item.badge && (
                  <span className="bg-[#e89b7b] text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full">
                    {item.badge}
                  </span>
                )}
              </button>
            ))}
          </nav>
        </div>

        <div className="hidden px-2 xl:mt-4 xl:block">
          <div className="bg-[#fff9eb] p-3 rounded-2xl relative">
            <p className="text-xs text-slate-700 italic">
              "İyi bir öğretmen, daha iyi hikâyelere yol açar." 💛
            </p>
          </div>
          <button onClick={() => auth.signOut()} className="flex items-center gap-2 mt-4 text-slate-400 hover:text-red-500 transition-colors text-sm px-2 pb-2">
            <LogOut className="h-4 w-4" /> Çıkış Yap
          </button>
        </div>
      </aside>

      {/* MAIN CONTENT AREA */}
      <div className="flex min-w-0 flex-1 flex-col xl:overflow-hidden">
        
        {/* Header Bar */}
        <header className="flex min-h-20 shrink-0 flex-col gap-3 border-b border-[#eef3f0] bg-white/50 px-4 py-3 sm:px-6 md:flex-row md:items-center md:justify-between xl:px-8">
          <div className="min-w-0">
            <h2 className="flex items-center gap-2 text-xl font-bold text-[#2d4a3e] sm:text-2xl">
              Merhaba Tuba! ☀️
            </h2>
            <p className="mt-1 hidden text-sm italic text-slate-500 sm:block">"Doğru kelimeler, doğru insanlara ulaşınca, dünya biraz daha aydınlık olur." 🍃</p>
          </div>
          
          <div className="touch-scroll flex w-full items-center gap-2 overflow-x-auto pb-1 md:w-auto md:overflow-visible md:pb-0">
            <Dialog open={isAddStudentOpen} onOpenChange={setIsAddStudentOpen}>
              <DialogTrigger asChild>
                <Button size="sm" className="shrink-0 rounded-xl bg-[#6b8e7c] text-white hover:bg-[#5a7868] sm:h-10"><Plus className="mr-1.5 h-4 w-4"/> Yeni Öğrenci</Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md rounded-3xl">
                <DialogHeader>
                  <DialogTitle className="text-[#2d4a3e]">Yeni öğrenci ekle</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-2">
                  <div>
                    <label className="text-xs font-bold text-slate-500">Öğrenci adı</label>
                    <Input
                      value={newStudent.name}
                      onChange={(event) => setNewStudent((current) => ({ ...current, name: event.target.value }))}
                      placeholder="Örn: Ada Yılmaz"
                      className="mt-1 rounded-xl"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-bold text-slate-500">Ülke</label>
                      <Input
                        value={newStudent.country}
                        onChange={(event) => setNewStudent((current) => ({ ...current, country: event.target.value }))}
                        className="mt-1 rounded-xl"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-slate-500">Seviye</label>
                      <Input
                        value={newStudent.currentLevel}
                        onChange={(event) => setNewStudent((current) => ({ ...current, currentLevel: event.target.value }))}
                        className="mt-1 rounded-xl"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-bold text-slate-500">Ders ücreti</label>
                      <Input
                        type="number"
                        min="0"
                        value={newStudent.lessonPrice}
                        onChange={(event) => setNewStudent((current) => ({ ...current, lessonPrice: event.target.value }))}
                        className="mt-1 rounded-xl"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-slate-500">Portal PIN</label>
                      <Input
                        maxLength={4}
                        value={newStudent.pin}
                        onChange={(event) => setNewStudent((current) => ({ ...current, pin: event.target.value.replace(/\D/g, '') }))}
                        placeholder="1234"
                        className="mt-1 rounded-xl"
                      />
                    </div>
                  </div>
                  <Button onClick={handleAddStudent} disabled={!newStudent.name.trim()} className="w-full h-11 rounded-xl bg-[#6b8e7c] hover:bg-[#5a7868] text-white">
                    Öğrenciyi Kaydet
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
            <Button size="sm" onClick={() => setActiveTab('Ders Takvimi')} className="shrink-0 rounded-xl bg-[#e89b7b] text-white hover:bg-[#d58c6e] sm:h-10"><Plus className="mr-1.5 h-4 w-4"/> Ders Ekle</Button>
            <Button size="sm" onClick={() => setActiveTab('Ödevler')} className="shrink-0 rounded-xl bg-[#b098c4] text-white hover:bg-[#9d84b2] sm:h-10"><Plus className="mr-1.5 h-4 w-4"/> Ödev Ekle</Button>
            
            <div className="ml-1 hidden items-center gap-3 border-l border-slate-200 pl-3 lg:flex">
              <div className="text-right">
                <p className="text-sm font-bold text-[#2d4a3e]">Tuba</p>
                <p className="text-xs text-slate-500">Türkçe Öğretmeni</p>
              </div>
              <Avatar className="h-10 w-10 border-2 border-[#eef3f0]">
                <AvatarImage src="https://api.dicebear.com/7.x/avataaars/svg?seed=Tuba" />
                <AvatarFallback>T</AvatarFallback>
              </Avatar>
            </div>
          </div>
        </header>

        {/* Conditional Content based on activeTab */}
        {activeTab === 'Ana Sayfa' ? (
        <main className="flex min-w-0 flex-1 flex-col xl:overflow-hidden xl:flex-row">
          
          {/* COLUMN 1: Student List */}
          <div className="flex w-full shrink-0 flex-col gap-3 border-b border-[#eef3f0] bg-white p-3 sm:p-4 xl:w-80 xl:gap-4 xl:overflow-y-auto xl:border-b-0 xl:border-r">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-[#2d4a3e] text-lg">Öğrencilerim <span className="text-slate-400 text-sm font-normal">({students.length})</span></h3>
            </div>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input 
                placeholder="Öğrenci adı ile ara..." 
                className="pl-9 bg-[#fcfbf9] border-none rounded-xl"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            
            <div className="touch-scroll mt-1 flex gap-2 overflow-x-auto pb-2 xl:mt-2 xl:flex-col xl:overflow-visible xl:pb-0">
              {students.length === 0 && (
                <div className="text-center p-4 text-slate-400 text-sm">
                  <p>Öğrenci bulunamadı.</p>
                  <Button onClick={() => setIsAddStudentOpen(true)} variant="outline" size="sm" className="mt-3 rounded-xl border-[#dbe7df] text-[#2d4a3e]">
                    <Plus className="h-3 w-3 mr-1" /> Öğrenci ekle
                  </Button>
                </div>
              )}
              {students.map((s, idx) => (
                <div 
                  key={s.id} 
                  onClick={() => setSelectedStudentId(s.id)}
                  className={`group flex min-w-[210px] cursor-pointer items-center justify-between rounded-2xl border-2 p-3 transition-all xl:min-w-0 ${s.id === selectedStudent?.id ? 'border-[#6b8e7c] bg-[#eef3f0]/50' : 'border-transparent hover:border-slate-100'}`}
                >
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <Avatar className="h-12 w-12">
                        <AvatarImage key={s.avatar} src={s.avatar} />
                        <AvatarFallback>{s.name[0]}</AvatarFallback>
                      </Avatar>
                    </div>
                    <div>
                      <h4 className="font-bold text-[#2d4a3e]">{s.name}</h4>
                      <p className="text-[10px] text-slate-400 mt-1 line-clamp-1">Sonraki: {s.nextLesson}</p>
                    </div>
                  </div>
                  <ChevronRight className={`h-4 w-4 ${s.id === selectedStudent?.id ? 'text-[#6b8e7c]' : 'text-slate-300 opacity-0 group-hover:opacity-100'}`} />
                </div>
              ))}
            </div>
          </div>

          {/* COLUMN 2: Selected Student Details */}
          <div className="min-w-0 flex-1 bg-[#fcfbf9] p-3 sm:p-5 xl:overflow-y-auto xl:p-6">
             {!selectedStudent ? (
               <div className="flex items-center justify-center h-full text-slate-400">Öğrenci seçin veya ekleyin.</div>
             ) : (
               <>
             {/* Profile Header */}
             <div className="relative rounded-2xl border border-[#eef3f0] bg-white p-4 shadow-sm sm:p-6 sm:rounded-3xl">
                <div className="mb-4 flex items-center justify-end gap-2">
                  <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                    <DialogTrigger asChild>
                      <Button variant="outline" size="sm" className="text-slate-500 rounded-xl font-medium border-[#eef3f0]">
                        {selectedStudent.pin ? `PIN: ${selectedStudent.pin}` : 'PIN Belirle'}
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-xs rounded-3xl">
                      <DialogHeader>
                        <DialogTitle className="text-[#2d4a3e]">PIN Belirle ({selectedStudent.name})</DialogTitle>
                      </DialogHeader>
                      <div className="flex flex-col gap-4 py-4">
                        <Input 
                          placeholder="Örn: 1453" 
                          maxLength={4}
                          value={editingPin}
                          onChange={e => setEditingPin(e.target.value.replace(/\D/g, ''))}
                          className="text-center text-2xl tracking-[0.5em] h-14"
                        />
                        <Button onClick={handleUpdatePin} className="bg-[#6b8e7c] text-white rounded-xl h-12">Kaydet</Button>
                        <p className="text-xs text-slate-500 text-center">Mevcut PIN: {selectedStudent.pin || 'Yok'}</p>
                      </div>
                    </DialogContent>
                  </Dialog>

                  <Dialog open={isDeleteStudentOpen} onOpenChange={setIsDeleteStudentOpen}>
                    <DialogTrigger asChild>
                      <Button variant="outline" size="icon" title="Öğrenciyi kaldır" className="h-9 w-9 rounded-xl border-red-100 text-red-400 hover:bg-red-50 hover:text-red-600">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-sm rounded-3xl">
                      <DialogHeader>
                        <DialogTitle className="text-[#2d4a3e]">{selectedStudent.name} kaldırılsın mı?</DialogTitle>
                      </DialogHeader>
                      <p className="text-sm leading-relaxed text-slate-500">Öğrenci listeden, mesajlardan ve takvim görünümünden kaldırılacak. Dersleri ve geçmiş bilgileri korunacak.</p>
                      <div className="flex justify-end gap-3 pt-3">
                        <Button variant="outline" onClick={() => setIsDeleteStudentOpen(false)} className="rounded-xl">Vazgeç</Button>
                        <Button onClick={() => void handleDeleteStudent()} className="rounded-xl bg-red-500 text-white hover:bg-red-600"><Trash2 className="mr-2 h-4 w-4" /> Öğrenciyi kaldır</Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
                
                <div className="grid grid-cols-1 items-center gap-4 sm:grid-cols-[auto_minmax(120px,1fr)] lg:grid-cols-[auto_minmax(120px,1fr)_minmax(220px,300px)] lg:gap-6">
                  <div className="relative inline-block">
                    <Avatar className="h-24 w-24 rounded-2xl border-4 border-[#eef3f0]">
                      <AvatarImage key={selectedStudent.avatar} src={selectedStudent.avatar} />
                      <AvatarFallback>{selectedStudent.name[0]}</AvatarFallback>
                    </Avatar>
                  </div>
                  <div>
                    <h2 className="flex items-center gap-2 text-2xl font-black text-[#2d4a3e] sm:text-3xl">
                      {selectedStudent.name} <span className="text-xl">🤍</span>
                    </h2>
                  </div>
                  
                  <div className="relative text-left text-sm italic text-slate-600 bg-[#fff9eb] p-4 pr-10 rounded-xl border border-amber-100 sm:col-span-2 lg:col-span-1 lg:text-right">
                    <p className="mb-1 text-[10px] font-bold not-italic uppercase text-amber-700/60">Öğrencinin hedef cümlesi</p>
                    “{selectedStudent.improvementGoal || 'Henüz hedef cümlesi eklenmedi.'}”
                    <p className="font-bold text-xs mt-1">- {selectedStudent.preferredName || selectedStudent.name} 🤍</p>
                    <Dialog open={isGoalOpen} onOpenChange={setIsGoalOpen}>
                      <DialogTrigger asChild><button title="Hedef cümlesini düzenle" className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-lg text-amber-700/60 hover:bg-white hover:text-amber-700"><Pencil className="h-3.5 w-3.5" /></button></DialogTrigger>
                      <DialogContent className="sm:max-w-md rounded-3xl">
                        <DialogHeader><DialogTitle className="text-[#2d4a3e]">Hedef cümlesini düzenle</DialogTitle></DialogHeader>
                        <div className="space-y-4 py-2 text-left not-italic"><p className="text-sm text-slate-500">Bu cümle öğretmen panelinde ve öğrencinin profilinde “Hedefim” olarak görünür.</p><textarea value={goalDraft} onChange={(event) => setGoalDraft(event.target.value)} maxLength={180} className="h-28 w-full resize-none rounded-2xl border border-amber-100 bg-[#fffdf7] p-4 text-sm outline-none focus:border-amber-300" placeholder="Örn: Türkçe konuşurken daha özgüvenli olmak istiyorum." /><div className="flex items-center justify-between"><span className="text-xs text-slate-400">{goalDraft.length}/180</span><Button onClick={() => void handleSaveGoal()} className="rounded-xl bg-[#6b8e7c] text-white hover:bg-[#5a7868]">Kaydet ve paylaş</Button></div></div>
                      </DialogContent>
                    </Dialog>
                  </div>
                </div>

                <div className="mt-8 border-t border-slate-100 pt-5">
                  <div className="mb-4 flex justify-end">
                    <Dialog open={isEducationOpen} onOpenChange={setIsEducationOpen}>
                      <DialogTrigger asChild><Button variant="outline" size="sm" className="rounded-xl border-[#dbe7df] text-[#2d4a3e]"><Pencil className="mr-2 h-4 w-4" /> Ders bilgilerini düzenle</Button></DialogTrigger>
                      <DialogContent className="sm:max-w-md rounded-3xl">
                        <DialogHeader><DialogTitle className="text-[#2d4a3e]">{selectedStudent.name} için ders bilgileri</DialogTitle></DialogHeader>
                        <div className="space-y-4 py-2">
                          <div><label className="text-xs font-bold text-slate-500">Başlangıç tarihi</label><Input type="date" value={educationDraft.startDate} onChange={(event) => setEducationDraft((current) => ({ ...current, startDate: event.target.value }))} className="mt-1 rounded-xl" /></div>
                          <div><label className="text-xs font-bold text-slate-500">Mevcut seviye</label><select value={educationDraft.currentLevel} onChange={(event) => setEducationDraft((current) => ({ ...current, currentLevel: event.target.value }))} className="mt-1 h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm"><option value="">Seviye seç</option>{['A1 - Başlangıç', 'A2 - Temel', 'B1 - Orta', 'B2 - Orta üstü', 'C1 - İleri', 'C2 - Ustalık'].map((level) => <option key={level}>{level}</option>)}</select></div>
                          <div><label className="text-xs font-bold text-slate-500">Öğrencinin saat dilimi</label><select value={educationDraft.timeZone} onChange={(event) => setEducationDraft((current) => ({ ...current, timeZone: event.target.value }))} className="mt-1 h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm">{STUDENT_TIME_ZONES.map((zone) => <option key={zone.value} value={zone.value}>{zone.label} — {zone.offset}</option>)}</select><p className="mt-1.5 text-xs text-slate-400">Ders saati öğrencinin portalında bu bölgeye göre otomatik çevrilir.</p></div>
                          <Button onClick={() => void handleSaveEducation()} className="w-full rounded-xl bg-[#6b8e7c] text-white hover:bg-[#5a7868]">Bilgileri kaydet</Button>
                        </div>
                      </DialogContent>
                    </Dialog>
                  </div>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-slate-50 rounded-xl"><CalendarIcon className="h-5 w-5 text-slate-400"/></div>
                    <div>
                      <p className="text-xs text-slate-400">Başlangıç tarihi</p>
                      <p className="font-bold text-slate-700">{formatStudentStartDate(selectedStudent.startDate)}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-slate-50 rounded-xl"><BarChart2 className="h-5 w-5 text-slate-400"/></div>
                    <div>
                      <p className="text-xs text-slate-400">Mevcut seviye</p>
                      <p className="font-bold text-slate-700">{selectedStudent.currentLevel || 'Seviye belirtilmedi'}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-slate-50 rounded-xl"><CalendarDays className="h-5 w-5 text-slate-400"/></div>
                    <div>
                      <p className="text-xs text-slate-400">Öğrenci saat dilimi</p>
                      <p className="font-bold text-slate-700">{timeZoneLabel(selectedStudent.timeZone || defaultTimeZoneForCountry(selectedStudent.country))}</p>
                      <p className="text-[10px] text-slate-400">{STUDENT_TIME_ZONES.find((zone) => zone.value === (selectedStudent.timeZone || defaultTimeZoneForCountry(selectedStudent.country)))?.offset}</p>
                    </div>
                  </div>
                  </div>
                </div>
             </div>

              {/* ÖĞRENCİNİN DÜNYASI / BURASI BENİM - CANLI KÖPRÜ */}
              <div className="mt-5 rounded-3xl border border-[#eef3f0] bg-white p-5 shadow-sm sm:p-6">
                <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
                  <div className="flex items-center gap-2.5">
                    <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-[#fff5f0] text-lg">
                      🌟
                    </div>
                    <div>
                      <h3 className="font-bold text-[#2d4a3e] text-base sm:text-lg flex items-center gap-2">
                        {selectedStudent.name}'in Dünyası <span className="text-[#e89b7b] text-sm font-semibold">(Burası Benim)</span>
                      </h3>
                      <p className="text-[11px] text-slate-400">Öğrencinin kendi profilinde doldurduğu bilgiler • Canlı köprü aktif</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-[#eef5f1] px-3 py-1 text-xs font-semibold text-[#6b8e7c]">
                      <span className="h-2 w-2 rounded-full bg-[#6b8e7c] animate-pulse" />
                      Canlı Bağlantı
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 text-sm">
                  {/* Takma Ad */}
                  <div className="rounded-2xl border border-slate-100 bg-[#fcfbf9] p-3.5">
                    <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Hitap / Takma Ad</p>
                    <p className="mt-1 font-bold text-[#2d4a3e] text-base">{selectedStudent.preferredName || selectedStudent.name}</p>
                  </div>

                  {/* Ülke */}
                  <div className="rounded-2xl border border-slate-100 bg-[#fcfbf9] p-3.5">
                    <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Ülke</p>
                    <p className="mt-1 font-bold text-[#2d4a3e] text-base flex items-center gap-1.5">
                      <span>{selectedStudent.flag || '🇹🇷'}</span> {selectedStudent.country || 'Türkiye'}
                    </p>
                  </div>

                  {/* Doğum Günü */}
                  <div className="rounded-2xl border border-slate-100 bg-[#fcfbf9] p-3.5">
                    <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Doğum Günü</p>
                    <p className="mt-1 font-bold text-[#2d4a3e] text-base">
                      {formatStudentBirthDate(selectedStudent.birthDate)}
                    </p>
                  </div>

                  {/* Evcil Hayvan */}
                  <div className="rounded-2xl border border-slate-100 bg-[#fcfbf9] p-3.5">
                    <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Evcil Hayvan</p>
                    <p className="mt-1 font-bold text-[#2d4a3e] text-base flex items-center gap-1.5">
                      <span>🐾</span> {selectedStudent.hasPet || selectedStudent.petName ? (selectedStudent.petName || 'Var') : 'Henüz eklenmedi'}
                    </p>
                  </div>

                  {/* Konuştuğu Diller */}
                  <div className="rounded-2xl border border-slate-100 bg-[#fcfbf9] p-3.5 sm:col-span-2">
                    <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Konuştuğu Diller</p>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {(selectedStudent.languages && selectedStudent.languages.length > 0
                        ? selectedStudent.languages
                        : ['Türkçe çalışıyor']
                      ).map((lang: string) => (
                        <span key={lang} className="rounded-full bg-white px-2.5 py-1 text-xs font-semibold text-[#6b8e7c] border border-[#dbe7df] shadow-xs">
                          🗣️ {lang}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* İlgi Alanları */}
                  <div className="rounded-2xl border border-slate-100 bg-[#fcfbf9] p-3.5 sm:col-span-2">
                    <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">İlgi Alanları</p>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {(selectedStudent.interests && selectedStudent.interests.length > 0
                        ? selectedStudent.interests
                        : ['Müzik', 'Kitaplar', 'Resim']
                      ).map((interest: string) => (
                        <span key={interest} className="rounded-full bg-[#fff9eb] px-2.5 py-1 text-xs font-semibold text-amber-800 border border-amber-200 shadow-xs">
                          ✨ {interest}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* En Sevdiği Şeyler */}
                  <div className="rounded-2xl border border-slate-100 bg-[#fcfbf9] p-3.5 sm:col-span-2 lg:col-span-3">
                    <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">En Sevdiği Şeyler</p>
                    <p className="mt-1 font-medium text-slate-700">
                      ☕ {selectedStudent.favoriteThings || 'Yeni kelimeler, iyi hikayeler, eğlenceli sohbetler'}
                    </p>
                  </div>

                  {/* Seçtiği Tema / Renk */}
                  <div className="rounded-2xl border border-slate-100 bg-[#fcfbf9] p-3.5">
                    <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Profil Teması</p>
                    <p className="mt-1 font-bold text-[#2d4a3e] capitalize flex items-center gap-1.5">
                      <span>🎨</span> {selectedStudent.backgroundTheme || 'Doğa'}
                    </p>
                  </div>
                </div>
              </div>

             {/* Strengths & Weaknesses */}
             <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2 xl:mt-6 xl:gap-6">
               <div className="bg-white rounded-3xl p-6 shadow-sm border border-[#eef3f0] relative overflow-hidden">
                 <div className="absolute top-0 right-0 p-4 opacity-10 text-4xl">⭐</div>
                 <h3 className="font-bold text-[#e89b7b] text-lg mb-4 flex items-center gap-2">⭐ Güçlü Yönleri</h3>
                 <ul className="space-y-2 text-sm text-slate-600 font-medium">
                   {(selectedStudent.strengths?.length ? selectedStudent.strengths : ['Henüz güçlü yön eklenmedi']).map((strength) => (
                     <li key={strength} className="flex items-center gap-2"><div className="h-1.5 w-1.5 shrink-0 rounded-full bg-[#e89b7b]"/> {strength}</li>
                   ))}
                 </ul>
                 <div className="mt-4 transform -rotate-2 text-[#6b8e7c] text-xs font-bold font-serif italic text-right">
                   {latestCheckIn?.note || 'Yaratıcı yazılarda harika işler çıkarıyor! ♡'}
                 </div>
               </div>
               <div className="bg-white rounded-3xl p-6 shadow-sm border border-[#eef3f0] relative overflow-hidden">
                 <div className="absolute top-0 right-0 p-4 opacity-10 text-4xl">📈</div>
                 <h3 className="font-bold text-[#b098c4] text-lg mb-4 flex items-center gap-2">📈 Güçlendirdiğimiz Alanlar</h3>
                 <ul className="space-y-2 text-sm text-slate-600 font-medium">
                   {(selectedStudent.areasToImprove?.length ? selectedStudent.areasToImprove : ['Henüz gelişim alanı eklenmedi']).map((area) => (
                     <li key={area} className="flex items-center gap-2"><div className="h-1.5 w-1.5 shrink-0 rounded-full bg-[#b098c4]"/> {area}</li>
                   ))}
                 </ul>
                 <div className="mt-4 transform rotate-2 text-[#e89b7b] text-xs font-bold font-serif italic text-right">
                   Adım adım daha da iyiye! 🚀
                 </div>
               </div>
               <Dialog open={isDevelopmentOpen} onOpenChange={setIsDevelopmentOpen}>
                 <DialogTrigger asChild>
                   <Button variant="outline" className="col-span-2 justify-self-end rounded-xl border-[#dbe7df] text-[#2d4a3e]"><Pencil className="mr-2 h-4 w-4" /> Güçlü yönleri ve alanları düzenle</Button>
                 </DialogTrigger>
                 <DialogContent className="sm:max-w-xl rounded-3xl">
                   <DialogHeader><DialogTitle className="text-[#2d4a3e]">{selectedStudent.name} için gelişim özeti</DialogTitle></DialogHeader>
                   <div className="space-y-5 py-2">
                     <div>
                       <label className="text-sm font-bold text-[#e89b7b]">Güçlü Yönleri</label>
                       <textarea value={strengthsDraft} onChange={(event) => setStrengthsDraft(event.target.value)} className="mt-2 h-32 w-full resize-none rounded-2xl border border-[#f2d8cc] bg-[#fffaf7] p-4 text-sm outline-none focus:border-[#e89b7b]" placeholder={'Her satıra bir güçlü yön yaz\nÖrn: Hızlı kavrama'} />
                     </div>
                     <div>
                       <label className="text-sm font-bold text-[#9d84b2]">Güçlendirdiğimiz Alanlar</label>
                       <textarea value={areasDraft} onChange={(event) => setAreasDraft(event.target.value)} className="mt-2 h-32 w-full resize-none rounded-2xl border border-[#ded3e7] bg-[#fbf9fd] p-4 text-sm outline-none focus:border-[#b098c4]" placeholder={'Her satıra bir gelişim alanı yaz\nÖrn: Konuşma akıcılığı'} />
                     </div>
                     <Button onClick={() => void handleSaveDevelopment()} className="w-full rounded-xl bg-[#6b8e7c] text-white hover:bg-[#5a7868]">Kaydet ve öğrenciyle paylaş</Button>
                   </div>
                 </DialogContent>
               </Dialog>
             </div>

             {/* Achievements */}
             <div className="bg-white rounded-3xl p-6 shadow-sm border border-[#eef3f0] mt-6">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="font-bold text-[#2d4a3e] text-lg flex items-center gap-2">🎯 Bu Yılın Kazanımları</h3>
                  <div className="flex items-center gap-3">
                    <span className="text-sm text-slate-400">Toplam {displayAchievements.length} kazanım</span>
                    <Dialog open={isAchievementOpen} onOpenChange={(open) => { setIsAchievementOpen(open); if (!open) resetAchievementDraft(); }}>
                      <Button size="sm" onClick={openNewAchievementDialog} className="rounded-xl bg-[#6b8e7c] text-white hover:bg-[#5a7868]"><Plus className="mr-2 h-4 w-4" /> Kazanım ekle</Button>
                      <DialogContent className="sm:max-w-lg rounded-3xl">
                        <DialogHeader><DialogTitle className="text-[#2d4a3e]">{editingAchievementId ? 'Kazanımı düzenle' : 'Yeni kazanım ekle'}</DialogTitle></DialogHeader>
                        <div className="space-y-4 py-2">
                          <div><label className="text-xs font-bold text-slate-500">Kazanım başlığı</label><Input value={newAchievement.title} onChange={(event) => setNewAchievement((current) => ({ ...current, title: event.target.value }))} className="mt-1 rounded-xl" placeholder="Örn: Günlük rutinimi akıcı anlatabilme" /></div>
                          <div><label className="text-xs font-bold text-slate-500">Detay</label><textarea value={newAchievement.description} onChange={(event) => setNewAchievement((current) => ({ ...current, description: event.target.value }))} className="mt-1 h-24 w-full resize-none rounded-xl border border-slate-200 p-3 text-sm outline-none focus:border-[#6b8e7c]" placeholder="Bu hedefte ne çalışılacak, öğrenci neyi yapabilir hale gelecek?" /></div>
                          <div><label className="text-xs font-bold text-slate-500">Kategori</label><select value={newAchievement.category} onChange={(event) => setNewAchievement((current) => ({ ...current, category: event.target.value as Achievement['category'] }))} className="mt-1 h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm">{achievementCategories.map((category) => <option key={category}>{category}</option>)}</select></div>
                          <div className="rounded-2xl border border-[#dbe7df] bg-[#f7faf8] p-4">
                            <div className="mb-4 flex items-center justify-between gap-3"><div><p className="text-sm font-bold text-[#2d4a3e]">Başlangıç ilerlemesi</p><p className="mt-1 text-xs text-slate-500">Durum yüzdeye göre otomatik belirlenir.</p></div><span className="rounded-xl bg-white px-3 py-2 text-lg font-black text-[#6b8e7c]">%{newAchievement.progress}</span></div>
                            <Slider value={[newAchievement.progress]} min={0} max={100} step={5} onValueChange={([progress]) => setNewAchievement((current) => ({ ...current, progress, status: progressToAchievementStatus(progress) }))} className="[&_[role=slider]]:border-[#6b8e7c] [&_[role=slider]]:bg-white [&>span:first-child>span]:bg-[#6b8e7c]" />
                            <div className="mt-3 flex justify-between text-[10px] font-medium text-slate-400"><span>Başlamadı</span><span>Çalışılıyor</span><span>Tamamlandı</span></div>
                            <p className="mt-3 text-center text-xs font-bold text-[#6b8e7c]">{progressToAchievementStatus(newAchievement.progress)}</p>
                          </div>
                          {achievementError && <p className="rounded-xl bg-red-50 p-3 text-xs font-medium text-red-600">{achievementError}</p>}
                          <Button onClick={() => void handleSaveAchievement()} disabled={!newAchievement.title.trim()} className="w-full rounded-xl bg-[#6b8e7c] text-white hover:bg-[#5a7868]">{editingAchievementId ? 'Değişiklikleri kaydet' : 'Kazanımı kaydet ve paylaş'}</Button>
                        </div>
                      </DialogContent>
                    </Dialog>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 lg:grid-cols-4 text-center gap-2 mb-6">
                  {achievementStatuses.map((status, index) => (
                    <div key={status} className={`p-3 rounded-xl border ${index === 3 ? 'bg-[#6b8e7c] border-[#5a7868] text-white' : index === 2 ? 'bg-[#eef3f0] border-[#d3e3d9] text-[#2d4a3e]' : index === 1 ? 'bg-[#fff9eb] border-amber-100 text-amber-700' : 'bg-slate-50 border-slate-100 text-slate-700'}`}>
                      <p className="text-xs mb-1 opacity-80">{status}</p>
                      <p className="font-black text-xl">{displayAchievements.filter((achievement) => achievement.status === status).length}</p>
                    </div>
                  ))}
                </div>

                <div className="space-y-3">
                  {displayAchievements.map((achievement) => (
                    <div key={achievement.id} className="grid grid-cols-1 gap-3 rounded-2xl border border-slate-100 bg-[#fcfbf9] p-4 lg:grid-cols-[minmax(0,1fr)_190px_76px] lg:items-center">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2"><p className="font-bold text-[#2d4a3e]">{achievement.title}</p><span className="rounded-full bg-white px-2 py-1 text-[10px] font-semibold text-[#6b8e7c]">{achievement.category}</span></div>
                        <p className="mt-1 text-sm text-slate-500">{achievement.description || 'Bu kazanım için henüz detay eklenmedi.'}</p>
                      </div>
                      <div className="min-w-0"><div className="mb-2 flex items-center justify-between text-[10px] font-bold text-[#6b8e7c]"><span>{achievement.status}</span><span>%{achievement.progress ?? (achievementStatuses.indexOf(achievement.status) * 30 + (achievement.status === 'Başardım' ? 10 : 0))}</span></div><Slider defaultValue={[achievement.progress ?? (achievementStatuses.indexOf(achievement.status) * 30 + (achievement.status === 'Başardım' ? 10 : 0))]} min={0} max={100} step={5} onValueCommit={([progress]) => void handleAchievementProgress(achievement.id, progress)} className="[&_[role=slider]]:h-4 [&_[role=slider]]:w-4 [&_[role=slider]]:border-[#6b8e7c] [&>span:first-child>span]:bg-[#6b8e7c]" /></div>
                      <div className="flex items-center gap-1">
                        <button onClick={() => openEditAchievementDialog(achievement)} title="Kazanımı düzenle" className="flex h-9 w-9 items-center justify-center rounded-xl text-[#6b8e7c] hover:bg-[#eef3f0]"><Pencil className="h-4 w-4" /></button>
                        <button onClick={() => void handleDeleteAchievement(achievement.id)} title="Kazanımı sil" className="flex h-9 w-9 items-center justify-center rounded-xl text-red-400 hover:bg-red-50 hover:text-red-600"><Trash2 className="h-4 w-4" /></button>
                      </div>
                    </div>
                  ))}
                  {!displayAchievements.length && <div className="rounded-2xl border border-dashed border-[#dbe7df] p-7 text-center"><p className="font-semibold text-[#2d4a3e]">Henüz kazanım eklenmedi</p><p className="mt-1 text-sm text-slate-500">İlk hedefi eklediğinde öğrenci tarafında da görünecek.</p></div>}
                </div>
             </div>

             {/* Message Input & History */}
             <div className="bg-white rounded-3xl p-6 shadow-sm border border-[#eef3f0] mt-6 mb-12">
               <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                 <h3 className="font-bold text-[#2d4a3e] text-lg flex items-center gap-2">
                   ✉️ Tuba'dan Mesaj
                 </h3>
                 {totalAdminMsgs > 1 && (
                   <div className="flex items-center gap-1.5">
                     <div className="flex items-center gap-1 bg-[#fcfbf9] border border-[#dbe7df] rounded-full p-0.5 shadow-xs">
                       <button
                         type="button"
                         onClick={() => setAdminMsgIndex(Math.max(0, currentAdminIndex - 1))}
                         disabled={currentAdminIndex <= 0}
                         aria-label="Önceki gönderilen mesaj"
                         title="Önceki gönderilen mesaj"
                         className="p-1 rounded-full text-[#6b8e7c] hover:bg-[#eef3f0] disabled:opacity-30 disabled:cursor-not-allowed transition-all cursor-pointer"
                       >
                         <ChevronLeft className="h-4 w-4" />
                       </button>
                       <span className="text-[11px] font-semibold text-[#2d4a3e] px-1.5 select-none">
                         {currentAdminIndex + 1} / {totalAdminMsgs}
                       </span>
                       <button
                         type="button"
                         onClick={() => setAdminMsgIndex(Math.min(totalAdminMsgs - 1, currentAdminIndex + 1))}
                         disabled={currentAdminIndex >= totalAdminMsgs - 1}
                         aria-label="Sonraki gönderilen mesaj"
                         title="Sonraki gönderilen mesaj"
                         className="p-1 rounded-full text-[#6b8e7c] hover:bg-[#eef3f0] disabled:opacity-30 disabled:cursor-not-allowed transition-all cursor-pointer"
                       >
                         <ChevronRight className="h-4 w-4" />
                       </button>
                     </div>
                     <span className="text-xs text-[#6b8e7c] bg-[#eef3f0] px-3 py-1 rounded-full font-medium">
                       {currentAdminIndex === totalAdminMsgs - 1 ? `${formatMessageDateBadge(currentAdminMsg?.date)} • En Yeni` : formatMessageDateBadge(currentAdminMsg?.date)}
                     </span>
                   </div>
                 )}
               </div>

               {/* 1. Student's message / note (if any) */}
               {currentStudentNote && (
                 <div className="mb-4 rounded-2xl bg-[#eef3f0] p-4 text-[#2d4a3e] border border-[#dbe7df]">
                   <div className="flex items-center justify-between mb-2">
                     <span className="text-xs font-bold text-[#3b5e4d] flex items-center gap-1.5">
                       💬 {selectedStudent.name}'ın Notu
                     </span>
                     <div className="flex items-center gap-2">
                       {totalStudentNotes > 1 && (
                         <div className="flex items-center gap-1 bg-white/90 border border-[#bfd4c7] rounded-full px-1.5 py-0.5 text-[10px]">
                           <button
                             type="button"
                             onClick={() => setStudentMsgIndex(Math.max(0, currentStudentIndex - 1))}
                             disabled={currentStudentIndex <= 0}
                             aria-label="Önceki öğrenci notu"
                             title="Önceki not"
                             className="p-0.5 rounded-full hover:bg-slate-100 disabled:opacity-30 cursor-pointer"
                           >
                             <ChevronLeft className="h-3 w-3" />
                           </button>
                           <span className="font-semibold text-slate-600 px-1 select-none">
                             {currentStudentIndex + 1} / {totalStudentNotes}
                           </span>
                           <button
                             type="button"
                             onClick={() => setStudentMsgIndex(Math.min(totalStudentNotes - 1, currentStudentIndex + 1))}
                             disabled={currentStudentIndex >= totalStudentNotes - 1}
                             aria-label="Sonraki öğrenci notu"
                             title="Sonraki not"
                             className="p-0.5 rounded-full hover:bg-slate-100 disabled:opacity-30 cursor-pointer"
                           >
                             <ChevronRight className="h-3 w-3" />
                           </button>
                         </div>
                       )}
                       <span className="text-[11px] text-slate-500 font-medium">
                         {formatMessageTime(currentStudentNote.date)}
                       </span>
                     </div>
                   </div>
                   <p className="text-sm leading-relaxed whitespace-pre-wrap">{currentStudentNote.content}</p>
                 </div>
               )}

               {/* 2. Teacher's sent message & Student's reaction */}
               {currentAdminMsg ? (
                 <div className="mb-4 rounded-2xl bg-[#fffaf5] p-4 border border-[#ffe4c4] text-[#6b503b]">
                   <div className="flex items-center justify-between mb-2">
                     <span className="text-xs font-bold text-[#d98a5e] flex items-center gap-1.5">
                       📤 Öğrenciye Gönderdiğin Mesaj
                     </span>
                     <span className="text-xs text-[#b88c67] font-medium">
                       {formatMessageTime(currentAdminMsg.date)}
                     </span>
                   </div>

                   <p className="text-sm leading-relaxed whitespace-pre-wrap mb-3 text-[#4a3b2c]">
                     {currentAdminMsg.content}
                   </p>

                   <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-[#ffe4c4]/70">
                      {(() => {
                        const contentKey = currentAdminMsg.content ? `content:${currentAdminMsg.content.trim()}` : '';
                        const activeMsgReaction =
                          currentAdminMsg.emojiReaction ||
                          (currentAdminMsg.id ? bridgedReactions[currentAdminMsg.id] : undefined) ||
                          (contentKey ? bridgedReactions[contentKey] : undefined);
                        const latestStudentReaction =
                          bridgedReactions.__latest ||
                          (selectedStudent as any)?.lastEmojiReaction ||
                          [...adminTeacherMessages].reverse().find((m) => Boolean(m.emojiReaction))?.emojiReaction;

                        return (
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-xs text-[#8c6d46] font-medium">Öğrencinin Tepkisi:</span>
                            {activeMsgReaction ? (
                              <span className="inline-flex items-center gap-1.5 bg-white border border-[#d98a5e] px-3 py-1 rounded-full text-xs font-bold text-[#d98a5e] shadow-xs">
                                {formatReactionText(activeMsgReaction)}
                              </span>
                            ) : latestStudentReaction ? (
                              <div className="flex flex-wrap items-center gap-1.5">
                                <span className="inline-flex items-center gap-1 bg-white border border-[#d98a5e] px-2.5 py-1 rounded-full text-xs font-bold text-[#d98a5e] shadow-xs">
                                  {formatReactionText(latestStudentReaction)}
                                </span>
                                <span className="text-[11px] text-slate-400 italic">
                                  (Önceki mesaja verildi)
                                </span>
                              </div>
                            ) : (
                              <span className="text-xs text-slate-400 italic bg-white/70 px-2.5 py-1 rounded-full border border-slate-200">
                                Öğrenci henüz tepki vermedi
                              </span>
                            )}
                          </div>
                        );
                      })()}

                     {totalAdminMsgs > 1 && (
                       <div className="flex items-center gap-2">
                         <button
                           type="button"
                           onClick={() => setAdminMsgIndex(Math.max(0, currentAdminIndex - 1))}
                           disabled={currentAdminIndex <= 0}
                           className="inline-flex items-center gap-1 text-xs font-medium text-[#b88c67] hover:text-[#d98a5e] disabled:opacity-30 disabled:hover:text-[#b88c67] transition-colors cursor-pointer"
                         >
                           <ChevronLeft className="h-3.5 w-3.5" /> Önceki
                         </button>
                         <div className="flex items-center gap-1">
                           {adminTeacherMessages.map((m, idx) => (
                             <button
                               key={m.id || idx}
                               type="button"
                               onClick={() => setAdminMsgIndex(idx)}
                               className={`h-2 rounded-full transition-all cursor-pointer ${
                                 idx === currentAdminIndex ? 'w-4 bg-[#d98a5e]' : 'w-2 bg-[#ffe4c4] hover:bg-[#f6cbb0]'
                               }`}
                               title={`${idx + 1}. Mesaj`}
                             />
                           ))}
                         </div>
                         <button
                           type="button"
                           onClick={() => setAdminMsgIndex(Math.min(totalAdminMsgs - 1, currentAdminIndex + 1))}
                           disabled={currentAdminIndex >= totalAdminMsgs - 1}
                           className="inline-flex items-center gap-1 text-xs font-medium text-[#b88c67] hover:text-[#d98a5e] disabled:opacity-30 disabled:hover:text-[#b88c67] transition-colors cursor-pointer"
                         >
                           Sonraki <ChevronRight className="h-3.5 w-3.5" />
                         </button>
                       </div>
                     )}
                   </div>
                 </div>
               ) : (
                 !currentStudentNote && (
                   <div className="mb-4 rounded-2xl border border-dashed border-[#dbe7df] p-4 text-center text-sm text-slate-400">
                     Henüz {selectedStudent.name} ile bir mesajlaşma geçmişi yok. İlk mesajını aşağıdan gönderebilirsin.
                   </div>
                 )
               )}

               {/* 3. Input to send a new message */}
               <div className="flex flex-col gap-2 sm:flex-row">
                 <Input
                   value={teacherMessage}
                   onChange={(event) => setTeacherMessage(event.target.value)}
                   onKeyDown={(event) => {
                     if (event.key === 'Enter' && !event.shiftKey) {
                       event.preventDefault();
                       void handleSendTeacherMessage();
                     }
                   }}
                   className="h-12 bg-slate-50 border-none rounded-xl"
                   placeholder={`${selectedStudent.preferredName || selectedStudent.name}'a bir mesaj yaz...`}
                 />
                 <Button
                   onClick={handleSendTeacherMessage}
                   disabled={isSendingMessage || !teacherMessage.trim()}
                   className="h-12 shrink-0 rounded-xl bg-[#6b8e7c] px-6 text-white hover:bg-[#5a7868] cursor-pointer"
                 >
                   <Send className="mr-2 h-4 w-4" /> {isSendingMessage ? 'Gönderiliyor' : 'Gönder'}
                 </Button>
               </div>
               {messageError && <p className="mt-2 text-xs font-medium text-red-500">{messageError}</p>}
             </div>
             </>
             )}
          </div>

          {/* COLUMN 3: Right Sidebar (Calendar & Feed) */}
          <div className="grid w-full shrink-0 grid-cols-1 gap-6 border-t border-[#eef3f0] bg-white p-4 sm:p-6 md:grid-cols-2 xl:w-80 xl:block xl:overflow-y-auto xl:border-l xl:border-t-0">
            
            {/* Calendar */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-[#2d4a3e] flex items-center gap-2"><CalendarIcon className="h-4 w-4"/> Yaklaşan Tüm Dersler</h3>
                <button onClick={() => setActiveTab('Ders Takvimi')} className="text-xs text-slate-400 hover:text-[#6b8e7c]">Tümünü Gör →</button>
              </div>
              
              {/* Mini Calendar visualization */}
              <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100">
                <div className="flex justify-between items-center mb-4">
                  <button aria-label="Önceki ay" onClick={() => setCalendarMonth((date) => new Date(date.getFullYear(), date.getMonth() - 1, 1))}><ChevronLeft className="h-4 w-4 text-slate-400 cursor-pointer"/></button>
                  <span className="font-bold text-sm text-slate-700 capitalize">{monthFormatter.format(calendarMonth)}</span>
                  <button aria-label="Sonraki ay" onClick={() => setCalendarMonth((date) => new Date(date.getFullYear(), date.getMonth() + 1, 1))}><ChevronRight className="h-4 w-4 text-slate-400 cursor-pointer"/></button>
                </div>
                <div className="grid grid-cols-7 text-center text-xs font-medium text-slate-400 mb-2">
                  <div>Pzt</div><div>Sal</div><div>Çar</div><div>Per</div><div>Cum</div><div>Cts</div><div>Paz</div>
                </div>
                <div className="grid grid-cols-7 text-center text-xs gap-y-1">
                  {calendarDays.map(({ day, isCurrentMonth, lessons }, index) => (
                    <div key={index} className="flex h-7 items-center justify-center">
                      {isCurrentMonth && <span className={`flex h-7 w-7 items-center justify-center rounded-full ${lessons.length ? 'bg-[#6b8e7c] font-bold text-white' : 'text-slate-600'}`}>{day}</span>}
                    </div>
                  ))}
                </div>
              </div>

              {/* Agenda */}
              <div className="mt-4 max-h-80 space-y-3 overflow-y-auto pr-1">
                {upcomingLessons.map((lesson) => {
                  const lessonStudent = allStudents.find((student) => student.id === lesson.studentId);
                  return (
                    <button key={lesson.id} onClick={() => { setSelectedStudentId(lesson.studentId); setActiveTab('Ana Sayfa'); }} className="flex w-full gap-3 text-left">
                      <div className="w-1 shrink-0 rounded-full" style={{ backgroundColor: lessonStudent?.color || '#6b8e7c' }} />
                      <div className="flex-1 rounded-xl border border-slate-100 bg-white p-3 shadow-sm transition-colors hover:border-[#bfd4c7]">
                        <div className="flex items-center justify-between gap-2"><p className="text-xs font-bold text-slate-700">{lesson.date.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}</p><p className="text-[9px] text-slate-400 capitalize">{lesson.date.toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' })}</p></div>
                        <p className="text-sm font-medium text-[#2d4a3e] mt-0.5">{lesson.studentName || lessonStudent?.name || 'Öğrenci'}</p>
                        <p className="mt-1 line-clamp-1 text-[10px] text-slate-400">{lesson.topic || 'Online Türkçe dersi'}</p>
                      </div>
                    </button>
                  );
                })}
                {!upcomingLessons.length && <div className="rounded-xl border border-dashed border-[#dbe7df] p-4 text-center"><p className="text-xs font-semibold text-[#2d4a3e]">Yaklaşan ders yok</p><p className="mt-1 text-[10px] text-slate-400">Planlanan tüm dersler burada görünecek.</p></div>}
              </div>
            </div>

            {/* Feedback Feed */}
            <div className="mt-4 border-t border-slate-100 pt-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-[#2d4a3e] flex items-center gap-2"><MessageSquare className="h-4 w-4"/> Son Duygu Paylaşımı</h3>
                <span className="text-[10px] text-slate-400">Mesajlardan ayrı</span>
              </div>

              <div className="bg-[#fcfbf9] rounded-2xl p-4 border border-slate-100">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Avatar className="h-6 w-6"><AvatarImage src={selectedStudent?.avatar}/></Avatar>
                    <div>
                      <p className="text-xs font-bold text-[#2d4a3e]">{selectedStudent?.name || 'Öğrenci'}</p>
                      <p className="text-[9px] text-slate-400">{latestCheckIn?.date ? formatMessageTime(latestCheckIn.date) : 'Henüz paylaşım yok'}</p>
                    </div>
                  </div>
                  {latestCheckIn?.mood && <span className="rounded-full bg-[#eef3f0] px-2 py-1 text-[10px] font-bold text-[#6b8e7c]">{latestCheckIn.mood}</span>}
                </div>
                <p className="text-xs text-slate-600 italic">{latestCheckIn?.note ? `“${latestCheckIn.note}”` : 'Öğrenci haftalık duygu kartını doldurduğunda notu burada görünecek.'}</p>
              </div>
            </div>

            {/* Next lesson request */}
            <div className="mt-4 border-t border-slate-100 pt-6">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="flex items-center gap-2 font-bold text-[#2d4a3e]"><span>🎯</span> Gelecek Derste Ne Yapalım?</h3>
                <span className="text-[10px] text-slate-400">Öğrenci seçimi</span>
              </div>

              <div className="rounded-2xl border border-[#dbe7df] bg-[#f5faf7] p-4">
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-white text-xl shadow-sm">
                    {selectedStudent?.nextLessonRequest === 'Daha fazla konuşma pratiği'
                      ? '💬'
                      : selectedStudent?.nextLessonRequest === 'Yeni kelimeler ve ifadeler'
                        ? '📒'
                        : selectedStudent?.nextLessonRequest === 'Bir metin üzerinde çalışma'
                          ? '📖'
                          : '✨'}
                  </div>
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-[#6b8e7c]">{selectedStudent?.name || 'Öğrenci'} seçti</p>
                    <p className="mt-1 text-sm font-bold leading-snug text-[#2d4a3e]">
                      {selectedStudent?.nextLessonRequest || 'Henüz bir seçim yapılmadı'}
                    </p>
                    {!selectedStudent?.nextLessonRequest && (
                      <p className="mt-1 text-[10px] leading-relaxed text-slate-400">Öğrenci seçim yaptığında burada görünecek.</p>
                    )}
                  </div>
                </div>
              </div>
            </div>

          </div>
        </main>
        ) : (
          <main className="min-w-0 flex-1 overflow-y-auto bg-[#fcfbf9] p-3 sm:p-5 xl:p-8">
            <div className="max-w-6xl mx-auto space-y-6">
              <div className="flex flex-col items-start justify-between gap-4 sm:flex-row">
                <div>
                  <h3 className="text-2xl font-black text-[#2d4a3e]">{activeTab}</h3>
                  <p className="text-sm text-slate-500 mt-1">
                    {activeTab === 'Ders Takvimi'
                      ? 'Tüm öğrencilerinin derslerini tek takvimden yönet.'
                      : activeTab === 'Ödevler'
                        ? 'Tüm öğrencilerinin ödevlerini tek yerden oluştur ve takip et.'
                      : activeTab === 'Mesajlar'
                        ? 'Tüm öğrencilerinle olan konuşmalarını tek yerden yönet.'
                      : selectedStudent ? `${selectedStudent.name} ile bağlantılı kayıtları buradan yönet.` : 'Bir öğrenci seçerek kayıtları düzenle.'}
                  </p>
                </div>
                <Button onClick={() => setActiveTab('Ana Sayfa')} variant="outline" className="rounded-xl border-[#dbe7df] text-[#2d4a3e]">
                  Öğrenciye dön
                </Button>
              </div>

              {activeTab === 'Ders Takvimi' && (
                <div className="grid grid-cols-1 gap-4 xl:grid-cols-12 xl:gap-6">
                  <section className="xl:col-span-8 bg-white rounded-3xl border border-[#eef3f0] shadow-sm p-6">
                    <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
                      <div className="flex items-center gap-3">
                        <h4 className="font-bold text-[#2d4a3e] flex items-center gap-2 capitalize"><CalendarIcon className="h-5 w-5" /> {monthFormatter.format(calendarMonth)} Ders Planı</h4>
                        <div className="flex rounded-xl border border-[#dbe7df] overflow-hidden">
                          <button aria-label="Önceki ay" onClick={() => setCalendarMonth((date) => new Date(date.getFullYear(), date.getMonth() - 1, 1))} className="p-2 hover:bg-[#eef3f0]"><ChevronLeft className="h-4 w-4" /></button>
                          <button aria-label="Sonraki ay" onClick={() => setCalendarMonth((date) => new Date(date.getFullYear(), date.getMonth() + 1, 1))} className="p-2 border-l border-[#dbe7df] hover:bg-[#eef3f0]"><ChevronRight className="h-4 w-4" /></button>
                        </div>
                      </div>
                      <Dialog open={isLessonOpen} onOpenChange={(open) => { setIsLessonOpen(open); if (open && !newLesson.studentId) setNewLesson((current) => ({ ...current, studentId: selectedStudent?.id || allStudents[0]?.id || '' })); }}>
                        <DialogTrigger asChild><Button size="sm" className="rounded-xl bg-[#e89b7b] hover:bg-[#d58c6e] text-white"><Plus className="h-4 w-4 mr-2" /> Ders Planla</Button></DialogTrigger>
                        <DialogContent className="sm:max-w-lg rounded-3xl">
                          <DialogHeader><DialogTitle className="text-[#2d4a3e]">Yeni ders planla</DialogTitle></DialogHeader>
                          <div className="space-y-4 py-2">
                            <div><label className="text-xs font-bold text-slate-500">Öğrenci</label><select value={newLesson.studentId} onChange={(event) => setNewLesson((current) => ({ ...current, studentId: event.target.value }))} className="mt-1 h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm"><option value="">Öğrenci seç</option>{allStudents.map((student) => <option key={student.id} value={student.id}>{student.name}</option>)}</select></div>
                            <div className="grid grid-cols-2 gap-3"><div><label className="text-xs font-bold text-slate-500">Tarih</label><Input type="date" value={newLesson.date} onChange={(event) => setNewLesson((current) => ({ ...current, date: event.target.value }))} className="mt-1 rounded-xl" /></div><div><label className="text-xs font-bold text-slate-500">Saat (İrlanda)</label><Input type="time" value={newLesson.time} onChange={(event) => setNewLesson((current) => ({ ...current, time: event.target.value }))} className="mt-1 rounded-xl" /></div></div>
                            <div className="rounded-2xl border border-sky-100 bg-sky-50/70 p-4 text-xs leading-relaxed text-slate-600"><p className="font-bold text-[#2d4a3e]">Saat dilimi dönüşümü</p><p className="mt-1">Siz dersi İrlanda saatine göre planlıyorsunuz. Seçili öğrenciye ders, <span className="font-semibold">{timeZoneLabel(allStudents.find((student) => student.id === newLesson.studentId)?.timeZone || defaultTimeZoneForCountry(allStudents.find((student) => student.id === newLesson.studentId)?.country))}</span> saatine göre gösterilecek. Yaz/kış saati otomatik hesaplanır.</p></div>
                            <div className="rounded-2xl border border-[#dbe7df] bg-[#eef3f0]/60 p-4"><p className="text-sm font-semibold text-[#2d4a3e]">8 haftalık plan nasıl çalışır?</p><p className="mt-1 text-xs leading-relaxed text-slate-500">Seçtiğin başlangıç gününden itibaren aynı gün ve saatte, birer hafta arayla 8 ders takvime eklenir.</p></div>
                            <div className="grid grid-cols-2 gap-3">
                              <Button variant="outline" onClick={() => void handleAddLesson(1)} disabled={!newLesson.studentId || !newLesson.date || !newLesson.time} className="h-11 rounded-xl border-[#dbe7df] text-[#2d4a3e] hover:bg-[#eef3f0]"><CalendarIcon className="mr-2 h-4 w-4" /> Tek ders planla</Button>
                              <Button onClick={() => void handleAddLesson(8)} disabled={!newLesson.studentId || !newLesson.date || !newLesson.time} className="h-11 rounded-xl bg-[#6b8e7c] text-white hover:bg-[#5a7868]"><CalendarDays className="mr-2 h-4 w-4" /> 8 haftalık planla</Button>
                            </div>
                          </div>
                        </DialogContent>
                      </Dialog>
                    </div>
                    <div className="touch-scroll overflow-x-auto pb-2">
                    <div className="grid min-w-[650px] grid-cols-7 gap-2 text-center text-sm">
                      {['Pzt','Sal','Çar','Per','Cum','Cts','Paz'].map(day => <div key={day} className="text-xs font-bold text-slate-400 py-2">{day}</div>)}
                      {calendarDays.map(({ day, isCurrentMonth, lessons }, index) => (
                          <div key={index} className={`min-h-24 rounded-2xl border p-2 text-left transition-colors overflow-hidden ${lessons.length ? 'bg-[#eef3f0] border-[#bfd4c7] text-[#2d4a3e]' : isCurrentMonth ? 'bg-[#fcfbf9] border-transparent' : 'bg-transparent border-transparent'}`}>
                            <span className="font-bold">{isCurrentMonth ? day : ''}</span>
                            <div className="mt-1 space-y-1">
                              {lessons.slice(0, 3).map((lesson) => (
                                <button key={lesson.id} onClick={() => setLessonToDelete(lesson)} title="Ders ayrıntısını aç" className="block w-full rounded-lg bg-white/80 px-2 py-1 text-left text-[10px] leading-tight border-l-2 hover:bg-white" style={{ borderColor: allStudents.find((student) => student.id === lesson.studentId)?.color || '#6b8e7c' }}>
                                  <p className="font-bold truncate">{lesson.studentName || students.find((student) => student.id === lesson.studentId)?.name || 'Öğrenci'}</p>
                                  <p className="text-slate-500">{lesson.date.toLocaleTimeString('tr-TR', { timeZone: TEACHER_TIME_ZONE, hour: '2-digit', minute: '2-digit' })}</p>
                                </button>
                              ))}
                              {lessons.length > 3 && <p className="text-[10px] font-bold text-[#6b8e7c]">+{lessons.length - 3} ders</p>}
                            </div>
                          </div>
                      ))}
                    </div>
                    </div>
                  </section>
                  <section className="xl:col-span-4 bg-white rounded-3xl border border-[#eef3f0] shadow-sm p-6">
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="font-bold text-[#2d4a3e]">Yaklaşan Dersler</h4>
                      <span className="text-xs font-semibold text-[#6b8e7c]">Tüm öğrenciler</span>
                    </div>
                    {upcomingLessons.length ? upcomingLessons.map((lesson) => (
                      <div key={lesson.id} className="relative w-full p-4 pr-12 mb-3 rounded-2xl border border-slate-100 hover:border-[#6b8e7c] bg-[#fcfbf9] transition-colors">
                        <button onClick={() => { setSelectedStudentId(lesson.studentId); setActiveTab('Ana Sayfa'); }} className="w-full text-left">
                        <div className="flex items-center justify-between gap-3">
                          <p className="text-sm font-bold text-[#2d4a3e]">{lesson.studentName || students.find((student) => student.id === lesson.studentId)?.name || 'Öğrenci'}</p>
                          <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: students.find((student) => student.id === lesson.studentId)?.color || '#6b8e7c' }} />
                        </div>
                        <p className="text-xs text-slate-500 mt-1 capitalize">{lessonDateFormatter.format(lesson.date)}</p>
                        <p className="text-xs font-medium text-[#6b8e7c] mt-1">{lesson.topic || 'Online Türkçe dersi'}</p>
                        </button>
                        <button onClick={() => setLessonToDelete(lesson)} title="Dersi sil" className="absolute right-3 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-lg text-red-400 hover:bg-red-50 hover:text-red-600"><Trash2 className="h-4 w-4" /></button>
                      </div>
                    )) : (
                      <div className="rounded-2xl border border-dashed border-[#dbe7df] bg-[#fcfbf9] p-6 text-center">
                        <CalendarIcon className="h-7 w-7 mx-auto text-[#6b8e7c] mb-2" />
                        <p className="text-sm font-semibold text-[#2d4a3e]">Yaklaşan ders yok</p>
                        <p className="text-xs text-slate-500 mt-1">Planlanan dersler bütün öğrenciler için burada görünecek.</p>
                      </div>
                    )}
                  </section>
                  <Dialog open={Boolean(lessonToDelete)} onOpenChange={(open) => { if (!open) setLessonToDelete(null); }}>
                    <DialogContent className="sm:max-w-sm rounded-3xl">
                      <DialogHeader><DialogTitle className="text-[#2d4a3e]">Ders ayrıntısı</DialogTitle></DialogHeader>
                      {lessonToDelete && <div className="space-y-3"><div className="rounded-2xl bg-[#fcfbf9] p-4"><p className="font-bold text-[#2d4a3e]">{lessonToDelete.studentName}</p><p className="mt-1 text-sm text-slate-500 capitalize">{lessonDateFormatter.format(lessonToDelete.date)}</p><p className="mt-3 text-sm font-medium text-[#6b8e7c]">{lessonToDelete.topic || 'Türkçe dersi'}</p>{lessonToDelete.prepNote && <p className="mt-2 text-xs text-slate-500">{lessonToDelete.prepNote}</p>}</div><div className="flex justify-end gap-2"><Button variant="outline" onClick={() => setLessonToDelete(null)} className="rounded-xl">Kapat</Button><Button onClick={() => void handleDeleteLesson()} className="rounded-xl bg-red-500 text-white hover:bg-red-600"><Trash2 className="mr-2 h-4 w-4" /> Dersi sil</Button></div></div>}
                    </DialogContent>
                  </Dialog>
                </div>
              )}

              {activeTab === 'Ödevler' && (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                    <section className="rounded-2xl border border-[#eef3f0] bg-white p-5 shadow-sm"><p className="text-xs text-slate-500">Toplam ödev</p><p className="mt-1 text-3xl font-black text-[#2d4a3e]">{allStudents.reduce((total, student) => total + (student.homeworks?.length || 0), 0)}</p></section>
                    <section className="rounded-2xl border border-amber-100 bg-[#fff9eb] p-5 shadow-sm"><p className="text-xs text-amber-700">Devam eden</p><p className="mt-1 text-3xl font-black text-amber-700">{allStudents.reduce((total, student) => total + (student.homeworks?.filter((homework) => homework.status === 'assigned').length || 0), 0)}</p></section>
                    <section className="rounded-2xl border border-[#d3e3d9] bg-[#eef3f0] p-5 shadow-sm"><p className="text-xs text-[#6b8e7c]">Tamamlanan</p><p className="mt-1 text-3xl font-black text-[#2d4a3e]">{allStudents.reduce((total, student) => total + (student.homeworks?.filter((homework) => homework.status === 'completed').length || 0), 0)}</p></section>
                  </div>

                  <section className="rounded-3xl border border-[#eef3f0] bg-white p-6 shadow-sm">
                    <div className="mb-5 flex flex-col items-stretch justify-between gap-3 sm:flex-row sm:flex-wrap sm:items-center">
                      <div>
                        <h4 className="font-bold text-[#2d4a3e]">Tüm Ödevler</h4>
                        <p className="mt-1 text-xs text-slate-500">Öğrenciye göre filtrele veya yeni bir ödev ata.</p>
                      </div>
                      <div className="flex flex-col gap-2 sm:flex-row">
                        <select value={homeworkFilterId} onChange={(event) => setHomeworkFilterId(event.target.value)} className="h-10 min-w-0 rounded-xl border border-[#dbe7df] bg-white px-3 text-sm text-[#2d4a3e]"><option value="all">Tüm öğrenciler</option>{allStudents.map((student) => <option key={student.id} value={student.id}>{student.name}</option>)}</select>
                        <Dialog open={isHomeworkOpen} onOpenChange={(open) => { setIsHomeworkOpen(open); if (open && !newHomework.studentId) setNewHomework((current) => ({ ...current, studentId: selectedStudent?.id || allStudents[0]?.id || '' })); }}>
                          <DialogTrigger asChild><Button className="rounded-xl bg-[#b098c4] text-white hover:bg-[#9d84b2]"><Plus className="mr-2 h-4 w-4" /> Yeni ödev</Button></DialogTrigger>
                          <DialogContent className="sm:max-w-lg rounded-3xl">
                            <DialogHeader><DialogTitle className="text-[#2d4a3e]">Yeni ödev ata</DialogTitle></DialogHeader>
                            <div className="space-y-4 py-2">
                              <div><label className="text-xs font-bold text-slate-500">Öğrenci</label><select value={newHomework.studentId} onChange={(event) => setNewHomework((current) => ({ ...current, studentId: event.target.value }))} className="mt-1 h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm"><option value="">Öğrenci seç</option>{allStudents.map((student) => <option key={student.id} value={student.id}>{student.name}</option>)}</select></div>
                              <div><label className="text-xs font-bold text-slate-500">Ödev başlığı</label><Input value={newHomework.title} onChange={(event) => setNewHomework((current) => ({ ...current, title: event.target.value }))} className="mt-1 rounded-xl" placeholder="Örn: 5 yeni kelimeyle günlük yazısı" /></div>
                              <div><label className="text-xs font-bold text-slate-500">Açıklama</label><textarea value={newHomework.description} onChange={(event) => setNewHomework((current) => ({ ...current, description: event.target.value }))} className="mt-1 h-24 w-full resize-none rounded-xl border border-slate-200 p-3 text-sm outline-none focus:border-[#6b8e7c]" placeholder="Öğrencinin yapması gerekenleri açıkla..." /></div>
                              <div><label className="text-xs font-bold text-slate-500">Teslim tarihi</label><Input type="date" value={newHomework.dueDate} onChange={(event) => setNewHomework((current) => ({ ...current, dueDate: event.target.value }))} className="mt-1 rounded-xl" /></div>
                              <Button onClick={() => void handleAddHomework()} disabled={!newHomework.studentId || !newHomework.title.trim()} className="w-full rounded-xl bg-[#6b8e7c] text-white hover:bg-[#5a7868]">Ödevi ata ve öğrenciyle paylaş</Button>
                            </div>
                          </DialogContent>
                        </Dialog>
                      </div>
                    </div>

                    <div className="space-y-3">
                      {allHomeworks.map(({ student, ...homework }) => (
                        <article key={`${student.id}-${homework.id}`} className="grid grid-cols-1 gap-3 rounded-2xl border border-slate-100 bg-[#fcfbf9] p-4 md:grid-cols-[220px_minmax(0,1fr)_auto] md:items-center">
                          <button onClick={() => { setSelectedStudentId(student.id); setActiveTab('Ana Sayfa'); }} className="flex items-center gap-3 text-left"><Avatar className="h-10 w-10"><AvatarImage src={student.avatar} /><AvatarFallback>{student.name[0]}</AvatarFallback></Avatar><div><p className="text-sm font-bold text-[#2d4a3e]">{student.name}</p><p className="text-[10px] text-slate-400">{student.currentLevel || 'Seviye belirtilmedi'}</p></div></button>
                          <div><div className="flex flex-wrap items-center gap-2"><h5 className={`font-bold ${homework.status === 'completed' ? 'text-slate-400 line-through' : 'text-[#2d4a3e]'}`}>{homework.title}</h5><span className={`rounded-full px-2 py-1 text-[10px] font-bold ${homework.status === 'completed' ? 'bg-[#eef3f0] text-[#6b8e7c]' : 'bg-[#fff9eb] text-amber-700'}`}>{homework.status === 'completed' ? 'Tamamlandı' : 'Devam ediyor'}</span></div><p className="mt-1 text-sm text-slate-500">{homework.description || 'Açıklama eklenmedi.'}</p>{homework.dueDate && <p className="mt-2 text-xs font-medium text-[#b098c4]">Teslim: {new Date(`${homework.dueDate}T00:00:00`).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' })}</p>}</div>
                          <div className="flex items-center gap-2"><Button size="sm" variant="outline" onClick={() => void updateHomeworkList(student, (homeworks) => homeworks.map((item) => item.id === homework.id ? { ...item, status: item.status === 'completed' ? 'assigned' : 'completed' } : item))} className="rounded-xl border-[#dbe7df] text-[#2d4a3e]">{homework.status === 'completed' ? 'Geri al' : 'Tamamlandı'}</Button><button onClick={() => void updateHomeworkList(student, (homeworks) => homeworks.filter((item) => item.id !== homework.id))} title="Ödevi sil" className="flex h-9 w-9 items-center justify-center rounded-xl text-red-400 hover:bg-red-50"><Trash2 className="h-4 w-4" /></button></div>
                        </article>
                      ))}
                      {!allHomeworks.length && <div className="rounded-2xl border border-dashed border-[#dbe7df] p-8 text-center"><BookOpen className="mx-auto mb-2 h-8 w-8 text-[#b098c4]" /><p className="font-semibold text-[#2d4a3e]">Bu filtrede ödev yok</p><p className="mt-1 text-sm text-slate-500">Yeni ödev eklediğinde öğrenci portalında da görünecek.</p></div>}
                    </div>
                  </section>
                </div>
              )}

              {activeTab === 'Kaynaklar' && (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3 xl:gap-6">
                  {['Kelime kartları', 'Okuma metinleri', 'Video linkleri', 'PDF çalışma kağıtları', 'Ders sunumları', 'Paylaşılan klasör'].map((resource) => (
                    <button key={resource} className="bg-white rounded-3xl border border-[#eef3f0] shadow-sm p-6 text-left hover:border-[#6b8e7c] transition-colors">
                      <FileText className="h-7 w-7 text-[#6b8e7c] mb-4" />
                      <h4 className="font-bold text-[#2d4a3e]">{resource}</h4>
                      <p className="text-xs text-slate-500 mt-2">Öğrenci portalında paylaşılabilir kaynak.</p>
                    </button>
                  ))}
                </div>
              )}

              {activeTab === 'Mesajlar' && (
                <div className="grid min-h-[520px] grid-cols-1 overflow-hidden rounded-2xl border border-[#eef3f0] bg-white shadow-sm md:grid-cols-[260px_minmax(0,1fr)] lg:min-h-[620px] lg:grid-cols-[300px_minmax(0,1fr)] lg:rounded-3xl">
                  <aside className="border-b border-[#eef3f0] bg-[#fcfbf9] p-4 lg:border-b-0 lg:border-r">
                    <div className="mb-4 flex items-center justify-between px-2">
                      <h4 className="font-bold text-[#2d4a3e]">Öğrenciler</h4>
                      <span className="rounded-full bg-[#eef3f0] px-2 py-1 text-xs font-bold text-[#6b8e7c]">{allStudents.length}</span>
                    </div>
                    <div className="touch-scroll flex max-h-48 gap-2 overflow-auto pb-1 md:block md:max-h-[540px] md:space-y-2 md:pr-1">
                      {allStudents.map((student) => (
                        <button
                          key={student.id}
                          onClick={() => { setSelectedStudentId(student.id); setTeacherMessage(''); }}
                          className={`flex min-w-[210px] items-center gap-3 rounded-2xl border p-3 text-left transition-colors md:min-w-0 md:w-full ${student.id === selectedStudent?.id ? 'border-[#bfd4c7] bg-[#eef3f0]' : 'border-transparent hover:border-[#dbe7df] hover:bg-white'}`}
                        >
                          <div className="relative shrink-0">
                            <Avatar className="h-11 w-11"><AvatarImage src={student.avatar} /><AvatarFallback>{student.name[0]}</AvatarFallback></Avatar>
                            <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-white" style={{ backgroundColor: student.color }} />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-bold text-[#2d4a3e]">{student.name}</p>
                            <p className="truncate text-xs text-slate-500">{student.status === 'Aktif' ? 'Mesajlaşmaya açık' : 'Pasif öğrenci'}</p>
                          </div>
                          <ChevronRight className={`h-4 w-4 shrink-0 ${student.id === selectedStudent?.id ? 'text-[#6b8e7c]' : 'text-slate-300'}`} />
                        </button>
                      ))}
                      {!allStudents.length && <p className="p-4 text-center text-sm text-slate-400">Henüz öğrenci yok.</p>}
                    </div>
                  </aside>

                  <section className="flex min-w-0 flex-col">
                    {selectedStudent ? (
                      <>
                        <div className="flex items-center gap-3 border-b border-[#eef3f0] px-4 py-3 sm:px-6 sm:py-4">
                          <Avatar className="h-11 w-11"><AvatarImage src={selectedStudent.avatar} /><AvatarFallback>{selectedStudent.name[0]}</AvatarFallback></Avatar>
                          <div>
                            <h4 className="font-bold text-[#2d4a3e]">{selectedStudent.name}</h4>
                            <p className="text-xs text-slate-500">{selectedStudent.currentLevel || 'Seviye belirtilmedi'} · {selectedStudent.status}</p>
                          </div>
                        </div>

                        <div className="flex-1 space-y-3 overflow-y-auto bg-[#fcfbf9] p-3 sm:p-6">
                          {conversationMessages.map((message) => {
                            const isTeacher = message.senderRole === 'admin';
                            return (
                              <div key={message.id} className={`flex ${isTeacher ? 'justify-end' : 'justify-start'}`}>
                                <div className={`max-w-[90%] rounded-2xl px-4 py-3 sm:max-w-[78%] ${isTeacher ? 'rounded-br-md bg-[#6b8e7c] text-white' : 'rounded-bl-md border border-[#eef3f0] bg-white text-[#2d4a3e]'}`}>
                                  <p className="whitespace-pre-wrap break-words text-sm leading-relaxed">{message.content}</p>
                                  <div className={`mt-2 flex items-center gap-2 text-[10px] ${isTeacher ? 'text-white/70' : 'text-slate-400'}`}>
                                    <span>{isTeacher ? 'Tuba' : selectedStudent.name}</span>
                                    <span>{formatMessageTime(message.date)}</span>
                                    {message.emojiReaction && <span>{message.emojiReaction}</span>}
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                          {!conversationMessages.length && (
                            <div className="flex h-full min-h-72 flex-col items-center justify-center text-center">
                              <MessageSquare className="mb-3 h-9 w-9 text-[#bfd4c7]" />
                              <p className="font-semibold text-[#2d4a3e]">Henüz mesaj yok</p>
                              <p className="mt-1 text-sm text-slate-500">{selectedStudent.name} ile ilk mesajı aşağıdan gönderebilirsin.</p>
                            </div>
                          )}
                        </div>

                        <form onSubmit={(event) => { event.preventDefault(); void handleSendTeacherMessage(); }} className="border-t border-[#eef3f0] bg-white p-4">
                          <div className="flex flex-col items-stretch gap-2 rounded-2xl border border-[#dbe7df] bg-[#fcfbf9] p-2 focus-within:border-[#6b8e7c] sm:flex-row sm:items-end sm:gap-3">
                            <textarea
                              value={teacherMessage}
                              onChange={(event) => setTeacherMessage(event.target.value)}
                              onKeyDown={(event) => {
                                if (event.key === 'Enter' && !event.shiftKey) {
                                  event.preventDefault();
                                  void handleSendTeacherMessage();
                                }
                              }}
                              className="min-h-12 max-h-32 flex-1 resize-none bg-transparent p-2 text-sm outline-none"
                              placeholder={`${selectedStudent.preferredName || selectedStudent.name} için bir mesaj yaz...`}
                            />
                            <Button type="submit" disabled={isSendingMessage || !teacherMessage.trim()} className="h-11 shrink-0 rounded-xl bg-[#6b8e7c] px-4 text-white hover:bg-[#5a7868]"><Send className="h-4 w-4 mr-2" /> {isSendingMessage ? 'Gönderiliyor' : 'Gönder'}</Button>
                          </div>
                          {messageError && <p className="mt-2 px-2 text-xs font-medium text-red-500">{messageError}</p>}
                          <p className="mt-2 px-2 text-[11px] text-slate-400">Enter ile gönder · Shift + Enter ile yeni satır</p>
                        </form>
                      </>
                    ) : (
                      <div className="flex h-full items-center justify-center p-8 text-sm text-slate-400">Sohbet etmek için bir öğrenci ekle.</div>
                    )}
                  </section>
                </div>
              )}

              {activeTab === 'Notlar' && (
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:gap-6">
                  {['Ders içi gözlem', 'Veli notu', 'Öğrencinin hedefleri', 'Bir sonraki ders planı'].map((note) => (
                    <section key={note} className="bg-white rounded-3xl border border-[#eef3f0] shadow-sm p-6">
                      <h4 className="font-bold text-[#2d4a3e] mb-3">{note}</h4>
                      <textarea className="w-full h-28 rounded-2xl bg-[#fcfbf9] border border-slate-100 p-3 text-sm outline-none focus:border-[#6b8e7c]" placeholder={`${selectedStudent?.name || 'Öğrenci'} için not yaz...`} />
                      <Button size="sm" className="mt-3 rounded-xl bg-[#6b8e7c] hover:bg-[#5a7868] text-white">Kaydet</Button>
                    </section>
                  ))}
                </div>
              )}

              {activeTab === 'Raporlar' && (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4 xl:gap-6">
                  {[
                    ['Aktif öğrenci', students.length],
                    ['Mesaj', selectedMessages?.length || 0],
                    ['Son duygu', latestCheckIn?.mood || 'Yok'],
                    ['Seçili öğrenci', selectedStudent?.name || '-'],
                  ].map(([label, value]) => (
                    <section key={label} className="bg-white rounded-3xl border border-[#eef3f0] shadow-sm p-6">
                      <p className="text-xs text-slate-500">{label}</p>
                      <p className="text-2xl font-black text-[#2d4a3e] mt-2">{value}</p>
                    </section>
                  ))}
                  <section className="bg-white rounded-3xl border border-[#eef3f0] shadow-sm p-6 sm:col-span-2 xl:col-span-4">
                    <h4 className="font-bold text-[#2d4a3e] mb-4">Öğrenci gelişim özeti</h4>
                    <div className="space-y-4">
                      {['Konuşma', 'Dinleme', 'Okuma', 'Yazma'].map((skill, index) => (
                        <div key={skill}>
                          <div className="flex justify-between text-sm mb-1"><span>{skill}</span><span>{60 + index * 8}%</span></div>
                          <div className="h-3 rounded-full bg-slate-100 overflow-hidden"><div className="h-full bg-[#6b8e7c]" style={{ width: `${60 + index * 8}%` }} /></div>
                        </div>
                      ))}
                    </div>
                  </section>
                </div>
              )}

              {activeTab === 'Ayarlar' && (
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:gap-6">
                  {['Öğrenci portal PIN ayarları', 'Bildirim tercihleri', 'Tema ve görünüm', 'Ders varsayılanları'].map((setting) => (
                    <section key={setting} className="bg-white rounded-3xl border border-[#eef3f0] shadow-sm p-6">
                      <h4 className="font-bold text-[#2d4a3e] mb-2">{setting}</h4>
                      <p className="text-sm text-slate-500 mb-4">Portal deneyimini buradan düzenle.</p>
                      <Button variant="outline" className="rounded-xl border-[#dbe7df] text-[#2d4a3e]">Düzenle</Button>
                    </section>
                  ))}
                </div>
              )}
            </div>
          </main>
        )}
      </div>
    </div>
  );
}
