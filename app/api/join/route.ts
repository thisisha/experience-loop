import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';
import { PushSubscription } from '@/lib/types';

export const runtime = 'nodejs';
import crypto from 'crypto';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { event_code, password, nickname, team, push_subscription } = body;
    
    // 입력 검증
    if (!event_code || !password || !nickname || !team || !push_subscription) {
      return NextResponse.json(
        { error: '모든 필수 필드가 필요합니다.' },
        { status: 400 }
      );
    }

    const supabase = createServerClient();
    
    // 1. 이벤트 존재 여부 및 비밀번호 확인
    const { data: event, error: eventError } = await supabase
      .from('events')
      .select('id, password_hash')
      .eq('code', event_code)
      .single();
      
    if (eventError || !event) {
      return NextResponse.json(
        { error: '이벤트를 찾을 수 없습니다.' },
        { status: 404 }
      );
    }

    // 비밀번호 해시 검증
    const passwordHash = crypto.createHash('sha256').update(password).digest('hex');
    if (event.password_hash !== passwordHash) {
      return NextResponse.json(
        { error: '이벤트 비밀번호가 올바르지 않습니다.' },
        { status: 401 }
      );
    }

    // 2. 참가자 등록
    const { data: participant, error: participantError } = await supabase
      .from('participants')
      .insert([{
        event_id: event.id,
        nickname,
        team,
        push_endpoint: push_subscription.endpoint,
        p256dh: push_subscription.p256dh,
        auth: push_subscription.auth
      }])
      .select('id, nickname, team')
      .single();
      
    if (participantError) {
      console.error('참가자 등록 실패:', participantError);
      return NextResponse.json(
        { error: '참가자 등록에 실패했습니다.' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      message: '참가 등록이 완료되었습니다.',
      participant: {
        id: participant.id,
        nickname: participant.nickname,
        team: participant.team
      }
    });
    
  } catch (error) {
    console.error('참가자 등록 오류:', error);
    
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
