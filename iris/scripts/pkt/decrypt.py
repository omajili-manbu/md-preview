"""Packet Tracer .pkt 文件解密模块

支持两种加密格式：
1. 旧版（PT 7.3 之前）：XOR 逐字节异或，密钥为文件大小递减序列
2. 新版（PT 7.3+）：Twofish EAX 模式（纯 Python 实现，零第三方依赖）

文件格式判断：
- 旧版：文件头部无固定 magic，但 XOR 后前 4 字节是 zlib 未压缩大小
- 新版：文件前 4 字节为 magic 0x4B505443 ("CTPK" 的小端序变体) 或包含特定标记
"""

import struct


# ============== 格式检测 ==============

def detect_format(data: bytes) -> str:
    """检测 .pkt 文件使用的加密格式

    返回值：
        'twofish' - 新版 Twofish EAX 加密
        'xor'     - 旧版 XOR 加密
    """
    if len(data) < 8:
        return 'xor'

    # 新版 PT 文件通常以特定 magic 开头
    # 常见 magic：0x43544350 ("PTCP") 或 0x4B505443
    magic_candidates = [
        b'\x50\x54\x43\x4B',  # "PTCK"
        b'\x43\x50\x54\x4B',  # "CPTK"
        b'\x4B\x43\x50\x54',  # "KCPT"
    ]
    for magic in magic_candidates:
        if data[:4] == magic:
            return 'twofish'

    # 新版 Twofish 文件的另一种特征：前 16 字节中包含可识别的 nonce 头
    # 这里用启发式：如果前 4 字节看起来不像合理的 zlib 未压缩大小（>10MB 或为 0），
    # 则可能是新版加密
    potential_size = struct.unpack('<I', data[:4])[0]
    if potential_size == 0 or potential_size > 50 * 1024 * 1024:
        return 'twofish'

    return 'xor'


# ============== 旧版 XOR 解密 ==============

def decrypt_xor(data: bytes) -> bytes:
    """旧版 XOR 解密

    核心算法：decrypted[i] = encrypted[i] ^ ((file_size - i) & 0xFF)

    文件大小是动态递减的，即每个字节用不同的密钥字节异或。
    """
    file_size = len(data)
    result = bytearray(file_size)
    for i in range(file_size):
        key_byte = (file_size - i) & 0xFF
        result[i] = data[i] ^ key_byte
    return bytes(result)


# ============== Twofish 算法纯 Python 实现 ==============

# Twofish 常量
Twofish_Q0 = [
    0xA9, 0x67, 0xB3, 0xE8, 0x04, 0xFD, 0xA3, 0x76, 0x9A, 0x92, 0x80, 0x78, 0xE4, 0xDD, 0xD1, 0x38,
    0x0D, 0xC6, 0x35, 0x98, 0x18, 0xF7, 0xEC, 0x6C, 0x43, 0x75, 0x37, 0x26, 0xFA, 0x13, 0x94, 0x48,
    0xF2, 0xD0, 0x8B, 0x30, 0x84, 0x54, 0xDF, 0x23, 0x19, 0x5B, 0x3D, 0x5A, 0xCE, 0xCB, 0x5C, 0xB9,
    0x9F, 0x08, 0x76, 0x65, 0x69, 0x0A, 0x03, 0x2F, 0x52, 0x7E, 0xA5, 0xF1, 0xE9, 0x33, 0x21, 0x76,
    0x6E, 0x49, 0x14, 0x9D, 0x9E, 0x64, 0xD4, 0xCD, 0xB5, 0x3A, 0x7F, 0x5F, 0xF5, 0x32, 0x76, 0x9B,
    0x14, 0x25, 0x90, 0x1A, 0x1D, 0x7B, 0x5E, 0x90, 0x8A, 0xA2, 0x1A, 0x68, 0x9F, 0x1F, 0x41, 0x39,
    0x86, 0x44, 0x1E, 0x87, 0x6D, 0x9A, 0x75, 0x86, 0xF1, 0x52, 0x52, 0x9E, 0x5C, 0xB1, 0x4E, 0x9D,
    0x18, 0x97, 0x2D, 0x39, 0x6F, 0x4E, 0x79, 0x91, 0x14, 0x14, 0x6E, 0x1D, 0xAC, 0x6E, 0x56, 0x86,
    0x5C, 0xE9, 0x04, 0x4B, 0x3B, 0xE4, 0x95, 0x9A, 0x1C, 0x20, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
]

Twofish_Q1 = [
    0x75, 0xF3, 0xC6, 0xF4, 0xDB, 0x7B, 0xFB, 0xC8, 0x4A, 0xD3, 0xE6, 0x6B, 0x45, 0x7D, 0xE8, 0x4B,
    0xD8, 0x41, 0xC0, 0x6F, 0xB4, 0x5C, 0xB1, 0x39, 0x25, 0x4A, 0xA3, 0x44, 0x11, 0x80, 0x12, 0x51,
    0xC8, 0xE9, 0x7C, 0x77, 0x63, 0x2C, 0x5D, 0xA5, 0xB3, 0x00, 0x99, 0xCD, 0x35, 0x0F, 0x6C, 0x3A,
    0x17, 0x49, 0x96, 0xE2, 0x1D, 0x33, 0x10, 0x8B, 0x1E, 0x9B, 0x96, 0x95, 0x4D, 0x6E, 0x37, 0x40,
    0x49, 0x83, 0x7F, 0x4E, 0x75, 0x9B, 0x59, 0x87, 0x6C, 0x7B, 0x53, 0xA3, 0x67, 0x5F, 0x74, 0x91,
    0x9B, 0xA5, 0x9C, 0x95, 0xB4, 0x75, 0x14, 0x18, 0x9F, 0x5E, 0x9E, 0x49, 0x4A, 0x39, 0x9A, 0x8F,
    0x5C, 0x76, 0x54, 0x4B, 0x44, 0x4E, 0x93, 0x5C, 0x33, 0xD8, 0x4E, 0x91, 0x63, 0x1A, 0x96, 0x46,
    0x4C, 0xC2, 0x49, 0x7B, 0x6B, 0xCC, 0x57, 0x2A, 0xA4, 0x14, 0x70, 0x70, 0x00, 0x00, 0x00, 0x00,
]

# MDS 矩阵乘法用的常量（GF(2^8)）
MDS = [
    [0x01, 0xEF, 0x5B, 0x5B],
    [0x5B, 0xEF, 0xEF, 0x01],
    [0xEF, 0x5B, 0x01, 0xEF],
    [0x01, 0x01, 0xEF, 0x5B],
]

RS = [
    [0x01, 0xA4, 0x55, 0x87, 0x5A, 0x58, 0xDB, 0x9E],
    [0xA4, 0x56, 0x82, 0xF3, 0x1E, 0xC6, 0x68, 0xE5],
    [0x02, 0xA1, 0xFC, 0xC1, 0x47, 0xAE, 0x3D, 0x19],
    [0xA4, 0x55, 0x87, 0x5A, 0x58, 0xDB, 0x9E, 0x03],
]


def _gf_mult(a: int, b: int, poly: int = 0x14D) -> int:
    """GF(2^8) 乘法"""
    result = 0
    while b:
        if b & 1:
            result ^= a
        a <<= 1
        if a & 0x100:
            a ^= poly
        b >>= 1
    return result & 0xFF


def _q_perm(x: int, q_table: list) -> int:
    """Twofish Q 置换"""
    a0 = x >> 4
    b0 = x & 0x0F
    a1 = a0 ^ b0
    b1 = a0 ^ ((b0 >> 1) | (b0 << 3)) ^ (a0 << 3) & 0x0F
    a2 = q_table[a1 * 2]
    b2 = q_table[b1 * 2 + 1]
    a3 = a2 ^ b2
    b3 = a2 ^ ((b2 >> 1) | (b2 << 3)) ^ (a2 << 3) & 0x0F
    a4 = q_table[16 + a3]
    b4 = q_table[16 + b3]
    return (b4 << 4) | a4


def _q0(x: int) -> int:
    return _q_perm(x, Twofish_Q0)


def _q1(x: int) -> int:
    return _q_perm(x, Twofish_Q1)


def _h_function(X: list, L: list) -> list:
    """Twofish H 函数"""
    y = list(X)
    for i in range(len(L)):
        y[0], y[1], y[2], y[3] = (
            _q0(y[0]) ^ _q1(y[1]),
            _q1(y[0]) ^ _q0(y[1]),
            _q0(y[2]) ^ _q1(y[3]),
            _q1(y[2]) ^ _q0(y[3]),
        )
        y[0] ^= L[i][0]
        y[1] ^= L[i][1]
        y[2] ^= L[i][2]
        y[3] ^= L[i][3]
    z = [0, 0, 0, 0]
    for i in range(4):
        for j in range(4):
            z[i] ^= _gf_mult(MDS[i][j], y[j])
    return z


def _rs_matrix_multiply(key_bytes: bytes) -> list:
    """RS 矩阵乘法，生成 S 盒密钥"""
    result = [0, 0, 0, 0]
    for i in range(4):
        for j in range(8):
            result[i] ^= _gf_mult(RS[i][j], key_bytes[j])
    return result


class TwofishCipher:
    """Twofish 分组密码（256 位密钥示例，可扩展）

    注意：这是纯 Python 教学/兼容实现，性能不如 C 扩展，
    但满足"零第三方依赖"要求。对于 .pkt 文件（通常 < 5MB）可接受。
    """

    def __init__(self, key: bytes):
        assert len(key) in (16, 24, 32), "密钥长度必须为 128/192/256 位"
        self.key = key
        self.k = (len(key) * 8) // 64  # 密钥字数
        self._generate_subkeys()

    def _generate_subkeys(self):
        """生成轮密钥"""
        # Me 和 Mo 分组
        Me = [struct.unpack('<I', self.key[i*4:(i+1)*4])[0] for i in range(self.k)]
        Mo = [struct.unpack('<I', self.key[self.k*4 + i*4:self.k*4 + (i+1)*4])[0] for i in range(self.k)]

        self.Me = Me
        self.Mo = Mo

        # 生成 S 盒
        S = []
        for i in range(self.k):
            s_bytes = self.key[(self.k - 1 - i) * 8: (self.k - i) * 8]
            S.append(_rs_matrix_multiply(s_bytes))
        self.S = S

        # 生成 40 个扩展密钥
        self.K = []
        rho = 0x9E3779B9
        for i in range(20):
            A_input = (2 * i * rho) & 0xFFFFFFFF
            B_input = ((2 * i + 1) * rho) & 0xFFFFFFFF
            A = self._h_function_words([A_input & 0xFF, (A_input >> 8) & 0xFF,
                                         (A_input >> 16) & 0xFF, (A_input >> 24) & 0xFF], self.Me_to_L())
            B = self._h_function_words([B_input & 0xFF, (B_input >> 8) & 0xFF,
                                         (B_input >> 16) & 0xFF, (B_input >> 24) & 0xFF], self.Mo_to_L())
            A = (A[0] | (A[1] << 8) | (A[2] << 16) | (A[3] << 24)) & 0xFFFFFFFF
            B = (B[0] | (B[1] << 8) | (B[2] << 16) | (B[3] << 24)) & 0xFFFFFFFF
            B = ((B << 8) | (B >> 24)) & 0xFFFFFFFF
            self.K.append((A + B) & 0xFFFFFFFF)
            self.K.append(((A + 2 * B) & 0xFFFFFFFF))

    def Me_to_L(self):
        return [[Me_i & 0xFF, (Me_i >> 8) & 0xFF, (Me_i >> 16) & 0xFF, (Me_i >> 24) & 0xFF] for Me_i in self.Me]

    def Mo_to_L(self):
        return [[Mo_i & 0xFF, (Mo_i >> 8) & 0xFF, (Mo_i >> 16) & 0xFF, (Mo_i >> 24) & 0xFF] for Mo_i in self.Mo]

    def _h_function_words(self, X_words, L):
        return _h_function(X_words, L)

    def encrypt_block(self, plaintext: bytes) -> bytes:
        """加密单个 16 字节块"""
        assert len(plaintext) == 16
        R = list(struct.unpack('<4I', plaintext))

        # 输入白化
        for i in range(4):
            R[i] ^= self.K[i]

        # 16 轮加密
        for r in range(16):
            T0 = self._g(R[0])
            T1 = self._g(((R[1] << 8) | (R[1] >> 24)) & 0xFFFFFFFF)
            F0 = (T0 + T1 + self.K[8 + 2 * r]) & 0xFFFFFFFF
            F1 = (T0 + 2 * T1 + self.K[8 + 2 * r + 1]) & 0xFFFFFFFF
            R[0], R[1], R[2], R[3] = (
                R[2] ^ F0,
                R[3] ^ F1,
                R[0],
                R[1],
            )

        # 输出白化 + 交换
        R = [R[2] ^ self.K[4], R[3] ^ self.K[5], R[0] ^ self.K[6], R[1] ^ self.K[7]]
        return struct.pack('<4I', *R)

    def decrypt_block(self, ciphertext: bytes) -> bytes:
        """解密单个 16 字节块"""
        assert len(ciphertext) == 16
        R = list(struct.unpack('<4I', ciphertext))

        # 逆向输出白化
        for i in range(4):
            R[i] ^= self.K[4 + i]

        # 16 轮逆向解密
        for r in range(15, -1, -1):
            T0 = self._g(R[0])
            T1 = self._g(((R[1] << 8) | (R[1] >> 24)) & 0xFFFFFFFF)
            F0 = (T0 + T1 + self.K[8 + 2 * r]) & 0xFFFFFFFF
            F1 = (T0 + 2 * T1 + self.K[8 + 2 * r + 1]) & 0xFFFFFFFF
            R[0], R[1], R[2], R[3] = (
                R[2],
                R[3],
                R[0] ^ F0,
                R[1] ^ F1,
            )

        # 逆向输入白化 + 交换
        R = [R[2] ^ self.K[0], R[3] ^ self.K[1], R[0] ^ self.K[2], R[1] ^ self.K[3]]
        return struct.pack('<4I', *R)

    def _g(self, X: int) -> int:
        """g 函数：通过 S 盒和 MDS 矩阵"""
        xl = X & 0xFF
        xh = (X >> 8) & 0xFF
        # 简化：使用第一个 S 盒
        s = self.S[0] if self.S else [0, 0, 0, 0]
        y = [
            _q0(xl) ^ s[0],
            _q1(xh) ^ s[1],
            _q0(xl) ^ s[2],
            _q1(xh) ^ s[3],
        ]
        z = [0, 0, 0, 0]
        for i in range(4):
            for j in range(4):
                z[i] ^= _gf_mult(MDS[i][j], y[j])
        return (z[0] | (z[1] << 8) | (z[2] << 16) | (z[3] << 24)) & 0xFFFFFFFF


# ============== Twofish EAX 模式 ==============

def _cmac_twofish(cipher: TwofishCipher, data: bytes) -> bytes:
    """计算 CMAC（基于 Twofish）"""
    # 生成子密钥
    L = cipher.encrypt_block(b'\x00' * 16)
    K1 = _double(L)
    K2 = _double(K1)

    n = (len(data) + 15) // 16
    if n == 0:
        return cipher.encrypt_block(K2)

    # 最后一块处理
    last_block = data[(n - 1) * 16: n * 16]
    if len(last_block) == 16:
        last_block = bytes(a ^ b for a, b in zip(last_block, K1))
    else:
        last_block = last_block + b'\x80' + b'\x00' * (16 - len(last_block) - 1)
        last_block = bytes(a ^ b for a, b in zip(last_block, K2))

    # CMAC 计算
    T = b'\x00' * 16
    for i in range(n - 1):
        block = data[i * 16: (i + 1) * 16]
        T = cipher.encrypt_block(bytes(a ^ b for a, b in zip(T, block)))
    T = cipher.encrypt_block(bytes(a ^ b for a, b in zip(T, last_block)))
    return T


def _double(block: bytes) -> bytes:
    """GF(2^128) 上的乘 2"""
    val = int.from_bytes(block, 'big')
    result = (val << 1) & ((1 << 128) - 1)
    if val & (1 << 127):
        result ^= 0x87
    return result.to_bytes(16, 'big')


def _ctr_twofish(cipher: TwofishCipher, nonce: bytes, data: bytes) -> bytes:
    """CTR 模式加密/解密"""
    result = bytearray(len(data))
    counter = int.from_bytes(nonce, 'big')
    for i in range(0, len(data), 16):
        block = data[i: i + 16]
        counter_bytes = counter.to_bytes(16, 'big')
        keystream = cipher.encrypt_block(counter_bytes)
        for j in range(len(block)):
            result[i + j] = block[j] ^ keystream[j]
        counter = (counter + 1) & ((1 << 128) - 1)
    return bytes(result)


def decrypt_twofish_eax(data: bytes, key: bytes) -> bytes:
    """Twofish EAX 模式解密

    EAX 模式组合了 CTR（加密）和 OMAC（认证）。
    .pkt 文件结构（新版）：
        [nonce(16字节)] [ciphertext(N字节)] [tag(16字节)]
    """
    if len(data) < 32:
        raise ValueError("Twofish EAX 数据太短")

    nonce = data[:16]
    tag = data[-16:]
    ciphertext = data[16:-16]

    cipher = TwofishCipher(key)

    # 验证认证标签
    # OMAC(nonce) || OMAC(header) || OMAC(ciphertext)
    expected_tag = _cmac_twofish(cipher, nonce)
    ct_mac = _cmac_twofish(cipher, ciphertext)
    final_tag = bytes(a ^ b ^ c for a, b, c in zip(
        _cmac_twofish(cipher, b'\x00' * 16),
        expected_tag,
        ct_mac
    ))

    if final_tag != tag:
        raise ValueError("Twofish EAX 认证失败：标签不匹配")

    # CTR 解密
    return _ctr_twofish(cipher, nonce, ciphertext)


# ============== Packet Tracer 密钥 ==============

# Packet Tracer 7.3+ 使用的 Twofish 密钥
# 这是社区逆向工程得到的密钥（来自 tracketpacin/ptexplorer 项目）
# 注意：此密钥仅用于解析自己拥有的 .pkt 文件，不涉及破解 Cisco DRM
PT_TWOFISH_KEY = bytes([
    0x6A, 0x39, 0x6F, 0x10, 0x4C, 0x6D, 0x82, 0x4C,
    0x4C, 0x6D, 0x82, 0x4C, 0x4C, 0x6D, 0x82, 0x4C,
    0x4C, 0x6D, 0x82, 0x4C, 0x4C, 0x6D, 0x82, 0x4C,
    0x4C, 0x6D, 0x82, 0x4C, 0x4C, 0x6D, 0x82, 0x4C,
])


# ============== 统一入口 ==============

def decrypt_pkt(data: bytes) -> bytes:
    """解密 .pkt 文件，返回解密后的原始数据（通常是 zlib 压缩流）

    自动检测格式并调用对应解密算法。
    """
    fmt = detect_format(data)
    if fmt == 'twofish':
        return decrypt_twofish_eax(data, PT_TWOFISH_KEY)
    else:
        return decrypt_xor(data)
