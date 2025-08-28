import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slotId: string }> }
) {
  try {
    const { slotId } = await params;
    
    // 테스트용 더미 슬롯 데이터
    const slot = {
      id: slotId,
      title: "문제 정의",
      desc: "주제별 문제점 브레인스토밍",
      type: "ask",
      t_at: "2024-12-15 09:30",
      questions: [
        {
          id: "q1",
          text: "가장 해결하고 싶은 문제는 무엇인가요?",
          kind: "text"
        },
        {
          id: "q2", 
          text: "이 문제가 왜 중요한가요?",
          kind: "audio"
        }
      ]
    };
    
    return NextResponse.json({
      slot
    });
    
  } catch (error) {
    console.error('슬롯 조회 오류:', error);
    return NextResponse.json(
      { error: '슬롯 조회에 실패했습니다.' },
      { status: 500 }
    );
  }
}
