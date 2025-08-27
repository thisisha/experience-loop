import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  try {
    const { code } = await params;
    const supabase = createServerClient();

    // 이벤트 상태를 published로 변경
    const { error: updateError } = await supabase
      .from('events')
      .update({ status: 'published' })
      .eq('code', code);

    if (updateError) {
      console.error('이벤트 발행 실패:', updateError);
      return NextResponse.json(
        { error: '이벤트 발행에 실패했습니다.' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      message: '이벤트가 성공적으로 발행되었습니다.',
      status: 'published'
    });

  } catch (error) {
    console.error('이벤트 발행 오류:', error);
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
