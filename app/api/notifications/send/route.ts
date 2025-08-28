import { NextRequest, NextResponse } from 'next/server';
import { eventUtils } from '@/lib/storage';

export const runtime = 'nodejs';

// 시간대별 알림 발송
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { eventCode, slotId, notificationType } = body;

    // 입력 검증
    if (!eventCode || !slotId || !notificationType) {
      return NextResponse.json(
        { error: '필수 필드가 누락되었습니다.' },
        { status: 400 }
      );
    }

    // 이벤트 존재 확인
    const event = eventUtils.getEvent(eventCode);
    if (!event) {
      return NextResponse.json(
        { error: '이벤트를 찾을 수 없습니다.' },
        { status: 404 }
      );
    }

    // 슬롯 정보 조회
    const slot = eventUtils.getEventSlots(event.id).find(s => s.id === slotId);
    if (!slot) {
      return NextResponse.json(
        { error: '슬롯을 찾을 수 없습니다.' },
        { status: 404 }
      );
    }

    // 알림 메시지 생성
    let notificationMessage = '';
    let notificationTitle = '';

    switch (notificationType) {
      case 'slot_start':
        notificationTitle = `🎯 ${slot.title} 시작!`;
        notificationMessage = `이제 ${slot.title} 시간입니다. 질문에 답변해주세요!`;
        break;
      
      case 'slot_reminder':
        notificationTitle = `⏰ ${slot.title} 진행 중`;
        notificationMessage = `${slot.title}가 진행 중입니다. 답변을 잊지 마세요!`;
        break;
      
      case 'slot_end':
        notificationTitle = `🏁 ${slot.title} 마감`;
        notificationMessage = `${slot.title}가 마감되었습니다. 답변 제출을 완료해주세요.`;
        break;
      
      case 'event_end':
        notificationTitle = `🎉 ${event.name} 종료`;
        notificationMessage = `이벤트가 종료되었습니다. 개인 리포트를 확인해보세요!`;
        break;
      
      default:
        return NextResponse.json(
          { error: '알 수 없는 알림 타입입니다.' },
          { status: 400 }
        );
    }

    // 알림 데이터 저장
    const notificationId = `notification_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const notificationData = {
      id: notificationId,
      event_id: event.id,
      slot_id: slotId,
      type: notificationType,
      title: notificationTitle,
      message: notificationMessage,
      sent_at: new Date().toISOString(),
      status: 'sent'
    };

    // 전역 저장소에 알림 추가
    if (!global.__storage.notifications) {
      global.__storage.notifications = [];
    }
    global.__storage.notifications.push(notificationData);

    console.log('✅ 알림 발송 완료:', notificationId, notificationTitle);

    return NextResponse.json({
      message: '알림이 성공적으로 발송되었습니다.',
      notification_id: notificationId,
      title: notificationTitle,
      content: notificationMessage
    });

  } catch (error) {
    console.error('알림 발송 오류:', error);
    return NextResponse.json(
      { error: '알림 발송에 실패했습니다.' },
      { status: 500 }
    );
  }
}

// 이벤트별 알림 목록 조회
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const eventCode = searchParams.get('eventCode');

    if (!eventCode) {
      return NextResponse.json(
        { error: '이벤트 코드가 필요합니다.' },
        { status: 400 }
      );
    }

    // 이벤트 존재 확인
    const event = eventUtils.getEvent(eventCode);
    if (!event) {
      return NextResponse.json(
        { error: '이벤트를 찾을 수 없습니다.' },
        { status: 404 }
      );
    }

    // 알림 조회
    if (!global.__storage.notifications) {
      global.__storage.notifications = [];
    }

    const notifications = global.__storage.notifications.filter(n => n.event_id === event.id);

    return NextResponse.json({
      event: event,
      notifications: notifications,
      total: notifications.length
    });

  } catch (error) {
    console.error('알림 조회 오류:', error);
    return NextResponse.json(
      { error: '알림 조회에 실패했습니다.' },
      { status: 500 }
    );
  }
}
