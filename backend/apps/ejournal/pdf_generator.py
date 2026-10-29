import io
from reportlab.lib.pagesizes import letter, A4
from reportlab.lib import colors
from reportlab.lib.units import inch, cm
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, HRFlowable
from django.utils import timezone
from apps.accounts.models import SchoolSetting

def generate_ejournal_pdf(session, journal, attempts, absent_students, violations) -> bytes:
    """
    Menghasilkan dokumen resmi PDF E-Jurnal & Berita Acara Ujian menggunakan ReportLab
    dengan data dinamis dari Pengaturan Sekolah (SchoolSetting).
    """
    school_setting = SchoolSetting.get_settings()
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=A4,
        rightMargin=1.5 * cm,
        leftMargin=1.5 * cm,
        topMargin=1.5 * cm,
        bottomMargin=1.5 * cm
    )

    story = []
    styles = getSampleStyleSheet()

    # Custom Paragraph Styles
    title_style = ParagraphStyle(
        'DocTitle',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=12,
        leading=15,
        alignment=1, # Center
        textColor=colors.HexColor('#0f172a')
    )

    header_style = ParagraphStyle(
        'KopHeader',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=11,
        leading=14,
        alignment=1,
        textColor=colors.HexColor('#0f172a')
    )

    sub_header_style = ParagraphStyle(
        'KopSubHeader',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=8,
        leading=11,
        alignment=1,
        textColor=colors.HexColor('#475569')
    )

    section_heading = ParagraphStyle(
        'SectionHeading',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=10,
        leading=13,
        textColor=colors.HexColor('#1e293b')
    )

    cell_style = ParagraphStyle(
        'CellText',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=8,
        leading=10,
        textColor=colors.HexColor('#1e293b')
    )

    cell_bold = ParagraphStyle(
        'CellBold',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=8,
        leading=10,
        textColor=colors.HexColor('#1e293b')
    )

    cell_center = ParagraphStyle(
        'CellCenter',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=8,
        leading=10,
        alignment=1,
        textColor=colors.HexColor('#1e293b')
    )

    # 1. KOP SURAT RESMI
    if school_setting.sub_header:
        story.append(Paragraph(school_setting.sub_header.upper(), sub_header_style))
    story.append(Paragraph(school_setting.name.upper(), header_style))
    contact_parts = []
    if school_setting.address:
        contact_parts.append(school_setting.address)
    if school_setting.phone:
        contact_parts.append(f"Telp: {school_setting.phone}")
    if school_setting.email:
        contact_parts.append(f"Email: {school_setting.email}")
    contact_line = " • ".join(contact_parts)
    if contact_line:
        story.append(Paragraph(contact_line, sub_header_style))
    story.append(Spacer(1, 4))
    story.append(HRFlowable(width="100%", thickness=1.5, color=colors.HexColor('#0f172a'), spaceBefore=2, spaceAfter=8))

    # 2. JUDUL BERITA ACARA
    story.append(Paragraph("BERITA ACARA & E-JURNAL PELAKSANAAN ASESMEN SEKOLAH", title_style))
    story.append(Paragraph(f"Tahun Ajaran {school_setting.academic_year or session.classroom.academic_year}", sub_header_style))
    story.append(Spacer(1, 8))

    # 3. INFORMASI SESI
    teacher_obj = session.package.teacher if (session.package and session.package.teacher) else None
    teacher_name = teacher_obj.full_name if teacher_obj else "Guru Pengawas"
    exam_type_str = "Soal Mandiri (Native)" if session.package.exam_type == 'NATIVE_QUESTIONS' else "Tautan Formulir Eksternal (Google Form)"
    
    info_data = [
        [Paragraph("<b>Mata Pelajaran:</b>", cell_style), Paragraph(session.package.subject_name, cell_style),
         Paragraph("<b>Hari / Tanggal:</b>", cell_style), Paragraph(session.start_time.strftime("%d %B %Y"), cell_style)],
        [Paragraph("<b>Kelas / Rombel:</b>", cell_style), Paragraph(session.classroom.name, cell_style),
         Paragraph("<b>Waktu Sesi:</b>", cell_style), Paragraph(f"{session.start_time.strftime('%H:%M')} - {session.end_time.strftime('%H:%M')} WIB ({session.duration_minutes} Menit)", cell_style)],
        [Paragraph("<b>Judul Paket:</b>", cell_style), Paragraph(session.package.title, cell_style),
         Paragraph("<b>Guru Pengawas:</b>", cell_style), Paragraph(teacher_name, cell_style)],
        [Paragraph("<b>Tipe Pengerjaan:</b>", cell_style), Paragraph(exam_type_str, cell_style),
         Paragraph("<b>Protokol Keamanan:</b>", cell_style), Paragraph("<font color='#047857'><b>Zero-Tolerance Lockdown Aktif</b></font>", cell_style)],
    ]
    t_info = Table(info_data, colWidths=[2.8 * cm, 5.8 * cm, 3.2 * cm, 5.8 * cm])
    t_info.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), colors.HexColor('#f8fafc')),
        ('BOX', (0,0), (-1,-1), 0.5, colors.HexColor('#cbd5e1')),
        ('INNERGRID', (0,0), (-1,-1), 0.5, colors.HexColor('#e2e8f0')),
        ('TOPPADDING', (0,0), (-1,-1), 3),
        ('BOTTOMPADDING', (0,0), (-1,-1), 3),
    ]))
    story.append(t_info)
    story.append(Spacer(1, 8))

    # 4. RINGKASAN KEHADIRAN (4 BOX SUMMARY)
    total_scheduled = len(attempts) + len(absent_students)
    total_present = len(attempts)
    total_absent = len(absent_students)
    total_violations = sum(a.violation_count for a in attempts)

    summary_data = [
        [Paragraph("<b>Total Terjadwal</b>", cell_center), Paragraph("<b>Siswa Hadir</b>", cell_center),
         Paragraph("<b>Tidak Hadir</b>", cell_center), Paragraph("<b>Total Pelanggaran</b>", cell_center)],
        [Paragraph(f"<b>{total_scheduled} Orang</b>", cell_center),
         Paragraph(f"<font color='#047857'><b>{total_present} Orang</b></font>", cell_center),
         Paragraph(f"<font color='#dc2626'><b>{total_absent} Orang</b></font>", cell_center),
         Paragraph(f"<font color='#d97706'><b>{total_violations} Insiden</b></font>", cell_center)]
    ]
    t_summary = Table(summary_data, colWidths=[4.4 * cm, 4.4 * cm, 4.4 * cm, 4.4 * cm])
    t_summary.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), colors.HexColor('#f1f5f9')),
        ('BACKGROUND', (0,1), (-1,1), colors.HexColor('#ffffff')),
        ('BOX', (0,0), (-1,-1), 0.5, colors.HexColor('#cbd5e1')),
        ('INNERGRID', (0,0), (-1,-1), 0.5, colors.HexColor('#e2e8f0')),
        ('TOPPADDING', (0,0), (-1,-1), 4),
        ('BOTTOMPADDING', (0,0), (-1,-1), 4),
    ]))
    story.append(t_summary)
    story.append(Spacer(1, 10))

    # 5. TABEL REKAPITULASI NILAI & PRESENSI SISWA
    story.append(Paragraph("1. Rekapitulasi Presensi & Nilai Hasil Asesmen", section_heading))
    story.append(Spacer(1, 4))

    table_header = [
        Paragraph("<b>No</b>", cell_center),
        Paragraph("<b>NISN</b>", cell_center),
        Paragraph("<b>Nama Lengkap Siswa</b>", cell_style),
        Paragraph("<b>Mulai</b>", cell_center),
        Paragraph("<b>Selesai</b>", cell_center),
        Paragraph("<b>Pelanggaran</b>", cell_center),
        Paragraph("<b>Status</b>", cell_center),
        Paragraph("<b>Nilai</b>", cell_center),
    ]

    table_rows = [table_header]
    for idx, att in enumerate(attempts):
        score_display = f"{att.total_score}" if att.total_score is not None else "-"
        start_time_str = att.started_at.strftime("%H:%M:%S") if att.started_at else "-"
        finish_time_str = att.finished_at.strftime("%H:%M:%S") if att.finished_at else "Sedang Ujian"
        
        table_rows.append([
            Paragraph(str(idx + 1), cell_center),
            Paragraph(att.student.username, cell_center),
            Paragraph(att.student.full_name, cell_bold),
            Paragraph(start_time_str, cell_center),
            Paragraph(finish_time_str, cell_center),
            Paragraph(f"{att.violation_count}x", cell_center),
            Paragraph(att.get_status_display(), cell_center),
            Paragraph(f"<b>{score_display}</b>", cell_center),
        ])

    t_presensi = Table(table_rows, colWidths=[0.8 * cm, 2.5 * cm, 5.2 * cm, 1.8 * cm, 2.0 * cm, 2.0 * cm, 2.0 * cm, 1.3 * cm])
    t_presensi.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), colors.HexColor('#e2e8f0')),
        ('BOX', (0,0), (-1,-1), 0.5, colors.HexColor('#94a3b8')),
        ('INNERGRID', (0,0), (-1,-1), 0.5, colors.HexColor('#cbd5e1')),
        ('TOPPADDING', (0,0), (-1,-1), 3),
        ('BOTTOMPADDING', (0,0), (-1,-1), 3),
    ]))
    story.append(t_presensi)
    story.append(Spacer(1, 10))

    # 6. TABEL LOG INTEGRITAS & KECURANGAN SISWA
    if violations:
        story.append(Paragraph("2. Log Pelanggaran Integritas Ujian (Deteksi Sensor Real-Time)", section_heading))
        story.append(Spacer(1, 4))

        v_header = [
            Paragraph("<b>No</b>", cell_center),
            Paragraph("<b>Nama Siswa (NISN)</b>", cell_style),
            Paragraph("<b>Jenis Pelanggaran</b>", cell_center),
            Paragraph("<b>Keterangan Sensor</b>", cell_style),
            Paragraph("<b>Waktu Deteksi</b>", cell_center),
            Paragraph("<b>Status Buka Kunci</b>", cell_center),
        ]
        v_rows = [v_header]
        for v_idx, v in enumerate(violations):
            unlocked_str = v.unlocked_by_teacher_at.strftime("%H:%M:%S") if v.unlocked_by_teacher_at else "Masih Terkunci"
            v_rows.append([
                Paragraph(str(v_idx + 1), cell_center),
                Paragraph(f"{v.attempt.student.full_name} ({v.attempt.student.username})", cell_bold),
                Paragraph(v.violation_type, cell_center),
                Paragraph(v.description, cell_style),
                Paragraph(v.detected_at.strftime("%H:%M:%S"), cell_center),
                Paragraph(unlocked_str, cell_center),
            ])

        t_viol = Table(v_rows, colWidths=[0.8 * cm, 4.5 * cm, 3.2 * cm, 5.0 * cm, 2.0 * cm, 2.1 * cm])
        t_viol.setStyle(TableStyle([
            ('BACKGROUND', (0,0), (-1,0), colors.HexColor('#fee2e2')),
            ('BOX', (0,0), (-1,-1), 0.5, colors.HexColor('#f87171')),
            ('INNERGRID', (0,0), (-1,-1), 0.5, colors.HexColor('#fca5a5')),
            ('TOPPADDING', (0,0), (-1,-1), 3),
            ('BOTTOMPADDING', (0,0), (-1,-1), 3),
        ]))
        story.append(t_viol)
        story.append(Spacer(1, 10))

    # 7. CATATAN BERITA ACARA PENGAWAS
    story.append(Paragraph("3. Catatan Kejadian Penting Pengawas Ujian", section_heading))
    story.append(Spacer(1, 3))
    notes_text = journal.supervisor_notes if journal and journal.supervisor_notes else "Pelaksanaan asesmen berlangsung aman, tertib, dan lancar tanpa kendala teknis."
    t_notes = Table([[Paragraph(f"<i>{notes_text}</i>", cell_style)]], colWidths=[17.6 * cm])
    t_notes.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), colors.HexColor('#f8fafc')),
        ('BOX', (0,0), (-1,-1), 0.5, colors.HexColor('#cbd5e1')),
        ('TOPPADDING', (0,0), (-1,-1), 6),
        ('BOTTOMPADDING', (0,0), (-1,-1), 6),
    ]))
    story.append(t_notes)
    story.append(Spacer(1, 15))

    # 8. LEMBAR PENGESAHAN & TANDA TANGAN
    sig_city = school_setting.city or "Indramayu"
    sig_date = session.start_time.strftime("%d %B %Y")
    principal_title = f"Kepala {school_setting.name}"
    principal_nip_text = f"NIP. {school_setting.principal_nip}" if school_setting.principal_nip else ""
    teacher_nip_val = (teacher_obj.nip or teacher_obj.username) if teacher_obj else ""
    teacher_nip_text = f"NIP. {teacher_nip_val}" if teacher_nip_val else "-"
    
    sig_data = [
        [Paragraph(f"Mengetahui,<br/><b>{principal_title}</b>", cell_center),
         Paragraph(f"{sig_city}, {sig_date}<br/><b>Guru Pengawas Ujian</b>", cell_center)],
        [Spacer(1, 35), Spacer(1, 35)],
        [Paragraph(f"<u><b>{school_setting.principal_name}</b></u><br/>{principal_nip_text}", cell_center),
         Paragraph(f"<u><b>{teacher_name}</b></u><br/>{teacher_nip_text}", cell_center)],
    ]
    t_sig = Table(sig_data, colWidths=[8.8 * cm, 8.8 * cm])
    t_sig.setStyle(TableStyle([
        ('ALIGN', (0,0), (-1,-1), 'CENTER'),
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
    ]))
    story.append(t_sig)

    # Build PDF
    doc.build(story)
    pdf_bytes = buffer.getvalue()
    buffer.close()
    return pdf_bytes

