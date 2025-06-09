import { ReportGeneratorForm } from './ReportGeneratorForm';

export default function ReportsPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-headline font-bold text-primary">Monthly Fee Reports</h1>
      <ReportGeneratorForm />
    </div>
  );
}
