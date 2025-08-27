'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';

export default function HomePage() {
  const [showInstallModal, setShowInstallModal] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);

  useEffect(() => {
    // A2HS 설치 프롬프트 감지
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
    });
  }, []);

  const handleInstall = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setDeferredPrompt(null);
        setShowInstallModal(false);
      }
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 dark:from-gray-900 dark:to-gray-800">
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

      {/* Main Content */}
      <div className="container mx-auto px-4 py-16">
        <div className="text-center">
          <h1 className="text-6xl font-bold text-gray-900 dark:text-white mb-6">
            Experience Loop
          </h1>
          <p className="text-xl text-gray-600 dark:text-gray-400 mb-12 max-w-2xl mx-auto">
            해커톤 참가자 경험을 AI로 분석하고 관리하는 혁신적인 플랫폼
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
            <Button
              onClick={() => window.location.href = '/(admin)/events/new'}
              className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-4 rounded-2xl shadow-md text-lg font-semibold"
            >
              🚀 이벤트 생성
            </Button>
            <Button
              onClick={() => window.location.href = '/(pwa)/join'}
              variant="outline"
              className="border-2 border-green-600 text-green-600 hover:bg-green-600 hover:text-white px-8 py-4 rounded-2xl shadow-md text-lg font-semibold"
            >
              📱 참가하기
            </Button>
          </div>

          {/* Features */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl mx-auto">
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-md p-6">
              <div className="text-4xl mb-4">🤖</div>
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                AI 자동 생성
              </h3>
              <p className="text-gray-600 dark:text-gray-400">
                PDF 분석으로 슬롯과 질문을 자동 생성
              </p>
            </div>
            
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-md p-6">
              <div className="text-4xl mb-4">📊</div>
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                실시간 응답
              </h3>
              <p className="text-gray-600 dark:text-gray-400">
                텍스트, 음성, 사진 응답 수집 및 분석
              </p>
            </div>
            
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-md p-6">
              <div className="text-4xl mb-4">📈</div>
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                개인 리포트
              </h3>
              <p className="text-gray-600 dark:text-gray-400">
                참가자별 맞춤형 인사이트 리포트
              </p>
            </div>
          </div>

          {/* A2HS Button */}
          {deferredPrompt && (
            <div className="mt-12">
              <Button
                onClick={() => setShowInstallModal(true)}
                variant="outline"
                className="border-2 border-purple-600 text-purple-600 hover:bg-purple-600 hover:text-white px-6 py-3 rounded-xl"
              >
                📱 앱 설치하기
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
