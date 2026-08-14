import { useLangStore } from './langStore';

// 2026-08-14: 기존 i18n 라이브러리 없이(zustand langStore + 이 사전 하나로) UI 전체를
// 한/영 전환. 별도 키 체계를 새로 만들지 않고 한국어 원문 자체를 키로 써서, 각 파일에서
// `t('원문 그대로')`로 감싸기만 하면 됨 — 사전에 없는 키는 한국어 원문을 그대로 반환하므로
// (falls back to Korean), 번역이 아직 안 된 문자열이 있어도 화면이 깨지지 않고 그 자리만
// 한국어로 남는다(작업이 끝나지 않은 것을 정직하게 드러냄, 조용히 감추지 않음).
const EN: Record<string, string> = {
  // Layout.tsx
  '메뉴 열기': 'Open menu',
  '설비관리 대시보드': 'Equipment Management Dashboard',
  '클라이언트 전용 · 서버 없음': 'Client-only · No server',
  '대시보드': 'Dashboard',
  '설비 목록': 'Equipment List',
  '설비 추가': 'Add Equipment',
  '레이아웃 매핑': 'Layout Mapping',
  '관계 그래프': 'Relationship Graph',
  '점검·수리 이력': 'Inspection & Repair History',
  '법정점검': 'Legal Inspection',
  '정기점검': 'Regular Inspection',
  '자재·재고관리': 'Materials & Inventory',
  '설정 / 데이터': 'Settings / Data',
  '기능설명': 'Feature Guide',
  '← 데이터 비우고 나가기': '← Clear data and exit',

  // Landing.tsx
  '환영 인사를 하는 마스코트 캐릭터': 'Mascot character waving hello',
  '파일은 서버로 전송되지 않습니다 — 브라우저 안에서만 처리됩니다':
    'Files are never sent to a server — everything is processed in your browser',
  '업무폴더 하나로': 'One work folder,',
  '설비현황 대시보드 완성': 'a complete equipment dashboard',
  '점검·수리 기록이 담긴 문서 폴더를 올리면 설비별로 자동 정리하고, 고장통계·예측·연계분석까지 한 화면에서 볼 수 있습니다.':
    'Upload a folder of inspection and repair records and it is automatically organized by equipment — failure stats, predictions, and correlation analysis, all in one screen.',
  '분석 중…': 'Analyzing…',
  '여기로 업무폴더를 끌어다 놓으세요': 'Drop your work folder here',
  '또는 폴더 선택하기': 'or choose a folder',
  '샘플 데이터로 대시보드 구경하기': 'Explore the dashboard with sample data',

  // Dashboard.tsx
  '설비 현황 대시보드': 'Equipment Status Dashboard',
  '아래 예상 다음 고장·위험등급은 과거 평균 고장간격 기반 참고치입니다. 확정 예측이 아닙니다.':
    'The estimated next failure and risk grade below are reference values based on past average failure intervals — not a confirmed prediction.',
  '총 설비 수': 'Total Equipment',
  '분류별': 'By Category',
  '설비 목록 전체보기 →': 'View all equipment →',
  '상태별 (정상 · 수리중 · 정지)': 'By Status (Normal · Repairing · Stopped)',
  '정상': 'Normal',
  '수리중': 'Repairing',
  '정지': 'Stopped',
  '폐기': 'Disposed',
  '수리중 · 정지 설비': 'Equipment under repair / stopped',
  '점검 임박 (7일 이내)': 'Inspection Due Soon (within 7 days)',
  '임박한 점검이 없습니다.': 'No upcoming inspections.',
  '후': 'left',
  '위험 등급 상': 'High Risk Grade',
  '위험 등급 상인 설비가 없습니다.': 'No equipment with a high risk grade.',
  '최근 1년': 'Last 1yr',
  '법정·정기점검 도래': 'Legal/Regular Inspection Due',
  '임박하거나 기한이 지난 법정·정기점검이 없습니다.': 'No legal/regular inspections due soon or overdue.',
  '기한 지남': 'Overdue',
  '임박': 'Due soon',
  '누적 수리비용': 'Total Repair Cost',
  '비용이 기록된 수리 이력이 없습니다.': 'No repair history with recorded cost.',
  '수리비용 Top10 설비': 'Top 10 Equipment by Repair Cost',
  '재고부족 자재': 'Low-Stock Parts',
  '재고부족 자재가 없습니다.': 'No low-stock parts.',
  '안전': 'Min',
  '자재·재고관리로 이동 →': 'Go to Materials & Inventory →',
  '고장 추이 (최근 24개월, 월별 수리 건수)': 'Failure Trend (last 24 months, monthly repairs)',
  '건수': 'Count',
  '위험 상위 설비': 'Top At-Risk Equipment',
  '최근 1년 이내 반복 고장이 없습니다.': 'No repeat failures in the last year.',
  '위험': 'Risk',
  '상': 'High',
  '중': 'Medium',
  '하': 'Low',
  '예상 다음 고장': 'Next failure (est.)',
  '다음 점검일': 'Next inspection',
  '분류별 고장 건수': 'Failures by Category',
  '사이트별 설비 상태': 'Equipment Status by Site',
  '🧠 뇌모델 신호 (실험적 · 참고용)': '🧠 Brain Model Signals (experimental · reference only)',
  '머신러닝 예측 아님 — 계통 연결·제조사·설치연도·날짜 근접 같은 사실만으로 "지켜볼 근거가 있다"를 뽑는 규칙기반 분석입니다.':
    'Not a machine-learning prediction — a rule-based analysis that flags "worth watching" using only facts like system connections, manufacturer, install year, and date proximity.',
  '발견된 신호가 없습니다(연결설비·고장이력 표본 부족).': 'No signals found (not enough connected-equipment/failure history data).',
  '연쇄고장': 'Chain Failure',
  '설치코호트': 'Install Cohort',
  '동시다발': 'Concurrent Cluster',

  // EquipmentList.tsx (+ category enum, shared with EquipmentDetail/AddEquipment)
  '공조': 'HVAC',
  '냉난방': 'Heating/Cooling',
  '급배수': 'Water Supply/Drain',
  '전기': 'Electrical',
  '소방': 'Fire Safety',
  '승강기': 'Elevator',
  '통신': 'Telecom',
  '기타': 'Other',
  '전체': 'All',
  '미분류': 'Unclassified',
  '설비명·ID 검색': 'Search by name or ID',
  'CSV 내보내기': 'Export CSV',
  '전체선택': 'Select all',
  '실행취소': 'Undo',
  '선택됨': 'selected',
  '선택 해제': 'Deselect',
  '일괄 수정 닫기': 'Close bulk edit',
  '일괄 수정': 'Bulk edit',
  '선택 삭제': 'Delete selected',
  '분류 변경 안 함': 'Keep category',
  '사이트 변경 안 함': 'Keep site',
  '상태 변경 안 함': 'Keep status',
  '에 적용': 'Apply',
  '선택': 'Select',
  '조건에 맞는 설비가 없습니다.': 'No equipment matches the filters.',
  '필터 초기화': 'Reset filters',
  '등록된 설비가 없습니다.': 'No equipment registered.',
  '설비 추가하러 가기 →': 'Go add equipment →',

  // AddEquipment.tsx
  '양식 적용 중 오류(엑셀 파일인지 확인)': 'Error applying template (check that it is an Excel file)',
  '직접 입력하거나, 점검·수리 기록 파일을 폴더째 올리면 자동으로 인식합니다.':
    'Enter details manually, or drop a folder of inspection/repair record files to auto-detect them.',
  '수기 입력': 'Manual Entry',
  '파일로 업로드': 'Upload File',
  '양식 등록': 'Register Template',
  '상세 보기 →': 'View details →',
  '설비 등록': 'Register Equipment',
  '적용할 양식 (엑셀 파일에만 적용됩니다)': 'Template to apply (Excel files only)',
  '일반 처리(자동 분류)': 'Standard processing (auto-classify)',
  'hwp/hwpx/xls/xlsx/pdf/pptx/docx 지원. 파일은 서버로 전송되지 않고 브라우저 안에서만 처리됩니다.':
    'Supports hwp/hwpx/xls/xlsx/pdf/pptx/docx. Files are never sent to a server — processed entirely in your browser.',

  // EquipmentDetail.tsx
  '설비 정보를 수정했습니다': 'Updated equipment info',
  '이력을 추가했습니다': 'Added history record',
  '새 설비로 인식됨 — 이 화면은 이 설비의 이력만 등록하므로 무시됨(새 설비는 "설비 추가" 화면 이용)':
    'Recognized as new equipment — ignored here since this screen only registers history for this equipment (use "Add Equipment" instead)',
  '이력을 수정했습니다': 'Updated history record',
  '이력을 삭제했습니다': 'Deleted history record',
  '← 설비 목록으로': '← Back to equipment list',
  '← 설비 목록': '← Equipment List',
  '수정': 'Edit',
  '삭제': 'Delete',
  '기본 정보 수정': 'Edit Basic Info',
  '기본 정보': 'Basic Info',
  '저장': 'Save',
  '취소': 'Cancel',
  '위치': 'Location',
  '제조사': 'Manufacturer',
  '모델명': 'Model',
  '설치일': 'Install Date',
  '점검주기일': 'Inspection Interval',
  '최근점검일': 'Last Inspection',
  '다음점검일': 'Next Inspection',
  '상세 사양': 'Specifications',
  '닫기': 'Close',
  '+ 사양 추가': '+ Add Spec',
  '항목명 (예: 정격전압)': 'Field name (e.g. Rated Voltage)',
  '값': 'Value',
  '추가': 'Add',
  '등록된 상세 사양이 없습니다.': 'No specifications registered.',
  '고장 통계 (참고치)': 'Failure Stats (reference)',
  '총 고장건수': 'Total Failures',
  '최초→최근 고장일': 'First → Latest Failure',
  '평균고장간격(MTBF)': 'Avg. Failure Interval (MTBF)',
  '총 보수비용': 'Total Repair Cost',
  '수리 이력이 없습니다.': 'No repair history.',
  '이력 추가하기 →': 'Add history →',
  '연결 설비': 'Connected Equipment',
  '연결된 설비가 없습니다.': 'No connected equipment.',
  '연결 해제': 'Disconnect',
  '설비 선택…': 'Select equipment…',
  '연결 추가': 'Add Connection',
  '점검·고장 이력': 'Inspection & Failure History',
  '날짜 *': 'Date *',
  '점검': 'Inspection',
  '수리': 'Repair',
  '제목 *': 'Title *',
  '예: 필터 교체': 'e.g. Replaced filter',
  '비용(원)': 'Cost (KRW)',
  '예: 50000': 'e.g. 50000',
  '여기로 점검·수리 기록 폴더를 끌어다 놓으세요': 'Drop your inspection/repair record folder here',
  '이력이 없습니다.': 'No history.',
  '지금 추가하기 →': 'Add now →',
  '내용': 'Notes',
  '출처파일': 'Source File',
  '비용': 'Cost',
  '분류': 'Category',
  '사이트': 'Site',
  '유형': 'Type',
  '등록': 'Register',
  '상태': 'Status',
  '이력 수정': 'Edit history',
  '이력 삭제': 'Delete history',

  // Mapping.tsx
  '구역 이름을 입력하세요 (예: 제1 가공 위험 구역)': 'Enter a zone name (e.g. Processing Hazard Zone 1)',
  '설비 레이아웃 매핑': 'Equipment Layout Mapping',
  '도면 위 좌표는 % 상대좌표로 저장됩니다 — 창 크기가 바뀌어도 위치가 유지됩니다.':
    'Coordinates on the floorplan are stored as relative % positions — they stay put even if the window size changes.',

  // ControlPanel.tsx
  '일반 상태 모드': 'Normal Status Mode',
  '유지보수 모드': 'Maintenance Mode',
  '히트맵 모드': 'Heatmap Mode',
  '히스토리 타임라인': 'History Timeline',
  '도면': 'Floorplan',
  '도면 이미지 업로드': 'Upload Floorplan Image',
  '더블클릭해서 이름 바꾸기': 'Double-click to rename',
  '도면 삭제': 'Delete Floorplan',
  '보기 모드': 'View Mode',
  '구역(지오펜싱)': 'Zones (geofencing)',
  '+ 구역 그리기 시작': '+ Start Drawing Zone',
  '완료': 'Done',
  '레이어': 'Layers',
  '설비명 표시': 'Show equipment names',
  '구역 경계선 표시': 'Show zone boundaries',
  '데이터 수치 표시': 'Show data values',
  '설비 간 연결선 표시': 'Show connections between equipment',

  // EquipmentPopover.tsx
  '현재 온도 (데모)': 'Current Temp (demo)',
  '누적 가동시간 (데모)': 'Uptime (demo)',
  '작업오더': 'Work Order',
  '대기': 'Pending',
  '진행중': 'In Progress',
  '담당자': 'Assignee',
  '메모 (작업 내용, 특이사항 등)': 'Notes (work details, special notes, etc.)',
  '작업오더 담당자': 'Work order assignee',
  '작업오더 메모': 'Work order notes',
  '배지를 눌러 상태를 완료로 바꾸면 이 담당자·메모가 점검·수리 이력에 자동 기록됩니다.':
    'Tapping the badge to mark it complete will automatically log this assignee/notes to the inspection & repair history.',
  '도면 위 아이콘 크기': 'Icon size on floorplan',
  '아이콘 축소': 'Shrink icon',
  '아이콘 크기': 'Icon size',
  '아이콘 확대': 'Enlarge icon',
  '이 데모에는 현장 사진 데이터가 없습니다': 'No site photo data in this demo',
  '현장 사진': 'Site Photo',
  '이 데모에는 상세 도면 PDF가 없습니다': 'No detailed floorplan PDF in this demo',
  '상세 도면': 'Detailed Floorplan',
  '설비 상세 페이지로 이동 →': 'Go to equipment detail page →',
  '도면에서 배치 삭제': 'Remove placement from floorplan',

  // ZoneStatsPopover.tsx / ConnectionPopover.tsx / AssetToolbar.tsx
  '클릭해서 이름 바꾸기': 'Click to rename',
  '구역 내 설비': 'Equipment in Zone',
  '평균 가동률': 'Avg. Uptime Rate',
  '위험 설비': 'At-Risk Equipment',
  '에러율': 'Error Rate',
  '구역 삭제': 'Delete Zone',
  '연결선': 'Connection',
  '이 연결선은 두 설비의 "연결설비" 정보에서 파생된 것입니다 — 해제하면 두 설비 모두에서 서로에 대한 연결 정보가 지워집니다.':
    'This connection is derived from both equipment’s "Connected Equipment" data — disconnecting removes the link from both sides.',
  '설비 자산': 'Equipment Assets',
  '도면 위로 끌어다 놓으면 배치됩니다. 배치된 설비는 목록에서 사라집니다.':
    'Drag onto the floorplan to place it. Placed equipment disappears from this list.',
  '모든 설비가 배치되었습니다.': 'All equipment has been placed.',
  '검색 결과가 없습니다.': 'No search results.',
  '끌어서 도면에 배치': 'Drag to place on floorplan',
  '(수리 이력 역산 재현 — 확정 기록 아님)': '(Reconstructed from repair history — not a confirmed record)',

  // FloorplanCanvas.tsx
  '도면이 없어 놀란 마스코트': 'Mascot surprised there is no floorplan',
  '좌측 패널에서 도면 이미지를 먼저 업로드하세요.': 'Upload a floorplan image from the left panel first.',
  '캔버스를 클릭해서 구역 꼭짓점을 찍으세요 (3개 이상 필요)': 'Click the canvas to place zone vertices (3+ required)',
  '점검 임박/경과 설비의 🔧 배지를 클릭하면 대기→진행중→완료로 상태가 바뀝니다':
    'Click the 🔧 badge on equipment due/overdue for inspection to cycle its status: Pending → In Progress → Done',
  '휠: 확대/축소 · 드래그: 이동 · 우측 목록에서 설비를 끌어다 놓으세요':
    'Scroll: zoom · Drag: pan · Drag equipment from the right-hand list to place it',

  // HistoryBrowser.tsx
  '설비': 'Equipment',
  '설비 미지정': 'No equipment assigned',
  '예: 공조기 1호기 필터 교체': 'e.g. Replaced HVAC Unit 1 filter',
  '전체 이력': 'All History',
  '설비 매칭 안 됨': 'Unmatched Equipment',
  '제목·설비명·ID 검색': 'Search by title, equipment name, or ID',
  '설비를 지정하면 고아 이력에서 빠집니다': 'Assigning equipment removes it from orphaned history',
  '설비 지정…': 'Assign equipment…',
  '조건에 맞는 이력이 없습니다.': 'No history matches the filters.',

  // LegalInspection.tsx / RegularInspection.tsx / InspectionScheduleBoard.tsx
  '법령상 의무 점검 항목 — 설비별로 얼마나 자주 점검해야 하는지와 점검사항을 기록합니다.':
    'Statutory inspection items — records how often each piece of equipment must be inspected, and what to check.',
  '법정점검 항목': 'Legal Inspection Item',
  '설비별로 어떤 정기점검을 실시해야 하는지와 그 주기를 기록합니다.':
    'Records which routine inspections each piece of equipment needs, and how often.',
  '정기점검 항목': 'Regular Inspection Item',
  '등록됨': 'registered',
  '+ 항목 추가': '+ Add Item',
  '설비 *': 'Equipment *',
  '주기(일) *': 'Interval (days) *',
  '예: 180': 'e.g. 180',
  '최근 점검일': 'Last Inspection',
  '점검사항': 'Checklist',
  '등록된 항목이 없습니다.': 'No items registered.',
  '주기(일)': 'Interval (days)',
  '(설비 없음)': '(No equipment)',
  '미실시': 'Not yet',
  '오늘 완료': 'Complete Today',

  // GraphView.tsx
  '설비 관계 그래프': 'Equipment Relationship Graph',
  '노드 크기 = 고장건수, 색 = 분류, 테두리 = 위험등급. 선 = 연결설비.':
    'Node size = failure count, color = category, border = risk grade. Lines = connections.',
  '표시할 설비가 없습니다.': 'No equipment to display.',
  '고장건수': 'Failure Count',
  '위험등급': 'Risk Grade',

  // Inventory.tsx
  '예비부품·소모자재의 현재 재고와 안전재고를 관리합니다.': 'Manage current stock and safety-stock levels for spare parts and consumables.',
  '재고부족': 'Low Stock',
  '자재명·보관위치 검색': 'Search by part name or storage location',
  '+ 자재 추가': '+ Add Part',
  '자재명 *': 'Part Name *',
  '예: V벨트 A형': 'e.g. V-Belt Type A',
  '규격': 'Spec',
  '예: A-38': 'e.g. A-38',
  '단위 *': 'Unit *',
  '예: EA': 'e.g. EA',
  '현재수량 *': 'Current Qty *',
  '안전재고': 'Safety Stock',
  '이 값 이하면 재고부족 표시': 'Flagged as low stock at or below this value',
  '단가(원)': 'Unit Price (KRW)',
  '보관위치': 'Storage Location',
  '예: 자재창고 A-3': 'e.g. Storage A-3',
  '비고': 'Notes',
  '사용 설비 (선택)': 'Equipment used on (optional)',
  '등록된 자재가 없습니다.': 'No parts registered.',
  '검색 조건에 맞는 자재가 없습니다.': 'No parts match the search.',
  '자재명': 'Part Name',
  '단위': 'Unit',
  '현재수량': 'Current Qty',
  '단가': 'Unit Price',
  '재고 1 감소': 'Decrease stock by 1',
  '재고 1 증가': 'Increase stock by 1',
  '자재를 추가했습니다': 'Added part',
  '자재 정보를 수정했습니다': 'Updated part info',
  '자재를 삭제했습니다': 'Deleted part',

  // Settings.tsx
  '브라우저가 알림 권한을 차단했습니다. 주소창의 사이트 설정에서 알림을 허용한 뒤 다시 시도하세요.':
    'The browser has blocked notification permission. Allow notifications in the site settings (address bar), then try again.',
  '알림 권한이 거부되어 켤 수 없습니다.': 'Notification permission was denied, so it cannot be turned on.',
  'JSON 파일을 내려받았습니다(설비·이력·레이아웃 매핑·법정/정기점검·자재재고·양식 전체 포함).':
    'Downloaded JSON file (includes equipment, history, layout mapping, legal/regular inspections, inventory, and templates).',
  '옵시디언 볼트 형식 zip을 내려받았습니다.': 'Downloaded an Obsidian vault-format zip.',
  '올바른 형식의 파일이 아닙니다(equipments/histories 배열 필요).': 'Not a valid file format (requires equipments/histories arrays).',
  '파일을 읽는 중 오류가 발생했습니다.': 'An error occurred while reading the file.',
  '알림': 'Notifications',
  '브라우저 알림': 'Browser Notifications',
  '점검 임박·법정/정기점검 도래·재고부족을 이 탭이 열려 있는 동안 브라우저 알림으로 받습니다. 서버가 없는 앱이라 탭을 닫으면 알림도 멈춥니다(이메일·푸시 알림은 지원하지 않음).':
    'Get browser notifications for upcoming inspections, legal/regular inspections due, and low stock while this tab is open. There is no server, so notifications stop when the tab is closed (email/push are not supported).',
  '이 브라우저는 알림 기능을 지원하지 않습니다.': 'This browser does not support notifications.',
  '브라우저에서 알림 권한이 차단돼 있습니다. 사이트 설정에서 알림을 허용해야 켤 수 있습니다.':
    'Notification permission is blocked in this browser. Allow notifications in site settings to turn this on.',
  '내보내기': 'Export',
  'JSON으로 전체 내보내기': 'Export Everything as JSON',
  '설비·이력(수리비용 포함)·레이아웃 매핑(도면·배치·구역)·법정/정기점검·자재재고· 양식(셀 매핑)까지 이 앱에서 다시 불러올 수 있는 형태로 전부 백업':
    'Backs up everything — equipment, history (incl. repair cost), layout mapping (floorplans/placements/zones), legal/regular inspections, inventory, and templates (cell mapping) — in a format this app can re-import',
  '내려받기': 'Download',
  '옵시디언 볼트 형식(zip)으로 내보내기': 'Export as Obsidian Vault (zip)',
  '설비카드·점검이력·자재카드 마크다운 노트로 변환된 zip — 옵시디언 볼트에 바로 복사 가능':
    'A zip of equipment cards, inspection history, and part cards converted to Markdown notes — ready to copy straight into an Obsidian vault',
  '생성 중…': 'Generating…',
  '가져오기': 'Import',
  'JSON 파일 불러오기': 'Load JSON File',
  '이 앱에서 내보낸 JSON을 다시 불러와 현재 데이터를 교체(설비·이력·레이아웃 매핑·법정/정기점검·자재재고·양식 전부)':
    'Reload JSON exported from this app to replace current data (all of: equipment, history, layout mapping, legal/regular inspections, inventory, templates)',
  '파일 선택': 'Choose File',

  // FeatureGuide.tsx
  '이 앱의 각 메뉴가 무엇을 하는지 정리했습니다. 완전 클라이언트 사이드로 동작하며 올린 파일과 입력한 데이터는 서버로 전송되지 않고 이 브라우저 안에만 저장됩니다.':
    'A summary of what each menu in this app does. It runs entirely client-side — uploaded files and entered data are never sent to a server and are stored only in this browser.',
  '바로가기 →': 'Go →',
  '설비 현황을 한눈에 — 총 설비 수, 상태별 분포, 점검 임박·법정/정기점검 도래, 위험등급 상위 설비, 고장 추이, 분류별·사이트별 통계, 누적 수리비용과 수리비용 Top10, 재고부족 자재, 뇌모델(고장연계) 신호를 요약해서 보여줍니다.':
    'Equipment status at a glance — total equipment, status breakdown, upcoming inspections and legal/regular inspections due, top at-risk equipment, failure trends, category/site stats, total repair cost and top 10 by cost, low-stock parts, and brain-model (failure correlation) signals, all summarized.',
  '등록된 모든 설비를 검색·필터링하고, 여러 건을 선택해 한꺼번에 삭제할 수 있습니다.':
    'Search and filter all registered equipment, and select multiple items to delete at once.',
  '직접 입력하거나, 점검·수리 기록 파일(hwp/hwpx/xls/xlsx/pdf/pptx/docx)이 든 폴더를 통째로 올리면 설비와 이력을 자동으로 인식합니다. 산출기초조사서(견적서) 형식은 비용까지 자동으로 뽑아줍니다.':
    'Enter equipment manually, or drop a whole folder of inspection/repair record files (hwp/hwpx/xls/xlsx/pdf/pptx/docx) to auto-detect equipment and history. Cost-estimate sheet formats even have cost extracted automatically.',
  '건물 도면 위에 설비를 배치해서 위치 기반으로 보고, 구역(지오펜싱)을 그려 구역별 통계를 확인하고, 히트맵·작업오더 상태·이력 타임라인 보기로 전환할 수 있습니다.':
    'Place equipment on a building floorplan for a location-based view, draw zones (geofencing) to see per-zone stats, and switch to heatmap, work-order status, or history timeline views.',
  '설비 간 연결 관계를 그래프로 시각화해서 어떤 설비끼리 계통이 이어져 있는지 한눈에 봅니다.':
    'Visualize connections between equipment as a graph to see at a glance which systems are linked.',
  '모든 점검·수리 기록을 검색·필터링하고 직접 추가·수정·삭제합니다. 수리 건에는 비용도 기록할 수 있습니다.':
    'Search and filter all inspection/repair records, and add, edit, or delete them directly. Repair entries can also record cost.',
  '법령상 의무 점검 항목(예: 승강기 정기검사)의 주기와 다음 점검일을 관리합니다. 대시보드에서 정기점검보다 항상 먼저 도래 알림을 받습니다.':
    'Manage the interval and next due date for statutory inspection items (e.g. elevator safety inspection). These always surface before regular inspections in the dashboard due alerts.',
  '내부 유지보수 루틴 점검 항목(예: 필터 청소)을 법정점검과 같은 방식으로 관리합니다.':
    'Manage internal maintenance routine items (e.g. filter cleaning) the same way as legal inspections.',
  '예비부품·소모자재의 현재 재고와 안전재고를 관리하고, 안전재고 이하로 떨어지면 재고부족으로 표시합니다.':
    'Manage current stock and safety-stock levels for spare parts and consumables, flagging low stock when it drops to or below the safety level.',
  '전체 데이터를 JSON으로 백업하거나 옵시디언 볼트 형식(zip)으로 내보내고, 백업 파일을 다시 불러올 수 있습니다. 브라우저 알림(점검 임박·법정/정기점검 도래·재고부족)도 여기서 켤 수 있습니다.':
    'Back up all data as JSON or export it as an Obsidian vault (zip), and reload backup files. Browser notifications (upcoming inspections, legal/regular inspections due, low stock) can also be turned on here.',

  // MascotHelp.tsx
  '궁금한 점이 있으신가요?': 'Have a question?',
  '도움말': 'Help',
  '도움말 마스코트': 'Help mascot',
  '이 사이트에 올린 파일은 어디로 가나요?': 'Where do files I upload to this site go?',
  '어디에도 안 갑니다. 전부 브라우저 안에서만 처리되고 서버로 전송되지 않습니다.':
    'Nowhere — everything is processed entirely in your browser and never sent to a server.',
  '샘플 데이터는 실제 데이터인가요?': 'Is the sample data real?',
  '아니요. 전부 완전히 가공된 예시 데이터입니다(실제 부서 데이터 아님).':
    'No. It is entirely fabricated example data (not real department data).',
  '설비를 도면 위에 어떻게 배치하나요?': 'How do I place equipment on the floorplan?',
  '레이아웃 매핑 화면에서 우측 "설비 자산" 목록의 항목을 캔버스로 끌어다 놓으면 됩니다.':
    'On the Layout Mapping screen, drag an item from the "Equipment Assets" list on the right onto the canvas.',
  '위험등급은 어떻게 계산되나요?': 'How is the risk grade calculated?',
  '최근 1년 고장건수를 기준으로 상/중/하로 나눈 참고치입니다. 확정 예측이 아닙니다.':
    'A reference value split into High/Medium/Low based on the failure count over the last year. It is not a confirmed prediction.',
  '구역(지오펜싱)은 어떻게 만드나요?': 'How do I create a zone (geofencing)?',
  '좌측 패널의 "구역 그리기 시작"을 누르고 캔버스에 점을 3개 이상 찍은 뒤 완료를 누르세요.':
    'Click "Start Drawing Zone" in the left panel, place 3 or more points on the canvas, then click Done.',
  '데이터를 전부 지우고 싶어요.': 'I want to clear all my data.',
  '좌측 하단 "데이터 비우고 나가기"를 누르면 초기화됩니다.':
    'Click "Clear data and exit" at the bottom left to reset everything.',

  // GlobalSearch.tsx
  '설비·이력·자재 검색': 'Search equipment, history, parts',
  '설비명·ID·위치·점검이력·자재 검색…': 'Search by equipment name, ID, location, history, or part…',
  '통합검색': 'Global search',
  '설비·점검이력·자재를 한 번에 검색합니다.': 'Search equipment, history, and parts all at once.',
  '자재·재고': 'Parts & Inventory',

  // UploadReview.tsx
  '업로드 검토': 'Upload Review',
  '자동으로 분류한 결과입니다. 필요하면 고치고 아래에서 반영하세요.':
    'This is the automatically classified result. Edit anything below if needed, then commit.',
  '전체 반영': 'Commit All',
  '지원하는 형식(hwp/hwpx/xls/xlsx/pdf/pptx/docx)의 파일을 찾지 못했습니다. 다른 폴더를 다시 골라 보세요.':
    'No files in a supported format (hwp/hwpx/xls/xlsx/pdf/pptx/docx) were found. Try choosing a different folder.',
  '설비로 인식': 'Recognized as Equipment',
  '양식 적용': 'template applied',
  '없음': 'None',
  '이력으로 인식': 'Recognized as History',
  '제외 · 실패': 'Excluded · Failed',

  // TemplateManager.tsx
  '양식 이름을 입력하세요': 'Enter a template name',
  '샘플 파일을 읽지 못했습니다(엑셀 파일인지 확인하세요)': 'Could not read the sample file (check that it is an Excel file)',
  '반복되는 엑셀 서식(예: 설비 현황판)을 한 번만 등록해두면, 다음부턴 같은 셀 위치에서 값을 그대로 읽어와 자동으로 채웁니다. 한 서식에 설비가 여러 개면 설비명 칸에 셀을 쉼표로 여러 개(A7,A8) 적어서 한 번에 여러 설비로 나눌 수 있습니다.':
    'Register a recurring Excel format (e.g. an equipment status sheet) once, and future uploads will read the same cell positions automatically. If one sheet has multiple equipment, list several cells in the equipment-name field separated by commas (A7,A8) to split it into multiple equipment at once.',
  '+ 새 양식 등록': '+ Register New Template',
  '등록된 양식이 없습니다. "새 양식 등록"으로 자주 쓰는 엑셀 서식의 셀 위치를 저장해보세요.':
    'No templates registered. Use "Register New Template" to save the cell positions of an Excel format you use often.',
  '필드': 'Fields',
  '양식 이름 *': 'Template Name *',
  '예: 설비 현황판 표준서식': 'e.g. Standard Equipment Status Sheet',
  '설비명': 'Equipment Name',
  '필수 — 한 서식에 설비가 여러 개면 쉼표로 여러 셀(예: A7,A8), 순서대로 다른 설비가 됩니다':
    'Required — if one sheet has multiple equipment, list several cells separated by commas (e.g. A7,A8); each becomes a separate equipment in order',
  '공조/냉난방/급배수/전기/소방/승강기/통신/기타 중 하나여야 인식':
    'Must be one of HVAC/Heating-Cooling/Water Supply-Drain/Electrical/Fire Safety/Elevator/Telecom/Other to be recognized',
  '정상/수리중/정지/폐기 중 하나여야 인식': 'Must be one of Normal/Repairing/Stopped/Disposed to be recognized',
  '점검주기(일)': 'Inspection Interval (days)',
  '예: A6 또는 A7,A8': 'e.g. A6 or A7,A8',
  '현재 값(셀마다 순서대로)': 'Current value (per cell, in order)',
  '커스텀 필드 (상세사양에 저장 — 가격, 용량 등)': 'Custom fields (saved to Specifications — price, capacity, etc.)',
  '+ 커스텀 필드 추가': '+ Add Custom Field',
  '미리보기용 샘플 파일 (선택 — 올리면 셀을 클릭해서 채울 수 있어요)':
    'Sample file for preview (optional — upload it to fill fields by clicking cells)',
  '샘플 파일을 올리지 않아도, 각 필드에 셀 위치("A6" 등)를 직접 입력해서 저장할 수 있습니다.':
    'You can save without uploading a sample file, by typing the cell position (e.g. "A6") into each field directly.',
  '예: 가격': 'e.g. Price',
  '(빈칸)': '(empty)',

  // HistoryTemplateManager.tsx
  '반복되는 점검·수리 기록 서식을 한 번만 등록해두면, 다음부턴 같은 셀 위치에서 값을 그대로 읽어와 이력을 자동으로 채웁니다. 한 서식에 이력이 여러 개면 제목 칸에 셀을 쉼표로 여러 개(A7,A8) 적어서 한 번에 여러 이력으로 나눌 수 있습니다.':
    'Register a recurring inspection/repair record format once, and future uploads will read the same cell positions to auto-fill history. If one sheet has multiple history entries, list several cells in the title field separated by commas (A7,A8) to split it into multiple entries at once.',
  '등록된 양식이 없습니다. "새 양식 등록"으로 자주 쓰는 이력 서식의 셀 위치를 저장해보세요.':
    'No templates registered. Use "Register New Template" to save the cell positions of a history format you use often.',
  '예: 정기점검 결과지': 'e.g. Regular Inspection Result Sheet',
  '제목': 'Title',
  '날짜': 'Date',
  '필수 — 한 서식에 이력이 여러 개면 쉼표로 여러 셀(예: A7,A8)':
    'Required — if one sheet has multiple history entries, list several cells separated by commas (e.g. A7,A8)',
  '필수': 'Required',
  '점검 또는 수리여야 인식(그 외 값이거나 비어있으면 점검으로 처리)':
    'Must be Inspection or Repair to be recognized (treated as Inspection if empty or any other value)',
  '값이 기존 설비명과 정확히 같으면 자동으로 그 설비에 연결됩니다':
    'If the value exactly matches an existing equipment name, it is automatically linked to that equipment',

  // EquipmentFormFields.tsx
  '설비명 *': 'Equipment Name *',
  '예: 공조기 4호기': 'e.g. HVAC Unit 4',
  '분류 *': 'Category *',
  '예: A동 (비우면 미분류)': 'e.g. Building A (leave blank for Unclassified)',
  '예: 지하2층 기계실': 'e.g. B2 Mechanical Room',
  '예: 30': 'e.g. 30',
};

export function t(ko: string, lang: 'ko' | 'en'): string {
  if (lang === 'ko') return ko;
  return EN[ko] ?? ko;
}

/** 컴포넌트 안에서 `const t = useT()` 후 `t('한국어 원문')`으로 사용 */
export function useT() {
  const lang = useLangStore((s) => s.lang);
  return (ko: string) => t(ko, lang);
}

/** 숫자 뒤에 붙는 조사/단위처럼 사전 방식으로 못 담는 것만 이걸로 직접 분기 */
export function useLang() {
  return useLangStore((s) => s.lang);
}

/** 개수 — "5개" / "5" */
export function fmtCount(n: number, lang: 'ko' | 'en', koUnit = '개'): string {
  return lang === 'ko' ? `${n.toLocaleString()}${koUnit}` : `${n.toLocaleString()}`;
}
/** 원화 — "12,000원" / "₩12,000" */
export function fmtWon(n: number, lang: 'ko' | 'en'): string {
  return lang === 'ko' ? `${n.toLocaleString()}원` : `₩${n.toLocaleString()}`;
}
/** 일수 — "5일" / "5d" */
export function fmtDays(n: number, lang: 'ko' | 'en'): string {
  return lang === 'ko' ? `${n}일` : `${n}d`;
}

export { EN };
