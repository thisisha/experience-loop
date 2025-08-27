# Experience Loop

해커톤 참가자 경험 관리 시스템

## 기능

- **이벤트 생성**: PDF 업로드로 자동 슬롯/질문 생성
- **참가자 관리**: PWA 기반 참가자 등록 및 푸시 알림
- **실시간 응답**: 텍스트/오디오/사진 응답 수집
- **AI 분석**: OpenAI를 활용한 응답 요약 및 태깅
- **개인 리포트**: 참가자별 맞춤형 인사이트 리포트 생성

## 기술 스택

- **Frontend**: Next.js 14, TypeScript, Tailwind CSS
- **Backend**: Next.js API Routes
- **Database**: Supabase (PostgreSQL)
- **AI**: OpenAI GPT-4
- **PWA**: Service Worker, Push Notifications
- **PDF 처리**: pdf-parse

## 설치 및 실행

1. **의존성 설치**
   ```bash
   npm install
   ```

2. **환경 변수 설정**
   ```bash
   cp env.example .env.local
   ```
   
   `.env.local`에 다음 값들을 설정:
   - `SUPABASE_URL`: Supabase 프로젝트 URL
   - `SUPABASE_SERVICE_KEY`: Supabase 서비스 롤 키
   - `OPENAI_API_KEY`: OpenAI API 키
   - `VAPID_PUBLIC/PRIVATE`: 웹 푸시용 VAPID 키

3. **개발 서버 실행**
   ```bash
   npm run dev
   ```

4. **브라우저에서 확인**
   ```
   http://localhost:3000
   ```

## 프로젝트 구조

```
/app
  /(admin)/events/new/page.tsx          # 이벤트 생성 폼
  /(admin)/events/[code]/review/page.tsx # 슬롯/질문 검토 및 발행
  /(pwa)/join/page.tsx                  # 참가자 등록
  /(pwa)/dashboard/page.tsx             # 참가자 대시보드
  /api/events/route.ts                  # 이벤트 생성 API
  /api/events/[code]/route.ts           # 이벤트 조회/수정 API
  /api/events/[code]/publish/route.ts  # 이벤트 발행 API
  /api/join/route.ts                    # 참가자 등록 API
  /api/answers/route.ts                 # 응답 제출 API
  /api/reports/[eventId]/generate/route.ts # 리포트 생성 API
  /api/reports/[participantId]/route.ts # 개인 리포트 API
  /api/cron/dispatch/route.ts           # 푸시 알림 발송
/public/manifest.json                   # PWA 매니페스트
/workers/service-worker.ts              # 서비스 워커
/lib/supabase.ts                       # Supabase 클라이언트
/lib/openai.ts                         # OpenAI 클라이언트
/lib/push.ts                           # 푸시 알림 유틸리티
/lib/types.ts                          # TypeScript 타입 정의
```

## 주요 API

### 이벤트 생성
```typescript
POST /api/events
{
  "name": "해커톤 2024",
  "code": "hackathon2024",
  "password": "admin123",
  "start_at": "2024-01-15T09:00:00Z",
  "end_at": "2024-01-16T18:00:00Z",
  "venue": "서울대학교",
  "pdf_url": "https://example.com/event.pdf"
}
```

### 참가자 등록
```typescript
POST /api/join
{
  "event_code": "hackathon2024",
  "password": "admin123",
  "nickname": "개발자",
  "team": "팀A",
  "push_subscription": {
    "endpoint": "...",
    "p256dh": "...",
    "auth": "..."
  }
}
```

## PWA 기능

- **홈 화면 추가**: A2HS (Add to Home Screen) 지원
- **오프라인 지원**: Service Worker를 통한 캐싱
- **푸시 알림**: 실시간 이벤트 알림
- **백그라운드 동기화**: 네트워크 복구 시 데이터 동기화

## 라이선스

MIT License
