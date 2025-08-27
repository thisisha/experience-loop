import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';
import { sendBulkPushNotifications } from '@/lib/push';

export async function GET(request: NextRequest) {
  try {
    const supabase = createServerClient();
    const now = new Date();
    const twoMinutesLater = new Date(now.getTime() + 2 * 60 * 1000);

    // 1. 현재~+2분 내의 'ask' 타입 슬롯 조회 (아직 발송되지 않은 것만)
    const { data: slots, error: slotsError } = await supabase
      .from('slots')
      .select(`
        *,
        events (
          id,
          name,
          code
        )
      `)
      .eq('type', 'ask')
      .gte('t_at', now.toISOString())
      .lte('t_at', twoMinutesLater.toISOString())
      .is('dispatched_at', null);

    if (slotsError) {
      console.error('슬롯 조회 실패:', slotsError);
      return NextResponse.json(
        { error: '슬롯 정보를 불러올 수 없습니다.' },
        { status: 500 }
      );
    }

    if (!slots || slots.length === 0) {
      return NextResponse.json({
        message: '발송할 슬롯이 없습니다.',
        current_time: now.toISOString(),
        slots_found: 0
      });
    }

    let totalNotificationsSent = 0;
    let totalSlotsProcessed = 0;

    // 2. 각 슬롯에 대해 참가자들에게 푸시 알림 발송
    for (const slot of slots) {
      try {
        // 해당 이벤트의 모든 참가자 조회
        const { data: participants, error: participantsError } = await supabase
          .from('participants')
          .select('push_endpoint, p256dh, auth')
          .eq('event_id', slot.events.id);

        if (participantsError || !participants || participants.length === 0) {
          console.error(`이벤트 ${slot.events.id} 참가자 조회 실패:`, participantsError);
          continue;
        }

        // 푸시 구독 정보 구성
        const subscriptions = participants.map(p => ({
          endpoint: p.push_endpoint,
          p256dh: p.p256dh,
          auth: p.auth
        }));

        // 푸시 알림 페이로드 구성
        const pushPayload = {
          title: `${slot.events.name} - ${slot.title}`,
          body: slot.desc,
          url: `${request.nextUrl.origin}/(pwa)/dashboard?slot=${slot.id}`
        };

        // 대량 푸시 알림 발송
        const result = await sendBulkPushNotifications(subscriptions, pushPayload);

        // 3. dispatched_at 타임스탬프 업데이트 (중복 방지)
        const { error: updateError } = await supabase
          .from('slots')
          .update({ dispatched_at: now.toISOString() })
          .eq('id', slot.id);

        if (updateError) {
          console.error(`슬롯 ${slot.id} dispatched_at 업데이트 실패:`, updateError);
        }

        totalNotificationsSent += result.successful;
        totalSlotsProcessed++;

        console.log(`슬롯 "${slot.title}" 처리 완료:`, {
          slot_id: slot.id,
          event_name: slot.events.name,
          participants: participants.length,
          notifications_sent: result.successful,
          notifications_failed: result.failed
        });

      } catch (error) {
        console.error(`슬롯 ${slot.id} 처리 중 오류:`, error);
        continue;
      }
    }

    return NextResponse.json({
      message: '푸시 알림 발송이 완료되었습니다.',
      current_time: now.toISOString(),
      slots_processed: totalSlotsProcessed,
      total_notifications_sent: totalNotificationsSent,
      processing_summary: {
        total_slots_found: slots.length,
        slots_processed: totalSlotsProcessed,
        notifications_sent: totalNotificationsSent
      }
    });

  } catch (error) {
    console.error('크론 디스패처 오류:', error);
    
    if (error instanceof Error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }
    
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
