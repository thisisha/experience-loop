'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export default function JoinPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const eventCode = searchParams.get('code') || '';
  
  const [formData, setFormData] = useState({
    event_code: eventCode,
    password: '',
    nickname: '',
    team: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [showInstallModal, setShowInstallModal] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [pushSupported, setPushSupported] = useState(false);

  useEffect(() => {
    // A2HS 설치 프롬프트 감지
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    });

    // 이미 설치되었는지 확인
    if (window.matchMedia('(display-mode: standalone)').matches || 
        (window.navigator as Navigator & { standalone?: boolean }).standalone === true) {
      setIsInstalled(true);
    }

    // 푸시 알림 지원 여부 확인
    setPushSupported('serviceWorker' in navigator && 'PushManager' in window);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError('');

    try {
      // 푸시 알림 구독 (설치된 경우에만)
      let pushSubscription = null;
      if (isInstalled && pushSupported) {
        pushSubscription = await subscribeToPushNotifications();
      }
      
      const response = await fetch('/api/join', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...formData,
          push_subscription: pushSubscription
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || '참가 등록에 실패했습니다.');
      }

      // 성공 시 대시보드로 이동
      router.push('/(pwa)/dashboard');
    } catch (error) {
      setError(error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const subscribeToPushNotifications = async () => {
    try {
      // 서비스 워커 등록
      const registration = await navigator.serviceWorker.register('/workers/service-worker.js');
      
      // 푸시 알림 구독
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: process.env.NEXT_PUBLIC_VAPID_KEY
      });

      const p256dhKey = subscription.getKey('p256dh');
      const authKey = subscription.getKey('auth');

      if (!p256dhKey || !authKey) {
        throw new Error('푸시 구독 키를 가져올 수 없습니다.');
      }

      return {
        endpoint: subscription.endpoint,
        p256dh: btoa(String.fromCharCode(...new Uint8Array(p256dhKey))),
        auth: btoa(String.fromCharCode(...new Uint8Array(authKey)))
      };
    } catch (error) {
      console.error('푸시 알림 구독 실패:', error);
      throw new Error('푸시 알림 구독에 실패했습니다.');
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleInstall = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setDeferredPrompt(null);
        setShowInstallModal(false);
        setIsInstalled(true);
      }
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 dark:from-gray-900 dark:to-gray-800 py-12">
      <div className="max-w-md mx-auto px-4">
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-md p-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-8 text-center">
            이벤트 참가
          </h1>

          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                이벤트 코드 *
              </label>
              <input
                type="text"
                name="event_code"
                value={formData.event_code}
                onChange={handleInputChange}
                required
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                placeholder="hackathon2024"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                이벤트 비밀번호 *
              </label>
              <input
                type="password"
                name="password"
                value={formData.password}
                onChange={handleInputChange}
                required
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                placeholder="이벤트 비밀번호"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                닉네임 *
              </label>
              <input
                type="text"
                name="nickname"
                value={formData.nickname}
                onChange={handleInputChange}
                required
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                placeholder="개발자"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                팀명 *
              </label>
              <input
                type="text"
                name="team"
                value={formData.team}
                onChange={handleInputChange}
                required
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                placeholder="팀A"
              />
            </div>

            <div className="pt-6">
              <Button
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-green-600 hover:bg-green-700 text-white py-3 px-6 rounded-xl shadow-md disabled:opacity-50"
              >
                {isSubmitting ? '등록 중...' : '참가 등록'}
              </Button>
            </div>
          </form>

          {/* A2HS 설치 안내 */}
          {deferredPrompt && !isInstalled && (
            <div className="mt-8 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl">
              <h3 className="font-medium text-green-900 dark:text-green-100 mb-2">
                📱 홈 화면에 추가
              </h3>
              <p className="text-sm text-green-700 dark:text-green-200 mb-3">
                이 앱을 홈 화면에 추가하여 더 빠르게 접근할 수 있습니다.
              </p>
              <Button
                onClick={handleInstall}
                className="w-full bg-green-600 hover:bg-green-700 text-white py-2 px-4 rounded-xl shadow-md text-sm"
              >
                홈 화면에 추가
              </Button>
            </div>
          )}

          {/* 이미 설치된 경우 */}
          {isInstalled && (
            <div className="mt-8 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl">
              <h3 className="font-medium text-blue-900 dark:text-blue-100 mb-2">
                ✅ 이미 설치됨
              </h3>
              <p className="text-sm text-blue-700 dark:text-blue-200">
                이 앱은 이미 홈 화면에 설치되어 있습니다.
              </p>
            </div>
          )}

          {/* PWA 기능 안내 */}
          <div className="mt-8 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl">
            <h3 className="font-medium text-blue-900 dark:text-blue-100 mb-2">
              🚀 PWA 기능
            </h3>
            <ul className="text-sm text-blue-700 dark:text-blue-200 space-y-1">
              <li>• 오프라인에서도 사용 가능</li>
              <li>• 푸시 알림으로 실시간 업데이트</li>
              <li>• 홈 화면에 앱처럼 설치</li>
            </ul>
          </div>

          {/* 푸시 알림 안내 */}
          {pushSupported && (
            <div className="mt-6 p-4 bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-xl">
              <h3 className="font-medium text-purple-900 dark:text-purple-100 mb-2">
                🔔 푸시 알림
              </h3>
              <p className="text-sm text-purple-700 dark:text-purple-200">
                {isInstalled 
                  ? '홈 화면에 설치된 후 푸시 알림을 받을 수 있습니다.'
                  : '홈 화면에 설치하면 푸시 알림을 받을 수 있습니다.'
                }
              </p>
            </div>
          )}

          {/* iOS 특별 안내 */}
          {!isInstalled && (
            <div className="mt-6 p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-xl">
              <h3 className="font-medium text-yellow-900 dark:text-yellow-100 mb-2">
                📱 iOS 사용자
              </h3>
              <p className="text-sm text-yellow-700 dark:text-yellow-200">
                Safari에서 공유 버튼 → &ldquo;홈 화면에 추가&rdquo;를 선택하여 설치하세요.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* A2HS Modal */}
      {showInstallModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-8 max-w-md w-full text-center">
            <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
              📱 홈 화면에 추가
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              이 앱을 홈 화면에 추가하여 더 빠르게 접근할 수 있습니다.
            </p>
            <div className="flex gap-3 justify-center">
              <Button
                onClick={handleInstall}
                className="bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-xl"
              >
                홈 화면에 추가
              </Button>
              <Button
                onClick={() => setShowInstallModal(false)}
                variant="outline"
                className="px-6 py-3 rounded-xl"
              >
                나중에
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
