// 폴더 드롭(webkitGetAsEntry 재귀) + <input webkitdirectory> 둘 다 지원.
// 파일이 사용자 PC를 안 떠난다는 원칙(설계.md §1)이라 여기서 하는 일은 브라우저
// File API로 읽는 것뿐 — 어디로도 전송 안 함.
export interface DroppedFile {
  file: File;
  relativePath: string;
}

function readEntry(entry: FileSystemEntry, pathPrefix: string): Promise<DroppedFile[]> {
  return new Promise((resolve) => {
    if (entry.isFile) {
      (entry as FileSystemFileEntry).file((file) => resolve([{ file, relativePath: pathPrefix + file.name }]));
      return;
    }
    if (entry.isDirectory) {
      const reader = (entry as FileSystemDirectoryEntry).createReader();
      const all: DroppedFile[] = [];
      const readBatch = () => {
        reader.readEntries((entries) => {
          if (entries.length === 0) {
            resolve(all);
            return;
          }
          void (async () => {
            for (const e of entries) {
              const results = await readEntry(e, `${pathPrefix}${entry.name}/`);
              all.push(...results);
            }
            readBatch();
          })();
        });
      };
      readBatch();
      return;
    }
    resolve([]);
  });
}

export async function readDataTransfer(dataTransfer: DataTransfer): Promise<DroppedFile[]> {
  const items = Array.from(dataTransfer.items);
  const entries = items
    .map((item) => (item as DataTransferItem & { webkitGetAsEntry?(): FileSystemEntry | null }).webkitGetAsEntry?.())
    .filter((e): e is FileSystemEntry => Boolean(e));

  if (entries.length === 0) {
    return Array.from(dataTransfer.files).map((file) => ({ file, relativePath: file.name }));
  }

  const results: DroppedFile[] = [];
  for (const entry of entries) {
    results.push(...(await readEntry(entry, '')));
  }
  return results;
}

export function readFileList(fileList: FileList): DroppedFile[] {
  return Array.from(fileList).map((file) => ({
    file,
    relativePath: (file as File & { webkitRelativePath?: string }).webkitRelativePath || file.name,
  }));
}
