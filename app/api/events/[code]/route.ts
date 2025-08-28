import { NextRequest, NextResponse } from 'next/server';
import { eventUtils } from '@/lib/storage';

export const runtime = 'nodejs';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  try {
    const { code } = await params;
    
    console.log('🔍 이벤트 조회 요청:', code);
    
    // 저장소 상태 먼저 확인
    const currentStatus = eventUtils.getStatus();
    console.log('📊 현재 저장소 상태:', currentStatus);
    console.log('🔍 저장소에서 이벤트 코드 검색:', code);
    console.log('📋 저장된 이벤트들:', currentStatus.events);
    
    // 공통 저장소에서 이벤트 조회
    const event = eventUtils.getEvent(code);
    
    if (!event) {
      console.log('❌ 이벤트를 찾을 수 없음:', code);
      console.log('🔍 저장소에 있는 이벤트 코드들:', currentStatus.events.map(e => e.code));
      return NextResponse.json(
        { error: '이벤트를 찾을 수 없습니다.' },
        { status: 404 }
      );
    }
    
    console.log('✅ 이벤트 찾음:', event.name);
    
    // 해당 이벤트의 슬롯들 조회
    const eventSlots = eventUtils.getEventSlots(event.id);
    console.log('✅ 슬롯 찾음:', eventSlots.length, '개');
    
    // 각 슬롯의 질문들 조회
    const slotsWithQuestions = eventSlots.map(slot => {
      const slotQuestions = eventUtils.getSlotQuestions(slot.id);
      return {
        ...slot,
        questions: slotQuestions
      };
    });
    
    console.log('✅ 질문 포함 슬롯 반환:', slotsWithQuestions.length, '개');
    
    // 저장소 상태 확인 (디버깅용)
    const finalStatus = eventUtils.getStatus();
    console.log('📊 최종 저장소 상태:', finalStatus);
    
    return NextResponse.json({
      event: {
        id: event.id,
        code: event.code,
        name: event.name,
        venue: event.venue,
        start_at: event.start_at,
        end_at: event.end_at,
        status: event.status
      },
      slots: slotsWithQuestions
    });
    
  } catch (error) {
    console.error('이벤트 조회 오류:', error);
    return NextResponse.json(
      { error: '이벤트 조회에 실패했습니다.' },
      { status: 500 }
    );
  }
}
