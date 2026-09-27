export async function checkout({ priceId, amount, lessonCount, studentName, userId, userEmail, metadata, accessToken, paymentSlug }: {
  priceId: string; 
  amount?: number;
  lessonCount?: number;
  studentName?: string;
  userId?: string; 
  userEmail?: string;
  metadata?: any;
  accessToken?: string;
  paymentSlug?: string;
}) {
  try {
    const response = await fetch('/api/checkout', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        priceId,
        amount,
        lessonCount,
        studentName,
        userId,
        userEmail,
        metadata,
        accessToken,
        paymentSlug,
      }),
    });

    const session = await response.json();

    if (session.error) {
      throw new Error(session.error);
    }

    if (!session.url) throw new Error('Ödeme bağlantısı oluşturulamadı.');
    window.location.assign(session.url);
  } catch (error) {
    console.error('Checkout Error:', error);
    alert('Ödeme başlatılırken bir hata oluştu. Lütfen tekrar deneyin.');
  }
}
