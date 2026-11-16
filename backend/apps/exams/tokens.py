"""
Dynamic 10-Minute Token & PIN Rotation System for E-Ujian Pro
Algoritma deterministik berbasis Time-Window (TOTP-style 600 detik / 10 menit)
Menghasilkan Token Masuk ('MSK-XXXX') dan PIN Pengawas ('PIN-YYYY') yang sinkron
antara Server Backend (Django) dan Client Frontend (React/Vite).
"""
import time

ROTATION_INTERVAL_SECONDS = 600  # 10 menit


def get_current_slot(timestamp=None) -> int:
    """Mengembalikan indeks slot interval 10 menit saat ini."""
    if timestamp is None:
        timestamp = time.time()
    return int(timestamp // ROTATION_INTERVAL_SECONDS)


def get_seconds_until_next_rotation(timestamp=None) -> int:
    """Mengembalikan sisa detik hingga rotasi token berikutnya."""
    if timestamp is None:
        timestamp = time.time()
    elapsed = int(timestamp) % ROTATION_INTERVAL_SECONDS
    return ROTATION_INTERVAL_SECONDS - elapsed


def _hash_seed(seed_str: str) -> int:
    """
    32-bit FNV-1a Hash + MurmurHash3 / SplitMix32 finalizer
    Memberikan efek avalanche yang seragam dan identik 100% dengan implementasi JavaScript di frontend.
    """
    h = 2166136261
    for b in seed_str.encode('utf-8'):
        h ^= b
        h = (h * 16777619) & 0xFFFFFFFF

    # 32-bit Murmur3 / SplitMix32 finalizer
    h ^= (h >> 16)
    h = (h * 0x85ebca6b) & 0xFFFFFFFF
    h ^= (h >> 13)
    h = (h * 0xc2b2ae35) & 0xFFFFFFFF
    h ^= (h >> 16)
    return h & 0xFFFFFFFF


def generate_dynamic_token(session_id, slot: int, token_type: str = 'ENTRY') -> str:
    """
    Menghasilkan token dinamis deterministik untuk sesi ujian pada slot waktu tertentu.
    - 'ENTRY': Menghasilkan 'MSK-XXXX' (4 karakter alfabet/angka non-ambigu)
    - 'PIN': Menghasilkan 'PIN-YYYY' (4 digit angka numerik)
    """
    clean_session_id = str(session_id).strip() if session_id else 'default-session'
    seed_str = f"{clean_session_id}:{token_type}:{slot}"
    h = _hash_seed(seed_str)

    if token_type == 'PIN':
        pin_num = h % 10000
        return f"PIN-{pin_num:04d}"
    else:
        # 32 karakter (2^5 = 32) bebas karakter ambigu (tanpa 0/O, 1/I)
        alphabet = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ'
        c0 = alphabet[(h >> 0) & 0x1F]
        c1 = alphabet[(h >> 5) & 0x1F]
        c2 = alphabet[(h >> 10) & 0x1F]
        c3 = alphabet[(h >> 15) & 0x1F]
        return f"MSK-{c0}{c1}{c2}{c3}"


def get_session_tokens(session_id, timestamp=None) -> dict:
    """
    Mengambil data lengkap token aktif 10 menit untuk sebuah sesi ujian.
    """
    slot = get_current_slot(timestamp)
    expires_in = get_seconds_until_next_rotation(timestamp)

    entry_token = generate_dynamic_token(session_id, slot, 'ENTRY')
    pin_token = generate_dynamic_token(session_id, slot, 'PIN')
    next_entry_token = generate_dynamic_token(session_id, slot + 1, 'ENTRY')
    next_pin_token = generate_dynamic_token(session_id, slot + 1, 'PIN')

    return {
        'slot': slot,
        'entry_token': entry_token,
        'pin_token': pin_token,
        'next_entry_token': next_entry_token,
        'next_pin_token': next_pin_token,
        'expires_in_seconds': expires_in,
        'rotation_interval': ROTATION_INTERVAL_SECONDS,
    }


def is_valid_entry_token(session_id, input_token: str, base_token: str = None, timestamp=None) -> bool:
    """
    Memvalidasi Token Masuk yang dimasukkan siswa:
    1. Mencocokkan dengan token slot 10 menit saat ini.
    2. Mencocokkan dengan token slot 10 menit sebelumnya (Grace Period jika siswa baru menerima token tepat saat pergantian slot).
    3. Mencocokkan dengan base_token statis di database (opsional/cadangan pengawas).
    4. Mendukung input dengan prefix 'MSK-' maupun tanpa prefix.
    """
    if not input_token:
        return False

    clean_input = str(input_token).strip().upper().replace(' ', '')
    clean_input_noprefix = clean_input.replace('MSK-', '').replace('MSK', '').replace('-', '')

    current_slot = get_current_slot(timestamp)
    # Cek slot aktif saat ini, 1 slot sebelumnya (grace turnover), dan 1 slot berikutnya (clock drift)
    valid_slots = [current_slot, current_slot - 1, current_slot + 1]

    for s in valid_slots:
        token = generate_dynamic_token(session_id, s, 'ENTRY')
        token_noprefix = token.replace('MSK-', '').replace('MSK', '').replace('-', '')
        if clean_input == token or clean_input_noprefix == token_noprefix:
            return True

    # Cek base_token jika tersedia
    if base_token:
        base_clean = str(base_token).strip().upper().replace(' ', '')
        base_clean_noprefix = base_clean.replace('MSK-', '').replace('MSK', '').replace('-', '')
        if clean_input == base_clean or clean_input_noprefix == base_clean_noprefix:
            return True

    # Universal bypass untuk demo & pengujian
    if clean_input in ['MASUK123', '12345', 'DEMO123']:
        return True

    return False


def is_valid_supervisor_pin(session_id, input_pin: str, base_pin: str = None, timestamp=None) -> bool:
    """
    Memvalidasi PIN Pengawas yang dimasukkan untuk membuka kunci layar siswa:
    1. Mencocokkan dengan PIN slot 10 menit saat ini, sebelumnya, dan berikutnya.
    2. Mencocokkan dengan base_pin pengawas di database.
    3. Mencocokkan dengan master PIN universal pengawas sekolah.
    """
    if not input_pin:
        return False

    clean_input = str(input_pin).strip().upper().replace(' ', '')
    clean_input_noprefix = clean_input.replace('PIN-', '').replace('PIN', '').replace('-', '')

    current_slot = get_current_slot(timestamp)
    valid_slots = [current_slot, current_slot - 1, current_slot + 1]

    for s in valid_slots:
        pin = generate_dynamic_token(session_id, s, 'PIN')
        pin_noprefix = pin.replace('PIN-', '').replace('PIN', '').replace('-', '')
        if clean_input == pin or clean_input_noprefix == pin_noprefix:
            return True

    if base_pin:
        base_clean = str(base_pin).strip().upper().replace(' ', '')
        base_clean_noprefix = base_clean.replace('PIN-', '').replace('PIN', '').replace('-', '')
        if clean_input == base_clean or clean_input_noprefix == base_clean_noprefix:
            return True

    # Master PIN darurat universal pengawas
    if clean_input in ['GURU123', 'MASUK123', '12345', 'PIN-1234', '1234']:
        return True

    return False
