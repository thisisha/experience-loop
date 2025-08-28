import { NextRequest, NextResponse } from 'next/server';
import { eventUtils } from '@/lib/storage';
import crypto from 'crypto';

export const runtime = 'nodejs';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  try {
    const { code } = await params;
    const body = await request.json();
    const { password } = body;

    // 입력 검증
    if (!password) {
      return NextResponse.json(
        { error: '비밀번호가 필요합니다.' },
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

    // 이벤트 상태를 'published'로 변경
    event.status = 'published';
    event.published_at = new Date().toISOString();

    console.log(`✅ 이벤트 발행 완료: ${event.name} (${event.code})`);

    return NextResponse.json({
      message: '이벤트가 성공적으로 발행되었습니다.',
      event: {
        id: event.id,
        code: event.code,
        name: event.name,
        status: event.status,
        published_at: event.published_at
      }
    });

  } catch (error) {
    console.error('이벤트 발행 오류:', error);
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
