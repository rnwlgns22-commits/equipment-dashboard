import { useState } from 'react';
import type { HistoryTemplate, HistoryTemplateCells } from '../lib/historySheetTemplate';
import { useHistoryTemplateStore } from '../historyTemplateStore';
import { showToast } from '../toastStore';
import { useT, useLang } from '../i18n';

// TemplateManager.tsx(설비 양식)와 같은 방식 — 이력은 상세사양 같은 자유항목이 없어서
// 커스텀 필드 없이 고정 필드만 있음.
const FIELD_KEYS: { key: keyof HistoryTemplateCells; label: string; hint?: string }[] = [
  { key: '제목', label: '제목', hint: '필수 — 한 서식에 이력이 여러 개면 쉼표로 여러 셀(예: A7,A8)' },
  { key: '날짜', label: '날짜', hint: '필수' },
  { key: '유형', label: '유형', hint: '점검 또는 수리여야 인식(그 외 값이거나 비어있으면 점검으로 처리)' },
  { key: '내용', label: '내용' },
  { key: '비용', label: '비용' },
  { key: '설비명', label: '설비명', hint: '값이 기존 설비명과 정확히 같으면 자동으로 그 설비에 연결됩니다' },
];

function emptyTemplate(): HistoryTemplate {
  return { id: `htpl-${Date.now()}`, name: '', createdAt: new Date().toISOString(), cells: {} };
}

interface PreviewCell {
  addr: string;
  value: string;
}

export default function HistoryTemplateManager() {
  const t = useT();
  const lang = useLang();
  const templates = useHistoryTemplateStore((s) => s.templates);
  const addTemplate = useHistoryTemplateStore((s) => s.addTemplate);
  const updateTemplate = useHistoryTemplateStore((s) => s.updateTemplate);
  const removeTemplate = useHistoryTemplateStore((s) => s.removeTemplate);

  const [editing, setEditing] = useState<HistoryTemplate | null>(null);
  const [isNew, setIsNew] = useState(false);
  const [previewGrid, setPreviewGrid] = useState<PreviewCell[][] | null>(null);
  const [previewValues, setPreviewValues] = useState<Record<string, string>>({});
  const [previewFileName, setPreviewFileName] = useState('');
  const [activeField, setActiveField] = useState<keyof HistoryTemplateCells | null>(null);

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

  const startEdit = (tpl: HistoryTemplate) => {
    setEditing({ ...tpl, cells: { ...tpl.cells } });
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
      showToast(t('양식 이름을 입력하세요'), 'error');
      return;
    }
    const cleaned: HistoryTemplate = { ...editing, name: editing.name.trim() };
    if (isNew) addTemplate(cleaned);
    else updateTemplate(cleaned.id, cleaned);
    showToast(lang === 'ko' ? `양식 "${cleaned.name}" 저장했습니다` : `Saved template "${cleaned.name}"`);
    setEditing(null);
    resetPreview();
  };

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
      showToast(t('샘플 파일을 읽지 못했습니다(엑셀 파일인지 확인하세요)'), 'error');
    }
  };

  const appendCellRef = (existing: string, addr: string): string => {
    const list = existing
      .split(/[,\s]+/)
      .map((s) => s.trim().toUpperCase())
      .filter(Boolean);
    if (list.includes(addr)) return existing;
    return [...list, addr].join(',');
  };

  const fillActiveFieldFromCell = (cell: PreviewCell) => {
    if (!editing || !activeField) return;
    const currentValue = editing.cells[activeField] ?? '';
    setEditing((prev) =>
      prev ? { ...prev, cells: { ...prev.cells, [activeField]: appendCellRef(currentValue, cell.addr) } } : prev,
    );
  };

  if (!editing) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <p className="text-xs text-text-dim">
            {t('반복되는 점검·수리 기록 서식을 한 번만 등록해두면, 다음부턴 같은 셀 위치에서 값을 그대로 읽어와 이력을 자동으로 채웁니다. 한 서식에 이력이 여러 개면 제목 칸에 셀을 쉼표로 여러 개(A7,A8) 적어서 한 번에 여러 이력으로 나눌 수 있습니다.')}
          </p>
          <button
            type="button"
            onClick={startCreate}
            className="shrink-0 rounded-lg bg-accent text-bg px-4 py-2 text-sm font-medium hover:brightness-110"
          >
            {t('+ 새 양식 등록')}
          </button>
        </div>

        {templates.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border p-6 text-center text-sm text-text-dim">
            {t('등록된 양식이 없습니다. "새 양식 등록"으로 자주 쓰는 이력 서식의 셀 위치를 저장해보세요.')}
          </div>
        ) : (
          <div className="space-y-2">
            {templates.map((tpl) => {
              const mappedCount = Object.values(tpl.cells).filter(Boolean).length;
              return (
                <div key={tpl.id} className="flex items-center justify-between rounded-2xl border border-border bg-card p-3">
                  <div>
                    <div className="text-sm font-medium">{tpl.name}</div>
                    <div className="text-xs text-text-dim mt-0.5">
                      {t('필드')} {mappedCount} · {new Date(tpl.createdAt).toLocaleDateString(lang === 'ko' ? 'ko-KR' : 'en-US')}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => startEdit(tpl)}
                      className="rounded-lg border border-border px-3 py-1.5 text-xs text-text-dim hover:text-text"
                    >
                      {t('수정')}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const confirmMsg = lang === 'ko' ? `"${tpl.name}" 양식을 삭제할까요?` : `Delete template "${tpl.name}"?`;
                        if (confirm(confirmMsg)) removeTemplate(tpl.id);
                      }}
                      className="rounded-lg border border-border px-3 py-1.5 text-xs text-red-400 hover:text-red-300"
                    >
                      {t('삭제')}
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
        <span className="text-xs text-text-dim">{t('양식 이름 *')}</span>
        <input
          value={editing.name}
          onChange={(e) => setEditing({ ...editing, name: e.target.value })}
          placeholder={t('예: 정기점검 결과지')}
          className="mt-1 w-full rounded-lg border border-border bg-card px-3 py-2 text-sm outline-none focus:border-accent/60"
        />
      </label>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="space-y-2">
          {FIELD_KEYS.map(({ key, label, hint }) => (
            <div key={key} className="flex items-center gap-2">
              <span className="w-16 shrink-0 text-xs text-text-dim" title={hint ? t(hint) : undefined}>
                {t(label)}
              </span>
              <input
                value={editing.cells[key] ?? ''}
                onFocus={() => setActiveField(key)}
                onChange={(e) => setEditing({ ...editing, cells: { ...editing.cells, [key]: e.target.value } })}
                placeholder={t('예: A6 또는 A7,A8')}
                className={`flex-1 rounded-lg border px-2 py-1.5 text-xs bg-card outline-none ${
                  activeField === key ? 'border-accent/60' : 'border-border'
                }`}
              />
              {previewGrid && editing.cells[key] && (
                <span className="w-32 shrink-0 truncate text-xs text-text-dim" title={t('현재 값(셀마다 순서대로)')}>
                  → {previewForRaw(previewValues, editing.cells[key], t)}
                </span>
              )}
            </div>
          ))}
        </div>

        <div className="space-y-2">
          <label className="block">
            <span className="text-xs text-text-dim">
              {t('미리보기용 샘플 파일 (선택 — 올리면 셀을 클릭해서 채울 수 있어요)')}
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
                      <td className="sticky left-0 bg-bg-soft border border-border px-2 py-1 text-text-dim">{r + 1}</td>
                      {row.map((cell, c) => (
                        <td
                          key={c}
                          onClick={() => fillActiveFieldFromCell(cell)}
                          className={`border border-border px-2 py-1 whitespace-nowrap cursor-pointer hover:bg-accent/10 ${
                            !cell.value ? 'text-text-dim' : ''
                          }`}
                          title={
                            activeField
                              ? lang === 'ko'
                                ? `클릭하면 선택된 필드에 ${cell.addr}가 채워집니다`
                                : `Click to fill the selected field with ${cell.addr}`
                              : cell.addr
                          }
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
              {t('샘플 파일을 올리지 않아도, 각 필드에 셀 위치("A6" 등)를 직접 입력해서 저장할 수 있습니다.')}
            </div>
          )}
        </div>
      </div>

      <div className="flex justify-end gap-2 pt-2">
        <button type="button" onClick={cancel} className="rounded-lg border border-border px-4 py-2 text-sm text-text-dim hover:text-text">
          {t('취소')}
        </button>
        <button
          type="button"
          onClick={save}
          className="rounded-lg bg-accent text-bg px-4 py-2 text-sm font-medium hover:brightness-110"
        >
          {t('저장')}
        </button>
      </div>
    </div>
  );
}

function colLetterFromAddr(addr: string): string {
  return addr.replace(/\d+$/, '');
}

function previewForRaw(previewValues: Record<string, string>, raw: string, t: (ko: string) => string): string {
  const refs = raw
    .split(/[,\s]+/)
    .map((s) => s.trim().toUpperCase())
    .filter(Boolean);
  if (refs.length === 0) return t('(빈칸)');
  return refs.map((ref) => previewValues[ref] || t('(빈칸)')).join(', ');
}
