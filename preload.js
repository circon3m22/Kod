/* Load every local game image before the first screen becomes interactive. */
(() => {
 const screen=document.getElementById('loading-screen');
 const line=document.getElementById('loading-line');
 const progress=document.getElementById('loading-progress');
 const retry=document.getElementById('loading-retry');
 const assets=[...new Set(window.KOD_PRELOAD_ASSETS||[])];
 const loaded=new Set();
 let busy=false;
 function imageReady(src){return new Promise(resolve=>{
  const image=new Image();
  image.onload=()=>resolve(image.naturalWidth>0);
  image.onerror=()=>resolve(false);
  image.src=src;
 });}
 function showProgress(){const percent=Math.floor(100*loaded.size/Math.max(1,assets.length));line.style.width=percent+'%';progress.textContent=percent+'%';}
 async function loadAll(){
  if(!assets.length){progress.textContent='Не удалось загрузить сайт';retry.hidden=false;return;}
  if(busy)return;busy=true;retry.hidden=true;progress.textContent=loaded.size?'Загружаем…':'0%';
  const pending=assets.filter(src=>!loaded.has(src));let next=0;
  await Promise.all(Array.from({length:Math.min(6,pending.length)},async()=>{
   while(next<pending.length){const src=pending[next++];if(await imageReady(src))loaded.add(src);showProgress();}
  }));
  await document.fonts.ready;
  busy=false;
  if(loaded.size!==assets.length){progress.textContent='Не удалось загрузить все изображения';retry.hidden=false;return;}
  window.__KOD_ASSETS_READY=true;
  document.getElementById('viewport').inert=false;
  window.dispatchEvent(new Event('kod:ready'));
  screen.classList.add('loaded');
  screen.addEventListener('transitionend',()=>screen.remove(),{once:true});
 }
 retry.addEventListener('click',()=>assets.length?loadAll():location.reload());
 loadAll();
})();
