import io
import openpyxl
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
from openpyxl.utils import get_column_letter
from apps.accounts.models import SchoolSetting
from apps.exams.models import Question

def generate_session_results_excel(session, questions, students_data, attempts_by_student, classroom_display=None) -> bytes:
    """
    Menghasilkan file Excel (.xlsx) resmi Rekapitulasi Nilai Siswa
    lengkap dengan analisis jawaban per butir soal (benar/salah/poin) dan kunci jawaban.
    """
    school_setting = SchoolSetting.get_settings()
    wb = openpyxl.Workbook()

    # =============================================================
    # SHEET 1: REKAPITULASI NILAI & ANALISIS JAWABAN PER NOMOR
    # =============================================================
    ws1 = wb.active
    ws1.title = "Rekap Nilai Siswa"
    ws1.views.sheetView[0].showGridLines = True

    # Styling Palettes
    font_title = Font(name="Calibri", size=14, bold=True, color="1E293B")
    font_subtitle = Font(name="Calibri", size=11, bold=True, color="475569")
    font_meta_label = Font(name="Calibri", size=10, bold=True, color="334155")
    font_meta_val = Font(name="Calibri", size=10, color="0F172A")

    font_header = Font(name="Calibri", size=10, bold=True, color="FFFFFF")
    font_header_q = Font(name="Calibri", size=9, bold=True, color="FFFFFF")
    font_data = Font(name="Calibri", size=10, color="1E293B")
    font_bold = Font(name="Calibri", size=10, bold=True, color="1E293B")
    font_mono = Font(name="Consolas", size=9, color="1E293B")

    font_correct = Font(name="Calibri", size=9, bold=True, color="15803D")
    font_partial = Font(name="Calibri", size=9, bold=True, color="B45309")
    font_incorrect = Font(name="Calibri", size=9, bold=True, color="B91C1C")
    font_essay = Font(name="Calibri", size=9, bold=True, color="1D4ED8")

    fill_header_main = PatternFill(start_color="1E3A8A", end_color="1E3A8A", fill_type="solid") # Dark Blue
    fill_header_q = PatternFill(start_color="0F766E", end_color="0F766E", fill_type="solid")    # Teal/Emerald Dark
    fill_zebra = PatternFill(start_color="F8FAFC", end_color="F8FAFC", fill_type="solid")
    fill_correct = PatternFill(start_color="DCFCE7", end_color="DCFCE7", fill_type="solid")      # Soft Green
    fill_partial = PatternFill(start_color="FEF3C7", end_color="FEF3C7", fill_type="solid")      # Soft Amber
    fill_incorrect = PatternFill(start_color="FEE2E2", end_color="FEE2E2", fill_type="solid")    # Soft Red
    fill_essay = PatternFill(start_color="DBEAFE", end_color="DBEAFE", fill_type="solid")        # Soft Blue
    fill_summary = PatternFill(start_color="E2E8F0", end_color="E2E8F0", fill_type="solid")

    thin_border = Border(
        left=Side(style='thin', color='CBD5E1'),
        right=Side(style='thin', color='CBD5E1'),
        top=Side(style='thin', color='CBD5E1'),
        bottom=Side(style='thin', color='CBD5E1')
    )

    align_center = Alignment(horizontal='center', vertical='center', wrap_text=True)
    align_left = Alignment(horizontal='left', vertical='center')
    align_right = Alignment(horizontal='right', vertical='center')

    # Kop & Metadata Judul
    ws1["A1"] = school_setting.name.upper()
    ws1["A1"].font = font_title
    ws1["A2"] = "REKAPITULASI NILAI ASESMEN & ANALISIS LEMBAR JAWABAN SISWA"
    ws1["A2"].font = font_subtitle

    # Metadata Grid
    pkg_title = session.package.title if session.package else "Asesmen Ujian"
    subj_name = session.package.subject_name if session.package else "-"
    date_str = session.start_time.strftime("%d %B %Y") if session.start_time else "-"
    time_str = f"{session.start_time.strftime('%H:%M')} - {session.end_time.strftime('%H:%M')} WIB" if session.start_time and session.end_time else "-"
    cls_display = classroom_display if classroom_display else session.get_classrooms_display()

    meta_info = [
        ("Mata Pelajaran", subj_name, "Hari / Tanggal", date_str),
        ("Kelas / Rombel", cls_display, "Waktu Sesi", time_str),
        ("Judul Paket Soal", pkg_title, "Durasi Ujian", f"{session.duration_minutes} Menit"),
        ("Mode Asesmen", "Zero-Tolerance Anti-Cheat", "Jumlah Soal", f"{len(questions)} Butir"),
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
    fixed_headers = [
        "No", "NISN", "Nama Siswa", "Kelas", "Status",
        "Waktu Selesai", "Durasi", "Sensor Anti-Cheat", "Total Benar", "Nilai Akhir"
    ]

    # Kolom soal dinamis
    question_headers = [f"No. {q.order_number}\n({q.points} Poin)" for q in questions]
    all_headers = fixed_headers + question_headers

    for col_idx, h in enumerate(all_headers, start=1):
        cell = ws1.cell(row=start_row, column=col_idx, value=h)
        cell.alignment = align_center
        cell.border = thin_border
        if col_idx <= len(fixed_headers):
            cell.font = font_header
            cell.fill = fill_header_main
        else:
            cell.font = font_header_q
            cell.fill = fill_header_q

    current_row = start_row + 1
    scores_list = []
    question_correct_counts = {q.id: 0 for q in questions}

    for idx, st in enumerate(students_data, start=1):
        is_zebra = idx % 2 == 0
        default_row_fill = fill_zebra if is_zebra else None

        att = attempts_by_student.get(st.get("student_id"))
        answers = att.answers_json or {} if att else {}
        essay_scores = att.essay_scores or {} if att else {}

        # Waktu selesai
        finished_str = "-"
        if att and att.finished_at:
            from django.utils import timezone
            local_fin = timezone.localtime(att.finished_at)
            finished_str = local_fin.strftime("%d/%m/%Y %H:%M:%S")
        elif st.get("finished_at"):
            try:
                from datetime import datetime
                from django.utils import timezone
                fin_dt = datetime.fromisoformat(st["finished_at"])
                local_fin = timezone.localtime(fin_dt) if timezone.is_aware(fin_dt) else fin_dt
                finished_str = local_fin.strftime("%d/%m/%Y %H:%M:%S")
            except Exception:
                finished_str = str(st["finished_at"])

        # Waktu durasi
        duration_str = "-"
        if att and att.started_at and att.finished_at:
            mins = round((att.finished_at - att.started_at).total_seconds() / 60)
            duration_str = f"{mins} Mnt"

        status_display = "Selesai" if st.get("status") == "SUBMITTED" else ("Mengerjakan" if st.get("status") == "WORKING" else "Belum Masuk")
        score_val = st.get("total_score")
        if score_val is not None:
            scores_list.append(score_val)

        viol_display = f"{st.get('violation_count', 0)} Pelanggaran" if st.get('violation_count', 0) > 0 else "0 Bersih"
        correct_display = f"{st.get('correct_count', 0)} / {len(questions)}" if st.get("status") == "SUBMITTED" else "-"

        # Isi Fixed Columns
        fixed_values = [
            (idx, align_center, font_data),
            (st.get("nisn", "-"), align_center, font_mono),
            (st.get("student_name", "-"), align_left, font_bold),
            (st.get("classroom_name", "-"), align_center, font_data),
            (status_display, align_center, font_data),
            (finished_str, align_center, font_mono),
            (duration_str, align_center, font_data),
            (viol_display, align_center, font_data),
            (correct_display, align_center, font_bold),
            (score_val if score_val is not None else "-", align_center, font_bold),
        ]

        for col_idx, (val, align, font_style) in enumerate(fixed_values, start=1):
            cell = ws1.cell(row=current_row, column=col_idx, value=val)
            cell.alignment = align
            cell.font = font_style
            cell.border = thin_border
            if default_row_fill:
                cell.fill = default_row_fill
            if col_idx == 10 and score_val is not None:
                cell.font = font_correct if score_val >= 75 else font_bold

        # Isi Per-Question Columns
        for q_idx, q in enumerate(questions):
            col_pos = len(fixed_headers) + 1 + q_idx
            cell = ws1.cell(row=current_row, column=col_pos)
            cell.border = thin_border
            cell.alignment = align_center

            if not att or st.get("status") != "SUBMITTED":
                cell.value = "-"
                cell.font = font_data
                if default_row_fill:
                    cell.fill = default_row_fill
                continue

            # Periksa jawaban siswa terhadap kunci
            ans = answers.get(str(q.id)) or answers.get(f"q_{q.order_number}")
            status_item = "INCORRECT"
            earned_pts = 0

            # 1. Pilihan Ganda Biasa
            if q.question_type == Question.QuestionTypeChoices.MULTIPLE_CHOICE:
                correct_opt = next((o for o in q.options.all() if o.is_correct), None)
                if correct_opt and ans is not None:
                    raw_str = str(ans).strip()
                    if raw_str == str(correct_opt.id) or raw_str.upper() == correct_opt.option_label.strip().upper():
                        status_item = "CORRECT"
                        earned_pts = q.points
                        question_correct_counts[q.id] += 1

            # 2. Pilihan Ganda Kompleks
            elif q.question_type == Question.QuestionTypeChoices.MULTIPLE_CHOICE_COMPLEX:
                correct_labels = set(q.options.filter(is_correct=True).values_list('option_label', flat=True))
                student_items = set()
                if isinstance(ans, list):
                    student_items = set(str(x).strip().upper() for x in ans)
                if student_items == correct_labels:
                    status_item = "CORRECT"
                    earned_pts = q.points
                    question_correct_counts[q.id] += 1
                elif student_items.issubset(correct_labels) and len(student_items) > 0:
                    status_item = "PARTIAL"
                    earned_pts = round(q.points * (len(student_items) / len(correct_labels)), 1)
                    question_correct_counts[q.id] += 1

            # 3. Isian Singkat
            elif q.question_type == Question.QuestionTypeChoices.SHORT_ANSWER:
                extra = q.extra_data or {}
                accepted = extra.get('exact_keys') or extra.get('accepted_answers') or []
                if isinstance(accepted, str):
                    accepted = [x.strip() for x in accepted.split('/') if x.strip()]
                clean_ans = str(ans).strip().lower() if ans else ""
                if clean_ans and any(clean_ans == str(acc).strip().lower() for acc in accepted):
                    status_item = "CORRECT"
                    earned_pts = q.points
                    question_correct_counts[q.id] += 1

            # 4. Matriks Benar / Salah
            elif q.question_type == Question.QuestionTypeChoices.TRUE_FALSE_MATRIX:
                extra = q.extra_data or {}
                rows = extra.get('rows', [])
                if isinstance(ans, dict) and ans:
                    correct_sub = sum(1 for i, r in enumerate(rows) if ans.get(str(i)) == bool(r.get('correct') or r.get('is_correct')))
                    if correct_sub == len(rows):
                        status_item = "CORRECT"
                        earned_pts = q.points
                        question_correct_counts[q.id] += 1
                    elif correct_sub > 0:
                        status_item = "PARTIAL"
                        earned_pts = round(q.points * (correct_sub / len(rows)), 1)
                        question_correct_counts[q.id] += 1

            # 5. Menjodohkan
            elif q.question_type == Question.QuestionTypeChoices.MATCHING_PAIR:
                extra = q.extra_data or {}
                pairs = extra.get('pairs', [])
                if isinstance(ans, dict) and ans:
                    matched_sub = sum(1 for p in pairs if str(ans.get(p.get('left'), '')).strip().lower() == str(p.get('right', '')).strip().lower())
                    if matched_sub == len(pairs):
                        status_item = "CORRECT"
                        earned_pts = q.points
                        question_correct_counts[q.id] += 1
                    elif matched_sub > 0:
                        status_item = "PARTIAL"
                        earned_pts = round(q.points * (matched_sub / len(pairs)), 1)
                        question_correct_counts[q.id] += 1

            # 6. Esai
            elif q.question_type == Question.QuestionTypeChoices.ESSAY:
                e_info = essay_scores.get(str(q.id), {})
                if e_info and e_info.get('score') is not None:
                    status_item = "ESSAY_GRADED"
                    earned_pts = float(e_info.get('score', 0))
                    if earned_pts > 0:
                        question_correct_counts[q.id] += 1
                else:
                    status_item = "ESSAY_PENDING"

            # Tuliskan nilai ke cell
            if status_item == "CORRECT":
                cell.value = f"✓ Benar (+{earned_pts})"
                cell.font = font_correct
                cell.fill = fill_correct
            elif status_item == "PARTIAL":
                cell.value = f"⚡ Seb (+{earned_pts})"
                cell.font = font_partial
                cell.fill = fill_partial
            elif status_item == "ESSAY_GRADED":
                cell.value = f"★ Esai (+{earned_pts})"
                cell.font = font_essay
                cell.fill = fill_essay
            elif status_item == "ESSAY_PENDING":
                cell.value = "⏳ Esai (Pending)"
                cell.font = font_partial
                cell.fill = fill_partial
            else:
                cell.value = "✕ Salah (0)"
                cell.font = font_incorrect
                cell.fill = fill_incorrect

        current_row += 1

    # Baris Rata-Rata / Summary
    summary_row = current_row
    ws1.cell(row=summary_row, column=1, value="").fill = fill_summary
    ws1.cell(row=summary_row, column=2, value="").fill = fill_summary
    cell_sum_label = ws1.cell(row=summary_row, column=3, value="TINGKAT KETERCAPAIAN KELAS")
    cell_sum_label.font = font_bold
    cell_sum_label.fill = fill_summary

    for c in range(4, len(fixed_headers) + 1):
        cell_empty = ws1.cell(row=summary_row, column=c)
        cell_empty.border = thin_border
        cell_empty.fill = fill_summary
        if c == 10:
            avg_score = round(sum(scores_list) / len(scores_list), 1) if scores_list else 0.0
            cell_empty.value = f"Rata: {avg_score}"
            cell_empty.font = font_bold
            cell_empty.alignment = align_center

    # Rata-rata per nomor soal
    total_submitted = len([s for s in students_data if s.get("status") == "SUBMITTED"])
    for q_idx, q in enumerate(questions):
        col_pos = len(fixed_headers) + 1 + q_idx
        cell_q_stat = ws1.cell(row=summary_row, column=col_pos)
        cell_q_stat.border = thin_border
        cell_q_stat.fill = fill_summary
        cell_q_stat.alignment = align_center
        correct_num = question_correct_counts.get(q.id, 0)
        pct = round((correct_num / total_submitted) * 100) if total_submitted > 0 else 0
        cell_q_stat.value = f"{pct}% Benar"
        cell_q_stat.font = font_correct if pct >= 70 else (font_partial if pct >= 50 else font_incorrect)

    # Auto-adjust column widths
    for col in ws1.columns:
        max_len = 0
        col_letter = get_column_letter(col[0].column)
        for cell in col:
            # Skip title row from width calculation
            if cell.row < start_row:
                continue
            val_str = str(cell.value or '')
            lines = val_str.split('\n')
            for l in lines:
                if len(l) > max_len:
                    max_len = len(l)
        ws1.column_dimensions[col_letter].width = max(max_len + 3, 11)

    # =============================================================
    # SHEET 2: KUNCI JAWABAN & DAFTAR BUTIR SOAL
    # =============================================================
    ws2 = wb.create_sheet(title="Kunci Jawaban & Butir Soal")
    ws2.views.sheetView[0].showGridLines = True

    ws2["A1"] = "LEMBAR KUNCI JAWABAN RESMI & DISTRIBUSI BUTIR SOAL"
    ws2["A1"].font = font_title
    ws2["A2"] = f"Paket: {pkg_title} — Mata Pelajaran: {subj_name}"
    ws2["A2"].font = font_subtitle

    headers2 = ["No", "Tipe Soal", "Bobot Poin", "Teks Butir Soal", "Kunci Jawaban Sistem", "Jml Siswa Benar", "Tingkat Keberhasilan"]
    start_row_2 = 5

    for c_idx, h in enumerate(headers2, start=1):
        cell = ws2.cell(row=start_row_2, column=c_idx, value=h)
        cell.font = font_header
        cell.fill = fill_header_main
        cell.alignment = align_center
        cell.border = thin_border

    cur_r2 = start_row_2 + 1
    type_name_map = {
        "MULTIPLE_CHOICE": "Pilihan Ganda",
        "MULTIPLE_CHOICE_COMPLEX": "Pilgan Kompleks",
        "SHORT_ANSWER": "Isian Singkat",
        "TRUE_FALSE_MATRIX": "Tabel Benar/Salah",
        "MATCHING_PAIR": "Menjodohkan",
        "ESSAY": "Uraian / Esai"
    }

    for q in questions:
        # Kunci Jawaban display
        key_display = "-"
        if q.question_type == Question.QuestionTypeChoices.MULTIPLE_CHOICE:
            opt = next((o for o in q.options.all() if o.is_correct), None)
            key_display = f"Opsi {opt.option_label}. {opt.option_text}" if opt else "-"
        elif q.question_type == Question.QuestionTypeChoices.MULTIPLE_CHOICE_COMPLEX:
            opts = [f"Opsi {o.option_label}" for o in q.options.filter(is_correct=True)]
            key_display = ", ".join(opts) if opts else "-"
        elif q.question_type == Question.QuestionTypeChoices.SHORT_ANSWER:
            extra = q.extra_data or {}
            acc = extra.get('exact_keys') or extra.get('accepted_answers') or []
            key_display = " / ".join(acc) if isinstance(acc, list) else str(acc)
        elif q.question_type == Question.QuestionTypeChoices.TRUE_FALSE_MATRIX:
            extra = q.extra_data or {}
            key_display = "; ".join([f"Brs {i+1}: {'Benar' if (r.get('correct') or r.get('is_correct')) else 'Salah'}" for i, r in enumerate(extra.get('rows', []))])
        elif q.question_type == Question.QuestionTypeChoices.MATCHING_PAIR:
            extra = q.extra_data or {}
            key_display = "; ".join([f"{p.get('left')} ➔ {p.get('right')}" for p in extra.get('pairs', [])])
        elif q.question_type == Question.QuestionTypeChoices.ESSAY:
            key_display = "(Rubrik Koreksi Manual Guru)"

        correct_count = question_correct_counts.get(q.id, 0)
        success_pct = f"{round((correct_count / total_submitted) * 100)}%" if total_submitted > 0 else "-"

        row_vals = [
            (q.order_number, align_center),
            (type_name_map.get(q.question_type, q.question_type), align_center),
            (f"{q.points} Poin", align_center),
            (q.question_text, align_left),
            (key_display, align_left),
            (f"{correct_count} Siswa", align_center),
            (success_pct, align_center),
        ]

        for c_idx, (val, align) in enumerate(row_vals, start=1):
            cell = ws2.cell(row=cur_r2, column=c_idx, value=val)
            cell.alignment = align
            cell.border = thin_border
            cell.font = font_data

        cur_r2 += 1

    for col in ws2.columns:
        max_len = 0
        col_letter = get_column_letter(col[0].column)
        for cell in col:
            if cell.row < start_row_2:
                continue
            val_str = str(cell.value or '')
            if len(val_str) > max_len:
                max_len = len(val_str)
        ws2.column_dimensions[col_letter].width = min(max(max_len + 3, 12), 60)

    # Save to buffer
    stream = io.BytesIO()
    wb.save(stream)
    return stream.getvalue()
