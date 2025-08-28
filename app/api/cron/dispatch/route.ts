import { NextRequest, NextResponse } from 'next/server';
import { eventUtils } from '@/lib/storage';

export const runtime = 'nodejs';

// 시간대별 자동 알림 발송 (크론 작업)
export async function POST(request: NextRequest) {
  try {
    console.log('🕐 크론 디스패처 실행 시작...');
    
    // 현재 시간
    const now = new Date();
    const currentTime = now.getTime();
    
    // 모든 이벤트 조회
    const events = eventUtils.getAllEvents();
    let totalNotificationsSent = 0;
    
    for (const event of events) {
      // 발행된 이벤트만 처리
      if (event.status !== 'published') continue;
      
      // 이벤트의 슬롯들 조회
      const slots = eventUtils.getEventSlots(event.id);
      
      for (const slot of slots) {
        if (!slot.t_at) continue;
        
        const slotTime = new Date(slot.t_at).getTime();
        const timeDiff = currentTime - slotTime;
        const timeDiffMinutes = Math.floor(timeDiff / (1000 * 60));
        
        // 슬롯 시작 5분 전 알림
        if (timeDiffMinutes >= -5 && timeDiffMinutes <= -4) {
          await sendNotification(event.code, slot.id, 'slot_start');
          totalNotificationsSent++;
        }
        
        // 슬롯 진행 중 알림 (15분 후)
        if (timeDiffMinutes >= 15 && timeDiffMinutes <= 16) {
          await sendNotification(event.code, slot.id, 'slot_reminder');
          totalNotificationsSent++;
        }
        
        // 슬롯 마감 알림 (25분 후)
        if (timeDiffMinutes >= 25 && timeDiffMinutes <= 26) {
          await sendNotification(event.code, slot.id, 'slot_end');
          totalNotificationsSent++;
        }
      }
      
      // 이벤트 종료 알림 (마지막 슬롯 후 1시간)
      const lastSlot = slots[slots.length - 1];
      if (lastSlot && lastSlot.t_at) {
        const lastSlotTime = new Date(lastSlot.t_at).getTime();
        const eventEndTime = lastSlotTime + (60 * 60 * 1000); // 1시간 후
        
        if (currentTime >= eventEndTime && currentTime <= eventEndTime + (5 * 60 * 1000)) {
          await sendNotification(event.code, '', 'event_end');
          totalNotificationsSent++;
        }
      }
    }
    
    console.log(`✅ 크론 디스패처 완료: ${totalNotificationsSent}개 알림 발송`);
    
    return NextResponse.json({
      message: '크론 디스패처가 성공적으로 실행되었습니다.',
      notifications_sent: totalNotificationsSent,
      executed_at: now.toISOString()
    });
    
  } catch (error) {
    console.error('❌ 크론 디스패처 오류:', error);
    return NextResponse.json(
      { error: '크론 디스패처 실행에 실패했습니다.' },
      { status: 500 }
    );
  }
}

// 알림 발송 함수
async function sendNotification(eventCode: string, slotId: string, notificationType: string) {
  try {
    const response = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/notifications/send`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        eventCode,
        slotId,
        notificationType
      }),
    });

    if (response.ok) {
      console.log(`✅ 알림 발송 성공: ${eventCode} - ${notificationType}`);
    } else {
      console.error(`❌ 알림 발송 실패: ${eventCode} - ${notificationType}`);
    }
  } catch (error) {
    console.error(`❌ 알림 발송 중 오류: ${eventCode} - ${notificationType}`, error);
  }
}

// 크론 작업 상태 확인
export async function GET() {
  try {
    const events = eventUtils.getAllEvents();
    const publishedEvents = events.filter(e => e.status === 'published');
    
    const status = {
      total_events: events.length,
      published_events: publishedEvents.length,
      last_execution: new Date().toISOString(),
      next_scheduled: new Date(Date.now() + 5 * 60 * 1000).toISOString() // 5분 후
    };
    
    return NextResponse.json(status);
    
  } catch (error) {
    console.error('크론 상태 확인 오류:', error);
    return NextResponse.json(
      { error: '크론 상태 확인에 실패했습니다.' },
      { status: 500 }
    );
  }
}
