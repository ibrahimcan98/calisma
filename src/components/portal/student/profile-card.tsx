'use client';

import { useEffect, useState } from 'react';
import { CalendarDays, Edit2, Gift, Globe, Heart, Coffee, Cat, GraduationCap, Target, Sparkles, Check, User } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Student } from '@/lib/types';
import { useFirestore } from '@/firebase';
import { doc, updateDoc, setDoc, type DocumentData } from 'firebase/firestore';
import { toast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { 
  STUDENT_BRIDGE_EVENT, 
  saveBridgedProfile, 
  readBridgedProfile, 
  subscribeBridge, 
  sanitizeForFirestore 
} from '@/lib/student-message-bridge';

type StudentRoot = { userId: string; studentId: string } | null;

export interface FunnyAvatar {
  id: string;
  name: string;
  tag: string;
  emoji: string;
  url: string;
}

export const FUNNY_AVATARS: FunnyAvatar[] = [
  {
    id: 'cool-bot',
    name: 'Gözlüklü Robot',
    tag: 'Dahi Bot',
    emoji: '🤖',
    url: 'https://api.dicebear.com/7.x/bottts/svg?seed=Gizmo&backgroundColor=ffd5dc',
  },
  {
    id: 'crazy-spark',
    name: 'Çılgın Kıvılcım',
    tag: 'Enerjik',
    emoji: '⚡',
    url: 'https://api.dicebear.com/7.x/bottts/svg?seed=Sparky&backgroundColor=ede9fe',
  },
  {
    id: 'space-buddy',
    name: 'Uzay Kaşifi',
    tag: 'Astronot',
    emoji: '🚀',
    url: 'https://api.dicebear.com/7.x/bottts/svg?seed=Cosmo&backgroundColor=dbeafe',
  },
  {
    id: 'happy-smile',
    name: 'Koca Gülümseme',
    tag: 'Neşeli',
    emoji: '😄',
    url: 'https://api.dicebear.com/7.x/big-smile/svg?seed=Felix&backgroundColor=e8f1ec',
  },
  {
    id: 'cute-panda',
    name: 'Neşeli Panda',
    tag: 'Tatlı Panda',
    emoji: '🐼',
    url: 'https://api.dicebear.com/7.x/adventurer/svg?seed=Coco&backgroundColor=fef3c7',
  },
  {
    id: 'clever-fox',
    name: 'Akıllı Tilki',
    tag: 'Kurnaz Tilki',
    emoji: '🦊',
    url: 'https://api.dicebear.com/7.x/adventurer/svg?seed=Milo&backgroundColor=ffedd5',
  },
  {
    id: 'rockstar',
    name: 'Rockstar Kedi',
    tag: 'Müzisyen',
    emoji: '🎸',
    url: 'https://api.dicebear.com/7.x/big-smile/svg?seed=Leo&backgroundColor=fce7f3',
  },
  {
    id: 'super-hero',
    name: 'Süper Kahraman',
    tag: 'Cesur Pelerin',
    emoji: '🦸',
    url: 'https://api.dicebear.com/7.x/adventurer/svg?seed=Buster&backgroundColor=dcfce7',
  },
  {
    id: 'creative-artist',
    name: 'Çılgın Ressam',
    tag: 'Sanatçı',
    emoji: '🎨',
    url: 'https://api.dicebear.com/7.x/notionists/svg?seed=creative-kid&backgroundColor=dbeafe',
  },
  {
    id: 'funny-dino',
    name: 'Komik Dino',
    tag: 'Obur Dino',
    emoji: '🦖',
    url: 'https://api.dicebear.com/7.x/fun-emoji/svg?seed=DinoFun&backgroundColor=fed7aa',
  },
  {
    id: 'froggy-king',
    name: 'Kral Kurbağa',
    tag: 'Vırak Prens',
    emoji: '🐸',
    url: 'https://api.dicebear.com/7.x/fun-emoji/svg?seed=Kermit&backgroundColor=d9f99d',
  },
  {
    id: 'dreamy-star',
    name: 'Yıldız Çocuk',
    tag: 'Hayalperest',
    emoji: '✨',
    url: 'https://api.dicebear.com/7.x/lorelei/svg?seed=SunnySky&backgroundColor=fef08a',
  },
];

export function ProfileCard({
  student,
  studentRoot,
  onStudentUpdate,
}: {
  student: Student;
  studentRoot: StudentRoot;
  onStudentUpdate?: (updated: Partial<Student>) => void;
}) {
  const firestore = useFirestore();
  const [isEditing, setIsEditing] = useState(false);
  const [isAvatarPickerOpen, setIsAvatarPickerOpen] = useState(false);
  const [localStudent, setLocalStudent] = useState<Student>(student);

  useEffect(() => {
    setLocalStudent(student);
  }, [student]);

  // Real-time synchronization across browser tabs/sessions
  useEffect(() => {
    const unsubscribe = subscribeBridge(() => {
      const bridged = readBridgedProfile(student.id, student.name, student.pin);
      if (bridged) {
        setLocalStudent((current) => ({
          ...current,
          ...bridged,
          avatar: bridged.avatar || current.avatar,
          birthDate: bridged.birthDate ? new Date(bridged.birthDate) : current.birthDate,
        }));
      }
    });
    return unsubscribe;
  }, [student.id, student.name, student.pin]);

  const [form, setForm] = useState({
    preferredName: student.preferredName || student.name || '',
    country: student.country || 'Türkiye',
    birthDate: formatDateInput(student.birthDate),
    languages: student.languages?.join(', ') || '',
    interests: student.interests?.join(', ') || '',
    favoriteThings: student.favoriteThings || '',
    petName: student.petName || '',
    avatar: student.avatar || FUNNY_AVATARS[0].url,
  });

  useEffect(() => {
    if (isEditing) {
      setForm({
        preferredName: localStudent.preferredName || localStudent.name || '',
        country: localStudent.country || 'Türkiye',
        birthDate: formatDateInput(localStudent.birthDate),
        languages: localStudent.languages?.join(', ') || '',
        interests: localStudent.interests?.join(', ') || '',
        favoriteThings: localStudent.favoriteThings || '',
        petName: localStudent.petName || '',
        avatar: localStudent.avatar || FUNNY_AVATARS[0].url,
      });
    }
  }, [isEditing, localStudent]);

  const themes = [
    { className: 'bg-[#e8f1ec]', value: 'doğa', icon: '🌿' },
    { className: 'bg-[#fdfaf6]', value: 'sade', icon: '🏛️' },
    { className: 'bg-[#1a2b3c]', value: 'gece', icon: '🌙' },
    { className: 'bg-[#fff5f2]', value: 'kahve', icon: '☕' },
  ];

  const currentAvatar =
    localStudent.avatar ||
    student.avatar ||
    FUNNY_AVATARS[0].url;

  const displayName = localStudent.preferredName || localStudent.name || student.name;

  const updateStudent = async (data: Partial<Student>, message: string) => {
    // 1. Optimistic UI update
    setLocalStudent((current) => ({ ...current, ...data }));
    onStudentUpdate?.(data);

    // 2. Cross-tab & local cache bridge (immediate zero-delay)
    saveBridgedProfile({
      studentId: student.id,
      studentName: student.name,
      pin: student.pin,
      ...data,
      birthDate: data.birthDate instanceof Date ? data.birthDate.toISOString() : (data.birthDate as string | undefined),
    });

    // 3. Firestore persistence
    try {
      const sanitized: DocumentData = sanitizeForFirestore({
        ...data,
        updatedAt: new Date().toISOString(),
      });

      if (studentRoot && studentRoot.userId && studentRoot.userId !== 'dummy') {
        // Direct document update
        try {
          await updateDoc(doc(firestore, 'users', studentRoot.userId, 'students', studentRoot.studentId), sanitized);
        } catch (e) {
          console.warn('Direct student document update failed, syncing via checkIns channel:', e);
        }

        // Subcollection checkIns sync (open permissions)
        await setDoc(doc(firestore, 'users', studentRoot.userId, 'students', studentRoot.studentId, 'checkIns', 'profile_sync'), {
          type: 'profile_sync',
          studentId: studentRoot.studentId,
          studentName: student.name,
          ...sanitized,
        }, { merge: true }).catch(console.warn);

        if (data.avatar) {
          await setDoc(doc(firestore, 'users', studentRoot.userId, 'students', studentRoot.studentId, 'checkIns', 'avatar_sync'), {
            type: 'avatar_sync',
            studentId: studentRoot.studentId,
            studentName: student.name,
            avatar: data.avatar,
            date: new Date().toISOString(),
          }, { merge: true }).catch(console.warn);
        }
      }
      toast({ title: message });
    } catch (error) {
      console.warn('Firestore update warning (saved locally in bridge):', error);
      toast({ title: message });
    }
  };

  const handleSelectAvatar = async (avatarUrl: string, avatarName: string) => {
    await updateStudent({ avatar: avatarUrl }, `Yeni avatarın: ${avatarName} 🎉`);
    setIsAvatarPickerOpen(false);
  };

  // Basınca sıradaki komik avatara anında geç
  const handleNextAvatar = async () => {
    const active = localStudent.avatar || student.avatar || FUNNY_AVATARS[0].url;
    const currentIndex = FUNNY_AVATARS.findIndex((item) => item.url === active);
    const nextIndex = currentIndex === -1 ? 0 : (currentIndex + 1) % FUNNY_AVATARS.length;
    const nextAvatar = FUNNY_AVATARS[nextIndex];
    await handleSelectAvatar(nextAvatar.url, nextAvatar.name);
  };

  const handleSaveProfile = async () => {
    const nextProfile: Partial<Student> = {
      preferredName: form.preferredName.trim() || undefined,
      country: form.country.trim() || 'Türkiye',
      birthDate: form.birthDate ? new Date(form.birthDate) : undefined,
      languages: splitList(form.languages),
      interests: splitList(form.interests),
      favoriteThings: form.favoriteThings.trim(),
      hasPet: Boolean(form.petName.trim()),
      petName: form.petName.trim(),
      avatar: form.avatar,
    };

    try {
      await updateStudent(nextProfile, 'Profilin başarıyla kaydedildi! ✨');
      setIsEditing(false);
    } catch {
      // Keep form open
    }
  };

  return (
    <div className="flex w-full min-w-0 flex-col gap-5 xl:w-[280px] xl:shrink-0 2xl:w-[300px]">
      {/* BURASI BENİM KARTI */}
      <div className="rounded-3xl border border-[#eef3f0] bg-white p-5 shadow-sm sm:p-6">
        <div className="w-full flex justify-between items-center mb-6">
          <h2 className="text-[#e89b7b] font-bold flex items-center gap-2">
            <StarIcon /> Burası Benim
          </h2>
          <Dialog open={isEditing} onOpenChange={setIsEditing}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm" className="h-7 text-xs rounded-full border-[#eef3f0] text-slate-500 hover:text-[#6b8e7c] hover:bg-[#eef3f0]/50">
                <Edit2 className="h-3 w-3 mr-1" /> Düzenle
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-lg rounded-3xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="text-[#2d4a3e] flex items-center gap-2">
                  <User className="h-5 w-5 text-[#6b8e7c]" /> Profilimi Düzenle
                </DialogTitle>
              </DialogHeader>

              {/* Avatar Seçimi */}
              <div className="py-2">
                <label className="block text-xs font-bold text-slate-500 mb-2">
                  Komik Avatarını Seç:
                </label>
                <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
                  {FUNNY_AVATARS.map((item) => {
                    const isSelected = form.avatar === item.url;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => setForm((prev) => ({ ...prev, avatar: item.url }))}
                        title={`${item.name} (${item.tag})`}
                        className={`relative rounded-2xl p-1.5 transition-all text-center ${
                          isSelected
                            ? 'bg-[#eef3f0] ring-2 ring-[#6b8e7c] scale-105 shadow-sm'
                            : 'hover:bg-slate-100 opacity-75 hover:opacity-100'
                        }`}
                      >
                        <div className="h-10 w-10 mx-auto overflow-hidden rounded-full border border-white bg-white">
                          <img src={item.url} alt={item.name} className="h-full w-full object-cover" />
                        </div>
                        <span className="mt-1 block truncate text-[9px] font-medium text-slate-600">
                          {item.name.split(' ')[0]}
                        </span>
                        {isSelected && (
                          <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-[#6b8e7c] text-[8px] text-white shadow">
                            ✓
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 py-2 border-t border-slate-100">
                <ProfileInput
                  label="Hitap Şekli / Takma Adım"
                  value={form.preferredName}
                  placeholder={student.name}
                  onChange={(preferredName) => setForm((current) => ({ ...current, preferredName }))}
                />
                <ProfileInput
                  label="Ülke"
                  value={form.country}
                  onChange={(country) => setForm((current) => ({ ...current, country }))}
                />
                <div className="sm:col-span-2">
                  <ProfileInput
                    label="Doğum günüm"
                    type="date"
                    value={form.birthDate}
                    onChange={(birthDate) => setForm((current) => ({ ...current, birthDate }))}
                  />
                </div>
                <div className="sm:col-span-2">
                  <ProfileInput
                    label="Konuştuğum diller"
                    value={form.languages}
                    placeholder="İngilizce, Türkçe"
                    onChange={(languages) => setForm((current) => ({ ...current, languages }))}
                  />
                </div>
                <div className="sm:col-span-2">
                  <ProfileInput
                    label="İlgi alanlarım"
                    value={form.interests}
                    placeholder="Müzik, kitaplar, spor, resim"
                    onChange={(interests) => setForm((current) => ({ ...current, interests }))}
                  />
                </div>
                <div className="sm:col-span-2">
                  <ProfileInput
                    label="En sevdiğim şeyler"
                    value={form.favoriteThings}
                    placeholder="Kahve, deniz, oyunlar, çizim"
                    onChange={(favoriteThings) => setForm((current) => ({ ...current, favoriteThings }))}
                  />
                </div>
                <div className="sm:col-span-2">
                  <ProfileInput
                    label="Evcil hayvanım"
                    value={form.petName}
                    placeholder="Milo, Boncuk veya boş bırak"
                    onChange={(petName) => setForm((current) => ({ ...current, petName }))}
                  />
                </div>
              </div>
              <Button onClick={handleSaveProfile} className="w-full h-11 rounded-xl bg-[#6b8e7c] hover:bg-[#5a7868] text-white font-medium">
                Kaydet
              </Button>
            </DialogContent>
          </Dialog>
        </div>

        <div className="grid items-start gap-6 md:grid-cols-[160px_minmax(0,1fr)] xl:grid-cols-1">
          <div className="flex flex-col items-center">
            {/* TIKLANABİLİR AVATAR (BASINCA DEĞİŞİR) */}
            <div className="relative group">
              <button
                type="button"
                onClick={handleNextAvatar}
                title="Tıkla avatarını değiştir (12 Komik Avatar)"
                className="relative block rounded-full focus:outline-none focus:ring-4 focus:ring-[#6b8e7c]/40 transition-transform active:scale-95 cursor-pointer"
              >
                <div className="h-28 w-28 overflow-hidden rounded-full border-4 border-[#f1eee8] bg-white shadow-md transition-all group-hover:scale-105 group-hover:border-[#6b8e7c]">
                  <img
                    key={currentAvatar}
                    src={currentAvatar}
                    alt={displayName}
                    className="h-full w-full object-cover transition-transform duration-200"
                  />
                </div>
                <div
                  className="absolute bottom-1 right-1 rounded-full border border-slate-100 bg-white p-2 text-[#6b8e7c] shadow-md group-hover:bg-[#6b8e7c] group-hover:text-white group-hover:scale-110 active:scale-95 transition-all"
                  title="Avatarı değiştir (Tıkla)"
                >
                  <Edit2 className="h-4 w-4" />
                </div>
              </button>
            </div>
            <p className="mt-3 text-center font-bold text-[#2d4a3e]">{displayName}</p>
            <button
              type="button"
              onClick={handleNextAvatar}
              className="mt-1 text-[11px] font-medium text-slate-400 hover:text-[#6b8e7c] transition-colors"
            >
              🔄 Resme basınca avatar değişir
            </button>
            <button
              type="button"
              onClick={() => setIsAvatarPickerOpen(true)}
              className="mt-1 text-[11px] font-semibold text-[#6b8e7c] hover:underline flex items-center gap-1"
            >
              <Sparkles className="h-3 w-3" /> Tümünü gör (12 Avatar)
            </button>
          </div>

          <div className="grid w-full grid-cols-1 gap-4 text-sm min-[380px]:grid-cols-2 xl:grid-cols-1">
            <ProfileRow icon={CalendarDays} label="Başlangıç" value={formatStartDate(localStudent.startDate || student.startDate)} />
            <ProfileRow icon={GraduationCap} label="Seviyem" value={localStudent.currentLevel || student.currentLevel || 'Henüz belirlenmedi'} />
            <ProfileRow icon={Globe} label="Ülke" value={localStudent.country || student.country || 'Türkiye'} />
            <ProfileRow icon={Gift} label="Doğum günüm" value={formatBirthDate(localStudent.birthDate || student.birthDate)} />
            <ProfileRow icon={MessageIcon} label="Konuştuğum diller" value={localStudent.languages?.join(', ') || student.languages?.join(', ') || 'Türkçe çalışıyorum'} />
            <ProfileRow icon={Heart} label="İlgi alanlarım" value={localStudent.interests?.join(', ') || student.interests?.join(', ') || 'Müzik, kitaplar, sohbet'} />
            <ProfileRow icon={Coffee} label="En sevdiğim şeyler" value={localStudent.favoriteThings || student.favoriteThings || 'Yeni kelimeler, iyi hikayeler'} />
            <ProfileRow icon={Cat} label="Evcil hayvanım" value={localStudent.hasPet || student.hasPet ? (localStudent.petName || student.petName || 'Var') : 'Henüz eklenmedi'} />
          </div>
        </div>

        {student.improvementGoal && (
          <div className="mt-6 w-full rounded-2xl border border-amber-100 bg-[#fff9eb] p-4 text-center">
            <p className="flex items-center justify-center gap-1 text-[10px] font-bold uppercase text-amber-700/60"><Target className="h-3 w-3" /> Hedefim</p>
            <p className="mt-2 text-sm italic leading-relaxed text-[#6b503b]">“{student.improvementGoal}”</p>
          </div>
        )}
      </div>

      {/* AVATAR DEĞİŞTİRME DİYALOĞU */}
      <Dialog open={isAvatarPickerOpen} onOpenChange={setIsAvatarPickerOpen}>
        <DialogContent className="sm:max-w-xl rounded-3xl p-6">
          <DialogHeader>
            <DialogTitle className="text-[#2d4a3e] flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-amber-500" />
              Avatarını Seç (12 Komik Karakter)
            </DialogTitle>
          </DialogHeader>
          <p className="text-xs text-slate-500">
            Seni en iyi anlatan veya en çok güldüren avatarı seç! Öğretmenin Tuba da seni bu avatarla görecek.
          </p>
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-3 py-3">
            {FUNNY_AVATARS.map((item) => {
              const isSelected = currentAvatar === item.url;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleSelectAvatar(item.url, item.name)}
                  className={`group relative flex flex-col items-center justify-center rounded-2xl p-3 border transition-all duration-200 cursor-pointer ${
                    isSelected
                      ? 'border-[#6b8e7c] bg-[#eef3f0]/60 ring-2 ring-[#6b8e7c] shadow-sm scale-102'
                      : 'border-slate-100 bg-white hover:border-[#6b8e7c]/40 hover:bg-[#fcfbf9] hover:scale-102'
                  }`}
                >
                  <div className="h-16 w-16 overflow-hidden rounded-full border-2 border-white shadow-sm bg-white">
                    <img src={item.url} alt={item.name} className="h-full w-full object-cover" />
                  </div>
                  <span className="mt-2 text-xs font-bold text-[#2d4a3e] text-center leading-tight">
                    {item.name}
                  </span>
                  <span className="text-[10px] text-slate-400 font-medium">
                    {item.tag}
                  </span>
                  {isSelected && (
                    <span className="absolute top-2 right-2 flex h-5 w-5 items-center justify-center rounded-full bg-[#6b8e7c] text-white text-xs shadow">
                      <Check className="h-3 w-3 stroke-[3]" />
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </DialogContent>
      </Dialog>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-1">
        {/* AVATARINI SEÇ (12 KOMİK AVATAR LİSTESİ) */}
        <div className="rounded-2xl border border-[#eef3f0] bg-[#fcfbf9] p-4 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-bold text-[#2d4a3e] text-sm flex items-center gap-1.5">
              <Sparkles className="h-4 w-4 text-amber-500" />
              Avatarını seç
            </h3>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
              12 Komik Avatar
            </span>
          </div>
          <div className="grid grid-cols-4 sm:grid-cols-6 xl:grid-cols-4 gap-2.5">
            {FUNNY_AVATARS.map((item) => {
              const isSelected = currentAvatar === item.url;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleSelectAvatar(item.url, item.name)}
                  title={`${item.name} (${item.tag})`}
                  className={`group relative flex flex-col items-center justify-center rounded-2xl p-1.5 transition-all duration-200 cursor-pointer ${
                    isSelected
                      ? 'bg-white shadow-md ring-2 ring-[#6b8e7c] scale-105'
                      : 'hover:bg-white/80 hover:scale-105 opacity-80 hover:opacity-100'
                  }`}
                >
                  <div className="h-11 w-11 overflow-hidden rounded-full border border-slate-100 bg-white shadow-xs">
                    <img src={item.url} alt={item.name} className="h-full w-full object-cover" />
                  </div>
                  <span className="mt-1 max-w-full truncate text-[9px] font-medium text-slate-600 leading-tight">
                    {item.name.split(' ')[0]}
                  </span>
                  {isSelected && (
                    <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-[#6b8e7c] text-[9px] text-white shadow">
                      ✓
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* ARKA PLAN TEMASI */}
        <div className="rounded-2xl border border-[#eef3f0] bg-[#fcfbf9] p-4 shadow-sm">
          <h3 className="font-bold text-[#2d4a3e] mb-3 text-sm">Arka plan temasını seç</h3>
          <div className="flex gap-2">
            {themes.map((theme) => (
              <button
                key={theme.value}
                onClick={() => updateStudent({ backgroundTheme: theme.value }, 'Tema seçimin kaydedildi')}
                className={`h-16 w-12 rounded-xl cursor-pointer shadow-sm border ${localStudent.backgroundTheme === theme.value || student.backgroundTheme === theme.value ? 'border-[#6b8e7c] ring-1 ring-[#6b8e7c]' : 'border-transparent'} ${theme.className} flex items-end justify-center pb-2 text-lg hover:scale-105 transition-all`}
              >
                {theme.icon}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function ProfileRow({ icon: Icon, label, value, flag }: { icon: any; label: string; value: string; flag?: string }) {
  return (
    <div className="grid min-w-0 grid-cols-[auto_1fr] gap-3 items-start">
      <Icon className="h-4 w-4 text-[#6b8e7c] mt-0.5" />
      <div className="min-w-0">
        <span className="block text-slate-500 text-[10px] mt-0.5">{label}</span>
        <span className="mt-0.5 block break-words font-medium text-[#2d4a3e] leading-snug">
          {flag && <span className="mr-1">{flag}</span>}
          {value}
        </span>
      </div>
    </div>
  );
}

function formatBirthDate(value: Student['birthDate']) {
  if (!value) return 'Henüz eklenmedi';
  const date = value instanceof Date ? value : new Date(value as any);
  if (Number.isNaN(date.getTime())) return 'Henüz eklenmedi';
  return date.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' });
}

function formatDateInput(value: Student['birthDate']) {
  if (!value) return '';
  const date = value instanceof Date ? value : new Date(value as any);
  if (Number.isNaN(date.getTime())) return '';
  return date.toISOString().slice(0, 10);
}

function formatStartDate(value?: string) {
  if (!value) return 'Henüz belirlenmedi';
  const date = new Date(`${value}T00:00:00`);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' });
}

function splitList(value: string) {
  return value.split(',').map((item) => item.trim()).filter(Boolean);
}

function ProfileInput({
  label,
  value,
  onChange,
  placeholder,
  type = 'text',
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: string;
}) {
  return (
    <label className="block">
      <span className="text-xs font-bold text-slate-500">{label}</span>
      <Input
        type={type}
        value={value}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
        className="mt-1 rounded-xl border-[#eef3f0] bg-[#fcfbf9]"
      />
    </label>
  );
}

function cacheStudentLocally(student: Partial<Student>) {
  try {
    const rawCache = localStorage.getItem('student_portal_students_cache');
    const cache = rawCache ? (JSON.parse(rawCache) as Array<Partial<Student> & { id?: string; name?: string; pin?: string }>) : [];
    
    // Find existing by id, or pin, or name
    const existing = cache.find((c) => 
      (student.id && c.id === student.id) || 
      (student.pin && c.pin === student.pin) || 
      (student.name && c.name?.toLowerCase() === student.name.toLowerCase())
    ) || {};
    
    const merged = { ...existing, ...student };
    const nextCache = [
      ...cache.filter((cached) => 
        !(student.id && cached.id === student.id) &&
        !(student.pin && cached.pin === student.pin) &&
        !(student.name && cached.name?.toLowerCase() === student.name.toLowerCase())
      ),
      merged as Partial<Student> & { id: string },
    ];
    localStorage.setItem('student_portal_students_cache', JSON.stringify(nextCache));
    if (student.avatar) {
      localStorage.setItem('student_portal_active_avatar', student.avatar);
      if (student.name) {
        localStorage.setItem(`student_portal_avatar_${student.name.trim().toLowerCase()}`, student.avatar);
      }
      if (student.id) {
        localStorage.setItem(`student_portal_avatar_${student.id}`, student.avatar);
      }
    }
    window.dispatchEvent(new Event('storage'));
    window.dispatchEvent(new CustomEvent(STUDENT_BRIDGE_EVENT));
  } catch {
    // Local cache fallback
  }
}

function StarIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" fill="currentColor"/>
    </svg>
  );
}

function MessageIcon({ className }: { className?: string }) {
  return (
    <svg className={className} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
    </svg>
  );
}
