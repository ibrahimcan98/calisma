'use client';

import { useParams } from 'next/navigation';
import { PaymentPageContent } from '@/app/pay/[userId]/[studentId]/[token]/page';

export default function ShortParentPage() {
  const { slug } = useParams<{ slug: string }>();
  return <PaymentPageContent shortSlug={slug} />;
}
