import os
import re
import uuid
import openpyxl
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
from openpyxl.utils import get_column_letter
from django.conf import settings
from docx import Document

def get_media_dir():
    media_dir = os.path.join(settings.BASE_DIR, 'media', 'questions')
    os.makedirs(media_dir, exist_ok=True)
    return media_dir

def parse_docx_questions(docx_file):
    """
    Parser Dokumen Microsoft Word (.docx) untuk Bank Soal E-Ujian.
    Mendukung Pilihan Ganda biasa, Pilihan Ganda Kompleks, Esai, dan Isian Singkat.
    """
    doc = Document(docx_file)
    questions = []
    current_q = None

    q_number_regex = re.compile(r'^(?:soal\s*)?(\d+)[\.\)]\s*(.*)', re.IGNORECASE)
    option_regex = re.compile(r'^([A-Ea-e])[\.\)]\s*(.*)')
    key_regex = re.compile(r'^(?:kunci|kunci jawaban|jawaban)\s*:\s*(.*)', re.IGNORECASE)
    points_regex = re.compile(r'^(?:poin|bobot)\s*:\s*(\d+)', re.IGNORECASE)

    for p in doc.paragraphs:
        text = p.text.strip()
        if not text:
            continue

        # 1. Cek apakah ini awal nomor soal baru
        q_match = q_number_regex.match(text)
        if q_match:
            if current_q:
                questions.append(current_q)

            order_num = int(q_match.group(1))
            raw_text = q_match.group(2).strip()

            q_type = 'MULTIPLE_CHOICE'
            if '[kompleks]' in raw_text.lower() or '[pilihan ganda kompleks]' in raw_text.lower():
                q_type = 'MULTIPLE_CHOICE_COMPLEX'
                raw_text = re.sub(r'\[.*?\]', '', raw_text).strip()
            elif '[isian singkat]' in raw_text.lower():
                q_type = 'SHORT_ANSWER'
                raw_text = re.sub(r'\[.*?\]', '', raw_text).strip()
            elif '[esai]' in raw_text.lower():
                q_type = 'ESSAY'
                raw_text = re.sub(r'\[.*?\]', '', raw_text).strip()

            current_q = {
                'order_number': order_num,
                'question_text': raw_text,
                'question_type': q_type,
                'points': 10,
                'options': [],
                'keys': [],
                'extra_data': {}
            }
            continue

        if not current_q:
            continue

        # 2. Cek apakah ini Kunci Jawaban
        k_match = key_regex.match(text)
        if k_match:
            raw_keys = k_match.group(1).strip()
            if current_q['question_type'] == 'SHORT_ANSWER':
                current_q['extra_data']['exact_keys'] = [k.strip() for k in raw_keys.split('/') if k.strip()]
            else:
                current_q['keys'] = [k.strip().upper() for k in re.split(r'[,;\s]+', raw_keys) if k.strip()]
            continue

        # 3. Cek apakah ini Bobot Poin
        pt_match = points_regex.match(text)
        if pt_match:
            current_q['points'] = int(pt_match.group(1))
            continue

        # 4. Cek apakah ini Opsi Jawaban (A, B, C, D, E)
        opt_match = option_regex.match(text)
        if opt_match and current_q['question_type'] in ['MULTIPLE_CHOICE', 'MULTIPLE_CHOICE_COMPLEX']:
            label = opt_match.group(1).upper()
            opt_text = opt_match.group(2).strip()
            current_q['options'].append({
                'option_label': label,
                'option_text': opt_text,
                'is_correct': False
            })
            continue

        # 5. Jika teks sambungan pertanyaan
        if not current_q['options']:
            current_q['question_text'] += "\n" + text

    if current_q:
        questions.append(current_q)

    # Finalisasi flag is_correct pada options
    for q in questions:
        if q['keys']:
            for opt in q['options']:
                if opt['option_label'] in q['keys']:
                    opt['is_correct'] = True

    return questions


def parse_excel_questions(excel_file):
    """
    Parser Berkas Microsoft Excel (.xlsx) untuk Bank Soal E-Ujian.
    """
    wb = openpyxl.load_workbook(excel_file, data_only=True)
    sheet = wb.active

    questions = []
    # Header diharapkan baris 1
    # Kolom: 1: No, 2: Tipe, 3: Pertanyaan, 4: Opsi A, 5: Opsi B, 6: Opsi C, 7: Opsi D, 8: Opsi E, 9: Kunci, 10: Poin
    for row_idx in range(2, sheet.max_row + 1):
        no_val = sheet.cell(row=row_idx, column=1).value
        q_text = sheet.cell(row=row_idx, column=3).value
        if not q_text or not str(q_text).strip():
            continue

        raw_type = str(sheet.cell(row=row_idx, column=2).value or 'MULTIPLE_CHOICE').strip().upper()
        q_type = 'MULTIPLE_CHOICE'
        if 'KOMPLEKS' in raw_type:
            q_type = 'MULTIPLE_CHOICE_COMPLEX'
        elif 'ESAI' in raw_type or 'ESSAY' in raw_type:
            q_type = 'ESSAY'
        elif 'ISIAN' in raw_type or 'SHORT' in raw_type:
            q_type = 'SHORT_ANSWER'
        elif 'BENAR' in raw_type or 'SALAH' in raw_type:
            q_type = 'TRUE_FALSE_MATRIX'
        elif 'JODOH' in raw_type or 'MATCH' in raw_type:
            q_type = 'MATCHING_PAIR'

        poin_val = sheet.cell(row=row_idx, column=10).value
        try:
            points = int(poin_val) if poin_val else 10
        except:
            points = 10

        key_val = str(sheet.cell(row=row_idx, column=9).value or '').strip()
        keys = [k.strip().upper() for k in re.split(r'[,;\s]+', key_val) if k.strip()]

        options = []
        labels = ['A', 'B', 'C', 'D', 'E']
        for col_idx, label in enumerate(labels, start=4):
            val = sheet.cell(row=row_idx, column=col_idx).value
            if val and str(val).strip():
                options.append({
                    'option_label': label,
                    'option_text': str(val).strip(),
                    'is_correct': label in keys
                })

        extra_data = {}
        if q_type == 'SHORT_ANSWER':
            extra_data['exact_keys'] = [k.strip() for k in key_val.split('/') if k.strip()]

        questions.append({
            'order_number': int(no_val) if no_val and str(no_val).isdigit() else len(questions) + 1,
            'question_text': str(q_text).strip(),
            'question_type': q_type,
            'points': points,
            'options': options,
            'keys': keys,
            'extra_data': extra_data
        })

    return questions


def generate_question_excel_template():
    """
    Menghasilkan file Excel Template Import Soal E-Ujian.
    """
    wb = openpyxl.Workbook()
    ws = wb.active
    ws.title = "Template Soal E-Ujian"

    headers = [
        "No", 
        "Tipe Soal (PILIHAN GANDA / KOMPLEKS / ESAI / ISIAN)", 
        "Teks Pertanyaan (Mendukung $Rumus$)", 
        "Opsi A", 
        "Opsi B", 
        "Opsi C", 
        "Opsi D", 
        "Opsi E", 
        "Kunci Jawaban (Contoh: A atau A,C)", 
        "Bobot Poin"
    ]
    ws.append(headers)

    # Style Header
    header_fill = PatternFill(start_color="1E3A8A", end_color="1E3A8A", fill_type="solid")
    header_font = Font(name="Calibri", size=11, bold=True, color="FFFFFF")
    thin_border = Border(
        left=Side(style='thin', color='CBD5E1'),
        right=Side(style='thin', color='CBD5E1'),
        top=Side(style='thin', color='CBD5E1'),
        bottom=Side(style='thin', color='CBD5E1')
    )

    for col in range(1, len(headers) + 1):
        cell = ws.cell(row=1, column=col)
        cell.fill = header_fill
        cell.font = header_font
        cell.alignment = Alignment(horizontal="center", vertical="center")
        cell.border = thin_border

    # Sample Data
    samples = [
        (1, "PILIHAN GANDA", "Berapakah hasil dari $2^{3} + \\sqrt{16}$?", "8", "10", "12", "14", "16", "C", 10),
        (2, "KOMPLEKS", "Pilihlah zat yang tergolong unsur kimia! (Bisa lebih dari 1)", "Oksigen ($O_{2}$)", "Air ($H_{2}O$)", "Besi ($Fe$)", "Garam ($NaCl$)", "Emas ($Au$)", "A, C, E", 15),
        (3, "ISIAN", "Ibukota negara Indonesia saat ini adalah...", "", "", "", "", "", "Jakarta / Nusantara", 10),
        (4, "ESAI", "Jelaskan hukum kekekalan energi beserta contoh penerapannya dalam kehidupan sehari-hari!", "", "", "", "", "", "", 20)
    ]
    for s in samples:
        ws.append(s)

    for r in range(2, len(samples) + 2):
        for c in range(1, len(headers) + 1):
            cell = ws.cell(row=r, column=c)
            cell.border = thin_border
            if c in [1, 9, 10]:
                cell.alignment = Alignment(horizontal="center")

    # Column dimensions
    col_widths = [8, 28, 45, 20, 20, 20, 20, 20, 25, 14]
    for i, w in enumerate(col_widths, start=1):
        ws.column_dimensions[get_column_letter(i)].width = w

    return wb

