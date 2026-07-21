import InspectionScheduleBoard from '../components/InspectionScheduleBoard';

export default function RegularInspection() {
  return (
    <div className="p-6 md:p-8 space-y-5">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">정기점검</h1>
        <p className="text-sm text-text-dim mt-1">
          설비별로 어떤 정기점검을 실시해야 하는지와 그 주기를 기록합니다.
        </p>
      </div>
      <InspectionScheduleBoard kind="정기점검" itemLabel="정기점검 항목" />
    </div>
  );
}
