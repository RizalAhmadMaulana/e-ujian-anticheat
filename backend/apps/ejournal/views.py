from django.http import HttpResponse
from django.shortcuts import get_object_or_404
from django.utils.text import slugify
from rest_framework import status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated

from apps.accounts.permissions import IsTeacherRole
from apps.accounts.models import User
from apps.exams.models import ExamSession
from apps.proctoring.models import StudentAttempt, ViolationLog
from apps.ejournal.models import ExamJournal
from apps.ejournal.serializers import (
    ExamJournalDetailSerializer,
    UpdateSupervisorNotesSerializer
)
from apps.ejournal.pdf_generator import generate_ejournal_pdf
from apps.ejournal.excel_generator import generate_ejournal_excel


def get_or_create_journal_with_stats(session, teacher):
    """
    Helper untuk mengambil atau membuat record ExamJournal
    sekaligus memperbarui agregasi kehadiran dan jumlah pelanggaran terkini.
    """
    journal, created = ExamJournal.objects.get_or_create(
        session=session,
        defaults={
            'teacher': teacher or session.package.teacher,
            'supervisor_notes': 'Pelaksanaan asesmen berlangsung aman, tertib, dan terkendali tanpa kendala yang berarti.'
        }
    )

    total_scheduled = User.objects.filter(role='STUDENT', classroom=session.classroom).count()
    total_present = session.attempts.count()
    total_absent = max(0, total_scheduled - total_present)
    total_violations = sum(att.violation_count for att in session.attempts.all())

    journal.total_students_scheduled = total_scheduled
    journal.total_students_present = total_present
    journal.total_students_absent = total_absent
    journal.total_violations_recorded = total_violations
    journal.save(update_fields=[
        'total_students_scheduled',
        'total_students_present',
        'total_students_absent',
        'total_violations_recorded'
    ])
    return journal


class ExamJournalDetailView(APIView):
    permission_classes = [IsAuthenticated, IsTeacherRole]

    def get(self, request, session_id):
        session = get_object_or_404(
            ExamSession.objects.select_related('package', 'classroom', 'package__teacher'),
            id=session_id
        )
        journal = get_or_create_journal_with_stats(session, request.user)
        serializer = ExamJournalDetailSerializer(journal)
        return Response(serializer.data, status=status.HTTP_200_OK)

    def patch(self, request, session_id):
        session = get_object_or_404(ExamSession, id=session_id)
        journal = get_or_create_journal_with_stats(session, request.user)
        serializer = UpdateSupervisorNotesSerializer(journal, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response({
                'message': 'Catatan pengawas berhasil disimpan.',
                'supervisor_notes': journal.supervisor_notes
            }, status=status.HTTP_200_OK)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class ExamJournalExportPDFView(APIView):
    permission_classes = [IsAuthenticated, IsTeacherRole]

    def get(self, request, session_id):
        session = get_object_or_404(
            ExamSession.objects.select_related('package', 'classroom', 'package__teacher'),
            id=session_id
        )
        journal = get_or_create_journal_with_stats(session, request.user)

        # Kumpulkan seluruh data terkait
        attempts = list(
            session.attempts.all().select_related('student').order_by('student__full_name')
        )
        attempted_student_ids = [a.student_id for a in attempts]
        absent_students = list(
            User.objects.filter(role='STUDENT', classroom=session.classroom)
            .exclude(id__in=attempted_student_ids)
            .order_by('full_name')
        )
        violations = list(
            ViolationLog.objects.filter(attempt__session=session)
            .select_related('attempt__student')
            .order_by('detected_at')
        )

        pdf_bytes = generate_ejournal_pdf(session, journal, attempts, absent_students, violations)

        clean_subject = slugify(session.package.subject_name)
        clean_class = slugify(session.classroom.name)
        date_str = session.start_time.strftime("%Y%m%d")
        filename = f"E-Jurnal_{clean_subject}_{clean_class}_{date_str}.pdf"

        response = HttpResponse(pdf_bytes, content_type='application/pdf')
        response['Content-Disposition'] = f'attachment; filename="{filename}"'
        response['Content-Length'] = len(pdf_bytes)
        return response


class ExamJournalExportExcelView(APIView):
    permission_classes = [IsAuthenticated, IsTeacherRole]

    def get(self, request, session_id):
        session = get_object_or_404(
            ExamSession.objects.select_related('package', 'classroom', 'package__teacher'),
            id=session_id
        )
        journal = get_or_create_journal_with_stats(session, request.user)

        attempts = list(
            session.attempts.all().select_related('student').order_by('student__full_name')
        )
        attempted_student_ids = [a.student_id for a in attempts]
        absent_students = list(
            User.objects.filter(role='STUDENT', classroom=session.classroom)
            .exclude(id__in=attempted_student_ids)
            .order_by('full_name')
        )
        violations = list(
            ViolationLog.objects.filter(attempt__session=session)
            .select_related('attempt__student')
            .order_by('detected_at')
        )

        excel_bytes = generate_ejournal_excel(session, journal, attempts, absent_students, violations)

        clean_subject = slugify(session.package.subject_name)
        clean_class = slugify(session.classroom.name)
        date_str = session.start_time.strftime("%Y%m%d")
        filename = f"E-Jurnal_{clean_subject}_{clean_class}_{date_str}.xlsx"

        response = HttpResponse(
            excel_bytes,
            content_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        )
        response['Content-Disposition'] = f'attachment; filename="{filename}"'
        response['Content-Length'] = len(excel_bytes)
        return response
