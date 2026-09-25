(function(root){
'use strict';
const groups=[
{id:'income',title:'Места и стоимость проживания',note:'Среднее число жителей = количество мест × загрузка. Цена за месяц ниже считается для выбранного количества дней.',fields:[
['capacity','Количество продаваемых мест',60,1,0,5000,'Изоляционные койки не приносят выручку.'],
['occupancy','Загрузка, %',85,0.1,0,100,'Средняя загрузка в течение месяца.'],
['price','Стоимость одного места, ₽/сутки',3900,50,0,1000000,'Цена, которую платит житель, с учётом выбранного НДС.'],
['days','Дней в месяце',30,1,1,31,'В исходном десятом месяце — 30 дней.']]},
{id:'rent',title:'Аренда',note:'700 ₽/м² — полный арендный платёж. Коммунальные расходы учитываются отдельно.',fields:[
['area','Арендуемая общая площадь, м²',1843.1,0.1,0,1000000,'Площадь по проекту. В выписке ЕГРН — 903,8 м².'],
['rentRate','Аренда, ₽/м² в месяц',700,10,0,1000000,'Общая сумма аренды рассчитывается из площади.']]},
{id:'resident',title:'Расходы на проживание',note:'Расходы умножаются на среднее число жителей и число дней.',fields:[
['food','Питание жителя, ₽/сутки',380,10,0,1000000,''],
['laundry','Стирка, ₽/жителя в сутки',60,5,0,1000000,''],
['hygiene','Гигиена и расходники, ₽/жителя в сутки',90,5,0,1000000,''],
['staffFood','Питание сотрудников, ₽/день',3500,100,0,1000000,'Общий бюджет на всех сотрудников, не на одного.']]},
{id:'fixed',title:'Остальные расходы в месяц',note:'Каждая статья редактируется отдельно. Ремонт здания оценивается отдельной сметой.',fields:[
['utilities','Коммунальные ресурсы, ₽',150000,5000,0,100000000,''],
['marketing','Реклама, ₽',180000,5000,0,100000000,''],
['medical','Медицинский партнёр, ₽',100000,5000,0,100000000,''],
['accounting','Бухгалтерия и IT, ₽',35000,1000,0,100000000,''],
['waste','Вывоз отходов, ₽',30000,1000,0,100000000,''],
['service','Обслуживание и текущие работы, ₽',40000,1000,0,100000000,''],
['insurance','Страхование, ₽',15000,1000,0,100000000,''],
['extra','Дополнительные расходы, ₽',0,1000,0,100000000,'Для ваших дополнительных статей без изменения исходной модели.']]},
{id:'taxes',title:'Налоги и прочие параметры',note:'Ставки сохранены из финансовой модели. Резерв УСН — месячное управленческое допущение; это не налоговый платёжный календарь.',fields:[
['contributions','Взносы работодателя, % от окладов',30.2,0.1,0,100,'Оклады в таблице указаны до НДФЛ.'],
['acquiring','Эквайринг, % от оплаты жителей',1,0.1,0,100,''],
['vat','НДС внутри цены, %',5,0.1,0,100,'0 означает вариант без НДС. Порог перехода здесь не проверяется.'],
['usn','Резерв УСН с положительного результата, %',15,0.1,0,100,'Применяется большее: эта сумма или минимальный резерв.'],
['usnMin','Минимальный резерв УСН от выручки без НДС, %',1,0.1,0,100,''],
['nurse','Дополнительная медсестра, весь бюджет ₽/мес.',0,1000,0,100000000,'Включая взносы. Отдельно от медицинского партнёра.'],
['debt','Платёж по кредитам/лизингу, ₽/мес.',0,1000,0,100000000,'Уменьшает остаток денег. В прибыль после амортизации не входит.'],
['depreciation','Амортизация оборудования, ₽/мес.',11876510/60,1000,0,100000000,'Распределение стоимости оборудования на срок использования; не денежный платёж.']]}
];
const staff=[
['care','Персонал ухода',24,80000],
['manager','Управляющий',1,130000],
['headCare','Руководитель ухода',1,95000],
['admin','Администратор',1,90000],
['cooks','Повара',2.5,80000],
['kitchen','Кухонные работники',2.5,60000],
['cleaners','Уборка',3,60000],
['leisure','Досуг',0.5,70000],
['maintenance','Техобслуживание',0.5,80000]];
function defaults(){let x={};groups.forEach(g=>g.fields.forEach(f=>x[f[0]]=f[2]));x.staff=staff.map(s=>({id:s[0],name:s[1],count:s[2],salary:s[3]}));return x}
function calculate(x){
const residents=x.capacity*x.occupancy/100,bedDays=residents*x.days;
const revenue=bedDays*x.price,vat=revenue*x.vat/(100+x.vat),netRevenue=revenue-vat;
const grossPayroll=x.staff.reduce((s,r)=>s+r.count*r.salary,0),contributions=grossPayroll*x.contributions/100;
const payroll=grossPayroll+contributions+x.nurse;
const residentCosts=bedDays*(x.food+x.laundry+x.hygiene),staffFood=x.staffFood*x.days;
const fixed=['utilities','marketing','medical','accounting','waste','service','insurance','extra'].reduce((s,k)=>s+x[k],0);
const rent=x.area*x.rentRate,acquiring=revenue*x.acquiring/100;
const cashCosts=payroll+residentCosts+staffFood+fixed+rent+acquiring;
const ebitda=netRevenue-cashCosts,usn=Math.max(Math.max(ebitda,0)*x.usn/100,netRevenue*x.usnMin/100);
return {residents,bedDays,revenue,vat,netRevenue,grossPayroll,contributions,payroll,residentCosts,staffFood,fixed,rent,acquiring,cashCosts,ebitda,usn,cash:ebitda-usn-x.debt,profit:ebitda-usn-x.depreciation,depreciation:x.depreciation,debt:x.debt,monthlyPrice:x.price*x.days,staffCount:x.staff.reduce((s,r)=>s+r.count,0)}
}
function threshold(x,key,target,max){
let y={...x};y[key]=0;if(calculate(y)[target]>=0)return 0;y[key]=max;if(calculate(y)[target]<0)return null;
let lo=0,hi=max;for(let i=0;i<55;i++){const mid=(lo+hi)/2;y[key]=mid;if(calculate(y)[target]>=0)hi=mid;else lo=mid}return hi
}
root.MalakhovkaFinance={groups,staff,defaults,calculate,threshold};
})(typeof window==='undefined'?globalThis:window);