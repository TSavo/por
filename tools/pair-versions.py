"""Pair addresses between the earlier build and version 1.3.

    python tools/pair-versions.py qa/version-1.3-pairs.json

Procedures that match instruction for instruction, apart from addresses, line up one to one.
From each aligned pair of instructions this reads off which far-call target, data address and
overlay slice in the earlier build corresponds to which in 1.3. Needs capstone.
"""
import struct,re,sys,hashlib,collections,json
sys.path.insert(0,sys.argv[0].rsplit('/',1)[0])
from capstone import Cs, CS_ARCH_X86, CS_MODE_16
import exepack
md=Cs(CS_ARCH_X86,CS_MODE_16)
def load(d,packed):
    exe=open(d+'/START.EXE','rb').read(); ovr=open(d+'/GAME.OVR','rb').read()
    img=exepack.unpack(exe)[0] if packed else exe[struct.unpack_from('<H',exe,8)[0]*16:]
    stubs=[];seen=set()
    for i in range(0,len(img)-32,16):
        if img[i:i+2]!=b'\xcd\x3f': continue
        off,code,rel,n=struct.unpack_from('<IHHH',img,i+4)
        if not(1<=n<=512 and code>=1) or off<4 or off+code+rel>len(ovr) or off in seen: continue
        seen.add(off); stubs.append((off,code,rel,n,i))
    stubs.sort()
    last=max(s[4] for s in stubs); n=[s for s in stubs if s[4]==last][0][3]
    return img,ovr,stubs,(last+0x20+n*5+15)&~15
num=re.compile(r'0x[0-9a-f]+|\b\d+\b')
def norm(ins):
    op=ins.op_str; m=ins.mnemonic
    if m in('call','lcall','jmp','ljmp') or m.startswith('j') or m.startswith('loop'): return m+(' [mem]' if '[' in op else ' T')
    def repl(mt):
        t=mt.group(0); v=int(t,16) if t.startswith('0x') else int(t)
        return t if v<0x100 else 'N'
    op=re.sub(r'\[(?:(?:[a-z]{2}):)?0x[0-9a-f]+\]','[A]',op)
    return m+' '+num.sub(repl,op)
def procs(b,lo,hi,label,unit):
    P=[i for i in range(lo,hi-2) if b[i]==0x55 and b[i+1:i+3] in (b'\x89\xe5',b'\x8b\xec')]; out=[]
    for a,e in zip(P,P[1:]+[hi]):
        ins=[]
        for i in md.disasm(bytes(b[a:e]),a):
            ins.append((i.address,i.mnemonic,i.op_str,norm(i)))
            if i.mnemonic in('retf','ret'):
                nxt=i.address+i.size
                if nxt>=e or b[nxt:nxt+1]==b'\x55': break
        out.append(dict(unit=unit,start=a,label=f'{label}+{a:04x}',ins=ins,sig=hashlib.sha1('\n'.join(x[3] for x in ins).encode()).hexdigest()))
    return out
def allprocs(d,packed):
    img,ovr,stubs,start=load(d,packed)
    out=procs(img,start,len(img),'exe','exe')
    for idx,(off,code,rel,n,i) in enumerate(stubs): out+=procs(ovr[off:off+code],0,code,f'ovl{idx:02d}',idx)
    return out,stubs,img
import os
A,sa,ia=allprocs(os.environ.get('POR_GAMEDATA','../por-assets/pool'),False)
B,sb,ib=allprocs(os.environ.get('POR_GAMEDATA_1_3','../por-assets/gog-1.3/POOLRAD'),True)
bysig=collections.defaultdict(list)
for q in B: bysig[q['sig']].append(q)
far=collections.defaultdict(collections.Counter); data=collections.defaultdict(collections.Counter)
procmap={}; slicemap=collections.defaultdict(collections.Counter)
used=set(); pairs=0
for p in A:
    if len(p['ins'])<6: continue
    c=[q for q in bysig.get(p['sig'],[]) if id(q) not in used]
    if len(c)!=1 and not c: continue
    q=c[0]; used.add(id(q)); pairs+=1
    procmap[p['label']]=q['label']
    if p['unit']!='exe' and q['unit']!='exe': slicemap[p['unit']][q['unit']]+=1
    for (a1,m1,o1,_),(a2,m2,o2,_) in zip(p['ins'],q['ins']):
        if m1=='lcall' and ',' in o1 and ',' in o2:
            s1,f1=[int(x,16) if x.strip().startswith('0x') else int(x) for x in o1.split(',')]
            s2,f2=[int(x,16) if x.strip().startswith('0x') else int(x) for x in o2.split(',')]
            far[(s1,f1)][(s2,f2)]+=1
        for x,y in zip(re.findall(r'\[(?:(?:ds|es|ss|cs):)?(0x[0-9a-f]+)\]',o1),re.findall(r'\[(?:(?:ds|es|ss|cs):)?(0x[0-9a-f]+)\]',o2)):
            data[int(x,16)][int(y,16)]+=1
print('procedures paired exactly:',pairs)
def settle(m):
    ok={};amb={}
    for k,c in m.items():
        best,n=c.most_common(1)[0]
        if len(c)==1 or n>=3*sorted(c.values())[-2]: ok[k]=(best,n)
        else: amb[k]=dict(c)
    return ok,amb
fok,famb=settle(far); dok,damb=settle(data)
print('far-call targets paired:',len(fok),'ambiguous:',len(famb)); print('data addresses paired:',len(dok),'ambiguous:',len(damb))
segs=collections.defaultdict(collections.Counter)
for (s1,f1),((s2,f2),n) in fok.items(): segs[s1][s2]+=n
print('segment pairing (ours -> 1.3):')
for s1 in sorted(segs): print(f'   {s1:04x} -> '+', '.join(f'{s2:04x} x{n}' for s2,n in segs[s1].most_common(3)))
print('overlay slice pairing (ours -> 1.3):',{k:v.most_common(1)[0][0] for k,v in sorted(slicemap.items())})
json.dump(dict(far={f'{k[0]:x}:{k[1]:x}':f'{v[0][0]:x}:{v[0][1]:x}' for k,v in fok.items()},data={f'{k:x}':f'{v[0]:x}' for k,v in dok.items()},
  procs=procmap,slices={str(k):v.most_common(1)[0][0] for k,v in slicemap.items()}),open(sys.argv[1],'w'),indent=0)
