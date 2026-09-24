import { Roster } from '../../components/Roster';
import { CanvasSync, PageHeader } from '../../components/ui';
import { professorCourses, professorEnrollments } from '../../data/insights';
import { DEMO_PROFESSOR } from '../../data/mock';

export function StudentsPage() {
  const rows = professorEnrollments(DEMO_PROFESSOR);
  return (
    <div className="page">
      <PageHeader
        eyebrow="All courses"
        title="Students"
        subtitle={`${rows.length} enrollments across your ${professorCourses(DEMO_PROFESSOR).length} courses, ranked by who needs you most.`}
        actions={<CanvasSync label="Roster synced with Canvas" />}
      />
      <Roster rows={rows} showCourse title="All students" />
    </div>
  );
}
