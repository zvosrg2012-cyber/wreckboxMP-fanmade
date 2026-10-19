import { readFile, writeFile } from 'node:fs/promises';

const file = new URL('../index.html', import.meta.url);
const marker = 'data-wreckbox-update18-menu';
let html = await readFile(file, 'utf8');

if (html.includes(marker)) {
  console.log('Update 1.8 map chooser already injected; no changes made.');
  process.exit(0);
}

const injection = String.raw`
<!-- data-wreckbox-update18-menu: injected by scripts/integrate-menu.mjs -->
<style>
#wreckbox18-launcher{position:fixed;inset:0;z-index:2147483000;display:grid;place-items:center;padding:20px;background:#0c1118dd;color:#eef4fa;font:16px system-ui,sans-serif}
#wreckbox18-launcher[hidden]{display:none}
#wreckbox18-launcher .w18-panel{width:min(680px,100%);padding:24px;border:1px solid #465363;border-radius:14px;background:#171e28;box-shadow:0 18px 80px #000a}
#wreckbox18-launcher h1{font-size:clamp(25px,5vw,40px);margin:0 0 8px}
#wreckbox18-launcher p{color:#c0ccd8;line-height:1.45}
#wreckbox18-launcher .w18-options{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:12px;margin-top:18px}
#wreckbox18-launcher .w18-card{padding:16px;border:1px solid #465363;border-radius:10px;background:#202a37}
#wreckbox18-launcher button,#wreckbox18-open{border:1px solid #62758a;border-radius:7px;padding:10px 13px;background:#385b7a;color:#fff;font:inherit;font-weight:650;cursor:pointer}
#wreckbox18-launcher button:hover,#wreckbox18-open:hover{background:#497aa5}
#wreckbox18-launcher .w18-note{font-size:12px;color:#9eacbb}
#wreckbox18-open{position:fixed;z-index:2147482000;right:12px;top:12px}
</style>
<div id="wreckbox18-launcher" data-wreckbox-update18-menu role="dialog" aria-modal="true" aria-labelledby="wreckbox18-title">
 <section class="w18-panel">
  <h1 id="wreckbox18-title">Wreckbox Fan Update 1.8</h1>
  <p>Выбери режим. Обычная игра продолжится в этом окне; Атомград откроется как отдельная карта.</p>
  <div class="w18-options">
   <div class="w18-card"><h2>Обычная игра</h2><p>Продолжить запуск оригинальной игры без карты Атомград.</p><button type="button" id="wreckbox18-continue">Играть</button></div>
   <div class="w18-card"><h2>Атомград</h2><p>Открыть отдельный прототип города и атомной электростанции.</p><button type="button" id="wreckbox18-atomgrad">Запустить Атомград</button></div>
  </div>
  <p class="w18-note">Атомград пока является отдельным визуальным прототипом и не подключён к физике оригинального движка.</p>
 </section>
</div>
<button id="wreckbox18-open" type="button" hidden>Карты · Update 1.8</button>
<script>
(function(){
 var panel=document.getElementById('wreckbox18-launcher');
 var reopen=document.getElementById('wreckbox18-open');
 var continueButton=document.getElementById('wreckbox18-continue');
 var atomgradButton=document.getElementById('wreckbox18-atomgrad');
 function closeChooser(){panel.hidden=true;reopen.hidden=false;}
 continueButton.addEventListener('click',closeChooser);
 reopen.addEventListener('click',function(){panel.hidden=false;reopen.hidden=true;continueButton.focus();});
 atomgradButton.addEventListener('click',function(){window.location.href='./atomgrad.html';});
})();
</script>
`;

const close = html.toLowerCase().lastIndexOf('</body>');
if (close >= 0) html = html.slice(0, close) + injection + '\n' + html.slice(close);
else html += injection;

await writeFile(file, html, 'utf8');
console.log('Injected Update 1.8 map chooser into index.html.');
