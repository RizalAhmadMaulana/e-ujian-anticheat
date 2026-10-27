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
    Menghitung skor otomatis untuk butir soal Pilihan Ganda pada paket soal mandiri
    """
    package = attempt.session.package
    if package.exam_type != 'NATIVE_QUESTIONS':
        return None

    total_score = Decimal('0.00')
    questions = Question.objects.filter(package=package, question_type=Question.QuestionTypeChoices.MULTIPLE_CHOICE).prefetch_related('options')

    for q in questions:
        # Kunci jawaban benar
        correct_option = q.options.filter(is_correct=True).first()
        if not correct_option:
            continue

        # Jawaban siswa untuk soal ini
        student_ans = answers_dict.get(str(q.id)) or answers_dict.get(f"q_{q.order_number}")
        if student_ans and str(student_ans).strip().upper() == correct_option.option_label.strip().upper():
            total_score += Decimal(str(q.points))

    # Simpan skor dan jawaban ke database
    attempt.total_score = total_score
    attempt.answers_json = answers_dict
    attempt.save(update_fields=['total_score', 'answers_json'])

    return total_score

