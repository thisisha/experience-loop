import { NextRequest, NextResponse } from 'next/server';
import { eventUtils } from '@/lib/storage';
import { generatePersonalReport } from '@/lib/openai';

export const runtime = 'nodejs';

// 개인 리포트 생성
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { eventCode, participantId } = body;

    // 입력 검증
    if (!eventCode || !participantId) {
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

    // 참여자의 모든 답변 조회
    if (!global.__storage.answers) {
      global.__storage.answers = [];
    }

    const participantAnswers = global.__storage.answers.filter(a => 
      a.event_id === event.id && 
      (a.participant_info?.id === participantId || a.participant_info?.nickname === participantId)
    );

    if (participantAnswers.length === 0) {
      return NextResponse.json(
        { error: '참여자의 답변을 찾을 수 없습니다.' },
        { status: 404 }
      );
    }

    // 답변 데이터 정리
    const answersBySlot = participantAnswers.map(answer => {
      const slot = eventUtils.getEventSlots(event.id).find(s => s.id === answer.slot_id);
      const question = eventUtils.getSlotQuestions(answer.slot_id).find(q => q.id === answer.question_id);
      
      return {
        slot_title: slot?.title || '알 수 없는 슬롯',
        slot_time: slot?.t_at || '',
        question_text: question?.text || '알 수 없는 질문',
        answer: answer.answer,
        answer_type: answer.answer_type,
        submitted_at: answer.submitted_at
      };
    });

    // AI를 통한 개인 리포트 생성
    const personalReport = await generatePersonalReport({
      event_name: event.name,
      event_purpose: event.purpose || '참여자들의 경험과 인사이트 공유',
      participant_answers: answersBySlot
    });

    // 리포트 저장
    const reportId = `report_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const reportData = {
      id: reportId,
      event_id: event.id,
      participant_id: participantId,
      report_content: personalReport,
      generated_at: new Date().toISOString(),
      status: 'completed'
    };

    // 전역 저장소에 리포트 추가
    if (!global.__storage.reports) {
      global.__storage.reports = [];
    }
    global.__storage.reports.push(reportData);

    console.log('✅ 개인 리포트 생성 완료:', reportId);

    return NextResponse.json({
      message: '개인 리포트가 성공적으로 생성되었습니다.',
      report_id: reportId,
      report: personalReport
    });

  } catch (error) {
    console.error('개인 리포트 생성 오류:', error);
    return NextResponse.json(
      { error: '개인 리포트 생성에 실패했습니다.' },
      { status: 500 }
    );
  }
}

// 참여자별 리포트 조회
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

    // 리포트 조회
    if (!global.__storage.reports) {
      global.__storage.reports = [];
    }

    let reports = global.__storage.reports.filter(r => r.event_id === event.id);

    // 특정 참여자 리포트만 조회
    if (participantId) {
      reports = reports.filter(r => r.participant_id === participantId);
    }

    return NextResponse.json({
      event: event,
      reports: reports,
      total: reports.length
    });

  } catch (error) {
    console.error('리포트 조회 오류:', error);
    return NextResponse.json(
      { error: '리포트 조회에 실패했습니다.' },
      { status: 500 }
    );
  }
}
