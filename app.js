
import { FOOD_DATABASE } from './data/foodDatabase.js';
import { SUPPLEMENT_DATABASE } from './data/supplementDatabase.js';
import { EXERCISE_DATABASE, SPLITS } from './data/exerciseDatabase.js';

const STORE='stayfitinlife_stable_1_0_4_clean';
const APP_VERSION='Stable Version 1.0.4 Clean';
const LAST_UPDATED='April 26, 2026';

const q=(id)=>document.getElementById(id);
const main=q('main');

function todayKey(){
  const d=new Date();
  const y=d.getFullYear();
  const m=String(d.getMonth()+1).padStart(2,'0');
  const day=String(d.getDate()).padStart(2,'0');
  return `${y}-${m}-${day}`;
}
function localDateLabel(d){return new Date(d+'T00:00:00').toLocaleDateString();}
function yesterdayKey(){
  const d=new Date(); d.setDate(d.getDate()-1);
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}
function round(n,d=1){return Math.round((Number(n)||0)*10**d)/10**d}
function uid(){return Math.random().toString(36).slice(2)+Date.now().toString(36)}

const defaultData={
  profile:{},
  units:{system:'metric'},
  introSeen:false,
  selectedDate:todayKey(),
  meals:{},
  water:{},
  workouts:{},
  recovery:{},
  weights:[],
  coachPlans:{},
  customFoods:[],
  customExercises:[],
  dayClosures:{},
  notifications:[],
  barcodeCache:{},
  aiCoachUsage:{date:todayKey(),count:0},
  aiCache:{}
};

let data=loadData();
let tab='home';
let onboardingStep=0;
let onboardingTemp={};
let selectedDate=todayKey();
let nutritionMeal='Breakfast';
let nutritionCategory='Cuisines';
let selectedCuisine='Indian';
let selectedIndianSub='All';
let foodSearchValue='';
let selectedWorkoutTab='Strength';
let tempSets=[];
let restTimer=null;
let restRemaining=0;
let scanner=null;

function loadData(){
  try{
    const raw=localStorage.getItem(STORE);
    if(raw) return {...structuredClone(defaultData),...JSON.parse(raw)};
    // migrate from earlier stores if user has data
    const keys=Object.keys(localStorage).filter(k=>k.startsWith('stayfitinlife_')).sort().reverse();
    for(const k of keys){
      try{
        const d=JSON.parse(localStorage.getItem(k));
        if(d&&d.profile) return {...structuredClone(defaultData),...d,selectedDate:todayKey()};
      }catch(e){}
    }
  }catch(e){}
  return structuredClone(defaultData);
}
function saveData(){localStorage.setItem(STORE,JSON.stringify(data));render();}
function persist(){localStorage.setItem(STORE,JSON.stringify(data))}
function profileComplete(){return !!(data.profile&&data.profile.name&&data.profile.age&&data.profile.height&&data.profile.currentWeight&&data.profile.targetWeight)}
function isImperial(){return (data.units?.system||data.profile.unitsSystem||'metric')==='imperial'}
function unitLabels(){return isImperial()?{weight:'lb',height:'ft/in',water:'oz',workout:'lb'}:{weight:'kg',height:'cm',water:'L',workout:'kg'}}
function kgToLb(kg){return round((Number(kg)||0)*2.20462,1)}
function lbToKg(lb){return round((Number(lb)||0)*0.453592,1)}
function cmToFtIn(cm){const inches=Math.round((Number(cm)||0)/2.54);return{ft:Math.floor(inches/12),inch:inches%12}}
function ftInToCm(ft,inch){return round(((Number(ft)||0)*12+(Number(inch)||0))*2.54,1)}
function displayWeight(kg){return isImperial()?kgToLb(kg):round(kg,1)}
function inputWeightToKg(v){return isImperial()?lbToKg(v):Number(v)}
function displayHeight(cm){if(isImperial()){const h=cmToFtIn(cm);return `${h.ft}'${h.inch}"`}return `${round(cm,1)} cm`}
function displayWater(l){return isImperial()?`${round(l*33.814,1)} oz`:`${round(l,2)} L`}

function meals(date=selectedDate){return data.meals[date]||[]}
function workouts(date=selectedDate){return data.workouts[date]||[]}
function waterEntries(date=selectedDate){return data.water[date]||[]}
function waterTotal(date=selectedDate){return round(waterEntries(date).reduce((a,x)=>a+(Number(x.amount)||0),0)/1000,2)}
function mealTotals(date=selectedDate){
  return meals(date).reduce((a,x)=>({cal:a.cal+(Number(x.calories)||0)*(Number(x.qty)||1),p:a.p+(Number(x.protein)||0)*(Number(x.qty)||1),c:a.c+(Number(x.carbs)||0)*(Number(x.qty)||1),f:a.f+(Number(x.fats)||0)*(Number(x.qty)||1)}),{cal:0,p:0,c:0,f:0})
}
function workoutCalories(date=selectedDate){return workouts(date).reduce((a,w)=>a+(Number(w.caloriesBurned)||0),0)}
function targets(){
  const p=data.profile||{};
  const kg=Number(p.currentWeight||75);
  const goal=p.goal||'Fat Loss';
  const base=Math.round(10*kg+6.25*(Number(p.height)||170)-5*(Number(p.age)||35)+5);
  const activity=(p.activity==='High'?1.55:p.activity==='Low'?1.2:1.35);
  let calories=Math.round(base*activity);
  if(goal==='Fat Loss')calories-=450;
  if(goal==='Muscle Gain')calories+=250;
  calories=Math.max(1200,calories);
  return {calories,protein:Math.round(kg*1.8),carbs:Math.round((calories*.42)/4),fats:Math.round((calories*.25)/9),water:round(kg*0.045,1)}
}
function dayMetrics(date=selectedDate){
  const t=targets(), m=mealTotals(date), burned=workoutCalories(date);
  const adjustedCalories=t.calories+burned;
  const deficit=adjustedCalories-m.cal;
  return {targets:t,meals:m,burned,adjustedCalories,deficit,netCalories:m.cal-burned}
}
function deficitText(v){if(v>0)return `${Math.round(v)} kcal remaining / deficit`; if(v<0)return `${Math.abs(Math.round(v))} kcal surplus`; return 'On target'}

function setTab(t){tab=t;document.querySelectorAll('[data-tab],[data-mobile-tab]').forEach(b=>b.classList.remove('active'));document.querySelectorAll(`[data-tab="${t}"],[data-mobile-tab="${t}"]`).forEach(b=>b.classList.add('active'));render()}
function shell(title,subtitle,html){main.innerHTML=`<header class="page-header"><div><h1>${title}</h1><p>${subtitle||''}</p></div></header>${html}`}
function dateSelectorHtml(){
  return `<div class="date-selector pill-row">
    <button class="pill ${selectedDate===todayKey()?'active':''}" id="dateToday">Today</button>
    <button class="pill ${selectedDate===yesterdayKey()?'active':''}" id="dateYesterday">Yesterday</button>
    <input id="datePicker" type="date" value="${selectedDate}">
  </div>`
}
function bindDateSelector(){
  q('dateToday')?.addEventListener('click',()=>{selectedDate=todayKey();data.selectedDate=selectedDate;persist();render()});
  q('dateYesterday')?.addEventListener('click',()=>{selectedDate=yesterdayKey();data.selectedDate=selectedDate;persist();render()});
  q('datePicker')?.addEventListener('change',e=>{selectedDate=e.target.value;data.selectedDate=selectedDate;persist();render()});
}
function todayEditable(){return selectedDate===todayKey()}

function renderOnboarding(){
  if(onboardingStep===0){
    shell('Welcome','Set up your profile to start.',`<div class="panel onboarding-page"><div class="panel-title">Welcome to STAYFITINLIFE</div><p class="muted">Track nutrition, workouts, recovery and get coach guidance.</p><button class="btn primary" id="startOnboarding">Start Onboarding</button></div>`);
    q('startOnboarding').onclick=()=>{onboardingStep=1;onboardingTemp={...data.profile,unitsSystem:data.units.system||'metric'};render()};
    return;
  }
  if(onboardingStep===1){
    const t=onboardingTemp; const h=cmToFtIn(t.height||162.5);
    data.units.system=t.unitsSystem||data.units.system||'metric';
    shell('Onboarding','Step 1 of 2 — Basic Info',`<div class="panel onboarding-page">
      <div class="onboarding-progress"><span style="width:50%"></span></div>
      <div class="panel-title">Preferred Units</div>
      <div class="pill-row">
        <button class="pill ${data.units.system==='metric'?'active':''}" data-unit="metric">Metric (kg, cm, L)</button>
        <button class="pill ${data.units.system==='imperial'?'active':''}" data-unit="imperial">Imperial (lb, ft/in, oz)</button>
      </div>
      <div class="form-grid">
        <div class="field"><label>Name</label><input id="obName" value="${t.name||''}"></div>
        <div class="field"><label>Age</label><input id="obAge" type="number" value="${t.age||''}"></div>
        ${isImperial()?`<div class="field"><label>Height</label><div class="inline-fields"><input id="obFt" type="number" value="${h.ft||5}"><span>ft</span><input id="obIn" type="number" value="${h.inch||4}"><span>in</span></div></div>`:`<div class="field"><label>Height (cm)</label><input id="obCm" type="number" step="0.1" value="${t.height||''}" placeholder="162.5"></div>`}
        <div class="field"><label>Current Weight (${unitLabels().weight})</label><input id="obWeight" type="number" step="0.1" value="${t.currentWeight?displayWeight(t.currentWeight):''}"></div>
      </div>
      <button class="btn primary" id="obNext">Next: Goal</button>
    </div>`);
    document.querySelectorAll('[data-unit]').forEach(b=>b.onclick=()=>{onboardingTemp.unitsSystem=b.dataset.unit;data.units.system=b.dataset.unit;render()});
    q('obNext').onclick=()=>{
      onboardingTemp.name=q('obName').value.trim();
      onboardingTemp.age=q('obAge').value;
      onboardingTemp.unitsSystem=data.units.system;
      onboardingTemp.height=isImperial()?ftInToCm(q('obFt').value,q('obIn').value):Number(q('obCm').value);
      onboardingTemp.currentWeight=inputWeightToKg(q('obWeight').value);
      if(!onboardingTemp.name||!onboardingTemp.age||!onboardingTemp.height||!onboardingTemp.currentWeight){alert('Please complete all fields.');return}
      onboardingStep=2;render();
    };
    return;
  }
  const t=onboardingTemp;
  shell('Onboarding','Step 2 of 2 — Goal Setup',`<div class="panel onboarding-page">
    <div class="onboarding-progress"><span style="width:100%"></span></div>
    <div class="choice-list">
      ${['Fat Loss','Muscle Gain','Maintenance'].map(g=>`<button class="choice-btn ${t.goal===g?'active':''}" data-goal="${g}">${g}</button>`).join('')}
    </div>
    <div class="form-grid">
      <div class="field"><label>Target Weight (${unitLabels().weight})</label><input id="targetWeight" type="number" step="0.1" value="${t.targetWeight?displayWeight(t.targetWeight):''}"></div>
      <div class="field"><label>Target Body Fat %</label><input id="targetFat" type="number" step="0.1" value="${t.targetBodyFat||''}"></div>
      <div class="field"><label>Timeline Weeks</label><select id="timeline">${[6,8,10,12,16,20,24].map(w=>`<option ${String(t.timelineWeeks||10)===String(w)?'selected':''}>${w}</option>`).join('')}</select></div>
      <div class="field"><label>Activity</label><select id="activity">${['Low','Moderate','High'].map(x=>`<option ${t.activity===x?'selected':''}>${x}</option>`).join('')}</select></div>
      <div class="field"><label>Diet</label><select id="diet">${['Mixed','Veg','Non-Veg','Vegan'].map(x=>`<option ${t.diet===x?'selected':''}>${x}</option>`).join('')}</select></div>
      <div class="field"><label>Mode</label><select id="mode">${['Beginner','Advanced'].map(x=>`<option ${t.mode===x?'selected':''}>${x}</option>`).join('')}</select></div>
    </div>
    <label class="item"><input id="legalAccept" type="checkbox"> I accept Privacy Policy, Terms and AI Disclaimer for ${APP_VERSION}.</label>
    <div style="display:flex;gap:10px;flex-wrap:wrap"><button class="btn" id="obBack">Back</button><button class="btn primary" id="finishOnboarding">Generate My Plan</button></div>
  </div>`);
  document.querySelectorAll('[data-goal]').forEach(b=>b.onclick=()=>{onboardingTemp.goal=b.dataset.goal;render()});
  q('obBack').onclick=()=>{onboardingStep=1;render()};
  q('finishOnboarding').onclick=()=>{
    if(!q('legalAccept').checked){alert('Please accept legal documents.');return}
    onboardingTemp.targetWeight=inputWeightToKg(q('targetWeight').value);
    onboardingTemp.targetBodyFat=q('targetFat').value;
    onboardingTemp.timelineWeeks=q('timeline').value;
    onboardingTemp.activity=q('activity').value;
    onboardingTemp.diet=q('diet').value;
    onboardingTemp.mode=q('mode').value;
    onboardingTemp.goal=onboardingTemp.goal||'Fat Loss';
    if(!onboardingTemp.targetWeight){alert('Enter target weight.');return}
    data.profile={...onboardingTemp,startWeight:onboardingTemp.currentWeight,legalAccepted:true,legalVersion:APP_VERSION,legalAcceptedAt:new Date().toISOString()};
    data.units.system=onboardingTemp.unitsSystem||data.units.system||'metric';
    data.introSeen=false;
    onboardingStep=0;
    saveData();
  };
}

function home(){
  const d=dayMetrics(selectedDate), m=d.meals, t=d.targets, calPct=Math.min(100,Math.round(m.cal/Math.max(1,d.adjustedCalories)*100));
  shell('Dashboard',`${localDateLabel(selectedDate)} ${dateSelectorHtml()}`,`<div class="desktop-dashboard-grid">
    <div class="dashboard-main">
      <div class="hero-card dashboard-fixed">
        <div class="calorie-ring" style="--p:${calPct}"><div><strong>${calPct}%</strong><span>${Math.round(m.cal)} / ${d.adjustedCalories} kcal</span></div></div>
        <div class="hero-copy">
          <div class="mode-badge">${data.profile.mode||'Advanced'} Mode</div>
          <h2>${todayEditable()?'Today’s Targets + Insights':'History View'}</h2>
          <div class="item">Base Target: ${t.calories} kcal<br>Calories Burned: ${d.burned} kcal<br>Adjusted Target: ${d.adjustedCalories} kcal<br><strong>${deficitText(d.deficit)}</strong></div>
          ${todayEditable()?`<div class="hero-actions"><button class="btn primary" id="smartPlan">Generate Coach Plan</button><button class="btn" id="finishDayBtn">Finish Day</button></div>`:''}
        </div>
      </div>
      <div class="panel"><div class="panel-title">Nutrition Progress</div>${progressBar('Protein',m.p,t.protein,'g')}${progressBar('Carbs',m.c,t.carbs,'g')}${progressBar('Fats',m.f,t.fats,'g')}${progressBar('Water',waterTotal(selectedDate),t.water,'L')}</div>
      <div class="panel"><div class="panel-title">Workout Preview</div>${workouts(selectedDate).length?workouts(selectedDate).map(w=>`<div class="item"><strong>${w.name}</strong><br>${w.category||'Strength'} • ${w.caloriesBurned||0} kcal</div>`).join(''):'<div class="item">Workout Missing</div>'}</div>
      <div class="panel"><div class="panel-title">Coach Suggestion</div><div class="item">${coachSuggestion()}</div></div>
    </div>
    <aside class="desktop-coach-panel">${coachPanelHtml()}</aside>
  </div>`);
  bindDateSelector();
  q('smartPlan')&&(q('smartPlan').onclick=generateCoachPlan);
  q('finishDayBtn')&&(q('finishDayBtn').onclick=()=>finishDay(selectedDate,false));
}
function progressBar(label,val,target,unit){const pct=Math.min(100,Math.round((Number(val)||0)/Math.max(1,Number(target)||1)*100));return `<div class="progress-row"><div><strong>${label}</strong><span>${round(val,1)} / ${target} ${unit}</span></div><div class="bar"><i style="width:${pct}%"></i></div></div>`}
function coachSuggestion(){
  const r=remainingMacros();
  if(r.protein>40)return `Protein is low. Consider whey protein or high-protein food: chicken, eggs, paneer, curd.`;
  if(r.cal>600)return `Plan the next meals around ${r.cal} kcal remaining. Keep protein strong.`;
  return `You are close to your targets. Keep remaining meals light and balanced.`;
}
function coachPanelHtml(){
  return `<div class="panel"><div class="panel-title">Coach</div><div class="item">${coachSuggestion()}</div><button class="btn primary" onclick="window.SFL_openCoach()">Open Coach</button></div>`
}
window.SFL_openCoach=()=>setTab('coach');

function remainingMacros(){
  const d=dayMetrics(todayKey()), t=d.targets, m=d.meals;
  return {cal:Math.max(0,Math.round(d.adjustedCalories-m.cal)),protein:Math.max(0,Math.round(t.protein-m.p)),carbs:Math.max(0,Math.round(t.carbs-m.c)),fats:Math.max(0,Math.round(t.fats-m.f))}
}

const NUTRITION_CATEGORIES=['Cuisines','Fruits','Vegetables','Drinks','Alcohol','Cheat Meals','Sauces','Supplements','Custom'];
const CUISINES=['Global / Basic','Indian','American','Italian','Chinese','Japanese','Korean','Thai','Mexican','Mediterranean','Arabic / Middle Eastern'];
const INDIAN_SUBCATEGORIES=['All','Chicken','Paneer','Chaap','Dal / Pulses','Rice & Roti','Breakfast','Chicken - Tandoori','Paneer - Curry','Paneer - Dry','Chaap - Curry','Street','Desserts','High Protein'];
const CUSTOM_PORTIONS=[['per 100g','per 100g'],['serving','1 serving'],['bowl','1 bowl'],['cup','1 cup'],['tbsp','1 tbsp / spoon'],['tsp','1 tsp'],['piece','1 piece']];
function allFoods(){return [...FOOD_DATABASE,...SUPPLEMENT_DATABASE,...(data.customFoods||[])]}
function topCat(f){if(f.main==='Custom')return'Custom';return f.main||'Cuisines'}
function itemCuisine(f){return f.cuisine||(f.main==='Cuisines'?'Indian':'Global / Basic')}
function indianSub(f){
  const s=`${f.name||''} ${f.sub||''}`.toLowerCase();
  if(s.includes('tandoori'))return 'Chicken - Tandoori';
  if(s.includes('paneer')&&(s.includes('curry')||s.includes('masala')||s.includes('butter')))return 'Paneer - Curry';
  if(s.includes('paneer'))return 'Paneer';
  if(s.includes('chaap')&&s.includes('curry'))return 'Chaap - Curry';
  if(s.includes('chaap'))return 'Chaap';
  if(s.includes('rice')||s.includes('roti')||s.includes('naan')||s.includes('biryani')||s.includes('paratha'))return 'Rice & Roti';
  if(s.includes('dal')||s.includes('rajma')||s.includes('chole'))return 'Dal / Pulses';
  if(s.includes('idli')||s.includes('dosa')||s.includes('poha')||s.includes('upma'))return 'Breakfast';
  if(s.includes('chaat')||s.includes('samosa')||s.includes('pav'))return 'Street';
  if(s.includes('halwa')||s.includes('kheer')||s.includes('gulab'))return 'Desserts';
  if((Number(f.protein)||0)>=15)return 'High Protein';
  if(s.includes('chicken'))return 'Chicken';
  return f.sub||'All';
}
function visibleFoods(search=''){
  const s=search.trim().toLowerCase();
  let list=allFoods();
  if(s)return list.filter(f=>`${f.name||''} ${f.main||''} ${f.sub||''} ${f.cuisine||''} ${f.barcode||''}`.toLowerCase().includes(s));
  list=list.filter(f=>topCat(f)===nutritionCategory);
  if(nutritionCategory==='Cuisines'){
    list=list.filter(f=>itemCuisine(f)===selectedCuisine);
    if(selectedCuisine==='Indian'&&selectedIndianSub!=='All')list=list.filter(f=>indianSub(f)===selectedIndianSub||f.sub===selectedIndianSub);
  }
  return list;
}
function nutrition(){
  shell('Nutrition',`${dateSelectorHtml()}`,`<div class="panel nutrition-clean">
    <div class="pill-row">${['Breakfast','Lunch','Dinner','Snacks'].map(m=>`<button class="pill ${nutritionMeal===m?'active':''}" data-meal="${m}">${m}</button>`).join('')}</div>
    <div class="category-grid">${NUTRITION_CATEGORIES.map(c=>`<button class="category-card ${nutritionCategory===c?'active':''}" data-cat="${c}">${c}</button>`).join('')}</div>
    ${nutritionCategory==='Cuisines'?`<div class="pill-row">${CUISINES.map(c=>`<button class="pill ${selectedCuisine===c?'active':''}" data-cuisine="${c}">${c}</button>`).join('')}</div>`:''}
    ${nutritionCategory==='Cuisines'&&selectedCuisine==='Indian'?`<div class="pill-row">${INDIAN_SUBCATEGORIES.map(s=>`<button class="pill ${selectedIndianSub===s?'active':''}" data-isub="${s}">${s}</button>`).join('')}</div>`:''}
    <div class="field sticky-search"><label>Search / Barcode</label><input id="foodSearch" placeholder="Search food, cuisine, sauce or barcode" value="${foodSearchValue}" autocomplete="off"></div>
    <div style="display:flex;gap:10px;flex-wrap:wrap;margin:12px 0">
      <button class="btn" id="addCustomFoodBtn">+ Custom Food</button>
      <button class="btn primary" id="scanBarcode">📷 Scan Barcode</button>
      <button class="btn" id="manualBarcode">⌨️ Enter Barcode</button>
    </div>
    <div id="foodList" class="food-list-clean"></div>
  </div>
  <div class="panel"><div class="panel-title">Water Log</div>${todayEditable()?`<button class="btn" data-water="250">+250ml</button><button class="btn" data-water="500">+500ml</button><button class="btn" data-water="1000">+1L</button><button class="btn" id="customWaterBtn">+ Custom</button>`:''}<div class="item">Total: ${displayWater(waterTotal(selectedDate))}</div></div>
  <div class="panel"><div class="panel-title">Logs for ${localDateLabel(selectedDate)}</div>${meals(selectedDate).length?meals(selectedDate).map(x=>`<div class="log-card"><strong>${x.name}</strong><br>${x.meal} • ${x.timeLabel||''}<br>${x.calories||0} kcal • P${x.protein||0} C${x.carbs||0} F${x.fats||0}</div>`).join(''):'<div class="item">No logs.</div>'}</div>`);
  bindDateSelector();
  document.querySelectorAll('[data-meal]').forEach(b=>b.onclick=()=>{nutritionMeal=b.dataset.meal;render()});
  document.querySelectorAll('[data-cat]').forEach(b=>b.onclick=()=>{nutritionCategory=b.dataset.cat;selectedIndianSub='All';render()});
  document.querySelectorAll('[data-cuisine]').forEach(b=>b.onclick=()=>{selectedCuisine=b.dataset.cuisine;selectedIndianSub='All';render()});
  document.querySelectorAll('[data-isub]').forEach(b=>b.onclick=()=>{selectedIndianSub=b.dataset.isub;render()});
  const search=q('foodSearch'); search.oninput=()=>{foodSearchValue=search.value;renderFoodListOnly();search.focus()};
  q('addCustomFoodBtn').onclick=()=>customFoodForm();
  q('scanBarcode').onclick=openBarcodeScanner;
  q('manualBarcode').onclick=()=>{const code=prompt('Enter barcode number');if(code)handleBarcodeResult(code)};
  document.querySelectorAll('[data-water]').forEach(b=>b.onclick=()=>addWater(Number(b.dataset.water)));
  q('customWaterBtn')&&(q('customWaterBtn').onclick=()=>{const ml=Number(prompt('Enter water amount in ml','750')||0);if(ml>0)addWater(ml)});
  renderFoodListOnly();
}
function renderFoodListOnly(){
  const box=q('foodList'); if(!box)return;
  const list=visibleFoods(foodSearchValue).slice(0,150);
  box.innerHTML=list.length?list.map((f,i)=>{
    const ci=f.main==='Custom'?data.customFoods.findIndex(x=>x.id===f.id||x.name===f.name&&x.calories===f.calories):-1;
    return `<div class="food-card-clean"><div><strong>${f.name}</strong><br><span>${topCat(f)} → ${f.sub||itemCuisine(f)||''}</span><br><small>${f.portion||''} • ${f.calories||0} kcal • P${f.protein||0} C${f.carbs||0} F${f.fats||0}</small></div><div class="food-card-actions">${todayEditable()?`<button class="btn primary" data-addfood="${i}">Add</button>`:''}${ci>=0?`<button class="btn" data-editcf="${ci}">Edit</button><button class="btn danger" data-delcf="${ci}">Delete</button>`:''}</div></div>`
  }).join(''):'<div class="item">No foods found.</div>';
  document.querySelectorAll('[data-addfood]').forEach(b=>b.onclick=()=>logFood(list[Number(b.dataset.addfood)]));
  document.querySelectorAll('[data-editcf]').forEach(b=>b.onclick=()=>customFoodForm(data.customFoods[Number(b.dataset.editcf)],Number(b.dataset.editcf)));
  document.querySelectorAll('[data-delcf]').forEach(b=>b.onclick=()=>deleteCustomFood(Number(b.dataset.delcf)));
}
function customFoodForm(existing=null,index=null){
  const f=existing||{}, modal=q('modal'), card=q('modalCard');
  modal.classList.remove('hidden');
  card.innerHTML=`<div class="panel-title">${existing?'Edit':'Add'} Custom Food</div><div class="form-grid custom-food-form">
    <div class="field"><label>Food Name</label><input id="cfName" value="${f.name||''}" placeholder="e.g., Lauki Sabzi"></div>
    <div class="field"><label>Serving / Portion Type</label><select id="cfUnit">${CUSTOM_PORTIONS.map(([v,l])=>`<option value="${v}" ${f.unit===v?'selected':''}>${l}</option>`).join('')}</select></div>
    <div class="field"><label>Portion Display</label><input id="cfPortion" value="${f.portion||''}" placeholder="e.g., 1 cup / 150g"></div>
    <div class="field"><label>Calories</label><input id="cfCal" type="number" step="0.1" value="${f.calories??''}"></div>
    <div class="field"><label>Protein (g)</label><input id="cfProtein" type="number" step="0.1" value="${f.protein??''}"></div>
    <div class="field"><label>Carbs (g)</label><input id="cfCarbs" type="number" step="0.1" value="${f.carbs??''}"></div>
    <div class="field"><label>Fats (g)</label><input id="cfFats" type="number" step="0.1" value="${f.fats??''}"></div>
  </div><div style="display:flex;gap:10px;flex-wrap:wrap"><button class="btn primary" id="saveCF">${existing?'Save Changes':'Save Food'}</button><button class="btn" id="cancelCF">Cancel</button></div>`;
  q('cancelCF').onclick=()=>{modal.classList.add('hidden');card.innerHTML=''};
  q('saveCF').onclick=()=>{
    const food={id:f.id||uid(),main:'Custom',sub:'User Food',name:q('cfName').value.trim(),defaultQty:1,unit:q('cfUnit').value,portion:q('cfPortion').value.trim()||q('cfUnit').selectedOptions[0].textContent,calories:Number(q('cfCal').value||0),protein:Number(q('cfProtein').value||0),carbs:Number(q('cfCarbs').value||0),fats:Number(q('cfFats').value||0)};
    if(!food.name){alert('Enter food name.');return}
    if(index!==null)data.customFoods[index]=food;else data.customFoods.push(food);
    persist();modal.classList.add('hidden');card.innerHTML='';nutritionCategory='Custom';render();
  }
}
function deleteCustomFood(i){if(confirm('Delete this custom food? Past logs remain unchanged.')){data.customFoods.splice(i,1);saveData()}}
function logFood(f){
  if(!todayEditable()){alert('Past dates are view-only.');return}
  data.meals[selectedDate]=data.meals[selectedDate]||[];
  data.meals[selectedDate].push({...f,meal:nutritionMeal,qty:f.defaultQty||1,time:Date.now(),timeLabel:new Date().toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'})});
  persist();showPostMealCoach(nutritionMeal);render();
}
function showPostMealCoach(meal){
  const r=remainingMacros();
  data.notifications.unshift({time:Date.now(),type:'coach',message:`${meal} logged. Remaining: ${r.cal} kcal and ${r.protein}g protein. ${coachSuggestion()}`});
}
function addWater(ml){if(!todayEditable())return alert('Past dates are view-only.');data.water[selectedDate]=data.water[selectedDate]||[];data.water[selectedDate].push({amount:ml,time:Date.now()});saveData()}

async function handleBarcodeResult(code){
  try{
    if(!code)return;
    data.barcodeCache=data.barcodeCache||{};
    if(data.barcodeCache[code]){logFood(data.barcodeCache[code]);return}
    const res=await fetch(`https://world.openfoodfacts.org/api/v0/product/${encodeURIComponent(code)}.json`);
    const js=await res.json();
    if(!js||js.status!==1||!js.product){alert('Product not found. Add manually.');return}
    const p=js.product,n=p.nutriments||{};
    const food={main:'Barcode',sub:'OpenFoodFacts',name:p.product_name||`Barcode ${code}`,barcode:code,defaultQty:1,unit:'serving',portion:p.serving_size||'1 serving',calories:round(n['energy-kcal_serving']??n['energy-kcal_100g']??0,1),protein:round(n.proteins_serving??n.proteins_100g??0,1),carbs:round(n.carbohydrates_serving??n.carbohydrates_100g??0,1),fats:round(n.fat_serving??n.fat_100g??0,1)};
    data.barcodeCache[code]=food;persist();logFood(food);
  }catch(e){alert('Barcode lookup failed. Please add manually.')}
}
async function openBarcodeScanner(){
  const modal=q('modal'),card=q('modalCard');modal.classList.remove('hidden');
  card.innerHTML=`<div class="panel-title">Scan Barcode</div><div class="scanner-wrap"><div id="html5ScannerRoot" class="scanner-box"></div><div class="scan-frame">Align barcode here</div></div><div class="suggestion" id="scannerStatus">Starting scanner...</div><div style="display:flex;gap:10px;flex-wrap:wrap"><button class="btn" id="manualScan">Enter Barcode</button><button class="btn primary" id="closeScanner">Close</button></div>`;
  const close=async()=>{try{if(scanner){await scanner.stop();await scanner.clear();scanner=null}}catch(e){}modal.classList.add('hidden');card.innerHTML=''};
  q('closeScanner').onclick=close;
  q('manualScan').onclick=async()=>{const c=prompt('Enter barcode');await close();if(c)handleBarcodeResult(c)};
  if(!window.Html5Qrcode){q('scannerStatus').innerHTML='Scanner unavailable. Use Enter Barcode.';return}
  try{
    scanner=new Html5Qrcode('html5ScannerRoot');
    await scanner.start({facingMode:'environment'},{fps:10,qrbox:{width:260,height:120}},async txt=>{q('scannerStatus').innerHTML='Detected '+txt;if(navigator.vibrate)navigator.vibrate(120);await close();handleBarcodeResult(txt)},()=>{});
    q('scannerStatus').innerHTML='Scanning...';
  }catch(e){q('scannerStatus').innerHTML='Camera could not start. Use Enter Barcode.'}
}

const CARDIO_ACTIVITIES=["Walking","Incline Walking","Jogging","Running","Cycling","Stationary Bike","Elliptical","Stair Climber","Rowing Machine","Skipping / Jump Rope","Swimming","HIIT"];
const SPORTS_ACTIVITIES=["Football / Soccer","Cricket","Basketball","Badminton","Tennis","Table Tennis","Volleyball","Boxing","Martial Arts","Hiking","Yoga","Pilates","Dance / Zumba","CrossFit"];
const METS={Walking:3.5,"Incline Walking":5.5,Jogging:7,Running:10,Cycling:7.5,"Stationary Bike":6.5,Elliptical:5.5,"Stair Climber":8.8,"Rowing Machine":7,"Skipping / Jump Rope":11,Swimming:8,HIIT:10,"Football / Soccer":8,Cricket:5,Basketball:8,Badminton:5.5,Tennis:7,"Table Tennis":4,Volleyball:4.5,Boxing:9,"Martial Arts":10,Hiking:6,Yoga:3,Pilates:3.5,"Dance / Zumba":6.5,CrossFit:10};
function caloriesForActivity(a,dur,intensity){const factor=intensity==='Light'?0.8:intensity==='Intense'?1.25:1;return Math.round((METS[a]||6)*(Number(data.profile.currentWeight)||75)*(Number(dur)||0)/60*factor)}
function exerciseList(){const base=[];Object.entries(EXERCISE_DATABASE).forEach(([body,arr])=>arr.forEach(name=>base.push({name,bodyPart:body,equipment:'Any'})));return [...base,...data.customExercises]}
function workout(){
  shell('Workouts',`${dateSelectorHtml()}`,`<div class="panel"><div class="pill-row">${['Strength','Cardio','Sports','Custom Exercises'].map(t=>`<button class="pill ${selectedWorkoutTab===t?'active':''}" data-wtab="${t}">${t}</button>`).join('')}</div><div id="workoutForm"></div></div><div class="panel"><div class="panel-title">Activity for ${localDateLabel(selectedDate)}</div>${workouts(selectedDate).length?workouts(selectedDate).map((w,i)=>`<div class="log-card"><strong>${w.name}</strong><br>${w.category} • ${w.caloriesBurned||0} kcal<br>${(w.sets||[]).map(s=>`[${s.type}] ${s.exercise}: ${s.weight} x ${s.reps}`).join('<br>')}${todayEditable()?`<br><button class="btn danger" data-delw="${i}">Delete</button>`:''}</div>`).join(''):'<div class="item">Workout Missing</div>'}</div>`);
  bindDateSelector();
  document.querySelectorAll('[data-wtab]').forEach(b=>b.onclick=()=>{selectedWorkoutTab=b.dataset.wtab;renderWorkoutForm()});
  document.querySelectorAll('[data-delw]').forEach(b=>b.onclick=()=>{data.workouts[selectedDate].splice(Number(b.dataset.delw),1);saveData()});
  renderWorkoutForm();
}
function renderWorkoutForm(){
  const box=q('workoutForm'); if(!box)return;
  if(selectedWorkoutTab==='Strength'){
    const exs=exerciseList();
    box.innerHTML=`<div class="form-grid"><div class="field"><label>Workout Name</label><input id="wName" placeholder="Pull / Push / Legs"></div><div class="field"><label>Exercise</label><select id="exSel">${exs.map(e=>`<option>${e.name}</option>`).join('')}</select></div><div class="field"><label>Body Part</label><select id="bodySel">${Object.keys(EXERCISE_DATABASE).map(b=>`<option>${b}</option>`).join('')}</select></div><div class="field"><label>Set Type</label><select id="setType"><option>Working</option><option>Warmup</option></select></div><div class="field"><label>Weight (${unitLabels().workout})</label><input id="setWeight" type="number" step="0.5"></div><div class="field"><label>Reps</label><input id="setReps" type="number"></div></div><button class="btn primary" id="addSet">Add Set</button><button class="btn" id="saveWorkout">Save Workout</button><button class="btn" id="addCustomExercise">+ Custom Exercise</button><div id="setLog" class="suggestion"></div>`;
    const refresh=()=>q('setLog').innerHTML=tempSets.length?tempSets.map(s=>`<div class="item">[${s.type}] ${s.exercise} • ${s.weight} x ${s.reps}<br>${workoutPush(s)}</div>`).join(''):'No sets yet.';
    q('addSet').onclick=()=>{const set={exercise:q('exSel').value,bodyPart:q('bodySel').value,type:q('setType').value,weight:q('setWeight').value,reps:q('setReps').value,setNo:tempSets.length+1};tempSets.push(set);refresh();startRestTimer(restSeconds(set))};
    q('saveWorkout').onclick=()=>{if(!todayEditable())return alert('Past dates are view-only.');if(!tempSets.length)return alert('Add sets first.');const volume=tempSets.reduce((a,s)=>a+(Number(s.weight)||0)*(Number(s.reps)||0),0);data.workouts[selectedDate]=data.workouts[selectedDate]||[];data.workouts[selectedDate].push({name:q('wName').value||[...new Set(tempSets.map(s=>s.bodyPart))].join(' + ')||'Strength Workout',category:'Strength',sets:[...tempSets],muscles:[...new Set(tempSets.map(s=>s.bodyPart))],volume,caloriesBurned:Math.round(volume/20)});tempSets=[];saveData()};
    q('addCustomExercise').onclick=customExerciseForm;refresh();
  } else if(selectedWorkoutTab==='Cardio'||selectedWorkoutTab==='Sports'){
    const list=selectedWorkoutTab==='Cardio'?CARDIO_ACTIVITIES:SPORTS_ACTIVITIES;
    box.innerHTML=`<div class="form-grid"><div class="field"><label>${selectedWorkoutTab}</label><select id="act">${list.map(x=>`<option>${x}</option>`).join('')}</select></div><div class="field"><label>Duration (min)</label><input id="dur" type="number"></div><div class="field"><label>Distance optional</label><input id="dist" type="number" step="0.1"></div><div class="field"><label>Intensity</label><select id="intensity"><option>Light</option><option selected>Moderate</option><option>Intense</option></select><div class="muted">Light = easy, Moderate = challenging, Intense = hard/HIIT.</div></div></div><div class="suggestion" id="est"></div><button class="btn primary" id="saveActivity">Save ${selectedWorkoutTab}</button>`;
    const upd=()=>q('est').innerHTML=`Estimated calories: ${caloriesForActivity(q('act').value,q('dur').value,q('intensity').value)} kcal`;
    ['act','dur','intensity'].forEach(id=>q(id).oninput=upd);
    q('saveActivity').onclick=()=>{if(!todayEditable())return alert('Past dates are view-only.');const a=q('act').value,d=q('dur').value,i=q('intensity').value;data.workouts[selectedDate]=data.workouts[selectedDate]||[];data.workouts[selectedDate].push({name:a,category:selectedWorkoutTab,duration:d,distance:q('dist').value,intensity:i,sets:[],muscles:[],caloriesBurned:caloriesForActivity(a,d,i)});saveData()};upd();
  } else {
    box.innerHTML=`<button class="btn primary" id="newCustomExercise">+ Add Custom Exercise</button>${data.customExercises.length?data.customExercises.map((e,i)=>`<div class="log-card"><strong>${e.name}</strong><br>${e.bodyPart} • ${e.equipment}<br><button class="btn" data-editex="${i}">Edit</button><button class="btn danger" data-delex="${i}">Delete</button></div>`).join(''):'<div class="item">No custom exercises.</div>'}`;
    q('newCustomExercise').onclick=customExerciseForm;
    document.querySelectorAll('[data-editex]').forEach(b=>b.onclick=()=>customExerciseForm(data.customExercises[Number(b.dataset.editex)],Number(b.dataset.editex)));
    document.querySelectorAll('[data-delex]').forEach(b=>b.onclick=()=>{if(confirm('Delete custom exercise? Past logs remain unchanged.')){data.customExercises.splice(Number(b.dataset.delex),1);saveData()}});
  }
}
function customExerciseForm(existing=null,index=null){
  const modal=q('modal'),card=q('modalCard'),e=existing||{};
  modal.classList.remove('hidden');
  card.innerHTML=`<div class="panel-title">${existing?'Edit':'Add'} Custom Exercise</div><div class="form-grid"><div class="field"><label>Name</label><input id="ceName" value="${e.name||''}"></div><div class="field"><label>Body Part</label><select id="ceBody">${Object.keys(EXERCISE_DATABASE).map(b=>`<option ${e.bodyPart===b?'selected':''}>${b}</option>`).join('')}</select></div><div class="field"><label>Equipment</label><select id="ceEquip">${['Bodyweight','Dumbbell','Barbell','Machine','Cable','Kettlebell'].map(x=>`<option ${e.equipment===x?'selected':''}>${x}</option>`).join('')}</select></div><div class="field"><label>Notes</label><input id="ceNotes" value="${e.notes||''}"></div></div><button class="btn primary" id="saveCE">Save</button><button class="btn" id="cancelCE">Cancel</button>`;
  q('cancelCE').onclick=()=>{modal.classList.add('hidden');card.innerHTML=''};
  q('saveCE').onclick=()=>{const ex={name:q('ceName').value.trim(),bodyPart:q('ceBody').value,equipment:q('ceEquip').value,notes:q('ceNotes').value};if(!ex.name)return alert('Enter exercise name.');if(index!==null)data.customExercises[index]=ex;else data.customExercises.push(ex);persist();modal.classList.add('hidden');card.innerHTML='';render()};
}
function restSeconds(s){if(s.type==='Warmup')return 45;const w=Number(s.weight)||0,r=Number(s.reps)||0;if(w>=80||r<=6)return 120;if(w>=40||r<=10)return 90;return 60}
function workoutPush(s){return s.type==='Warmup'?'Warmup done. Prepare for working sets.':'Strong set. Control the reps and push with good form.'}
function startRestTimer(sec){stopRestTimer();restRemaining=sec;renderRestTimer();restTimer=setInterval(()=>{restRemaining--;renderRestTimer();if(restRemaining<=0){stopRestTimer();restAlert()}},1000)}
function renderRestTimer(){let el=q('restTimerPanel');if(!el){el=document.createElement('div');el.id='restTimerPanel';el.className='rest-timer-panel';document.body.appendChild(el)}const mm=String(Math.floor(restRemaining/60)).padStart(2,'0'),ss=String(restRemaining%60).padStart(2,'0');el.innerHTML=`<strong>Rest</strong><span>${mm}:${ss}</span><button id="minusRest">-15s</button><button id="plusRest">+15s</button><button id="skipRest">Skip</button>`;q('minusRest').onclick=()=>{restRemaining=Math.max(0,restRemaining-15);renderRestTimer()};q('plusRest').onclick=()=>{restRemaining+=15;renderRestTimer()};q('skipRest').onclick=stopRestTimer}
function stopRestTimer(){if(restTimer)clearInterval(restTimer);restTimer=null;q('restTimerPanel')?.remove()}
function restAlert(){try{const ctx=new (window.AudioContext||window.webkitAudioContext)();const osc=ctx.createOscillator();osc.connect(ctx.destination);osc.frequency.value=880;osc.start();setTimeout(()=>{osc.stop();ctx.close()},450)}catch(e){} if(navigator.vibrate)navigator.vibrate([250,100,250]); if('Notification'in window&&Notification.permission==='granted')new Notification('Rest Over!',{body:'Start your next set 💪'}); else alert('Rest over! Start next set.')}

function coach(){
  const notes=data.notifications.slice(0,8).map(n=>`<div class="item"><strong>${n.type}</strong><br>${n.message}</div>`).join('');
  shell('AI Coach','Goal-based guidance',`<div class="panel"><div class="panel-title">Morning Workout Discussion</div><div class="choice-list"><button class="choice-btn" id="coachPlan">Coach Plan</button><button class="choice-btn" id="ownPlan">I Have My Own Plan</button><button class="choice-btn" id="restDay">Rest Day</button></div></div><div class="panel"><div class="panel-title">Coach Feed</div>${notes||'<div class="item">No coach notes yet.</div>'}</div>`);
  q('coachPlan').onclick=()=>alert('Coach suggests: choose balanced training based on recovery and missed muscles.');
  q('ownPlan').onclick=()=>{tab='workout';selectedWorkoutTab='Strength';render()};
  q('restDay').onclick=()=>{data.workouts[todayKey()]=data.workouts[todayKey()]||[];data.workouts[todayKey()].push({name:'Rest / Recovery Day',category:'Recovery',sets:[],caloriesBurned:0});saveData()};
}
function generateCoachPlan(){data.coachPlans[todayKey()]={generatedAt:new Date().toISOString(),targets:targets(),suggestion:coachSuggestion()};saveData()}
function finishDay(date=selectedDate,auto=false){const d=dayMetrics(date);data.dayClosures[date]={date,auto,closedAt:new Date().toISOString(),calories:d.meals.cal,burned:d.burned,adjusted:d.adjustedCalories,deficit:d.deficit,projection:d.deficit>=0?'Supports your goal if consistent.':'Surplus may slow fat loss.'};persist();if(!auto)alert(`Day Finished\n${deficitText(d.deficit)}\n${data.dayClosures[date].projection}`);render()}
function autoFinish(){Object.keys({...data.meals,...data.workouts,...data.water}).filter(d=>d<todayKey()).forEach(d=>{if(!data.dayClosures[d])finishDay(d,true)})}

function profile(){
  const p=data.profile; shell('Profile','Your setup',`<div class="panel"><div class="panel-title">${p.name}</div><div class="item">Age: ${p.age}<br>Height: ${displayHeight(p.height)}<br>Current: ${displayWeight(p.currentWeight)} ${unitLabels().weight}<br>Goal: ${p.goal}<br>Target: ${displayWeight(p.targetWeight)} ${unitLabels().weight}</div></div>`)
}
function recovery(){shell('Recovery',dateSelectorHtml(),`<div class="panel"><div class="form-grid"><div class="field"><label>Sleep hours</label><input id="sleep" type="number" value="${data.recovery[selectedDate]?.sleep||''}"></div><div class="field"><label>Quality</label><select id="quality">${['Poor','Average','Good'].map(x=>`<option ${data.recovery[selectedDate]?.quality===x?'selected':''}>${x}</option>`).join('')}</select></div><div class="field"><label>Energy</label><select id="energy">${['Low','Moderate','High'].map(x=>`<option ${data.recovery[selectedDate]?.energy===x?'selected':''}>${x}</option>`).join('')}</select></div><div class="field"><label>Soreness</label><select id="soreness">${['Low','Moderate','High'].map(x=>`<option ${data.recovery[selectedDate]?.soreness===x?'selected':''}>${x}</option>`).join('')}</select></div></div>${todayEditable()?'<button class="btn primary" id="saveRecovery">Save Recovery</button>':''}</div>`);bindDateSelector();q('saveRecovery')&&(q('saveRecovery').onclick=()=>{data.recovery[selectedDate]={sleep:q('sleep').value,quality:q('quality').value,energy:q('energy').value,soreness:q('soreness').value};saveData()})}
function progress(){shell('Progress','History',`<div class="panel"><div class="panel-title">Finished Days</div>${Object.values(data.dayClosures).length?Object.values(data.dayClosures).map(x=>`<div class="item"><strong>${x.date}</strong><br>${deficitText(x.deficit)}<br>${x.projection}</div>`).join(''):'<div class="item">No finished days yet.</div>'}</div>`)}
function settings(){shell('Settings','App and legal',`<div class="panel"><div class="panel-title">App</div><div class="item">Version: ${APP_VERSION}<br>Last Updated: ${LAST_UPDATED}</div></div><div class="panel"><div class="panel-title">Legal</div><button class="btn" id="privacy">Privacy Policy</button><button class="btn" id="terms">Terms</button><button class="btn" id="ai">AI Disclaimer</button></div>`);q('privacy').onclick=()=>showLegal('Privacy Policy');q('terms').onclick=()=>showLegal('Terms of Use');q('ai').onclick=()=>showLegal('AI Disclaimer')}
function showLegal(title){q('modal').classList.remove('hidden');q('modalCard').innerHTML=`<div class="panel-title">${title}</div><div class="item">Version: ${APP_VERSION}<br>Last Updated: ${LAST_UPDATED}<br><br>General fitness and nutrition guidance only. Not medical advice.</div><button class="btn primary" id="closeLegal">Close</button>`;q('closeLegal').onclick=()=>q('modal').classList.add('hidden')}

function showAppGuide(){
  shell('App Guide','Welcome',`<div class="panel onboarding-page"><div class="panel-title">Welcome to STAYFITINLIFE</div><div class="item">Dashboard → calories, macros, water, recovery<br>Nutrition → log food, barcode, supplements<br>Workouts → sets, cardio, sports<br>Coach → daily guidance<br>Progress → history</div><div class="suggestion">For best mobile experience: Add this app to your Home Screen.<br>iPhone: Share → Add to Home Screen<br>Android: ⋮ → Add to Home Screen</div><button class="btn primary" id="startUsing">Start Using App</button></div>`);q('startUsing').onclick=()=>{data.introSeen=true;saveData()}}
function render(){
  if(!profileComplete()){renderOnboarding();return}
  autoFinish();
  if(!data.introSeen){showAppGuide();return}
  if(tab==='home')home();
  if(tab==='nutrition')nutrition();
  if(tab==='workout')workout();
  if(tab==='coach')coach();
  if(tab==='profile')profile();
  if(tab==='recovery')recovery();
  if(tab==='progress')progress();
  if(tab==='settings')settings();
}

function bind(){
  document.querySelectorAll('[data-tab]').forEach(b=>b.onclick=()=>setTab(b.dataset.tab));
  document.querySelectorAll('[data-mobile-tab]').forEach(b=>b.onclick=()=>setTab(b.dataset.mobileTab));
  q('mobileMenuBtn')?.addEventListener('click',()=>q('sidebar')?.classList.toggle('open'));
}
bind();
render();

if('serviceWorker'in navigator){navigator.serviceWorker.register('/sw.js?v=stable-1-0-4-clean').catch(()=>{})}
