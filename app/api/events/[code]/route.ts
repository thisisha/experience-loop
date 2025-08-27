import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';
import { EventWithSlots } from '@/lib/types';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  try {
    const { code } = await params;
    const supabase = createServerClient();

    // 이벤트 정보 조회
    const { data: event, error: eventError } = await supabase
      .from('events')
      .select('*')
      .eq('code', code)
      .single();

    if (eventError || !event) {
      return NextResponse.json(
        { error: '이벤트를 찾을 수 없습니다.' },
        { status: 404 }
      );
    }

    // 슬롯과 질문 조회
    const { data: slots, error: slotsError } = await supabase
      .from('slots')
      .select(`
        *,
        questions (*)
      `)
      .eq('event_id', event.id)
      .order('order_idx', { ascending: true });

    if (slotsError) {
      console.error('슬롯 조회 실패:', slotsError);
      return NextResponse.json(
        { error: '슬롯 정보를 불러올 수 없습니다.' },
        { status: 500 }
      );
    }

    const eventWithSlots: EventWithSlots = {
      ...event,
      slots: slots || []
    };

    return NextResponse.json(eventWithSlots);

  } catch (error) {
    console.error('이벤트 조회 오류:', error);
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
