import os
import re
import uuid
import zipfile
import posixpath
import xml.etree.ElementTree as ET
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
                'image_url': None,
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


def extract_images_from_excel_workbook(excel_file):
    """
    Ekstrak seluruh gambar yang tertanam pada sel Excel (.xlsx) 
    baik dari pertanyaan (kolom 3) maupun opsi jawaban (kolom 4 s/d 8).
    Mengembalikan mapping: {(row, col): '/media/exam_images/img_name.ext'} (row dan col 1-indexed).
    Menggunakan ZipFile XML Drawing Parsing sebagai metode primer (akurat & lossless tanpa dependensi Pillow)
    dan openpyxl _images sebagai fallback.
    """
    images_map = {}
    media_dir = os.path.join(settings.MEDIA_ROOT, 'exam_images')
    os.makedirs(media_dir, exist_ok=True)

    # 1. METODE PRIMER: ZipFile Drawing XML Parsing
    try:
        if hasattr(excel_file, 'seek'):
            excel_file.seek(0)

        with zipfile.ZipFile(excel_file) as zf:
            namelist = zf.namelist()

            # Cari semua file drawing XML di dalam berkas Excel
            drawing_files = [f for f in namelist if f.startswith('xl/drawings/drawing') and f.endswith('.xml')]

            for draw_path in drawing_files:
                draw_dir, draw_fname = posixpath.split(draw_path)
                rels_path = posixpath.join(draw_dir, '_rels', f"{draw_fname}.rels")

                rel_id_to_target = {}
                if rels_path in namelist:
                    try:
                        rels_tree = ET.fromstring(zf.read(rels_path))
                        for r_node in rels_tree:
                            r_id = r_node.attrib.get('Id')
                            target = r_node.attrib.get('Target')
                            if r_id and target:
                                full_target = posixpath.normpath(posixpath.join(draw_dir, target))
                                rel_id_to_target[r_id] = full_target
                    except Exception:
                        pass

                try:
                    draw_tree = ET.fromstring(zf.read(draw_path))
                    for anchor in draw_tree:
                        anchor_tag = anchor.tag.split('}')[-1]
                        if anchor_tag not in ['twoCellAnchor', 'oneCellAnchor']:
                            continue

                        from_node = None
                        for child in anchor:
                            if child.tag.split('}')[-1] == 'from':
                                from_node = child
                                break

                        if from_node is None:
                            continue

                        col_val = None
                        row_val = None
                        for sub in from_node:
                            sub_tag = sub.tag.split('}')[-1]
                            if sub_tag == 'col' and sub.text is not None:
                                try:
                                    col_val = int(sub.text) + 1  # 0-indexed ke 1-indexed
                                except ValueError:
                                    pass
                            elif sub_tag == 'row' and sub.text is not None:
                                try:
                                    row_val = int(sub.text) + 1  # 0-indexed ke 1-indexed
                                except ValueError:
                                    pass

                        if col_val is None or row_val is None:
                            continue

                        # Cari tag blip untuk mengambil relasi ID gambar
                        r_id = None
                        for elem in anchor.iter():
                            if elem.tag.split('}')[-1] == 'blip':
                                for k, v in elem.attrib.items():
                                    if k == 'embed' or k.endswith('}embed') or k.endswith(':embed'):
                                        r_id = v
                                        break
                                if r_id:
                                    break

                        if r_id and r_id in rel_id_to_target:
                            media_zip_path = rel_id_to_target[r_id]
                            if media_zip_path in namelist:
                                ext = posixpath.splitext(media_zip_path)[1].lower() or '.png'
                                if ext not in ['.jpg', '.jpeg', '.png', '.gif', '.webp']:
                                    ext = '.png'
                                unique_fname = f"excel_img_{uuid.uuid4().hex[:12]}{ext}"
                                disk_path = os.path.join(media_dir, unique_fname)
                                with open(disk_path, 'wb') as f_out:
                                    f_out.write(zf.read(media_zip_path))

                                stream_url = f"/api/exams/image-stream/?file={unique_fname}"
                                if (row_val, col_val) not in images_map:
                                    images_map[(row_val, col_val)] = stream_url
                except Exception:
                    pass
    except Exception:
        pass

    # 2. METODE SEKUNDER (Fallback jika ZipFile tidak menemukan gambar)
    if not images_map:
        try:
            if hasattr(excel_file, 'seek'):
                excel_file.seek(0)
            wb_temp = openpyxl.load_workbook(excel_file, data_only=True)
            ws_temp = wb_temp.active
            for img in getattr(ws_temp, '_images', []):
                anchor = getattr(img, 'anchor', None)
                if anchor is None:
                    continue
                r_val = None
                c_val = None
                if hasattr(anchor, '_from'):
                    r_val = anchor._from.row + 1
                    c_val = anchor._from.col + 1
                elif hasattr(anchor, 'from'):
                    r_val = getattr(anchor, 'from').row + 1
                    c_val = getattr(anchor, 'from').col + 1
                elif isinstance(anchor, str):
                    from openpyxl.utils import coordinate_to_tuple
                    r_val, c_val = coordinate_to_tuple(anchor)

                if r_val and c_val:
                    img_bytes = None
                    if hasattr(img, '_data') and callable(img._data):
                        img_bytes = img._data()
                    elif hasattr(img, 'image'):
                        import io
                        buf = io.BytesIO()
                        img_format = getattr(img, 'format', None) or 'PNG'
                        if img_format.upper() == 'JPG':
                            img_format = 'JPEG'
                        img.image.save(buf, format=img_format)
                        img_bytes = buf.getvalue()

                    if img_bytes:
                        ext = (getattr(img, 'format', '') or 'png').lower()
                        if ext == 'jpeg':
                            ext = 'jpg'
                        ext = f".{ext}"
                        unique_fname = f"excel_img_{uuid.uuid4().hex[:12]}{ext}"
                        disk_path = os.path.join(media_dir, unique_fname)
                        with open(disk_path, 'wb') as f_out:
                            f_out.write(img_bytes)
                        stream_url = f"/api/exams/image-stream/?file={unique_fname}"
                        if (r_val, c_val) not in images_map:
                            images_map[(r_val, c_val)] = stream_url
        except Exception:
            pass

    if hasattr(excel_file, 'seek'):
        excel_file.seek(0)

    return images_map


def parse_excel_questions(excel_file):
    """
    Parser Berkas Microsoft Excel (.xlsx) untuk Bank Soal E-Ujian.
    Mendukung ekstraksi otomatis gambar lampiran pada soal dan opsi jawaban (A s/d E).
    """
    # Ekstrak seluruh gambar pada lembar Excel ke media storage
    images_map = extract_images_from_excel_workbook(excel_file)

    if hasattr(excel_file, 'seek'):
        excel_file.seek(0)

    wb = openpyxl.load_workbook(excel_file, data_only=True)
    sheet = wb.active

    questions = []
    # Header diharapkan baris 1
    # Kolom: 1: No, 2: Tipe, 3: Pertanyaan, 4: Opsi A, 5: Opsi B, 6: Opsi C, 7: Opsi D, 8: Opsi E, 9: Kunci, 10: Poin
    for row_idx in range(2, sheet.max_row + 1):
        no_val = sheet.cell(row=row_idx, column=1).value
        raw_q_text = sheet.cell(row=row_idx, column=3).value

        # Deteksi lampiran gambar pada sel pertanyaan (Kolom 3 / Kolom C)
        # Ambil secara eksklusif dari baris yang sama (row_idx) menggunakan .pop()
        # agar gambar tidak pernah terduplikasi atau terserap ke butir soal lain!
        q_img_url = (
            images_map.pop((row_idx, 3), None) 
            or images_map.pop((row_idx, 2), None) 
            or images_map.pop((row_idx, 1), None)
        )

        # Bersihkan enter dan spasi kosong di awal kalimat akibat peletakan gambar di atas teks
        clean_q_text = ""
        if raw_q_text is not None:
            clean_q_text = re.sub(r'^\s*\n+', '', str(raw_q_text)).strip()

        # Lewati baris jika tidak ada teks dan tidak ada gambar di kolom pertanyaan
        if not clean_q_text and not q_img_url:
            continue

        # Jika guru hanya melampirkan gambar tanpa teks, gunakan teks penjelas standar
        if not clean_q_text and q_img_url:
            clean_q_text = "[Perhatikan Gambar Berikut]"

        raw_type = str(sheet.cell(row=row_idx, column=2).value or 'PILIHAN GANDA').strip().upper()
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
        for col_offset, label in enumerate(labels):
            col_idx = 4 + col_offset
            val = sheet.cell(row=row_idx, column=col_idx).value
            opt_text = str(val).strip() if val is not None else ""
            # Ambil lampiran gambar khusus kolom opsi ini pada baris yang sama via .pop()
            opt_img_url = images_map.pop((row_idx, col_idx), None)

            # Jika ada teks ATAU ada gambar pada kolom opsi ini
            if opt_text or opt_img_url:
                if opt_img_url:
                    # Format standard yang didukung serializer: [IMAGE:<url>] <text>
                    if opt_text:
                        final_opt_text = f"[IMAGE:{opt_img_url}] {opt_text}"
                    else:
                        final_opt_text = f"[IMAGE:{opt_img_url}]"
                else:
                    final_opt_text = opt_text

                options.append({
                    'option_label': label,
                    'option_text': final_opt_text,
                    'is_correct': label in keys
                })

        extra_data = {}
        if q_type == 'SHORT_ANSWER':
            extra_data['exact_keys'] = [k.strip() for k in key_val.split('/') if k.strip()]

        questions.append({
            'order_number': int(no_val) if no_val and str(no_val).isdigit() else len(questions) + 1,
            'question_text': clean_q_text,
            'image_url': q_img_url,
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

