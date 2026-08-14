import { useEffect, useRef } from 'react';
import * as THREE from 'three';

// 랜딩 배경에 까는 WebGL 히어로 씬(2026-08-07).
//
// 레퍼런스에서 가져온 것:
//  · Hubtown(Unseen Studio, Awwwards SOTD 2026-06) — 어두운 반사 지면 위에 빛나는
//    오브젝트가 떠 있는 구성. 여기선 "설비 바닥 격자 + 그 위에 뜬 설비 노드"로 옮김.
//    이 앱의 레이아웃 매핑/관계 그래프 화면과 소재가 같아서 장식이 아니라 예고편이 됨.
//  · 안개(fog)로 먼 격자를 배경색에 녹이는 것 — 3D 사이트가 평면 이미지와 갈리는
//    지점이 대부분 여기. 격자 끝이 잘리면 순식간에 벽지처럼 보인다.
//  · 커서 반응(Hubtown의 마우스 리빌) — 여기선 과하지 않게 카메라 시차만.
//
// 3D가 콘텐츠를 압도하지 않아야 하므로(Minh Pham 원칙) 채도·움직임을 낮게 묶고,
// 실제 UI는 이 위에 불투명 유리판으로 얹는다.

const NODE_COUNT = 90;
const GRID_HALF = 34; // 격자 반경(월드 단위)

/** 현재 CSS 변수를 three가 쓰는 색으로 변환(다크 고정, 2026-08-14 라이트 테마 제거) */
function readSceneColors() {
  const s = getComputedStyle(document.documentElement);
  const pick = (name: string, fallback: string) => {
    const v = s.getPropertyValue(name).trim();
    return new THREE.Color(v || fallback);
  };
  return {
    bg: pick('--color-bg', '#0b0e14'),
    accent: pick('--color-accent', '#22d3ee'),
    // UI용 --color-border가 아니라 씬 전용 hex 토큰을 씀 — 위 pick()은 three의
    // Color 파서를 타므로 rgb(… / …) 표기가 들어오면 조용히 흰색이 된다.
    line: pick('--scene-grid', '#2b3346'),
  };
}

/** 노드에 쓸 동그란 글로우 스프라이트를 캔버스로 그려서 텍스처화 */
function makeGlowTexture() {
  const size = 64;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  g.addColorStop(0, 'rgba(255,255,255,1)');
  g.addColorStop(0.25, 'rgba(255,255,255,0.55)');
  g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  const tex = new THREE.CanvasTexture(canvas);
  tex.needsUpdate = true;
  return tex;
}

export default function NetworkHero({ className = '' }: { className?: string }) {
  const hostRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    const reduceMotion =
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'low-power' });
    } catch {
      // WebGL이 없거나 차단된 환경(원격데스크톱, 구형 그래픽 드라이버 등).
      // 랜딩 자체는 CSS 그라디언트 배경만으로도 멀쩡하므로 조용히 포기한다.
      return;
    }
    // 고DPI 노트북에서 픽셀을 4배로 그리면 배경 장식 하나에 GPU를 다 쓰게 됨
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0x000000, 0);
    host.appendChild(renderer.domElement);
    renderer.domElement.style.width = '100%';
    renderer.domElement.style.height = '100%';
    renderer.domElement.style.display = 'block';

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(55, 1, 0.1, 200);
    camera.position.set(0, 11, 30);
    camera.lookAt(0, 3, 0);

    const theme = readSceneColors();
    // 안개 색 = 배경색이어야 격자가 "잘리지" 않고 배경으로 녹아든다
    scene.fog = new THREE.Fog(theme.bg.getHex(), 26, 74);

    const group = new THREE.Group();
    scene.add(group);

    // ── 바닥 격자 ────────────────────────────────────────────────────────
    const gridPositions: number[] = [];
    const step = 4;
    for (let i = -GRID_HALF; i <= GRID_HALF; i += step) {
      gridPositions.push(-GRID_HALF, 0, i, GRID_HALF, 0, i);
      gridPositions.push(i, 0, -GRID_HALF, i, 0, GRID_HALF);
    }
    const gridGeo = new THREE.BufferGeometry();
    gridGeo.setAttribute('position', new THREE.Float32BufferAttribute(gridPositions, 3));
    const gridMat = new THREE.LineBasicMaterial({
      color: theme.line,
      transparent: true,
      opacity: 0.42,
      fog: true,
    });
    const grid = new THREE.LineSegments(gridGeo, gridMat);
    group.add(grid);

    // ── 설비 노드 ────────────────────────────────────────────────────────
    // 격자 위 임의 지점에 높이를 달리해 배치. 결정적 난수를 써서 새로고침마다
    // 배치가 튀지 않게 함(브랜드 이미지가 매번 달라지면 산만해짐).
    let seed = 1337;
    const rand = () => {
      seed = (seed * 1664525 + 1013904223) % 4294967296;
      return seed / 4294967296;
    };

    const nodes: THREE.Vector3[] = [];
    for (let i = 0; i < NODE_COUNT; i++) {
      nodes.push(
        new THREE.Vector3(
          (rand() - 0.5) * GRID_HALF * 1.8,
          rand() * 9 + 0.6,
          (rand() - 0.5) * GRID_HALF * 1.8,
        ),
      );
    }

    const nodeGeo = new THREE.BufferGeometry().setFromPoints(nodes);
    const glowTex = makeGlowTexture();
    const nodeMat = new THREE.PointsMaterial({
      color: theme.accent,
      size: 1.5,
      map: glowTex,
      transparent: true,
      opacity: 0.9,
      depthWrite: false,
      // 어두운 배경에서 겹칠수록 밝아지는 additive가 "빛나는 노드" 느낌을 만듦.
      blending: THREE.AdditiveBlending,
      sizeAttenuation: true,
      fog: true,
    });
    const points = new THREE.Points(nodeGeo, nodeMat);
    group.add(points);

    // ── 노드 간 연결선 ───────────────────────────────────────────────────
    // 가까운 노드끼리만 이어서 관계 그래프처럼 보이게. 전부 잇는 O(n²) 완전그래프는
    // 화면이 실뭉치가 되므로 거리 임계값 + 노드당 최대 2개로 제한.
    const linkPositions: number[] = [];
    const LINK_DIST = 11;
    for (let i = 0; i < nodes.length; i++) {
      let made = 0;
      for (let j = i + 1; j < nodes.length && made < 2; j++) {
        if (nodes[i].distanceTo(nodes[j]) < LINK_DIST) {
          linkPositions.push(nodes[i].x, nodes[i].y, nodes[i].z, nodes[j].x, nodes[j].y, nodes[j].z);
          made++;
        }
      }
    }
    const linkGeo = new THREE.BufferGeometry();
    linkGeo.setAttribute('position', new THREE.Float32BufferAttribute(linkPositions, 3));
    const linkMat = new THREE.LineBasicMaterial({
      color: theme.accent,
      transparent: true,
      opacity: 0.22,
      fog: true,
    });
    group.add(new THREE.LineSegments(linkGeo, linkMat));

    // ── 크기 맞추기 ──────────────────────────────────────────────────────
    const resize = () => {
      const { clientWidth: w, clientHeight: h } = host;
      if (w === 0 || h === 0) return;
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(host);

    // ── 커서 시차 ────────────────────────────────────────────────────────
    // 카메라를 아주 조금만 움직여도 원근 때문에 공간감이 확 산다. 목표값을 두고
    // 매 프레임 보간해서(lerp) 커서를 홱 움직여도 카메라는 부드럽게 따라옴.
    const pointer = { x: 0, y: 0 };
    const target = { x: 0, y: 0 };
    const onPointerMove = (e: PointerEvent) => {
      target.x = (e.clientX / window.innerWidth - 0.5) * 2;
      target.y = (e.clientY / window.innerHeight - 0.5) * 2;
    };
    if (!reduceMotion) window.addEventListener('pointermove', onPointerMove, { passive: true });

    // ── 렌더 루프 ────────────────────────────────────────────────────────
    // 탭이 숨겨지거나 히어로가 화면 밖으로 스크롤되면 완전히 멈춤 — 배경 장식이
    // 백그라운드에서 노트북 배터리를 먹는 게 3D 사이트의 가장 흔한 민폐.
    let raf = 0;
    let visible = true;
    const clock = new THREE.Clock();

    const renderFrame = () => {
      const t = clock.getElapsedTime();
      group.rotation.y = t * 0.035;
      // 노드 덩어리가 아주 천천히 오르내려 "살아있는" 인상만 남김
      points.position.y = Math.sin(t * 0.5) * 0.35;

      pointer.x += (target.x - pointer.x) * 0.045;
      pointer.y += (target.y - pointer.y) * 0.045;
      camera.position.x = pointer.x * 3.5;
      camera.position.y = 11 - pointer.y * 2;
      camera.lookAt(0, 3, 0);

      renderer.render(scene, camera);
    };

    const loop = () => {
      raf = requestAnimationFrame(loop);
      if (!visible || document.hidden) return;
      renderFrame();
    };

    if (reduceMotion) {
      renderer.render(scene, camera); // 움직임 없이 한 장만
    } else {
      loop();
    }

    const io = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
    });
    io.observe(host);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      io.disconnect();
      window.removeEventListener('pointermove', onPointerMove);
      // three는 GC가 GPU 메모리를 안 거둬가므로 직접 dispose 해야 함. 랜딩은
      // 데이터를 비우고 나올 때마다 다시 마운트되는 화면이라 누수가 실제로 쌓인다.
      scene.traverse((obj) => {
        const mesh = obj as THREE.Mesh;
        mesh.geometry?.dispose();
        const mat = mesh.material;
        if (Array.isArray(mat)) mat.forEach((m) => m.dispose());
        else mat?.dispose();
      });
      glowTex.dispose();
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, []);

  return <div ref={hostRef} aria-hidden className={className} />;
}
