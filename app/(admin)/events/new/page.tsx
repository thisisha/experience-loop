'use client';

import { useState } from 'react';

interface Slot {
  id: string;
  t_at: string;
  title: string;
  desc: string;
  type: 'ask' | 'announce';
  questions: Question[];
  announce: string;
}

interface Question {
  id: string;
  text: string;
  kind: 'text' | 'audio' | 'photo';
}

export default function NewEventPage() {
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    password: '',
    start_at: '',
    end_at: '',
    venue: '',
  });

  const [slots, setSlots] = useState<Slot[]>([]);
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [pdfTextInput, setPdfTextInput] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState('');
  const [createdEvent, setCreatedEvent] = useState<any>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);

  const addSlot = () => {
    const newSlot: Slot = {
      id: `slot_${Date.now()}`,
      t_at: '',
      title: '',
      desc: '',
      type: 'ask',
      questions: [],
      announce: '',
    };
    setSlots([...slots, newSlot]);
  };

  const removeSlot = (slotId: string) => {
    setSlots(slots.filter(slot => slot.id !== slotId));
  };

  const updateSlot = (slotId: string, field: keyof Slot, value: any) => {
    setSlots(slots.map(slot =>
      slot.id === slotId ? { ...slot, [field]: value } : slot
    ));
  };

  const addQuestion = (slotId: string) => {
    const newQuestion: Question = {
      id: `question_${Date.now()}`,
      text: '',
      kind: 'text',
    };
    setSlots(slots.map(slot =>
      slot.id === slotId
        ? { ...slot, questions: [...slot.questions, newQuestion] }
        : slot
    ));
  };

  const removeQuestion = (slotId: string, questionId: string) => {
    setSlots(slots.map(slot =>
      slot.id === slotId
        ? { ...slot, questions: slot.questions.filter(q => q.id !== questionId) }
        : slot
    ));
  };

  const updateQuestion = (slotId: string, questionId: string, field: keyof Question, value: any) => {
    setSlots(slots.map(slot =>
      slot.id === slotId
        ? {
            ...slot,
            questions: slot.questions.map(q =>
              q.id === questionId ? { ...q, [field]: value } : q
            )
          }
        : slot
    ));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setMessage('');
    setCreatedEvent(null);

    try {
      const formDataToSend = new FormData();

      // 기본 이벤트 정보
      Object.entries(formData).forEach(([key, value]) => {
        formDataToSend.append(key, value);
      });

      // PDF 파일 (있는 경우)
      if (pdfFile) {
        formDataToSend.append('pdf_file', pdfFile);
      }

      // PDF 텍스트 직접 입력 (있는 경우)
      if (pdfTextInput.trim()) {
        formDataToSend.append('pdf_text_input', pdfTextInput.trim());
      }

      // 직접 작성한 슬롯 정보
      formDataToSend.append('custom_slots', JSON.stringify(slots));

      const response = await fetch('/api/events', {
        method: 'POST',
        body: formDataToSend,
      });

      const result = await response.json();

      if (response.ok) {
        setMessage(`✅ 이벤트가 성공적으로 생성되었습니다! (ID: ${result.event_id})`);
        
        // 생성된 이벤트 정보 저장 - 서버에서 생성된 슬롯 정보를 가져와야 함
        console.log('🔄 생성된 이벤트의 슬롯 정보 조회 중...');
        const eventResponse = await fetch(`/api/events/${formData.code}`);
        console.log('📡 이벤트 조회 응답 상태:', eventResponse.status);
        
        if (eventResponse.ok) {
          const eventData = await eventResponse.json();
          console.log('📊 서버에서 받은 이벤트 데이터:', eventData);
          console.log('📋 슬롯 개수:', eventData.slots ? eventData.slots.length : 'undefined');
          
          setCreatedEvent({
            id: result.event_id,
            name: formData.name,
            code: formData.code,
            venue: formData.venue,
            start_at: formData.start_at,
            end_at: formData.end_at,
            slots: eventData.slots || [], // 서버에서 생성된 실제 슬롯 데이터
            password: formData.password // 발행 시 필요
          });
        } else {
          // API 호출 실패 시 로컬 슬롯 사용
          console.log('❌ 이벤트 조회 실패, 로컬 슬롯 사용');
          console.log('📋 로컬 슬롯 개수:', slots.length);
          
          setCreatedEvent({
            id: result.event_id,
            name: formData.name,
            code: formData.code,
            venue: formData.venue,
            start_at: formData.start_at,
            end_at: formData.end_at,
            slots: slots,
            password: formData.password
          });
        }
        
        // 폼 초기화
        setFormData({
          name: '', code: '', password: '', start_at: '', end_at: '', venue: ''
        });
        setSlots([]);
        setPdfFile(null);
        setPdfTextInput('');
      } else {
        setMessage(`❌ 오류: ${result.error}`);
      }
    } catch (error) {
      setMessage(`❌ 서버 오류: ${error}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type === 'application/pdf') {
      setPdfFile(file);
    }
  };

  const startEditing = () => {
    setIsEditing(true);
    // 생성된 이벤트의 슬롯을 편집용으로 복사
    if (createdEvent && createdEvent.slots) {
      setSlots([...createdEvent.slots]);
    }
  };

  const saveChanges = async () => {
    try {
      // 수정된 슬롯을 API로 업데이트
      const response = await fetch(`/api/events/${createdEvent.code}/slots`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          password: createdEvent.password,
          slots: slots
        }),
      });

      if (response.ok) {
        setMessage('✅ 수정사항이 성공적으로 저장되었습니다!');
        setIsEditing(false);
        // 수정된 슬롯으로 createdEvent 업데이트
        setCreatedEvent({
          ...createdEvent,
          slots: [...slots]
        });
      } else {
        const errorData = await response.json();
        setMessage(`❌ 저장 실패: ${errorData.error}`);
      }
    } catch (error) {
      setMessage(`❌ 저장 중 오류 발생: ${error}`);
    }
  };

  const cancelEditing = () => {
    setIsEditing(false);
    // 원래 슬롯으로 복원
    if (createdEvent && createdEvent.slots) {
      setSlots([...createdEvent.slots]);
    }
  };

  const publishEvent = async () => {
    if (!createdEvent.password) {
      setMessage('❌ 발행을 위해 비밀번호가 필요합니다.');
      return;
    }

    setIsPublishing(true);
    try {
      const response = await fetch(`/api/events/${createdEvent.code}/publish`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          password: createdEvent.password
        }),
      });

      if (response.ok) {
        const result = await response.json();
        setMessage('🎉 이벤트가 성공적으로 발행되었습니다! 이제 참가자들이 참여할 수 있습니다.');
        // 이벤트 상태 업데이트
        setCreatedEvent({
          ...createdEvent,
          status: 'published',
          published_at: result.event.published_at
        });
      } else {
        const errorData = await response.json();
        setMessage(`❌ 발행 실패: ${errorData.error}`);
      }
    } catch (error) {
      setMessage(`❌ 발행 중 오류 발생: ${error}`);
    } finally {
      setIsPublishing(false);
    }
  };

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
          새 이벤트 생성
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mt-2">
          PDF 업로드 또는 직접 작성으로 이벤트를 생성하세요
        </p>
      </div>

      {/* 이벤트 생성 폼 */}
      {!createdEvent && (
        <form onSubmit={handleSubmit} className="space-y-8">
          {/* 기본 이벤트 정보 */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              📄 기본 이벤트 정보
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">이벤트명 *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  required
                  placeholder="해커톤 2024"
                  className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">이벤트 코드 *</label>
                <input
                  type="text"
                  value={formData.code}
                  onChange={(e) => setFormData({...formData, code: e.target.value})}
                  required
                  placeholder="HACK2024"
                  className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">운영자 비밀번호 *</label>
                <input
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({...formData, password: e.target.value})}
                  required
                  placeholder="비밀번호 입력"
                  className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">장소 *</label>
                <input
                  type="text"
                  value={formData.venue}
                  onChange={(e) => setFormData({...formData, venue: e.target.value})}
                  required
                  placeholder="서울 강남구"
                  className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">시작 시간 *</label>
                <input
                  type="datetime-local"
                  value={formData.start_at}
                  onChange={(e) => setFormData({...formData, start_at: e.target.value})}
                  required
                  className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">종료 시간 *</label>
                <input
                  type="datetime-local"
                  value={formData.end_at}
                  onChange={(e) => setFormData({...formData, end_at: e.target.value})}
                  required
                  className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
          </div>

          {/* PDF 업로드 */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              📤 PDF 업로드 (선택사항)
            </h2>
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
              <input
                type="file"
                accept=".pdf"
                onChange={handleFileChange}
                className="hidden"
                id="pdf-upload"
              />
              <label htmlFor="pdf-upload" className="cursor-pointer">
                <div className="text-4xl mb-4">📄</div>
                <p className="text-lg font-medium text-gray-900 dark:text-white">
                  {pdfFile ? pdfFile.name : 'PDF 파일을 선택하거나 드래그하세요'}
                </p>
                <p className="text-sm text-gray-500 mt-2">
                  최대 10MB, PDF 파일만 가능
                </p>
              </label>
            </div>
            {pdfFile && (
              <div className="mt-4 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                <p className="text-green-800 dark:text-green-200">
                  ✅ {pdfFile.name} 선택됨 ({(pdfFile.size / 1024 / 1024).toFixed(2)} MB)
                </p>
              </div>
            )}
            
            {/* PDF 내용 직접 입력 (PDF 업로드 실패 시 대안) */}
            <div className="mt-6 space-y-3">
              <h4 className="text-lg font-medium text-gray-900 dark:text-white">📋 PDF 내용 직접 입력 (대안)</h4>
              <textarea
                placeholder="PDF에서 텍스트를 복사해서 여기에 붙여넣기 하세요..."
                value={pdfTextInput}
                onChange={(e) => setPdfTextInput(e.target.value)}
                className="w-full h-32 p-3 border border-gray-300 rounded-lg resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <p className="text-sm text-gray-600 dark:text-gray-400">
                💡 <strong>PDF 텍스트 추출이 실패할 경우:</strong> PDF를 열어서 텍스트를 복사(Ctrl+C)하고 여기에 붙여넣기(Ctrl+V)하세요.
              </p>
            </div>
          </div>

          {/* 직접 슬롯 작성 */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              ➕ 슬롯 및 질문 직접 작성
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              PDF가 없거나 추가 슬롯이 필요한 경우 직접 작성하세요
            </p>
            
            <button
              type="button"
              onClick={addSlot}
              className="mb-4 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
            >
              ➕ 슬롯 추가
            </button>

            <div className="space-y-6">
              {slots.map((slot, index) => (
                <div key={slot.id} className="border rounded-lg p-4 bg-gray-50 dark:bg-gray-800">
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="font-medium">슬롯 {index + 1}</h4>
                    <button
                      type="button"
                      onClick={() => removeSlot(slot.id)}
                      className="px-3 py-1 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
                    >
                      🗑️
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <div>
                      <label className="block text-sm font-medium mb-2">시간</label>
                      <input
                        type="datetime-local"
                        value={slot.t_at}
                        onChange={(e) => updateSlot(slot.id, 't_at', e.target.value)}
                        placeholder="2024-12-15 09:00"
                        className="w-full p-2 border border-gray-300 rounded-md"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2">제목</label>
                      <input
                        type="text"
                        value={slot.title}
                        onChange={(e) => updateSlot(slot.id, 'title', e.target.value)}
                        placeholder="오리엔테이션"
                        className="w-full p-2 border border-gray-300 rounded-md"
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium mb-2">설명</label>
                      <textarea
                        value={slot.desc}
                        onChange={(e) => updateSlot(slot.id, 'desc', e.target.value)}
                        placeholder="슬롯에 대한 설명을 입력하세요"
                        rows={2}
                        className="w-full p-2 border border-gray-300 rounded-md"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2">타입</label>
                      <select
                        value={slot.type}
                        onChange={(e) => updateSlot(slot.id, 'type', e.target.value)}
                        className="w-full p-2 border border-gray-300 rounded-md"
                      >
                        <option value="ask">질문 (ask)</option>
                        <option value="announce">안내 (announce)</option>
                      </select>
                    </div>
                  </div>

                  {slot.type === 'announce' ? (
                    <div>
                      <label className="block text-sm font-medium mb-2">안내 내용</label>
                      <textarea
                        value={slot.announce}
                        onChange={(e) => updateSlot(slot.id, 'announce', e.target.value)}
                        placeholder="참가자에게 전달할 안내 내용"
                        rows={3}
                        className="w-full p-2 border border-gray-300 rounded-md"
                      />
                    </div>
                  ) : (
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <label className="block text-sm font-medium">질문 목록</label>
                        <button
                          type="button"
                          onClick={() => addQuestion(slot.id)}
                          className="px-3 py-1 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
                        >
                          ➕ 질문 추가
                        </button>
                      </div>
                      
                                             <div className="space-y-3">
                         {slot.questions.map((question: any, qIndex: number) => (
                           <div key={question.id} className="flex items-center gap-3 p-3 border rounded-lg bg-white dark:bg-gray-700">
                            <div className="flex-1">
                              <input
                                type="text"
                                value={question.text}
                                onChange={(e) => updateQuestion(slot.id, question.id, 'text', e.target.value)}
                                placeholder={`질문 ${qIndex + 1}을 입력하세요`}
                                className="w-full p-2 border border-gray-300 rounded-md"
                              />
                            </div>
                            <select
                              value={question.kind}
                              onChange={(e) => updateQuestion(slot.id, question.id, 'kind', e.target.value)}
                              className="p-2 border border-gray-300 rounded-md"
                            >
                              <option value="text">텍스트</option>
                              <option value="audio">음성</option>
                              <option value="photo">사진</option>
                            </select>
                            <button
                              type="button"
                              onClick={() => removeQuestion(slot.id, question.id)}
                              className="px-3 py-1 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
                            >
                              🗑️
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {slots.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                <p>아직 슬롯이 없습니다. "슬롯 추가" 버튼을 클릭하여 추가하세요.</p>
              </div>
            )}
          </div>

          {/* 제출 버튼 */}
          <div className="flex justify-center">
            <button
              type="submit"
              disabled={isSubmitting || (!pdfFile && slots.length === 0)}
              className="px-8 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-lg font-medium"
            >
              {isSubmitting ? '생성 중...' : '이벤트 생성'}
            </button>
          </div>

          {/* 메시지 표시 */}
          {message && (
            <div className={`p-4 rounded-lg text-center ${
              message.includes('✅') || message.includes('🎉')
                ? 'bg-green-50 dark:bg-green-900/20 text-green-800 dark:text-green-200'
                : 'bg-red-50 dark:bg-red-900/20 text-red-800 dark:text-red-200'
            }`}>
              {message}
            </div>
          )}
        </form>
      )}

      {/* 생성된 이벤트 결과 표시 및 편집 */}
      {createdEvent && (
        <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-2xl font-bold text-green-800 dark:text-green-200">
              🎉 이벤트 생성 완료!
            </h3>
            <div className="flex gap-2">
              {!isEditing ? (
                <>
                  <button
                    onClick={startEditing}
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                  >
                    ✏️ 수정하기
                  </button>
                  {createdEvent.status !== 'published' && (
                    <button
                      onClick={publishEvent}
                      disabled={isPublishing}
                      className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      {isPublishing ? '발행 중...' : '🚀 발행하기'}
                    </button>
                  )}
                </>
              ) : (
                <>
                  <button
                    onClick={saveChanges}
                    className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
                  >
                    💾 저장하기
                  </button>
                  <button
                    onClick={cancelEditing}
                    className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors"
                  >
                    ❌ 취소
                  </button>
                </>
              )}
            </div>
          </div>
          
          {/* 이벤트 상태 표시 */}
          <div className="mb-4">
            <span className={`px-3 py-1 rounded-full text-sm font-medium ${
              createdEvent.status === 'published' 
                ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
            }`}>
              {createdEvent.status === 'published' ? '🚀 발행됨' : '📝 준비 중'}
            </span>
            {createdEvent.published_at && (
              <span className="ml-2 text-sm text-green-700 dark:text-green-300">
                발행일: {new Date(createdEvent.published_at).toLocaleString('ko-KR')}
              </span>
            )}
          </div>
          
          {/* 이벤트 기본 정보 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div>
              <label className="block text-sm font-medium text-green-700 dark:text-green-300">이벤트명</label>
              <p className="text-green-800 dark:text-green-200 font-semibold">{createdEvent.name}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-green-700 dark:text-green-300">이벤트 코드</label>
              <p className="text-green-800 dark:text-green-200 font-semibold">{createdEvent.code}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-green-700 dark:text-green-300">장소</label>
              <p className="text-green-800 dark:text-green-200">{createdEvent.venue}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-green-700 dark:text-green-300">일시</label>
              <p className="text-green-800 dark:text-green-200">
                {new Date(createdEvent.start_at).toLocaleString('ko-KR')} ~ {new Date(createdEvent.end_at).toLocaleString('ko-KR')}
              </p>
            </div>
          </div>

                     {/* 슬롯 및 질문 편집 */}
           <div className="mb-6">
             <div className="flex items-center justify-between mb-4">
               <h4 className="text-lg font-semibold text-green-800 dark:text-green-200">
                 📋 프로그램 일정 ({createdEvent.slots ? createdEvent.slots.length : 0}개 슬롯)
               </h4>
              {isEditing && (
                <button
                  onClick={addSlot}
                  className="px-3 py-1 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
                >
                  ➕ 슬롯 추가
                </button>
              )}
            </div>

                         <div className="space-y-4">
               {(isEditing ? slots : createdEvent.slots || []).map((slot: any, index: number) => (
                <div key={slot.id} className="bg-white dark:bg-gray-700 rounded-lg p-4 border">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <span className="text-lg font-bold text-blue-600 dark:text-blue-400">
                        {index + 1}
                      </span>
                      <h5 className="font-semibold text-gray-900 dark:text-white">
                        {slot.title}
                      </h5>
                      <span className={`px-2 py-1 rounded text-xs ${
                        slot.type === 'ask' 
                          ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' 
                          : 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                      }`}>
                        {slot.type === 'ask' ? '질문' : '안내'}
                      </span>
                    </div>
                    {isEditing && (
                      <button
                        onClick={() => removeSlot(slot.id)}
                        className="px-2 py-1 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors text-sm"
                      >
                        🗑️
                      </button>
                    )}
                  </div>

                  {isEditing ? (
                    // 편집 모드
                    <div className="space-y-3">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-sm font-medium mb-1">시간</label>
                          <input
                            type="datetime-local"
                            value={slot.t_at}
                            onChange={(e) => updateSlot(slot.id, 't_at', e.target.value)}
                            className="w-full p-2 border border-gray-300 rounded-md text-sm"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium mb-1">제목</label>
                          <input
                            type="text"
                            value={slot.title}
                            onChange={(e) => updateSlot(slot.id, 'title', e.target.value)}
                            className="w-full p-2 border border-gray-300 rounded-md text-sm"
                          />
                        </div>
                        <div className="md:col-span-2">
                          <label className="block text-sm font-medium mb-1">설명</label>
                          <textarea
                            value={slot.desc}
                            onChange={(e) => updateSlot(slot.id, 'desc', e.target.value)}
                            rows={2}
                            className="w-full p-2 border border-gray-300 rounded-md text-sm"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium mb-1">타입</label>
                          <select
                            value={slot.type}
                            onChange={(e) => updateSlot(slot.id, 'type', e.target.value)}
                            className="w-full p-2 border border-gray-300 rounded-md text-sm"
                          >
                            <option value="ask">질문 (ask)</option>
                            <option value="announce">안내 (announce)</option>
                          </select>
                        </div>
                      </div>

                      {slot.type === 'announce' ? (
                        <div>
                          <label className="block text-sm font-medium mb-1">안내 내용</label>
                          <textarea
                            value={slot.announce}
                            onChange={(e) => updateSlot(slot.id, 'announce', e.target.value)}
                            rows={2}
                            className="w-full p-2 border border-gray-300 rounded-md text-sm"
                          />
                        </div>
                      ) : (
                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <label className="block text-sm font-medium">질문 목록</label>
                            <button
                              type="button"
                              onClick={() => addQuestion(slot.id)}
                              className="px-3 py-1 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors text-sm"
                            >
                              ➕ 질문 추가
                            </button>
                          </div>
                          
                                                     <div className="space-y-2">
                             {slot.questions.map((question: any, qIndex: number) => (
                               <div key={question.id} className="flex items-center gap-2 bg-gray-50 dark:bg-gray-600 rounded p-2">
                                <span className="text-blue-600 dark:text-blue-400 font-medium text-sm">
                                  Q{qIndex + 1}.
                                </span>
                                <input
                                  type="text"
                                  value={question.text}
                                  onChange={(e) => updateQuestion(slot.id, question.id, 'text', e.target.value)}
                                  className="flex-1 p-1 border border-gray-300 rounded text-sm"
                                />
                                <select
                                  value={question.kind}
                                  onChange={(e) => updateQuestion(slot.id, question.id, 'kind', e.target.value)}
                                  className="p-2 border border-gray-300 rounded-md text-sm"
                                >
                                  <option value="text">텍스트</option>
                                  <option value="audio">음성</option>
                                  <option value="photo">사진</option>
                                </select>
                                <button
                                  type="button"
                                  onClick={() => removeQuestion(slot.id, question.id)}
                                  className="px-2 py-1 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors text-sm"
                                >
                                  🗑️
                                </button>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    // 보기 모드
                    <div className="space-y-2">
                      <p className="text-gray-700 dark:text-gray-300 text-sm">{slot.desc}</p>
                      <p className="text-gray-600 dark:text-gray-400 text-sm">⏰ {slot.t_at}</p>
                      
                                           {/* 슬롯 안내 내용 표시 */}
                     {slot.announce && (
                       <div className="bg-blue-50 dark:bg-blue-900/20 rounded p-2 mb-2">
                         <p className="text-blue-800 dark:text-blue-200 text-sm">
                           📢 {slot.announce}
                         </p>
                       </div>
                     )}
                     
                     {/* 질문 목록 표시 */}
                     {slot.questions && slot.questions.length > 0 && (
                       <div>
                         <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                           질문 ({slot.questions.length}개):
                         </p>
                         <div className="space-y-1">
                           {slot.questions.map((question: any, qIndex: number) => (
                             <div key={question.id} className="flex items-center gap-2 bg-white dark:bg-gray-600 rounded p-2">
                               <span className="text-blue-600 dark:text-blue-400 font-medium text-xs">
                                 Q{qIndex + 1}.
                               </span>
                               <span className="text-gray-700 dark:text-gray-300 text-sm">
                                 {question.text}
                               </span>
                               <span className={`px-2 py-1 rounded text-xs ${
                                 question.kind === 'text' ? 'bg-gray-100 text-gray-700 dark:bg-gray-600 dark:text-gray-300' :
                                 question.kind === 'audio' ? 'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-200' :
                                 'bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-200'
                               }`}>
                                 {question.kind === 'text' ? '텍스트' : question.kind === 'audio' ? '음성' : '사진'}
                               </span>
                             </div>
                           ))}
                         </div>
                       </div>
                     )}
                     
                     {/* announce가 없고 questions도 없는 경우 기본 안내 */}
                     {!slot.announce && (!slot.questions || slot.questions.length === 0) && (
                       <div className="bg-gray-50 dark:bg-gray-700 rounded p-2">
                         <p className="text-gray-600 dark:text-gray-400 text-sm">
                           ℹ️ {slot.title} 진행 예정
                         </p>
                       </div>
                     )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

                     {/* 액션 버튼들 */}
           <div className="flex gap-3 justify-center flex-wrap">
             <a
               href={`/events/${createdEvent.code}/review`}
               className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
             >
               📋 이벤트 검토하기
             </a>
             <a
               href={`/events/${createdEvent.code}/qr`}
               className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 transition-colors"
             >
               📱 QR 코드 생성
             </a>
             <a
               href={`/join?code=${createdEvent.code}`}
               className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
             >
               🎯 참여자용 페이지 보기
             </a>
             <button
               onClick={() => setCreatedEvent(null)}
               className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors"
             >
               ✨ 새 이벤트 만들기
             </button>
           </div>
        </div>
      )}
    </div>
  );
}
