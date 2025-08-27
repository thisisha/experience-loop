'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';

interface Slot {
  id: string;
  title: string;
  desc: string;
  t_at: string;
  type: 'ask' | 'announce';
  questions: Question[];
}

interface Question {
  id: string;
  text: string;
  kind: 'text' | 'audio' | 'photo';
}

interface Event {
  id: string;
  name: string;
  code: string;
}

function DashboardPageContent() {
  const searchParams = useSearchParams();
  const slotId = searchParams.get('slot');

  const [slot, setSlot] = useState<Slot | null>(null);
  const [event, setEvent] = useState<Event | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [answers, setAnswers] = useState<{ [questionId: string]: string }>({});
  const [audioBlobs, setAudioBlobs] = useState<{ [questionId: string]: Blob }>({});
  const [photoFiles, setPhotoFiles] = useState<{ [questionId: string]: File }>({});
  const [isRecording, setIsRecording] = useState<{ [questionId: string]: boolean }>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);

  useEffect(() => {
    if (slotId) {
      fetchSlotData();
    } else {
      setLoading(false);
    }
  }, [slotId]);

  const fetchSlotData = async () => {
    try {
      const response = await fetch(`/api/events/slot/${slotId}`);
      if (!response.ok) {
        throw new Error('슬롯 정보를 불러올 수 없습니다.');
      }
      
      const data = await response.json();
      setSlot(data.slot);
      setEvent(data.event);
    } catch (error) {
      setError(error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const handleTextChange = (questionId: string, value: string) => {
    setAnswers(prev => ({
      ...prev,
      [questionId]: value
    }));
  };

  const startRecording = async (questionId: string) => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      const chunks: Blob[] = [];

      mediaRecorder.ondataavailable = (event) => {
        chunks.push(event.data);
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(chunks, { type: 'audio/wav' });
        setAudioBlobs(prev => ({
          ...prev,
          [questionId]: audioBlob
        }));
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(prev => ({ ...prev, [questionId]: true }));

      // 30초 후 자동 정지
      setTimeout(() => {
        if (mediaRecorder.state === 'recording') {
          mediaRecorder.stop();
          setIsRecording(prev => ({ ...prev, [questionId]: false }));
        }
      }, 30000);

      // 전역 변수로 저장하여 stopRecording에서 접근
      (window as any).mediaRecorder = mediaRecorder;
      (window as any).currentStream = stream;
    } catch (error) {
      console.error('오디오 녹음 시작 실패:', error);
      setError('마이크 접근 권한이 필요합니다.');
    }
  };

  const stopRecording = (questionId: string) => {
    const mediaRecorder = (window as any).mediaRecorder;
    if (mediaRecorder && mediaRecorder.state === 'recording') {
      mediaRecorder.stop();
      setIsRecording(prev => ({ ...prev, [questionId]: false }));
    }
  };

  const handlePhotoUpload = (questionId: string, file: File) => {
    setPhotoFiles(prev => ({
      ...prev,
      [questionId]: file
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError('');

    try {
      const formData = new FormData();
      formData.append('slot_id', slotId!);

      // 각 질문에 대한 답변 데이터 추가
      Object.keys(answers).forEach(questionId => {
        const question = slot?.questions.find(q => q.id === questionId);
        if (question) {
          formData.append(`answers[${questionId}][text]`, answers[questionId] || '');
          formData.append(`answers[${questionId}][kind]`, question.kind);
          
          if (question.kind === 'audio' && audioBlobs[questionId]) {
            formData.append(`answers[${questionId}][audio]`, audioBlobs[questionId]);
          }
          
          if (question.kind === 'photo' && photoFiles[questionId]) {
            formData.append(`answers[${questionId}][photo]`, photoFiles[questionId]);
          }
        }
      });

      const response = await fetch('/api/answers', {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        const result = await response.json();
        throw new Error(result.error || '답변 제출에 실패했습니다.');
      }

      setSubmitSuccess(true);
      setAnswers({});
      setAudioBlobs({});
      setPhotoFiles({});
      
      // 3초 후 성공 메시지 숨김
      setTimeout(() => setSubmitSuccess(false), 3000);
    } catch (error) {
      setError(error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">질문을 불러오는 중...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center">
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-md p-8 max-w-md mx-4 text-center">
          <div className="text-red-500 text-6xl mb-4">⚠️</div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">오류 발생</h1>
          <p className="text-gray-600 dark:text-gray-400 mb-6">{error}</p>
          <Button
            onClick={() => window.location.reload()}
            className="bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-xl"
          >
            다시 시도
          </Button>
        </div>
      </div>
    );
  }

  if (!slot) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center">
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-md p-8 max-w-md mx-4 text-center">
          <div className="text-blue-500 text-6xl mb-4">❓</div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">질문을 찾을 수 없습니다</h1>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            올바른 링크로 접근했는지 확인해주세요.
          </p>
          <Button
            onClick={() => window.history.back()}
            className="bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-xl"
          >
            뒤로 가기
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 dark:from-gray-900 dark:to-gray-800 py-8">
      <div className="max-w-4xl mx-auto px-4">
        {/* 헤더 */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-md p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                {event?.name}
              </h1>
              <p className="text-gray-600 dark:text-gray-400">
                이벤트 코드: {event?.code}
              </p>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {new Date(slot.t_at).toLocaleString('ko-KR')}
              </p>
            </div>
          </div>
          
          <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl p-4">
            <h2 className="text-xl font-semibold text-green-900 dark:text-green-100 mb-2">
              {slot.title}
            </h2>
            <p className="text-green-700 dark:text-green-200">
              {slot.desc}
            </p>
          </div>
        </div>

        {/* 성공 메시지 */}
        {submitSuccess && (
          <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl p-4 mb-6">
            <div className="flex items-center">
              <div className="text-green-500 text-xl mr-3">✅</div>
              <div>
                <h3 className="font-medium text-green-900 dark:text-green-100">
                  답변이 성공적으로 제출되었습니다!
                </h3>
                <p className="text-sm text-green-700 dark:text-green-200">
                  AI가 답변을 분석하여 요약과 태그를 생성합니다.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* 질문 폼 */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-md p-8">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
            질문에 답변하기
          </h2>

          <form onSubmit={handleSubmit} className="space-y-8">
            {slot.questions.map((question, index) => (
              <div key={question.id} className="border border-gray-200 dark:border-gray-700 rounded-xl p-6">
                <div className="mb-4">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                    질문 {index + 1}
                  </h3>
                  <p className="text-gray-700 dark:text-gray-300">
                    {question.text}
                  </p>
                </div>

                {/* 텍스트 답변 */}
                {question.kind === 'text' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      답변을 입력하세요
                    </label>
                    <textarea
                      value={answers[question.id] || ''}
                      onChange={(e) => handleTextChange(question.id, e.target.value)}
                      required
                      rows={4}
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent dark:bg-gray-700 dark:border-gray-600 dark:text-white resize-none"
                      placeholder="답변을 자유롭게 작성해주세요..."
                    />
                  </div>
                )}

                {/* 오디오 답변 */}
                {question.kind === 'audio' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      음성으로 답변하기
                    </label>
                    <div className="flex items-center gap-4">
                      {!isRecording[question.id] ? (
                        <Button
                          type="button"
                          onClick={() => startRecording(question.id)}
                          className="bg-red-600 hover:bg-red-700 text-white px-6 py-3 rounded-xl"
                        >
                          🎤 녹음 시작
                        </Button>
                      ) : (
                        <Button
                          type="button"
                          onClick={() => stopRecording(question.id)}
                          className="bg-gray-600 hover:bg-gray-700 text-white px-6 py-3 rounded-xl"
                        >
                          ⏹️ 녹음 정지
                        </Button>
                      )}
                      
                      {audioBlobs[question.id] && (
                        <div className="flex items-center gap-2">
                          <audio controls className="h-10">
                            <source src={URL.createObjectURL(audioBlobs[question.id])} type="audio/wav" />
                          </audio>
                          <Button
                            type="button"
                            onClick={() => {
                              setAudioBlobs(prev => {
                                const newBlobs = { ...prev };
                                delete newBlobs[question.id];
                                return newBlobs;
                              });
                            }}
                            variant="outline"
                            className="text-red-600 border-red-600 hover:bg-red-50 px-3 py-2 rounded-lg"
                          >
                            삭제
                          </Button>
                        </div>
                      )}
                    </div>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                      최대 30초까지 녹음할 수 있습니다.
                    </p>
                  </div>
                )}

                {/* 사진 답변 */}
                {question.kind === 'photo' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      사진으로 답변하기
                    </label>
                    <div className="flex items-center gap-4">
                      <input
                        type="file"
                        accept="image/*"
                        capture="environment"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            handlePhotoUpload(question.id, file);
                          }
                        }}
                        className="hidden"
                        id={`photo-${question.id}`}
                      />
                      <label
                        htmlFor={`photo-${question.id}`}
                        className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl cursor-pointer"
                      >
                        📷 사진 촬영/선택
                      </label>
                      
                      {photoFiles[question.id] && (
                        <div className="flex items-center gap-2">
                          <img
                            src={URL.createObjectURL(photoFiles[question.id])}
                            alt="업로드된 사진"
                            className="w-16 h-16 object-cover rounded-lg"
                          />
                          <Button
                            type="button"
                            onClick={() => {
                              setPhotoFiles(prev => {
                                const newFiles = { ...prev };
                                delete newFiles[question.id];
                                return newFiles;
                              });
                            }}
                            variant="outline"
                            className="text-red-600 border-red-600 hover:bg-red-50 px-3 py-2 rounded-lg"
                          >
                            삭제
                          </Button>
                        </div>
                      )}
                    </div>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                      카메라로 촬영하거나 갤러리에서 선택할 수 있습니다.
                    </p>
                  </div>
                )}
              </div>
            ))}

            {/* 제출 버튼 */}
            <div className="pt-6">
              <Button
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-green-600 hover:bg-green-700 text-white py-4 px-8 rounded-xl shadow-md disabled:opacity-50 text-lg font-semibold"
              >
                {isSubmitting ? '제출 중...' : '답변 제출하기'}
              </Button>
            </div>
          </form>
        </div>
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
