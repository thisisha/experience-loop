import { NextResponse } from 'next/server';
import { eventUtils } from '@/lib/storage';

export const runtime = 'nodejs';

export async function POST() {
  try {
    // 저장소 초기화
    eventUtils.clearStorage();
    
    return NextResponse.json({
      message: '저장소가 성공적으로 초기화되었습니다.',
      status: 'cleared'
    });
  } catch (error) {
    console.error('저장소 초기화 오류:', error);
    return NextResponse.json(
      { error: '저장소 초기화에 실패했습니다.' },
      { status: 500 }
    );
  }
}
