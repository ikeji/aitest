#!/usr/bin/env python3
"""GGUF のヘッダだけ読んでパラメータ数を出す (依存ライブラリなし)。

使い方:
    python3 gguf_params.py FILE.gguf ...          # ファイルごと
    python3 gguf_params.py -d DIR ...             # ディレクトリ内の分割ファイルを合計
    find /models -name '*.gguf' -printf '%h\\n' | sort -u | xargs python3 gguf_params.py -d

出力: 総パラメータ数 (B)、推定 Active 数 (MoE のみ。expert は used/count 比、埋め込み表は除外)、general.size_label、パス
"""
import glob
import os
import struct
import sys

# 値タイプ -> struct フォーマット
SCALAR = {0: "B", 1: "b", 2: "H", 3: "h", 4: "I", 5: "i", 6: "f", 7: "?", 10: "Q", 11: "q", 12: "d"}


class Reader:
    def __init__(self, f):
        self.f = f

    def u(self, fmt):
        n = struct.calcsize(fmt)
        return struct.unpack("<" + fmt, self.f.read(n))[0]

    def string(self):
        return self.f.read(self.u("Q")).decode("utf-8", "replace")

    def value(self, t):
        if t in SCALAR:
            return self.u(SCALAR[t])
        if t == 8:
            return self.string()
        if t == 9:
            et, n = self.u("I"), self.u("Q")
            if et in SCALAR:  # 大きい数値配列は読み飛ばす
                self.f.seek(struct.calcsize(SCALAR[et]) * n, 1)
                return None
            return [self.value(et) for _ in range(n)]
        raise ValueError(f"unknown value type {t}")


def read_header(path):
    """(metadata dict, tensor element count, expert tensor element count, embedding table element count) を返す。"""
    with open(path, "rb") as f:
        r = Reader(f)
        if f.read(4) != b"GGUF":
            raise ValueError(f"{path}: not a GGUF file")
        version = r.u("I")
        if version < 2:
            raise ValueError(f"{path}: GGUF v{version} は未対応")
        n_tensors, n_kv = r.u("Q"), r.u("Q")
        meta = {}
        for _ in range(n_kv):
            key = r.string()
            meta[key] = r.value(r.u("I"))
        elements = experts = embd = 0
        for _ in range(n_tensors):
            name = r.string()
            n_dims = r.u("I")
            cnt = 1
            for _ in range(n_dims):
                cnt *= r.u("Q")
            r.u("I")  # type
            r.u("Q")  # offset
            elements += cnt
            if "_exps." in name:  # ffn_{gate,up,down}_exps (shared expert の shexp は含めない)
                experts += cnt
            elif "token_embd" in name:  # 参照表 (token_embd, per_layer_token_embd) は Active に数えない
                embd += cnt
    return meta, elements, experts, embd


def report(paths, label_path):
    total, experts, embd, label, active = 0, 0, 0, None, "-"
    for p in paths:
        meta, n, e, t = read_header(p)
        total += n
        experts += e
        embd += t
        label = label or meta.get("general.size_label")
        arch = meta.get("general.architecture")
        n_exp, n_used = meta.get(f"{arch}.expert_count"), meta.get(f"{arch}.expert_used_count")
        if n_exp and n_used:
            active_ratio = (n_exp, n_used)
    if experts and "active_ratio" in dir():
        n_exp, n_used = active_ratio
        active = f"A{(total - embd - experts * (1 - n_used / n_exp)) / 1e9:.1f}B"
    print(f"{total / 1e9:.1f}B\t{active}\t{label or '-'}\t{label_path}")


def main(argv):
    if argv and argv[0] == "-d":
        for d in argv[1:]:
            files = sorted(glob.glob(os.path.join(d, "*.gguf")))
            if files:
                report(files, d)
    else:
        for p in argv:
            report([p], p)


if __name__ == "__main__":
    main(sys.argv[1:])
