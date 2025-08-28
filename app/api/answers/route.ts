import { NextRequest, NextResponse } from 'next/server';
import { eventUtils } from '@/lib/storage';

export const runtime = 'nodejs';

// 답변 제출
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { eventCode, slotId, questionId, answer, answerType, participantInfo } = body;

    // 입력 검증
    if (!eventCode || !slotId || !questionId || !answer) {
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

    // 슬롯 존재 확인
    const slot = eventUtils.getEventSlots(event.id).find(s => s.id === slotId);
    if (!slot) {
      return NextResponse.json(
        { error: '슬롯을 찾을 수 없습니다.' },
        { status: 404 }
      );
    }

    // 답변 저장
    const answerId = `answer_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const answerData = {
      id: answerId,
      event_id: event.id,
      slot_id: slotId,
      question_id: questionId,
      answer: answer,
      answer_type: answerType || 'text',
      participant_info: participantInfo || {},
      submitted_at: new Date().toISOString()
    };

    // 전역 저장소에 답변 추가
    if (!global.__storage.answers) {
      global.__storage.answers = [];
    }
    global.__storage.answers.push(answerData);

    console.log('✅ 답변 제출 완료:', answerId);

    return NextResponse.json({
      message: '답변이 성공적으로 제출되었습니다.',
      answer_id: answerId
    });

  } catch (error) {
    console.error('답변 제출 오류:', error);
    return NextResponse.json(
      { error: '답변 제출에 실패했습니다.' },
      { status: 500 }
    );
  }
}

// 이벤트별 답변 조회 (운영자용)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const eventCode = searchParams.get('eventCode');
    const participantId = searchParams.get('participantId');

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

    // 답변 조회
    if (!global.__storage.answers) {
      global.__storage.answers = [];
    }

    let answers = global.__storage.answers.filter(a => a.event_id === event.id);

    // 특정 참여자 답변만 조회
    if (participantId) {
      answers = answers.filter(a => 
        a.participant_info?.id === participantId || 
        a.participant_info?.nickname === participantId
      );
    }

    return NextResponse.json({
      event: event,
      answers: answers,
      total: answers.length
    });

  } catch (error) {
    console.error('답변 조회 오류:', error);
    return NextResponse.json(
      { error: '답변 조회에 실패했습니다.' },
      { status: 500 }
    );
  }
}
