from pathlib import Path
import base64
import re
import sys

path = Path("index.html")
html = path.read_bytes()
start = html.find(b"(()=>{const k=[", 4_650_000)
if start < 0:
    raise SystemExit("Could not find the encoded game-code block in index.html")
match = re.search(
    rb'const k=\[([^\]]+)\],s=atob\("([^"]+)"\),n=s.length,u=new Uint8Array\(n\);',
    html[start:],
)
if not match:
    raise SystemExit("Could not parse the game's encoded JavaScript")
key = [int(x) for x in match.group(1).split(b",")]
encoded = base64.b64decode(match.group(2))
src = bytearray(encoded)
for i in range(len(src)):
    src[i] ^= key[i % len(key)] ^ ((i * 31 + (i >> 8)) & 255)

replacements = [
    (
        b't.zomb={goal:void 0===e.goal?null:e.goal,t0:$t}',
        b't.zomb={goal:void 0===e.goal?null:e.goal,t0:$t,type:("fast"===window.__WRECKBOX_SELECTED_ZOMBIE_TYPE__?"fast":"standard")}',
    ),
    (
        b't.spd=B(9,13),t.runSpd=B(28,38)',
        b't.spd=B(9,13)*("fast"===t.zomb.type?1.75:1),t.runSpd=B(28,38)*("fast"===t.zomb.type?1.75:1)',
    ),
    (
        b'e.zomb?pb(f.skin,p,"#7e9466",.62)',
        b'e.zomb?pb(f.skin,p,e.zomb.type==="fast"?"#b51f2b":"#7e9466",e.zomb.type==="fast"?.88:.62)',
    ),
    (
        b't.fill(),void(e.zomb&&Le&&bb(t,e,l,c,e.dir,h,o))',
        b't.fill(),e.zomb&&"fast"===e.zomb.type&&e.lightK<.62&&(t.save(),t.globalCompositeOperation="lighter",t.globalAlpha=.95,t.fillStyle="#278dff",t.shadowColor="#278dff",t.shadowBlur=5*h,t.beginPath(),t.arc(l-.85*h,c-.25*h,.42*h,0,6.2832),t.arc(l+.85*h,c-.25*h,.42*h,0,6.2832),t.fill(),t.restore()),void(e.zomb&&Le&&bb(t,e,l,c,e.dir,h,o))',
    ),
    (
        b'if(!ET(i)||i===e.skip)continue;',
        b'if((!ET(i)&&!(i.zomb&&i.zomb.type!==e.zomb.type&&!i.dead&&!i.gone&&!i.hidden))||i===e.skip)continue;',
    ),
    (
        b'n.gone||n.hidden||n.zomb||n.bit||n.dead&&!n.rag',
        b'n.gone||n.hidden||n.zomb&&(!n.zomb.type||n.zomb.type===t.zomb.type)||n.bit||n.dead&&!n.rag',
    ),
]
for old, new in replacements:
    if old not in src:
        raise SystemExit("Patch anchor missing; refusing to change index.html: " + old[:60].decode())
    src = src.replace(old, new, 1)

for i in range(len(src)):
    src[i] ^= key[i % len(key)] ^ ((i * 31 + (i >> 8)) & 255)
new_b64 = base64.b64encode(src)
payload_start = start + match.start(2)
payload_end = start + match.end(2)
html = html[:payload_start] + new_b64 + html[payload_end:]
path.write_bytes(html)
print("Patched game logic in index.html: fast zombies are faster, red, blue-eyed in darkness, and target other zombie types.")
