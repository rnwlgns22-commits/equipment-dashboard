import type { Category, EquipmentStatus } from '../types';
import { addDaysUTC } from '../lib/dates';

const CATEGORIES: Category[] = ['공조', '냉난방', '급배수', '전기', '소방', '승강기', '통신', '기타'];
const STATUSES: EquipmentStatus[] = ['정상', '수리중', '정지', '폐기'];

export interface EquipmentFormState {
  설비명: string;
  분류: Category;
  사이트: string;
  위치: string;
  제조사: string;
  모델명: string;
  설치일: string;
  상태: EquipmentStatus;
  최근점검일: string;
  점검주기일: string;
}

export const emptyEquipmentForm: EquipmentFormState = {
  설비명: '',
  분류: '공조',
  사이트: '',
  위치: '',
  제조사: '',
  모델명: '',
  설치일: '',
  상태: '정상',
  최근점검일: '',
  점검주기일: '',
};

// 최근점검일+점검주기일 → 다음점검일 자동계산 + 트리밍까지, 신규 등록/수정 둘 다 같은
// 규칙을 써야 해서 여기서 한 번만 구현. 설비ID·연결설비·상세사양·출처파일은 호출부마다
// 의미가 달라서(신규는 새로 부여, 수정은 기존 값 유지) 여기 포함 안 함.
export function equipmentFieldsFromForm(form: EquipmentFormState) {
  const 점검주기일 = form.점검주기일 ? Number(form.점검주기일) : undefined;
  const 다음점검일 = form.최근점검일 && 점검주기일 ? addDaysUTC(form.최근점검일, 점검주기일) : undefined;
  return {
    설비명: form.설비명.trim(),
    분류: form.분류,
    사이트: form.사이트.trim() || '미분류',
    위치: form.위치.trim() || undefined,
    제조사: form.제조사.trim() || undefined,
    모델명: form.모델명.trim() || undefined,
    설치일: form.설치일 || undefined,
    상태: form.상태,
    점검주기일,
    최근점검일: form.최근점검일 || undefined,
    다음점검일,
  };
}

// AddEquipment.tsx(신규 등록)와 EquipmentDetail.tsx(수정)가 필드셋을 그대로 공유 —
// 둘이 따로 관리하면 필드 하나 늘 때마다 두 군데 다 고쳐야 하고 놓치기 쉬움.
export default function EquipmentFormFields({
  form,
  onChange,
}: {
  form: EquipmentFormState;
  onChange: (patch: Partial<EquipmentFormState>) => void;
}) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <label className="block sm:col-span-2">
        <span className="text-xs text-text-dim">설비명 *</span>
        <input
          required
          value={form.설비명}
          onChange={(e) => onChange({ 설비명: e.target.value })}
          className="mt-1 w-full rounded-lg border border-border bg-card px-3 py-2 text-sm outline-none focus:border-accent/60"
          placeholder="예: 공조기 4호기"
        />
      </label>

      <label className="block">
        <span className="text-xs text-text-dim">분류 *</span>
        <select
          value={form.분류}
          onChange={(e) => onChange({ 분류: e.target.value as Category })}
          className="mt-1 w-full rounded-lg border border-border bg-card px-3 py-2 text-sm"
        >
          {CATEGORIES.map((c) => (
            <option key={c}>{c}</option>
          ))}
        </select>
      </label>

      <label className="block">
        <span className="text-xs text-text-dim">상태</span>
        <select
          value={form.상태}
          onChange={(e) => onChange({ 상태: e.target.value as EquipmentStatus })}
          className="mt-1 w-full rounded-lg border border-border bg-card px-3 py-2 text-sm"
        >
          {STATUSES.map((s) => (
            <option key={s}>{s}</option>
          ))}
        </select>
      </label>

      <label className="block">
        <span className="text-xs text-text-dim">사이트</span>
        <input
          value={form.사이트}
          onChange={(e) => onChange({ 사이트: e.target.value })}
          className="mt-1 w-full rounded-lg border border-border bg-card px-3 py-2 text-sm outline-none focus:border-accent/60"
          placeholder="예: A동 (비우면 미분류)"
        />
      </label>
      <label className="block">
        <span className="text-xs text-text-dim">위치</span>
        <input
          value={form.위치}
          onChange={(e) => onChange({ 위치: e.target.value })}
          className="mt-1 w-full rounded-lg border border-border bg-card px-3 py-2 text-sm outline-none focus:border-accent/60"
          placeholder="예: 지하2층 기계실"
        />
      </label>

      <label className="block">
        <span className="text-xs text-text-dim">제조사</span>
        <input
          value={form.제조사}
          onChange={(e) => onChange({ 제조사: e.target.value })}
          className="mt-1 w-full rounded-lg border border-border bg-card px-3 py-2 text-sm outline-none focus:border-accent/60"
        />
      </label>
      <label className="block">
        <span className="text-xs text-text-dim">모델명</span>
        <input
          value={form.모델명}
          onChange={(e) => onChange({ 모델명: e.target.value })}
          className="mt-1 w-full rounded-lg border border-border bg-card px-3 py-2 text-sm outline-none focus:border-accent/60"
        />
      </label>

      <label className="block">
        <span className="text-xs text-text-dim">설치일</span>
        <input
          type="date"
          value={form.설치일}
          onChange={(e) => onChange({ 설치일: e.target.value })}
          className="mt-1 w-full rounded-lg border border-border bg-card px-3 py-2 text-sm outline-none focus:border-accent/60"
        />
      </label>
      <label className="block">
        <span className="text-xs text-text-dim">최근점검일</span>
        <input
          type="date"
          value={form.최근점검일}
          onChange={(e) => onChange({ 최근점검일: e.target.value })}
          className="mt-1 w-full rounded-lg border border-border bg-card px-3 py-2 text-sm outline-none focus:border-accent/60"
        />
      </label>
      <label className="block">
        <span className="text-xs text-text-dim">점검주기(일)</span>
        <input
          type="number"
          min={1}
          value={form.점검주기일}
          onChange={(e) => onChange({ 점검주기일: e.target.value })}
          className="mt-1 w-full rounded-lg border border-border bg-card px-3 py-2 text-sm outline-none focus:border-accent/60"
          placeholder="예: 30"
        />
      </label>
    </div>
  );
}
