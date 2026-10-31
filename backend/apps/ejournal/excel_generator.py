import io
import openpyxl
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
from openpyxl.utils import get_column_letter
from apps.accounts.models import SchoolSetting

def generate_ejournal_excel(session, journal, attempts, absent_students, violations) -> bytes:
    """
    Menghasilkan file Excel (.xlsx) resmi E-Jurnal & Rekapitulasi Ujian
    terdiri dari 2 sheet dengan identitas dinamis sekolah.
    """
    school_setting = SchoolSetting.get_settings()
    wb = openpyxl.Workbook()
    
    # -------------------------------------------------------------
    # 1. SHEET 1: REKAP NILAI & KEHADIRAN
    # -------------------------------------------------------------
    ws1 = wb.active
    ws1.title = "Rekap Nilai & Kehadiran"
    ws1.views.sheetView[0].showGridLines = True

    # Styling Palettes
    font_title = Font(name="Calibri", size=14, bold=True, color="1E293B")
    font_subtitle = Font(name="Calibri", size=11, bold=True, color="475569")
    font_meta_label = Font(name="Calibri", size=10, bold=True, color="334155")
    font_meta_val = Font(name="Calibri", size=10, color="0F172A")
    font_header = Font(name="Calibri", size=10, bold=True, color="FFFFFF")
    font_data = Font(name="Calibri", size=10, color="1E293B")
    font_bold = Font(name="Calibri", size=10, bold=True, color="1E293B")
    font_red_bold = Font(name="Calibri", size=10, bold=True, color="DC2626")
    font_green_bold = Font(name="Calibri", size=10, bold=True, color="16A34A")

    fill_header = PatternFill(start_color="1E3A8A", end_color="1E3A8A", fill_type="solid") # Dark Blue
    fill_zebra = PatternFill(start_color="F8FAFC", end_color="F8FAFC", fill_type="solid")
    fill_absent = PatternFill(start_color="FEF2F2", end_color="FEF2F2", fill_type="solid")
    fill_summary = PatternFill(start_color="E2E8F0", end_color="E2E8F0", fill_type="solid")

    thin_border = Border(
        left=Side(style='thin', color='CBD5E1'),
        right=Side(style='thin', color='CBD5E1'),
        top=Side(style='thin', color='CBD5E1'),
        bottom=Side(style='thin', color='CBD5E1')
    )

    align_center = Alignment(horizontal='center', vertical='center')
    align_left = Alignment(horizontal='left', vertical='center')
    align_right = Alignment(horizontal='right', vertical='center')

    # Kop & Metadata Judul
    ws1["A1"] = school_setting.name.upper()
    ws1["A1"].font = font_title
    ws1["A2"] = "BERITA ACARA & REKAPITULASI HASIL ASESMEN SEKOLAH"
    ws1["A2"].font = font_subtitle

    # Metadata Grid
    teacher_name = session.package.teacher.full_name if session.package and session.package.teacher else "Guru Pengawas"
    meta_info = [
        ("Mata Pelajaran", session.package.subject_name, "Hari / Tanggal", session.start_time.strftime("%d %B %Y")),
        ("Kelas / Rombel", session.classroom.name, "Waktu Sesi", f"{session.start_time.strftime('%H:%M')} - {session.end_time.strftime('%H:%M')} WIB"),
        ("Judul Paket", session.package.title, "Guru Pengawas", teacher_name),
        ("Mode Asesmen", "Zero-Tolerance Lockdown (Anti-Cheat)", "Durasi", f"{session.duration_minutes} Menit"),
    ]

    for r_idx, (k1, v1, k2, v2) in enumerate(meta_info, start=4):
        ws1[f"A{r_idx}"] = k1
        ws1[f"A{r_idx}"].font = font_meta_label
        ws1[f"B{r_idx}"] = f": {v1}"
        ws1[f"B{r_idx}"].font = font_meta_val

        ws1[f"E{r_idx}"] = k2
        ws1[f"E{r_idx}"].font = font_meta_label
        ws1[f"F{r_idx}"] = f": {v2}"
        ws1[f"F{r_idx}"].font = font_meta_val

    # Headers Tabel Rekap
    start_row = 9
    headers1 = [
        "No", "NISN", "Nama Lengkap Siswa", "Status Pengerjaan",
        "Waktu Mulai", "Waktu Selesai", "Pelanggaran", "Nilai Akhir"
    ]

    for col_idx, h in enumerate(headers1, start=1):
        cell = ws1.cell(row=start_row, column=col_idx, value=h)
        cell.font = font_header
        cell.fill = fill_header
        cell.alignment = align_center
        cell.border = thin_border

    current_row = start_row + 1
    item_no = 1
    scores_list = []

    # Siswa Hadir / Mengerjakan
    for att in attempts:
        start_str = att.started_at.strftime("%H:%M:%S") if att.started_at else "-"
        finish_str = att.finished_at.strftime("%H:%M:%S") if att.finished_at else "Sedang Ujian"
        score_val = att.total_score if att.total_score is not None else 0
        if att.total_score is not None:
            scores_list.append(att.total_score)

        row_data = [
            item_no,
            att.student.username,
            att.student.full_name,
            att.get_status_display(),
            start_str,
            finish_str,
            att.violation_count,
            score_val
        ]

        for col_idx, val in enumerate(row_data, start=1):
            cell = ws1.cell(row=current_row, column=col_idx, value=val)
            cell.font = font_data
            cell.border = thin_border

            if col_idx in [1, 2, 5, 6]:
                cell.alignment = align_center
            elif col_idx in [7, 8]:
                cell.alignment = align_right
                if col_idx == 7 and val > 0:
                    cell.font = font_red_bold
                elif col_idx == 8:
                    cell.font = font_bold
            else:
                cell.alignment = align_left

            if item_no % 2 == 0:
                cell.fill = fill_zebra

        current_row += 1
        item_no += 1

    # Siswa Tidak Hadir
    for student in absent_students:
        row_data = [
            item_no,
            student.username,
            student.full_name,
            "TIDAK HADIR / BELUM MEMULAI",
            "-",
            "-",
            0,
            0
        ]
        for col_idx, val in enumerate(row_data, start=1):
            cell = ws1.cell(row=current_row, column=col_idx, value=val)
            cell.font = font_red_bold if col_idx == 4 else font_data
            cell.border = thin_border
            cell.fill = fill_absent

            if col_idx in [1, 2, 5, 6]:
                cell.alignment = align_center
            elif col_idx in [7, 8]:
                cell.alignment = align_right
            else:
                cell.alignment = align_left

        current_row += 1
        item_no += 1

    # Summary Row
    avg_score = round(sum(scores_list) / len(scores_list), 2) if scores_list else 0.0
    ws1.cell(row=current_row, column=1, value="Rata-rata Nilai Siswa Hadir").font = font_bold
    ws1.merge_cells(start_row=current_row, start_column=1, end_row=current_row, end_column=7)
    ws1.cell(row=current_row, column=1).alignment = align_right
    avg_cell = ws1.cell(row=current_row, column=8, value=avg_score)
    avg_cell.font = font_green_bold
    avg_cell.alignment = align_right

    for c in range(1, 9):
        cell = ws1.cell(row=current_row, column=c)
        cell.fill = fill_summary
        cell.border = thin_border

    # Catatan Pengawas
    notes_row = current_row + 2
    ws1.cell(row=notes_row, column=1, value="Catatan Kejadian Pengawas:").font = font_bold
    notes_text = journal.supervisor_notes if journal and journal.supervisor_notes else "Pelaksanaan asesmen berlangsung aman, tertib, dan lancar tanpa kendala teknis."
    ws1.cell(row=notes_row + 1, column=1, value=notes_text).font = font_data
    ws1.merge_cells(start_row=notes_row + 1, start_column=1, end_row=notes_row + 2, end_column=8)

    # -------------------------------------------------------------
    # 2. SHEET 2: LOG PELANGGARAN ANTI-CHEAT
    # -------------------------------------------------------------
    ws2 = wb.create_sheet(title="Log Pelanggaran Anti-Cheat")
    ws2.views.sheetView[0].showGridLines = True

    fill_viol_header = PatternFill(start_color="991B1B", end_color="991B1B", fill_type="solid") # Dark Red

    ws2["A1"] = "LOG REKAM JEJAK INTEGRITAS & PELANGGARAN SISWA"
    ws2["A1"].font = font_title
    ws2["A2"] = f"Sesi: {session.package.subject_name} ({session.classroom.name}) — Sensor Keamanan Real-Time"
    ws2["A2"].font = font_subtitle

    headers2 = [
        "No", "NISN", "Nama Lengkap Siswa", "Jenis Pelanggaran",
        "Keterangan Sensor", "Waktu Terdeteksi", "Waktu Buka Kunci (Unlock)"
    ]

    start_row_v = 5
    for col_idx, h in enumerate(headers2, start=1):
        cell = ws2.cell(row=start_row_v, column=col_idx, value=h)
        cell.font = font_header
        cell.fill = fill_viol_header
        cell.alignment = align_center
        cell.border = thin_border

    curr_row_v = start_row_v + 1
    if violations:
        for idx, v in enumerate(violations, start=1):
            unlocked_str = v.unlocked_by_teacher_at.strftime("%H:%M:%S") if v.unlocked_by_teacher_at else "Masih Terkunci"
            detected_str = v.detected_at.strftime("%H:%M:%S") if v.detected_at else "-"
            v_type_str = v.get_violation_type_display() if hasattr(v, 'get_violation_type_display') else v.violation_type

            row_data = [
                idx,
                v.attempt.student.username,
                v.attempt.student.full_name,
                v_type_str,
                v.description,
                detected_str,
                unlocked_str
            ]

            for col_idx, val in enumerate(row_data, start=1):
                cell = ws2.cell(row=curr_row_v, column=col_idx, value=val)
                cell.font = font_data
                cell.border = thin_border
                if col_idx in [1, 2, 4, 6, 7]:
                    cell.alignment = align_center
                else:
                    cell.alignment = align_left

                if idx % 2 == 0:
                    cell.fill = fill_zebra

            curr_row_v += 1
    else:
        # Jika tidak ada pelanggaran sama sekali
        cell = ws2.cell(row=curr_row_v, column=1, value="Tidak ada insiden kecurangan yang terdeteksi selama sesi ini berlangsung.")
        cell.font = font_green_bold
        ws2.merge_cells(start_row=curr_row_v, start_column=1, end_row=curr_row_v, end_column=7)
        cell.alignment = align_center
        cell.border = thin_border

    # Auto-adjust column widths for both sheets
    for ws in [ws1, ws2]:
        for col in ws.columns:
            max_len = 0
            col_letter = get_column_letter(col[0].column)
            for cell in col:
                # ignore merged cells in length calculation
                if cell.value:
                    lines = str(cell.value).split("\n")
                    for line in lines:
                        if len(line) > max_len and len(line) < 60:
                            max_len = len(line)
            ws.column_dimensions[col_letter].width = max(max_len + 3, 12)

    # Specific fine-tuning
    ws1.column_dimensions['A'].width = 6
    ws1.column_dimensions['B'].width = 16
    ws1.column_dimensions['C'].width = 28
    ws1.column_dimensions['D'].width = 22
    ws1.column_dimensions['E'].width = 16
    ws1.column_dimensions['F'].width = 16
    ws1.column_dimensions['G'].width = 14
    ws1.column_dimensions['H'].width = 14

    ws2.column_dimensions['A'].width = 6
    ws2.column_dimensions['B'].width = 16
    ws2.column_dimensions['C'].width = 28
    ws2.column_dimensions['D'].width = 22
    ws2.column_dimensions['E'].width = 40
    ws2.column_dimensions['F'].width = 18
    ws2.column_dimensions['G'].width = 24

    # Output to BytesIO
    buffer = io.BytesIO()
    wb.save(buffer)
    excel_bytes = buffer.getvalue()
    buffer.close()
    return excel_bytes

