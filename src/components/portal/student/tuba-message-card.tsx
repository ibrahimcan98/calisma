'use client';

import { useEffect, useMemo, useState, useRef } from 'react';
import { Mail, ChevronLeft, ChevronRight } from 'lucide-react';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, doc, limit, orderBy, query, updateDoc } from 'firebase/firestore';
import type { Message, Student } from '@/lib/types';
import { toast } from '@/hooks/use-toast';
import {
  readBridgedMessages,
  readBridgedReactions,
  saveBridgedReaction,
  STUDENT_BRIDGE_EVENT,
} from '@/lib/student-message-bridge';

type StudentRoot = { userId: string; studentId: string } | null;

function toDate(value: unknown): Date {
  if (value instanceof Date) return value;
  if (value && typeof value === 'object' && 'toDate' in value && typeof (value as { toDate: () => Date }).toDate === 'function') {
    return (value as { toDate: () => Date }).toDate();
  }
  if (typeof value === 'string' || typeof value === 'number') {
    const d = new Date(value);
    if (!Number.isNaN(d.getTime())) return d;
  }
  return new Date();
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

export function TubaMessageCard({ student, studentRoot }: { student: Student; studentRoot: StudentRoot }) {
  const firestore = useFirestore();
  const [localReactions, setLocalReactions] = useState<Record<string, string>>({});
  const [bridgeRevision, setBridgeRevision] = useState(0);
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const touchStartXRef = useRef<number | null>(null);

  useEffect(() => {
    const refreshBridge = () => setBridgeRevision((v) => v + 1);
    window.addEventListener(STUDENT_BRIDGE_EVENT, refreshBridge);
    window.addEventListener('storage', refreshBridge);
    return () => {
      window.removeEventListener(STUDENT_BRIDGE_EVENT, refreshBridge);
      window.removeEventListener('storage', refreshBridge);
    };
  }, []);

  const messagesRef = useMemoFirebase(() => {
    if (!studentRoot) return null;
    return query(
      collection(firestore, 'users', studentRoot.userId, 'students', studentRoot.studentId, 'messages'),
      orderBy('date', 'desc'),
      limit(50)
    );
  }, [firestore, studentRoot?.userId, studentRoot?.studentId]);

  const { data: messages } = useCollection<Omit<Message, 'id'>>(messagesRef);

  const bridgedMessages = useMemo(() => {
    return studentRoot ? readBridgedMessages(studentRoot.userId, studentRoot.studentId) : [];
  }, [studentRoot, bridgeRevision]);

  const bridgedReactions = useMemo(() => {
    return studentRoot ? readBridgedReactions(studentRoot.userId, studentRoot.studentId) : {};
  }, [studentRoot, bridgeRevision]);

  const allTeacherMessages = useMemo(() => {
    const rawList: (Message | (Omit<Message, 'id'> & { id: string }))[] = [
      ...(messages || []),
      ...(student.portalMessages || []),
      ...bridgedMessages,
    ];

    const mapped = rawList
      .filter((message) => message.senderRole === 'admin' && Boolean(message.content))
      .map((message) => {
        const contentKey = `content:${message.content.trim()}`;
        return {
          ...message,
          emojiReaction:
            message.emojiReaction ||
            bridgedReactions[message.id] ||
            bridgedReactions[contentKey] ||
            undefined,
        };
      });

    return deduplicateMessages(mapped as Message[]).sort(
      (a, b) => toDate(a.date).getTime() - toDate(b.date).getTime()
    );
  }, [messages, student.portalMessages, bridgedMessages, bridgedReactions]);

  // If no teacher messages are available, provide default fallback
  const displayMessages = useMemo(() => {
    if (allTeacherMessages.length > 0) return allTeacherMessages;
    return [
      {
        id: 'default-welcome-message',
        studentId: student.id,
        senderRole: 'admin' as const,
        content:
          'Geçen dersteki konuşma pratiğinde gösterdiğin özgüven beni çok mutlu etti. Türkçe ile kurduğun bağ her geçen gün daha da güçleniyor. Aynı merak ve enerjiyle devam et. Seninle bu yolculuk gerçekten çok keyifli!',
        date: new Date(),
        emojiReaction: undefined,
      },
    ];
  }, [allTeacherMessages, student.id]);

  const totalMessages = displayMessages.length;
  // Default to the newest message (last element in chronological order)
  const currentIndex =
    activeIndex !== null && activeIndex >= 0 && activeIndex < totalMessages
      ? activeIndex
      : totalMessages - 1;

  const currentMessage = displayMessages[currentIndex];
  const isLatest = currentIndex === totalMessages - 1;
  const hasPrevious = currentIndex > 0;
  const hasNext = currentIndex < totalMessages - 1;

  const goToPrevious = () => {
    if (hasPrevious) {
      setActiveIndex(currentIndex - 1);
    }
  };

  const goToNext = () => {
    if (hasNext) {
      setActiveIndex(currentIndex + 1);
    }
  };

  // Touch swipe support for mobile
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartXRef.current = e.touches[0].clientX;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartXRef.current === null) return;
    const diff = touchStartXRef.current - e.changedTouches[0].clientX;
    if (Math.abs(diff) > 40) {
      if (diff > 0) {
        // Swiped left -> next / newer message
        goToNext();
      } else {
        // Swiped right -> previous / older message
        goToPrevious();
      }
    }
    touchStartXRef.current = null;
  };

  const contentReactionKey = currentMessage?.content ? `content:${currentMessage.content.trim()}` : '';
  const currentReaction =
    localReactions[currentMessage?.id] ||
    (contentReactionKey ? localReactions[contentReactionKey] : '') ||
    currentMessage?.emojiReaction ||
    bridgedReactions[currentMessage?.id] ||
    (contentReactionKey ? bridgedReactions[contentReactionKey] : '') ||
    '';

  const reactions = [
    { emoji: '💛', label: 'Çok mutlu' },
    { emoji: '🤩', label: 'Motive oldum' },
    { emoji: '🥺', label: 'Özel hissettim' },
    { emoji: '👍', label: 'Teşekkür ederim' },
  ];

  const saveReaction = async (emojiReaction: string) => {
    if (!studentRoot || !currentMessage) {
      return;
    }
    setLocalReactions((prev) => ({
      ...prev,
      [currentMessage.id]: emojiReaction,
      ...(contentReactionKey ? { [contentReactionKey]: emojiReaction } : {}),
    }));

    saveBridgedReaction(
      studentRoot.userId,
      studentRoot.studentId,
      currentMessage.id,
      emojiReaction,
      currentMessage.content
    );

    try {
      await updateDoc(
        doc(firestore, 'users', studentRoot.userId, 'students', studentRoot.studentId, 'messages', currentMessage.id),
        {
          emojiReaction,
          isRead: true,
        }
      );
    } catch (error) {
      console.warn('Mesaj alt koleksiyonu güncellenemedi, alternatif deneniyor.', error);
    }

    try {
      await updateDoc(
        doc(firestore, 'users', studentRoot.userId, 'students', studentRoot.studentId),
        {
          lastEmojiReaction: emojiReaction,
          lastReactionMessageId: currentMessage.id,
          lastReactionMessageContent: currentMessage.content,
        }
      );
    } catch {
      // ignore
    }

    toast({ title: 'Tepkin Tuba öğretmenine gitti' });
  };

  const dateBadgeLabel = formatMessageDateBadge(currentMessage?.date);

  return (
    <div
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      className="relative flex min-h-full w-full flex-col justify-between gap-4 rounded-2xl border border-[#ffe4c4] bg-[#fff4e6] p-4 shadow-sm sm:rounded-3xl sm:p-6"
    >
      <div>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <h2 className="flex items-center gap-2 text-lg font-bold text-[#d98a5e]">
              <Mail className="h-5 w-5" /> Tuba'dan Mesaj
            </h2>
            {totalMessages > 1 && (
              <span className="text-[11px] font-semibold bg-[#fdeacc] text-[#b87042] px-2.5 py-0.5 rounded-full select-none">
                {currentIndex + 1} / {totalMessages}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            {totalMessages > 1 && (
              <div className="flex items-center gap-1 bg-white/90 border border-[#ffe4c4] rounded-full p-0.5 shadow-sm">
                <button
                  type="button"
                  onClick={goToPrevious}
                  disabled={!hasPrevious}
                  aria-label="Önceki mesaj"
                  title="Önceki mesaj"
                  className="p-1 rounded-full text-[#d98a5e] hover:bg-[#fff4e6] disabled:opacity-30 disabled:cursor-not-allowed transition-all cursor-pointer"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={goToNext}
                  disabled={!hasNext}
                  aria-label="Sonraki mesaj"
                  title="Sonraki mesaj"
                  className="p-1 rounded-full text-[#d98a5e] hover:bg-[#fff4e6] disabled:opacity-30 disabled:cursor-not-allowed transition-all cursor-pointer"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            )}
            <span className="text-xs text-[#d98a5e] bg-white px-3 py-1 rounded-full border border-[#ffe4c4]/60 font-medium opacity-90 shadow-sm">
              {isLatest && totalMessages > 1 ? `${dateBadgeLabel} • En Yeni` : dateBadgeLabel}
            </span>
          </div>
        </div>

        <div key={currentMessage?.id || currentIndex} className="text-[#6b503b] text-sm leading-relaxed mb-3 animate-in fade-in duration-200">
          <p className="font-semibold mb-2">Merhaba {student.preferredName || student.name}!</p>
          <p className="whitespace-pre-line">{currentMessage?.content}</p>
          <p className="mt-3 font-semibold">Tuba 💛</p>
        </div>
      </div>

      <div>
        {totalMessages > 1 && (
          <div className="flex items-center justify-between text-xs text-[#b88c67] pt-2 pb-3 mb-2 border-t border-[#ffe4c4]/70">
            <button
              type="button"
              onClick={goToPrevious}
              disabled={!hasPrevious}
              className="inline-flex items-center gap-1 font-medium hover:text-[#d98a5e] disabled:opacity-30 disabled:hover:text-[#b88c67] transition-colors cursor-pointer disabled:cursor-not-allowed select-none"
            >
              <ChevronLeft className="h-3.5 w-3.5" /> Önceki Mesaj
            </button>

            <div className="flex items-center gap-1.5">
              {displayMessages.map((m, idx) => (
                <button
                  key={m.id || idx}
                  type="button"
                  onClick={() => setActiveIndex(idx)}
                  aria-label={`Mesaj ${idx + 1}`}
                  title={`${idx + 1}. Mesaj`}
                  className={`h-2 rounded-full transition-all cursor-pointer ${
                    idx === currentIndex
                      ? 'w-5 bg-[#d98a5e]'
                      : 'w-2 bg-[#ffe4c4] hover:bg-[#f6cbb0]'
                  }`}
                />
              ))}
            </div>

            <button
              type="button"
              onClick={goToNext}
              disabled={!hasNext}
              className="inline-flex items-center gap-1 font-medium hover:text-[#d98a5e] disabled:opacity-30 disabled:hover:text-[#b88c67] transition-colors cursor-pointer disabled:cursor-not-allowed select-none"
            >
              Sonraki Mesaj <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>
        )}

        <p className="text-xs text-[#b88c67] mb-2 font-medium">Bu mesaj sana nasıl hissettirdi?</p>
        <div className="flex gap-2 flex-wrap items-center">
          {reactions.map((r, i) => (
            <button
              key={i}
              type="button"
              onClick={() => saveReaction(r.label)}
              className={`flex items-center gap-1.5 bg-white border px-3 py-1.5 rounded-full text-xs font-medium hover:bg-[#fff9eb] hover:border-[#d98a5e] transition-colors shadow-sm cursor-pointer ${
                currentReaction === r.label
                  ? 'border-[#d98a5e] text-[#d98a5e]'
                  : 'border-[#ffe4c4] text-[#8c6d46]'
              }`}
            >
              <span className="text-sm">{r.emoji}</span> {r.label}
            </button>
          ))}
          <span className="hidden lg:inline-flex bg-[#fff9eb] border border-[#fdeacc] px-3 py-1.5 rounded-full shadow-sm text-[#d98a5e] font-serif italic text-xs">
            Sen yaparsın ♡
          </span>
        </div>
      </div>
    </div>
  );
}
