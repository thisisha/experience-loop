# 🎯 Experience Loop - AI 기반 경험 학습 플랫폼

[![Next.js](https://img.shields.io/badge/Next.js-15-black?style=for-the-badge&logo=next.js)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue?style=for-the-badge&logo=typescript)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-3.0-38B2AC?style=for-the-badge&logo=tailwind-css)](https://tailwindcss.com/)
[![OpenAI](https://img.shields.io/badge/OpenAI-GPT--4-10A37F?style=for-the-badge&logo=openai)](https://openai.com/)

> **교육적 이벤트에서 참여자들의 경험을 체계적으로 수집하고 AI로 분석하여 개인 맞춤형 인사이트를 제공하는 플랫폼**

## 🌟 주요 기능

### 🎯 **이벤트 생성 및 관리**
- **PDF 기반 자동 슬롯 생성**: AI가 자동으로 타임테이블과 질문 생성
- **Kolb 경험학습 4단계** 반영: 경험 → 성찰 → 개념화 → 실험
- **수동 편집**: 슬롯/질문 추가/수정/삭제
- **이벤트 상태 관리**: Draft → Published

### 🎫 **참여자 경험**
- **간편 참여**: 이벤트 코드 입력으로 즉시 참여
- **QR 코드 지원**: 모바일 친화적 접근
- **시간 기반 자동 표시**: 현재 진행 중인 슬롯 자동 하이라이트
- **다양한 답변 형식**: 텍스트, 음성, 사진 (구현 예정)

### ⏰ **스마트 알림 시스템**
- **자동 알림 발송**: 슬롯 시작/진행/종료 시점별 알림
- **실시간 알림**: 1분마다 자동 새로고침
- **크론 기반 스케줄링**: 시간 기반 자동화

### 📊 **AI 기반 개인 리포트**
- **GPT-4 분석**: 참여자 답변을 AI가 분석하여 인사이트 생성
- **개인화된 피드백**: 이벤트 목적과 연계한 맞춤형 리포트
- **다운로드 지원**: 텍스트 파일 형태로 저장

## 🏗️ 기술 스택

### **Frontend**
- **Next.js 15**: React 기반 풀스택 프레임워크
- **TypeScript**: 타입 안전성과 개발 생산성
- **Tailwind CSS**: 유틸리티 기반 CSS 프레임워크
- **PWA**: Service Worker + Web App Manifest

### **Backend**
- **Next.js API Routes**: 서버리스 API 엔드포인트
- **Node.js**: 서버 사이드 런타임
- **In-memory Storage**: 개발용 임시 저장소
- **Supabase**: 프로덕션용 백엔드 서비스

### **AI & External Services**
- **OpenAI GPT-4**: 자연어 처리 및 리포트 생성
- **PDF Processing**: pdf-parse 라이브러리
- **QR Code Generation**: qrcode 라이브러리

## 🚀 빠른 시작

### **1. 저장소 클론**
```bash
git clone https://github.com/thisisha/experience-loop.git
cd experience-loop
```

### **2. 의존성 설치**
```bash
npm install
```

### **3. 환경 변수 설정**
```bash
cp .env.example .env.local
```

`.env.local` 파일에 다음 정보를 입력하세요:
```env
# OpenAI
OPENAI_API_KEY=your_openai_api_key_here

# Supabase (선택사항)
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key

# VAPID Keys (PWA Push Notifications)
NEXT_PUBLIC_VAPID_PUBLIC_KEY=your_vapid_public_key
VAPID_PRIVATE_KEY=your_vapid_private_key

# Base URL
NEXT_PUBLIC_BASE_URL=http://localhost:3000
```

### **4. 개발 서버 실행**
```bash
npm run dev
```

브라우저에서 [http://localhost:3000](http://localhost:3000)을 열어 확인하세요.

### **5. 프로덕션 빌드**
```bash
npm run build
npm start
```

## 📁 프로젝트 구조

```
experience-loop/
├── app/                          # Next.js 15 App Router
│   ├── (admin)/                 # 운영자 전용 페이지
│   │   └── events/             # 이벤트 관리
│   ├── api/                     # API 엔드포인트
│   │   ├── events/             # 이벤트 CRUD
│   │   ├── answers/            # 답변 제출/조회
│   │   ├── notifications/      # 알림 발송/조회
│   │   ├── reports/            # 리포트 생성/조회
│   │   └── cron/               # 크론 작업
│   ├── join/                    # 참여자 페이지
│   ├── globals.css             # 전역 스타일
│   ├── layout.tsx              # 루트 레이아웃
│   └── page.tsx                # 홈페이지
├── lib/                         # 유틸리티 함수
│   ├── openai.ts               # OpenAI API 연동
│   └── storage.ts              # 데이터 저장소
├── components/                  # 재사용 컴포넌트
├── public/                      # 정적 파일
├── package.json                 # 프로젝트 설정
├── next.config.js              # Next.js 설정
├── tailwind.config.js          # Tailwind CSS 설정
└── tsconfig.json               # TypeScript 설정
```

## 🔧 API 엔드포인트

### **이벤트 관리**
- `POST /api/events` - 이벤트 생성
- `GET /api/events/[code]` - 이벤트 조회
- `PUT /api/events/[code]` - 이벤트 수정
- `POST /api/events/[code]/publish` - 이벤트 발행

### **참여자 기능**
- `POST /api/answers` - 답변 제출
- `GET /api/answers` - 답변 조회
- `POST /api/reports/generate` - 개인 리포트 생성
- `GET /api/reports/generate` - 리포트 조회

### **알림 시스템**
- `POST /api/notifications/send` - 알림 발송
- `GET /api/notifications/send` - 알림 조회
- `POST /api/cron/dispatch` - 크론 작업 실행

## 🎨 사용자 인터페이스

### **운영자 UI**
- **이벤트 생성**: PDF 업로드 + AI 자동 생성
- **이벤트 편집**: 슬롯/질문 수정
- **이벤트 검토**: 전체 내용 확인
- **이벤트 발행**: 최종 공개

### **참여자 UI**
- **이벤트 참여**: 코드 입력
- **현재 진행**: 실시간 슬롯 표시
- **답변 제출**: 질문별 답변 입력
- **알림 확인**: 실시간 알림 목록
- **리포트 보기**: 개인 인사이트 확인

## 🔐 보안 및 권한

### **RLS (Row Level Security)**
- **이벤트 접근**: 공개된 이벤트만 참여 가능
- **답변 관리**: 본인 답변만 조회 가능
- **운영자 권한**: 이벤트 비밀번호 검증

### **환경 변수 보안**
- `.env.local` 파일은 Git에 커밋되지 않음
- 민감한 API 키는 환경 변수로 관리
- 프로덕션 환경에서는 별도 보안 설정 필요

## 🚀 배포

### **Vercel (권장)**
```bash
npm install -g vercel
vercel
```

### **Netlify**
```bash
npm run build
# build 폴더를 Netlify에 업로드
```

### **Docker**
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npm run build
EXPOSE 3000
CMD ["npm", "start"]
```

## 🤝 기여하기

1. Fork the Project
2. Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3. Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the Branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📝 라이선스

이 프로젝트는 MIT 라이선스 하에 배포됩니다. 자세한 내용은 [LICENSE](LICENSE) 파일을 참조하세요.

## 📞 문의

- **GitHub Issues**: [프로젝트 이슈](https://github.com/thisisha/experience-loop/issues)
- **Email**: [your-email@example.com]

## 🙏 감사의 말

- [Next.js](https://nextjs.org/) - 훌륭한 React 프레임워크
- [OpenAI](https://openai.com/) - GPT-4 AI 모델
- [Tailwind CSS](https://tailwindcss.com/) - 유틸리티 기반 CSS
- [Supabase](https://supabase.com/) - 백엔드 서비스

---

**⭐ 이 프로젝트가 도움이 되었다면 Star를 눌러주세요!**
