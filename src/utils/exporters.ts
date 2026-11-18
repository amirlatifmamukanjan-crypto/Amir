import type { AttendanceCode, SchoolDB, Student } from '../types';

export function escapeHtml(s: unknown): string {
  return String(s ?? '').replace(/[&<>"]/g, (c) => {
    const map: Record<string, string> = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
    };
    return map[c] || c;
  });
}

export function daysInMonth(month: string): number {
  const year = Number(month.slice(0, 4));
  const m = Number(month.slice(5, 7));
  if (!year || !m) return 30;
  return new Date(year, m, 0).getDate();
}

export function dateKey(month: string, day: number): string {
  return `${month}-${String(day).padStart(2, '0')}`;
}

export function getStudentMonthStat(
  att: SchoolDB['att'],
  studentId: string,
  month: string
) {
  const counts = { P: 0, A: 0, L: 0 };
  const days: (AttendanceCode | '')[] = [];
  const totalDays = daysInMonth(month);
  for (let d = 1; d <= totalDays; d++) {
    const code = att[dateKey(month, d)]?.[studentId] || '';
    if (code === 'P' || code === 'A' || code === 'L') {
      counts[code]++;
    }
    days.push(code);
  }
  const marked = counts.P + counts.A + counts.L;
  const percentage = marked ? Math.round((counts.P * 100) / marked) : 0;
  return { counts, days, percentage };
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function exportExcelTable(filename: string, htmlBody: string) {
  const content = `\ufeff<html><head><meta charset="utf-8"></head><body>${htmlBody}</body></html>`;
  downloadBlob(
    new Blob([content], { type: 'application/vnd.ms-excel' }),
    `${filename}.xls`
  );
}

export function exportMonthlyAttendanceExcel(
  db: SchoolDB,
  cls: string,
  month: string
) {
  const totalDays = daysInMonth(month);
  const students = db.students.filter((s) => s.cls === cls);
  const headerDays = Array.from({ length: totalDays }, (_, i) => `<th>${i + 1}</th>`).join('');
  const rows = students
    .map((s) => {
      const stat = getStudentMonthStat(db.att, s.id, month);
      const dayCells = stat.days.map((d) => `<td>${d}</td>`).join('');
      return `<tr><td>${escapeHtml(s.roll)}</td><td>${escapeHtml(s.name)}</td>${dayCells}<td>${stat.counts.P}</td><td>${stat.counts.A}</td><td>${stat.counts.L}</td><td>${stat.percentage}%</td></tr>`;
    })
    .join('');

  const table = `<h3>${escapeHtml(db.schoolName)}, ${escapeHtml(db.campus)} - ${escapeHtml(cls)} - ${escapeHtml(month)}</h3><table border="1"><tr><th>Roll</th><th>Name</th>${headerDays}<th>Present</th><th>Absent</th><th>Leave</th><th>%</th></tr>${rows}</table>`;
  exportExcelTable(`Attendance_${cls}_${month}`, table);
}

export function exportFeesExcel(db: SchoolDB, month: string) {
  const rows = db.students
    .map((s) => {
      const f = db.fees[`${s.id}|${month}`];
      return `<tr><td>${escapeHtml(s.roll)}</td><td>${escapeHtml(s.name)}</td><td>${escapeHtml(s.cls)}</td><td>${s.fee}</td><td>${f ? 'Paid' : 'Unpaid'}</td><td>${f ? escapeHtml(f.date) : ''}</td></tr>`;
    })
    .join('');

  const table = `<h3>${escapeHtml(db.schoolName)}, ${escapeHtml(db.campus)} - Fee ${escapeHtml(month)}</h3><table border="1"><tr><th>Roll</th><th>Name</th><th>Class</th><th>Fee</th><th>Status</th><th>Date</th></tr>${rows}</table>`;
  exportExcelTable(`Fee_${month}`, table);
}

export function exportJsonBackup(db: SchoolDB) {
  const today = new Date().toISOString().slice(0, 10);
  downloadBlob(
    new Blob([JSON.stringify(db, null, 2)], { type: 'application/json' }),
    `AANS_backup_${today}.json`
  );
}

async function blobToDataUrl(url: string): Promise<string> {
  try {
    const res = await fetch(url);
    if (!res.ok) return '';
    const blob = await res.blob();
    return await new Promise<string>((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || ''));
      reader.onerror = () => resolve('');
      reader.readAsDataURL(blob);
    });
  } catch {
    return '';
  }
}

export async function exportPortableOfflineHtml(db: SchoolDB) {
  const [logoData, bgData] = await Promise.all([
    blobToDataUrl('/school-logo.png'),
    blobToDataUrl('/school-bg.jpg'),
  ]);
  const safeDbJson = JSON.stringify(db).replace(/<\//g, '<\\/');

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${escapeHtml(db.schoolName)} - Offline PC Software</title>
<style>
:root{--pn:rgba(255,255,255,.94);--g:#0f7a3d;--n:#1b2f6b;--bg:#f2f6f3;--c:#fff;--t:#1a1a1a;--b:#cfd9d2}
@media(prefers-color-scheme:dark){:root{--pn:rgba(20,26,28,.93);--bg:#13181a;--c:#1d2326;--t:#eee;--b:#38423c}}
*{box-sizing:border-box}body{margin:0;font:15px system-ui,Arial,sans-serif;background:var(--bg);color:var(--t)}
header{display:flex;align-items:center;gap:12px;background:var(--n);color:#fff;padding:10px 18px;flex-wrap:wrap}header span{margin-left:auto}
nav{display:flex;gap:4px;background:var(--g);padding:6px 14px;flex-wrap:wrap}nav button{background:none;color:#fff;border:0;padding:8px 14px;border-radius:6px;cursor:pointer;font-size:15px}nav .on{background:#fff;color:var(--g);font-weight:bold}
main{padding:18px;max-width:1200px;margin:18px auto;background:var(--pn);border-radius:12px}.f{display:flex;gap:8px;flex-wrap:wrap;margin:10px 0;align-items:center}
input,select,button{font:inherit;padding:7px 10px;border:1px solid var(--b);border-radius:6px;background:var(--c);color:var(--t)}button{cursor:pointer}.pr{background:var(--g);color:#fff;border-color:var(--g)}
.sc{overflow-x:auto;background:var(--c);border:1px solid var(--b);border-radius:8px}table{border-collapse:collapse;width:100%}th,td{border:1px solid var(--b);padding:6px 8px;text-align:center;white-space:nowrap}th{background:var(--n);color:#fff}td:nth-child(2){text-align:left}
.mP.on{background:#2e9e56;color:#fff}.mA.on{background:#d33;color:#fff}.mL.on{background:#e6a817;color:#000}
.lg{max-width:380px;margin:48px auto;background:var(--pn);box-shadow:0 8px 30px rgba(0,0,0,.35);padding:24px;border-radius:12px;text-align:center;display:flex;flex-direction:column;gap:10px;border:1px solid var(--b)}.lg h2{margin:4px 0;color:var(--n)}.lg p,small{margin:0;opacity:.75}
.ph{width:36px;height:36px;border-radius:50%;object-fit:cover;vertical-align:middle}.ph.n{display:inline-flex;align-items:center;justify-content:center;background:var(--g);color:#fff;font-weight:bold}.ph.big{width:90px;height:90px;font-size:36px}
.g{display:flex;flex-wrap:wrap;gap:6px}.d{width:44px;padding:5px 0;text-align:center;border:1px solid var(--b);border-radius:6px;background:var(--c);font-size:12px}.d.P{background:#c9f0d5;color:#0a361a}.d.A{background:#ffc9c9;color:#5c0c0c}.d.L{background:#ffeaa8;color:#4a3500}
#bg{position:fixed;inset:0;z-index:-1;overflow:hidden;background:#1b2f6b}#bg i{position:absolute;inset:0;background:center/cover}#bg::after{content:'';position:absolute;inset:0;background:linear-gradient(rgba(10,30,20,.35),rgba(10,30,20,.65))}
</style>
</head>
<body>
<div id="bg"><i></i></div>
<div id="app"></div>
<script>
const BG=${JSON.stringify(bgData)},LOGO=${JSON.stringify(logoData)},EMBED=${safeDbJson};
const $=s=>document.querySelector(s),K='aans_portable_v2',MN=new Date().toISOString().slice(0,7);
let db,me=null,tab='',S={d:MN+new Date().toISOString().slice(7,10),m:MN,c:''};
const esc=s=>String(s??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
function load(){try{db=JSON.parse(localStorage.getItem(K))}catch(e){}if(!db||!db.students)db=EMBED}
const save=()=>{try{localStorage.setItem(K,JSON.stringify(db))}catch(e){}};
const classes=()=>[...new Set([...db.students.map(s=>s.cls),...db.teachers.map(t=>t.cls)])].filter(Boolean);
const mt=()=>db.teachers.find(x=>String(x.id)==String(me.id)),ms=()=>db.students.find(x=>String(x.id)==String(me.id));
const who=()=>me.role=='admin'?'Admin':me.role=='teacher'?mt().name:ms().name;
function dl(b,n){const a=document.createElement('a');a.href=URL.createObjectURL(b);a.download=n;a.click()}
const xl=(n,t)=>dl(new Blob(['\\ufeff<html><head><meta charset="utf-8"></head><body>'+t+'</body></html>'],{type:'application/vnd.ms-excel'}),n+'.xls');
const dk=(m,d)=>\`\${m}-\${String(d).padStart(2,'0')}\`,dim=m=>new Date(+m.slice(0,4),+m.slice(5),0).getDate();
function stat(id,m){let c={P:0,A:0,L:0},v=[];for(let d=1;d<=dim(m);d++){const x=(db.att[dk(m,d)]||{})[id]||'';if(x)c[x]++;v.push(x)}const t=c.P+c.A+c.L;return{c,v,p:t?Math.round(c.P*100/t):0}}
function rep(cls,m){let h='<table border=1><tr><th>Roll</th><th>Name</th>'+[...Array(dim(m))].map((_,i)=>\`<th>\${i+1}</th>\`).join('')+'<th>Present</th><th>Absent</th><th>Leave</th><th>%</th></tr>';
 db.students.filter(s=>s.cls==cls).forEach(s=>{const r=stat(s.id,m);h+=\`<tr><td>\${esc(s.roll)}</td><td>\${esc(s.name)}</td>\${r.v.map(x=>\`<td>\${x}</td>\`).join('')}<td>\${r.c.P}</td><td>\${r.c.A}</td><td>\${r.c.L}</td><td>\${r.p}%</td></tr>\`});return h+'</table>'}
function login(){const r=$('#r').value,u=$('#u').value.trim(),p=$('#p').value;let x;
 if(r=='admin'&&u==db.admin.user&&p==db.admin.pass)me={role:r};
 else if(r=='teacher'&&(x=db.teachers.find(t=>t.user==u&&t.pass==p)))me={role:r,id:x.id};
 else if(r=='student'&&(x=db.students.find(s=>s.roll==u&&s.pass==p)))me={role:r,id:x.id};
 else return alert('Username ya password galat hai');tab='';render()}
const add=(k,o)=>{o.id=String(db.nid++);db[k].push(o);save();render()},del=(k,id)=>{if(confirm('Delete karna hai?')){db[k]=db[k].filter(x=>String(x.id)!=String(id));save();render()}};
const val=i=>$('#'+i).value.trim();
function addS(){if(!val('sr')||!val('sn'))return alert('Roll No aur Name likhein');if(db.students.some(s=>s.roll==val('sr')))return alert('Ye Roll No pehle se hai');
 add('students',{roll:val('sr'),name:val('sn'),cls:val('sc'),fee:+val('sf')||0,pass:val('sp')||'1234',photo:PH});PH=''}
function addT(){if(!val('tn')||!val('tu'))return alert('Name aur Username likhein');if(db.teachers.some(t=>t.user==val('tu')))return alert('Ye username pehle se hai');
 add('teachers',{name:val('tn'),user:val('tu'),pass:val('tp')||'1234',cls:val('tc')})}
function mark(id,v){(db.att[S.d]=db.att[S.d]||{})[id]=v;save();render()}
function allP(){db.students.filter(s=>s.cls==mt().cls).forEach(s=>(db.att[S.d]=db.att[S.d]||{})[s.id]='P');save();render()}
function pay(id){const k=id+'|'+S.m;if(db.fees[k])delete db.fees[k];else db.fees[k]={amt:db.students.find(s=>String(s.id)==String(id)).fee,date:new Date().toISOString().slice(0,10)};save();render()}
const fr=s=>{const f=db.fees[s.id+'|'+S.m];return\`<td>\${esc(s.roll)}<td>\${esc(s.name)}<td>\${esc(s.cls)}<td>\${s.fee}<td>\${f?'Paid':'Unpaid'}<td>\${f?f.date:''}\`};
const xf=()=>xl('Fee_'+S.m,\`<h3>\${esc(db.schoolName)}, \${esc(db.campus)} - Fee \${S.m}</h3><table border=1><tr><th>Roll<th>Name<th>Class<th>Fee<th>Status<th>Date</tr>\`+db.students.map(s=>\`<tr>\${fr(s)}</tr>\`).join('')+'</table>');
const sel=(c,ch)=>\`<select onchange="\${ch}">\${classes().map(x=>\`<option \${x==c?'selected':''}>\${esc(x)}</option>\`).join('')}</select>\`;
const dl_=()=>\`<datalist id=cl>\${classes().map(c=>\`<option>\${esc(c)}</option>\`).join('')}</datalist>\`;
const ph=(s,b)=>s.photo?\`<img src="\${s.photo}" class="ph \${b?'big':''}">\`:\`<span class="ph n \${b?'big':''}">\${esc((s.name||'?')[0])}</span>\`;let PH='';
function pick(f,id){if(!f)return;const r=new FileReader();r.onload=()=>{const i=new Image();i.onload=()=>{const c=document.createElement('canvas'),z=Math.min(i.width,i.height);c.width=c.height=150;c.getContext('2d').drawImage(i,(i.width-z)/2,(i.height-z)/2,z,z,0,0,150,150);const u=c.toDataURL('image/jpeg',.8);if(id){db.students.find(x=>String(x.id)==String(id)).photo=u;save();render()}else{PH=u;$('#pv').src=u;$('#pv').style.display='inline'}};i.src=r.result};r.readAsDataURL(f)}
const V={
Students:()=>\`<h3>Naya Student</h3><div class=f><input id=sr placeholder="Roll No" size=8><input id=sn placeholder="Name"><input id=sc placeholder="Class" list=cl size=10><input id=sf type=number placeholder="Monthly Fee" style="width:120px"><input id=sp placeholder="Password" value=1234 size=8><label>Photo: <input type=file accept="image/*" onchange="pick(this.files[0])"></label><img id=pv class=ph style="display:none"><button class=pr onclick=addS()>Add</button></div>\${dl_()}<div class=sc><table><tr><th>Roll<th>Name<th>Class<th>Fee<th></tr>\${db.students.map(s=>\`<tr><td>\${esc(s.roll)}<td>\${ph(s)} \${esc(s.name)}<td>\${esc(s.cls)}<td>\${s.fee}<td><button onclick="this.nextElementSibling.click()">Photo</button><input type=file hidden accept="image/*" onchange="pick(this.files[0],'\${s.id}')"> <button onclick="del('students','\${s.id}')">Delete</button></tr>\`).join('')}</table></div>\`,
Teachers:()=>\`<h3>Naya Teacher</h3><div class=f><input id=tn placeholder="Name"><input id=tu placeholder="Username" size=10><input id=tp placeholder="Password" value=1234 size=8><input id=tc placeholder="Class" list=cl size=10><button class=pr onclick=addT()>Add</button></div>\${dl_()}<div class=sc><table><tr><th>Name<th>Username<th>Class<th></tr>\${db.teachers.map(t=>\`<tr><td>\${esc(t.name)}<td>\${esc(t.user)}<td>\${esc(t.cls)}<td><button onclick="del('teachers','\${t.id}')">Delete</button></tr>\`).join('')}</table></div>\`,
Fees:()=>{const g=db.students.reduce((a,s)=>a+(db.fees[s.id+'|'+S.m]?s.fee:0),0),t=db.students.reduce((a,s)=>a+s.fee,0);
 return\`<h3>Fee</h3><div class=f><input type=month value=\${S.m} onchange="S.m=this.value||S.m;render()"><span>Wasool: <b>Rs \${g}</b> | Baqaya: <b>Rs \${t-g}</b></span><button class=pr onclick=xf()>Excel Download</button></div><div class=sc><table><tr><th>Roll<th>Name<th>Class<th>Fee<th>Status<th>Date<th></tr>\${db.students.map(s=>\`<tr>\${fr(s)}<td><button onclick="pay('\${s.id}')">\${db.fees[s.id+'|'+S.m]?'Undo':'Receive'}</button></tr>\`).join('')}</table></div>\`},
Attendance:()=>{const t=mt(),r=db.att[S.d]||{};return\`<h3>\${esc(t.cls)} - Attendance</h3><div class=f><input type=date value=\${S.d} onchange="S.d=this.value||S.d;render()"><button onclick=allP()>Sab Present</button></div><div class=sc><table><tr><th>Roll<th>Name<th>Status</tr>\${db.students.filter(s=>s.cls==t.cls).map(s=>\`<tr><td>\${esc(s.roll)}<td>\${ph(s)} \${esc(s.name)}<td>\${['P','A','L'].map(v=>\`<button class="m\${v} \${r[s.id]==v?'on':''}" onclick="mark('\${s.id}','\${v}')">\${v}</button>\`).join(' ')}</tr>\`).join('')}</table></div>\`},
Reports:()=>{if(me.role=='teacher')S.c=mt().cls;else if(!classes().includes(S.c))S.c=classes()[0]||'';
 return\`<h3>Monthly Report</h3><div class=f>\${me.role=='admin'?sel(S.c,"S.c=this.value;render()"):\`<b>\${esc(S.c)}</b>\`}<input type=month value=\${S.m} onchange="S.m=this.value||S.m;render()"><button class=pr onclick="xl('Attendance_'+S.c+'_'+S.m,'<h3>'+esc(db.schoolName)+' - '+S.c+' - '+S.m+'</h3>'+rep(S.c,S.m))">Excel Download</button></div><div class=sc>\${rep(S.c,S.m)}</div>\`},
'My Attendance':()=>{const r=stat(me.id,S.m);return\`<div class=f>\${ph(ms(),1)}<div><b>\${esc(ms().name)}</b><br><small>Roll No: \${esc(ms().roll)} | \${esc(ms().cls)}</small></div></div><h3>Meri Attendance</h3><div class=f><input type=month value=\${S.m} onchange="S.m=this.value||S.m;render()"><span>Present <b>\${r.c.P}</b> | Absent <b>\${r.c.A}</b> | Leave <b>\${r.c.L}</b> | <b>\${r.p}%</b></span></div><div class=g>\${r.v.map((x,i)=>\`<div class="d \${x}">\${i+1}<br>\${x||'-'}</div>\`).join('')}</div>\`},
'My Fees':()=>{const s=ms(),y=S.m.slice(0,4);return\`<h3>Meri Fee (\${y})</h3><div class=sc><table><tr><th>Month<th>Fee<th>Status<th>Date</tr>\${[...Array(12)].map((_,i)=>{const f=db.fees[s.id+'|'+y+'-'+String(i+1).padStart(2,'0')];return\`<tr><td>\${y}-\${String(i+1).padStart(2,'0')}<td>\${s.fee}<td>\${f?'Paid':'Unpaid'}<td>\${f?f.date:''}</tr>\`}).join('')}</table></div>\`},
Backup:()=>\`<h3>Backup / Restore</h3><div class=f><button class=pr onclick="dl(new Blob([JSON.stringify(db)]),'AANS_backup_'+new Date().toISOString().slice(0,10)+'.json')">Backup Download</button><input type=file accept=.json onchange="rest(this.files[0])"></div>\`};
function rest(f){if(!f)return;const r=new FileReader();r.onload=()=>{try{const d=JSON.parse(r.result);if(!d.students)throw 0;db=d;save();alert('Restore ho gaya');render()}catch(e){alert('File sahi nahi hai')}};r.readAsText(f)}
function render(){const a=$('#app');
 if(!me){a.innerHTML=\`<div class=lg>\${LOGO?\`<img src="\${LOGO}" width=110 style="margin:auto">\`:''}<h2>\${esc(db.schoolName)}</h2><p>\${esc(db.campus)} - Offline PC Edition</p><select id=r><option value=teacher>Teacher</option><option value=student>Student</option><option value=admin>Admin</option></select><input id=u placeholder="Username / Roll No"><input id=p type=password placeholder=Password onkeydown="if(event.key=='Enter')login()"><button class=pr onclick=login()>Login</button></div>\`;return}
 const T={admin:['Students','Teachers','Fees','Reports','Backup'],teacher:['Attendance','Reports'],student:['My Attendance','My Fees']}[me.role];if(!T.includes(tab))tab=T[0];
 a.innerHTML=\`<header>\${LOGO?\`<img src="\${LOGO}" height=44>\`:''}<b>\${esc(db.schoolName)}, \${esc(db.campus)}</b><span>\${esc(who())} (\${me.role}) <button onclick="me=null;render()">Logout</button></span></header><nav>\${T.map(t=>\`<button class="\${t==tab?'on':''}" onclick="tab='\${t}';render()">\${t}</button>\`).join('')}</nav><main>\${V[tab]()}</main>\`}
if(BG)$('#bg i').style.backgroundImage=\`url(\${BG})\`;load();render();
<\/script>
</body>
</html>`;

  const today = new Date().toISOString().slice(0, 10);
  downloadBlob(
    new Blob([html], { type: 'text/html;charset=utf-8' }),
    `AANS_Portable_PC_${today}.html`
  );
}
