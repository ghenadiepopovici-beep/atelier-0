
const EL = s => document.querySelector(s);
const show = id => EL(id).classList.remove('hidden');
const hide = id => EL(id).classList.add('hidden');
const screens = { master:'#screen-master', manager:'#screen-manager', admin:'#screen-admin' };

let DATA = {masters:[],admins:[],services:[],orders:[],individual_rates:[]};
let CURRENT = {role:'master', masterId:null};

async function loadData(){
  const resp = await fetch('./data.json'); DATA = await resp.json();
  // default current master = first
  CURRENT.masterId = DATA.masters[0]?.id || null;
  renderRole();
  renderMasterList();
  renderServices();
  renderOrders();
}
function setRole(role){
  CURRENT.role = role;
  document.querySelectorAll('.role button').forEach(b=>b.classList.remove('active'));
  EL('#r-'+role).classList.add('active');
  renderRole();
}
function renderRole(){ Object.entries(screens).forEach(([k,sel])=> (k===CURRENT.role?show(sel):hide(sel))); }
EL('#r-master').onclick = ()=>setRole('master');
EL('#r-manager').onclick = ()=>setRole('manager');
EL('#r-admin').onclick = ()=>setRole('admin');

// Master switcher
function renderMasterList(){
  const sel = EL('#master-select');
  sel.innerHTML = DATA.masters.map(m=>`<option value="${m.id}">${m.name} (${Math.round(m.percent*100)}%)</option>`).join('');
  sel.onchange = ()=>{ CURRENT.masterId = sel.value; renderOrders(); updatePercentBadge(); };
  sel.value = CURRENT.masterId;
  updatePercentBadge();
}
function updatePercentBadge(){
  const m = DATA.masters.find(x=>x.id===CURRENT.masterId);
  if(m) EL('#my-percent').innerText = `Твой процент: ${Math.round(m.percent*100)}%`;
}

// Orders demo in localStorage
function getOrders(){
  const saved = localStorage.getItem('atelier.orders');
  if(saved){ try { return JSON.parse(saved); } catch(e){/*noop*/} }
  // seed some demo orders
  const o = [
    { id:'O-1024', item:'Кроссовки Nike Air', services:['Чистка глубокая','Покраска частичная'], price:350, deadline:'2025-08-16', status:'assigned', assignedTo:['m1'] },
    { id:'O-1025', item:'Сумка кожаная Celine', services:['Чистка внешняя','Восстановление цвета'], price:900, deadline:'2025-08-14', status:'inprogress', assignedTo:['m2'] },
    { id:'O-1030', item:'Куртка кожаная', services:['Покраска полная','Замена молнии'], price:1200, deadline:'2025-08-20', status:'ready', assignedTo:['m1'] },
  ];
  localStorage.setItem('atelier.orders', JSON.stringify(o));
  return o;
}
function saveOrders(list){ localStorage.setItem('atelier.orders', JSON.stringify(list)); }
function renderOrders(){
  const list = EL('#orders'); list.innerHTML='';
  const orders = getOrders().filter(o => o.assignedTo.includes(CURRENT.masterId) && o.status!=='issued');
  const master = DATA.masters.find(m=>m.id===CURRENT.masterId);
  orders.forEach(o => {
    const ind = DATA.individual_rates.find(r=>r.master===CURRENT.masterId && DATA.services.find(s=>o.services.join(',').includes(s.name) && s.code===r.service));
    const percent = ind ? ind.value : (master?.percent||0.45);
    const myPay = Math.round(o.price * percent);
    const card = document.createElement('div');
    card.className='card';
    card.innerHTML = `
      <div class="row" style="justify-content:space-between">
        <div><div class="small">Заказ ${o.id}</div><div class="h">${o.item}</div></div>
        <span class="status s-${o.status}">${({assigned:'Назначен',taken:'Взято',inprogress:'В работе',ready:'Готово',issued:'Выдано'})[o.status]}</span>
      </div>
      <div class="small" style="margin-top:6px">${o.services.join(' • ')}</div>
      <div class="row" style="margin-top:8px">
        <span class="pill">Клиент: ${o.price} лей</span>
        <span class="pill" style="background:#d1fae5;color:#065f46">Моё: ${myPay} лей (${Math.round(percent*100)}%)</span>
      </div>
      <div class="row" style="margin-top:12px">
        <button class="btn" data-open="${o.id}">Открыть</button>
        <button class="btn" data-next="${o.id}">Дальше</button>
      </div>`;
    list.appendChild(card);
  });
  document.querySelectorAll('[data-open]').forEach(b=>b.onclick=()=>openOrder(b.getAttribute('data-open')));
  document.querySelectorAll('[data-next]').forEach(b=>b.onclick=()=>advanceStatus(b.getAttribute('data-next')));
}
function advanceStatus(id){
  const list = getOrders();
  const o = list.find(x=>x.id===id);
  const flow = {assigned:'taken', taken:'inprogress', inprogress:'ready', ready:'issued'};
  o.status = flow[o.status] || 'issued';
  saveOrders(list);
  renderOrders();
}
function openOrder(id){
  alert('Карточка заказа '+id+' (демо). В полной версии здесь будут фото до/после, чек-лист и комментарии.');
}

// Services page (admin)
function renderServices(){
  const table = EL('#services-table'); if(!table) return;
  table.innerHTML = DATA.services.map(s=>`
    <tr><td>${s.category}</td><td>${s.name}</td><td>${s.price} лей</td></tr>
  `).join('');
}

// Manager board (demo)
function renderBoard(){
  const cols = {assigned:'#col-assigned',taken:'#col-taken',inprogress:'#col-inprogress',ready:'#col-ready'};
  for(const k in cols) EL(cols[k]).innerHTML='';
  getOrders().forEach(o=>{
    const div=document.createElement('div'); div.className='order';
    div.innerHTML=`<div class="h">${o.item}</div><div class="small">${o.services.join(' • ')}</div><div class="row" style="margin-top:6px"><span class="pill">${o.id}</span><span class="pill">Срок: ${o.deadline}</span></div>`;
    EL(cols[o.status]).appendChild(div);
  });
}

window.addEventListener('load', ()=>{
  if ('serviceWorker' in navigator) navigator.serviceWorker.register('./sw.js');
  loadData().then(renderBoard);
});
