'use client';

import { useState, useEffect } from 'react';
import QRCode from 'qrcode';

interface Event {
  id: string;
  code: string;
  name: string;
  venue: string;
  start_at: string;
  end_at: string;
  status: string;
}

export default function EventQRPage({ params }: { params: Promise<{ code: string }> }) {
  const [event, setEvent] = useState<Event | null>(null);
  const [qrCodeUrl, setQrCodeUrl] = useState<string>('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchEvent = async () => {
      try {
        const { code } = await params;
        const response = await fetch(`/api/events/${code}`);
        
        if (response.ok) {
          const eventData = await response.json();
          setEvent(eventData.event);
          
          // QR 코드 생성
          const joinUrl = `${window.location.origin}/join?code=${code}`;
          const qrCode = await QRCode.toDataURL(joinUrl, {
            width: 300,
            margin: 2,
            color: {
              dark: '#000000',
              light: '#FFFFFF'
            }
          });
          setQrCodeUrl(qrCode);
        }
      } catch (error) {
        console.error('이벤트 조회 실패:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchEvent();
  }, [params]);

  if (loading) {
    return (
      <div className="container mx-auto p-6 max-w-4xl">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">로딩 중...</p>
        </div>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="container mx-auto p-6 max-w-4xl">
        <div className="text-center text-red-600">
          <p>이벤트를 찾을 수 없습니다.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
          📱 이벤트 QR 코드
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mt-2">
          참여자들이 스마트폰으로 QR 코드를 스캔하여 이벤트에 참여할 수 있습니다
        </p>
      </div>

      {/* 이벤트 정보 */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 mb-8">
        <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">
          📋 이벤트 정보
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">이벤트명</label>
            <p className="text-lg font-semibold text-gray-900 dark:text-white">{event.name}</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">이벤트 코드</label>
            <p className="text-lg font-semibold text-gray-900 dark:text-white">{event.code}</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">장소</label>
            <p className="text-gray-900 dark:text-white">{event.venue}</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">일시</label>
            <p className="text-gray-900 dark:text-white">
              {new Date(event.start_at).toLocaleString('ko-KR')} ~ {new Date(event.end_at).toLocaleString('ko-KR')}
            </p>
          </div>
        </div>
      </div>

      {/* QR 코드 */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-8 text-center">
        <h3 className="text-xl font-semibold mb-6 text-gray-900 dark:text-white">
          🎯 참여자용 QR 코드
        </h3>
        
        {qrCodeUrl && (
          <div className="mb-6">
            <img 
              src={qrCodeUrl} 
              alt="이벤트 참여 QR 코드" 
              className="mx-auto border-4 border-gray-200 rounded-lg"
            />
          </div>
        )}

        <div className="space-y-4">
          <p className="text-gray-600 dark:text-gray-400">
            <strong>사용 방법:</strong>
          </p>
          <ol className="text-left text-gray-600 dark:text-gray-400 space-y-2 max-w-md mx-auto">
            <li>1. 참여자들이 스마트폰 카메라로 QR 코드를 스캔</li>
            <li>2. 자동으로 참여자 페이지로 이동</li>
            <li>3. 시간대별 질문과 안내 확인</li>
            <li>4. 답변 제출 및 개인 리포트 생성</li>
          </ol>
        </div>

        <div className="mt-8 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
          <p className="text-blue-800 dark:text-blue-200 text-sm">
            💡 <strong>참여자 페이지 URL:</strong> {window.location.origin}/join?code={event.code}
          </p>
        </div>
      </div>

      {/* 액션 버튼들 */}
      <div className="flex gap-3 justify-center mt-8">
        <a
          href={`/events/${event.code}`}
          className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors"
        >
          ← 이벤트로 돌아가기
        </a>
        <a
          href={`/join?code=${event.code}`}
          className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
        >
          🎯 참여자 페이지 보기
        </a>
      </div>
    </div>
  );
}
