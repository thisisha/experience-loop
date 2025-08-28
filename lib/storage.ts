// 전역 메모리 저장소 (API 간 데이터 공유용)
// Next.js API 라우트 간 데이터 공유를 위해 전역 변수로 선언
declare global {
  var __storage: {
    events: any[];
    slots: any[];
    questions: any[];
    answers: any[];
    notifications: any[];
    reports: any[];
  };
}

// 전역 저장소 초기화 (개발 환경에서 Hot Reload 시에도 유지)
if (!global.__storage) {
  global.__storage = {
    events: [],
    slots: [],
    questions: [],
    answers: [],
    notifications: [],
    reports: []
  };
}

export const storage = global.__storage;

// 이벤트 관련 유틸리티 함수들
export const eventUtils = {
  // 이벤트 생성
  createEvent: (eventData: any) => {
    const eventId = `event_${Date.now()}`;
    const event = {
      id: eventId,
      ...eventData,
      status: 'draft',
      created_at: new Date().toISOString()
    };
    storage.events.push(event);
    return event;
  },

  // 이벤트 조회
  getEvent: (code: string) => {
    return storage.events.find(e => e.code === code);
  },

  // 이벤트 목록 조회
  getAllEvents: () => {
    return storage.events;
  },

  // 슬롯 생성
  createSlot: (slotData: any) => {
    const slotId = `slot_${Date.now()}_${slotData.order_idx}`;
    const slot = {
      id: slotId,
      ...slotData,
      status: 'draft'
    };
    storage.slots.push(slot);
    return slot;
  },

  // 이벤트의 슬롯들 조회
  getEventSlots: (eventId: string) => {
    return storage.slots.filter(s => s.event_id === eventId);
  },

  // 질문 생성 - 고유 ID 보장
  createQuestion: (questionData: any) => {
    // 고유한 ID 생성: timestamp + random number + slot_id
    const uniqueId = `question_${Date.now()}_${Math.random().toString(36).substr(2, 9)}_${questionData.slot_id}`;
    const question = {
      id: uniqueId,
      ...questionData,
      required: false
    };
    storage.questions.push(question);
    return question;
  },

  // 슬롯의 질문들 조회
  getSlotQuestions: (slotId: string) => {
    return storage.questions.filter(q => q.slot_id === slotId);
  },

  // 저장소 상태 확인 (디버깅용)
  getStatus: () => {
    return {
      eventsCount: storage.events.length,
      slotsCount: storage.slots.length,
      questionsCount: storage.questions.length,
      events: storage.events.map(e => ({ id: e.id, code: e.code, name: e.name })),
      slots: storage.slots.map(s => ({ id: s.id, event_id: s.event_id, title: s.title })),
      questions: storage.questions.map(q => ({ id: q.id, slot_id: q.slot_id, text: q.text }))
    };
  },

  // 저장소 초기화 (테스트용)
  clearStorage: () => {
    storage.events = [];
    storage.slots = [];
    storage.questions = [];
    if (global.__storage.answers) global.__storage.answers = [];
    if (global.__storage.notifications) global.__storage.notifications = [];
    if (global.__storage.reports) global.__storage.reports = [];
    console.log('🧹 저장소가 초기화되었습니다.');
  }
};
