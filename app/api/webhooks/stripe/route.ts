import { headers } from 'next/headers';
import { NextResponse } from 'next/server';
import { PaymentService } from '@/lib/services/payment';

const paymentService = new PaymentService();

export async function POST(req: Request) {
  const body = await req.text();
  const headersList = await headers();
  const signature = headersList.get('stripe-signature') as string;

  if (!signature) {
    return NextResponse.json(
      { error: 'Missing stripe-signature header' },
      { status: 400 }
    );
  }

  try {
    const result = await paymentService.handleWebhook(body, signature);
    console.log('Webhook processed successfully:', result);
    return NextResponse.json({ received: true });
  } catch (error: any) {
    console.error('Webhook error:', error);
    return NextResponse.json(
      { error: `Webhook Error: ${error.message}` },
      { status: 400 }
    );
  }
}
