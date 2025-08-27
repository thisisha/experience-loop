'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { EventWithSlots, SlotWithQuestions, Question } from '@/lib/types';

export default function EventReviewPage() {
  const params = useParams();
  const router = useRouter();
  const eventCode = params.code as string;
  
  const [event, setEvent] = useState<EventWithSlots | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isPublishing, setIsPublishing] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  useEffect(() => {
    fetchEventData();
  }, [eventCode]);

  const fetchEventData = async () => {
    try {
      const response = await fetch(`/api/events/${eventCode}`);
      if (!response.ok) {
        throw new Error('이벤트를 찾을 수 없습니다.');
      }
      const data = await response.json();
      setEvent(data);
    } catch (error) {
      setError(error instanceof Error ? error.message : '이벤트 데이터를 불러올 수 없습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSlotUpdate = (slotId: string, field: string, value: string) => {
    if (!event) return;
    
    setEvent(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        slots: prev.slots.map(slot => 
          slot.id === slotId ? { ...slot, [field]: value } : slot
        )
      };
    });
  };

  const handleQuestionUpdate = (slotId: string, questionId: string, field: string, value: string) => {
    if (!event) return;
    
    setEvent(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        slots: prev.slots.map(slot => 
          slot.id === slotId ? {
            ...slot,
            questions: slot.questions.map(q => 
              q.id === questionId ? { ...q, [field]: value } : q
            )
          } : slot
        )
      };
    });
  };

  const handlePublish = async () => {
    setIsPublishing(true);
    setError('');
    setSuccessMessage('');

    try {
      const response = await fetch(`/api/events/${eventCode}/publish`, {
        method: 'POST',
      });

      if (!response.ok) {
        const result = await response.json();
        throw new Error(result.error || '이벤트 발행에 실패했습니다.');
      }

      setSuccessMessage('이벤트가 성공적으로 발행되었습니다!');
      
      // 이벤트 상태 업데이트
      if (event) {
        setEvent({ ...event, status: 'published' });
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다.');
    } finally {
      setIsPublishing(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 py-12">
        <div className="max-w-6xl mx-auto px-4">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600 dark:text-gray-400">이벤트 데이터를 불러오는 중...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error || !event) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 py-12">
        <div className="max-w-6xl mx-auto px-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-md p-8 text-center">
            <h1 className="text-2xl font-bold text-red-600 mb-4">오류 발생</h1>
            <p className="text-gray-600 dark:text-gray-400 mb-6">{error}</p>
            <Button onClick={() => router.back()} className="bg-blue-600 hover:bg-blue-700">
              뒤로 가기
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const participantUrl = `${window.location.origin}/(pwa)/join?code=${eventCode}`;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 py-12">
      <div className="max-w-6xl mx-auto px-4">
        {/* 헤더 */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-md p-8 mb-8">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                {event.name}
              </h1>
              <p className="text-gray-600 dark:text-gray-400">
                코드: <span className="font-mono bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">{event.code}</span>
              </p>
              <p className="text-gray-600 dark:text-gray-400">
                장소: {event.venue} | 상태: 
                <span className={`ml-2 px-2 py-1 rounded text-sm ${
                  event.status === 'published' 
                    ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400'
                    : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400'
                }`}>
                  {event.status === 'published' ? '발행됨' : '초안'}
                </span>
              </p>
            </div>
            
            <div className="flex gap-3">
              {event.status === 'draft' && (
                <Button
                  onClick={handlePublish}
                  disabled={isPublishing}
                  className="bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-xl shadow-md"
                >
                  {isPublishing ? '발행 중...' : '발행하기'}
                </Button>
              )}
              <Button
                onClick={() => router.push('/events/new')}
                variant="outline"
                className="px-6 py-3 rounded-xl"
              >
                새 이벤트
              </Button>
            </div>
          </div>
        </div>

        {/* 성공 메시지 */}
        {successMessage && (
          <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-xl text-green-700">
            {successMessage}
          </div>
        )}

        {/* 참가자용 QR */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-md p-8 mb-8">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
            참가자용 QR 코드
          </h2>
          <div className="flex flex-col md:flex-row items-center gap-6">
            <div className="bg-white p-4 rounded-xl border">
              <img
                src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(participantUrl)}`}
                alt="참가자 등록 QR"
                className="w-48 h-48"
              />
            </div>
            <div className="flex-1">
              <p className="text-gray-600 dark:text-gray-400 mb-3">
                참가자들이 이 QR 코드를 스캔하여 이벤트에 등록할 수 있습니다.
              </p>
              <div className="bg-gray-100 dark:bg-gray-700 p-3 rounded-lg">
                <p className="text-sm font-mono text-gray-800 dark:text-gray-200 break-all">
                  {participantUrl}
                </p>
              </div>
              <Button
                onClick={() => navigator.clipboard.writeText(participantUrl)}
                variant="outline"
                className="mt-3"
              >
                URL 복사
              </Button>
            </div>
          </div>
        </div>

        {/* 슬롯 및 질문 테이블 */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-md p-8">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
            슬롯 및 질문 관리
          </h2>
          
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-700">
                  <th className="text-left py-3 px-4 font-medium text-gray-700 dark:text-gray-300">순서</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-700 dark:text-gray-300">시간</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-700 dark:text-gray-300">제목</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-700 dark:text-gray-300">설명</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-700 dark:text-gray-300">타입</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-700 dark:text-gray-300">질문</th>
                </tr>
              </thead>
              <tbody>
                {event.slots.map((slot, index) => (
                  <tr key={slot.id} className="border-b border-gray-100 dark:border-gray-700">
                    <td className="py-4 px-4">
                      <input
                        type="number"
                        value={slot.order_idx}
                        onChange={(e) => handleSlotUpdate(slot.id, 'order_idx', e.target.value)}
                        className="w-16 px-2 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                      />
                    </td>
                    <td className="py-4 px-4">
                      <input
                        type="datetime-local"
                        value={slot.t_at.slice(0, 16)}
                        onChange={(e) => handleSlotUpdate(slot.id, 't_at', e.target.value)}
                        className="px-2 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                      />
                    </td>
                    <td className="py-4 px-4">
                      <input
                        type="text"
                        value={slot.title}
                        onChange={(e) => handleSlotUpdate(slot.id, 'title', e.target.value)}
                        className="w-full px-2 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                      />
                    </td>
                    <td className="py-4 px-4">
                      <textarea
                        value={slot.desc}
                        onChange={(e) => handleSlotUpdate(slot.id, 'desc', e.target.value)}
                        rows={2}
                        className="w-full px-2 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white resize-none"
                      />
                    </td>
                    <td className="py-4 px-4">
                      <select
                        value={slot.type}
                        onChange={(e) => handleSlotUpdate(slot.id, 'type', e.target.value)}
                        className="px-2 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                      >
                        <option value="announce">안내</option>
                        <option value="ask">질문</option>
                      </select>
                    </td>
                    <td className="py-4 px-4">
                      <div className="space-y-2">
                        {slot.questions.map((question) => (
                          <div key={question.id} className="flex gap-2">
                            <input
                              type="text"
                              value={question.text}
                              onChange={(e) => handleQuestionUpdate(slot.id, question.id, 'text', e.target.value)}
                              placeholder="질문 내용"
                              className="flex-1 px-2 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white text-sm"
                            />
                            <select
                              value={question.kind}
                              onChange={(e) => handleQuestionUpdate(slot.id, question.id, 'kind', e.target.value)}
                              className="px-2 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white text-sm"
                            >
                              <option value="text">텍스트</option>
                              <option value="audio">음성</option>
                              <option value="photo">사진</option>
                            </select>
                          </div>
                        ))}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {event.slots.length === 0 && (
            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
              아직 생성된 슬롯이 없습니다. PDF 분석이 완료되면 자동으로 생성됩니다.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
