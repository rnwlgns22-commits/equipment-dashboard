// 유리 뒤에 실제로 비칠 배경 오브제(2026-08-07).
//
// 그라디언트 워시를 걷어내고 넣은 것 — 참고 보드의 글라스 핀들은 하나같이
// "선명한 물체가 뒤에 있고, 그 위에 얹힌 유리판이 그걸 뭉갠다"는 구성이었다.
// 배경 자체를 물들이면 색유리가 되지 성에유리가 안 되고, 화면만 지저분해진다.
//
// 그래서 큰 구체 몇 개를 '선명하게' 깔아둔다. 흐릿하게 깔면 유리를 통과시켜도
// 변화가 없어서 있으나 마나 — 뭉개는 건 유리(backdrop-blur)의 몫이다.
// 위치는 화면 가장자리 위주로, 데이터가 빽빽한 가운데는 비워 둔다.

type Orb = {
  /** 지름(vmax 기준) — 화면 크기에 비례해서 커지므로 어디서든 '크게' 보임 */
  size: number;
  top?: string;
  left?: string;
  right?: string;
  bottom?: string;
  /** 구체의 밝은 면 / 어두운 면 */
  from: string;
  to: string;
  /** 살짝 흐리게 — 0이면 너무 도드라져서 글자를 방해함 */
  blur?: number;
};

const ORBS: Orb[] = [
  { size: 46, top: '-14vmax', left: '-10vmax', from: '#a5c9ff', to: '#5b7fd4', blur: 2 },
  { size: 30, bottom: '-8vmax', right: '-6vmax', from: '#ffd9c7', to: '#e08a6a', blur: 2 },
  { size: 20, top: '38%', right: '6%', from: '#d9c9ff', to: '#8f6fd6', blur: 3 },
  { size: 13, bottom: '14%', left: '7%', from: '#c8f2e8', to: '#5fb6a4', blur: 3 },
];

export default function GlassBackdrop() {
  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-0 -z-10 overflow-hidden"
      // -z-10 + body 배경색 위에 놓여서, 유리판(bg-card 등)의 backdrop-filter가
      // 이 오브제들을 빨아들여 뭉갠다. 스크롤과 무관하게 고정.
    >
      {ORBS.map((o, i) => (
        <div
          key={i}
          className="absolute rounded-full"
          style={{
            width: `${o.size}vmax`,
            height: `${o.size}vmax`,
            top: o.top,
            left: o.left,
            right: o.right,
            bottom: o.bottom,
            // 왼쪽 위에서 빛을 받는 구체 — 하이라이트를 중심에서 벗어난 곳에 두고
            // 반대쪽을 어둡게 깔아야 평면 원이 아니라 '구'로 읽힌다.
            background: `radial-gradient(circle at 32% 28%, #fff 0%, ${o.from} 32%, ${o.to} 100%)`,
            filter: o.blur ? `blur(${o.blur}px)` : undefined,
            opacity: 'var(--orb-opacity)',
          }}
        />
      ))}
    </div>
  );
}
