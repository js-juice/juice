import re,sys,os 
from pathlib import Path 
root=Path('d:/js-juice') 
seen=set() 
missing=[] 
pat=re.compile(r\"(?:import\s*\(\s*|import\s+[^;\n]*?\sfrom\s+|export\s+[^;\n]*?\sfrom\s+|^\s*import\s+)(['\\\"])(['\\\"]+)\1\",re.M) 
def walk(p): 
    p=(root/p).resolve() if not str(p).startswith('d:/js-juice') else Path(p) 
    if p in seen or not p.exists(): return 
    seen.add(p) 
    try: t=p.read_text(encoding='utf-8') 
    except Exception: return 
    for m in pat.finditer(t): 
        s=m.group(2) 
        if not s.startswith('.'): continue 
        q=(p.parent/s).resolve() 
        if q.suffix=='': 
            if q.with_suffix('.mjs').exists(): q=q.with_suffix('.mjs') 
            elif q.with_suffix('.js').exists(): q=q.with_suffix('.js') 
        if not q.exists(): missing.append((str(p.relative_to(root)),s,str(q.relative_to(root) if str(q).startswith(str(root)) else q))); continue 
        walk(q) 
walk(Path('animation/examples/lab/sprite.mjs')) 
print('seen',len(seen)) 
print('missing',len(missing)) 
[print(a,'-,b,'=,c) for a,b,c in missing[:200]] 
