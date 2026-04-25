import { FOOD_DATABASE } from './data/foodDatabase.js';
import { EXERCISE_DATABASE, SPLITS } from './data/exerciseDatabase.js';
import { SUPPLEMENT_DATABASE } from './data/supplementDatabase.js';

const STORE='stayfitinlife_stable_1_0_3_hotfix_final';
const APP_VERSION='Stable Version 1.0.3 Hotfix';
const LAST_UPDATED='25 April 2026';

const todayKey=()=>new Date().toISOString().slice(0,10);
const yesterdayKey=()=>{const d=new Date();d.setDate(d.getDate()-1);return d.toISOString().slice(0,10)};
const q=id=>document.getElementById(id);
const round=(n,d=1)=>Math.round((Number(n)||0)*10**d)/10**d;

const defaultData={
  profile:{},
  introSeen:false,
  units:{system:'metric'},
  meals:{},
  water:{},
  workouts:{},
  weights:[],
  recovery:{},
  coachPlans:{},
  customFoods:[],
  customSupplements:[],
  aiCoachUsage:{date:todayKey(),count:0},aiCache:{},barcodeCache:{},intelligence:{reports:{},patterns:{}},notifications:[],customExercises:[],dayClosures:{},selectedDate:null
};

let data=load();
let appMode='app';
let tab='home';
let viewDate=todayKey();

let onboardingStep=0;
let onboardingTemp={};

let selectedMeal='Breakfast';
let mainCat='Cuisines';
let selectedCuisine='Indian';
let subCat='All';
let selectedFood='Butter Chicken';

let workoutMode='Custom Muscles';
let selectedMuscles=['Chest'];
let selectedExercise='Bench Press';
let currentSets=[];
let restSeconds=0;
let restInt=null;
let restPaused=false;


let barcodeDetector=null;
let scannerLoop=null;
let scannerFacingMode='environment';

const LEGAL_DOCS={
privacy:`<div class="panel-title">Privacy Policy – STAYFITINLIFE</div>
<div class="muted"><strong>Version:</strong> ${APP_VERSION}<br><strong>Last Updated:</strong> ${LAST_UPDATED}</div>
<div class="item"><strong>1. Information We Collect</strong><br>We may collect profile data, body metrics, nutrition logs, workout logs, water intake, recovery inputs and basic device/browser information.</div>
<div class="item"><strong>2. How We Use Your Data</strong><br>We use your data to personalize fitness, nutrition, recovery and AI coaching suggestions. We do not sell your personal data.</div>
<div class="item"><strong>3. Data Storage</strong><br>In this version, data is stored locally in your browser/device. Cloud sync is not enabled.</div>
<div class="item"><strong>4. Third-Party Services</strong><br>AI services may process limited data when you use AI Coach.</div>
<div class="item"><strong>5. Your Rights</strong><br>You can export, import, edit or delete your local app data.</div>
<div class="item"><strong>6. Security</strong><br>No system is 100% secure. You are responsible for device and browser security.</div>
<div class="item"><strong>7. Children’s Privacy</strong><br>This app is not intended for users under 13.</div>
<div class="item"><strong>8. Updates</strong><br>Continued use means you accept the latest policy.</div>`,
terms:`<div class="panel-title">Terms of Use – STAYFITINLIFE</div>
<div class="muted"><strong>Version:</strong> ${APP_VERSION}<br><strong>Last Updated:</strong> ${LAST_UPDATED}</div>
<div class="item"><strong>1. Acceptable Use</strong><br>Use this app for personal fitness, nutrition, recovery and habit tracking only.</div>
<div class="item"><strong>2. Not Medical Advice</strong><br>STAYFITINLIFE does not replace doctors, dietitians, physiotherapists or certified trainers.</div>
<div class="item"><strong>3. User Responsibility</strong><br>You are responsible for your workouts, nutrition, supplement use and health decisions.</div>
<div class="item"><strong>4. Data Accuracy</strong><br>Calories, macros, recovery scores and AI recommendations are estimates.</div>
<div class="item"><strong>5. App Changes</strong><br>Features and calculations may change over time.</div>
<div class="item"><strong>6. Limitation of Liability</strong><br>STAYFITINLIFE is not liable for injuries, health problems, inaccurate inputs or outcomes from suggestions.</div>
<div class="item"><strong>7. Intellectual Property</strong><br>Branding, UI and app logic belong to STAYFITINLIFE.</div>`,
ai:`<div class="panel-title">AI Disclaimer – STAYFITINLIFE</div>
<div class="muted"><strong>Version:</strong> ${APP_VERSION}<br><strong>Last Updated:</strong> ${LAST_UPDATED}</div>
<div class="item"><strong>1. Nature of AI Coach</strong><br>AI Coach provides automated suggestions based on your inputs and app data.</div>
<div class="item"><strong>2. Not Professional Advice</strong><br>AI responses are not medical, dietitian, mental health, physiotherapy or certified training advice.</div>
<div class="item"><strong>3. Input-Based Output</strong><br>Incorrect or incomplete inputs may produce inaccurate recommendations.</div>
<div class="item"><strong>4. No Guarantees</strong><br>No weight loss, muscle gain, performance or health outcome is guaranteed.</div>
<div class="item"><strong>5. Use at Your Own Risk</strong><br>Stop any exercise or diet change causing pain, dizziness or discomfort.</div>
<div class="item"><strong>6. Consult Professionals</strong><br>Consult qualified professionals before major exercise, diet, supplement or health changes.</div>`
};

function load(){
  try{return {...defaultData,...JSON.parse(localStorage.getItem(STORE)||'{}')}}
  catch{return structuredClone(defaultData)}
}
function save(){localStorage.setItem(STORE,JSON.stringify(data));render()}
function profileComplete(){
  const p=data.profile;
  return !!(p.name&&p.age&&p.height&&p.currentWeight&&p.goal&&p.activity&&p.diet&&p.mode);
}
function shell(title,sub,content){
  q('main').innerHTML=`<section><div class="header"><h1>${title}</h1><div class="muted">${sub||''}</div></div>${content}</section>`;
}
function setActiveNav(){
  document.querySelectorAll('[data-tab]').forEach(b=>b.classList.toggle('active',b.dataset.tab===tab));
  document.querySelectorAll('[data-mobile-tab]').forEach(b=>b.classList.toggle('active',b.dataset.mobileTab===tab));
}
function switchTab(t){tab=t;appMode='app';q('sidebar')?.classList.remove('open');render()}
function render(){if(profileComplete() && !data.introSeen && appMode!=='onboarding'){showAppGuide();return}
  setActiveNav();
  if(!profileComplete() || appMode==='onboarding'){
    renderOnboarding();
    return;
  }
  ({home,nutrition,workout,coach,profile,recovery,progress,settings}[tab]||home)();
}


// ---------- Stable Version 1.0 Global Units System ----------
function unitSystem(){ return (data.units&&data.units.system)||data.profile.unitsSystem||'metric'; }
function isImperial(){ return unitSystem()==='imperial'; }
function unitLabels(){
  return isImperial()
    ? {weight:'lb',height:'ft-in',water:'oz',food:'oz',workout:'lb'}
    : {weight:'kg',height:'cm',water:'L',food:'g',workout:'kg'};
}
function kgToLb(kg){return round((Number(kg)||0)*2.20462,1)}
function lbToKg(lb){return round((Number(lb)||0)*0.453592,1)}
function cmToFtIn(cm){
  const total=Math.round((Number(cm)||0)*0.393701);
  const ft=Math.floor(total/12);
  const inch=total-ft*12;
  return {ft,inch};
}
function ftInToCm(ft,inch){return round(((Number(ft)||0)*12+(Number(inch)||0))*2.54,1)}
function lToOz(l){return round((Number(l)||0)*33.814,1)}
function ozToL(oz){return round((Number(oz)||0)/33.814,2)}
function gToOz(g){return round((Number(g)||0)/28.3495,1)}
function ozToG(oz){return round((Number(oz)||0)*28.3495,1)}
function displayWeight(kg){return isImperial()?kgToLb(kg):round(kg,1)}
function inputWeightToKg(v){return isImperial()?lbToKg(v):Number(v)}
function displayHeight(cm){
  if(isImperial()){
    const h=cmToFtIn(cm);
    return `${h.ft}'${h.inch}"`;
  }
  return round(cm,1);
}
function displayWater(l){return isImperial()?lToOz(l):round(l,1)}
function unitGuide(unit, portion=''){
  const metric={
    bowl:'1 bowl ≈ 250g',
    cup:'1 cup ≈ 240ml / 200g',
    tbsp:'1 tbsp ≈ 15ml / 14g',
    tsp:'1 tsp ≈ 5ml / 4–5g',
    plate:'1 plate ≈ 250–350g',
    piece:'1 piece = item specific',
    serving:'1 serving = product specific',
    scoop:'1 scoop ≈ 30g',
    g:'grams',
    ml:'milliliters'
  };
  const imperial={
    bowl:'1 bowl ≈ 8.8 oz',
    cup:'1 cup ≈ 8 fl oz / 7 oz',
    tbsp:'1 tbsp ≈ 0.5 fl oz',
    tsp:'1 tsp ≈ 0.17 fl oz',
    plate:'1 plate ≈ 9–12 oz',
    piece:'1 piece = item specific',
    serving:'1 serving = product specific',
    scoop:'1 scoop ≈ 1.1 oz',
    g:'grams',
    ml:'milliliters'
  };
  if(portion) return portion;
  return (isImperial()?imperial:metric)[unit]||`${unit}`;
}
function unitOptionLabel(unit, portion=''){
  const guide=unitGuide(unit, portion);
  return `${unit} — ${guide}`;
}
function quantityLine(qty, unit, portion=''){
  return `${qty} ${unit} • ${unitGuide(unit,portion)}`;
}

// ---------- Onboarding: stable page route, no modal ----------
function idealWeightRange(heightCm){
  const h=Number(heightCm)/100;
  if(!h)return{min:0,max:0,mid:0};
  const min=round(18.5*h*h,1), max=round(24.9*h*h,1);
  return{min,max,mid:round((min+max)/2,1)};
}
function suggestedBodyFat(goal){
  if(goal==='Muscle Gain')return'12-18%';
  if(goal==='Maintenance')return'13-20%';
  return'10-16%';
}
function estimatedTargetFromFat(currentWeight,targetBf){
  const bf=Number(targetBf),cw=Number(currentWeight);
  if(!bf||!cw||bf>=45)return'';
  const leanMass=cw*(1-24/100);
  return round(leanMass/(1-bf/100),1);
}
function estimatedFatFromTarget(currentWeight,targetWeight){
  const cw=Number(currentWeight),tw=Number(targetWeight);
  if(!cw||!tw)return'';
  const leanMass=cw*(1-24/100);
  const bf=round((1-leanMass/tw)*100,1);
  return Math.max(6,Math.min(35,bf));
}
function dateFromWeeks(weeks){
  const d=new Date();
  d.setDate(d.getDate()+Number(weeks||8)*7);
  return d.toISOString().slice(0,10);
}
function weeksFromDate(dateStr){
  if(!dateStr)return 8;
  const ms=new Date(dateStr)-new Date();
  return Math.max(1,Math.round(ms/(1000*60*60*24*7)));
}
function startOnboarding(){
  appMode='onboarding';
  onboardingStep=1;
  onboardingTemp={...data.profile,unitsSystem:unitSystem()};
  render();
}

function renderOnboarding(){
  if(profileComplete() && appMode!=='onboarding'){home();return}
  if(onboardingStep===0){
    shell('Setup Required','Complete 2-step onboarding to activate your targets and dashboard.',
    `<div class="panel onboarding-page"><div class="panel-title">Welcome to STAYFITINLIFE</div>
     <div class="muted">Step 1 captures your basic info and preferred units. Step 2 builds your goal plan.</div>
     <button class="btn primary" id="startOnboarding" style="margin-top:16px">Start Onboarding</button></div>`);
    q('startOnboarding').onclick=startOnboarding;
    return;
  }

  if(onboardingStep===1){
    const t=onboardingTemp;
    const h=cmToFtIn(t.height||162.5);
    shell('Onboarding','Step 1 of 2 — Basic Info',
    `<div class="panel onboarding-page">
      <div class="onboarding-progress"><span style="width:50%"></span></div>
      <div class="panel-title" style="font-size:18px;margin-top:8px">Preferred Units</div>
      <div class="pill-row">
        <button class="pill ${((t.unitsSystem||unitSystem())==='metric')?'active':''}" data-unit-system="metric">Metric (kg, cm, L, g)</button>
        <button class="pill ${((t.unitsSystem||unitSystem())==='imperial')?'active':''}" data-unit-system="imperial">Imperial (lb, ft-in, oz)</button>
      </div>

      <div class="form-grid">
        <div class="field"><label>Name</label><input id="ob_name" value="${t.name||''}" placeholder="Your name"></div>
        <div class="field"><label>Age</label><input id="ob_age" type="number" min="10" max="100" value="${t.age||''}" placeholder="43"></div>
        ${isImperial()?`
          <div class="field"><label>Height</label>
            <div class="inline-fields">
              <input id="ob_height_ft" type="number" min="1" max="8" value="${h.ft||5}" placeholder="5"><span>ft</span>
              <input id="ob_height_in" type="number" min="0" max="11" value="${h.inch||4}" placeholder="4"><span>in</span>
            </div>
          </div>
        `:`
          <div class="field"><label>Height (cm)</label><input id="ob_height_cm" type="number" step="0.1" value="${t.height||''}" placeholder="162.5"></div>
        `}
        <div class="field"><label>Current Weight (${unitLabels().weight})</label><input id="ob_currentWeight" type="number" step="0.1" value="${t.currentWeight?displayWeight(t.currentWeight):''}" placeholder="${isImperial()?'176':'80.1'}"></div>
      </div>

      <div class="suggestion">Starting weight is saved internally as your current weight. No separate input needed.</div>
      <div style="display:flex;gap:10px;margin-top:18px;flex-wrap:wrap">
        <button class="btn primary" id="obNext">Next: Goal</button>
      </div>
    </div>`);
    document.querySelectorAll('[data-unit-system]').forEach(b=>b.onclick=()=>{onboardingTemp.unitsSystem=b.dataset.unitSystem;data.units={system:b.dataset.unitSystem};render()});
    q('obNext').onclick=()=>{
      onboardingTemp.name=q('ob_name').value.trim();
      onboardingTemp.age=q('ob_age').value.trim();
      onboardingTemp.unitsSystem=unitSystem();
      onboardingTemp.height=isImperial()?ftInToCm(q('ob_height_ft').value,q('ob_height_in').value):q('ob_height_cm').value.trim();
      onboardingTemp.currentWeight=inputWeightToKg(q('ob_currentWeight').value.trim());
      const missing=['name','age','height','currentWeight'].filter(k=>!onboardingTemp[k]);
      if(missing.length){alert('Please complete: '+missing.join(', '));return}
      onboardingTemp.startWeight=onboardingTemp.currentWeight;
      onboardingTemp.goal=onboardingTemp.goal||'Fat Loss';
      onboardingTemp.targetType=onboardingTemp.targetType||'weight';
      onboardingTemp.timelineWeeks=String(onboardingTemp.timelineWeeks||8);
      onboardingTemp.targetDate=onboardingTemp.targetDate||dateFromWeeks(onboardingTemp.timelineWeeks);
      onboardingTemp.activity=onboardingTemp.activity||'Moderate';
      onboardingTemp.diet=onboardingTemp.diet||'Non-Veg';
      onboardingTemp.mode=onboardingTemp.mode||'Beginner';
      onboardingStep=2;
      render();
    };
    return;
  }

  if(onboardingStep===2){
    const t=onboardingTemp;
    const range=idealWeightRange(t.height);
    shell('Onboarding','Step 2 of 2 — Goal Setup',
    `<div class="panel onboarding-page">
      <div class="onboarding-progress"><span style="width:100%"></span></div>
      <div class="panel-title">Choose Your Goal</div>
      <div class="choice-list onboarding-goals">
        <button class="choice-btn ${t.goal==='Fat Loss'?'active':''}" data-obgoal="Fat Loss">🔥 Fat Loss<br><span class="muted">Lose weight and body fat</span></button>
        <button class="choice-btn ${t.goal==='Muscle Gain'?'active':''}" data-obgoal="Muscle Gain">💪 Muscle Gain<br><span class="muted">Build muscle and strength</span></button>
        <button class="choice-btn ${t.goal==='Maintenance'?'active':''}" data-obgoal="Maintenance">⚖️ Maintenance<br><span class="muted">Stay fit and balanced</span></button>
      </div>

      <div class="panel-title" style="font-size:18px;margin-top:18px">Target</div>
      <div class="pill-row">
        <button class="pill ${t.targetType==='weight'?'active':''}" data-obtarget="weight">Goal Weight</button>
        <button class="pill ${t.targetType==='bodyfat'?'active':''}" data-obtarget="bodyfat">Body Fat %</button>
      </div>

      <div class="form-grid">
        <div class="field"><label>Target Weight (${unitLabels().weight})</label><input id="ob_targetWeight" type="number" step="0.1" value="${t.targetWeight?displayWeight(t.targetWeight):''}" placeholder="${isImperial()?'158':'72'}"></div>
        <div class="field"><label>Target Body Fat %</label><input id="ob_targetBodyFat" type="number" step="0.1" value="${t.targetBodyFat||''}" placeholder="15"></div>
        <div class="field"><label>Timeline Weeks</label><select id="ob_timelineWeeks">${['6','8','10','12','14','16','20','24'].map(w=>`<option ${String(t.timelineWeeks)===w?'selected':''}>${w}</option>`).join('')}</select></div>
        <div class="field"><label>Target Date</label><input id="ob_targetDate" type="date" value="${t.targetDate||dateFromWeeks(t.timelineWeeks)}"></div>
        <div class="field"><label>Activity Level</label><select id="ob_activity"><option ${t.activity==='Low'?'selected':''}>Low</option><option ${t.activity==='Moderate'?'selected':''}>Moderate</option><option ${t.activity==='High'?'selected':''}>High</option></select></div>
        <div class="field"><label>Diet Preference</label><select id="ob_diet"><option ${t.diet==='Non-Veg'?'selected':''}>Non-Veg</option><option ${t.diet==='Veg'?'selected':''}>Veg</option><option ${t.diet==='Vegan'?'selected':''}>Vegan</option><option ${t.diet==='Mixed'?'selected':''}>Mixed</option></select></div>
        <div class="field"><label>Training Mode</label><select id="ob_mode"><option ${t.mode==='Beginner'?'selected':''}>Beginner</option><option ${t.mode==='Advanced'?'selected':''}>Advanced</option></select></div>
      </div>

      <div class="suggestion" id="goalSummary"></div>
      <label class="item" style="display:flex;gap:10px;align-items:flex-start">
        <input id="legalAccept" type="checkbox" style="width:auto;min-height:auto;margin-top:4px">
        <span>I accept the Privacy Policy, Terms of Use, and AI Disclaimer for STAYFITINLIFE ${APP_VERSION}.</span>
      </label>
      <div style="display:flex;gap:10px;margin-top:18px;flex-wrap:wrap">
        <button class="btn" id="obBack">Back</button>
        <button class="btn primary" id="obFinish">Generate My Plan 🚀</button>
      </div>
    </div>`);

    const sync=()=>{
      t.targetWeight=inputWeightToKg(q('ob_targetWeight').value);
      t.targetBodyFat=q('ob_targetBodyFat').value;
      t.timelineWeeks=q('ob_timelineWeeks').value;
      t.targetDate=q('ob_targetDate').value;
      t.activity=q('ob_activity').value;
      t.diet=q('ob_diet').value;
      t.mode=q('ob_mode').value;
      const current=Number(t.currentWeight);
      if(t.targetType==='weight' && t.targetWeight && !q('ob_targetBodyFat').dataset.userEdited){
        q('ob_targetBodyFat').value=estimatedFatFromTarget(current,t.targetWeight); t.targetBodyFat=q('ob_targetBodyFat').value;
      }
      if(t.targetType==='bodyfat' && t.targetBodyFat && !q('ob_targetWeight').dataset.userEdited){
        const est=estimatedTargetFromFat(current,t.targetBodyFat); q('ob_targetWeight').value=displayWeight(est); t.targetWeight=est;
      }
      const tw=Number(t.targetWeight), weeks=Number(t.timelineWeeks||weeksFromDate(t.targetDate));
      const change=tw?round(Math.abs(current-tw),1):0, weekly=weeks&&change?round(change/weeks,2):0;
      let status='Enter target weight/body fat to validate.', color='var(--muted)';
      if(tw&&weeks){
        if(t.goal==='Fat Loss'){
          if(weekly>1){status='Aggressive. Extend timeline for sustainability.';color='var(--red)'}
          else if(weekly>=0.4&&weekly<=0.9){status='Realistic and sustainable.';color='var(--green)'}
          else {status='Slow and sustainable.';color='var(--green)'}
        }else if(t.goal==='Muscle Gain'){
          if(weekly>0.5){status='Aggressive muscle gain target.';color='var(--red)'} else {status='Realistic muscle gain pace.';color='var(--green)'}
        }else {status='Maintenance goal selected.';color='var(--green)'}
      }
      q('goalSummary').innerHTML=`Healthy weight estimate: ${displayWeight(range.min)}-${displayWeight(range.max)} ${unitLabels().weight}.<br>
      Suggested body fat range for ${t.goal}: ${suggestedBodyFat(t.goal)}.<br>
      Timeline: ${weeks} weeks • Target date: ${t.targetDate||dateFromWeeks(weeks)}<br>
      ${tw?`Change required: ${displayWeight(change)} ${unitLabels().weight} → ${displayWeight(weekly)} ${unitLabels().weight}/week.<br>`:''}
      <strong style="color:${color}">${status}</strong>`;
    };
    document.querySelectorAll('[data-obgoal]').forEach(b=>b.onclick=()=>{t.goal=b.dataset.obgoal;render()});
    document.querySelectorAll('[data-obtarget]').forEach(b=>b.onclick=()=>{t.targetType=b.dataset.obtarget;render()});
    q('ob_timelineWeeks').onchange=()=>{q('ob_targetDate').value=dateFromWeeks(q('ob_timelineWeeks').value);sync()};
    q('ob_targetDate').onchange=()=>{q('ob_timelineWeeks').value=String(weeksFromDate(q('ob_targetDate').value));sync()};
    q('ob_targetWeight').oninput=()=>{q('ob_targetWeight').dataset.userEdited='1';if(t.targetType==='weight')q('ob_targetBodyFat').dataset.userEdited='';sync()};
    q('ob_targetBodyFat').oninput=()=>{q('ob_targetBodyFat').dataset.userEdited='1';if(t.targetType==='bodyfat')q('ob_targetWeight').dataset.userEdited='';sync()};
    ['activity','diet','mode'].forEach(k=>q('ob_'+k).onchange=sync);
    q('obBack').onclick=()=>{onboardingStep=1;render()};
    q('obFinish').onclick=()=>{
      sync();
      if(!t.targetWeight && !t.targetBodyFat){alert('Please enter target weight or body fat.');return}
      if(!q('legalAccept').checked){alert('Please accept the Privacy Policy, Terms of Use, and AI Disclaimer.');return}
      data.units={system:t.unitsSystem||unitSystem()};
      data.profile={...t,startWeight:t.currentWeight,legalAccepted:true,legalVersion:APP_VERSION,legalAcceptedAt:new Date().toISOString()};
      data.introSeen=false;
      appMode='app'; onboardingStep=0; onboardingTemp={}; tab='home'; save();
    };
    sync();
  }
}



// ---------- Stable 1.0 App Guide ----------
function appGuideHtml(){
  return `<div class="panel onboarding-page app-guide">
    <div class="panel-title">Welcome to STAYFITINLIFE</div>
    <div class="muted">Track your fitness, nutrition, workouts and progress — all in one place.</div>
    <div class="item"><strong>🏠 Dashboard</strong><br>Monitor calories, macros, water, recovery and today’s plan.</div>
    <div class="item"><strong>🍽 Nutrition</strong><br>Log meals, scan barcodes and track supplements.</div>
    <div class="item"><strong>🏋️ Workouts</strong><br>Track exercises, sets, reps and performance.</div>
    <div class="item"><strong>🧠 Coach</strong><br>Generate smart meal and workout plans.</div>
    <div class="item"><strong>📈 Progress</strong><br>Analyze trends with intelligent insights.</div>
    <div class="suggestion"><strong>For the best experience on mobile:</strong><br>👉 Add this app to your Home Screen.<br><br>This allows faster access, full-screen usage, and a smoother app-like experience.<br><br><strong>On iPhone:</strong> Tap Share → Add to Home Screen<br><strong>On Android:</strong> Tap ⋮ → Add to Home Screen</div>
    <button class="btn primary" id="startUsingApp">Start Using App</button>
  </div>`;
}
function showAppGuide(){
  shell('App Guide','How to get the best from STAYFITINLIFE',appGuideHtml());
  q('startUsingApp').onclick=()=>{data.introSeen=true;save()};
}



// ---------- Core calculations ----------
function targets(){
  const p=data.profile,w=Number(p.currentWeight)||70;
  let c=w*30;
  if(p.goal==='Fat Loss')c-=450;
  if(p.goal==='Muscle Gain')c+=300;
  c=Math.round(c);
  return{calories:c,protein:Math.round(w*1.8),carbs:Math.round(c*.42/4),fats:Math.round(c*.25/9),water:round(Math.max(2,w*.035+(p.goal==='Fat Loss'?.3:0)+(p.goal==='Muscle Gain'?.5:0)+(p.activity==='High'?.5:0)))};
}
const meals=(d=viewDate)=>data.meals[d]||[];
const waterLogs=(d=viewDate)=>data.water[d]||[];
const workouts=(d=viewDate)=>data.workouts[d]||[];
function mealTotals(d=viewDate){return meals(d).reduce((a,m)=>({cal:a.cal+Number(m.calories||0),p:a.p+Number(m.protein||0),c:a.c+Number(m.carbs||0),f:a.f+Number(m.fats||0)}),{cal:0,p:0,c:0,f:0})}
function waterTotal(d=viewDate){return round(waterLogs(d).reduce((a,w)=>a+Number(w.amount||0),0)/1000)}
function recoveryStatus(d=viewDate){
  const r=data.recovery[d];
  let score=60;
  if(r){
    score=50;
    if(Number(r.sleep)>=8)score+=25; else if(Number(r.sleep)>=7)score+=15; else if(Number(r.sleep)<6)score-=20;
    if(r.quality==='Good')score+=10; if(r.quality==='Poor')score-=10;
    if(r.energy==='High')score+=15; if(r.energy==='Low')score-=15;
    if(r.soreness==='Low')score+=10; if(r.soreness==='High')score-=20;
  }
  score+=Math.min(10,waterTotal(d)*2);
  if(meals(d).some(m=>m.main==='Alcohol'))score-=10;
  score=Math.max(0,Math.min(100,score));
  return{score,status:score>=85?'Peak':score>=70?'High':score>=50?'Moderate':'Low',decision:score>=85?'Performance Day':score>=70?'Progress Day':score>=50?'Maintain Day':'Recovery Day'};
}
function dateControls(){
  return`<div class="pill-row"><button class="pill ${viewDate===todayKey()?'active':''}" data-datepick="${todayKey()}">Today</button><button class="pill ${viewDate===yesterdayKey()?'active':''}" data-datepick="${yesterdayKey()}">Yesterday</button><input id="viewDatePicker" type="date" value="${viewDate}" style="max-width:180px"></div>`;
}
function wireDate(){
  document.querySelectorAll('[data-datepick]').forEach(b=>b.onclick=()=>{viewDate=b.dataset.datepick;render()});
  if(q('viewDatePicker'))q('viewDatePicker').onchange=e=>{viewDate=e.target.value;render()};
}


// ---------- V13.1 Coach Engine ----------
function isBeginnerMode(){ return (data.profile.mode||'Beginner')==='Beginner'; }
function findFoodByName(name){
  return foodList().find(f=>f.name===name) || foodList().find(f=>String(f.name).toLowerCase().includes(String(name).toLowerCase()));
}
function chooseFoodsByDiet(){
  const diet=(data.profile.diet||'Non-Veg').toLowerCase();
  if(diet.includes('veg') && !diet.includes('non')) return {
    breakfast:["Oats","Banana","Milk"],
    lunch:["Paneer Curry","Plain Rice","Cucumber"],
    dinner:["Dal Tadka","Roti","Curd"],
    snack:["Whey Protein","Apple"]
  };
  return {
    breakfast:["Egg Dish","Banana","Coffee"],
    lunch:["Chicken Curry","Plain Rice","Cucumber"],
    dinner:["Paneer Curry","Roti","Curd"],
    snack:["Whey Protein","Apple"]
  };
}
function buildMealLine(name,meal,multiplier=1){
  const f=findFoodByName(name);
  if(!f) return {meal,name,qty:1,unit:"serving",calories:0,protein:0,carbs:0,fats:0,portion:""};
  return {meal,name:f.name,qty:round((f.defaultQty||1)*multiplier,1),unit:f.unit||"serving",calories:Math.round((f.calories||0)*multiplier),protein:round((f.protein||0)*multiplier),carbs:round((f.carbs||0)*multiplier),fats:round((f.fats||0)*multiplier),portion:f.portion||""};
}
function generateMealPlanEngine(){
  const t=targets(), foods=chooseFoodsByDiet();
  const mealMap=[["Breakfast",foods.breakfast,.25],["Lunch",foods.lunch,.35],["Dinner",foods.dinner,.30],["Snacks",foods.snack,.10]];
  const meals=mealMap.map(([meal,items,share])=>{
    const targetCal=t.calories*share;
    const base=items.map(n=>buildMealLine(n,meal,1));
    const baseCal=Math.max(1,base.reduce((a,x)=>a+x.calories,0));
    const factor=Math.max(.6,Math.min(1.8,targetCal/baseCal));
    return {meal,targetCalories:Math.round(targetCal),items:items.map(n=>buildMealLine(n,meal,factor))};
  });
  const totals=meals.flatMap(p=>p.items).reduce((a,x)=>({calories:a.calories+x.calories,protein:a.protein+x.protein,carbs:a.carbs+x.carbs,fats:a.fats+x.fats}),{calories:0,protein:0,carbs:0,fats:0});
  return {mode:isBeginnerMode()?"Beginner":"Advanced",targets:t,meals,totals};
}
function generateWorkoutPlanEngine(){
  const rec=recoveryStatus(todayKey()), mode=isBeginnerMode()?"Beginner":"Advanced";
  const muscles=recommendMuscles();
  let split="Full Body";
  if(rec.score>=70) split=muscles.length?muscles.join(" + "):"Push Day";
  if(rec.score<50) split="Recovery / Mobility";
  const pool=split.includes("Recovery")?["Walk","Mobility","Stretching"]:muscles.flatMap(m=>(EXERCISE_DATABASE[m]||[]).slice(0, mode==="Beginner"?2:3));
  const exercises=pool.slice(0, mode==="Beginner"?5:7).map((name,i)=>({name,sets:split.includes("Recovery")?2:(mode==="Beginner"?3:4),reps:split.includes("Recovery")?"easy":(i<2?"6-10":"10-15"),rest:split.includes("Recovery")?"30 sec":(i<2?"90 sec":"60 sec")}));
  return {mode,split,recovery:rec.status,decision:rec.decision,exercises};
}
function coachInsights(){
  const t=targets(),m=mealTotals(todayKey()),w=waterTotal(todayKey()),r=recoveryStatus(todayKey());
  const arr=[];
  arr.push(m.p<t.protein?`Protein remaining: ${Math.max(0,Math.round(t.protein-m.p))}g`:'Protein on track');
  arr.push(w<t.water?`Water remaining: ${round(t.water-w)}L`:'Water on track');
  arr.push(`Recovery: ${r.status} (${r.decision})`);
  arr.push(`Suggested muscles: ${recommendMuscles().join(" + ")||"Flexible"}`);
  return arr;
}
function generateFullCoachPlan(){
  return {date:todayKey(),generatedAt:new Date().toISOString(),mode:isBeginnerMode()?"Beginner":"Advanced",mealPlan:generateMealPlanEngine(),workoutPlan:generateWorkoutPlanEngine(),insights:coachInsights()};
}
function coachPlanCard(){
  const p=data.coachPlans[todayKey()];
  if(!p) return '<div class="item">No plan yet. Generate today’s coach plan.</div>';
  if(p.mode==="Advanced") return `<div class="item"><strong>Advanced Mode: Targets + Insights</strong><br>${p.insights.join("<br>")}</div><div class="item"><strong>Optional Workout:</strong> ${p.workoutPlan.split}<br>${p.workoutPlan.exercises.map(e=>`• ${e.name}: ${e.sets} sets x ${e.reps}`).join("<br>")}</div>`;
  return `<div class="item"><strong>Today Meal Plan</strong><br>${p.mealPlan.meals.map(m=>`<b>${m.meal}</b>: ${m.items.map(i=>`${i.name} (${i.qty} ${i.unit})`).join(", ")}`).join("<br>")}</div><div class="item"><strong>Workout Plan:</strong> ${p.workoutPlan.split}<br>${p.workoutPlan.exercises.map(e=>`• ${e.name}: ${e.sets} sets x ${e.reps}, rest ${e.rest}`).join("<br>")}</div>`;
}
function progressBar(label,value,target,unit){
  const pct=Math.min(100,Math.round((Number(value)||0)/Math.max(1,Number(target)||1)*100));
  return `<div class="metric-row"><div class="metric-top"><span>${label}</span><span>${round(value)} / ${target} ${unit}</span></div><div class="bar"><span style="width:${pct}%"></span></div></div>`;
}
function desktopCoachPanelHtml(){
  const p=data.coachPlans[todayKey()] || generateFullCoachPlan();
  return `<div class="desktop-panel-card"><div class="panel-title">🤖 Coach Insights</div>${p.insights.map(i=>`<div class="item">${i}</div>`).join("")}</div>
  <div class="desktop-panel-card"><div class="panel-title">🏋️ Suggested Workout</div><div class="item"><strong>${p.workoutPlan.split}</strong><br>${p.workoutPlan.exercises.slice(0,4).map(e=>`• ${e.name}`).join("<br>")}</div></div>
  <div class="desktop-panel-card"><div class="panel-title">⚡ Quick Actions</div><button class="btn primary" id="sideGenerate">Generate Plan</button><button class="btn" id="sideMeal">Log Meal</button><button class="btn" id="sideWorkout">Log Workout</button></div>
  <div class="desktop-panel-card"><div class="panel-title">📊 Weekly Summary</div>${weeklySummary()}</div>`;
}

// ---------- Dashboard ----------


function home(){
  const d=viewDate();
  const t=targets(),m=mealTotals(d),burned=(typeof workoutCalories==='function'?workoutCalories(d):0);
  const adjusted=t.calories+burned;
  const deficit=adjusted-m.cal;
  const calPct=Math.min(100,Math.round((m.cal/Math.max(1,adjusted))*100));
  shell('Dashboard',`${new Date(d+'T00:00:00').toLocaleDateString()} ${dateSelectorHtml()}`,
  `<div class="desktop-dashboard-grid">
    <div class="dashboard-main">
      <div class="hero-card dashboard-fixed">
        <div class="calorie-ring" style="--p:${calPct}"><div><strong>${calPct}%</strong><span>${Math.round(m.cal)} / ${adjusted} kcal</span></div></div>
        <div class="hero-copy">
          <div class="mode-badge">${data.profile.mode||'Advanced'} Mode</div>
          <h2>${isTodayView()?'Today’s Targets + Insights':'History View'}</h2>
          <div class="item">Base Target: ${t.calories} kcal<br>Calories Burned: ${burned} kcal<br>Adjusted Target: ${adjusted} kcal<br><strong>${deficit>0?Math.round(deficit)+' kcal remaining / deficit':deficit<0?Math.abs(Math.round(deficit))+' kcal surplus':'On target'}</strong></div>
          ${isTodayView()?`<div class="hero-actions"><button class="btn primary" id="smartPlan">Generate Coach Plan</button><button class="btn" id="finishDayBtn">Finish Day</button></div>`:''}
        </div>
      </div>
      <div class="panel"><div class="panel-title">Nutrition Progress</div>${progressBar('Protein',m.p,t.protein,'g')}${progressBar('Carbs',m.c,t.carbs,'g')}${progressBar('Fats',m.f,t.fats,'g')}${progressBar('Water',waterTotal(d),t.water,'L')}</div>
      <div class="panel"><div class="panel-title">Workout Preview</div>${(data.workouts&&data.workouts[d]&&data.workouts[d].length)?data.workouts[d].map(w=>`<div class="item"><strong>${w.name}</strong><br>${w.category||'Strength'} • ${w.caloriesBurned||0} kcal</div>`).join(''):'<div class="item">Workout Missing</div>'}</div>
    </div>
    <aside class="desktop-coach-panel">${desktopCoachPanelHtml?desktopCoachPanelHtml():''}</aside>
  </div>`);
  bindDateSelector();
  if(q('smartPlan'))q('smartPlan').onclick=smartPlan;
  if(q('finishDayBtn'))q('finishDayBtn').onclick=()=>finishDay?finishDay():alert('Day summary saved.');
}


function nextActions(){
  const t=targets(),m=mealTotals(todayKey());
  const a=[];
  if(m.p<t.protein)a.push(`Eat ~${Math.round(t.protein-m.p)}g protein.`);
  if(waterTotal(todayKey())<t.water)a.push(`Drink ~${round(t.water-waterTotal(todayKey()))}L water.`);
  a.push(`Suggested muscles: ${recommendMuscles().join(' + ')||'Any fresh group'}`);
  return a;
}
function weeklySummary(){
  const days=[...Array(7)].map((_,i)=>{const d=new Date();d.setDate(d.getDate()-i);return d.toISOString().slice(0,10)});
  return`<div class="item">Workouts: ${days.reduce((a,d)=>a+workouts(d).length,0)}<br>Avg Protein: ${round(days.reduce((a,d)=>a+mealTotals(d).p,0)/7)}g<br>Avg Water: ${round(days.reduce((a,d)=>a+waterTotal(d),0)/7)}L</div>`;
}

// ---------- Nutrition ----------
function foodList(){return FOOD_DATABASE.concat(SUPPLEMENT_DATABASE).concat(data.customFoods||[]).concat(data.customSupplements||[])}
function topCategories(){return ['Cuisines','Fruits','Vegetables','Drinks','Cheat Meals','Alcohol','Sauces','Supplements','Custom'].filter(c=>foodList().some(f=>f.main===c))}
function cuisineList(){return [...new Set(foodList().filter(f=>f.main==='Cuisines').map(f=>f.cuisine))]}

function nutrition(){
  const logs=mealLogs(viewDate());
  shell('Nutrition',`Meal Type → Food Category → Subcategory → Food ${dateSelectorHtml()}`,
  `<div class="panel nutrition-hotfix">
    <div class="pill-row meal-tabs">${['Breakfast','Lunch','Dinner','Snacks'].map(m=>`<button class="pill ${nutritionMeal===m?'active':''}" data-meal="${m}">${m}</button>`).join('')}</div>
    <div class="pill-row">${NUTRITION_CATEGORIES.map(c=>`<button class="pill ${nutritionCategory===c?'active':''}" data-ncat="${c}">${c}</button>`).join('')}</div>
    ${nutritionCategory==='Cuisines'?`<div class="pill-row cuisine-tabs">${CUISINES.map(c=>`<button class="pill ${nutritionCuisine===c?'active':''}" data-cuisine="${c}">${c}</button>`).join('')}</div>`:''}
    ${nutritionCategory==='Cuisines'&&nutritionCuisine==='Indian'?`<div class="pill-row sub-tabs">${INDIAN_SUBCATEGORIES.map(s=>`<button class="pill ${nutritionSubcategory===s?'active':''}" data-isub="${s}">${s}</button>`).join('')}</div>`:''}
    <div class="field"><label>Search / Barcode</label><input id="foodSearch" placeholder="Search food, cuisine, sauce or barcode" autocomplete="off"></div>
    <div style="display:flex;gap:10px;flex-wrap:wrap;margin:12px 0">
      <button class="btn" id="addCustomFoodBtn">+ Custom Food</button>
      <button class="btn primary" id="scanBarcode">📷 Scan Barcode</button>
      <button class="btn" id="manualBarcode">⌨️ Enter Barcode</button>
    </div>
    <div id="foodList" class="food-list-clean"></div>
  </div>
  <div class="panel"><div class="panel-title">Water Log</div>
    ${isTodayView()?`<button class="btn" data-water="250">+250ml</button><button class="btn" data-water="500">+500ml</button><button class="btn" data-water="1000">+1L</button><button class="btn" id="customWaterBtn">+ Custom</button>`:''}
    <div class="item">Total: ${waterTotal(viewDate())}L</div>
  </div>
  <div class="panel"><div class="panel-title">Logs for ${viewDate()}</div>
    ${logs.length?logs.map(x=>`<div class="log-card"><strong>${x.name}</strong><br>${x.meal} • ${x.timeLabel||new Date(x.time||Date.now()).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}<br>${x.calories||0} kcal • P${x.protein||0} C${x.carbs||0} F${x.fats||0}</div>`).join(''):'<div class="item">No logs.</div>'}
  </div>`);
  bindNutritionControls();
}

function foodEditor(f){
  if(!f)return'<div class="item">Select item.</div>';
  if(f.builder==='egg')return`<div class="panel-title">Egg Dish</div><div class="form-grid"><div class="field"><label>Whole Eggs</label><input id="wholeEggs" type="number" value="2"></div><div class="field"><label>Egg Whites</label><input id="eggWhites" type="number" value="0"></div><div class="field"><label>Style</label><select id="eggStyle"><option>Boiled</option><option>Omelette</option><option>Bhurji</option><option>Fried</option></select></div></div><div id="foodPreview" class="suggestion"></div><button class="btn primary" id="addFood">Add</button>`;
  return`<div class="panel-title">${f.name}</div><div class="muted">${quantityLine(f.defaultQty||1,f.unit||'serving',f.portion||'')}${f.timing?`<br>Preferred timing: ${f.timing}`:''}</div><div class="form-grid"><div class="field"><label>Quantity</label><input id="foodQty" type="number" value="${f.defaultQty||1}" step=".1"></div><div class="field"><label>Unit</label><select id="foodUnit">${['serving','g','ml','bowl','cup','plate','piece','tbsp','tsp','scoop'].map(u=>`<option value="${u}" ${(f.unit||'serving')===u?'selected':''}>${unitOptionLabel(u,(f.unit===u?f.portion:'')||'')}</option>`).join('')}</select><div class="muted" id="unitGuide"></div></div>${f.typeOptions?`<div class="field"><label>Type</label><select id="foodType"><option>Home</option><option>Restaurant</option></select></div>`:''}</div>${f.components?`<div class="item">Contains:<br>${f.components.map(c=>`• ${c.name}: ${c.amount}`).join('<br>')}</div>`:''}<div id="foodPreview" class="suggestion"></div><button class="btn primary" id="addFood">Add</button>`;
}
function calcFood(){
  const f=foodList().find(x=>x.name===selectedFood); if(!f)return null;
  if(f.builder==='egg'){
    const whole=Number(q('wholeEggs').value||0),white=Number(q('eggWhites').value||0),style=q('eggStyle').value,extra=style==='Fried'?60:(style==='Omelette'||style==='Bhurji'?40:0);
    return{name:`Egg Dish (${style})`,main:'Cuisines',sub:'Protein',meal:selectedMeal,qty:`${whole}+${white}`,unit:'eggs',calories:whole*70+white*17+extra,protein:round(whole*6+white*3.5),carbs:round(whole*.5+white*.2),fats:round(whole*5+(extra?4:0))};
  }
  const qty=Number(q('foodQty')?.value||1),unit=q('foodUnit')?.value||f.unit;
  const base=f.typeOptions?(q('foodType').value==='Restaurant'?f.typeOptions.Restaurant:f.typeOptions.Home):f.calories;
  let factor=qty;
  if(unit==='g')factor=qty/250;
  if(unit==='ml')factor=qty/200;
  if(unit==='tbsp'||unit==='tsp')factor=qty;
  return{...f,meal:selectedMeal,qty,unit,portion:unitGuide(unit,f.portion||''),calories:Math.round((base||0)*factor),protein:round((f.protein||0)*factor),carbs:round((f.carbs||0)*factor),fats:round((f.fats||0)*factor)};
}
function wireFood(){
  const update=()=>{
    const m=calcFood(),t=targets(),cur=mealTotals(viewDate);
    if(q('unitGuide')) q('unitGuide').innerHTML=unitGuide(q('foodUnit')?.value||m?.unit||'serving',m?.portion||'');
    q('foodPreview').innerHTML=m?`${quantityLine(m.qty,m.unit,m.portion||'')} • ${m.calories||0} kcal • P${m.protein||0} C${m.carbs||0} F${m.fats||0}<br><span class="muted">After adding: ${cur.cal+(m.calories||0)} / ${t.calories} kcal • ${cur.p+(m.protein||0)} / ${t.protein}g protein</span>`:'';
  };
  ['foodQty','foodUnit','foodType','wholeEggs','eggWhites','eggStyle'].forEach(id=>q(id)&&(q(id).oninput=update,q(id).onchange=update));
  update();
  q('addFood').onclick=()=>{data.meals[viewDate]=meals(viewDate);data.meals[viewDate].push(calcFood());smartPlan();save()};
}
function wireWater(d){document.querySelectorAll('[data-water]').forEach(b=>b.onclick=()=>{data.water[d]=waterLogs(d);data.water[d].push({amount:Number(b.dataset.water),time:Date.now()});save()})}

// ---------- Workout ----------
function workout(){
  const exs=selectedMuscles.flatMap(m=>(EXERCISE_DATABASE[m]||[]).map(e=>({m,e})));
  if(!exs.some(x=>x.e===selectedExercise))selectedExercise=exs[0]?.e||'';
  shell('Workouts','Smart Split or Custom Muscles. Max 3 muscles.',
  `${dateControls()}<div class="panel"><div class="pill-row"><button class="pill ${workoutMode==='Smart Split'?'active':''}" data-mode="Smart Split">Smart Split</button><button class="pill ${workoutMode==='Custom Muscles'?'active':''}" data-mode="Custom Muscles">Custom Muscles</button></div>${workoutMode==='Smart Split'?`<div class="pill-row">${Object.keys(SPLITS).map(s=>`<button class="pill" data-split="${s}">${s}</button>`).join('')}</div>`:`<div class="pill-row">${Object.keys(EXERCISE_DATABASE).map(m=>`<button class="pill ${selectedMuscles.includes(m)?'active':''}" data-muscle="${m}">${m}</button>`).join('')}</div>`}<div class="suggestion">Selected: ${selectedMuscles.join(' + ')}</div></div>
  <div class="panel"><div class="panel-title">Exercises</div>${selectedMuscles.map(m=>`<div class="panel-title" style="font-size:16px">${m}</div><div class="choice-list">${EXERCISE_DATABASE[m].map(e=>`<button class="choice-btn ${selectedExercise===e?'active':''}" data-ex="${e}">${e}</button>`).join('')}</div>`).join('')}</div>
  <div class="panel"><div class="panel-title">${selectedExercise}</div><div class="form-grid"><div class="field"><label>Set Type</label><select id="setType"><option>Warmup</option><option selected>Working</option></select></div><div class="field"><label>Set No.</label><input id="setNo" readonly value="${setsFor(selectedExercise).length+1}"></div><div class="field"><label>Weight</label><input id="setWeight" type="number"></div><div class="field"><label>Reps</label><input id="setReps" type="number"></div></div><div style="margin-top:18px"><button class="btn primary" id="addSet">Add Set</button></div><div id="restBox" class="suggestion ${restSeconds?'':'hidden'}"><strong>Rest Timer</strong><div style="font-size:34px;font-weight:950">${fmtRest()}</div><button class="btn" id="pauseRest">${restPaused?'Resume':'Pause'}</button><button class="btn" id="skipRest">Skip</button><button class="btn" id="addRest">+30 sec</button></div>${currentSets.map((s,i)=>`<div class="log-card">${s.exercise} • Set ${s.setNo} • ${s.weight}kg x ${s.reps}<button class="btn danger" data-delset="${i}">Delete</button></div>`).join('')}</div>
  <div class="panel"><button class="btn" id="finishWorkout">Finish Workout</button><div class="panel-title">History for ${viewDate}</div>${workouts(viewDate).map(w=>`<div class="log-card"><div><strong>${w.name}</strong><div class="muted">${w.muscles.join('+')} • ${w.volume}kg • ${w.intensity}<br>${w.sets.map(s=>`${s.exercise} Set ${s.setNo}: ${s.weight}kg x ${s.reps}`).join('<br>')}</div></div></div>`).join('')||'<div class="item">No workouts logged.</div>'}</div>`);
  wireDate();
  document.querySelectorAll('[data-mode]').forEach(b=>b.onclick=()=>{workoutMode=b.dataset.mode;workout()});
  document.querySelectorAll('[data-split]').forEach(b=>b.onclick=()=>{selectedMuscles=SPLITS[b.dataset.split].slice(0,3);selectedExercise='';workout()});
  document.querySelectorAll('[data-muscle]').forEach(b=>b.onclick=()=>{const m=b.dataset.muscle;if(selectedMuscles.includes(m))selectedMuscles=selectedMuscles.filter(x=>x!==m);else if(selectedMuscles.length<3)selectedMuscles.push(m);selectedExercise='';workout()});
  document.querySelectorAll('[data-ex]').forEach(b=>b.onclick=()=>{selectedExercise=b.dataset.ex;workout()});
  q('addSet').onclick=()=>{const s={exercise:selectedExercise,setNo:setsFor(selectedExercise).length+1,type:q('setType').value,weight:q('setWeight').value,reps:q('setReps').value};currentSets.push(s);startRest(s);workout()};
  document.querySelectorAll('[data-delset]').forEach(b=>b.onclick=()=>{currentSets.splice(Number(b.dataset.delset),1);workout()});
  q('finishWorkout').onclick=finishWorkout;
  if(q('pauseRest'))q('pauseRest').onclick=()=>{restPaused=!restPaused;workout()};
  if(q('skipRest'))q('skipRest').onclick=()=>{stopRest();workout()};
  if(q('addRest'))q('addRest').onclick=()=>{restSeconds+=30;workout()};
}
function setsFor(ex){return currentSets.filter(s=>s.exercise===ex)}
function fmtRest(){return String(Math.floor(restSeconds/60)).padStart(2,'0')+':'+String(restSeconds%60).padStart(2,'0')}
function startRest(s){stopRest();restSeconds=s.type==='Warmup'?45:90;if(Number(s.reps)<=5||Number(s.weight)>=100)restSeconds=120;restPaused=false;restInt=setInterval(()=>{if(!restPaused){restSeconds--;if(restSeconds<=0)stopRest();render()}},1000)}
function stopRest(){clearInterval(restInt);restInt=null;restSeconds=0}
function finishWorkout(){
  if(!currentSets.length)return alert('Add at least one set');
  const vol=currentSets.reduce((a,s)=>a+Number(s.weight||0)*Number(s.reps||0),0),int=vol>6000?'High':vol>2500?'Moderate':'Light';
  data.workouts[viewDate]=workouts(viewDate);
  data.workouts[viewDate].push({name:selectedMuscles.join(' + '),muscles:[...selectedMuscles],sets:[...currentSets],volume:vol,intensity:int});
  currentSets=[];stopRest();smartPlan();save();alert('Workout saved. Volume: '+vol+'kg');
}
function recommendMuscles(){
  const recent=Object.values(data.workouts||{}).flat().slice(-3).flatMap(w=>w.muscles||[]);
  return Object.keys(EXERCISE_DATABASE).filter(m=>!recent.includes(m)).slice(0,2);
}


// ---------- Stable Version 1.0 Zero-Cost Intelligence Engine ----------
function lastNDays(n){return [...Array(n)].map((_,i)=>{const d=new Date();d.setDate(d.getDate()-i);return d.toISOString().slice(0,10)}).reverse()}
function avg(nums){const a=nums.filter(x=>Number.isFinite(Number(x)));return a.length?round(a.reduce((s,x)=>s+Number(x),0)/a.length,1):0}
function nutritionPatterns(days=7){
  const t=targets(), keys=lastNDays(days);
  const daily=keys.map(d=>({date:d,...mealTotals(d),water:waterTotal(d),meals:meals(d).length}));
  return {daily,avgCal:avg(daily.map(x=>x.cal)),avgProtein:avg(daily.map(x=>x.p)),avgWater:avg(daily.map(x=>x.water)),
    lowProteinDays:daily.filter(x=>x.p<t.protein*.8).length,
    highCalDays:daily.filter(x=>x.cal>t.calories*1.1).length,
    lowWaterDays:daily.filter(x=>x.water<t.water*.75).length,
    weekendHigh:daily.filter(x=>['Sat','Sun'].includes(new Date(x.date).toLocaleDateString('en-US',{weekday:'short'}))&&x.cal>t.calories*1.1).length};
}
function workoutPatterns(days=7){
  const keys=lastNDays(days), daily=keys.map(d=>({date:d,workouts:workouts(d),count:workouts(d).length,muscles:workouts(d).flatMap(w=>w.muscles||[])}));
  const muscleMap={}; daily.flatMap(d=>d.muscles).forEach(m=>muscleMap[m]=(muscleMap[m]||0)+1);
  return {daily,total:daily.reduce((a,d)=>a+d.count,0),muscleMap,missingMuscles:Object.keys(EXERCISE_DATABASE).filter(m=>(muscleMap[m]||0)===0)};
}
function recoveryPatterns(days=7){const scores=lastNDays(days).map(d=>recoveryStatus(d).score);return {scores,avgScore:avg(scores),lowDays:scores.filter(s=>s<55).length}}
function buildIntelligenceInsights(){
  const t=targets(), n=nutritionPatterns(7), w=workoutPatterns(7), r=recoveryPatterns(7), out=[];
  out.push(n.lowProteinDays>=3?{level:'warning',title:'Protein consistency is low',body:`Protein was below target on ${n.lowProteinDays}/7 days. Add one high-protein meal or supplement daily.`}:{level:'good',title:'Protein trend looks manageable',body:`Average protein: ${n.avgProtein}g vs target ${t.protein}g.`});
  if(n.highCalDays>=3) out.push({level:'warning',title:'Calories are frequently high',body:`Calories exceeded target on ${n.highCalDays}/7 days. Reduce sauces, oils, snacks or portions.`});
  if(n.lowWaterDays>=3) out.push({level:'warning',title:'Hydration needs attention',body:`Water was low on ${n.lowWaterDays}/7 days. Use a fixed morning + workout water routine.`});
  if(n.weekendHigh>=1) out.push({level:'info',title:'Weekend calories are affecting progress',body:'Plan one flexible meal, not a full flexible day.'});
  out.push(w.total<3?{level:'warning',title:'Workout consistency is low',body:`Only ${w.total}/7 workout days logged. Start with 3 fixed training days this week.`}:{level:'good',title:'Workout consistency is building',body:`${w.total}/7 workout days logged.`});
  if(w.missingMuscles.length) out.push({level:'info',title:'Muscle balance opportunity',body:`Undertrained this week: ${w.missingMuscles.slice(0,3).join(', ')}.`});
  out.push(r.lowDays>=2?{level:'warning',title:'Recovery is limiting performance',body:`Recovery was low on ${r.lowDays}/7 days. Reduce intensity or improve sleep before heavy training.`}:{level:'good',title:'Recovery trend is stable',body:`Average recovery score: ${r.avgScore}/100.`});
  return out;
}
function adaptiveGoalSuggestion(){
  const p=data.profile,t=targets(),n=nutritionPatterns(14),weights=(data.weights||[]).slice(0,6).map(w=>Number(w.weight)).filter(Boolean);
  if(weights.length>=2){
    const change=round(weights[0]-weights[weights.length-1],1);
    if(p.goal==='Fat Loss'&&change>=-.3&&n.avgCal>t.calories*.95)return 'Fat loss appears slow. Reduce daily calories by 100–150 kcal or improve weekend consistency.';
    if(p.goal==='Muscle Gain'&&change<.2)return 'Muscle gain appears slow. Increase calories by 100–150 kcal and track progressive overload.';
  }
  if(n.highCalDays>=4&&p.goal==='Fat Loss')return 'Calories are frequently above target. Improve logging and portion control before lowering calories.';
  return 'Keep current targets and focus on consistency.';
}
function generateWeeklyIntelligenceReport(){
  const report={date:todayKey(),generatedAt:new Date().toISOString(),nutrition:nutritionPatterns(7),workout:workoutPatterns(7),recovery:recoveryPatterns(7),insights:buildIntelligenceInsights(),adaptiveGoal:adaptiveGoalSuggestion()};
  data.intelligence=data.intelligence||{reports:{},patterns:{}}; data.intelligence.reports[todayKey()]=report; localStorage.setItem(STORE,JSON.stringify(data)); return report;
}
function currentIntelligenceReport(){return (data.intelligence&&data.intelligence.reports&&data.intelligence.reports[todayKey()])||generateWeeklyIntelligenceReport()}
function intelligenceReportHtml(){
  const r=currentIntelligenceReport();
  return `<div class="panel-title">Weekly Intelligence Report</div><div class="item"><strong>Adaptive Goal:</strong><br>${r.adaptiveGoal}</div>${r.insights.map(x=>`<div class="item insight-${x.level}"><strong>${x.title}</strong><br>${x.body}</div>`).join('')}`;
}
function contextSuggestion(){
  const t=targets(),m=mealTotals(todayKey()),w=waterTotal(todayKey()),r=recoveryStatus(todayKey()),h=new Date().getHours();
  if(h>=20&&m.p<t.protein)return `Evening suggestion: you still need ${Math.round(t.protein-m.p)}g protein. Choose a light protein option.`;
  if(w<t.water*.6)return 'Hydration is low today. Add 500ml water now.';
  if(r.score<55)return 'Recovery is low. Keep today’s training lighter.';
  return 'You are on track. Keep logging meals and water.';
}
function aiCacheKey(question){return String(question||'').trim().toLowerCase().replace(/\s+/g,' ').slice(0,180)}
function localFAQAnswer(question){
  const qn=String(question||'').toLowerCase();
  if(qn.includes('protein'))return 'Protein supports muscle repair and satiety. Aim for your daily target first, then distribute it across meals.';
  if(qn.includes('fat loss')||qn.includes('lose weight'))return 'Fat loss requires a consistent calorie deficit, enough protein, resistance training, hydration and sleep.';
  if(qn.includes('water'))return 'Hydration supports performance and recovery. Use your water target as a daily baseline and increase it on active days.';
  if(qn.includes('creatine'))return 'Creatine is commonly taken daily, often 3–5g. Timing is less important than consistency.';
  return '';
}

// ---------- Smart plan / recovery / profile / progress / coach ----------
function smartPlan(){data.coachPlans[todayKey()]=generateFullCoachPlan();localStorage.setItem(STORE,JSON.stringify(data));const box=q('coachPlanBox');if(box)box.innerHTML=coachPlanCard();const side=q('desktopCoachPanel');if(side)side.innerHTML=desktopCoachPanelHtml();}
function planHtml(){return `<div id="coachPlanBox">${coachPlanCard()}</div>`}
function morningCheckin(){
  openModal(`<div class="panel-title">Good Morning 👋</div><div class="field"><label>How long did you sleep?</label><div class="pill-row">${['5h','6h','7h','8h','9h+'].map(x=>`<button class="pill" data-sleep="${x}">${x}</button>`).join('')}</div></div><div class="form-grid"><div class="field"><label>Sleep Quality</label><select id="mc_quality"><option>Poor</option><option selected>Average</option><option>Good</option></select></div><div class="field"><label>Energy</label><select id="mc_energy"><option>Low</option><option selected>Moderate</option><option>High</option></select></div><div class="field"><label>Soreness</label><select id="mc_soreness"><option>Low</option><option selected>Moderate</option><option>High</option></select></div></div><button class="btn primary" id="saveMorning">Save</button>`);
  let sleep='7';
  document.querySelectorAll('[data-sleep]').forEach(b=>b.onclick=()=>{sleep=b.dataset.sleep.replace('h+','').replace('h','');document.querySelectorAll('[data-sleep]').forEach(x=>x.classList.remove('active'));b.classList.add('active')});
  q('saveMorning').onclick=()=>{data.recovery[todayKey()]={sleep,quality:q('mc_quality').value,energy:q('mc_energy').value,soreness:q('mc_soreness').value};closeModal();save()};
}
function profile(){
  const p=data.profile;
  shell('Profile','Matches onboarding. Units follow your global setting.',
  `<div class="panel"><div class="form-grid">
    ${['name','age','height','currentWeight','targetWeight','targetBodyFat','timelineWeeks','targetDate'].map(k=>`<div class="field"><label>${k}</label><input id="pf_${k}" value="${p[k]||''}"></div>`).join('')}
    <div class="field"><label>Goal</label><select id="pf_goal"><option ${p.goal==='Fat Loss'?'selected':''}>Fat Loss</option><option ${p.goal==='Muscle Gain'?'selected':''}>Muscle Gain</option><option ${p.goal==='Maintenance'?'selected':''}>Maintenance</option></select></div>
    <div class="field"><label>Activity</label><select id="pf_activity"><option ${p.activity==='Low'?'selected':''}>Low</option><option ${p.activity==='Moderate'?'selected':''}>Moderate</option><option ${p.activity==='High'?'selected':''}>High</option></select></div>
    <div class="field"><label>Diet</label><select id="pf_diet"><option ${p.diet==='Non-Veg'?'selected':''}>Non-Veg</option><option ${p.diet==='Veg'?'selected':''}>Veg</option><option ${p.diet==='Vegan'?'selected':''}>Vegan</option><option ${p.diet==='Mixed'?'selected':''}>Mixed</option></select></div>
    <div class="field"><label>Mode</label><select id="pf_mode"><option ${p.mode==='Beginner'?'selected':''}>Beginner</option><option ${p.mode==='Advanced'?'selected':''}>Advanced</option></select></div>
  </div><div class="suggestion">Starting weight: ${p.startWeight||p.currentWeight||'-'} kg</div><button class="btn primary" id="saveProfile">Save Profile</button></div>`);
  const fields=['name','age','height','currentWeight','targetWeight','targetBodyFat','timelineWeeks','targetDate','goal','activity','diet','mode'];
  q('saveProfile').onclick=()=>{fields.forEach(k=>data.profile[k]=q('pf_'+k).value);if(!data.profile.startWeight)data.profile.startWeight=data.profile.currentWeight;save()};
}
function recovery(){
  const r=recoveryStatus(viewDate);
  shell('Recovery',`${r.decision}`,
  `${dateControls()}<div class="panel"><div class="form-grid"><div class="field"><label>Sleep Duration</label><select id="sleep"><option>5</option><option>6</option><option selected>7</option><option>8</option><option>9</option></select></div><div class="field"><label>Sleep Quality</label><select id="quality"><option>Poor</option><option selected>Average</option><option>Good</option></select></div><div class="field"><label>Energy</label><select id="energy"><option>Low</option><option selected>Moderate</option><option>High</option></select></div><div class="field"><label>Soreness</label><select id="sore"><option>Low</option><option selected>Moderate</option><option>High</option></select></div></div><button class="btn primary" id="saveRec">Save Recovery</button></div><div class="panel"><div class="panel-title">${r.status} • ${r.decision}</div><div class="item">Score ${r.score}/100 • Water ${waterTotal(viewDate)}L</div></div>`);
  wireDate();
  q('saveRec').onclick=()=>{data.recovery[viewDate]={sleep:q('sleep').value,quality:q('quality').value,energy:q('energy').value,soreness:q('sore').value};save()};
}
function progress(){
  shell('Progress','Goal progress, weight trend and intelligence',
  `<div class="panel"><div class="field"><label>Weight</label><input id="weight"></div><button class="btn primary" id="addWeight">Add Weight</button></div>
  <div class="panel">${data.weights.map((w,i)=>`<div class="log-card">${w.weight}kg • ${w.date}<button class="btn danger" data-delweight="${i}">Delete</button></div>`).join('')||'<div class="item">No logs.</div>'}</div>
  <div class="panel">${intelligenceReportHtml()}<button class="btn primary" id="regenReport">Refresh Intelligence Report</button></div>`);
  q('addWeight').onclick=()=>{data.weights.unshift({date:todayKey(),weight:q('weight').value});save()};
  q('regenReport').onclick=()=>{generateWeeklyIntelligenceReport();render()};
  document.querySelectorAll('[data-delweight]').forEach(b=>b.onclick=()=>{data.weights.splice(Number(b.dataset.delweight),1);save()});
}
function coach(){
  let u=data.aiCoachUsage;
  if(u.date!==todayKey())u=data.aiCoachUsage={date:todayKey(),count:0};
  if(!data.coachPlans[todayKey()]) data.coachPlans[todayKey()]=generateFullCoachPlan();
  localStorage.setItem(STORE,JSON.stringify(data));
  shell('Coach Engine',`${data.coachPlans[todayKey()].mode} Mode • Meal + Workout Planning`,
  `<div class="panel">
    <div class="pill-row">
      <button class="pill active" data-coachtab="today">Today Plan</button>
      <button class="pill" data-coachtab="meal">Meal Plan</button>
      <button class="pill" data-coachtab="workout">Workout Plan</button>
      <button class="pill" data-coachtab="ask">Ask AI</button><button class="pill" data-coachtab="intel">Intelligence</button>
    </div>
    <button class="btn primary" id="regenCoach">Regenerate Coach Plan</button>
    <div id="coachContent" class="suggestion"></div>
  </div>`);
  const renderCoachTab=(ct='today')=>{
    document.querySelectorAll('[data-coachtab]').forEach(b=>b.classList.toggle('active',b.dataset.coachtab===ct));
    const plan=data.coachPlans[todayKey()] || generateFullCoachPlan();
    if(ct==='today') q('coachContent').innerHTML=coachPlanCard();
    if(ct==='meal') q('coachContent').innerHTML=`<strong>Meal Plan</strong><br>${plan.mealPlan.meals.map(m=>`<h4>${m.meal} (${m.targetCalories} kcal target)</h4>${m.items.map(i=>`• ${i.name}: ${i.qty} ${i.unit} — ${i.calories} kcal, P${i.protein} C${i.carbs} F${i.fats}`).join("<br>")}`).join("<br>")}<br><br><strong>Total:</strong> ${Math.round(plan.mealPlan.totals.calories)} kcal, P${round(plan.mealPlan.totals.protein)} C${round(plan.mealPlan.totals.carbs)} F${round(plan.mealPlan.totals.fats)}`;
    if(ct==='workout') q('coachContent').innerHTML=`<strong>${plan.workoutPlan.split}</strong><br>Recovery: ${plan.workoutPlan.recovery} • ${plan.workoutPlan.decision}<br>${plan.workoutPlan.exercises.map(e=>`• ${e.name}: ${e.sets} sets x ${e.reps}, rest ${e.rest}`).join("<br>")}`;
    if(ct==='intel') q('coachContent').innerHTML=intelligenceReportHtml();
    if(ct==='ask') q('coachContent').innerHTML=`<div class="item">AI Coach: <strong>${u.count}/3</strong> used today</div><div class="field"><label>Question</label><textarea id="question"></textarea></div><button class="btn primary" id="ask">Ask AI Coach</button><button class="btn" id="quick">Quick Local Advice</button><div class="suggestion" id="answer"></div>`;
    if(ct==='ask'){q('quick').onclick=()=>q('answer').innerHTML=localCoach();q('ask').onclick=askCoach;}
  };
  q('regenCoach').onclick=()=>{data.coachPlans[todayKey()]=generateFullCoachPlan();localStorage.setItem(STORE,JSON.stringify(data));renderCoachTab('today')};
  document.querySelectorAll('[data-coachtab]').forEach(b=>b.onclick=()=>renderCoachTab(b.dataset.coachtab));
  renderCoachTab('today');
}

function localCoach(){return `${contextSuggestion()}<br><br>${buildIntelligenceInsights().slice(0,3).map(i=>`<strong>${i.title}</strong>: ${i.body}`).join('<br>')}`}
async function askCoach(){
  const question=q('question').value||'';
  const faq=localFAQAnswer(question);
  if(faq){q('answer').innerHTML=faq+'<br><span class="muted">Answered locally. No AI call used.</span>';return}
  const key=aiCacheKey(question);
  data.aiCache=data.aiCache||{};
  if(data.aiCache[key]){q('answer').innerHTML=data.aiCache[key]+'<br><span class="muted">Cached response. No AI call used.</span>';return}
  const u=data.aiCoachUsage;
  if(u.date!==todayKey()){u.date=todayKey();u.count=0}
  if(u.count>=3){q('answer').innerHTML='Daily AI limit reached. Local coach insight:<br>'+localCoach();return}
  q('answer').innerHTML='Thinking...';
  try{
    const r=await fetch('/.netlify/functions/ai-coach',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({question,context:{profile:data.profile,targets:targets(),today:mealTotals(todayKey()),recovery:recoveryStatus(todayKey()),insights:buildIntelligenceInsights()}})});
    if(!r.ok)throw Error();
    const j=await r.json();
    u.count++;
    data.aiCache[key]=j.answer;
    localStorage.setItem(STORE,JSON.stringify(data));
    q('answer').innerHTML=j.answer;
  }catch{q('answer').innerHTML=localCoach()+'<br><span class="muted">AI unavailable; local intelligence shown.</span>'}
}

// ---------- Settings / legal / modal ----------
function openModal(html){
  q('modal').classList.remove('hidden');
  q('modalCard').innerHTML=html+`<div style="margin-top:16px"><button class="btn primary" id="closeModal">Close</button></div>`;
  q('closeModal').onclick=closeModal;
}
function closeModal(){q('modal').classList.add('hidden');q('modalCard').innerHTML=''}
function openLegalDoc(type){openModal(LEGAL_DOCS[type]||LEGAL_DOCS.privacy)}
function settings(){
  shell('Settings',`STAYFITINLIFE ${APP_VERSION} • Last Updated: ${LAST_UPDATED}`,
  `<div class="panel"><div class="panel-title">Data</div><button class="btn" id="export">Export</button><label class="btn" for="importFile">Import</label><input class="hidden" id="importFile" type="file"><button class="btn danger" id="delete">Delete Local Data</button></div><div class="panel"><div class="panel-title">App</div><div class="item">App Version: <strong>Stable Version 1.0</strong></div><button class="btn primary" id="appGuideBtn">Open App Guide</button></div><div class="panel"><div class="panel-title">Legal Documentation</div><button class="btn" id="privacyBtn">Privacy Policy</button><button class="btn" id="termsBtn">Terms of Use</button><button class="btn" id="aiBtn">AI Disclaimer</button><div class="muted" style="margin-top:14px">STAYFITINLIFE ${APP_VERSION} • Last Updated: ${LAST_UPDATED}</div></div>`);
  q('export').onclick=()=>{const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([JSON.stringify(data,null,2)],{type:'application/json'}));a.download='stayfitinlife-backup.json';a.click()};
  q('importFile').onchange=async e=>{const f=e.target.files[0];if(f){data={...data,...JSON.parse(await f.text())};save()}};
  q('delete').onclick=()=>{if(confirm('Delete data?')){localStorage.removeItem(STORE);location.reload()}};
  q('appGuideBtn').onclick=()=>showAppGuide();
 q('privacyBtn').onclick=()=>openLegalDoc('privacy');
  q('termsBtn').onclick=()=>openLegalDoc('terms');
  q('aiBtn').onclick=()=>openLegalDoc('ai');
}

// ---------- Barcode scanner ----------


async function startBarcodeCamera(){
  try{
    stopScannerStream();
    scannerStream=await navigator.mediaDevices.getUserMedia({video:{facingMode:{ideal:scannerFacingMode}}});
    const v=q('scannerVideo');v.srcObject=scannerStream;await v.play().catch(()=>{});
    if('BarcodeDetector'in window){barcodeDetector=new BarcodeDetector({formats:['ean_13','ean_8','upc_a','upc_e','code_128','qr_code']});q('scannerStatus').innerHTML='Camera ready. Align barcode.';detectBarcodeLoop()}
    else q('scannerStatus').innerHTML='Camera opened. This browser does not support automatic barcode detection yet. Use Enter Barcode below as fallback.';
  }catch(e){q('scannerStatus').innerHTML='Camera permission failed. Use manual entry.'}
}
async function detectBarcodeLoop(){
  const v=q('scannerVideo');if(!v||!barcodeDetector)return;
  try{if(v.readyState>=2){const codes=await barcodeDetector.detect(v);if(codes&&codes.length){const code=codes[0].rawValue;stopScannerStream();closeModal();handleBarcodeResult(code);return}}}catch(e){}
  scannerLoop=requestAnimationFrame(detectBarcodeLoop);
}
function manualBarcodeEntry(){const code=prompt('Enter barcode number');if(code)handleBarcodeResult(code.trim())}



// ---------- Stable 1.0.1 Scanner + OpenFoodFacts ----------
let sflHtml5Scanner=null;

function normalizeOffNumber(v){
  const n=Number(v);
  return Number.isFinite(n)?round(n,1):0;
}

async function fetchFoodFromAPI(barcode){
  try{
    if(!barcode) return null;
    data.barcodeCache=data.barcodeCache||{};
    if(data.barcodeCache[barcode]) return data.barcodeCache[barcode];

    const res=await fetch(`https://world.openfoodfacts.org/api/v0/product/${encodeURIComponent(barcode)}.json`);
    const json=await res.json();
    if(!json || json.status!==1 || !json.product) return null;

    const p=json.product;
    const n=p.nutriments||{};
    const food={
      main:"Barcode",
      sub:"OpenFoodFacts",
      name:p.product_name || p.generic_name || `Barcode ${barcode}`,
      barcode:String(barcode),
      defaultQty:1,
      unit:"serving",
      portion:p.serving_size || "1 serving",
      calories:normalizeOffNumber(n["energy-kcal_serving"] ?? n["energy-kcal_100g"]),
      protein:normalizeOffNumber(n["proteins_serving"] ?? n["proteins_100g"]),
      carbs:normalizeOffNumber(n["carbohydrates_serving"] ?? n["carbohydrates_100g"]),
      fats:normalizeOffNumber(n["fat_serving"] ?? n["fat_100g"])
    };
    data.barcodeCache[barcode]=food;
    localStorage.setItem(STORE,JSON.stringify(data));
    return food;
  }catch(e){
    console.error("OpenFoodFacts error:",e);
    return null;
  }
}

function addFoodFromBarcode(food){
  selectedFood=food;
  selectedMeal=selectedMeal||'Breakfast';
  render();
  setTimeout(()=>{
    const search=q('foodSearch');
    if(search) search.value=food.name;
  },50);
}

async function handleBarcodeResult(code){
  try{
    const clean=String(code||'').trim();
    if(!clean) return;
    const status=q('scannerStatus');
    if(status) status.innerHTML='Fetching food data...';

    const food=await fetchFoodFromAPI(clean);
    if(!food){
      alert('Product not found in OpenFoodFacts. Please add manually.');
      return;
    }
    addFoodFromBarcode(food);
  }catch(e){
    console.error("Barcode handler error:",e);
    alert('Could not fetch food data. Please use manual entry.');
  }
}

async function stopStableScanner(){
  try{
    if(sflHtml5Scanner){
      await sflHtml5Scanner.stop().catch(()=>{});
      await sflHtml5Scanner.clear().catch(()=>{});
      sflHtml5Scanner=null;
    }
  }catch(e){}
}

async function openBarcodeScanner(){
  const modal=q('modal'), card=q('modalCard');
  modal.classList.remove('hidden');
  card.innerHTML=`<div class="panel-title">Scan Barcode</div>
    <div class="muted">Rear camera opens by default. Align the barcode inside the frame.</div>
    <div class="scanner-wrap">
      <div id="html5ScannerRoot" class="scanner-box"></div>
      <div class="scan-frame">Align barcode here</div>
    </div>
    <div class="suggestion" id="scannerStatus">Starting scanner...</div>
    <div style="display:flex;gap:10px;margin-top:16px;flex-wrap:wrap">
      <button class="btn" id="manualScannerEntry">Enter Barcode</button>
      <button class="btn primary" id="closeScanner">Close</button>
    </div>`;

  const close=async()=>{await stopStableScanner();modal.classList.add('hidden');card.innerHTML=''};
  q('closeScanner').onclick=close;
  q('manualScannerEntry').onclick=async()=>{
    const code=prompt('Enter barcode number');
    if(code){await close();handleBarcodeResult(code)}
  };

  const status=q('scannerStatus');
  if(!window.Html5Qrcode){
    status.innerHTML='Scanner engine unavailable. Use Enter Barcode.';
    return;
  }

  try{
    sflHtml5Scanner=new Html5Qrcode("html5ScannerRoot");
    const config={fps:10,qrbox:{width:260,height:120},aspectRatio:1.777};
    if(window.Html5QrcodeSupportedFormats){
      config.formatsToSupport=[
        Html5QrcodeSupportedFormats.EAN_13,
        Html5QrcodeSupportedFormats.EAN_8,
        Html5QrcodeSupportedFormats.UPC_A,
        Html5QrcodeSupportedFormats.UPC_E,
        Html5QrcodeSupportedFormats.CODE_128,
        Html5QrcodeSupportedFormats.CODE_39
      ];
    }
    await sflHtml5Scanner.start(
      {facingMode:"environment"},
      config,
      async decodedText=>{
        status.innerHTML='✔ Barcode detected: '+decodedText;
        if(navigator.vibrate) navigator.vibrate(120);
        await close();
        handleBarcodeResult(decodedText);
      },
      ()=>{}
    );
    status.innerHTML='Scanning... move barcode inside the frame.';
  }catch(e){
    console.error("Scanner start error:",e);
    status.innerHTML='Camera scanner could not start. Use Enter Barcode.';
  }
}


// ---------- Stable 1.0.3 Hotfix Final Core ----------
const HOTFIX_VERSION='Stable Version 1.0.3 Hotfix';
const HOTFIX_LAST_UPDATED='April 26, 2026';

let selectedDate = data.selectedDate || todayKey();
let nutritionMeal = 'Breakfast';
let nutritionCategory = 'Cuisines';
let nutritionCuisine = 'Indian';
let nutritionSubcategory = 'All';
let currentFoodSearch = '';

const NUTRITION_CATEGORIES = ['Cuisines','Fruits','Vegetables','Drinks','Cheat Meals','Alcohol','Sauces','Supplements','Custom'];
const CUISINES = ['Global / Basic','Indian','American','Italian','Chinese','Japanese','Korean','Thai','Mexican','Mediterranean','Arabic / Middle Eastern'];
const INDIAN_SUBCATEGORIES = ['All','Chicken','Paneer','Chaap','Dal / Pulses','Rice & Roti','Breakfast','Chicken - Tandoori','Paneer - Curry','Paneer - Dry','Chaap - Curry','Street','Desserts','High Protein'];
const CUSTOM_PORTIONS = [
  {unit:'per 100g', label:'per 100g'},
  {unit:'serving', label:'1 serving'},
  {unit:'bowl', label:'1 bowl'},
  {unit:'cup', label:'1 cup'},
  {unit:'tbsp', label:'1 tbsp / spoon'},
  {unit:'tsp', label:'1 tsp'},
  {unit:'piece', label:'1 piece'}
];

function viewDate(){return selectedDate || todayKey()}
function isTodayView(){return viewDate()===todayKey()}
function setViewDate(d){selectedDate=d;data.selectedDate=d;save()}
function previousDateStr(days=1){
  const d=new Date();
  d.setDate(d.getDate()-days);
  const y=d.getFullYear();
  const m=String(d.getMonth()+1).padStart(2,'0');
  const day=String(d.getDate()).padStart(2,'0');
  return `${y}-${m}-${day}`;
}
function dateSelectorHtml(){
  return `<div class="date-selector pill-row">
    <button class="pill ${isTodayView()?'active':''}" id="dateToday">Today</button>
    <button class="pill ${viewDate()===previousDateStr(1)?'active':''}" id="dateYesterday">Yesterday</button>
    <input id="datePicker" type="date" value="${viewDate()}">
  </div>`;
}
function bindDateSelector(){
  const today=q('dateToday'), yesterday=q('dateYesterday'), picker=q('datePicker');
  if(today) today.onclick=()=>{setViewDate(todayKey())};
  if(yesterday) yesterday.onclick=()=>{setViewDate(previousDateStr(1))};
  if(picker) picker.onchange=()=>{setViewDate(picker.value)};
}
function allFoodItems(){
  return [
    ...(typeof FOOD_DATABASE!=='undefined'?FOOD_DATABASE:[]),
    ...(typeof SUPPLEMENT_DATABASE!=='undefined'?SUPPLEMENT_DATABASE:[]),
    ...(data.customFoods||[])
  ];
}
function topCategory(f){
  if(f.main==='Custom') return 'Custom';
  if(f.main==='Supplements') return 'Supplements';
  if(f.main==='Sauces') return 'Sauces';
  if(f.main==='Alcohol') return 'Alcohol';
  if(f.main==='Cheat Meals') return 'Cheat Meals';
  if(f.main==='Drinks') return 'Drinks';
  if(f.main==='Fruits'||f.sub==='Fruits') return 'Fruits';
  if(f.main==='Vegetables'||f.sub==='Vegetables') return 'Vegetables';
  if(f.main==='Cuisines'||f.cuisine) return 'Cuisines';
  return f.main || 'Cuisines';
}
function itemCuisine(f){
  if(f.cuisine) return f.cuisine;
  if(f.main==='Cuisines') return 'Indian';
  return 'Global / Basic';
}
function itemIndianSubcategory(f){
  const name=`${f.name||''} ${f.sub||''}`.toLowerCase();
  if(name.includes('tandoori')) return 'Chicken - Tandoori';
  if(name.includes('paneer') && (name.includes('curry')||name.includes('masala')||name.includes('butter'))) return 'Paneer - Curry';
  if(name.includes('paneer')) return 'Paneer';
  if(name.includes('chaap') && name.includes('curry')) return 'Chaap - Curry';
  if(name.includes('chaap')) return 'Chaap';
  if(name.includes('dal')||name.includes('rajma')||name.includes('chole')||name.includes('pulse')) return 'Dal / Pulses';
  if(name.includes('roti')||name.includes('naan')||name.includes('rice')||name.includes('biryani')||name.includes('paratha')||name.includes('kulcha')) return 'Rice & Roti';
  if(name.includes('idli')||name.includes('dosa')||name.includes('poha')||name.includes('upma')||name.includes('breakfast')) return 'Breakfast';
  if(name.includes('chaat')||name.includes('pav')||name.includes('samosa')) return 'Street';
  if(name.includes('halwa')||name.includes('gulab')||name.includes('kheer')||name.includes('dessert')) return 'Desserts';
  if((Number(f.protein)||0)>=15) return 'High Protein';
  if(name.includes('chicken')) return 'Chicken';
  return f.sub || 'All';
}
function visibleFoodItems(search=''){
  const s=(search||'').trim().toLowerCase();
  let list=allFoodItems();
  if(s){
    return list.filter(f=>`${f.name||''} ${f.main||''} ${f.sub||''} ${f.cuisine||''} ${f.barcode||''}`.toLowerCase().includes(s));
  }
  list=list.filter(f=>topCategory(f)===nutritionCategory);
  if(nutritionCategory==='Cuisines'){
    list=list.filter(f=>itemCuisine(f)===nutritionCuisine || (nutritionCuisine==='Indian' && itemCuisine(f)==='Indian'));
    if(nutritionCuisine==='Indian' && nutritionSubcategory!=='All'){
      list=list.filter(f=>itemIndianSubcategory(f)===nutritionSubcategory || f.sub===nutritionSubcategory);
    }
  }
  return list;
}
function mealLogs(d=viewDate()){return (data.meals&&data.meals[d])?data.meals[d]:[]}
function stampedMeal(food){
  return {...food,meal:nutritionMeal,time:Date.now(),timeLabel:new Date().toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})};
}
function logFood(food){
  if(!isTodayView()){alert('Past days are view-only. Switch to Today to log food.');return}
  data.meals[todayKey()]=data.meals[todayKey()]||[];
  data.meals[todayKey()].push(stampedMeal(food));
  save();
  showPostMealCoach(food.meal||nutritionMeal);
}
function showPostMealCoach(meal){
  const t=targets(), m=mealTotals(todayKey());
  const proteinLeft=Math.max(0,Math.round(t.protein-m.p));
  const calLeft=Math.max(0,Math.round((t.calories+(typeof workoutCalories==='function'?workoutCalories(todayKey()):0))-m.cal));
  const suggestion=proteinLeft>40?'Protein is low. Consider whey protein, chicken, eggs, paneer or curd.':proteinLeft>25?'Add a protein snack later: whey, eggs, paneer or Greek yogurt.':'You are close on protein. Keep remaining meals balanced.';
  data.notifications=data.notifications||[];
  data.notifications.unshift({type:'coach',time:Date.now(),message:`${meal} logged. Remaining: ${calLeft} kcal and ${proteinLeft}g protein. ${suggestion}`});
  localStorage.setItem(STORE,JSON.stringify(data));
}
function customFoodForm(existing=null,index=null){
  const f=existing||{};
  const modal=q('modal'), card=q('modalCard');
  modal.classList.remove('hidden');
  card.innerHTML=`<div class="panel-title">${existing?'Edit':'Add'} Custom Food</div>
    <div class="form-grid custom-food-form">
      <div class="field"><label>Food Name</label><input id="cfName" value="${f.name||''}" placeholder="e.g., Lauki Sabzi"></div>
      <div class="field"><label>Serving / Portion Type</label><select id="cfPortion">${CUSTOM_PORTIONS.map(p=>`<option value="${p.unit}" ${f.unit===p.unit?'selected':''}>${p.label}</option>`).join('')}</select></div>
      <div class="field"><label>Portion Display</label><input id="cfPortionText" value="${f.portion||''}" placeholder="e.g., 1 cup / 150g"></div>
      <div class="field"><label>Calories</label><input id="cfCalories" type="number" step="0.1" value="${f.calories??''}"></div>
      <div class="field"><label>Protein (g)</label><input id="cfProtein" type="number" step="0.1" value="${f.protein??''}"></div>
      <div class="field"><label>Carbs (g)</label><input id="cfCarbs" type="number" step="0.1" value="${f.carbs??''}"></div>
      <div class="field"><label>Fats (g)</label><input id="cfFats" type="number" step="0.1" value="${f.fats??''}"></div>
    </div>
    <div style="display:flex;gap:10px;flex-wrap:wrap;margin-top:14px">
      <button class="btn primary" id="saveCustomFood">${existing?'Save Changes':'Save Food'}</button>
      <button class="btn" id="cancelCustomFood">Cancel</button>
    </div>`;
  q('cancelCustomFood').onclick=()=>{modal.classList.add('hidden');card.innerHTML=''};
  q('saveCustomFood').onclick=()=>{
    const food={
      main:'Custom',
      sub:'User Food',
      name:q('cfName').value.trim(),
      defaultQty:1,
      unit:q('cfPortion').value,
      portion:q('cfPortionText').value.trim() || q('cfPortion').selectedOptions[0].textContent,
      calories:Number(q('cfCalories').value||0),
      protein:Number(q('cfProtein').value||0),
      carbs:Number(q('cfCarbs').value||0),
      fats:Number(q('cfFats').value||0)
    };
    if(!food.name){alert('Enter food name.');return}
    data.customFoods=data.customFoods||[];
    if(index!==null && index!==undefined) data.customFoods[index]=food; else data.customFoods.push(food);
    localStorage.setItem(STORE,JSON.stringify(data));
    modal.classList.add('hidden');card.innerHTML='';
    nutritionCategory='Custom';
    render();
  };
}
function editCustomFood(index){customFoodForm(data.customFoods[index],index)}
function deleteCustomFood(index){
  if(confirm('Delete this custom food? Past logged meals will remain unchanged.')){
    data.customFoods.splice(index,1);
    localStorage.setItem(STORE,JSON.stringify(data));
    render();
  }
}
function renderFoodListOnly(){
  const box=q('foodList');
  if(!box) return;
  const list=visibleFoodItems(currentFoodSearch).slice(0,120);
  if(!list.length){box.innerHTML='<div class="item">No foods found.</div>';return}
  box.innerHTML=list.map((f,i)=>{
    const customIndex=(f.main==='Custom')?(data.customFoods||[]).findIndex(x=>x.name===f.name && x.calories===f.calories):null;
    const manage=(f.main==='Custom'&&customIndex>=0)?`<button class="btn" data-editcustom="${customIndex}">Edit</button><button class="btn danger" data-delcustom="${customIndex}">Delete</button>`:'';
    return `<div class="food-card-clean">
      <div><strong>${f.name}</strong><br><span>${topCategory(f)} → ${f.sub||itemCuisine(f)||''}</span><br><small>${f.portion||''} • ${f.calories||0} kcal • P${f.protein||0} C${f.carbs||0} F${f.fats||0}</small></div>
      <div class="food-card-actions">${isTodayView()?`<button class="btn primary" data-addfood="${i}">Add</button>`:''}${manage}</div>
    </div>`;
  }).join('');
  document.querySelectorAll('[data-addfood]').forEach(b=>b.onclick=()=>logFood({...list[Number(b.dataset.addfood)],qty:list[Number(b.dataset.addfood)].defaultQty||1}));
  document.querySelectorAll('[data-editcustom]').forEach(b=>b.onclick=()=>editCustomFood(Number(b.dataset.editcustom)));
  document.querySelectorAll('[data-delcustom]').forEach(b=>b.onclick=()=>deleteCustomFood(Number(b.dataset.delcustom)));
}
function bindNutritionControls(){
  bindDateSelector();
  document.querySelectorAll('[data-meal]').forEach(b=>b.onclick=()=>{nutritionMeal=b.dataset.meal;render()});
  document.querySelectorAll('[data-ncat]').forEach(b=>b.onclick=()=>{nutritionCategory=b.dataset.ncat;nutritionSubcategory='All';render()});
  document.querySelectorAll('[data-cuisine]').forEach(b=>b.onclick=()=>{nutritionCuisine=b.dataset.cuisine;nutritionSubcategory='All';render()});
  document.querySelectorAll('[data-isub]').forEach(b=>b.onclick=()=>{nutritionSubcategory=b.dataset.isub;render()});
  const search=q('foodSearch');
  if(search){
    search.value=currentFoodSearch;
    search.oninput=()=>{currentFoodSearch=search.value;renderFoodListOnly();search.focus()};
  }
  const addBtn=q('addCustomFoodBtn'); if(addBtn) addBtn.onclick=()=>customFoodForm();
  const scan=q('scanBarcode'); if(scan) scan.onclick=openBarcodeScanner;
  const manual=q('manualBarcode'); if(manual) manual.onclick=()=>{const code=prompt('Enter barcode');if(code)handleBarcodeResult(code)};
  const customWater=q('customWaterBtn'); if(customWater) customWater.onclick=()=>{const ml=Number(prompt('Enter water amount in ml','750')||0);if(ml>0)addWater(ml)};
  document.querySelectorAll('[data-water]').forEach(b=>b.onclick=()=>addWater(Number(b.dataset.water)));
  renderFoodListOnly();
}
function hotfixStartup(){
  // Always default to today's local date on fresh open to avoid stale yesterday view.
  selectedDate=todayKey();
  data.selectedDate=selectedDate;
  localStorage.setItem(STORE,JSON.stringify(data));
}
hotfixStartup();

// ---------- Init ----------
function bind(){
  q('mobileMenuBtn').onclick=()=>q('sidebar').classList.toggle('open');
  document.querySelectorAll('[data-tab]').forEach(b=>b.onclick=()=>switchTab(b.dataset.tab));
  document.querySelectorAll('[data-mobile-tab]').forEach(b=>b.onclick=()=>switchTab(b.dataset.mobileTab));
}
bind();
render();
if('serviceWorker'in navigator)window.addEventListener('load',()=>navigator.serviceWorker.register('/sw.js?v=stable-1-0-3-hotfix-final').catch(()=>{}));



function todayKey(){
  const d=new Date();
  const y=d.getFullYear();
  const m=String(d.getMonth()+1).padStart(2,'0');
  const day=String(d.getDate()).padStart(2,'0');
  return `${y}-${m}-${day}`;
}

