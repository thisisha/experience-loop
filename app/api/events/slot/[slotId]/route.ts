import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slotId: string }> }
) {
  try {
    const { slotId } = await params;
    const supabase = createServerClient();

    // 슬롯 정보와 질문들을 함께 조회
    const { data: slot, error: slotError } = await supabase
      .from('slots')
      .select(`
        *,
        questions (*)
      `)
      .eq('id', slotId)
      .single();

    if (slotError || !slot) {
      return NextResponse.json(
        { error: '슬롯을 찾을 수 없습니다.' },
        { status: 404 }
      );
    }

    // 이벤트 정보 조회
    const { data: event, error: eventError } = await supabase
      .from('events')
      .select('id, name, code')
      .eq('id', slot.event_id)
      .single();

    if (eventError || !event) {
      return NextResponse.json(
        { error: '이벤트 정보를 찾을 수 없습니다.' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      slot: {
        id: slot.id,
        title: slot.title,
        desc: slot.desc,
        t_at: slot.t_at,
        type: slot.type,
        questions: slot.questions || []
      },
      event: {
        id: event.id,
        name: event.name,
        code: event.code
      }
    });

  } catch (error) {
    console.error('슬롯 조회 오류:', error);
    
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
