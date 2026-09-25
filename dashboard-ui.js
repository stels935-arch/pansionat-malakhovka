(function(){
'use strict';const F=window.MalakhovkaFinance,$=id=>document.getElementById(id),num=(v,d=0)=>new Intl.NumberFormat('ru-RU',{maximumFractionDigits:d}).format(v),rub=v=>num(v)+' ₽',signed=v=>(v>0?'+':'')+rub(v),base=F.defaults(),baseResult=F.calculate(base);
const clone=v=>JSON.parse(JSON.stringify(v));let state=clone(base),lastResult=null;const key='malakhovka-monthly-v1';
try{const saved=JSON.parse(localStorage.getItem(key));if(saved&&saved.version===1){state={...base,...saved.inputs};state.staff=base.staff.map((s,i)=>({...s,count:saved.inputs.staff?.[i]?.count??s.count,salary:saved.inputs.staff?.[i]?.salary??s.salary}))}}catch{}
function field(f){const[id,label,,step,min,max,hint]=f;return '<div class="field"><label for="in-'+id+'">'+label+'</label><input data-key="'+id+'" id="in-'+id+'" type="number" required value="'+state[id]+'" min="'+min+'" max="'+max+'" step="'+step+'">'+(hint?'<small>'+hint+'</small>':'')+'</div>'}
function section(g){return '<section class="panel" id="section-'+g.id+'"><h2>'+g.title+'</h2><p class="section-note">'+g.note+'</p><div class="fields">'+g.fields.map(field).join('')+(g.id==='income'?'<div class="field"><label for="price-month">То же за месяц, ₽/место</label><input type="number" id="price-month" min="0" max="31000000" step="1" value="'+state.price*state.days+'"><small>Можно изменить здесь — суточная цена пересчитается.</small></div>':'')+(g.id==='rent'?'<div class="field"><label for="rent-total">Вся аренда в месяц, ₽</label><input type="number" id="rent-total" min="0" max="1000000000000" step="1" value="'+state.area*state.rentRate+'"><small>Можно изменить общую сумму — ставка за м² пересчитается.</small></div>':'')+'</div></section>'}
function staffHTML(){return '<section class="panel" id="staff-section"><h2>Сотрудники и зарплаты</h2><p class="section-note">Количество — оплачиваемые ставки, включая сменность и подмены из исходного плана. Оклад за одну ставку до НДФЛ. Взносы работодателя добавляются ниже.</p><div class="staff">'+state.staff.map((s,i)=>'<div class="staff-row"><div class="role">'+s.name+'</div><div class="field"><label for="staff-count-'+i+'">Ставок</label><input id="staff-count-'+i+'" data-staff="'+i+'" data-prop="count" type="number" min="0" max="10000" step="0.5" required value="'+s.count+'"></div><div class="field"><label for="staff-salary-'+i+'">Оклад, ₽/мес.</label><input id="staff-salary-'+i+'" data-staff="'+i+'" data-prop="salary" type="number" min="0" max="10000000" step="1000" required value="'+s.salary+'"></div><div class="staff-total" id="staff-total-'+i+'"></div></div>').join('')+'</div><div id="staff-summary"></div><p class="note">Штат меняется вручную. При изменении числа мест калькулятор не проверяет достаточность смен и не добавляет сотрудников автоматически. Дополнительная медсестра — отдельный бюджет в последнем блоке.</p></section>'}
function form(){let s=F.groups.slice(0,2).map(section).join('');s+=staffHTML()+F.groups.slice(2).map(section).join('');$('controls').innerHTML=s}
function read(){
const x=clone(base);F.groups.forEach(g=>g.fields.forEach(f=>{let el=$('in-'+f[0]);if(!el.value.trim()||!Number.isFinite(el.valueAsNumber)||el.valueAsNumber<f[4]||el.valueAsNumber>f[5])throw Error('Проверьте поле «'+f[1]+'». Допустимо от '+f[4]+' до '+f[5]+'.');x[f[0]]=el.valueAsNumber}));
if(!Number.isInteger(x.capacity)||!Number.isInteger(x.days))throw Error('Количество мест и дней должны быть целыми числами.');
x.staff=base.staff.map((s,i)=>{const count=$('staff-count-'+i),salary=$('staff-salary-'+i);for(const el of [count,salary])if(!el.value.trim()||!Number.isFinite(el.valueAsNumber)||el.valueAsNumber<0||el.valueAsNumber>Number(el.max))throw Error('Проверьте количество ставок и оклад: '+s.name+'.');return {...s,count:count.valueAsNumber,salary:salary.valueAsNumber}});return x
}
function line(label,value,total=false){return '<div class="sumline'+(total?' total':'')+'"><span>'+label+'</span><strong>'+rub(value)+'</strong></div>'}
function chart(x){
const rows=Array.from({length:21},(_,i)=>{let r=F.calculate({...x,occupancy:i*5});return {occ:i*5,cash:r.cash,profit:r.profit}});
const vals=rows.flatMap(r=>[r.cash,r.profit]).concat([0]),mn=Math.min(...vals),mx=Math.max(...vals),span=Math.max(1,mx-mn),lo=mn-span*.08,hi=mx+span*.08;
const X=o=>55+o*5.8,Y=v=>220-(v-lo)/(hi-lo)*185,points=k=>rows.map(r=>X(r.occ)+','+Y(r[k])).join(' ');
let svg='<svg class="spark" viewBox="0 0 680 275" role="img" aria-label="Как прибыль меняется при загрузке от нуля до ста процентов">';
for(let i=0;i<4;i++){const v=lo+(hi-lo)*i/3,y=Y(v);svg+='<line x1="55" y1="'+y+'" x2="635" y2="'+y+'" stroke="#dce3d9"/><text x="48" y="'+(y+4)+'" text-anchor="end" font-size="11" fill="#607068">'+num(v/1000000,1)+'</text>'}
svg+='<text x="8" y="16" font-size="11" fill="#607068">млн ₽/мес.</text><line x1="55" y1="'+Y(0)+'" x2="635" y2="'+Y(0)+'" stroke="#80958b" stroke-dasharray="4 4"/>';
for(let o=0;o<=100;o+=20)svg+='<text x="'+X(o)+'" y="243" text-anchor="middle" font-size="12" fill="#607068">'+o+'%</text>';
svg+='<polyline points="'+points('cash')+'" fill="none" stroke="#176b52" stroke-width="3"/><polyline points="'+points('profit')+'" fill="none" stroke="#b5814c" stroke-width="2.5"/><circle cx="'+X(x.occupancy)+'" cy="'+Y(F.calculate(x).cash)+'" r="5" fill="#173c31"/><text x="345" y="267" text-anchor="middle" font-size="12" fill="#607068">Загрузка при введённом штате</text></svg>';
$('profit-chart').innerHTML=svg;
const occs=[50,65,75,85,95,100];$('scenario-rows').innerHTML=occs.map(occ=>{const r=F.calculate({...x,occupancy:occ});return '<tr><td>'+occ+'%</td><td>'+num(r.residents,1)+'</td><td class="'+(r.cash<0?'negative':'positive')+'">'+signed(r.cash)+'</td><td class="'+(r.profit<0?'negative':'positive')+'">'+signed(r.profit)+'</td></tr>'}).join('')
}
function update(evt){
try{
if(evt?.target.id==='price-month'){let el=evt.target,days=$('in-days').valueAsNumber;if(!el.value.trim()||el.valueAsNumber<0||!days)throw Error('Укажите неотрицательную месячную цену и количество дней.');$('in-price').value=el.valueAsNumber/days}
if(evt?.target.id==='rent-total'){let el=evt.target,area=$('in-area').valueAsNumber;if(!el.value.trim()||el.valueAsNumber<0)throw Error('Укажите неотрицательную аренду.');if(!area&&el.valueAsNumber>0)throw Error('Для общей аренды задайте площадь больше нуля.');$('in-rentRate').value=area?el.valueAsNumber/area:0}
state=read();const r=F.calculate(state);lastResult=r;$('error').textContent='';document.body.classList.remove('has-error');
if(evt?.target.id!=='price-month')$('price-month').value=Number(r.monthlyPrice.toFixed(6));
if(evt?.target.id!=='rent-total')$('rent-total').value=Number(r.rent.toFixed(6));
$('cash').textContent=signed(r.cash);$('profit').textContent=signed(r.profit);$('mobile-cash').textContent=signed(r.cash);$('result-card').classList.toggle('negative',r.cash<0);$('result-status').textContent=Math.abs(r.cash)<0.005?'Безубыточность':r.cash>0?'Месячный денежный плюс':'Месячный денежный минус';$('delta').textContent='К исходному варианту: '+signed(r.cash-baseResult.cash);
$('result-context').textContent=num(r.residents,2)+' жителей × '+num(state.price,2)+' ₽ × '+state.days+' дней';
$('rent-summary').textContent=rub(r.rent);$('residents-summary').textContent=num(r.residents,2)+' чел.';
$('breakdown').innerHTML=line('Оплата от жителей',r.revenue)+line('НДС внутри оплаты',-r.vat)+line('Зарплаты, взносы и медсестра',-r.payroll)+line('Питание, стирка, гигиена',-r.residentCosts)+line('Питание сотрудников',-r.staffFood)+line('Остальные расходы',-r.fixed)+line('Аренда',-r.rent)+line('Эквайринг',-r.acquiring)+line('Резерв УСН',-r.usn)+line('Платёж по долгу',-r.debt)+line('Остаётся денег',r.cash,true);
$('staff-summary').innerHTML=line('Оклады: '+num(r.staffCount,2)+' ставок',r.grossPayroll)+line('Взносы '+num(state.contributions,2)+'%',r.contributions)+line('Дополнительная медсестра',state.nurse)+line('Весь расход на персонал',r.payroll,true);
state.staff.forEach((s,i)=>$('staff-total-'+i).textContent='Сумма окладов: '+rub(s.count*s.salary)+'; со взносами: '+rub(s.count*s.salary*(1+state.contributions/100)));
const bp=F.threshold(state,'price','cash',1000000),bo=F.threshold(state,'occupancy','cash',100),bpp=F.threshold(state,'price','profit',1000000);
$('threshold-price').textContent=bp===null?'Не достигается':rub(Math.ceil(bp))+'/сутки';
$('threshold-occupancy').textContent=bo===null?'Не достигается при 100%':num(bo,2)+'% ('+num(state.capacity*bo/100,2)+' жителей)';
$('threshold-profit').textContent=bpp===null?'Не достигается':rub(Math.ceil(bpp))+'/сутки';
chart(state);try{localStorage.setItem(key,JSON.stringify({version:1,inputs:state}))}catch{}
}catch(err){$('error').textContent=err.message;document.body.classList.add('has-error');$('cash').textContent='—';$('profit').textContent='—';$('mobile-cash').textContent='Проверьте поля';$('result-status').textContent='Расчёт приостановлен';lastResult=null;$('profit-chart').innerHTML='<p class="note">График появится после исправления полей.</p>';$('scenario-rows').innerHTML='';document.querySelectorAll('.staff-total').forEach(el=>el.textContent='');$('staff-summary').innerHTML=''}
}
form();$('controls').addEventListener('input',update);$('calc-form').addEventListener('submit',e=>e.preventDefault());
$('reset').onclick=()=>{state=clone(base);form();update()};
$('price4800').onclick=()=>{$('in-price').value=4800;update()};
$('export').onclick=()=>{if(!lastResult)return;const rows=[['Параметр','Значение']];F.groups.forEach(g=>g.fields.forEach(f=>rows.push([f[1],state[f[0]]])));state.staff.forEach(s=>{rows.push([s.name+' — ставок',s.count]);rows.push([s.name+' — оклад',s.salary])});rows.push(['Денежный результат за месяц',lastResult.cash],['Результат после амортизации',lastResult.profit]);const csv='\ufeff'+rows.map(r=>r.map(v=>'"'+String(v).replace(/"/g,'""')+'"').join(';')).join('\r\n'),url=URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8'})),a=document.createElement('a');a.href=url;a.download='Пансионат_мой_расчёт.csv';a.click();setTimeout(()=>URL.revokeObjectURL(url),2000)};
update();window.MalakhovkaUI={getState:()=>clone(state),getResult:()=>lastResult};
})();