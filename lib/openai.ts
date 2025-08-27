import OpenAI from 'openai';
import { AIProposedSlots, AnswerSummary, ReportContent } from './types';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function proposeSlotsViaAI(pdfText: string): Promise<AIProposedSlots> {
  const prompt = `역할: 해커톤/대회 안내문 분석기.

입력: 행사 안내문 텍스트(프로그램/규정/심사 기준 포함).

목표: 타임테이블 슬롯과 슬롯별 "30~60초 컷 질문/안내" 초안을 JSON으로 산출.

출력(JSON):
{ "slots":[
  {"t_at":"YYYY-MM-DD HH:MM","title":"","desc":"","type":"ask|announce",
   "questions":[{"text":"","kind":"text|audio|photo"}],
   "announce":""}
]}

설계 원칙:
- Kolb(경험→성찰→개념화→실험), Gibbs(설명→감정→평가→분석→결론→행동), AAR(예정/실제/차이/교훈) 반영.
- 준비/킥오프: 문제정의·성공기준(SMART). 멘토링: 성찰(바뀐 가설). 중간: 개념화(지표/리스크). 피치 전후: 실험/다음 실행.
- ask 슬롯엔 1~2문항, 12~18자 한문장 지향, 음성응답 허용.

PDF 텍스트:
${pdfText.substring(0, 200000)}`;

  const completion = await openai.chat.completions.create({
    model: "gpt-4",
    messages: [
      {
        role: "system",
        content: "당신은 해커톤 이벤트 분석 전문가입니다. JSON 형식으로만 응답하세요."
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
    return JSON.parse(response) as AIProposedSlots;
  } catch (error) {
    throw new Error(`OpenAI 응답 파싱 실패: ${error}`);
  }
}

export async function summarizeAnswer(text: string): Promise<AnswerSummary> {
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
}

export async function generateReport(
  slots: any[],
  answers: any[],
  participant: any
): Promise<ReportContent> {
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
}
