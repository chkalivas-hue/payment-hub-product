const nav=document.querySelectorAll('.nav'),pages=document.querySelectorAll('.page');
function openPage(id){pages.forEach(p=>p.classList.toggle('active',p.id===id));nav.forEach(n=>n.classList.toggle('active',n.dataset.page===id));history.replaceState(null,'','#'+id);window.scrollTo({top:0,behavior:'smooth'});}
nav.forEach(n=>n.addEventListener('click',()=>openPage(n.dataset.page)));
const id=location.hash.slice(1);if(id&&document.getElementById(id))openPage(id);