import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ participantId: string }> }
) {
  try {
    const { participantId } = await params;
    const supabase = createServerClient();
    
    // 1. 참가자 정보 조회
    const { data: participant, error: participantError } = await supabase
      .from('participants')
      .select(`
        *,
        events (*)
      `)
      .eq('id', participantId)
      .single();
      
    if (participantError || !participant) {
      return NextResponse.json(
        { error: '참가자를 찾을 수 없습니다.' },
        { status: 404 }
      );
    }

    // 2. 참가자의 리포트 조회
    const { data: report, error: reportError } = await supabase
      .from('reports')
      .select('*')
      .eq('participant_id', participantId)
      .eq('event_id', participant.event_id)
      .single();
      
    if (reportError) {
      console.error('리포트 조회 실패:', reportError);
      return NextResponse.json(
        { error: '리포트를 찾을 수 없습니다.' },
        { status: 404 }
      );
    }

    // 3. 참가자의 모든 답변 조회
    const { data: answers, error: answersError } = await supabase
      .from('answers')
      .select(`
        *,
        slots (*)
      `)
      .eq('participant_id', participantId)
      .order('created_at', { ascending: true });
      
    if (answersError) {
      console.error('답변 조회 실패:', answersError);
      return NextResponse.json(
        { error: '답변 정보를 불러올 수 없습니다.' },
        { status: 500 }
      );
    }

    // 4. 응답 데이터 구성
    const responseData = {
      participant: {
        id: participant.id,
        nickname: participant.nickname,
        team: participant.team,
        event: participant.events
      },
      report: {
        id: report.id,
        status: report.status,
        generated_at: report.generated_at,
        web_url: report.web_url,
        pdf_url: report.pdf_url
      },
      answers: answers.map(answer => ({
        id: answer.id,
        text: answer.text,
        audio_url: answer.audio_url,
        photo_url: answer.photo_url,
        tags: answer.tags,
        summary: answer.summary_2,
        created_at: answer.created_at,
        slot: answer.slots
      })),
      summary: {
        total_answers: answers.length,
        total_tags: answers.reduce((acc, answer) => acc + (answer.tags?.length || 0), 0),
        tag_frequency: answers.reduce((acc, answer) => {
          answer.tags?.forEach((tag: string) => {
            acc[tag] = (acc[tag] || 0) + 1;
          });
          return acc;
        }, {} as Record<string, number>)
      }
    };

    return NextResponse.json(responseData);
    
  } catch (error) {
    console.error('개인 리포트 조회 오류:', error);
    
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
