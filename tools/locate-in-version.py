"""Find where code and data of the earlier build ended up in version 1.3.

    python tools/locate-in-version.py qa/version-1.3-bindings.json

For each code position the host hooks, this finds the procedure that holds it, finds the most
similar procedure anywhere in 1.3 (code moved between overlays and the main program), aligns
the two instruction by instruction, and reports the matching position with how sure it is.
Data addresses are voted on from the operands of aligned, identical instructions across every
similar pair of procedures. Needs capstone.
"""
import collections, difflib, hashlib, json, os, re, struct, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from capstone import Cs, CS_ARCH_X86, CS_MODE_16
import exepack
md = Cs(CS_ARCH_X86, CS_MODE_16)

def load(d, packed):
    exe = open(d + '/START.EXE', 'rb').read(); ovr = open(d + '/GAME.OVR', 'rb').read()
    img = exepack.unpack(exe)[0] if packed else exe[struct.unpack_from('<H', exe, 8)[0] * 16:]
    stubs = []; seen = set()
    for i in range(0, len(img) - 32, 16):
        if img[i:i + 2] != b'\xcd\x3f': continue
        off, code, rel, n = struct.unpack_from('<IHHH', img, i + 4)
        if not (1 <= n <= 512 and code >= 1) or off < 4 or off + code + rel > len(ovr) or off in seen: continue
        seen.add(off); stubs.append((off, code, rel, n, i))
    stubs.sort()
    last = max(s[4] for s in stubs); n = [s for s in stubs if s[4] == last][0][3]
    return img, ovr, stubs, (last + 0x20 + n * 5 + 15) & ~15

num = re.compile(r'0x[0-9a-f]+|\b\d+\b')
def shape(ins):
    m = ins.mnemonic; op = ins.op_str
    if m in ('call', 'lcall'): return 'call'
    if m in ('jmp', 'ljmp') or m.startswith('j') or m.startswith('loop'): return m
    def repl(t):
        t = t.group(0); v = int(t, 16) if t.startswith('0x') else int(t)
        return t if v < 0x100 else 'N'
    op = re.sub(r'\[(?:(?:[a-z]{2}):)?0x[0-9a-f]+\]', '[A]', op)
    return m + ' ' + num.sub(repl, op)

def procs(b, lo, hi, unit):
    P = [i for i in range(lo, hi - 2) if b[i] == 0x55 and b[i + 1:i + 3] in (b'\x89\xe5', b'\x8b\xec')]
    out = []
    for a, e in zip(P, P[1:] + [hi]):
        ins = []
        for i in md.disasm(bytes(b[a:e]), a):
            # an intra-unit far call is `push cs` then a near call; drop the push so it compares with a far call
            if i.mnemonic == 'push' and i.op_str == 'cs': continue
            ins.append((i.address, i.mnemonic, i.op_str, shape(i)))
            if i.mnemonic in ('retf', 'ret'):
                nxt = i.address + i.size
                if nxt >= e or b[nxt:nxt + 1] == b'\x55': break
        out.append(dict(unit=unit, start=a, end=e, ins=ins, shapes=[x[3] for x in ins]))
    return out

def allprocs(d, packed):
    img, ovr, stubs, start = load(d, packed)
    out = procs(img, start, len(img), 'exe')
    for idx, (off, code, rel, n, i) in enumerate(stubs): out += procs(ovr[off:off + code], 0, code, idx)
    return out, img

A, imgA = allprocs(os.environ.get('POR_GAMEDATA', '../por-assets/pool'), False)
B, imgB = allprocs(os.environ.get('POR_GAMEDATA_1_3', '../por-assets/gog-1.3/POOLRAD'), True)
byunit = collections.defaultdict(list)
for p in A: byunit[p['unit']].append(p)

def holder(unit, address):
    best = None
    for p in byunit[unit]:
        if p['start'] <= address < p['end'] and (best is None or p['start'] > best['start']): best = p
    return best

cache = {}
def counterpart(p):
    key = (p['unit'], p['start'])
    if key not in cache:
        best = None; score = 0.0
        a = p['shapes']
        for q in B:
            if not (0.5 * len(a) <= len(q['shapes']) <= 2 * len(a) + 4): continue
            sm = difflib.SequenceMatcher(None, a, q['shapes'], autojunk=False)
            if sm.real_quick_ratio() <= score or sm.quick_ratio() <= score: continue
            r = sm.ratio()
            if r > score: score = r; best = q
        cache[key] = (best, score)
    return cache[key]

def locate(unit, address):
    p = holder(unit, address)
    if p is None: return dict(error='no procedure holds this position')
    q, score = counterpart(p)
    if q is None: return dict(error='no similar procedure in 1.3', procedure=p['start'])
    index = next((i for i, x in enumerate(p['ins']) if x[0] >= address), None)
    if index is None: return dict(error='position is past the procedure', procedure=p['start'])
    sm = difflib.SequenceMatcher(None, p['shapes'], q['shapes'], autojunk=False)
    for a, b, n in sm.get_matching_blocks():
        if a <= index < a + n:
            j = b + index - a
            return dict(unit=q['unit'], procedure=q['start'], address=q['ins'][j][0], similarity=round(score, 3),
                        was=f"{p['ins'][index][1]} {p['ins'][index][2]}", now=f"{q['ins'][j][1]} {q['ins'][j][2]}",
                        exact=p['ins'][index][0] == address)
    return dict(error='the instruction has no aligned counterpart', unit=q['unit'], procedure=q['start'], similarity=round(score, 3),
                was=f"{p['ins'][index][1]} {p['ins'][index][2]}")

# Data addresses and far targets, voted from aligned identical instructions of every similar pair.
data = collections.defaultdict(collections.Counter); far = collections.defaultdict(collections.Counter)
mem = re.compile(r'\[(?:(?:ds|es|ss|cs):)?(0x[0-9a-f]+)\]')
for p in A:
    if len(p['ins']) < 6: continue
    q, score = counterpart(p)
    if q is None or score < 0.8: continue
    sm = difflib.SequenceMatcher(None, p['shapes'], q['shapes'], autojunk=False)
    for a, b, n in sm.get_matching_blocks():
        for k in range(n):
            x = p['ins'][a + k]; y = q['ins'][b + k]
            for u, v in zip(mem.findall(x[2]), mem.findall(y[2])): data[int(u, 16)][int(v, 16)] += 1
            if x[1] == 'lcall' and y[1] == 'lcall' and ',' in x[2] and ',' in y[2]:
                s1, f1 = [int(t, 0) for t in x[2].split(',')]; s2, f2 = [int(t, 0) for t in y[2].split(',')]
                far[(s1, f1)][(s2, f2)] += 1

def settle(counter):
    best, n = counter.most_common(1)[0]
    total = sum(counter.values())
    return best, n, total

request = json.load(open(sys.argv[2])) if len(sys.argv) > 2 else dict(code={}, data={}, far={})
result = dict(code={}, data={}, far={})
for name, (unit, address) in request.get('code', {}).items(): result['code'][name] = locate(unit, address)
for name, address in request.get('data', {}).items():
    if address in data:
        best, n, total = settle(data[address]); result['data'][name] = dict(address=best, votes=n, of=total)
    else: result['data'][name] = dict(error='not seen in an aligned instruction')
for name, (seg, off) in request.get('far', {}).items():
    if (seg, off) in far:
        (s, o), n, total = settle(far[(seg, off)]); result['far'][name] = dict(segment=s, offset=o, votes=n, of=total)
    else: result['far'][name] = dict(error='not seen in an aligned call')
json.dump(result, open(sys.argv[1], 'w'), indent=1)
bad = sum('error' in v for part in result.values() for v in part.values())
print(f"located {sum(len(part) for part in result.values()) - bad} of {sum(len(part) for part in result.values())}; data addresses seen {len(data)}, far targets seen {len(far)}")
