import { useState } from 'react';
import type { SheetTemplate, SheetTemplateCells, SheetTemplateCustomField } from '../lib/sheetTemplate';
import { useTemplateStore } from '../templateStore';
import { showToast } from '../toastStore';

// EquipmentFormFields.tsx의 필드셋과 맞춤 — 상세사양(가격 등 자유 항목)은 아래
// customFields로 따로 받는다.
const FIELD_KEYS: { key: keyof SheetTemplateCells; label: string; hint?: string }[] = [
  { key: '설비명', label: '설비명', hint: '필수 — 비어있으면 그 파일은 실패 처리' },
  { key: '분류', label: '분류', hint: '공조/냉난방/급배수/전기/소방/승강기/통신/기타 중 하나여야 인식' },
  { key: '사이트', label: '사이트' },
  { key: '위치', label: '위치' },
  { key: '제조사', label: '제조사' },
  { key: '모델명', label: '모델명' },
  { key: '설치일', label: '설치일' },
  { key: '상태', label: '상태', hint: '정상/수리중/정지/폐기 중 하나여야 인식' },
  { key: '최근점검일', label: '최근점검일' },
  { key: '점검주기일', label: '점검주기(일)' },
];

function emptyTemplate(): SheetTemplate {
  return { id: `tpl-${Date.now()}`, name: '', createdAt: new Date().toISOString(), cells: {}, customFields: [] };
}

interface PreviewCell {
  addr: string; // A1 표기 — 실제 셀 값과 같은 방식(사용자가 필드에 입력하는 것과 동일)
  value: string;
}

export default function TemplateManager() {
  const templates = useTemplateStore((s) => s.templates);
  const addTemplate = useTemplateStore((s) => s.addTemplate);
  const updateTemplate = useTemplateStore((s) => s.updateTemplate);
  const removeTemplate = useTemplateStore((s) => s.removeTemplate);

  const [editing, setEditing] = useState<SheetTemplate | null>(null);
  const [isNew, setIsNew] = useState(false);
  const [previewGrid, setPreviewGrid] = useState<PreviewCell[][] | null>(null);
  const [previewValues, setPreviewValues] = useState<Record<string, string>>({});
  const [previewFileName, setPreviewFileName] = useState('');
  const [activeField, setActiveField] = useState<string | null>(null);

  const resetPreview = () => {
    setPreviewGrid(null);
    setPreviewValues({});
    setPreviewFileName('');
  };

  const startCreate = () => {
    setEditing(emptyTemplate());
    setIsNew(true);
    resetPreview();
    setActiveField(null);
  };

  const startEdit = (t: SheetTemplate) => {
    setEditing({ ...t, cells: { ...t.cells }, customFields: t.customFields.map((c) => ({ ...c })) });
    setIsNew(false);
    resetPreview();
    setActiveField(null);
  };

  const cancel = () => {
    setEditing(null);
    resetPreview();
    setActiveField(null);
  };

  const save = () => {
    if (!editing || !editing.name.trim()) {
      showToast('양식 이름을 입력하세요', 'error');
      return;
    }
    const cleaned: SheetTemplate = {
      ...editing,
      name: editing.name.trim(),
      customFields: editing.customFields.filter((c) => c.label.trim()),
    };
    if (isNew) addTemplate(cleaned);
    else updateTemplate(cleaned.id, cleaned);
    showToast(`양식 "${cleaned.name}" 저장했습니다`);
    setEditing(null);
    resetPreview();
  };

  // 시트 원본을 A1 주소 그대로 격자로 펼쳐둔다 — sheet_to_json 기반 배열(readXlsxRowsRaw)은
  // 빈 앞행이 있으면 실제 주소와 어긋나서(예: 데이터가 A6부터 시작하면 배열은 0번째 행부터
  // 시작) 양식 등록에는 못 쓴다(2026-07-26 검증 중 발견). 항상 A1부터 실제 데이터 끝까지
  // 그려서 화면에 보이는 행/열 번호가 진짜 엑셀 주소와 같게 만든다.
  const handlePreviewFile = async (file: File) => {
    const [{ readXlsxSheet }, XLSX] = await Promise.all([import('../lib/convert'), import('xlsx')]);
    try {
      const sheet = await readXlsxSheet(file);
      const range = XLSX.utils.decode_range(sheet['!ref'] || 'A1:A1');
      const grid: PreviewCell[][] = [];
      const values: Record<string, string> = {};
      for (let r = 0; r <= range.e.r; r += 1) {
        const row: PreviewCell[] = [];
        for (let c = 0; c <= range.e.c; c += 1) {
          const addr = XLSX.utils.encode_cell({ r, c });
          const cell = sheet[addr];
          const value = cell?.v === undefined || cell?.v === null ? '' : String(cell.v);
          row.push({ addr, value });
          values[addr] = value;
        }
        grid.push(row);
      }
      setPreviewGrid(grid);
      setPreviewValues(values);
      setPreviewFileName(file.name);
    } catch {
      showToast('샘플 파일을 읽지 못했습니다(엑셀 파일인지 확인하세요)', 'error');
    }
  };

  const fillActiveFieldFromCell = (cell: PreviewCell) => {
    if (!editing || !activeField) return;
    if (activeField.startsWith('custom:')) {
      const idx = Number(activeField.slice(7));
      setEditing((prev) =>
        prev
          ? { ...prev, customFields: prev.customFields.map((cf, i) => (i === idx ? { ...cf, cell: cell.addr } : cf)) }
          : prev,
      );
    } else {
      setEditing((prev) => (prev ? { ...prev, cells: { ...prev.cells, [activeField]: cell.addr } } : prev));
    }
  };

  if (!editing) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <p className="text-xs text-text-dim">
            반복되는 엑셀 서식(예: 설비 현황판)을 한 번만 등록해두면, 다음부턴 같은 셀 위치에서 값을 그대로
            읽어와 자동으로 채웁니다.
          </p>
          <button
            type="button"
            onClick={startCreate}
            className="shrink-0 rounded-lg bg-accent text-bg px-4 py-2 text-sm font-medium hover:brightness-110"
          >
            + 새 양식 등록
          </button>
        </div>

        {templates.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border p-6 text-center text-sm text-text-dim">
            등록된 양식이 없습니다. "새 양식 등록"으로 자주 쓰는 엑셀 서식의 셀 위치를 저장해보세요.
          </div>
        ) : (
          <div className="space-y-2">
            {templates.map((t) => {
              const mappedCount = Object.values(t.cells).filter(Boolean).length + t.customFields.length;
              return (
                <div
                  key={t.id}
                  className="flex items-center justify-between rounded-2xl border border-border bg-card p-3"
                >
                  <div>
                    <div className="text-sm font-medium">{t.name}</div>
                    <div className="text-xs text-text-dim mt-0.5">
                      필드 {mappedCount}개 매핑 · {new Date(t.createdAt).toLocaleDateString('ko-KR')}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => startEdit(t)}
                      className="rounded-lg border border-border px-3 py-1.5 text-xs text-text-dim hover:text-text"
                    >
                      수정
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (confirm(`"${t.name}" 양식을 삭제할까요?`)) removeTemplate(t.id);
                      }}
                      className="rounded-lg border border-border px-3 py-1.5 text-xs text-red-400 hover:text-red-300"
                    >
                      삭제
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <label className="block">
        <span className="text-xs text-text-dim">양식 이름 *</span>
        <input
          value={editing.name}
          onChange={(e) => setEditing({ ...editing, name: e.target.value })}
          placeholder="예: 설비 현황판 표준서식"
          className="mt-1 w-full rounded-lg border border-border bg-card px-3 py-2 text-sm outline-none focus:border-accent/60"
        />
      </label>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="space-y-3">
          <div className="space-y-2">
            {FIELD_KEYS.map(({ key, label, hint }) => (
              <div key={key} className="flex items-center gap-2">
                <span className="w-28 shrink-0 text-xs text-text-dim" title={hint}>
                  {label}
                </span>
                <input
                  value={editing.cells[key] ?? ''}
                  onFocus={() => setActiveField(key)}
                  onChange={(e) => setEditing({ ...editing, cells: { ...editing.cells, [key]: e.target.value } })}
                  placeholder="예: A6"
                  className={`flex-1 rounded-lg border px-2 py-1.5 text-xs bg-card outline-none ${
                    activeField === key ? 'border-accent/60' : 'border-border'
                  }`}
                />
                {previewGrid && editing.cells[key] && (
                  <span className="w-24 shrink-0 truncate text-xs text-text-dim" title="현재 값">
                    → {previewValues[editing.cells[key]!.trim().toUpperCase()] || '(빈칸)'}
                  </span>
                )}
              </div>
            ))}
          </div>

          <div className="pt-2 border-t border-border space-y-2">
            <div className="text-xs text-text-dim">커스텀 필드 (상세사양에 저장 — 가격, 용량 등)</div>
            {editing.customFields.map((cf, idx) => (
              <CustomFieldRow
                key={idx}
                cf={cf}
                active={activeField === `custom:${idx}`}
                previewValues={previewGrid ? previewValues : null}
                onFocus={() => setActiveField(`custom:${idx}`)}
                onChange={(patch) =>
                  setEditing({
                    ...editing,
                    customFields: editing.customFields.map((c, i) => (i === idx ? { ...c, ...patch } : c)),
                  })
                }
                onRemove={() =>
                  setEditing({ ...editing, customFields: editing.customFields.filter((_, i) => i !== idx) })
                }
              />
            ))}
            <button
              type="button"
              onClick={() =>
                setEditing({ ...editing, customFields: [...editing.customFields, { label: '', cell: '' }] })
              }
              className="rounded-lg border border-dashed border-border px-3 py-1.5 text-xs text-text-dim hover:text-text"
            >
              + 커스텀 필드 추가
            </button>
          </div>
        </div>

        <div className="space-y-2">
          <label className="block">
            <span className="text-xs text-text-dim">
              미리보기용 샘플 파일 (선택 — 올리면 셀을 클릭해서 채울 수 있어요)
            </span>
            <input
              type="file"
              accept=".xlsx,.xls"
              onChange={(e) => {
                if (e.target.files?.[0]) void handlePreviewFile(e.target.files[0]);
                e.target.value = '';
              }}
              className="mt-1 w-full text-xs text-text-dim file:mr-3 file:rounded-lg file:border-0 file:bg-bg-soft file:px-3 file:py-1.5 file:text-xs"
            />
          </label>

          {previewGrid ? (
            <div className="rounded-2xl border border-border overflow-auto max-h-[28rem]">
              <div className="text-xs text-text-dim px-2 py-1 border-b border-border truncate">{previewFileName}</div>
              <table className="text-xs border-collapse">
                <thead>
                  <tr>
                    <th className="sticky top-0 left-0 z-10 bg-bg-soft border border-border w-8" />
                    {previewGrid[0]?.map((cell, c) => (
                      <th key={c} className="sticky top-0 z-10 bg-bg-soft border border-border px-2 py-1 font-normal">
                        {colLetterFromAddr(cell.addr)}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {previewGrid.map((row, r) => (
                    <tr key={r}>
                      <td className="sticky left-0 bg-bg-soft border border-border px-2 py-1 text-text-dim">
                        {r + 1}
                      </td>
                      {row.map((cell, c) => (
                        <td
                          key={c}
                          onClick={() => fillActiveFieldFromCell(cell)}
                          className={`border border-border px-2 py-1 whitespace-nowrap cursor-pointer hover:bg-accent/10 ${
                            !cell.value ? 'text-text-dim' : ''
                          }`}
                          title={activeField ? `클릭하면 선택된 필드에 ${cell.addr}가 채워집니다` : cell.addr}
                        >
                          {cell.value || ''}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-border p-6 text-center text-xs text-text-dim">
              샘플 파일을 올리지 않아도, 각 필드에 셀 위치("A6" 등)를 직접 입력해서 저장할 수 있습니다.
            </div>
          )}
        </div>
      </div>

      <div className="flex justify-end gap-2 pt-2">
        <button type="button" onClick={cancel} className="rounded-lg border border-border px-4 py-2 text-sm text-text-dim hover:text-text">
          취소
        </button>
        <button
          type="button"
          onClick={save}
          className="rounded-lg bg-accent text-bg px-4 py-2 text-sm font-medium hover:brightness-110"
        >
          저장
        </button>
      </div>
    </div>
  );
}

function CustomFieldRow({
  cf,
  active,
  previewValues,
  onFocus,
  onChange,
  onRemove,
}: {
  cf: SheetTemplateCustomField;
  active: boolean;
  previewValues: Record<string, string> | null;
  onFocus: () => void;
  onChange: (patch: Partial<SheetTemplateCustomField>) => void;
  onRemove: () => void;
}) {
  return (
    <div className="flex items-center gap-2">
      <input
        value={cf.label}
        onChange={(e) => onChange({ label: e.target.value })}
        placeholder="예: 가격"
        className="w-28 shrink-0 rounded-lg border border-border bg-card px-2 py-1.5 text-xs outline-none"
      />
      <input
        value={cf.cell}
        onFocus={onFocus}
        onChange={(e) => onChange({ cell: e.target.value })}
        placeholder="예: A6"
        className={`flex-1 rounded-lg border px-2 py-1.5 text-xs bg-card outline-none ${
          active ? 'border-accent/60' : 'border-border'
        }`}
      />
      {previewValues && cf.cell && (
        <span className="w-24 shrink-0 truncate text-xs text-text-dim" title="현재 값">
          → {previewValues[cf.cell.trim().toUpperCase()] || '(빈칸)'}
        </span>
      )}
      <button type="button" onClick={onRemove} className="shrink-0 text-xs text-red-400 hover:text-red-300">
        삭제
      </button>
    </div>
  );
}

// "A6" → "A" — 헤더 표시용. 미리보기 격자의 각 셀이 이미 자기 주소(addr)를 들고 있어서
// 여기선 문자만 떼어내면 됨.
function colLetterFromAddr(addr: string): string {
  return addr.replace(/\d+$/, '');
}
