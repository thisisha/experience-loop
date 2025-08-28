'use client';
import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';

interface Slot {
  id: string;
  title: string;
  desc: string;
  type: 'ask' | 'announce';
  questions: Array<{
    text: string;
    kind: 'text' | 'audio' | 'photo';
  }>;
  announce: string;
}

interface Answer {
  slot_id: string;
  text: string;
  audio_url?: string;
  photo_url?: string;
}

function DashboardPageContent() {
  const searchParams = useSearchParams();
  const slotId = searchParams.get('slot');
  const participantId = searchParams.get('participant');
  
  const [currentSlot, setCurrentSlot] = useState<Slot | null>(null);
  const [answer, setAnswer] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [photoFile, setPhotoFile] = useState<File | null>(null);

  useEffect(() => {
    if (slotId) {
      loadSlot(slotId);
    }
  }, [slotId]);

  const loadSlot = async (slotId: string) => {
    try {
      const response = await fetch(`/api/events/slot/${slotId}`);
      if (response.ok) {
        const data = await response.json();
        setCurrentSlot(data.slot);
      }
    } catch (error) {
      console.error('슬롯 로드 실패:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentSlot || !participantId) return;

    setIsSubmitting(true);

    try {
      const formData = new FormData();
      formData.append('slot_id', currentSlot.id);
      formData.append('participant_id', participantId);
      
      if (answer.trim()) {
        formData.append('text', answer.trim());
      }
      
      if (audioBlob) {
        formData.append('audio', audioBlob, 'answer.webm');
      }
      
      if (photoFile) {
        formData.append('photo', photoFile);
      }

      const response = await fetch('/api/answers', {
        method: 'POST',
        body: formData
      });

      if (response.ok) {
        alert('답변이 제출되었습니다!');
        setAnswer('');
        setAudioBlob(null);
        setPhotoFile(null);
      } else {
        alert('답변 제출에 실패했습니다.');
      }
    } catch (error) {
      console.error('답변 제출 오류:', error);
      alert('답변 제출 중 오류가 발생했습니다.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      const chunks: Blob[] = [];

      mediaRecorder.ondataavailable = (e) => chunks.push(e.data);
      mediaRecorder.onstop = () => {
        const blob = new Blob(chunks, { type: 'audio/webm' });
        setAudioBlob(blob);
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setTimeout(() => mediaRecorder.stop(), 30000); // 30초 녹음
    } catch (error) {
      console.error('녹음 실패:', error);
      alert('마이크 접근 권한이 필요합니다.');
    }
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type.startsWith('image/')) {
      setPhotoFile(file);
    }
  };

  if (!currentSlot) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">슬롯을 로딩 중...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="max-w-2xl mx-auto">
        {/* 현재 슬롯 정보 */}
        <div className="bg-white rounded-2xl shadow-md p-6 mb-6">
          <h1 className="text-2xl font-bold text-gray-800 mb-2">
            {currentSlot.title}
          </h1>
          <p className="text-gray-600 mb-4">{currentSlot.desc}</p>
          
          {currentSlot.type === 'ask' && currentSlot.questions.length > 0 && (
            <div className="space-y-3">
              <h3 className="font-semibold text-gray-700">질문:</h3>
              {currentSlot.questions.map((question, index) => (
                <div key={index} className="p-3 bg-blue-50 rounded-lg">
                  <p className="text-gray-800">{question.text}</p>
                  <span className="text-sm text-blue-600">응답 방식: {question.kind}</span>
                </div>
              ))}
            </div>
          )}
          
          {currentSlot.type === 'announce' && (
            <div className="p-3 bg-green-50 rounded-lg">
              <p className="text-gray-800">{currentSlot.announce}</p>
            </div>
          )}
        </div>

        {/* 답변 폼 */}
        {currentSlot.type === 'ask' && (
          <div className="bg-white rounded-2xl shadow-md p-6">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">답변하기</h2>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* 텍스트 답변 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  텍스트 답변
                </label>
                <textarea
                  value={answer}
                  onChange={(e) => setAnswer(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  rows={4}
                  placeholder="답변을 입력하세요..."
                />
              </div>

              {/* 오디오 녹음 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  음성 답변
                </label>
                <div className="flex gap-3">
                  <Button
                    type="button"
                    onClick={startRecording}
                    disabled={!!audioBlob}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    {audioBlob ? '녹음 완료' : '🎤 녹음 시작'}
                  </Button>
                  {audioBlob && (
                    <Button
                      type="button"
                      onClick={() => setAudioBlob(null)}
                      variant="outline"
                      className="text-red-600 border-red-300"
                    >
                      다시 녹음
                    </Button>
                  )}
                </div>
                {audioBlob && (
                  <p className="text-sm text-green-600 mt-2">
                    ✅ 오디오가 녹음되었습니다 (30초)
                  </p>
                )}
              </div>

              {/* 사진 업로드 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  사진 업로드
                </label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handlePhotoUpload}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                {photoFile && (
                  <p className="text-sm text-green-600 mt-2">
                    ✅ {photoFile.name} 선택됨
                  </p>
                )}
              </div>

              {/* 제출 버튼 */}
              <Button
                type="submit"
                disabled={isSubmitting || (!answer.trim() && !audioBlob && !photoFile)}
                className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400"
              >
                {isSubmitting ? '제출 중...' : '답변 제출'}
              </Button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}

export default function DashboardPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">로딩 중...</p>
        </div>
      </div>
    }>
      <DashboardPageContent />
    </Suspense>
  );
}
