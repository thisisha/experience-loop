'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';

interface Event {
  id: string;
  code: string;
  name: string;
  venue: string;
  start_at: string;
  end_at: string;
  status: string;
}

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

export default function EventReviewPage() {
  const params = useParams();
  const eventCode = params.code as string;
  
  const [event, setEvent] = useState<Event | null>(null);
  const [slots, setSlots] = useState<Slot[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchEventData();
  }, [eventCode]);

  const fetchEventData = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/events/${eventCode}`);
      
      if (response.ok) {
        const data = await response.json();
        setEvent(data.event);
        setSlots(data.slots);
      } else {
        setError('이벤트를 찾을 수 없습니다.');
      }
    } catch (error) {
      setError('이벤트 조회 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6 max-w-4xl">
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">이벤트 정보를 불러오는 중...</p>
        </div>
      </div>
    );
  }

  if (error || !event) {
    return (
      <div className="container mx-auto p-6 max-w-4xl">
        <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-6 text-center">
          <h1 className="text-2xl font-bold text-red-800 dark:text-red-200 mb-4">
            ❌ 오류 발생
          </h1>
          <p className="text-red-700 dark:text-red-300">{error || '이벤트를 찾을 수 없습니다.'}</p>
          <a
            href="/events/new"
            className="mt-4 inline-block px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            새 이벤트 만들기
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      {/* 헤더 */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              📋 이벤트 검토
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-2">
              이벤트 정보와 프로그램 일정을 검토하세요
            </p>
          </div>
          <div className="flex gap-2">
            <a
              href={`/join?code=${event.code}`}
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
            >
              🎯 참여자용 페이지 보기
            </a>
            <a
              href="/events/new"
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
            >
              ✨ 새 이벤트 만들기
            </a>
          </div>
        </div>
      </div>

      {/* 이벤트 기본 정보 */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
          📄 이벤트 기본 정보
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              이벤트명
            </label>
            <p className="text-gray-900 dark:text-white font-semibold">{event.name}</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              이벤트 코드
            </label>
            <p className="text-gray-900 dark:text-white font-semibold">{event.code}</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              장소
            </label>
            <p className="text-gray-900 dark:text-white">{event.venue}</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              일시
            </label>
            <p className="text-gray-900 dark:text-white">
              {new Date(event.start_at).toLocaleString('ko-KR')} ~ {new Date(event.end_at).toLocaleString('ko-KR')}
            </p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              상태
            </label>
            <span className={`px-3 py-1 rounded-full text-sm font-medium ${
              event.status === 'published' 
                ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
            }`}>
              {event.status === 'published' ? '🚀 발행됨' : '📝 준비 중'}
            </span>
          </div>
        </div>
      </div>

      {/* 프로그램 일정 */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
        <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
          📋 프로그램 일정 ({slots.length}개 슬롯)
        </h2>
        
        {slots.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <p>아직 슬롯이 없습니다.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {slots.map((slot, index) => (
              <div key={slot.id} className="border rounded-lg p-4 bg-gray-50 dark:bg-gray-700">
                <div className="flex items-center gap-3 mb-3">
                  <span className="text-lg font-bold text-blue-600 dark:text-blue-400">
                    {index + 1}
                  </span>
                  <h3 className="font-semibold text-gray-900 dark:text-white">
                    {slot.title}
                  </h3>
                  <span className={`px-2 py-1 rounded text-xs ${
                    slot.type === 'ask' 
                      ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' 
                      : 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                  }`}>
                    {slot.type === 'ask' ? '질문' : '안내'}
                  </span>
                </div>

                <div className="space-y-2">
                  <p className="text-gray-700 dark:text-gray-300 text-sm">{slot.desc}</p>
                  <p className="text-gray-600 dark:text-gray-400 text-sm">⏰ {slot.t_at}</p>
                  
                  {slot.type === 'announce' && slot.announce && (
                    <div className="bg-blue-50 dark:bg-blue-900/20 rounded p-2">
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
                        {slot.questions.map((question, qIndex) => (
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
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 액션 버튼들 */}
      <div className="flex gap-3 justify-center mt-8">
        <a
          href={`/events/new`}
          className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-lg font-medium"
        >
          ✨ 새 이벤트 만들기
        </a>
        <a
          href={`/join?code=${event.code}`}
          target="_blank"
          rel="noopener noreferrer"
          className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-lg font-medium"
        >
          🎯 참여자용 페이지 보기
        </a>
      </div>
    </div>
  );
}
