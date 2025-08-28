import { NextRequest, NextResponse } from 'next/server';
import { proposeSlotsViaAI } from '@/lib/openai';
import { AIProposedSlots } from '@/lib/types';
import { eventUtils } from '@/lib/storage';
import crypto from 'crypto';

export const runtime = 'nodejs';

async function extractPdfTextFromFile(file: File): Promise<string> {
  try {
    console.log('📄 PDF 파일 처리 시작...');
    console.log('📁 파일명:', file.name);
    console.log('📏 파일 크기:', (file.size / 1024 / 1024).toFixed(2), 'MB');
    
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    
    // 방법 1: pdf-parse 시도
    try {
      console.log('🔄 방법 1: pdf-parse 시도...');
      const pdfParse = await import('pdf-parse');
      const data = await pdfParse.default(buffer);
      const text = data.text.substring(0, 200000);
      console.log('✅ pdf-parse 성공! 텍스트 길이:', text.length);
      return text;
    } catch (error) {
      console.log('❌ pdf-parse 실패:', error instanceof Error ? error.message : String(error));
    }
    
    // 모든 방법 실패 시 사용자에게 직접 입력 요청
    console.log('❌ PDF 텍스트 추출 실패, 사용자 직접 입력 방식 안내');
    return `PDF 파일 "${file.name}"에서 텍스트를 추출할 수 없습니다.

📋 **해결 방법:**
1. PDF를 열어서 텍스트를 선택하고 복사(Ctrl+C)
2. 아래 "PDF 내용 직접 입력" 텍스트 영역에 붙여넣기(Ctrl+V)
3. 또는 슬롯을 직접 작성

이렇게 하면 AI가 실제 PDF 내용을 바탕으로 슬롯과 질문을 생성할 수 있습니다!`;
    
  } catch (error) {
    console.error('❌ PDF 처리 실패:', error);
    return 'PDF 파일 처리 중 오류가 발생했습니다. 텍스트를 직접 복사해서 붙여넣거나 슬롯을 직접 작성해주세요.';
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
  },
  proposedSlots: AIProposedSlots
): Promise<{ event_id: string; slots_created: number }> {
  
  // 공통 저장소에 이벤트 생성
  const event = eventUtils.createEvent(eventData);
  console.log('✅ 이벤트 생성됨:', event.id, event.name);
  
  let slotsCreated = 0;
  
  // 슬롯과 질문 생성
  for (const slotData of proposedSlots.slots) {
    const slot = eventUtils.createSlot({
      event_id: event.id,
      t_at: slotData.t_at,
      title: slotData.title,
      desc: slotData.desc,
      type: slotData.type,
      order_idx: slotsCreated + 1
    });
    
    console.log('✅ 슬롯 생성됨:', slot.id, slot.title);
    
    // 질문 생성
    if (slotData.questions && slotData.questions.length > 0) {
      for (const q of slotData.questions) {
        const question = eventUtils.createQuestion({
          slot_id: slot.id,
          text: q.text,
          kind: q.kind
        });
        console.log('✅ 질문 생성됨:', question.id, question.text);
      }
    }
    
    slotsCreated++;
  }
  
  // 저장소 상태 확인
  const status = eventUtils.getStatus();
  console.log('📊 저장소 상태:', status);
  
  return { event_id: event.id, slots_created: slotsCreated };
}

export async function GET() {
  try {
    const status = eventUtils.getStatus();
    console.log('📊 이벤트 목록 조회, 저장소 상태:', status);

    return NextResponse.json({
      events: status.events,
      total: status.eventsCount,
      message: '이벤트 목록을 성공적으로 조회했습니다.'
    });
  } catch (error) {
    console.error('이벤트 목록 조회 오류:', error);
    return NextResponse.json(
      { error: '이벤트 목록 조회에 실패했습니다.' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    
    const name = formData.get('name') as string;
    const code = formData.get('code') as string;
    const password = formData.get('password') as string;
    const start_at = formData.get('start_at') as string;
    const end_at = formData.get('end_at') as string;
    const venue = formData.get('venue') as string;
    const pdfFile = formData.get('pdf_file') as File;
    const pdfTextInput = formData.get('pdf_text_input') as string;
    const customSlotsJson = formData.get('custom_slots') as string;

    // 입력 검증
    if (!name || !code || !password || !start_at || !end_at || !venue) {
      return NextResponse.json(
        { error: '모든 필수 필드가 필요합니다.' },
        { status: 400 }
      );
    }

    // 이벤트 코드 중복 확인
    const existingEvent = eventUtils.getEvent(code);
    if (existingEvent) {
      return NextResponse.json(
        { error: '이미 사용 중인 이벤트 코드입니다. 다른 코드를 사용해주세요.' },
        { status: 400 }
      );
    }

    // PDF 파일, PDF 텍스트 직접 입력, 직접 작성한 슬롯 중 하나는 있어야 함
    if (!pdfFile && !pdfTextInput?.trim() && !customSlotsJson) {
      return NextResponse.json(
        { error: 'PDF 파일을 업로드하거나, PDF 내용을 직접 입력하거나, 슬롯을 직접 작성해야 합니다.' },
        { status: 400 }
      );
    }

    // 비밀번호 해시 생성
    const passwordHash = crypto.createHash('sha256').update(password).digest('hex');

    let proposedSlots: AIProposedSlots;

        if (pdfFile) {
      // PDF 파일 검증
      if (pdfFile.type !== 'application/pdf') {
        return NextResponse.json(
          { error: 'PDF 파일만 업로드 가능합니다.' },
          { status: 400 }
        );
      }

      if (pdfFile.size > 10 * 1024 * 1024) {
        return NextResponse.json(
          { error: '파일 크기는 10MB 이하여야 합니다.' },
          { status: 400 }
        );
      }

      // 1. PDF에서 텍스트 추출 시도
      const pdfText = await extractPdfTextFromFile(pdfFile);
      console.log('PDF 텍스트 추출 완료, 길이:', pdfText.length);
      
      // PDF 텍스트 추출이 실패했는지 확인 (안내 메시지인지)
      if (pdfText.includes('PDF 파일') && pdfText.includes('텍스트를 추출할 수 없습니다')) {
        // PDF 텍스트 추출 실패 시, 직접 입력된 텍스트가 있는지 확인
        if (pdfTextInput?.trim()) {
          console.log('PDF 텍스트 추출 실패, 직접 입력된 텍스트 사용');
          proposedSlots = await proposeSlotsViaAI(pdfTextInput.trim());
          console.log('AI 슬롯 제안 완료 (직접 입력 텍스트), 슬롯 수:', proposedSlots.slots.length);
        } else if (customSlotsJson) {
          console.log('PDF 텍스트 추출 실패, 직접 입력된 슬롯 사용');
          try {
            const customSlots = JSON.parse(customSlotsJson);
            proposedSlots = {
              slots: customSlots.map((slot: any) => ({
                t_at: slot.t_at,
                title: slot.title,
                desc: slot.desc,
                type: slot.type,
                questions: slot.questions || [],
                announce: slot.announce || ''
              }))
            };
          } catch (error) {
            return NextResponse.json(
              { error: '직접 입력된 슬롯 정보 형식이 올바르지 않습니다.' },
              { status: 400 }
            );
          }
        } else {
          return NextResponse.json(
            { error: 'PDF 텍스트 추출에 실패했습니다. PDF 내용을 직접 입력하거나 슬롯을 직접 작성해주세요.' },
            { status: 400 }
          );
        }
      } else {
        // PDF 텍스트 추출 성공 시 AI 호출
        console.log('PDF 텍스트 추출 성공, AI 호출 중...');
        proposedSlots = await proposeSlotsViaAI(pdfText);
        console.log('AI 슬롯 제안 완료, 슬롯 수:', proposedSlots.slots.length);
      }
    } else if (pdfTextInput?.trim()) {
      // PDF 텍스트 직접 입력이 있는 경우
      console.log('PDF 텍스트 직접 입력 사용, AI 호출 중...');
      proposedSlots = await proposeSlotsViaAI(pdfTextInput.trim());
      console.log('AI 슬롯 제안 완료 (직접 입력), 슬롯 수:', proposedSlots.slots.length);
    } else {
      // 직접 작성한 슬롯 사용
      try {
        const customSlots = JSON.parse(customSlotsJson);
        console.log('직접 작성한 슬롯 사용, 슬롯 수:', customSlots.length);
        
        // 직접 작성한 슬롯을 AIProposedSlots 형식으로 변환
        proposedSlots = {
          slots: customSlots.map((slot: any) => ({
            t_at: slot.t_at,
            title: slot.title,
            desc: slot.desc,
            type: slot.type,
            questions: slot.questions || [],
            announce: slot.announce || ''
          }))
        };
      } catch (error) {
        return NextResponse.json(
          { error: '직접 작성한 슬롯 정보 형식이 올바르지 않습니다.' },
          { status: 400 }
        );
      }
    }

    // 3. 데이터베이스에 저장
    console.log('💾 persistEvent 호출 시작...');
    console.log('📋 proposedSlots:', JSON.stringify(proposedSlots, null, 2));
    
    const result = await persistEvent({
      name,
      code,
      password_hash: passwordHash,
      venue,
      start_at,
      end_at
    }, proposedSlots);
    
    console.log('✅ persistEvent 완료:', result);
    
    // 저장 후 저장소 상태 재확인
    const finalStatus = eventUtils.getStatus();
    console.log('📊 최종 저장소 상태:', finalStatus);
    
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
