import { NextRequest, NextResponse } from 'next/server';
import { eventUtils, storage } from '@/lib/storage';
import crypto from 'crypto';

export const runtime = 'nodejs';

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  try {
    const { code } = await params;
    const body = await request.json();
    const { password, slots } = body;

    // 입력 검증
    if (!password || !slots || !Array.isArray(slots)) {
      return NextResponse.json(
        { error: '비밀번호와 슬롯 정보가 필요합니다.' },
        { status: 400 }
      );
    }

    // 이벤트 조회
    const event = eventUtils.getEvent(code);
    if (!event) {
      return NextResponse.json(
        { error: '이벤트를 찾을 수 없습니다.' },
        { status: 404 }
      );
    }

    // 비밀번호 검증
    const passwordHash = crypto.createHash('sha256').update(password).digest('hex');
    if (event.password_hash !== passwordHash) {
      return NextResponse.json(
        { error: '비밀번호가 올바르지 않습니다.' },
        { status: 401 }
      );
    }

    // 기존 슬롯과 질문 제거
    const existingSlots = eventUtils.getEventSlots(event.id);
    existingSlots.forEach(slot => {
      // 슬롯의 질문들 제거
      const slotQuestions = eventUtils.getSlotQuestions(slot.id);
      slotQuestions.forEach(question => {
        const questionIndex = storage.questions.findIndex(q => q.id === question.id);
        if (questionIndex !== -1) {
          storage.questions.splice(questionIndex, 1);
        }
      });
      
      // 슬롯 제거
      const slotIndex = storage.slots.findIndex(s => s.id === slot.id);
      if (slotIndex !== -1) {
        storage.slots.splice(slotIndex, 1);
      }
    });

    // 새로운 슬롯과 질문 생성
    let slotsCreated = 0;
    for (const slotData of slots) {
      const slot = eventUtils.createSlot({
        event_id: event.id,
        t_at: slotData.t_at,
        title: slotData.title,
        desc: slotData.desc,
        type: slotData.type,
        order_idx: slotsCreated + 1
      });
      
      // 질문 생성
      if (slotData.questions && slotData.questions.length > 0) {
        for (const q of slotData.questions) {
          eventUtils.createQuestion({
            slot_id: slot.id,
            text: q.text,
            kind: q.kind
          });
        }
      }
      
      slotsCreated++;
    }

    // 저장소 상태 확인
    const status = eventUtils.getStatus();
    console.log('📊 슬롯 업데이트 완료, 저장소 상태:', status);

    return NextResponse.json({
      message: '슬롯이 성공적으로 업데이트되었습니다.',
      slots_updated: slotsCreated
    });

  } catch (error) {
    console.error('슬롯 업데이트 오류:', error);
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
