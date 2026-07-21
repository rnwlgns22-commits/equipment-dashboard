import InspectionScheduleBoard from '../components/InspectionScheduleBoard';

export default function LegalInspection() {
  return (
    <div className="p-6 md:p-8 space-y-5">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">법정점검</h1>
        <p className="text-sm text-text-dim mt-1">
          법령상 의무 점검 항목 — 설비별로 얼마나 자주 점검해야 하는지와 점검사항을 기록합니다.
        </p>
      </div>
      <InspectionScheduleBoard kind="법정점검" itemLabel="법정점검 항목" />
    </div>
  );
}
