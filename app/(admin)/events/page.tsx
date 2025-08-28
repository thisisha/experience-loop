'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

export default function EventsPage() {
  const [events, setEvents] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchEvents();
  }, []);

  const fetchEvents = async () => {
    try {
      // 실제로는 API에서 이벤트 목록을 가져와야 함
      // 현재는 더미 데이터 사용
      setEvents([
        {
          id: '1',
          name: '해커톤 2024',
          code: 'HACK2024',
          status: 'published',
          start_at: '2024-01-15T09:00:00Z',
          end_at: '2024-01-16T18:00:00Z',
          venue: '서울대학교'
        }
      ]);
    } catch (error) {
      console.error('이벤트 목록 조회 실패:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="container mx-auto p-6 max-w-6xl">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">이벤트 목록을 불러오는 중...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
          📋 이벤트 관리
        </h1>
        <Link
          href="/events/new"
          className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          ➕ 새 이벤트 생성
        </Link>
      </div>

      {events.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-6xl mb-4">📝</div>
          <h3 className="text-xl font-semibold text-gray-600 dark:text-gray-400 mb-2">
            아직 생성된 이벤트가 없습니다
          </h3>
          <p className="text-gray-500 dark:text-gray-500 mb-6">
            첫 번째 이벤트를 생성해보세요!
          </p>
          <Link
            href="/events/new"
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            🚀 이벤트 생성하기
          </Link>
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {events.map((event) => (
            <div
              key={event.id}
              className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 border border-gray-200 dark:border-gray-700"
            >
              <div className="flex justify-between items-start mb-4">
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                  {event.name}
                </h3>
                <span
                  className={`px-3 py-1 rounded-full text-xs font-medium ${
                    event.status === 'published'
                      ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                      : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
                  }`}
                >
                  {event.status === 'published' ? '발행됨' : '준비 중'}
                </span>
              </div>

              <div className="space-y-3 mb-6">
                <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                  <span>🔑</span>
                  <span className="font-mono">{event.code}</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                  <span>📅</span>
                  <span>
                    {new Date(event.start_at).toLocaleDateString('ko-KR')} ~{' '}
                    {new Date(event.end_at).toLocaleDateString('ko-KR')}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                  <span>📍</span>
                  <span>{event.venue}</span>
                </div>
              </div>

              <div className="flex gap-2">
                <Link
                  href={`/events/${event.code}/review`}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white text-center rounded-md hover:bg-blue-700 transition-colors"
                >
                  👁️ 보기
                </Link>
                <Link
                  href={`/events/${event.code}/qr`}
                  className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
                >
                  📱 QR
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

