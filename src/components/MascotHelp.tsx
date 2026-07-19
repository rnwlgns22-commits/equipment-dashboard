import { useState } from 'react';
import mascotThumbsUp from '../assets/mascot/thumbsup.png';

const FAQ = [
  {
    q: '이 사이트에 올린 파일은 어디로 가나요?',
    a: '어디에도 안 갑니다. 전부 브라우저 안에서만 처리되고 서버로 전송되지 않습니다.',
  },
  {
    q: '샘플 데이터는 실제 데이터인가요?',
    a: '아니요. 전부 완전히 가공된 예시 데이터입니다(실제 부서 데이터 아님).',
  },
  {
    q: '설비를 도면 위에 어떻게 배치하나요?',
    a: '레이아웃 매핑 화면에서 우측 "설비 자산" 목록의 항목을 캔버스로 끌어다 놓으면 됩니다.',
  },
  {
    q: '위험등급은 어떻게 계산되나요?',
    a: '최근 1년 고장건수를 기준으로 상/중/하로 나눈 참고치입니다. 확정 예측이 아닙니다.',
  },
  {
    q: '구역(지오펜싱)은 어떻게 만드나요?',
    a: '좌측 패널의 "구역 그리기 시작"을 누르고 캔버스에 점을 3개 이상 찍은 뒤 완료를 누르세요.',
  },
  {
    q: '데이터를 전부 지우고 싶어요.',
    a: '좌측 하단 "데이터 비우고 나가기"를 누르면 초기화됩니다.',
  },
];

export default function MascotHelp() {
  const [open, setOpen] = useState(false);

  return (
    <div className="fixed bottom-5 right-5 z-50">
      {open && (
        <div className="mb-3 w-80 max-h-[70vh] overflow-y-auto rounded-2xl border border-border bg-card shadow-2xl p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="font-medium text-sm">궁금한 점이 있으신가요?</div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="text-text-dim hover:text-text text-sm leading-none"
              aria-label="닫기"
            >
              ✕
            </button>
          </div>
          <div className="space-y-3">
            {FAQ.map((item) => (
              <div key={item.q}>
                <div className="text-sm font-medium">Q. {item.q}</div>
                <div className="text-xs text-text-dim mt-0.5">A. {item.a}</div>
              </div>
            ))}
          </div>
        </div>
      )}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        title="도움말"
        className="h-14 w-14 rounded-full bg-card border border-border shadow-lg flex items-center justify-center hover:border-accent/60 hover:scale-105 transition-transform overflow-hidden"
      >
        <img src={mascotThumbsUp} alt="도움말 마스코트" className="h-11 w-auto select-none" draggable={false} />
      </button>
    </div>
  );
}
