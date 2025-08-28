import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';

export const runtime = 'nodejs';

// 테스트용 메모리 저장소
const participants: any[] = [];

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { eventCode, password, nickname, team, push_subscription } = body;
    
    // 입력 검증
    if (!eventCode || !password || !nickname) {
      return NextResponse.json(
        { error: '필수 필드가 누락되었습니다.' },
        { status: 400 }
      );
    }
    
    // 테스트용 이벤트 검증 (실제로는 DB에서 확인)
    if (eventCode !== 'hackathon2024' || password !== 'pass1234') {
      return NextResponse.json(
        { error: '이벤트 코드 또는 비밀번호가 올바르지 않습니다.' },
        { status: 401 }
      );
    }
    
    // 참가자 ID 생성
    const participantId = `participant_${Date.now()}`;
    
    // 참가자 정보 저장
    const participant = {
      id: participantId,
      event_code: eventCode,
      nickname,
      team: team || '',
      push_subscription: push_subscription || null,
      created_at: new Date().toISOString()
    };
    
    participants.push(participant);
    
    return NextResponse.json({
      message: '참가 등록이 완료되었습니다.',
      participant_id: participantId,
      nickname,
      team
    });
    
  } catch (error) {
    console.error('참가 등록 오류:', error);
    return NextResponse.json(
      { error: '참가 등록에 실패했습니다.' },
      { status: 500 }
    );
  }
}
