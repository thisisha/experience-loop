import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';
import { proposeSlotsViaAI } from '@/lib/openai';

export const runtime = 'nodejs';
import { AIProposedSlots } from '@/lib/types';
import crypto from 'crypto';

async function extractPdfText(pdfUrl: string): Promise<string> {
  try {
    const response = await fetch(pdfUrl);
    if (!response.ok) {
      throw new Error(`PDF 다운로드 실패: ${response.status}`);
    }
    
    const arrayBuffer = await response.arrayBuffer();
    const pdfParse = (await import('pdf-parse')).default;
    const data = await pdfParse(Buffer.from(arrayBuffer));
    
    return data.text;
  } catch (error) {
    console.error('PDF 텍스트 추출 실패:', error);
    throw new Error('PDF 텍스트 추출에 실패했습니다.');
  }
}

async function persistEvent(
  eventData: {
    name: string;
    code: string;
    password_hash: string;
    venue: string;
    start_at: string;
    end_at: string;
    pdf_url: string;
  },
  proposedSlots: AIProposedSlots
): Promise<{ event_id: string; slots_created: number }> {
  const supabase = createServerClient();
  
  // 1. 이벤트 생성
  const { data: event, error: eventError } = await supabase
    .from('events')
    .insert([eventData])
    .select('id')
    .single();
    
  if (eventError) {
    console.error('이벤트 생성 실패:', eventError);
    throw new Error('이벤트 생성에 실패했습니다.');
  }
  
  const eventId = event.id;
  let slotsCreated = 0;
  
  // 2. 슬롯과 질문 생성
  for (const slotData of proposedSlots.slots) {
    // 슬롯 생성
    const { data: slot, error: slotError } = await supabase
      .from('slots')
      .insert([{
        event_id: eventId,
        t_at: slotData.t_at,
        title: slotData.title,
        desc: slotData.desc,
        type: slotData.type,
        order_idx: slotsCreated + 1
      }])
      .select('id')
      .single();
      
    if (slotError) {
      console.error('슬롯 생성 실패:', slotError);
      continue;
    }
    
    // 질문 생성
    if (slotData.questions && slotData.questions.length > 0) {
      const questions = slotData.questions.map(q => ({
        slot_id: slot.id,
        text: q.text,
        kind: q.kind,
        required: false
      }));
      
      const { error: questionError } = await supabase
        .from('questions')
        .insert(questions);
        
      if (questionError) {
        console.error('질문 생성 실패:', questionError);
      }
    }
    
    slotsCreated++;
  }
  
  return { event_id: eventId, slots_created: slotsCreated };
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, code, password, start_at, end_at, venue, pdf_url } = body;
    
    // 입력 검증
    if (!name || !code || !password || !start_at || !end_at || !venue || !pdf_url) {
      return NextResponse.json(
        { error: '모든 필수 필드가 필요합니다.' },
        { status: 400 }
      );
    }
    
    // 비밀번호 해시 생성
    const passwordHash = crypto.createHash('sha256').update(password).digest('hex');
    
    // 1. PDF 텍스트 추출
    const pdfText = await extractPdfText(pdf_url);
    
    // 2. AI를 통한 슬롯/질문 제안
    const proposedSlots = await proposeSlotsViaAI(pdfText);
    
    // 3. 데이터베이스에 저장
    const result = await persistEvent({
      name,
      code,
      password_hash: passwordHash,
      venue,
      start_at,
      end_at,
      pdf_url
    }, proposedSlots);
    
    return NextResponse.json({
      message: '이벤트가 성공적으로 생성되었습니다.',
      event_id: result.event_id,
      slots_created: result.slots_created
    });
    
  } catch (error) {
    console.error('이벤트 생성 오류:', error);
    
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
