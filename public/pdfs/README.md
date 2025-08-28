# PDF 업로드 가이드

## 📁 이 폴더에 PDF 파일을 업로드하세요

### **테스트용 PDF 예시:**
- `hackathon-2024.pdf` - 해커톤 안내문
- `workshop-guide.pdf` - 워크샵 가이드
- `competition-rules.pdf` - 대회 규정

### **사용법:**
1. PDF 파일을 이 폴더에 복사
2. 이벤트 생성 시 URL 입력:
   ```
   http://localhost:3000/pdfs/파일명.pdf
   ```

### **주의사항:**
- 파일명에 공백이나 특수문자 사용 금지
- 한글 파일명은 URL 인코딩 필요
- 최대 파일 크기: 10MB 권장

## 🔗 실제 배포 시 권장사항

### **Supabase Storage 사용:**
```bash
# 1. Supabase 대시보드 → Storage
# 2. 새 버킷 생성: "event-pdfs"
# 3. RLS 정책 설정
# 4. 업로드 후 공개 URL 사용
```

### **환경변수 설정:**
```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_KEY=your_service_key
```
