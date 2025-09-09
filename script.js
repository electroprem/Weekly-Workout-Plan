const STORAGE_PREFIX = 'workout.week.';
const dayKey = (day) => STORAGE_PREFIX + 'day' + day;
const allKeys = () => Array.from({length:7}, (_,i)=>dayKey(i+1));

function loadDayState(day){
  try{ return JSON.parse(localStorage.getItem(dayKey(day)) || '{}'); }
  catch(e){ return {} }
}
function saveDayState(day, state){ localStorage.setItem(dayKey(day), JSON.stringify(state)); }
function clearDayState(day){ localStorage.removeItem(dayKey(day)); }

function computeDayPct(panel){
  const cbs = panel.querySelectorAll('input[type="checkbox"][data-id]');
  const total = cbs.length || 1;
  const done = Array.from(cbs).filter(cb=>cb.checked).length;
  return Math.round(done*100/total);
}

function refreshBadges(){
  document.querySelectorAll('.panel').forEach(panel=>{
    const day = Number(panel.dataset.day);
    const pct = computeDayPct(panel);
    const badge = document.querySelector(`label[for="day${day}"] [data-badge="${day}"]`);
    if(badge) badge.textContent = pct + '%';
  });
}

function reflectPanel(panel){
  const day = Number(panel.dataset.day);
  const s = loadDayState(day);
  panel.querySelectorAll('input[type="checkbox"][data-id]').forEach(cb=>{
    cb.checked = !!s[cb.getAttribute('data-id')];
  });
}

// Auto-select today's workout day
function getTodaysWorkoutDay(){
  const today = new Date();
  const dayOfWeek = today.getDay(); // 0=Sunday, 1=Monday, etc.
  
  // Map calendar days to workout days
  const workoutDayMap = {
    1: 'day1', // Monday = Day 1 (Push A)
    2: 'day2', // Tuesday = Day 2 (Pull A) 
    3: 'day3', // Wednesday = Day 3 (Legs A)
    4: 'day4', // Thursday = Day 4 (Active Recovery)
    5: 'day5', // Friday = Day 5 (Push B)
    6: 'day6', // Saturday = Day 6 (Pull B+Lower)
    0: 'day7'  // Sunday = Day 7 (Rest)
  };
  
  return workoutDayMap[dayOfWeek] || 'day1';
}

function getNextIncompleteDay(){
  // Find first day that's not 100% complete
  for(let d = 1; d <= 7; d++){
    const panel = document.querySelector(`[data-day="${d}"]`);
    if(panel && computeDayPct(panel) < 100){
      return `day${d}`;
    }
  }
  return 'day1'; // Default to day 1 if all complete
}

function autoSelectDay(){
  const weekStarted = localStorage.getItem(STORAGE_PREFIX + 'weekStart');
  let targetDay;
  
  if(weekStarted){
    // If week is started, go to next incomplete day
    targetDay = getNextIncompleteDay();
  } else {
    // If no week started, go to today's calendar day
    targetDay = getTodaysWorkoutDay();
  }
  
  // Select the target day tab
  const dayRadio = document.getElementById(targetDay);
  if(dayRadio){
    dayRadio.checked = true;
  }
}

// Add visual indicator for today's suggested day
function highlightTodaysDay(){
  const todayDay = getTodaysWorkoutDay();
  const todayLabel = document.querySelector(`label[for="${todayDay}"]`);
  if(todayLabel){
    // Add a subtle indicator
    todayLabel.style.boxShadow = 'inset 0 0 0 2px rgba(124,254,173,0.3)';
    todayLabel.title = 'Today\'s suggested workout';
  }
}

function dumpAll(){
  const data = { weekStart: localStorage.getItem(STORAGE_PREFIX + 'weekStart') || null };
  for(let d=1; d<=7; d++){ data['day'+d] = loadDayState(d); }
  return data;
}

function loadAll(obj){
  if(obj.weekStart) localStorage.setItem(STORAGE_PREFIX + 'weekStart', obj.weekStart);
  for(let d=1; d<=7; d++){
    if(obj['day'+d]) saveDayState(d, obj['day'+d]);
  }
  document.querySelectorAll('.panel').forEach(reflectPanel);
  refreshBadges();
  setWeekMeta();
  autoSelectDay(); // Auto-select after import
}

function wirePanel(panel){
  const day = Number(panel.dataset.day);
  const state = loadDayState(day);
  panel.querySelectorAll('input[type="checkbox"][data-id]').forEach(cb=>{
    const id = cb.getAttribute('data-id');
    cb.checked = !!state[id];
    cb.addEventListener('change', ()=>{
      const s = loadDayState(day);
      s[id] = cb.checked;
      saveDayState(day, s);
      refreshBadges();
      // Auto-advance to next day if current day is 100% complete
      if(computeDayPct(panel) === 100){
        setTimeout(()=>{
          const nextDay = getNextIncompleteDay();
          if(nextDay !== `day${day}`){ // Only switch if different day
            document.getElementById(nextDay)?.click();
          }
        }, 1000); // Small delay for user feedback
      }
    });
  });

  const on = (action, handler) => panel.querySelectorAll(`[data-action="${action}"]`).forEach(b=>b.addEventListener('click', handler));
  on('check-all', ()=>{
    const s = loadDayState(day);
    panel.querySelectorAll('input[type="checkbox"][data-id]').forEach(cb=>{
      cb.checked = true; s[cb.getAttribute('data-id')] = true;
    });
    saveDayState(day, s);
    refreshBadges();
  });
  on('uncheck-all', ()=>{
    const s = loadDayState(day);
    panel.querySelectorAll('input[type="checkbox"][data-id]').forEach(cb=>{
      cb.checked = false; s[cb.getAttribute('data-id')] = false;
    });
    saveDayState(day, s);
    refreshBadges();
  });
  on('reset-day', ()=>{
    const s = loadDayState(day);
    panel.querySelectorAll('input[type="checkbox"][data-id]').forEach(cb=>{
      const id = cb.getAttribute('data-id'); cb.checked = false; s[id] = false;
    });
    saveDayState(day, s);
    refreshBadges();
  });
}

// Initialize everything
document.querySelectorAll('.panel').forEach(panel=>{
  wirePanel(panel);
  reflectPanel(panel);
});
refreshBadges();

function resetAll(){
  allKeys().forEach(k=>localStorage.removeItem(k));
  document.querySelectorAll('.panel').forEach(panel=>{
    panel.querySelectorAll('input[type="checkbox"][data-id]').forEach(cb => cb.checked = false);
  });
  refreshBadges();
}

document.getElementById('resetAll').addEventListener('click', ()=>{
  if(confirm('Reset all days? This clears all saved checkmarks.')) resetAll();
});

function setWeekMeta(){
  const ws = localStorage.getItem(STORAGE_PREFIX + 'weekStart');
  const el = document.getElementById('weekMeta');
  el.textContent = ws ? `Week started: ${ws}` : 'Start a new week to track.';
}

document.getElementById('startWeek').addEventListener('click', ()=>{
  if(confirm('Start a new week? This resets all checkmarks.')){
    resetAll();
    const today = new Date().toISOString().slice(0,10);
    localStorage.setItem(STORAGE_PREFIX + 'weekStart', today);
    setWeekMeta();
    autoSelectDay(); // Auto-select after starting new week
  }
});

setWeekMeta();

// Enhanced export with better filename
document.getElementById('exportJson').addEventListener('click', ()=>{
  const today = new Date();
  const dateStr = today.toISOString().slice(0,10); // YYYY-MM-DD
  const weekStart = localStorage.getItem(STORAGE_PREFIX + 'weekStart');
  
  let filename;
  if(weekStart){
    filename = `workout-backup-week-${weekStart}.json`;
  } else {
    filename = `workout-backup-${dateStr}.json`;
  }
  
  const blob = new Blob([JSON.stringify(dumpAll(), null, 2)], {type:'application/json'});
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
  URL.revokeObjectURL(a.href);
});

document.getElementById('importJson').addEventListener('change', async (e)=>{
  const f = e.target.files[0]; if(!f) return;
  const text = await f.text();
  try{ loadAll(JSON.parse(text)); alert('Import successful.'); }
  catch(err){ alert('Invalid JSON.'); }
  finally { e.target.value = ''; }
});

if('serviceWorker' in navigator){
  navigator.serviceWorker.register('./sw.js').catch(()=>{});
}

// Run auto-selection on page load
autoSelectDay();
highlightTodaysDay();
