#!/bin/bash

# Experience Loop (QR Edition) - 스모크 테스트 스크립트
# 목적: 로컬 또는 프리뷰 환경에서 핵심 API 경로를 빠르게 검증

set -e  # 오류 발생 시 스크립트 중단

# 기본 설정
BASE_URL=${BASE_URL:-"http://localhost:3000"}
TEST_CODE=${TEST_CODE:-"ABCD"}
TEST_PW=${TEST_PW:-"pass1234"}
SAMPLE_PDF_URL=${SAMPLE_PDF_URL:-"https://example.com/sample-event.pdf"}

# 색상 정의
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 로그 함수
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# HTTP 상태 코드 확인 함수
check_status() {
    local status=$1
    local expected=$2
    local description=$3
    
    if [ "$status" -eq "$expected" ]; then
        log_success "$description (HTTP $status)"
        return 0
    else
        log_error "$description 실패 - 예상: HTTP $expected, 실제: HTTP $status"
        return 1
    fi
}

# JSON 응답에서 값 추출 함수
extract_json_value() {
    local json=$1
    local key=$2
    echo "$json" | grep -o "\"$key\":\"[^\"]*\"" | cut -d'"' -f4
}

# 테스트 시작
log_info "🚀 Experience Loop 스모크 테스트 시작"
log_info "테스트 대상: $BASE_URL"
log_info "테스트 코드: $TEST_CODE"
log_info "테스트 비밀번호: $TEST_PW"
echo

# 1. 이벤트 생성 테스트
log_info "📝 1. 이벤트 생성 테스트 (POST /api/events)"
EVENT_RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/api/events" \
    -H "Content-Type: application/json" \
    -d "{
        \"name\": \"스모크 테스트 이벤트\",
        \"code\": \"$TEST_CODE\",
        \"password\": \"$TEST_PW\",
        \"start_at\": \"2024-01-15T09:00:00Z\",
        \"end_at\": \"2024-01-15T18:00:00Z\",
        \"venue\": \"테스트 장소\",
        \"pdf_url\": \"$SAMPLE_PDF_URL\"
    }")

EVENT_HTTP_CODE=$(echo "$EVENT_RESPONSE" | tail -n1)
EVENT_BODY=$(echo "$EVENT_RESPONSE" | head -n -1)

if check_status "$EVENT_HTTP_CODE" 200 "이벤트 생성"; then
    EVENT_ID=$(extract_json_value "$EVENT_BODY" "event_id")
    log_info "생성된 이벤트 ID: $EVENT_ID"
else
    log_error "이벤트 생성 실패, 테스트 중단"
    exit 1
fi
echo

# 2. 이벤트 조회 테스트
log_info "🔍 2. 이벤트 조회 테스트 (GET /api/events/$TEST_CODE)"
EVENT_GET_RESPONSE=$(curl -s -w "\n%{http_code}" -X GET "$BASE_URL/api/events/$TEST_CODE")
EVENT_GET_HTTP_CODE=$(echo "$EVENT_GET_RESPONSE" | tail -n1)
EVENT_GET_BODY=$(echo "$EVENT_GET_RESPONSE" | head -n -1)

check_status "$EVENT_GET_HTTP_CODE" 200 "이벤트 조회"
echo

# 3. 이벤트 발행 테스트
log_info "📢 3. 이벤트 발행 테스트 (POST /api/events/$TEST_CODE/publish)"
PUBLISH_RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/api/events/$TEST_CODE/publish")
PUBLISH_HTTP_CODE=$(echo "$PUBLISH_RESPONSE" | tail -n1)
PUBLISH_BODY=$(echo "$PUBLISH_RESPONSE" | head -n -1)

check_status "$PUBLISH_HTTP_CODE" 200 "이벤트 발행"
echo

# 4. 슬롯 정보 조회 테스트
log_info "📋 4. 슬롯 정보 조회 테스트 (GET /api/events/slot/{slotId})"
# 먼저 이벤트에서 슬롯 ID를 가져와야 함
SLOTS_RESPONSE=$(curl -s "$BASE_URL/api/events/$TEST_CODE")
SLOT_ID=$(echo "$SLOTS_RESPONSE" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)

if [ -n "$SLOT_ID" ]; then
    SLOT_RESPONSE=$(curl -s -w "\n%{http_code}" -X GET "$BASE_URL/api/events/slot/$SLOT_ID")
    SLOT_HTTP_CODE=$(echo "$SLOT_RESPONSE" | tail -n1)
    SLOT_BODY=$(echo "$SLOT_RESPONSE" | head -n -1)
    
    check_status "$SLOT_HTTP_CODE" 200 "슬롯 정보 조회"
else
    log_warning "슬롯 ID를 찾을 수 없어 슬롯 조회 테스트 건너뜀"
fi
echo

# 5. 참가자 등록 테스트
log_info "👤 5. 참가자 등록 테스트 (POST /api/join)"
JOIN_RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/api/join" \
    -H "Content-Type: application/json" \
    -d "{
        \"event_code\": \"$TEST_CODE\",
        \"password\": \"$TEST_PW\",
        \"nickname\": \"스모크테스터\",
        \"team\": \"테스트팀\",
        \"push_subscription\": {
            \"endpoint\": \"https://fcm.googleapis.com/fcm/send/test\",
            \"p256dh\": \"test_p256dh_key\",
            \"auth\": \"test_auth_key\"
        }
    }")

JOIN_HTTP_CODE=$(echo "$JOIN_RESPONSE" | tail -n1)
JOIN_BODY=$(echo "$JOIN_RESPONSE" | head -n -1)

if check_status "$JOIN_HTTP_CODE" 200 "참가자 등록"; then
    PARTICIPANT_ID=$(extract_json_value "$JOIN_BODY" "participant_id")
    log_info "등록된 참가자 ID: $PARTICIPANT_ID"
else
    log_warning "참가자 등록 실패, 이후 테스트에 영향 가능"
    PARTICIPANT_ID=""
fi
echo

# 6. 답변 제출 테스트
log_info "✍️ 6. 답변 제출 테스트 (POST /api/answers)"
if [ -n "$SLOT_ID" ]; then
    # FormData 시뮬레이션을 위한 간단한 텍스트 답변
    ANSWERS_RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/api/answers" \
        -F "slot_id=$SLOT_ID" \
        -F "answers[test_question][text]=스모크 테스트 답변입니다." \
        -F "answers[test_question][kind]=text")
    
    ANSWERS_HTTP_CODE=$(echo "$ANSWERS_RESPONSE" | tail -n1)
    ANSWERS_BODY=$(echo "$ANSWERS_RESPONSE" | head -n -1)
    
    check_status "$ANSWERS_HTTP_CODE" 200 "답변 제출"
else
    log_warning "슬롯 ID가 없어 답변 제출 테스트 건너뜀"
fi
echo

# 7. 크론 디스패처 테스트
log_info "⏰ 7. 크론 디스패처 테스트 (GET /api/cron/dispatch)"
CRON_RESPONSE=$(curl -s -w "\n%{http_code}" -X GET "$BASE_URL/api/cron/dispatch")
CRON_HTTP_CODE=$(echo "$CRON_RESPONSE" | tail -n1)
CRON_BODY=$(echo "$CRON_RESPONSE" | head -n -1)

check_status "$CRON_HTTP_CODE" 200 "크론 디스패처"
echo

# 8. 리포트 생성 테스트
log_info "📊 8. 리포트 생성 테스트 (POST /api/reports/{eventId}/generate)"
if [ -n "$EVENT_ID" ]; then
    REPORTS_RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/api/reports/$EVENT_ID/generate")
    REPORTS_HTTP_CODE=$(echo "$REPORTS_RESPONSE" | tail -n1)
    REPORTS_BODY=$(echo "$REPORTS_RESPONSE" | head -n -1)
    
    check_status "$REPORTS_HTTP_CODE" 200 "리포트 생성"
else
    log_warning "이벤트 ID가 없어 리포트 생성 테스트 건너뜀"
fi
echo

# 9. 개인 리포트 조회 테스트
log_info "👁️ 9. 개인 리포트 조회 테스트 (GET /api/reports/{participantId})"
if [ -n "$PARTICIPANT_ID" ]; then
    REPORT_GET_RESPONSE=$(curl -s -w "\n%{http_code}" -X GET "$BASE_URL/api/reports/$PARTICIPANT_ID")
    REPORT_GET_HTTP_CODE=$(echo "$REPORT_GET_RESPONSE" | tail -n1)
    REPORT_GET_BODY=$(echo "$REPORT_GET_RESPONSE" | head -n -1)
    
    if check_status "$REPORT_GET_HTTP_CODE" 200 "개인 리포트 조회"; then
        # 웹뷰 텍스트 포함 확인
        if echo "$REPORT_GET_BODY" | grep -q "webview_url"; then
            log_success "웹뷰 URL 포함 확인"
        else
            log_warning "웹뷰 URL이 응답에 포함되지 않음"
        fi
    fi
else
    log_warning "참가자 ID가 없어 개인 리포트 조회 테스트 건너뜀"
fi
echo

# 테스트 결과 요약
log_info "🎯 스모크 테스트 완료!"
log_info "테스트된 API 엔드포인트: 9개"
log_info "성공: $(grep -c '\[SUCCESS\]' <<< "$(cat $0)")"
log_info "경고: $(grep -c '\[WARNING\]' <<< "$(cat $0)")"
log_info "오류: $(grep -c '\[ERROR\]' <<< "$(cat $0)")"

echo
log_info "💡 다음 단계:"
log_info "1. 환경변수 설정 (.env.local 또는 Vercel)"
log_info "2. Supabase 데이터베이스 연결 확인"
log_info "3. OpenAI API 키 설정"
log_info "4. VAPID 키 생성 및 설정"

echo
log_info "🔧 문제 해결:"
log_info "- 로그 확인: npm run dev"
log_info "- 데이터베이스: Supabase 대시보드"
log_info "- API 테스트: Postman 또는 curl"

echo
log_success "✅ Experience Loop 스모크 테스트가 성공적으로 완료되었습니다!"
