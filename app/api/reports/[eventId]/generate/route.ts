import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';
import { generateReport } from '@/lib/openai';

interface ReportContent {
  timeline: Array<{
    slot_title: string;
    snap: string;
    photo?: string;
  }>;
  story: {
    problem: string;
    solution: string;
    validation: string;
  };
  mentoring: {
    highlights: string[];
    applied: string[];
  };
  strengths: string[];
  improvements: string[];
  next30: Array<{
    task: string;
    due: string;
    priority: number;
  }>;
  star: Array<{
    s: string;
    t: string;
    a: string;
    r: string;
  }>;
  social: {
    linkedin3: string;
  };
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ eventId: string }> }
) {
  try {
    const { eventId } = await params;
    const supabase = createServerClient();

    // 1. 이벤트 정보 조회
    const { data: event, error: eventError } = await supabase
      .from('events')
      .select('id, name, code, start_at, end_at')
      .eq('id', eventId)
      .single();

    if (eventError || !event) {
      return NextResponse.json(
        { error: '이벤트를 찾을 수 없습니다.' },
        { status: 404 }
      );
    }

    // 2. 이벤트의 모든 참가자 조회
    const { data: participants, error: participantsError } = await supabase
      .from('participants')
      .select('id, nickname, team, created_at')
      .eq('event_id', eventId);

    if (participantsError || !participants || participants.length === 0) {
      return NextResponse.json(
        { error: '참가자를 찾을 수 없습니다.' },
        { status: 404 }
      );
    }

    // 3. 이벤트의 모든 슬롯과 질문 조회
    const { data: slots, error: slotsError } = await supabase
      .from('slots')
      .select(`
        *,
        questions (*)
      `)
      .eq('event_id', eventId)
      .order('t_at', { ascending: true });

    if (slotsError || !slots) {
      return NextResponse.json(
        { error: '슬롯 정보를 불러올 수 없습니다.' },
        { status: 500 }
      );
    }

    const generatedReports: any[] = [];

    // 4. 각 참가자별로 리포트 생성
    for (const participant of participants) {
      try {
        // 참가자의 모든 답변 조회
        const { data: answers, error: answersError } = await supabase
          .from('answers')
          .select(`
            *,
            questions (
              text,
              kind
            ),
            slots (
              title,
              t_at,
              type
            )
          `)
          .eq('participant_id', participant.id)
          .order('created_at', { ascending: true });

        if (answersError) {
          console.error(`참가자 ${participant.nickname} 답변 조회 실패:`, answersError);
          continue;
        }

        // 태그 빈도 계산
        const tagFrequency: { [key: string]: number } = {};
        answers?.forEach(answer => {
          if (answer.tags && Array.isArray(answer.tags)) {
            answer.tags.forEach((tag: string) => {
              tagFrequency[tag] = (tagFrequency[tag] || 0) + 1;
            });
          }
        });

        // OpenAI로 리포트 생성
        const reportData = await generateReport({
          slots: slots || [],
          answers: answers || [],
          tagFrequency,
          participant: {
            nickname: participant.nickname,
            team: participant.team
          }
        });

        // 5. HTML 템플릿 생성 및 바인딩
        const htmlContent = generateHTMLTemplate(reportData, participant, event);

        // 6. 웹뷰 URL 생성 (실제로는 정적 파일로 저장)
        const webviewUrl = `/reports/${participant.id}/view`;
        
        // 7. PDF 생성 (실제로는 Puppeteer나 다른 PDF 생성 라이브러리 사용)
        const pdfUrl = `/reports/${participant.id}/download.pdf`;

        // 8. 리포트 저장
        const { data: savedReport, error: saveError } = await supabase
          .from('reports')
          .insert({
            participant_id: participant.id,
            event_id: eventId,
            content: reportData,
            webview_url: webviewUrl,
            pdf_url: pdfUrl,
            generated_at: new Date().toISOString()
          })
          .select()
          .single();

        if (saveError) {
          console.error(`참가자 ${participant.nickname} 리포트 저장 실패:`, saveError);
          continue;
        }

        generatedReports.push({
          participant_id: participant.id,
          nickname: participant.nickname,
          team: participant.team,
          report_id: savedReport.id,
          webview_url: webviewUrl,
          pdf_url: pdfUrl
        });

        console.log(`참가자 ${participant.nickname} 리포트 생성 완료`);

      } catch (error) {
        console.error(`참가자 ${participant.nickname} 리포트 생성 중 오류:`, error);
        continue;
      }
    }

    return NextResponse.json({
      message: '참가자별 리포트 생성이 완료되었습니다.',
      event: {
        id: event.id,
        name: event.name,
        code: event.code
      },
      total_participants: participants.length,
      reports_generated: generatedReports.length,
      reports: generatedReports
    });

  } catch (error) {
    console.error('리포트 생성 오류:', error);
    
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

// HTML 템플릿 생성 함수
function generateHTMLTemplate(reportData: ReportContent, participant: any, event: any): string {
  return `
<!DOCTYPE html>
<html lang="ko">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${participant.nickname} - ${event.name} 리포트</title>
    <style>
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 800px;
            margin: 0 auto;
            padding: 20px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
        }
        .container {
            background: white;
            border-radius: 20px;
            padding: 40px;
            box-shadow: 0 20px 40px rgba(0,0,0,0.1);
        }
        .header {
            text-align: center;
            margin-bottom: 40px;
            padding-bottom: 20px;
            border-bottom: 3px solid #667eea;
        }
        .participant-info {
            background: linear-gradient(135deg, #667eea, #764ba2);
            color: white;
            padding: 20px;
            border-radius: 15px;
            margin-bottom: 30px;
        }
        .section {
            margin-bottom: 30px;
            padding: 20px;
            border-left: 4px solid #667eea;
            background: #f8f9fa;
            border-radius: 0 10px 10px 0;
        }
        .section h3 {
            color: #667eea;
            margin-top: 0;
            font-size: 1.4em;
        }
        .timeline-item {
            display: flex;
            align-items: center;
            margin-bottom: 15px;
            padding: 15px;
            background: white;
            border-radius: 10px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        .timeline-time {
            background: #667eea;
            color: white;
            padding: 8px 15px;
            border-radius: 20px;
            font-size: 0.9em;
            margin-right: 15px;
            min-width: 80px;
            text-align: center;
        }
        .star-item {
            background: #fff3cd;
            border: 1px solid #ffeaa7;
            padding: 15px;
            border-radius: 10px;
            margin-bottom: 10px;
        }
        .next30-item {
            background: #d1ecf1;
            border: 1px solid #bee5eb;
            padding: 15px;
            border-radius: 10px;
            margin-bottom: 10px;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }
        .priority {
            background: #dc3545;
            color: white;
            padding: 5px 10px;
            border-radius: 15px;
            font-size: 0.8em;
        }
        .strength {
            background: #d4edda;
            border: 1px solid #c3e6cb;
            padding: 10px 15px;
            border-radius: 20px;
            margin: 5px;
            display: inline-block;
        }
        .improvement {
            background: #f8d7da;
            border: 1px solid #f5c6cb;
            padding: 10px 15px;
            border-radius: 20px;
            margin: 5px;
            display: inline-block;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🎯 개인 인사이트 리포트</h1>
            <h2>${event.name}</h2>
        </div>

        <div class="participant-info">
            <h3>👤 참가자 정보</h3>
            <p><strong>닉네임:</strong> ${participant.nickname}</p>
            <p><strong>팀:</strong> ${participant.team}</p>
            <p><strong>생성일:</strong> ${new Date().toLocaleDateString('ko-KR')}</p>
        </div>

        <div class="section">
            <h3>📅 타임라인</h3>
            ${reportData.timeline.map(item => `
                <div class="timeline-item">
                    <div class="timeline-time">${item.slot_title}</div>
                    <div>
                        <p><strong>스냅샷:</strong> ${item.snap}</p>
                        ${item.photo ? `<p><strong>사진:</strong> ${item.photo}</p>` : ''}
                    </div>
                </div>
            `).join('')}
        </div>

        <div class="section">
            <h3>📖 스토리</h3>
            <p><strong>문제:</strong> ${reportData.story.problem}</p>
            <p><strong>해결책:</strong> ${reportData.story.solution}</p>
            <p><strong>검증:</strong> ${reportData.story.validation}</p>
        </div>

        <div class="section">
            <h3>🎓 멘토링</h3>
            <h4>하이라이트:</h4>
            <ul>
                ${reportData.mentoring.highlights.map(h => `<li>${h}</li>`).join('')}
            </ul>
            <h4>적용된 내용:</h4>
            <ul>
                ${reportData.mentoring.applied.map(a => `<li>${a}</li>`).join('')}
            </ul>
        </div>

        <div class="section">
            <h3>💪 강점</h3>
            ${reportData.strengths.map(s => `<span class="strength">${s}</span>`).join('')}
        </div>

        <div class="section">
            <h3>🔧 개선점</h3>
            ${reportData.improvements.map(i => `<span class="improvement">${i}</span>`).join('')}
        </div>

        <div class="section">
            <h3>⏰ 향후 30일 계획</h3>
            ${reportData.next30.map(item => `
                <div class="next30-item">
                    <div>
                        <p><strong>${item.task}</strong></p>
                        <p>마감일: ${item.due}</p>
                    </div>
                    <span class="priority">우선순위 ${item.priority}</span>
                </div>
            `).join('')}
        </div>

        <div class="section">
            <h3>⭐ STAR 방법론</h3>
            ${reportData.star.map(item => `
                <div class="star-item">
                    <p><strong>Situation:</strong> ${item.s}</p>
                    <p><strong>Task:</strong> ${item.t}</p>
                    <p><strong>Action:</strong> ${item.a}</p>
                    <p><strong>Result:</strong> ${item.r}</p>
                </div>
            `).join('')}
        </div>

        <div class="section">
            <h3>💼 LinkedIn 요약</h3>
            <p>${reportData.social.linkedin3}</p>
        </div>
    </div>
</body>
</html>
  `;
}
