import urllib.parse
from decimal import Decimal
from apps.exams.models import Question, QuestionOption

def sanitize_and_format_embed_url(raw_url: str) -> str:
    """
    Mengubah URL Google Form / Microsoft Teams menjadi format embed iframe yang aman
    """
    if not raw_url or not isinstance(raw_url, str):
        return ""

    trimmed = raw_url.strip()
    if not trimmed.startswith(('http://', 'https://')):
        trimmed = 'https://' + trimmed

    try:
        parsed = urllib.parse.urlparse(trimmed)
        hostname = parsed.netloc.lower()
        path = parsed.path
        query_dict = urllib.parse.parse_qs(parsed.query)

        # 1. Google Forms
        if 'docs.google.com' in hostname and '/forms/' in path:
            if path.endswith('/edit'):
                path = path[:-5] + '/viewform'
            elif not path.endswith('/viewform'):
                path = path.rstrip('/') + '/viewform'

            query_dict['embedded'] = ['true']
            # Flat query params
            new_query = urllib.parse.urlencode({k: v[0] for k, v in query_dict.items()})
            return urllib.parse.urlunparse((parsed.scheme, parsed.netloc, path, parsed.params, new_query, parsed.fragment))

        # 2. Microsoft Forms
        if 'forms.office.com' in hostname or 'forms.cloud.microsoft' in hostname:
            query_dict['embed'] = ['true']
            new_query = urllib.parse.urlencode({k: v[0] for k, v in query_dict.items()})
            return urllib.parse.urlunparse((parsed.scheme, parsed.netloc, path, parsed.params, new_query, parsed.fragment))

        return trimmed
    except Exception as e:
        return trimmed


def calculate_auto_grading_score(attempt, answers_dict: dict) -> Decimal:
    """
    Menghitung skor otomatis untuk seluruh ragam butir soal pada paket soal mandiri:
    1. Pilihan Ganda Biasa (MULTIPLE_CHOICE)
    2. Pilihan Ganda Kompleks (MULTIPLE_CHOICE_COMPLEX)
    3. Isian Singkat / Exact Match (SHORT_ANSWER)
    4. Matriks Benar / Salah (TRUE_FALSE_MATRIX)
    5. Menjodohkan (MATCHING_PAIR)
    """
    package = attempt.session.package
    if package.exam_type != 'NATIVE_QUESTIONS':
        return None

    total_score = Decimal('0.00')
    questions = Question.objects.filter(package=package).prefetch_related('options')

    for q in questions:
        student_ans = answers_dict.get(str(q.id)) or answers_dict.get(f"q_{q.order_number}")
        if student_ans is None:
            continue

        q_points = Decimal(str(q.points or 10))

        # 1. Pilihan Ganda Biasa (Single Option)
        if q.question_type == Question.QuestionTypeChoices.MULTIPLE_CHOICE:
            correct_option = q.options.filter(is_correct=True).first()
            if correct_option:
                raw_ans_str = str(student_ans).strip()
                if raw_ans_str == str(correct_option.id) or raw_ans_str.upper() == correct_option.option_label.strip().upper():
                    total_score += q_points

        # 2. Pilihan Ganda Kompleks (Multi-Select Checkbox)
        elif q.question_type == Question.QuestionTypeChoices.MULTIPLE_CHOICE_COMPLEX:
            correct_labels = set(q.options.filter(is_correct=True).values_list('option_label', flat=True))
            correct_ids = {str(x) for x in q.options.filter(is_correct=True).values_list('id', flat=True)}
            
            student_items = set()
            if isinstance(student_ans, list):
                student_items = {str(x).strip() for x in student_ans if x}
            elif isinstance(student_ans, str):
                student_items = {str(x).strip() for x in student_ans.replace(';', ',').split(',') if x.strip()}

            student_labels = {x.upper() for x in student_items}
            
            is_all_correct = (correct_labels and student_labels == correct_labels) or (correct_ids and student_items == correct_ids)
            if is_all_correct:
                total_score += q_points
            elif correct_labels and (student_labels.issubset(correct_labels) or student_items.issubset(correct_ids)) and len(student_items) > 0:
                ratio = Decimal(str(len(student_items))) / Decimal(str(len(correct_labels)))
                total_score += (q_points * ratio).quantize(Decimal('0.01'))

        # 3. Isian Singkat (Short Answer / Exact Match)
        elif q.question_type == Question.QuestionTypeChoices.SHORT_ANSWER:
            extra = q.extra_data or {}
            accepted = extra.get('exact_keys') or extra.get('accepted_answers') or extra.get('keys') or []
            if isinstance(accepted, str):
                accepted = [x.strip() for x in accepted.split('/') if x.strip()]

            clean_student_ans = str(student_ans).strip().lower()
            if any(clean_student_ans == str(acc).strip().lower() for acc in accepted):
                total_score += q_points

        # 4. Matriks Benar / Salah (TRUE_FALSE_MATRIX)
        elif q.question_type == Question.QuestionTypeChoices.TRUE_FALSE_MATRIX:
            extra = q.extra_data or {}
            rows = extra.get('rows', [])
            if rows and isinstance(student_ans, dict):
                correct_count = 0
                for idx, row in enumerate(rows):
                    expected = bool(row.get('correct') or row.get('is_correct'))
                    ans_val = student_ans.get(str(idx)) or student_ans.get(idx)
                    if ans_val is not None and bool(ans_val) == expected:
                        correct_count += 1
                if correct_count > 0:
                    ratio = Decimal(str(correct_count)) / Decimal(str(len(rows)))
                    total_score += (q_points * ratio).quantize(Decimal('0.01'))

        # 5. Menjodohkan (MATCHING_PAIR)
        elif q.question_type == Question.QuestionTypeChoices.MATCHING_PAIR:
            extra = q.extra_data or {}
            pairs = extra.get('pairs', [])
            if pairs and isinstance(student_ans, dict):
                correct_count = 0
                for p in pairs:
                    left_key = str(p.get('left', '')).strip()
                    right_val = str(p.get('right', '')).strip()
                    student_matched = str(student_ans.get(left_key, '')).strip()
                    if student_matched and student_matched.lower() == right_val.lower():
                        correct_count += 1
                if correct_count > 0:
                    ratio = Decimal(str(correct_count)) / Decimal(str(len(pairs)))
                    total_score += (q_points * ratio).quantize(Decimal('0.01'))

    # Simpan skor dan jawaban ke database
    attempt.total_score = total_score
    attempt.answers_json = answers_dict
    attempt.save(update_fields=['total_score', 'answers_json'])

    return total_score

