import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';
import { summarizeAnswer } from '@/lib/openai';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    const supabase = createServerClient();
    
    const contentType = request.headers.get('content-type') || '';
    let slotId: string;
    let answersData: Record<string, Record<string, unknown>> = {};
    
    if (contentType.includes('application/json')) {
      const payload = await request.json();
      slotId = payload.slot_id;
      answersData = payload.answers || {};
    } else if (contentType.includes('multipart/form-data')) {
      const formData = await request.formData();
      slotId = formData.get('slot_id') as string;
      
      // FormData에서 답변 데이터 추출
      for (const [key, value] of formData.entries()) {
        if (key.startsWith('answers[')) {
          const match = key.match(/answers\[([^\]]+)\]\[([^\]]+)\]/);
          if (match) {
            const [, questionId, field] = match;
            if (!answersData[questionId]) {
              answersData[questionId] = {};
            }
            answersData[questionId][field] = value;
          }
        }
      }
    } else {
      return NextResponse.json(
        { error: '지원하지 않는 Content-Type입니다. application/json 또는 multipart/form-data를 사용하세요.' },
        { status: 400 }
      );
    }

    if (!slotId) {
      return NextResponse.json(
        { error: '슬롯 ID가 필요합니다.' },
        { status: 400 }
      );
    }

    // 슬롯 정보 조회
    const { data: slot, error: slotError } = await supabase
      .from('slots')
      .select(`
        *,
        events (
          id,
          name
        )
      `)
      .eq('id', slotId)
      .single();

    if (slotError || !slot) {
      return NextResponse.json(
        { error: '슬롯을 찾을 수 없습니다.' },
        { status: 404 }
      );
    }

    // 현재 참가자 정보 조회 (세션 기반)
    // 실제 구현에서는 인증된 사용자 정보를 사용해야 함
    const { data: participants, error: participantsError } = await supabase
      .from('participants')
      .select('id, nickname, team')
      .eq('event_id', slot.event_id)
      .limit(1);

    if (participantsError || !participants || participants.length === 0) {
      return NextResponse.json(
        { error: '참가자 정보를 찾을 수 없습니다.' },
        { status: 404 }
      );
    }

    const participant = participants[0];
    const answers: any[] = [];

    // FormData에서 답변 데이터 추출은 이미 위에서 처리됨

    // 각 질문에 대한 답변 처리
    for (const [questionId, answerData] of Object.entries(answersData)) {
      try {
        let textContent = '';
        let audioFile: File | null = null;
        let photoFile: File | null = null;
        
        const answer = answerData as Record<string, unknown>;

        // 텍스트 답변
        if (answerData.text) {
          textContent = answerData.text as string;
        }

        // 오디오 파일
        if (answerData.audio && answerData.audio instanceof File) {
          audioFile = answerData.audio;
          // TODO: Whisper API 호출하여 STT 수행
          // textContent = await performSTT(audioFile);
        }

        // 사진 파일
        if (answerData.photo && answerData.photo instanceof File) {
          photoFile = answerData.photo;
          // TODO: 이미지 분석 또는 설명 추가
          if (!textContent) {
            textContent = '[사진 답변]';
          }
        }

        if (!textContent.trim()) {
          continue; // 내용이 없는 답변은 건너뛰기
        }

        // OpenAI를 통한 요약 및 태깅
        const summary = await summarizeAnswer(textContent);

        // 답변 저장
        const { data: savedAnswer, error: saveError } = await supabase
          .from('answers')
          .insert({
            participant_id: participant.id,
            slot_id: slotId,
            question_id: questionId,
            text: textContent,
            summary_2: summary.summary_2,
            tags: summary.tags,
            created_at: new Date().toISOString()
          })
          .select()
          .single();

        if (saveError) {
          console.error(`답변 저장 실패 (질문 ${questionId}):`, saveError);
          continue;
        }

        answers.push(savedAnswer);

      } catch (error) {
        console.error(`질문 ${questionId} 처리 중 오류:`, error);
        continue;
      }
    }

    if (answers.length === 0) {
      return NextResponse.json(
        { error: '저장할 답변이 없습니다.' },
        { status: 400 }
      );
    }

    return NextResponse.json({
      message: '답변이 성공적으로 저장되었습니다.',
      answers_saved: answers.length,
      answers: answers.map(answer => ({
        id: answer.id,
        question_id: answer.question_id,
        summary: answer.summary_2,
        tags: answer.tags,
        created_at: answer.created_at
      }))
    });

  } catch (error) {
    console.error('답변 처리 오류:', error);
    
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

// TODO: Whisper STT 함수 구현
async function performSTT(audioFile: File): Promise<string> {
  // OpenAI Whisper API 호출
  // 실제 구현에서는 OpenAI API 키와 함께 호출
  return '[음성 인식 결과]';
}
