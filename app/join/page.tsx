'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';

export default function JoinPage() {
  const searchParams = useSearchParams();
  const initialCode = searchParams.get('code') || '';
  
  const [eventCode, setEventCode] = useState(initialCode);
  const [eventData, setEventData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [currentTime, setCurrentTime] = useState(new Date());
  const [currentSlot, setCurrentSlot] = useState<any>(null);
  const [showAnswerModal, setShowAnswerModal] = useState(false);
  const [selectedQuestion, setSelectedQuestion] = useState<any>(null);
  const [selectedSlot, setSelectedSlot] = useState<any>(null);
  const [answerText, setAnswerText] = useState('');
  const [isSubmittingAnswer, setIsSubmittingAnswer] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [showReportModal, setShowReportModal] = useState(false);
  const [personalReport, setPersonalReport] = useState<string>('');
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);

  // 현재 시간에 맞는 슬롯 찾기
  const findCurrentSlot = (slots: any[]) => {
    const now = new Date();
    return slots.find(slot => {
      if (!slot.t_at) return false;
      const slotTime = new Date(slot.t_at);
      const timeDiff = Math.abs(now.getTime() - slotTime.getTime());
      // 30분 이내의 슬롯을 현재 슬롯으로 인식
      return timeDiff <= 30 * 60 * 1000;
    });
  };

  // 시간 업데이트 (1분마다)
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000);

    return () => clearInterval(timer);
  }, []);

  // 현재 슬롯 업데이트
  useEffect(() => {
    if (eventData?.slots) {
      const current = findCurrentSlot(eventData.slots);
      setCurrentSlot(current);
    }
  }, [eventData, currentTime]);

  const handleJoinEvent = async () => {
    if (!eventCode.trim()) {
      setError('이벤트 코드를 입력해주세요.');
      return;
    }

    setIsLoading(true);
    setError('');
    setEventData(null);

    try {
      const response = await fetch(`/api/events/${eventCode}`);
      
      if (response.ok) {
        const data = await response.json();
        setEventData(data);
        console.log('✅ 이벤트 정보 로드 성공:', data);
      } else {
        const errorData = await response.json();
        setError(errorData.error || '이벤트를 찾을 수 없습니다.');
        console.log('❌ 이벤트 조회 실패:', errorData);
      }
    } catch (error) {
      setError('서버 연결에 실패했습니다.');
      console.error('❌ 서버 오류:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAnswerSubmit = (questionId: string, slotId: string, answerType: string) => {
    setSelectedQuestion({ id: questionId, type: answerType });
    setSelectedSlot({ id: slotId });
    setShowAnswerModal(true);
    setAnswerText('');
  };

  const submitAnswer = async () => {
    if (!answerText.trim() || !selectedQuestion || !selectedSlot || !eventData) {
      return;
    }

    setIsSubmittingAnswer(true);
    try {
      const response = await fetch('/api/answers', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          eventCode: eventData.event.code,
          slotId: selectedSlot.id,
          questionId: selectedQuestion.id,
          answer: answerText.trim(),
          answerType: selectedQuestion.type,
          participantInfo: {
            nickname: '참여자',
            timestamp: new Date().toISOString()
          }
        }),
      });

      if (response.ok) {
        setShowAnswerModal(false);
        setAnswerText('');
        setSelectedQuestion(null);
        setSelectedSlot(null);
        alert('답변이 성공적으로 제출되었습니다!');
      } else {
        const errorData = await response.json();
        alert(`답변 제출 실패: ${errorData.error}`);
      }
    } catch (error) {
      alert('답변 제출 중 오류가 발생했습니다.');
    } finally {
      setIsSubmittingAnswer(false);
    }
  };

  const generatePersonalReport = async () => {
    if (!eventData) return;
    
    setIsGeneratingReport(true);
    try {
      const response = await fetch('/api/reports/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          eventCode: eventData.event.code,
          participantId: '참여자'
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setPersonalReport(data.report);
        setShowReportModal(true);
      } else {
        const errorData = await response.json();
        alert(`리포트 생성 실패: ${errorData.error}`);
      }
    } catch (error) {
      alert('리포트 생성 중 오류가 발생했습니다.');
    } finally {
      setIsGeneratingReport(false);
    }
  };

  const fetchNotifications = async () => {
    if (!eventData) return;
    
    try {
      const response = await fetch(`/api/notifications/send?eventCode=${eventData.event.code}`);
      if (response.ok) {
        const data = await response.json();
        setNotifications(data.notifications || []);
      }
    } catch (error) {
      console.error('알림 조회 실패:', error);
    }
  };

  // 알림 자동 새로고침 (1분마다)
  useEffect(() => {
    if (eventData) {
      fetchNotifications();
      const interval = setInterval(fetchNotifications, 60000);
      return () => clearInterval(interval);
    }
  }, [eventData]);

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="text-center mb-8">
        <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
          🎯 이벤트 참여하기
        </h1>
        <p className="text-lg text-gray-600 dark:text-gray-400">
          이벤트 코드를 입력하여 참여하세요
        </p>
      </div>

      {/* 이벤트 코드 입력 */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-8 mb-8">
        <div className="max-w-md mx-auto">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            이벤트 코드
          </label>
          <div className="flex gap-3">
            <input
              type="text"
              value={eventCode}
              onChange={(e) => setEventCode(e.target.value)}
              placeholder="예: HACK2024"
              className="flex-1 p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              onKeyPress={(e) => e.key === 'Enter' && handleJoinEvent()}
            />
            <button
              onClick={handleJoinEvent}
              disabled={isLoading || !eventCode.trim()}
              className="px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isLoading ? '🔍 검색 중...' : '참여하기'}
            </button>
          </div>
          
          {error && (
            <p className="text-red-600 dark:text-red-400 text-sm mt-2 text-center">
              ❌ {error}
            </p>
          )}
        </div>
      </div>

      {/* 이벤트 정보 표시 */}
      {eventData && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-8">
          <div className="text-center mb-6">
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
              🎉 {eventData.event.name}
            </h2>
            <p className="text-lg text-gray-600 dark:text-gray-400">
              이벤트에 참여하신 것을 환영합니다!
            </p>
          </div>

          {/* 이벤트 기본 정보 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
              <h3 className="font-semibold text-gray-900 dark:text-white mb-2">📅 일시</h3>
              <p className="text-gray-700 dark:text-gray-300">
                {new Date(eventData.event.start_at).toLocaleString('ko-KR')} ~ {new Date(eventData.event.end_at).toLocaleString('ko-KR')}
              </p>
            </div>
            <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
              <h3 className="font-semibold text-gray-900 dark:text-white mb-2">📍 장소</h3>
              <p className="text-gray-700 dark:text-gray-300">{eventData.event.venue}</p>
            </div>
            <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
              <h3 className="font-semibold text-gray-900 dark:text-white mb-2">🔑 이벤트 코드</h3>
              <p className="text-gray-700 dark:text-gray-300 font-mono">{eventData.event.code}</p>
            </div>
            <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
              <h3 className="font-semibold text-gray-900 dark:text-white mb-2">📊 상태</h3>
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                eventData.event.status === 'draft' 
                  ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
                  : 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
              }`}>
                {eventData.event.status === 'draft' ? '준비 중' : '진행 중'}
              </span>
            </div>
          </div>

                     {/* 현재 시간 표시 */}
           <div className="text-center mb-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
             <p className="text-blue-800 dark:text-blue-200 text-lg font-medium">
               🕐 현재 시간: {currentTime.toLocaleString('ko-KR')}
             </p>
           </div>

           {/* 알림 표시 */}
           {notifications.length > 0 && (
             <div className="mb-6 p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-700">
               <h3 className="font-semibold text-yellow-800 dark:text-yellow-200 mb-3">
                 🔔 최신 알림 ({notifications.length}개)
               </h3>
               <div className="space-y-2">
                 {notifications.slice(-3).map((notification: any) => (
                   <div key={notification.id} className="p-3 bg-white dark:bg-gray-700 rounded-lg">
                     <p className="font-medium text-yellow-800 dark:text-yellow-200">
                       {notification.title}
                     </p>
                     <p className="text-sm text-yellow-700 dark:text-yellow-300">
                       {notification.message}
                     </p>
                     <p className="text-xs text-yellow-600 dark:text-yellow-400 mt-1">
                       {new Date(notification.sent_at).toLocaleString('ko-KR')}
                     </p>
                   </div>
                 ))}
               </div>
             </div>
           )}

          {/* 현재 진행 중인 슬롯 */}
          {currentSlot && (
            <div className="mb-8 p-6 bg-green-50 dark:bg-green-900/20 rounded-lg border-2 border-green-200 dark:border-green-700">
              <div className="text-center mb-4">
                <h3 className="text-2xl font-bold text-green-800 dark:text-green-200 mb-2">
                  🎯 현재 진행 중
                </h3>
                <p className="text-green-700 dark:text-green-300">
                  {currentSlot.title}
                </p>
                <p className="text-sm text-green-600 dark:text-green-400">
                  ⏰ {new Date(currentSlot.t_at).toLocaleString('ko-KR')}
                </p>
              </div>

              {/* 슬롯 안내 내용 */}
              {currentSlot.announce && (
                <div className="mb-4 p-4 bg-white dark:bg-gray-700 rounded-lg">
                  <h4 className="font-semibold text-green-800 dark:text-green-200 mb-2">📢 안내</h4>
                  <p className="text-green-700 dark:text-green-300">{currentSlot.announce}</p>
                </div>
              )}

              {/* 슬롯 질문들 */}
              {currentSlot.questions && currentSlot.questions.length > 0 && (
                <div className="space-y-3">
                  <h4 className="font-semibold text-green-800 dark:text-green-200 text-center">❓ 질문</h4>
                  {currentSlot.questions.map((question: any, qIndex: number) => (
                    <div key={question.id} className="p-4 bg-white dark:bg-gray-700 rounded-lg border border-green-200 dark:border-green-600">
                      <div className="flex items-start gap-3">
                        <span className="text-green-600 dark:text-green-400 font-bold text-lg">
                          Q{qIndex + 1}.
                        </span>
                        <div className="flex-1">
                          <p className="text-green-800 dark:text-green-200 font-medium mb-2">
                            {question.text}
                          </p>
                                                     <div className="flex gap-2">
                                                           <button 
                                onClick={() => handleAnswerSubmit(question.id, currentSlot.id, 'text')}
                                className="px-3 py-1 bg-green-600 text-white rounded text-sm hover:bg-green-700 transition-colors"
                              >
                                ✍️ 답변 작성
                              </button>
                              <button 
                                onClick={() => handleAnswerSubmit(question.id, currentSlot.id, 'audio')}
                                className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 transition-colors"
                              >
                                🎤 음성 답변
                              </button>
                           </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* 슬롯 및 질문 정보 */}
          {eventData.slots && eventData.slots.length > 0 && (
            <div>
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                📋 프로그램 일정 ({eventData.slots.length}개 슬롯)
              </h3>
              <div className="space-y-4">
                {eventData.slots.map((slot: any, index: number) => (
                  <div key={slot.id} className="border rounded-lg p-4 bg-gray-50 dark:bg-gray-700">
                    <div className="flex items-center gap-3 mb-3">
                      <span className="text-lg font-bold text-blue-600 dark:text-blue-400">
                        {index + 1}
                      </span>
                      <div className="flex-1">
                        <h4 className="font-semibold text-gray-900 dark:text-white">
                          {slot.title}
                        </h4>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          {slot.t_at}
                        </p>
                      </div>
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                        slot.type === 'ask' 
                          ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' 
                          : 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                      }`}>
                        {slot.type === 'ask' ? '질문' : '안내'}
                      </span>
                    </div>
                    
                    <p className="text-gray-700 dark:text-gray-300 mb-3">{slot.desc}</p>
                    
                    {slot.type === 'announce' && slot.announce && (
                      <div className="bg-blue-50 dark:bg-blue-900/20 rounded p-3">
                        <p className="text-blue-800 dark:text-blue-200 text-sm">
                          📢 {slot.announce}
                        </p>
                      </div>
                    )}
                    
                                         {slot.type === 'ask' && slot.questions && slot.questions.length > 0 && (
                       <div>
                         <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                           질문 ({slot.questions.length}개):
                         </p>
                         <div className="space-y-2">
                           {slot.questions.map((question: any, qIndex: number) => (
                             <div key={`${slot.id}_${question.id}_${qIndex}`} className="flex items-center gap-2 bg-white dark:bg-gray-600 rounded p-2">
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
                               <div className="flex gap-2 ml-auto">
                                 <button 
                                   onClick={() => handleAnswerSubmit(question.id, slot.id, 'text')}
                                   className="px-2 py-1 bg-green-600 text-white rounded text-xs hover:bg-green-700 transition-colors"
                                 >
                                   ✍️ 답변
                                 </button>
                                 <button 
                                   onClick={() => handleAnswerSubmit(question.id, slot.id, 'audio')}
                                   className="px-2 py-1 bg-blue-600 text-white rounded text-xs hover:bg-blue-700 transition-colors"
                                 >
                                   🎤 음성
                                 </button>
                               </div>
                             </div>
                           ))}
                         </div>
                       </div>
                     )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 참여자 액션 */}
          <div className="text-center mt-8 pt-6 border-t border-gray-200 dark:border-gray-600">
            <div className="space-y-3">
              <p className="text-gray-600 dark:text-gray-400">
                이벤트가 시작되면 아래 버튼을 통해 답변을 제출할 수 있습니다.
              </p>
                             <div className="flex gap-3 justify-center">
                 <button className="px-6 py-3 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors">
                   📝 답변 제출하기
                 </button>
                 <button 
                   onClick={generatePersonalReport}
                   disabled={isGeneratingReport}
                   className="px-6 py-3 bg-purple-600 text-white rounded-md hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                 >
                   {isGeneratingReport ? '🔄 리포트 생성 중...' : '📊 내 리포트 보기'}
                 </button>
               </div>
            </div>
          </div>
        </div>
      )}

             {/* 이벤트가 없을 때 안내 */}
       {!eventData && !isLoading && !error && (
         <div className="text-center text-gray-500 dark:text-gray-400">
           <p className="text-lg">이벤트 코드를 입력하고 참여해보세요!</p>
         </div>
       )}

               {/* 답변 제출 모달 */}
        {showAnswerModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4">
              <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">
                💬 답변 제출
              </h3>
              
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  답변 내용
                </label>
                <textarea
                  value={answerText}
                  onChange={(e) => setAnswerText(e.target.value)}
                  placeholder="답변을 입력하세요..."
                  rows={4}
                  className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div className="flex gap-3 justify-end">
                <button
                  onClick={() => setShowAnswerModal(false)}
                  className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors"
                >
                  취소
                </button>
                <button
                  onClick={submitAnswer}
                  disabled={!answerText.trim() || isSubmittingAnswer}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {isSubmittingAnswer ? '제출 중...' : '답변 제출'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 개인 리포트 모달 */}
        {showReportModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                  📊 개인 인사이트 리포트
                </h3>
                <button
                  onClick={() => setShowReportModal(false)}
                  className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                >
                  ✕
                </button>
              </div>
              
              <div className="prose prose-sm max-w-none dark:prose-invert">
                <div 
                  className="markdown-content"
                  dangerouslySetInnerHTML={{ 
                    __html: personalReport.replace(/\n/g, '<br>').replace(/#{1,6}\s+(.+)/g, '<strong>$1</strong>') 
                  }} 
                />
              </div>

              <div className="flex gap-3 justify-end mt-6 pt-4 border-t border-gray-200 dark:border-gray-600">
                <button
                  onClick={() => setShowReportModal(false)}
                  className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors"
                >
                  닫기
                </button>
                <button
                  onClick={() => {
                    const blob = new Blob([personalReport], { type: 'text/plain;charset=utf-8' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `개인리포트_${eventData?.event.name}_${new Date().toISOString().split('T')[0]}.txt`;
                    a.click();
                    URL.revokeObjectURL(url);
                  }}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                >
                  📥 다운로드
                </button>
              </div>
            </div>
          </div>
        )}
     </div>
   );
 }
