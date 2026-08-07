import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import GlassBackdrop from '../GlassBackdrop';

// 진짜 굴절하는 유리 배경(2026-08-07).
//
// CSS 구체는 "유리처럼 생긴 그림"이지 유리가 아니었음 — 뒤에 있는 걸 실제로
// 휘어 보이게 하지 못한다. 그래서 three.js의 물리 기반 유리로 교체:
//   · transmission — 뒤 배경을 실제로 통과시킴(단순 투명도와 다름. 굴절률 ior에
//     따라 뒤가 휘어 보인다)
//   · dispersion — 파장별 굴절률 차이. 유리 가장자리에 무지개가 갈라지는 그 현상
//     (색수차). 이게 있고 없고가 '유리 느낌'을 가장 크게 가른다
//   · iridescence — 보는 각도에 따라 표면에 도는 유막 같은 색
// 배경에 컬러 블롭을 깔고 그 앞에 유리 덩어리를 놓아서, 유리가 그 색을 빨아들여
// 휘고 흩뿌리게 만든다.
//
// 비용 관리: transmission은 매 프레임 별도 렌더 패스를 돌아서 비싸다. 다만 이건
// 어차피 UI 유리판(backdrop-blur)에 한 번 더 뭉개질 '배경'이라 해상도를 크게
// 낮춰도 티가 안 남 — 픽셀비 0.75배 + 굴절 패스 0.4배로 묶었다.

const REDUCED = () =>
  typeof window !== 'undefined' &&
  typeof window.matchMedia === 'function' &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/** 유리가 굴절시킬 '색'을 만드는 배경 그라디언트 텍스처 */
function makeBackdropTexture(light: boolean) {
  const c = document.createElement('canvas');
  c.width = 4;
  c.height = 512;
  const ctx = c.getContext('2d')!;
  const g = ctx.createLinearGradient(0, 0, 0, 512);
  if (light) {
    g.addColorStop(0, '#eef3fb');
    g.addColorStop(0.45, '#e4ecf8');
    g.addColorStop(1, '#eaf0f7');
  } else {
    g.addColorStop(0, '#141824');
    g.addColorStop(0.45, '#111520');
    g.addColorStop(1, '#0e121b');
  }
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 4, 512);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export default function LiquidGlassBackdrop() {
  const hostRef = useRef<HTMLDivElement>(null);
  // WebGL을 못 쓰는 환경이면 CSS 구체로 조용히 되돌린다
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: false, alpha: true, powerPreference: 'low-power' });
    } catch {
      setFailed(true);
      return;
    }
    // 배경이라 선명할 필요가 없음 — 해상도를 낮춰서 굴절 패스 비용을 상쇄
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1) * 0.75);
    renderer.setClearColor(0x000000, 0);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;
    // 굴절 전용 렌더타깃도 축소(three r168+). 없으면 무시됨
    (renderer as unknown as { transmissionResolutionScale?: number }).transmissionResolutionScale = 0.4;
    host.appendChild(renderer.domElement);
    Object.assign(renderer.domElement.style, { width: '100%', height: '100%', display: 'block' });

    const isLight = () => document.documentElement.classList.contains('light');

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 100);
    camera.position.set(0, 0, 15);

    // 환경맵 — 유리에 비칠 주변 반사. 이게 없으면 유리가 흐린 비닐처럼 보인다.
    const pmrem = new THREE.PMREMGenerator(renderer);
    const envRT = pmrem.fromScene(new RoomEnvironment(), 0.04);
    scene.environment = envRT.texture;

    let bgTex = makeBackdropTexture(isLight());
    scene.background = bgTex;

    // ── 유리가 굴절시킬 컬러 블롭 (유리보다 뒤) ─────────────────────────
    // 색은 '유리가 빨아들일 재료'일 뿐이라 옅고 작게 — 진하면 배경이 주인공이
    // 돼서 표·숫자를 잡아먹는다(첫 시도에서 실제로 그랬음).
    const blobColors = [0x5b8def, 0xa66bff, 0xff8fb1, 0x4fd6c0];
    const blobs: THREE.Mesh[] = [];
    const blobGeo = new THREE.SphereGeometry(1, 32, 32);
    blobColors.forEach((col, i) => {
      const m = new THREE.Mesh(
        blobGeo,
        new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: 0.4 }),
      );
      const a = (i / blobColors.length) * Math.PI * 2;
      m.position.set(Math.cos(a) * 12, Math.sin(a) * 7, -12 - i);
      m.scale.setScalar(2.2 + i * 0.4);
      scene.add(m);
      blobs.push(m);
    });

    // ── 유리 덩어리 (앞) ─────────────────────────────────────────────────
    const glassMat = new THREE.MeshPhysicalMaterial({
      color: 0xffffff,
      metalness: 0,
      roughness: 0.05,
      transmission: 1,      // 뒤를 통과시킴
      thickness: 3.2,       // 두꺼울수록 굴절·색분산이 강해짐
      ior: 1.55,
      dispersion: 5,        // 색수차 — 가장자리 무지개
      iridescence: 1,
      iridescenceIOR: 1.35,
      iridescenceThicknessRange: [100, 640],
      clearcoat: 1,
      clearcoatRoughness: 0.08,
      envMapIntensity: 1.4,
    });

    const shapes: { mesh: THREE.Mesh; spin: THREE.Vector3; phase: number }[] = [];
    const addShape = (geo: THREE.BufferGeometry, pos: [number, number, number], scale: number) => {
      const mesh = new THREE.Mesh(geo, glassMat);
      mesh.position.set(...pos);
      mesh.scale.setScalar(scale);
      scene.add(mesh);
      shapes.push({
        mesh,
        spin: new THREE.Vector3(Math.random() * 0.04 + 0.02, Math.random() * 0.05 + 0.02, 0),
        phase: Math.random() * Math.PI * 2,
      });
    };
    // 네 귀퉁이 바깥으로 밀어서 화면 가장자리에 '일부만' 걸치게 —
    // 데이터가 놓이는 가운데는 완전히 비운다. 유리는 곁눈으로 스치듯 보여야
    // 배경 노릇을 하지, 가운데 있으면 그냥 방해물이 된다.
    addShape(new THREE.IcosahedronGeometry(1, 6), [-12.5, 5.5, -2], 2.6);
    addShape(new THREE.TorusGeometry(1, 0.42, 48, 128), [13.5, -5.5, -2], 2.8);
    addShape(new THREE.TorusKnotGeometry(0.8, 0.28, 160, 32), [10.5, 7.0, -5], 1.6);

    const resize = () => {
      const { clientWidth: w, clientHeight: h } = host;
      if (!w || !h) return;
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(host);

    // 커서 시차 — 카메라만 아주 조금 움직여도 굴절상이 같이 흘러서 살아 있는 느낌
    const target = { x: 0, y: 0 };
    const cur = { x: 0, y: 0 };
    const onMove = (e: PointerEvent) => {
      target.x = (e.clientX / window.innerWidth - 0.5) * 2;
      target.y = (e.clientY / window.innerHeight - 0.5) * 2;
    };
    const reduced = REDUCED();
    if (!reduced) window.addEventListener('pointermove', onMove, { passive: true });

    const clock = new THREE.Clock();
    let raf = 0;
    let onScreen = true;

    const draw = () => {
      const t = clock.getElapsedTime();
      for (const s of shapes) {
        s.mesh.rotation.x = t * s.spin.x * 6;
        s.mesh.rotation.y = t * s.spin.y * 6;
        s.mesh.position.y += Math.sin(t * 0.6 + s.phase) * 0.004;
      }
      for (let i = 0; i < blobs.length; i++) {
        const b = blobs[i];
        b.position.x += Math.sin(t * 0.25 + i) * 0.006;
        b.position.y += Math.cos(t * 0.2 + i) * 0.005;
      }
      cur.x += (target.x - cur.x) * 0.04;
      cur.y += (target.y - cur.y) * 0.04;
      camera.position.x = cur.x * 1.6;
      camera.position.y = -cur.y * 1.1;
      camera.lookAt(0, 0, 0);
      renderer.render(scene, camera);
    };

    const loop = () => {
      raf = requestAnimationFrame(loop);
      if (!onScreen || document.hidden) return;
      draw();
    };
    if (reduced) draw();
    else loop();

    const io = new IntersectionObserver(([e]) => { onScreen = e.isIntersecting; });
    io.observe(host);

    // 테마 전환 시 배경 그라디언트만 갈아끼움
    const themeObs = new MutationObserver(() => {
      bgTex.dispose();
      bgTex = makeBackdropTexture(isLight());
      scene.background = bgTex;
      if (reduced) draw();
    });
    themeObs.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      io.disconnect();
      themeObs.disconnect();
      window.removeEventListener('pointermove', onMove);
      // three는 GPU 자원을 GC가 안 거둬감 — 직접 정리
      scene.traverse((o) => {
        const m = o as THREE.Mesh;
        m.geometry?.dispose();
        const mat = m.material;
        if (Array.isArray(mat)) mat.forEach((x) => x.dispose());
        else mat?.dispose();
      });
      bgTex.dispose();
      envRT.dispose();
      pmrem.dispose();
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, []);

  if (failed) return <GlassBackdrop />;
  // 전체 세기는 CSS 한 곳에서 — 씬을 다시 만지지 않고 --orb-opacity로 조절한다
  return (
    <div
      ref={hostRef}
      aria-hidden
      className="pointer-events-none fixed inset-0 -z-10"
      style={{ opacity: 'var(--orb-opacity)' }}
    />
  );
}
