import { FOOD_DATABASE } from './data/foodDatabase.js';
import { EXERCISE_DATABASE, SPLITS } from './data/exerciseDatabase.js';
import { SUPPLEMENT_DATABASE } from './data/supplementDatabase.js';

const STORE='stayfitinlife_v12';
const todayKey=()=>new Date().toISOString().slice(0,10);
const yesterdayKey=()=>{let d=new Date();d.setDate(d.getDate()-1);return d.toISOString().slice(0,10)};
const defaultData={profile:{},meals:{},water:{},workouts:{},weights:[],recovery:{},coachPlans:{},customFoods:[],customSupplements:[],aiCoachUsage:{date:todayKey(),count:0}};
let data=load(),tab='home',viewDate=todayKey(),selectedMeal='Breakfast',mainCat='Indian',subCat='All',selectedFood='Butter Chicken',workoutMode='Custom Muscles',selectedMuscles=['Chest'],selectedExercise='Bench Press',currentSets=[],restSeconds=0,restInt=null,restPaused=false,scannerStream=null,barcodeDetector=null,scannerLoop=null,scannerFacingMode='environment';

const APP_VERSION='V12.4';
const LAST_UPDATED='25 April 2026';

const LEGAL_DOCS={
privacy:`<div class="panel-title">Privacy Policy – STAYFITINLIFE</div>
<div class="muted"><strong>Version:</strong> ${APP_VERSION}<br><strong>Last Updated:</strong> ${LAST_UPDATED}</div>
<div class="item"><strong>1. Information We Collect</strong><br>
We may collect personal information such as name, age, height, weight, body metrics and fitness goals. We also store nutrition logs, workout logs, water intake, recovery inputs such as sleep, energy and soreness, and basic device/browser information.</div>
<div class="item"><strong>2. How We Use Your Data</strong><br>
Your data is used to generate personalized fitness, nutrition, recovery and AI coaching suggestions, track progress, improve app performance and personalize your experience. We do not sell your personal data.</div>
<div class="item"><strong>3. Data Storage</strong><br>
In this version, your data is stored locally on your device/browser. Cloud sync is not enabled in this version. Future versions may introduce secure cloud storage with user login.</div>
<div class="item"><strong>4. Third-Party Services</strong><br>
AI services may process limited information required to generate coaching responses. Analytics or cloud services may be introduced in future updates.</div>
<div class="item"><strong>5. Your Rights</strong><br>
You can edit, export, import or delete your local data from Settings. You can also delete individual meals, water logs, workout sets and weight logs where supported.</div>
<div class="item"><strong>6. Security</strong><br>
We follow local-first storage and reasonable security practices, but no system is 100% secure. You are responsible for device and browser security.</div>
<div class="item"><strong>7. Children’s Privacy</strong><br>
STAYFITINLIFE is not intended for users under 13 years of age.</div>
<div class="item"><strong>8. Policy Updates</strong><br>
We may update this Privacy Policy. Continued use of the app means you accept the latest version.</div>`,

terms:`<div class="panel-title">Terms of Use – STAYFITINLIFE</div>
<div class="muted"><strong>Version:</strong> ${APP_VERSION}<br><strong>Last Updated:</strong> ${LAST_UPDATED}</div>
<div class="item"><strong>1. Acceptable Use</strong><br>
You agree to use STAYFITINLIFE for personal fitness, nutrition, recovery and habit tracking only. You agree not to misuse, exploit, copy, reverse engineer or disrupt the app.</div>
<div class="item"><strong>2. Not Medical Advice</strong><br>
STAYFITINLIFE is not a medical service. It does not replace doctors, dietitians, physiotherapists, certified trainers or other health professionals.</div>
<div class="item"><strong>3. User Responsibility</strong><br>
You are responsible for your workouts, diet choices, supplement use and health decisions. Stop any activity that causes pain, dizziness or discomfort and consult a professional where needed.</div>
<div class="item"><strong>4. Data Accuracy</strong><br>
Calories, macros, recovery scores and AI recommendations are estimates. We do not guarantee perfect accuracy.</div>
<div class="item"><strong>5. App Changes</strong><br>
We may add, change or remove features, content, calculations, layouts or functionality at any time.</div>
<div class="item"><strong>6. Limitation of Liability</strong><br>
STAYFITINLIFE is not liable for injuries, health problems, incorrect user input, inaccurate food data, or results from following app or AI suggestions.</div>
<div class="item"><strong>7. Intellectual Property</strong><br>
The STAYFITINLIFE name, design, branding, interface and app logic belong to STAYFITINLIFE unless otherwise stated.</div>
<div class="item"><strong>8. Termination</strong><br>
We may restrict access or future services if the app is misused.</div>`,

ai:`<div class="panel-title">AI Disclaimer – STAYFITINLIFE</div>
<div class="muted"><strong>Version:</strong> ${APP_VERSION}<br><strong>Last Updated:</strong> ${LAST_UPDATED}</div>
<div class="item"><strong>1. Nature of AI Coach</strong><br>
The AI Coach provides automated fitness, nutrition, recovery and habit suggestions based on your inputs and app data.</div>
<div class="item"><strong>2. Not Professional Advice</strong><br>
AI responses are not medical advice, dietitian advice, mental health advice, physiotherapy advice or certified personal training plans.</div>
<div class="item"><strong>3. Input-Based Output</strong><br>
AI output depends on your entered data. Inaccurate or incomplete inputs may produce inaccurate recommendations.</div>
<div class="item"><strong>4. No Guarantees</strong><br>
We do not guarantee weight loss, muscle gain, injury prevention, performance improvement or specific health outcomes.</div>
<div class="item"><strong>5. Use at Your Own Risk</strong><br>
Use AI suggestions at your own discretion. Stop any exercise or diet change that causes discomfort, pain, dizziness or adverse effects.</div>
<div class="item"><strong>6. Consult Professionals</strong><br>
Before starting intense workouts, making major diet changes, taking supplements, or managing medical conditions, consult a qualified professional.</div>`
};

function openLegalDoc(type){
 const modal=q('modal'), card=q('modalCard');
 modal.classList.remove('hidden');
 card.classList.add('onboarding-card','slide-in');
 card.innerHTML=`${LEGAL_DOCS[type]||LEGAL_DOCS.privacy}
 <div style="display:flex;gap:10px;margin-top:16px;flex-wrap:wrap">
  <button class="btn primary" id="closeLegal">Close</button>
 </div>`;
 q('closeLegal').onclick=()=>{modal.classList.add('hidden');card.innerHTML='';card.classList.remove('slide-in')};
}

const q=id=>document.getElementById(id), round=(n,d=1)=>Math.round((Number(n)||0)*10**d)/10**d;
function load(){try{return {...defaultData,...JSON.parse(localStorage.getItem(STORE)||'{}')}}catch{return structuredClone(defaultData)}}function save(){localStorage.setItem(STORE,JSON.stringify(data));render()}function profileComplete(){let p=data.profile;return !!(p.name&&p.age&&p.height&&p.currentWeight&&p.goal&&p.activity&&p.diet&&p.mode)}
function targets(){let p=data.profile,w=Number(p.currentWeight||p.startWeight)||70,c=w*30;if(p.goal==='Fat Loss')c-=450;if(p.goal==='Muscle Gain')c+=300;return{calories:Math.round(c),protein:Math.round(w*1.8),carbs:Math.round(c*.42/4),fats:Math.round(c*.25/9),water:round(Math.max(2,w*.035+(p.goal==='Fat Loss'?.3:0)+(p.goal==='Muscle Gain'?.5:0)+(p.activity==='High'?.5:0)))}}
const meals=(d=viewDate)=>data.meals[d]||[],waterLogs=(d=viewDate)=>data.water[d]||[],workouts=(d=viewDate)=>data.workouts[d]||[];
function mealTotals(d=viewDate){return meals(d).reduce((a,m)=>({cal:a.cal+Number(m.calories||0),p:a.p+Number(m.protein||0),c:a.c+Number(m.carbs||0),f:a.f+Number(m.fats||0)}),{cal:0,p:0,c:0,f:0})}
function waterTotal(d=viewDate){return round(waterLogs(d).reduce((a,w)=>a+Number(w.amount||0),0)/1000)}
function recoveryStatus(d=viewDate){let r=data.recovery[d],score=60;if(r){score=50;if(Number(r.sleep)>=8)score+=25;else if(Number(r.sleep)>=7)score+=15;else if(Number(r.sleep)<6)score-=20;if(r.quality==='Good')score+=10;if(r.quality==='Poor')score-=10;if(r.energy==='High')score+=15;if(r.energy==='Low')score-=15;if(r.soreness==='Low')score+=10;if(r.soreness==='High')score-=20}score+=Math.min(10,waterTotal(d)*2);if(meals(d).some(m=>m.main==='Alcohol'))score-=10;score=Math.max(0,Math.min(100,score));return{score,status:score>=85?'Peak':score>=70?'High':score>=50?'Moderate':'Low',decision:score>=85?'Performance Day':score>=70?'Progress Day':score>=50?'Maintain Day':'Recovery Day'}}
function switchTab(t){tab=t;document.querySelectorAll('[data-tab]').forEach(b=>b.classList.toggle('active',b.dataset.tab===t));document.querySelectorAll('[data-mobile-tab]').forEach(b=>b.classList.toggle('active',b.dataset.mobileTab===t));q('sidebar').classList.remove('open');render()}function shell(t,s,c){q('main').innerHTML=`<section><div class="header"><h1>${t}</h1><div class="muted">${s||''}</div></div>${c}</section>`}function dateControls(){return`<div class="pill-row"><button class="pill ${viewDate===todayKey()?'active':''}" data-datepick="${todayKey()}">Today</button><button class="pill ${viewDate===yesterdayKey()?'active':''}" data-datepick="${yesterdayKey()}">Yesterday</button><input id="viewDatePicker" type="date" value="${viewDate}" style="max-width:180px"></div>`}function wireDate(){document.querySelectorAll('[data-datepick]').forEach(b=>b.onclick=()=>{viewDate=b.dataset.datepick;render()});if(q('viewDatePicker'))q('viewDatePicker').onchange=e=>{viewDate=e.target.value;render()}}
function render(){if(!profileComplete()&&tab!=='settings')return onboardingGate();({home,nutrition,workout,coach,profile,recovery,progress,settings}[tab]||home)()}
function onboardingGate(){shell('Setup Required','Complete 2-step onboarding to activate your targets and dashboard.',`<div class="panel"><div class="panel-title">Welcome to STAYFITINLIFE</div><div class="muted">Step 1 captures your basic info. Step 2 builds your goal plan.</div><button class="btn primary" id="startOnboarding" style="margin-top:16px">Start Onboarding</button></div>`);q('startOnboarding').onclick=openOnboarding}
function openOnboarding(){
 q('modal').classList.remove('hidden');
 q('modalCard').innerHTML=`<div class="wordmark" style="font-size:30px">STAYFITINLIFE</div>
 <div id="obContent"></div>`;

 let step=1;
 let temp={...data.profile};
 if(!temp.timelineWeeks) temp.timelineWeeks='8';
 if(!temp.targetDate) temp.targetDate=dateFromWeeks(temp.timelineWeeks);
 if(!temp.goal) temp.goal='Fat Loss';
 if(!temp.targetType) temp.targetType='weight';
 if(!temp.activity) temp.activity='Moderate';
 if(!temp.diet) temp.diet='Non-Veg';
 if(!temp.mode) temp.mode='Beginner';

 const renderStep=()=>{
   if(step===1){
     q('obContent').innerHTML=`<div class="muted">Step 1 of 2</div>
     <div class="panel-title">Basic Info</div>
     <div class="form-grid" style="margin-top:14px">
       <div class="field"><label>Name</label><input id="ob_name" value="${temp.name||''}" placeholder="Your name"></div>
       <div class="field"><label>Age</label><input id="ob_age" type="number" min="10" max="100" value="${temp.age||''}"></div>
       <div class="field"><label>Height (cm)</label><input id="ob_height" type="number" step="0.1" value="${temp.height||''}"></div>
       <div class="field"><label>Current Weight (kg)</label><input id="ob_currentWeight" type="number" step="0.1" value="${temp.currentWeight||''}"></div>
     </div>
     <div class="suggestion">Starting weight will be saved internally as your current weight. You don’t need to enter it separately.</div>
     <div style="display:flex;gap:10px;margin-top:16px;flex-wrap:wrap">
       <button class="btn primary" id="nextOb">Next: Goal</button>
       <button class="btn" id="closeOb">Close</button>
     </div>`;
     q('closeOb').onclick=()=>q('modal').classList.add('hidden');
     q('nextOb').onclick=()=>{
       ['name','age','height','currentWeight'].forEach(k=>temp[k]=q('ob_'+k).value);
       const missing=['name','age','height','currentWeight'].filter(k=>!temp[k]);
       if(missing.length){alert('Please complete: '+missing.join(', '));return}
       temp.startWeight=temp.currentWeight;
       step=2;
       renderStep();
     };
   }else{
     const range=idealWeightRange(temp.height);
     q('obContent').innerHTML=`<div class="muted">Step 2 of 2</div>
     <div class="panel-title">Choose Your Goal</div>
     <div class="choice-list">
       <button class="choice-btn ${temp.goal==='Fat Loss'?'active':''}" data-goal="Fat Loss">🔥 Fat Loss<br><span class="muted">Lose weight and body fat</span></button>
       <button class="choice-btn ${temp.goal==='Muscle Gain'?'active':''}" data-goal="Muscle Gain">💪 Muscle Gain<br><span class="muted">Build muscle and strength</span></button>
       <button class="choice-btn ${temp.goal==='Maintenance'?'active':''}" data-goal="Maintenance">⚖️ Maintenance<br><span class="muted">Stay fit and balanced</span></button>
     </div>

     <div class="panel-title" style="font-size:18px;margin-top:18px">Target</div>
     <div class="pill-row">
       <button class="pill ${temp.targetType==='weight'?'active':''}" data-targettype="weight">Goal Weight</button>
       <button class="pill ${temp.targetType==='bodyfat'?'active':''}" data-targettype="bodyfat">Body Fat %</button>
     </div>
     <div class="form-grid">
       <div class="field"><label>Target Weight (kg)</label><input id="ob_targetWeight" type="number" step="0.1" value="${temp.targetWeight||''}"></div>
       <div class="field"><label>Target Body Fat %</label><input id="ob_targetBodyFat" type="number" step="0.1" value="${temp.targetBodyFat||''}"></div>
       <div class="field"><label>Timeline Weeks</label><select id="ob_timelineWeeks"><option>6</option><option>8</option><option>10</option><option>12</option><option>14</option><option>16</option><option>20</option><option>24</option></select></div>
       <div class="field"><label>Target Date</label><input id="ob_targetDate" type="date" value="${temp.targetDate||dateFromWeeks(temp.timelineWeeks)}"></div>
       <div class="field"><label>Activity Level</label><select id="ob_activity"><option>Low</option><option>Moderate</option><option>High</option></select></div>
       <div class="field"><label>Diet Preference</label><select id="ob_diet"><option>Non-Veg</option><option>Veg</option><option>Vegan</option><option>Mixed</option></select></div>
       <div class="field"><label>Training Mode</label><select id="ob_mode"><option>Beginner</option><option>Advanced</option></select></div>
     </div>

     <div class="suggestion" id="goalSummary"></div>
     <div style="display:flex;gap:10px;margin-top:16px;flex-wrap:wrap">
       <button class="btn" id="backOb">Back</button>
       <button class="btn primary" id="finishOnboarding">Generate My Plan 🚀</button>
     </div>`;
     q('ob_timelineWeeks').value=temp.timelineWeeks||'8';
     q('ob_activity').value=temp.activity||'Moderate';
     q('ob_diet').value=temp.diet||'Non-Veg';
     q('ob_mode').value=temp.mode||'Beginner';

     const sync=()=>{
       temp.targetWeight=q('ob_targetWeight').value;
       temp.targetBodyFat=q('ob_targetBodyFat').value;
       temp.timelineWeeks=q('ob_timelineWeeks').value;
       temp.targetDate=q('ob_targetDate').value;
       temp.activity=q('ob_activity').value;
       temp.diet=q('ob_diet').value;
       temp.mode=q('ob_mode').value;

       const current=Number(temp.currentWeight);
       if(temp.targetType==='weight' && temp.targetWeight && !q('ob_targetBodyFat').dataset.userEdited){
         q('ob_targetBodyFat').value=estimatedFatFromTarget(current,temp.targetWeight);
         temp.targetBodyFat=q('ob_targetBodyFat').value;
       }
       if(temp.targetType==='bodyfat' && temp.targetBodyFat && !q('ob_targetWeight').dataset.userEdited){
         q('ob_targetWeight').value=estimatedTargetFromFat(current,temp.targetBodyFat);
         temp.targetWeight=q('ob_targetWeight').value;
       }

       const tw=Number(temp.targetWeight);
       const weeks=Number(temp.timelineWeeks||weeksFromDate(temp.targetDate));
       const change=tw?round(Math.abs(current-tw),1):0;
       const weekly=weeks&&change?round(change/weeks,2):0;
       let status='Enter target weight/body fat to validate.';
       let color='var(--muted)';
       if(tw&&weeks){
         if(temp.goal==='Fat Loss'){
           if(weekly>1){status='Aggressive. Consider extending timeline.';color='var(--red)'}
           else if(weekly>=0.4&&weekly<=0.9){status='Realistic and sustainable.';color='var(--green)'}
           else {status='Slow and sustainable.';color='var(--green)'}
         }else if(temp.goal==='Muscle Gain'){
           if(weekly>0.5){status='Aggressive muscle gain target.';color='var(--red)'}
           else {status='Realistic muscle gain pace.';color='var(--green)'}
         }else {status='Maintenance goal selected.';color='var(--green)'}
       }
       q('goalSummary').innerHTML=`Healthy weight range estimate: ${range.min}-${range.max} kg.<br>
       Suggested body fat range for ${temp.goal}: ${suggestedBodyFat(temp.goal)}.<br>
       Timeline: ${weeks} weeks • Target date: ${temp.targetDate||dateFromWeeks(weeks)}<br>
       ${tw?`Change required: ${change} kg → ${weekly} kg/week.<br>`:''}
       <strong style="color:${color}">${status}</strong>`;
     };

     document.querySelectorAll('[data-goal]').forEach(b=>b.onclick=()=>{temp.goal=b.dataset.goal;renderStep()});
     document.querySelectorAll('[data-targettype]').forEach(b=>b.onclick=()=>{temp.targetType=b.dataset.targettype;q('ob_targetWeight').dataset.userEdited='';q('ob_targetBodyFat').dataset.userEdited='';renderStep()});
     q('ob_timelineWeeks').onchange=()=>{q('ob_targetDate').value=dateFromWeeks(q('ob_timelineWeeks').value);sync()};
     q('ob_targetDate').onchange=()=>{const w=weeksFromDate(q('ob_targetDate').value);temp.timelineWeeks=String(w);sync()};
     q('ob_targetWeight').oninput=()=>{q('ob_targetWeight').dataset.userEdited='1';if(temp.targetType==='weight')q('ob_targetBodyFat').dataset.userEdited='';sync()};
     q('ob_targetBodyFat').oninput=()=>{q('ob_targetBodyFat').dataset.userEdited='1';if(temp.targetType==='bodyfat')q('ob_targetWeight').dataset.userEdited='';sync()};
     ['activity','diet','mode'].forEach(k=>q('ob_'+k).onchange=sync);
     q('backOb').onclick=()=>{step=1;renderStep()};
     q('finishOnboarding').onclick=()=>{
       sync();
       if(!temp.targetWeight && !temp.targetBodyFat){alert('Please enter target weight or body fat.');return}
       data.profile={...temp,startWeight:temp.currentWeight};
       q('modal').classList.add('hidden');
       save();
     };
     sync();
   }
 };
 renderStep();
}

function morningCheckin(){q('modal').classList.remove('hidden');q('modalCard').innerHTML=`<div class="panel-title">Good Morning 👋</div><div class="field"><label>How long did you sleep?</label><div class="pill-row">${['5h','6h','7h','8h','9h+'].map(x=>`<button class="pill" data-sleep="${x}">${x}</button>`).join('')}</div></div><div class="form-grid"><div class="field"><label>Sleep Quality</label><select id="mc_quality"><option>Poor</option><option selected>Average</option><option>Good</option></select></div><div class="field"><label>Energy</label><select id="mc_energy"><option>Low</option><option selected>Moderate</option><option>High</option></select></div><div class="field"><label>Soreness</label><select id="mc_soreness"><option>Low</option><option selected>Moderate</option><option>High</option></select></div></div><button class="btn primary" id="saveMorning">Save</button>`;let sleep='7';document.querySelectorAll('[data-sleep]').forEach(b=>b.onclick=()=>{sleep=b.dataset.sleep.replace('h+','').replace('h','');document.querySelectorAll('[data-sleep]').forEach(x=>x.classList.remove('active'));b.classList.add('active')});q('saveMorning').onclick=()=>{data.recovery[todayKey()]={sleep,quality:q('mc_quality').value,energy:q('mc_energy').value,soreness:q('mc_soreness').value};q('modal').classList.add('hidden');save()}}
function home(){let t=targets(),m=mealTotals(todayKey()),w=waterTotal(todayKey()),r=recoveryStatus(todayKey()),rings=[['Protein',m.p,t.protein,'g','--green'],['Carbs',m.c,t.carbs,'g','--purple'],['Fats',m.f,t.fats,'g','--blue'],['Water',w,t.water,'L','--cyan']];shell('Dashboard',new Date().toLocaleDateString(),`<div class="grid-top"><div class="panel"><div class="panel-title">Today’s Progress</div><div class="rings">${rings.map(([n,v,target,u,c])=>{let pct=Math.min(100,Math.round(v/target*100));return`<div class="ring-card"><div class="ring" style="--c:var(${c});--p:${pct}"><div class="ring-inner">${pct}%</div></div><div class="ring-name">${n}</div><div class="ring-sub">${round(v)} / ${target} ${u}</div></div>`}).join('')}</div></div><div class="panel"><div class="panel-title">Next Actions</div>${nextActions().map(x=>`<div class="item">${x}</div>`).join('')}<button class="btn" id="morningBtn" style="margin-top:12px">Good Morning Check-in</button></div></div><div class="panel"><div class="panel-title">Water Quick Add</div><button class="btn" data-water="250">+250ml</button><button class="btn" data-water="500">+500ml</button><button class="btn" data-water="1000">+1L</button></div><div class="cards"><div class="card"><div class="stat-label">Meals</div><div class="stat-number">${meals(todayKey()).length}</div></div><div class="card"><div class="stat-label">Workouts</div><div class="stat-number">${workouts(todayKey()).length}</div></div><div class="card"><div class="stat-label">Recovery</div><div class="stat-number">${r.status}</div><div class="muted">${r.decision}</div></div><div class="card"><div class="stat-label">Water</div><div class="stat-number">${w}L</div></div></div><div class="panel"><button class="btn primary" id="smartPlan">Generate Smart Plan</button>${planHtml()}</div><div class="panel"><div class="panel-title">Weekly Summary</div>${weeklySummary()}</div>`);wireWater(todayKey());q('smartPlan').onclick=smartPlan;q('morningBtn').onclick=morningCheckin}
function nextActions(){let t=targets(),m=mealTotals(todayKey()),a=[];if(m.p<t.protein)a.push(`Eat ~${Math.round(t.protein-m.p)}g protein.`);if(waterTotal(todayKey())<t.water)a.push(`Drink ~${round(t.water-waterTotal(todayKey()))}L water.`);a.push(`Suggested muscles: ${recommendMuscles().join(' + ')||'Any fresh group'}`);return a}
function weeklySummary(){let days=[...Array(7)].map((_,i)=>{let d=new Date();d.setDate(d.getDate()-i);return d.toISOString().slice(0,10)});return `<div class="item">Workouts: ${days.reduce((a,d)=>a+workouts(d).length,0)}<br>Avg Protein: ${round(days.reduce((a,d)=>a+mealTotals(d).p,0)/7)}g<br>Avg Water: ${round(days.reduce((a,d)=>a+waterTotal(d),0)/7)}L</div>`}
function foodList(){return FOOD_DATABASE.concat(SUPPLEMENT_DATABASE).concat(data.customFoods||[]).concat(data.customSupplements||[])}
function nutrition(){let cats=[...new Set(foodList().map(f=>f.main))],subs=['All',...new Set(foodList().filter(f=>f.main===mainCat).map(f=>f.sub))],search=(q('foodSearch')?.value||'').toLowerCase();let list=foodList().filter(f=>f.main===mainCat&&(subCat==='All'||f.sub===subCat));if(search)list=foodList().filter(f=>[f.name,f.main,f.sub,f.barcode||''].join(' ').toLowerCase().includes(search));if(!list.some(f=>f.name===selectedFood))selectedFood=list[0]?.name||'';let f=foodList().find(x=>x.name===selectedFood);shell('Nutrition','Meal Type → Main Category → Subcategory → Food',`${dateControls()}<div class="panel"><div class="pill-row">${['Breakfast','Lunch','Dinner','Snacks'].map(x=>`<button class="pill ${selectedMeal===x?'active':''}" data-meal="${x}">${x}</button>`).join('')}</div><div class="pill-row">${cats.map(x=>`<button class="pill ${mainCat===x?'active':''}" data-main="${x}">${x}</button>`).join('')}</div><div class="pill-row">${subs.map(x=>`<button class="pill ${subCat===x?'active':''}" data-sub="${x}">${x}</button>`).join('')}</div><div class="field"><label>Search / Barcode</label><input id="foodSearch" value="${search}" placeholder="Search food or barcode"/></div><button class="btn primary" id="scanBarcodeBtn">📷 Scan Barcode</button> <button class="btn" id="manualBarcodeBtn">⌨ Enter Barcode</button><div class="choice-list">${list.map(x=>`<button class="choice-btn ${selectedFood===x.name?'active':''}" data-food="${x.name}">${x.name}<br><span class="muted">${x.main} → ${x.sub}</span></button>`).join('')}</div></div><div class="panel">${foodEditor(f)}</div><div class="panel"><div class="panel-title">Water Log</div><button class="btn" data-water="250">+250ml</button><button class="btn" data-water="500">+500ml</button><button class="btn" data-water="1000">+1L</button>${waterLogs(viewDate).map((w,i)=>`<div class="log-card">${w.amount}ml <button class="btn danger" data-delwater="${i}">Delete</button></div>`).join('')}</div><div class="panel"><div class="panel-title">Logs for ${viewDate}</div>${meals(viewDate).map((m,i)=>`<div class="log-card"><div><strong>${m.name}</strong><div class="muted">${m.meal||m.main} • ${m.calories||0} kcal • P${m.protein||0} C${m.carbs||0} F${m.fats||0}</div></div><button class="btn danger" data-delmeal="${i}">Delete</button></div>`).join('')||'<div class="item">No logs.</div>'}</div>`);wireDate();q('foodSearch').oninput=nutrition;document.querySelectorAll('[data-meal]').forEach(b=>b.onclick=()=>{selectedMeal=b.dataset.meal;nutrition()});document.querySelectorAll('[data-main]').forEach(b=>b.onclick=()=>{mainCat=b.dataset.main;subCat='All';selectedFood='';nutrition()});document.querySelectorAll('[data-sub]').forEach(b=>b.onclick=()=>{subCat=b.dataset.sub;selectedFood='';nutrition()});document.querySelectorAll('[data-food]').forEach(b=>b.onclick=()=>{selectedFood=b.dataset.food;nutrition()});wireFood();wireWater(viewDate);q('scanBarcodeBtn').onclick=openBarcodeScanner;q('manualBarcodeBtn').onclick=manualBarcodeEntry;document.querySelectorAll('[data-delwater]').forEach(b=>b.onclick=()=>{data.water[viewDate].splice(Number(b.dataset.delwater),1);save()});document.querySelectorAll('[data-delmeal]').forEach(b=>b.onclick=()=>{data.meals[viewDate].splice(Number(b.dataset.delmeal),1);save()})}
function foodEditor(f){if(!f)return'<div class="item">Select item.</div>';if(f.builder==='egg')return`<div class="panel-title">Egg Dish</div><div class="form-grid"><div class="field"><label>Whole Eggs</label><input id="wholeEggs" type="number" value="2"></div><div class="field"><label>Egg Whites</label><input id="eggWhites" type="number" value="0"></div><div class="field"><label>Style</label><select id="eggStyle"><option>Boiled</option><option>Omelette</option><option>Bhurji</option><option>Fried</option></select></div></div><div id="foodPreview" class="suggestion"></div><button class="btn primary" id="addFood">Add</button>`;return`<div class="panel-title">${f.name}</div><div class="muted">${f.portion||''}${f.timing?`<br>Preferred timing: ${f.timing}`:''}</div><div class="form-grid"><div class="field"><label>Quantity</label><input id="foodQty" type="number" value="${f.defaultQty||1}" step=".1"></div><div class="field"><label>Unit</label><select id="foodUnit"><option>${f.unit||'serving'}</option><option>g</option><option>ml</option><option>bowl</option><option>cup</option><option>piece</option></select></div>${f.typeOptions?`<div class="field"><label>Type</label><select id="foodType"><option>Home</option><option>Restaurant</option></select></div>`:''}</div>${f.components?`<div class="item">Contains:<br>${f.components.map(c=>`• ${c.name}: ${c.amount}`).join('<br>')}</div>`:''}<div id="foodPreview" class="suggestion"></div><button class="btn primary" id="addFood">Add</button>`}
function calcFood(){let f=foodList().find(x=>x.name===selectedFood);if(!f)return null;if(f.builder==='egg'){let whole=Number(q('wholeEggs').value||0),white=Number(q('eggWhites').value||0),style=q('eggStyle').value,extra=style==='Fried'?60:(style==='Omelette'||style==='Bhurji'?40:0);return{name:`Egg Dish (${style})`,main:'Global',sub:'Protein',meal:selectedMeal,qty:`${whole}+${white}`,unit:'eggs',calories:whole*70+white*17+extra,protein:round(whole*6+white*3.5),carbs:round(whole*.5+white*.2),fats:round(whole*5+(extra?4:0))}}let qty=Number(q('foodQty')?.value||1),unit=q('foodUnit')?.value||f.unit,base=f.typeOptions?(q('foodType').value==='Restaurant'?f.typeOptions.Restaurant:f.typeOptions.Home):f.calories;let factor=qty;if(unit==='g')factor=qty/250;if(unit==='ml')factor=qty/200;return{...f,meal:selectedMeal,qty,unit,calories:Math.round((base||0)*factor),protein:round((f.protein||0)*factor),carbs:round((f.carbs||0)*factor),fats:round((f.fats||0)*factor)}}
function wireFood(){const update=()=>{let m=calcFood(),t=targets(),cur=mealTotals(viewDate);q('foodPreview').innerHTML=m?`${m.qty} ${m.unit} • ${m.calories||0} kcal • P${m.protein||0} C${m.carbs||0} F${m.fats||0}<br><span class="muted">After adding: ${cur.cal+(m.calories||0)} / ${t.calories} kcal • ${cur.p+(m.protein||0)} / ${t.protein}g protein</span>`:''};['foodQty','foodUnit','foodType','wholeEggs','eggWhites','eggStyle'].forEach(id=>q(id)&&(q(id).oninput=update,q(id).onchange=update));update();q('addFood').onclick=()=>{data.meals[viewDate]=meals(viewDate);data.meals[viewDate].push(calcFood());smartPlan();save()}}
function wireWater(d){document.querySelectorAll('[data-water]').forEach(b=>b.onclick=()=>{data.water[d]=waterLogs(d);data.water[d].push({amount:Number(b.dataset.water),time:Date.now()});save()})}
function workout(){let exs=selectedMuscles.flatMap(m=>EXERCISE_DATABASE[m].map(e=>({m,e})));if(!exs.some(x=>x.e===selectedExercise))selectedExercise=exs[0]?.e||'';shell('Workouts','Smart Split or Custom Muscles. Max 3 muscles.',`${dateControls()}<div class="panel"><div class="pill-row"><button class="pill ${workoutMode==='Smart Split'?'active':''}" data-mode="Smart Split">Smart Split</button><button class="pill ${workoutMode==='Custom Muscles'?'active':''}" data-mode="Custom Muscles">Custom Muscles</button></div>${workoutMode==='Smart Split'?`<div class="pill-row">${Object.keys(SPLITS).map(s=>`<button class="pill" data-split="${s}">${s}</button>`).join('')}</div>`:`<div class="pill-row">${Object.keys(EXERCISE_DATABASE).map(m=>`<button class="pill ${selectedMuscles.includes(m)?'active':''}" data-muscle="${m}">${m}</button>`).join('')}</div>`}<div class="suggestion">Selected: ${selectedMuscles.join(' + ')}</div></div><div class="panel"><div class="panel-title">Exercises</div>${selectedMuscles.map(m=>`<div class="panel-title" style="font-size:16px">${m}</div><div class="choice-list">${EXERCISE_DATABASE[m].map(e=>`<button class="choice-btn ${selectedExercise===e?'active':''}" data-ex="${e}">${e}</button>`).join('')}</div>`).join('')}</div><div class="panel"><div class="panel-title">${selectedExercise}</div><div class="form-grid"><div class="field"><label>Set Type</label><select id="setType"><option>Warmup</option><option selected>Working</option></select></div><div class="field"><label>Set No.</label><input id="setNo" readonly value="${setsFor(selectedExercise).length+1}"></div><div class="field"><label>Weight</label><input id="setWeight" type="number"></div><div class="field"><label>Reps</label><input id="setReps" type="number"></div></div><button class="btn primary" id="addSet">Add Set</button><div id="restBox" class="suggestion ${restSeconds?'':'hidden'}"><strong>Rest Timer</strong><div id="restDisplay" style="font-size:34px;font-weight:950">${fmtRest()}</div><button class="btn" id="pauseRest">${restPaused?'Resume':'Pause'}</button><button class="btn" id="skipRest">Skip</button><button class="btn" id="addRest">+30 sec</button></div>${currentSets.map((s,i)=>`<div class="log-card">${s.exercise} • Set ${s.setNo} • ${s.weight}kg x ${s.reps}<button class="btn danger" data-delset="${i}">Delete</button></div>`).join('')}</div><div class="panel"><button class="btn" id="finishWorkout">Finish Workout</button><div class="panel-title">History for ${viewDate}</div>${workouts(viewDate).map(w=>`<div class="log-card"><div><strong>${w.name}</strong><div class="muted">${w.muscles.join('+')} • ${w.volume}kg • ${w.intensity}<br>${w.sets.map(s=>`${s.exercise} Set ${s.setNo}: ${s.weight}kg x ${s.reps}`).join('<br>')}</div></div></div>`).join('')||'<div class="item">No workouts logged.</div>'}</div>`);wireDate();document.querySelectorAll('[data-mode]').forEach(b=>b.onclick=()=>{workoutMode=b.dataset.mode;workout()});document.querySelectorAll('[data-split]').forEach(b=>b.onclick=()=>{selectedMuscles=SPLITS[b.dataset.split].slice(0,3);selectedExercise='';workout()});document.querySelectorAll('[data-muscle]').forEach(b=>b.onclick=()=>{let m=b.dataset.muscle;if(selectedMuscles.includes(m))selectedMuscles=selectedMuscles.filter(x=>x!==m);else if(selectedMuscles.length<3)selectedMuscles.push(m);selectedExercise='';workout()});document.querySelectorAll('[data-ex]').forEach(b=>b.onclick=()=>{selectedExercise=b.dataset.ex;workout()});q('addSet').onclick=()=>{let s={exercise:selectedExercise,setNo:setsFor(selectedExercise).length+1,type:q('setType').value,weight:q('setWeight').value,reps:q('setReps').value};currentSets.push(s);startRest(s);workout()};document.querySelectorAll('[data-delset]').forEach(b=>b.onclick=()=>{currentSets.splice(Number(b.dataset.delset),1);workout()});q('finishWorkout').onclick=finishWorkout;if(q('pauseRest'))q('pauseRest').onclick=()=>{restPaused=!restPaused;workout()};if(q('skipRest'))q('skipRest').onclick=()=>{stopRest();workout()};if(q('addRest'))q('addRest').onclick=()=>{restSeconds+=30;workout()}}
function setsFor(ex){return currentSets.filter(s=>s.exercise===ex)}function fmtRest(){return String(Math.floor(restSeconds/60)).padStart(2,'0')+':'+String(restSeconds%60).padStart(2,'0')}function startRest(s){stopRest();restSeconds=s.type==='Warmup'?45:90;if(Number(s.reps)<=5||Number(s.weight)>=100)restSeconds=120;restPaused=false;restInt=setInterval(()=>{if(!restPaused){restSeconds--;if(restSeconds<=0)stopRest();render()}},1000)}function stopRest(){clearInterval(restInt);restInt=null;restSeconds=0}
function finishWorkout(){if(!currentSets.length)return alert('Add at least one set');let vol=currentSets.reduce((a,s)=>a+Number(s.weight||0)*Number(s.reps||0),0),int=vol>6000?'High':vol>2500?'Moderate':'Light';data.workouts[viewDate]=workouts(viewDate);data.workouts[viewDate].push({name:selectedMuscles.join(' + '),muscles:[...selectedMuscles],sets:[...currentSets],volume:vol,intensity:int});currentSets=[];stopRest();smartPlan();save();alert('Workout saved. Volume: '+vol+'kg')}function recommendMuscles(){let recent=Object.values(data.workouts||{}).flat().slice(-3).flatMap(w=>w.muscles||[]);return Object.keys(EXERCISE_DATABASE).filter(m=>!recent.includes(m)).slice(0,2)}
function smartPlan(){let t=targets(),m=mealTotals(todayKey()),r=recoveryStatus(todayKey());data.coachPlans[todayKey()]={meal:[`Remaining protein: ${Math.max(0,t.protein-m.p)}g`,`Remaining calories: ${Math.max(0,t.calories-m.cal)} kcal`],workout:[`Recommended: ${recommendMuscles().join(' + ')||'Any fresh group'}`,`${r.decision}: ${r.decision==='Performance Day'?'hard training allowed':'manage intensity'}`],recovery:[`Water target: ${t.water}L`,`Recovery score: ${r.score}/100`]}}function planHtml(){let p=data.coachPlans[todayKey()];if(!p)return'<div class="item">Generate Smart Plan.</div>';return['meal','workout','recovery'].map(k=>`<div class="item"><strong>${k.toUpperCase()}</strong><ul>${p[k].map(i=>`<li>${i}</li>`).join('')}</ul></div>`).join('')}
function profile(){
 let p=data.profile;
 shell('Profile','Matches onboarding. Starting weight is stored internally from onboarding current weight.',`<div class="panel"><div class="form-grid">
 <div class="field"><label>Name</label><input id="pf_name" value="${p.name||''}"></div>
 <div class="field"><label>Age</label><input id="pf_age" type="number" value="${p.age||''}"></div>
 <div class="field"><label>Height (cm)</label><input id="pf_height" type="number" step="0.1" value="${p.height||''}"></div>
 <div class="field"><label>Current Weight</label><input id="pf_currentWeight" type="number" step="0.1" value="${p.currentWeight||''}"></div>
 <div class="field"><label>Goal</label><select id="pf_goal"><option ${p.goal==='Fat Loss'?'selected':''}>Fat Loss</option><option ${p.goal==='Muscle Gain'?'selected':''}>Muscle Gain</option><option ${p.goal==='Maintenance'?'selected':''}>Maintenance</option></select></div>
 <div class="field"><label>Target Weight</label><input id="pf_targetWeight" type="number" step="0.1" value="${p.targetWeight||''}"></div>
 <div class="field"><label>Target Body Fat %</label><input id="pf_targetBodyFat" type="number" step="0.1" value="${p.targetBodyFat||''}"></div>
 <div class="field"><label>Timeline Weeks</label><input id="pf_timelineWeeks" type="number" value="${p.timelineWeeks||''}"></div>
 <div class="field"><label>Target Date</label><input id="pf_targetDate" type="date" value="${p.targetDate||''}"></div>
 <div class="field"><label>Activity</label><select id="pf_activity"><option ${p.activity==='Low'?'selected':''}>Low</option><option ${p.activity==='Moderate'?'selected':''}>Moderate</option><option ${p.activity==='High'?'selected':''}>High</option></select></div>
 <div class="field"><label>Diet Preference</label><select id="pf_diet"><option ${p.diet==='Non-Veg'?'selected':''}>Non-Veg</option><option ${p.diet==='Veg'?'selected':''}>Veg</option><option ${p.diet==='Vegan'?'selected':''}>Vegan</option><option ${p.diet==='Mixed'?'selected':''}>Mixed</option></select></div>
 <div class="field"><label>Training Mode</label><select id="pf_mode"><option ${p.mode==='Beginner'?'selected':''}>Beginner</option><option ${p.mode==='Advanced'?'selected':''}>Advanced</option></select></div>
 </div><div class="suggestion" id="profileSuggestion">Starting weight: ${p.startWeight||p.currentWeight||'-'} kg</div><button class="btn primary" id="saveProfile">Save Profile</button></div>`);
 const fields=['name','age','height','currentWeight','targetWeight','targetBodyFat','timelineWeeks','targetDate','goal','activity','diet','mode'];
 const update=()=>{
   const goal=q('pf_goal').value, range=idealWeightRange(q('pf_height').value);
   q('profileSuggestion').innerHTML=(range.mid?`Healthy BMI weight range: ${range.min}–${range.max} kg.<br>`:'')+
   `Suggested body fat for ${goal}: ${suggestedBodyFat(goal)}.<br>Starting weight: ${p.startWeight||p.currentWeight||'-'} kg`;
 };
 fields.forEach(k=>{if(q('pf_'+k)){q('pf_'+k).oninput=update;q('pf_'+k).onchange=update}});
 q('pf_timelineWeeks').onchange=()=>{q('pf_targetDate').value=dateFromWeeks(q('pf_timelineWeeks').value);update()};
 q('pf_targetDate').onchange=()=>{q('pf_timelineWeeks').value=weeksFromDate(q('pf_targetDate').value);update()};
 update();
 q('saveProfile').onclick=()=>{fields.forEach(k=>data.profile[k]=q('pf_'+k).value);if(!data.profile.startWeight)data.profile.startWeight=data.profile.currentWeight;save()}
}

function recovery(){let r=recoveryStatus(viewDate);shell('Recovery',`${r.decision}`,`${dateControls()}<div class="panel"><div class="form-grid"><div class="field"><label>Sleep Duration</label><select id="sleep"><option>5</option><option>6</option><option selected>7</option><option>8</option><option>9</option></select></div><div class="field"><label>Sleep Quality</label><select id="quality"><option>Poor</option><option selected>Average</option><option>Good</option></select></div><div class="field"><label>Energy</label><select id="energy"><option>Low</option><option selected>Moderate</option><option>High</option></select></div><div class="field"><label>Soreness</label><select id="sore"><option>Low</option><option selected>Moderate</option><option>High</option></select></div></div><button class="btn primary" id="saveRec">Save Recovery</button></div><div class="panel"><div class="panel-title">${r.status} • ${r.decision}</div><div class="item">Score ${r.score}/100 • Water ${waterTotal(viewDate)}L</div></div>`);wireDate();q('saveRec').onclick=()=>{data.recovery[viewDate]={sleep:q('sleep').value,quality:q('quality').value,energy:q('energy').value,soreness:q('sore').value};save()}}
function progress(){shell('Progress','Goal progress and weight trend',`<div class="panel"><div class="field"><label>Weight</label><input id="weight"></div><button class="btn primary" id="addWeight">Add Weight</button></div><div class="panel">${data.weights.map((w,i)=>`<div class="log-card">${w.weight}kg • ${w.date}<button class="btn danger" data-delweight="${i}">Delete</button></div>`).join('')||'<div class="item">No logs.</div>'}</div>`);q('addWeight').onclick=()=>{data.weights.unshift({date:todayKey(),weight:q('weight').value});save()};document.querySelectorAll('[data-delweight]').forEach(b=>b.onclick=()=>{data.weights.splice(Number(b.dataset.delweight),1);save()})}
function coach(){let u=data.aiCoachUsage;if(u.date!==todayKey())u=data.aiCoachUsage={date:todayKey(),count:0};shell('AI Coach','5 AI questions/day',`<div class="panel"><div class="item">AI Coach: <strong>${u.count}/5</strong> used today</div><div class="field"><label>Question</label><textarea id="question"></textarea></div><button class="btn primary" id="ask">Ask AI Coach</button><button class="btn" id="quick">Quick Local Advice</button><div class="suggestion" id="answer"></div></div>`);q('quick').onclick=()=>q('answer').innerHTML=localCoach();q('ask').onclick=askCoach}function localCoach(){return`Recovery: ${recoveryStatus(todayKey()).status}<br>Recommended: ${recommendMuscles().join(' + ')||'Any fresh group'}<br>Protein remaining: ${Math.max(0,targets().protein-mealTotals(todayKey()).p)}g`}async function askCoach(){let u=data.aiCoachUsage;if(u.count>=5){q('answer').innerHTML='Daily limit reached.';return}q('answer').innerHTML='Thinking...';try{let r=await fetch('/.netlify/functions/ai-coach',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({question:q('question').value,context:data})});if(!r.ok)throw Error();let j=await r.json();u.count++;save();q('answer').innerHTML=j.answer}catch{q('answer').innerHTML=localCoach()+'<br><span class="muted">AI unavailable; fallback shown.</span>'}}
function settings(){
 shell('Settings',`STAYFITINLIFE ${APP_VERSION} • Last Updated: ${LAST_UPDATED}`,
 `<div class="panel">
   <div class="panel-title">Data</div>
   <button class="btn" id="export">Export</button>
   <label class="btn" for="importFile">Import</label>
   <input class="hidden" id="importFile" type="file">
   <button class="btn danger" id="delete">Delete Local Data</button>
 </div>
 <div class="panel">
   <div class="panel-title">Legal Documentation</div>
   <button class="btn" id="privacyBtn">Privacy Policy</button>
   <button class="btn" id="termsBtn">Terms of Use</button>
   <button class="btn" id="aiBtn">AI Disclaimer</button>
   <div class="muted" style="margin-top:14px">STAYFITINLIFE ${APP_VERSION} • Last Updated: ${LAST_UPDATED}</div>
 </div>`);
 q('export').onclick=()=>{let a=document.createElement('a');a.href=URL.createObjectURL(new Blob([JSON.stringify(data,null,2)],{type:'application/json'}));a.download='stayfitinlife-backup.json';a.click()};
 q('importFile').onchange=async e=>{let f=e.target.files[0];if(f){data={...data,...JSON.parse(await f.text())};save()}};
 q('delete').onclick=()=>{if(confirm('Delete data?')){localStorage.removeItem(STORE);location.reload()}};
 q('privacyBtn').onclick=()=>openLegalDoc('privacy');
 q('termsBtn').onclick=()=>openLegalDoc('terms');
 q('aiBtn').onclick=()=>openLegalDoc('ai');
}

function stopScannerStream(){if(scannerLoop)cancelAnimationFrame(scannerLoop);scannerLoop=null;if(scannerStream){scannerStream.getTracks().forEach(t=>t.stop());scannerStream=null}}async function openBarcodeScanner(){q('modal').classList.remove('hidden');q('modalCard').innerHTML=`<div class="panel-title">Scan Barcode</div><div class="muted">Rear camera opens by default. You can switch or close camera.</div><video id="scannerVideo" autoplay playsinline muted style="width:100%;max-height:55vh;border-radius:20px;background:#000;margin-top:12px"></video><div class="field"><label>Mode</label><select id="cameraFacingSelect"><option value="environment">Rear Camera</option><option value="user">Front Camera</option></select></div><div class="suggestion" id="scannerStatus">Starting rear camera...</div><button class="btn" id="switchCameraBtn">Switch Camera</button> <button class="btn" id="manualScannerEntry">Enter Barcode</button> <button class="btn danger" id="closeScanner">Close Camera</button>`;q('closeScanner').onclick=closeBarcodeScanner;q('manualScannerEntry').onclick=()=>{closeBarcodeScanner();manualBarcodeEntry()};q('switchCameraBtn').onclick=()=>{scannerFacingMode=scannerFacingMode==='environment'?'user':'environment';startBarcodeCamera()};q('cameraFacingSelect').onchange=()=>{scannerFacingMode=q('cameraFacingSelect').value;startBarcodeCamera()};startBarcodeCamera()}
async function startBarcodeCamera(){try{stopScannerStream();scannerStream=await navigator.mediaDevices.getUserMedia({video:{facingMode:{ideal:scannerFacingMode}}});let v=q('scannerVideo');v.srcObject=scannerStream;await v.play().catch(()=>{});if('BarcodeDetector'in window){barcodeDetector=new BarcodeDetector({formats:['ean_13','ean_8','upc_a','upc_e','code_128','qr_code']});q('scannerStatus').innerHTML='Camera ready. Align barcode.';detectBarcodeLoop()}else q('scannerStatus').innerHTML='Camera opened. Browser lacks automatic detection; use manual entry.'}catch(e){q('scannerStatus').innerHTML='Camera permission failed. Use manual entry.'}}async function detectBarcodeLoop(){let v=q('scannerVideo');if(!v||!barcodeDetector)return;try{if(v.readyState>=2){let codes=await barcodeDetector.detect(v);if(codes&&codes.length){let code=codes[0].rawValue;closeBarcodeScanner();handleBarcodeResult(code);return}}}catch(e){}scannerLoop=requestAnimationFrame(detectBarcodeLoop)}function closeBarcodeScanner(){stopScannerStream();q('modal').classList.add('hidden');q('modalCard').innerHTML=''}function manualBarcodeEntry(){let code=prompt('Enter barcode number');if(code)handleBarcodeResult(code.trim())}function handleBarcodeResult(code){let match=foodList().find(f=>String(f.barcode||'')===String(code));if(match){mainCat=match.main;subCat=match.sub;selectedFood=match.name;alert('Found: '+match.name);nutrition();return}let name=prompt('Barcode not found. Enter product/supplement name:','Custom Product');if(!name)return;let isSupp=confirm('Is this a supplement? OK = Supplement, Cancel = Food');let item={main:isSupp?'Supplements':'Custom',sub:'Barcode',name,barcode:code,defaultQty:1,unit:'serving',portion:'1 serving',calories:Number(prompt('Calories:','0')||0),protein:Number(prompt('Protein:','0')||0),carbs:Number(prompt('Carbs:','0')||0),fats:Number(prompt('Fats:','0')||0)};if(isSupp){data.customSupplements.push(item);mainCat='Supplements'}else{data.customFoods.push(item);mainCat='Custom'}subCat='Barcode';selectedFood=name;save()}
function bind(){q('mobileMenuBtn').onclick=()=>q('sidebar').classList.toggle('open');document.querySelectorAll('[data-tab]').forEach(b=>b.onclick=()=>switchTab(b.dataset.tab));document.querySelectorAll('[data-mobile-tab]').forEach(b=>b.onclick=()=>switchTab(b.dataset.mobileTab))}
bind();render();if('serviceWorker'in navigator)window.addEventListener('load',()=>navigator.serviceWorker.register('/sw.js?v=12').catch(()=>{}));