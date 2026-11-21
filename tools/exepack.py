"""Unpack a Microsoft EXEPACK executable.

Version 1.3 of START.EXE ships packed. `unpack` returns the load image, its relocations,
and the real entry point and stack. tools/exepack.ts is the same routine for the runtime.
"""
import struct,sys
def unpack(exe):
    (last,pages,nreloc,hdrpara,minalloc,maxalloc,ss,sp,csum,ip,cs,relofs,ovl)=struct.unpack_from('<13H',exe,2)
    hdr=hdrpara*16
    size=(pages-1)*512+last if last else pages*512
    body=bytearray(exe[hdr:size])
    ep=cs*16                      # EXEPACK variables live at CS:0
    real_ip,real_cs,mem_start,exepack_size,real_sp,real_ss,dest_len=struct.unpack_from('<7H',body,ep)
    sig_off=ep+ip-2
    skip_len=1
    if body[sig_off:sig_off+2]!=b'RB':
        # 18-byte header variant carries skip_len before the signature
        skip_len=struct.unpack_from('<H',body,ep+14)[0]
        assert body[ep+16:ep+18]==b'RB',body[ep+12:ep+20].hex()
    packed_len=ep                   # compressed data occupies [0, ep)
    out=bytearray(dest_len*16)
    out[:packed_len]=body[:packed_len]
    src=packed_len-(skip_len-1)*16
    while out[src-1]==0xff: src-=1
    dst=dest_len*16
    while True:
        src-=1; cmd=out[src]
        src-=2; count=out[src]|(out[src+1]<<8)
        if cmd&0xfe==0xb0:
            src-=1; fill=out[src]
            dst-=count; out[dst:dst+count]=bytes([fill])*count
        elif cmd&0xfe==0xb2:
            dst-=count; src-=count
            out[dst:dst+count]=out[src:src+count]
        else: raise ValueError(f'bad EXEPACK command {cmd:#x} at {src:#x}')
        if cmd&1: break
    # packed relocation table follows the unpacker stub
    msg=body.find(b'Packed file is corrupt',ep)
    rel=msg+len(b'Packed file is corrupt')
    relocs=[]
    for seg in range(16):
        n=struct.unpack_from('<H',body,rel)[0]; rel+=2
        for _ in range(n):
            off=struct.unpack_from('<H',body,rel)[0]; rel+=2
            relocs.append(seg*0x10000+off)
    return bytes(out),relocs,real_cs,real_ip,real_ss,real_sp
if __name__=='__main__':
    exe=open(sys.argv[1],'rb').read()
    img,relocs,cs,ip,ss,sp=unpack(exe)
    open(sys.argv[2],'wb').write(img)
    print(f'unpacked image {len(img)} bytes, {len(relocs)} relocations, entry {cs:04x}:{ip:04x}, stack {ss:04x}:{sp:04x}')
