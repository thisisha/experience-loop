import { AIProposedSlots, AnswerSummary, ReportContent } from './types';

// 환경변수 확인
function checkOpenAIEnv() {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey || apiKey === 'dummy_openai_key_for_testing' || apiKey.startsWith('sk-your-actual-openai-key-here')) {
    console.log('⚠️ OpenAI API 키가 설정되지 않았습니다. 테스트용 더미 데이터를 사용합니다.');
    return false;
  }
  console.log('✅ OpenAI API 키 확인됨:', apiKey.substring(0, 20) + '...');
  return true;
}

// 실제 OpenAI 사용 가능 여부 확인
const canUseOpenAI = checkOpenAIEnv();

// OpenAI 클라이언트 초기화 (사용 가능한 경우에만)
let openai: any = null;

async function initializeOpenAI() {
  if (!canUseOpenAI) return;
  
  try {
    console.log('🚀 OpenAI 클라이언트 초기화 시도...');
    
    // ES 모듈 방식으로 import
    const OpenAI = await import('openai');
    openai = new OpenAI.default({
      apiKey: process.env.OPENAI_API_KEY,
    });
    console.log('✅ OpenAI 클라이언트 초기화 성공');
  } catch (error) {
    console.log('❌ OpenAI 클라이언트 초기화 실패:', error);
    console.log('🔄 require 방식으로 재시도...');
    
    try {
      // CommonJS 방식으로 재시도
      const OpenAI = await import('openai');
      openai = new OpenAI.default({
        apiKey: process.env.OPENAI_API_KEY,
      });
      console.log('✅ OpenAI 클라이언트 초기화 성공 (dynamic import 방식)');
    } catch (importError) {
      console.log('❌ dynamic import 방식도 실패:', importError);
    }
  }
}

// 초기화 실행
initializeOpenAI();

export async function proposeSlotsViaAI(pdfText: string): Promise<AIProposedSlots> {
  // 실제 OpenAI API 사용 시도
  if (canUseOpenAI && openai) {
    try {
      console.log('🚀 실제 OpenAI API 호출 중...');
      console.log('📝 입력 데이터 길이:', pdfText.length);

      const prompt = `당신은 해커톤 이벤트 분석 전문가입니다.

주어진 텍스트를 분석하여 이벤트 프로그램 슬롯과 질문을 JSON 형식으로만 생성하세요.

**중요: 반드시 순수 JSON만 반환하고, 한국어 설명이나 다른 텍스트는 포함하지 마세요.**

JSON 형식:
{
  "slots": [
    {
      "t_at": "YYYY-MM-DD HH:MM",
      "title": "슬롯 제목",
      "desc": "슬롯 설명",
      "type": "ask",
      "questions": [
        {
          "text": "질문 내용",
          "kind": "text"
        }
      ],
      "announce": ""
    }
  ]
}

설계 원칙:
- Kolb 경험학습 4단계 반영 (경험→성찰→개념화→실험)
- **모든 슬롯은 'ask' 타입으로 만들고, 기본 안내 + 참가자 질문을 포함하세요**
- **각 슬롯의 구조:**
  - announce: 슬롯에 대한 기본 안내 (시간, 장소, 진행 방식 등)
  - questions: 참가자가 해당 슬롯에서 얻을 수 있는 인사이트를 위한 질문들
- **질문 설계 원칙:**
  - 참가자가 더 깊이 생각하고 참여할 수 있도록
  - 해당 슬롯의 목적과 연결된 의미있는 질문
  - 개인적 성찰과 팀 협업을 촉진하는 질문
  - 30-60초 내에 답변할 수 있는 구체적 질문
- **예시:**
  - "협약서 교환식" → 안내: "협약서 교환 및 내빈 인사 진행" + 질문: "이번 협약이 여러분의 프로젝트에 어떤 기회를 줄 수 있을까요?"
  - "본선 발표" → 안내: "5개팀 3분 발표 + 2분 Q&A" + 질문: "다른 팀의 발표에서 가장 인상 깊었던 점은 무엇인가요?"

분석할 텍스트:
${pdfText.substring(0, 200000)}`;

      console.log('📤 API 요청 전송 중...');
      const completion = await openai.chat.completions.create({
        model: "gpt-4",
        messages: [
          {
            role: "system",
            content: "당신은 해커톤 이벤트 분석 전문가입니다. 반드시 순수 JSON 형식으로만 응답하고, 한국어 설명이나 다른 텍스트는 포함하지 마세요."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        temperature: 0.7,
      });

      const response = completion.choices[0]?.message?.content;
      if (!response) {
        throw new Error('OpenAI 응답이 없습니다.');
      }

      console.log('📥 OpenAI 응답 받음:', response.substring(0, 100) + '...');

      try {
        const result = JSON.parse(response) as AIProposedSlots;
        console.log('✅ OpenAI API 호출 성공, 슬롯 수:', result.slots.length);
        return result;
      } catch (error) {
        throw new Error(`OpenAI 응답 파싱 실패: ${error}`);
      }
    } catch (error) {
      console.error('❌ OpenAI API 호출 실패:', error);
      console.log('🔄 테스트용 더미 데이터로 폴백');
    }
  }

  // 테스트용 더미 데이터 (폴백)
  console.log('📝 테스트용 더미 슬롯 데이터 생성');

  const dummySlots: AIProposedSlots = {
    slots: [
      { "t_at": "2024-12-15 09:00", "title": "오리엔테이션", "desc": "해커톤의 개요와 시간표, 규칙을 안내합니다.", "type": "announce", "questions": [], "announce": "환영합니다! 해커톤의 성공적인 시작을 위해 오리엔테이션에 집중해주세요." },
      { "t_at": "2024-12-15 09:30", "title": "문제 정의", "desc": "팀별로 해결할 문제를 명확히 정의하고 공유합니다.", "type": "ask", "questions": [{ "text": "우리 팀이 해결하려는 핵심 문제는 무엇인가요?", "kind": "text" }, { "text": "이 문제가 왜 중요한가요?", "kind": "audio" }] },
      { "t_at": "2024-12-15 10:30", "title": "아이디어 구체화", "desc": "정의된 문제에 대한 창의적인 해결책을 브레인스토밍하고 구체화합니다.", "type": "ask", "questions": [{ "text": "가장 혁신적인 아이디어는 무엇이며, 어떻게 구현할 계획인가요?", "kind": "text" }] },
      { "t_at": "2024-12-15 13:00", "title": "개발 및 구현", "desc": "아이디어를 실제 프로토타입으로 개발하고 구현합니다.", "type": "ask", "questions": [{ "text": "현재 개발 진행 상황은 어떠하며, 어떤 어려움이 있나요?", "kind": "text" }, { "text": "오늘의 목표 달성 여부는?", "kind": "audio" }] },
      { "t_at": "2024-12-15 16:00", "title": "발표 준비", "desc": "최종 발표를 위한 자료를 준비하고 시연을 연습합니다.", "type": "announce", "questions": [], "announce": "발표 자료를 최종 점검하고, 팀원들과 함께 완벽한 시연을 준비해주세요." },
      { "t_at": "2024-12-15 17:00", "title": "최종 발표 및 시상", "desc": "각 팀의 결과물을 발표하고 우수 팀을 시상합니다.", "type": "ask", "questions": [{ "text": "우리 팀의 프로젝트가 사회에 어떤 긍정적인 영향을 줄 수 있을까요?", "kind": "text" }] }
    ]
  };
  return dummySlots;
}

export async function summarizeAnswer(text: string): Promise<AnswerSummary> {
  // 실제 OpenAI API 사용 시도
  if (canUseOpenAI && openai) {
    try {
      const prompt = `역할: 응답 요약·태깅기.

입력: 자유 텍스트 또는 STT transcript.

출력(JSON): {"summary_2":["핵심1","핵심2"], "tags":["mentor","pivot","demo","metric","risk","ui","api"]}

규칙: summary_2는 2문장, 태그는 1~3개.

텍스트:
${text}`;

      const completion = await openai.chat.completions.create({
        model: "gpt-4",
        messages: [
          {
            role: "system",
            content: "당신은 응답 요약 및 태깅 전문가입니다. JSON 형식으로만 응답하세요."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        temperature: 0.5,
      });

      const response = completion.choices[0]?.message?.content;
      if (!response) {
        throw new Error('OpenAI 응답이 없습니다.');
      }

      try {
        return JSON.parse(response) as AnswerSummary;
      } catch (error) {
        throw new Error(`OpenAI 응답 파싱 실패: ${error}`);
      }
    } catch (error) {
      console.error('OpenAI API 호출 실패, 더미 데이터 사용:', error);
    }
  }

  // 테스트용 더미 응답 요약
  return {
    summary_2: [
      "참가자가 적극적으로 문제 해결에 참여함",
      "팀워크와 협업을 통한 솔루션 개발"
    ],
    tags: ["mentor", "demo", "teamwork"]
  };
}

// 개인 리포트 생성 (P3 프롬프트)
export async function generatePersonalReport(data: {
  event_name: string;
  event_purpose: string;
  participant_answers: Array<{
    slot_title: string;
    slot_time: string;
    question_text: string;
    answer: string;
    answer_type: string;
    submitted_at: string;
  }>;
}): Promise<string> {
  try {
    console.log('🤖 개인 리포트 생성 시작...');
    
    const prompt = `당신은 교육 전문가이자 경험 분석가입니다.

**이벤트 정보:**
- 이벤트명: ${data.event_name}
- 목적: ${data.event_purpose}

**참여자의 답변들:**
${data.participant_answers.map((ans, idx) => `
${idx + 1}. ${ans.slot_title} (${ans.slot_time})
   질문: ${ans.question_text}
   답변: ${ans.answer}
   유형: ${ans.answer_type}
`).join('\n')}

**요청사항:**
위 답변들을 분석하여 참여자만의 개인 인사이트 리포트를 작성해주세요.

**출력 형식:**
# 🎯 ${data.event_name} - 개인 인사이트 리포트

## 📊 참여 요약
- 총 답변 수: ${data.participant_answers.length}개
- 참여 시간대: ${data.participant_answers.length > 0 ? data.participant_answers[0].slot_time : 'N/A'} ~ ${data.participant_answers.length > 0 ? data.participant_answers[data.participant_answers.length - 1].slot_time : 'N/A'}

## 🔍 핵심 인사이트
(참여자의 답변을 바탕으로 한 3-5개의 핵심 인사이트)

## 💡 성장 포인트
(참여자가 이벤트를 통해 얻은 성장과 학습 포인트)

## 🎯 향후 발전 방향
(참여자의 답변 패턴을 바탕으로 한 개선 제안)

## 🌟 특별한 순간
(가장 인상적이거나 의미 있는 답변과 그 이유)

**주의사항:**
- 참여자의 실제 답변 내용을 바탕으로 구체적이고 개인화된 분석을 제공하세요
- 교육적이고 긍정적인 관점에서 분석하세요
- 참여자의 성장과 발전에 초점을 맞추세요
- 한국어로 작성하세요`;

    const response = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [
        {
          role: 'system',
          content: '당신은 교육 전문가이자 경험 분석가입니다. 참여자의 답변을 분석하여 의미 있는 개인 인사이트 리포트를 작성합니다.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      max_tokens: 2000,
      temperature: 0.7
    });

    const report = response.choices[0]?.message?.content || '리포트 생성에 실패했습니다.';
    console.log('✅ 개인 리포트 생성 완료');

    return report;

  } catch (error) {
    console.error('❌ 개인 리포트 생성 실패:', error);
    return `리포트 생성 중 오류가 발생했습니다: ${error instanceof Error ? error.message : '알 수 없는 오류'}`;
  }
}

export async function generateReport(
  slots: Array<{
    id: string;
    title: string;
    desc: string;
    t_at: string;
    type: string;
  }>,
  answers: Array<{
    id: string;
    text?: string;
    tags?: string[];
    summary_2?: string[];
  }>,
  participant: {
    nickname: string;
    team: string;
  }
): Promise<ReportContent> {
  // 실제 OpenAI API 사용 시도
  if (canUseOpenAI && openai) {
    try {
      const prompt = `역할: 개인 인사이트 리포트 작성기.

입력: slots[], answers[], 태그 빈도, 참가자 메타(닉네임/팀).

출력(JSON):
{
 "timeline":[{"slot_title":"","snap":"한 줄","photo?":""}],
 "story":{"problem":"","solution":"","validation":""},
 "mentoring":{"highlights":["..."],"applied":["..."]},
 "strengths":["..."], "improvements":["..."],
 "next30":[{"task":"","due":"YYYY-MM-DD","priority":1}],
 "star":[{"s":"","t":"","a":"","r":""}],
 "social":{"linkedin3":"3줄 요약"}
}

규칙: 간결·행동 동사, 불필요 수식어 금지.

데이터:
슬롯: ${JSON.stringify(slots)}
답변: ${JSON.stringify(answers)}
참가자: ${JSON.stringify(participant)}`;

      const completion = await openai.chat.completions.create({
        model: "gpt-4",
        messages: [
          {
            role: "system",
            content: "당신은 개인 인사이트 리포트 작성 전문가입니다. JSON 형식으로만 응답하세요."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        temperature: 0.7,
      });

      const response = completion.choices[0]?.message?.content;
      if (!response) {
        throw new Error('OpenAI 응답이 없습니다.');
      }

      try {
        return JSON.parse(response) as ReportContent;
      } catch (error) {
        throw new Error(`OpenAI 응답 파싱 실패: ${error}`);
      }
    } catch (error) {
      console.error('OpenAI API 호출 실패, 더미 데이터 사용:', error);
    }
  }

  // 테스트용 더미 리포트
  return {
    timeline: [
      {
        slot_title: "문제 정의",
        snap: "창의적인 문제 해결 접근",
        photo: ""
      }
    ],
    story: {
      problem: "일상생활의 불편함",
      solution: "AI 기반 혁신 서비스",
      validation: "사용자 피드백 수집"
    },
    mentoring: {
      highlights: ["기술적 도전 과제 해결"],
      applied: ["사용자 중심 설계 적용"]
    },
    strengths: ["창의성", "팀워크", "기술력"],
    improvements: ["시간 관리", "문서화"],
    next30: [
      {
        task: "프로토타입 개선",
        due: "2025-01-15",
        priority: 1
      }
    ],
    star: [
      {
        s: "구체적인 문제 정의",
        t: "혁신적인 솔루션 설계",
        a: "적극적인 팀 협업",
        r: "사용자 피드백 반영"
      }
    ],
    social: {
      linkedin3: "AI 기반 일상생활 개선 솔루션을 개발한 해커톤 참가자. 창의적 문제 해결과 팀워크를 통해 혁신적인 프로토타입을 완성했습니다."
    }
  };
}
