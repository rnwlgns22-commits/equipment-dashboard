import { motion } from 'framer-motion';

// 옵시디언 볼트 90_아카이브의 유튜브 클립 정리 노트를 그대로 옮겨온 정적 목록.
// 각 클립의 summary는 노트에 보존된 STT 원문 전사를 실제로 읽고 요약한 것 —
// verified: false인 항목은 전사가 없어(대기목록.md에 재클리핑 필요로 표시됨)
// 영상 설명글 기준으로만 적어둔 것이라 정확도가 낮을 수 있음.
interface Clip {
  title: string;
  summary: string;
  category: 'AI·디자인' | '설비';
  url: string;
  verified: boolean;
}

const CLIPS: Clip[] = [
  {
    title: '[250]공조기 냉난방 간단 정리',
    summary: '공조기(AHU) 냉난방 전환 원리 — 리턴/서플라이/배기/외기 4계통과 댐퍼 개도율로 외기 혼합비를 조절하는 방식',
    category: '설비',
    url: 'https://www.youtube.com/watch?v=t7yv8Q10ICI',
    verified: true,
  },
  {
    title: '[청라에너지] 흡수식냉동기 추기작업 가이드',
    summary: '흡수식 냉동기 추기(진공) 작업 절차 — 저실 추기 후 본체 추기 순서, 3mmHg 이하 진공도 기준',
    category: '설비',
    url: 'https://www.youtube.com/watch?v=FAJGr-kIuHY',
    verified: true,
  },
  {
    title: '[탐구생활1]#17 흡수식 냉동기(냉온수기) 구조 및 작동원리',
    summary: '흡수식 냉동기 4대 구성(발생기·응축기·증발기·흡수기)과 냉매·흡수제(리튬브로마이드) 순환 원리',
    category: '설비',
    url: 'https://www.youtube.com/watch?v=lxOTo-amd2E',
    verified: true,
  },
  {
    title: '천정형 FCU 부속교체 기술 습득 공유 (새빛공조)',
    summary: '새빛공조 천정형 FCU의 BLDC→LCD 모터·PCB 교체 방법, 배선 색상별 결선 순서',
    category: '설비',
    url: 'https://www.youtube.com/watch?v=dSOU51WSAZg',
    verified: true,
  },
  {
    title: '흡수식냉동기 재생기 동관파열 보수공사',
    summary: '재생기 동관파열 보수 및 흡수제(리튬브로마이드) 용액 교체 작업 (전사 원문 미확보 — 영상 설명글 기준)',
    category: '설비',
    url: 'https://www.youtube.com/watch?v=5ZQi3NDRhqk',
    verified: false,
  },
  {
    title: 'AI 냄새 안 나게 디자인 하는 방법',
    summary: 'AI가 만든 웹사이트가 어색해 보이지 않으려면? 기준(디자인 시스템)부터 잡는 게 핵심이라는 3원칙',
    category: 'AI·디자인',
    url: 'https://www.youtube.com/watch?v=jUlIJZSw9yc',
    verified: true,
  },
  {
    title: 'AI가 Figma 변수 200개를 혼자 만듦',
    summary: 'Claude가 Figma 변수 200개로 디자인 토큰(Primitive → Semantic → Component 3단계) 자동 구축',
    category: 'AI·디자인',
    url: 'https://www.youtube.com/watch?v=Aaebz-Q0OYY',
    verified: true,
  },
  {
    title: "AI가 디자인+코드 다 만들어주는 시대, 토스 출신 디자이너는 '이것'을 더 강조",
    summary: '토스 출신 디자이너(Else 강영화)가 말하는, AI 시대에도 사람이 직접 챙겨야 할 완성도·의사결정의 영역',
    category: 'AI·디자인',
    url: 'https://www.youtube.com/watch?v=1MMJMDsANrM',
    verified: true,
  },
  {
    title: '바이브코딩 디자인 풀코스 10분만에 AI 티 완전히 없애기',
    summary: '레퍼런스 캡처로 기준 잡기 → 검증된 디자인 키트(shadcn 등) 적용까지, AI 디자인 완성도를 높이는 2단계',
    category: 'AI·디자인',
    url: 'https://www.youtube.com/watch?v=4TNRp0oQ1lQ',
    verified: true,
  },
  {
    title: '코딩 0줄로 200만원짜리 홈페이지 만들기',
    summary: '코드 한 줄 작성 없이 AI 대화만으로 완성도 높은 랜딩 페이지를 만드는 실전 과정',
    category: 'AI·디자인',
    url: 'https://www.youtube.com/watch?v=sfCmEf_D-8o',
    verified: true,
  },
  {
    title: '클로드 디자인 + 코드 최강 조합으로 움직이는 고퀄 홈페이지 만드는법',
    summary: '클로드로 30분 만에 애니메이션까지 들어간 홈페이지를 완성하는 워크플로우',
    category: 'AI·디자인',
    url: 'https://www.youtube.com/watch?v=vHmJg8VQW5c',
    verified: true,
  },
  {
    title: '클로드 코드로 디자인 가장 잘 뽑아내는 스킬을 찾았습니다',
    summary: '클로드 코드에서 디자인 완성도를 높여주는 무료 오픈소스 스킬 소개 및 사용법',
    category: 'AI·디자인',
    url: 'https://www.youtube.com/watch?v=2sNQ0Nvngdc',
    verified: true,
  },
];

const CATEGORY_STYLE: Record<Clip['category'], string> = {
  'AI·디자인': 'bg-accent/10 text-accent',
  설비: 'bg-white/5 text-text-dim',
};

function ClipCard({ clip, index }: { clip: Clip; index: number }) {
  return (
    <motion.a
      href={clip.url}
      target="_blank"
      rel="noreferrer"
      initial={{ opacity: 0, y: 72 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.4 }}
      transition={{ duration: 0.55, ease: 'easeOut', delay: (index % 3) * 0.06 }}
      className="block rounded-2xl border border-border bg-card p-5 hover:border-white/15 transition-colors"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2 mb-1.5">
            <span className={`rounded px-1.5 py-0.5 text-[11px] font-medium ${CATEGORY_STYLE[clip.category]}`}>
              {clip.category}
            </span>
            {!clip.verified && (
              <span className="rounded px-1.5 py-0.5 text-[11px] font-medium bg-risk-mid/10 text-risk-mid">
                확인 필요
              </span>
            )}
          </div>
          <h3 className="text-sm font-medium truncate">{clip.title}</h3>
          <p className="text-sm text-text-dim mt-1 leading-relaxed">{clip.summary}</p>
        </div>
        <span className="text-xs text-accent shrink-0">영상 보기 →</span>
      </div>
    </motion.a>
  );
}

export default function ClipLibrary() {
  return (
    <div className="p-6 md:p-8 space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">유튜브 클립</h1>
        <p className="text-sm text-text-dim mt-1">
          옵시디언 볼트에 정리해 둔 참고 영상 목록입니다. 스크롤을 내리면 카드가 아래에서 올라오며
          나타납니다.
        </p>
      </div>

      <div className="space-y-3">
        {CLIPS.map((clip, i) => (
          <ClipCard key={clip.url} clip={clip} index={i} />
        ))}
      </div>
    </div>
  );
}
