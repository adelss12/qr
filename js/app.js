/* صانع QR — الإصدار 2 */
'use strict';
const $ = id => document.getElementById(id);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const LS = {
  get(k, d){ try{ const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; }catch(e){ return d; } },
  set(k, v){ try{ localStorage.setItem(k, JSON.stringify(v)); }catch(e){} }
};
function toast(msg, err=false){
  const t = $('toast'); t.textContent = msg; t.className = 'toast show' + (err ? ' err' : '');
  clearTimeout(t._t); t._t = setTimeout(()=> t.classList.remove('show'), 2400);
}
function digits(v){ return String(v || '').replace(/[٠-٩]/g, d => '٠١٢٣٤٥٦٧٨٩'.indexOf(d)).replace(/[۰-۹]/g, d => '۰۱۲۳۴۵۶۷۸۹'.indexOf(d)); }
/* رقم سعودي أو دولي → صيغة دولية بدون + */
function intlNumber(v){
  let n = digits(v).replace(/[^\d+]/g, '');
  if(n.startsWith('+')) n = n.slice(1);
  else if(n.startsWith('00')) n = n.slice(2);
  else if(/^05\d{8}$/.test(n)) n = '966' + n.slice(1);
  else if(/^5\d{8}$/.test(n)) n = '966' + n;
  return n;
}

/* ============ الأنواع ============ */
const wifiEsc = v => String(v).replace(/([\\;,":])/g, '\\$1');
const vEsc = v => String(v).replace(/([\\;,])/g, '\\$1').replace(/\n/g, '\\n');
const TYPES = {
  wifi:{ label:'واي فاي', icon:'wifi', fields:[
      {k:'ssid', l:'اسم الشبكة', req:true},
      {k:'pass', l:'كلمة المرور', type:'password'},
      {k:'sec', l:'نوع الحماية', type:'select', opts:[['WPA','WPA / WPA2 / WPA3'],['WEP','WEP'],['nopass','بدون كلمة مرور']]},
      {k:'hidden', l:'الشبكة مخفية', type:'check'}],
    build(v){
      if(!v.ssid) return null;
      if(v.sec !== 'nopass' && !v.pass) return {err:'اكتب كلمة المرور أو اختر «بدون كلمة مرور».'};
      return `WIFI:T:${v.sec || 'WPA'};S:${wifiEsc(v.ssid)};${v.sec === 'nopass' ? '' : 'P:' + wifiEsc(v.pass) + ';'}${v.hidden ? 'H:true;' : ''};`;
    }, title:v => v.ssid, caption:'امسح للاتصال بالشبكة' },
  url:{ label:'رابط', icon:'url', fields:[{k:'url', l:'الرابط', ph:'example.com', ltr:true, req:true, inputmode:'url'}],
    build(v){ if(!v.url) return null; let u = v.url.trim(); if(!/^[a-z][a-z0-9+.-]*:/i.test(u)) u = 'https://' + u; return u; },
    title:v => v.url, caption:'امسح لفتح الرابط' },
  contact:{ label:'جهة اتصال', icon:'contact', fields:[
      {k:'name', l:'الاسم', req:true}, {k:'phone', l:'رقم الجوال', ltr:true, inputmode:'tel', ph:'0501234567'},
      {k:'email', l:'البريد الإلكتروني', ltr:true, inputmode:'email', half:true}, {k:'org', l:'جهة العمل', half:true},
      {k:'title', l:'المسمى الوظيفي', half:true}, {k:'web', l:'الموقع', ltr:true, half:true}],
    build(v){
      if(!v.name) return null;
      if(!v.phone && !v.email) return {err:'أضف رقم جوال أو بريداً إلكترونياً.'};
      const parts = v.name.trim().split(/\s+/), last = parts.length > 1 ? parts.pop() : '', first = parts.join(' ');
      const L = ['BEGIN:VCARD','VERSION:3.0',`N:${vEsc(last)};${vEsc(first)};;;`,`FN:${vEsc(v.name.trim())}`];
      if(v.phone) L.push(`TEL;TYPE=CELL:+${intlNumber(v.phone)}`);
      if(v.email) L.push(`EMAIL:${vEsc(v.email.trim())}`);
      if(v.org) L.push(`ORG:${vEsc(v.org)}`);
      if(v.title) L.push(`TITLE:${vEsc(v.title)}`);
      if(v.web) L.push(`URL:${vEsc(v.web.trim())}`);
      L.push('END:VCARD');
      return L.join('\n');
    }, title:v => v.name, caption:'امسح لحفظ جهة الاتصال' },
  whatsapp:{ label:'واتساب', icon:'whatsapp', fields:[
      {k:'phone', l:'رقم الواتساب', ltr:true, inputmode:'tel', ph:'0501234567', req:true},
      {k:'msg', l:'رسالة جاهزة (اختياري)', type:'textarea'}],
    build(v){ if(!v.phone) return null; const n = intlNumber(v.phone); if(n.length < 8) return {err:'رقم الجوال غير صحيح.'};
      return `https://wa.me/${n}${v.msg ? '?text=' + encodeURIComponent(v.msg) : ''}`; },
    title:v => v.phone, caption:'امسح لمراسلتنا على واتساب' },
  phone:{ label:'اتصال', icon:'phone', fields:[{k:'phone', l:'رقم الهاتف', ltr:true, inputmode:'tel', ph:'0501234567', req:true}],
    build(v){ if(!v.phone) return null; return `tel:+${intlNumber(v.phone)}`; }, title:v => v.phone, caption:'امسح للاتصال' },
  sms:{ label:'رسالة SMS', icon:'sms', fields:[
      {k:'phone', l:'رقم الجوال', ltr:true, inputmode:'tel', ph:'0501234567', req:true}, {k:'msg', l:'نص الرسالة', type:'textarea'}],
    build(v){ if(!v.phone) return null; return `SMSTO:+${intlNumber(v.phone)}:${v.msg || ''}`; }, title:v => v.phone, caption:'امسح لإرسال رسالة' },
  email:{ label:'بريد', icon:'email', fields:[
      {k:'to', l:'البريد الإلكتروني', ltr:true, inputmode:'email', req:true}, {k:'subject', l:'الموضوع'}, {k:'body', l:'نص الرسالة', type:'textarea'}],
    build(v){ if(!v.to) return null; const q = [];
      if(v.subject) q.push('subject=' + encodeURIComponent(v.subject)); if(v.body) q.push('body=' + encodeURIComponent(v.body));
      return `mailto:${v.to.trim()}${q.length ? '?' + q.join('&') : ''}`; }, title:v => v.to, caption:'امسح لمراسلتنا' },
  geo:{ label:'موقع', icon:'geo', fields:[
      {k:'loc', l:'رابط خرائط Google أو الإحداثيات', ltr:true, ph:'24.7136, 46.6753', req:true, help:'الصق رابط الموقع أو الإحداثيات، أو استخدم موقعك الحالي.'},
      {k:'here', type:'button', l:'استخدام موقعي الحالي'}],
    build(v){
      if(!v.loc) return null;
      const s = digits(v.loc).trim();
      const m = s.match(/(-?\d{1,2}\.\d+)\s*[, ]\s*(-?\d{1,3}\.\d+)/) || s.match(/@(-?\d{1,2}\.\d+),(-?\d{1,3}\.\d+)/);
      if(m) return `https://maps.google.com/?q=${m[1]},${m[2]}`;
      if(/^https?:\/\//i.test(s)) return s;
      return {err:'الصق رابط موقع صحيحاً أو إحداثيات مثل 24.7136, 46.6753'};
    }, title:v => v.loc, caption:'امسح لفتح الموقع' },
  text:{ label:'نص', icon:'text', fields:[{k:'text', l:'النص', type:'textarea', req:true}],
    build(v){ return v.text ? v.text : null; }, title:v => v.text, caption:'' }
};

/* ============ الحالة ============ */
const DEFAULT_STYLE = { fg:'#11211F', bg:'#FFFFFF', dots:'square', eyes:'square', logo:'', caption:'', frame:false };
const S = {
  type: LS.get('qr_type', 'wifi'),
  values: LS.get('qr_values', {}),
  style: { ...DEFAULT_STYLE, ...LS.get('qr_style', {}) },
  content:'', tab:'make'
};
if(!TYPES[S.type]) S.type = 'wifi';

/* ============ رسم الرمز ============ */
function eyeAt(r, c, n){ return (r < 7 && c < 7) || (r < 7 && c >= n-7) || (r >= n-7 && c < 7); }
function geometry(content, style){
  const level = style.logo ? 'H' : 'M';
  const q = QREngine.make(content, level);
  const n = q.size, margin = 4, total = n + margin*2;
  const logoN = style.logo ? Math.floor(n * 0.24 / 2) * 2 + 1 : 0; // عدد الوحدات المغطاة بالشعار
  const lo = (n - logoN) / 2;
  const cells = [];
  for(let r=0; r<n; r++) for(let c=0; c<n; c++){
    if(!q.isDark(r, c) || eyeAt(r, c, n)) continue;
    if(logoN && r >= lo - 1 && r < lo + logoN + 1 && c >= lo - 1 && c < lo + logoN + 1) continue;
    cells.push([r, c]);
  }
  const eyes = [[0,0],[0,n-7],[n-7,0]];
  return {n, margin, total, cells, eyes, logoN, lo};
}
/* يعيد SVG كاملاً (مع الإطار والنص إن وجد) */
function buildSvg(content, style, opts={}){
  const g = geometry(content, style), u = 10, m = g.margin;
  const qrSize = g.total * u;
  const hasCap = !!(style.caption || '').trim(), framed = style.frame;
  const capH = hasCap ? 64 : 0, pad = framed ? 28 : 0;
  const W = qrSize + pad*2, H = qrSize + pad*2 + capH + (framed && hasCap ? 6 : 0);
  const fg = style.fg, bg = style.bg;
  const X = c => pad + (m + c) * u, Y = r => pad + (m + r) * u;
  let body = '';
  for(const [r,c] of g.cells){
    if(style.dots === 'dots') body += `<circle cx="${X(c)+u/2}" cy="${Y(r)+u/2}" r="${u*0.44}"/>`;
    else if(style.dots === 'rounded') body += `<rect x="${X(c)+0.4}" y="${Y(r)+0.4}" width="${u-0.8}" height="${u-0.8}" rx="${u*0.32}"/>`;
    else body += `<rect x="${X(c)}" y="${Y(r)}" width="${u+0.05}" height="${u+0.05}"/>`;
  }
  let eyes = '';
  const rr = style.eyes === 'rounded' ? [u*2.2, u*1.1] : style.eyes === 'circle' ? [u*3.5, u*1.5] : [0, 0];
  for(const [r,c] of g.eyes){
    const x = X(c), y = Y(r);
    eyes += `<path fill-rule="evenodd" d="${roundRectPath(x, y, 7*u, 7*u, rr[0])} ${roundRectPath(x+u, y+u, 5*u, 5*u, Math.max(rr[0]-u, 0))}"/>`;
    eyes += `<rect x="${x+2*u}" y="${y+2*u}" width="${3*u}" height="${3*u}" rx="${rr[1]}"/>`;
  }
  let logo = '';
  if(style.logo && g.logoN){
    const lx = X(g.lo), ly = Y(g.lo), ls = g.logoN * u;
    logo = `<rect x="${lx - u*0.6}" y="${ly - u*0.6}" width="${ls + u*1.2}" height="${ls + u*1.2}" rx="${u*1.6}" fill="${bg}"/>
      <image href="${style.logo}" x="${lx}" y="${ly}" width="${ls}" height="${ls}" preserveAspectRatio="xMidYMid slice" clip-path="url(#lc)"/>`;
  }
  const frameRect = framed ? `<rect x="1.5" y="1.5" width="${W-3}" height="${H-3}" rx="28" fill="${bg}" stroke="${fg}" stroke-width="3"/>` :
    `<rect width="${W}" height="${H}" fill="${bg}" rx="${opts.rounded ? 16 : 0}"/>`;
  const cap = hasCap ? `<text x="${W/2}" y="${pad + qrSize + capH/2 - (framed ? 4 : 10)}" text-anchor="middle" dominant-baseline="middle" direction="rtl"
      font-family="-apple-system,'SF Arabic','Geeza Pro',Tahoma,sans-serif" font-size="30" font-weight="700" fill="${fg}">${esc(style.caption.trim())}</text>` : '';
  const lc = style.logo && g.logoN ? `<defs><clipPath id="lc"><rect x="${X(g.lo)}" y="${Y(g.lo)}" width="${g.logoN*u}" height="${g.logoN*u}" rx="${u*1.2}"/></clipPath></defs>` : '';
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img" aria-label="رمز QR">${lc}${frameRect}<g fill="${fg}">${body}${eyes}</g>${logo}${cap}</svg>`;
}
function roundRectPath(x, y, w, h, r){
  r = Math.min(r, w/2, h/2);
  if(!r) return `M${x} ${y}h${w}v${h}h${-w}z`;
  return `M${x+r} ${y}h${w-2*r}a${r} ${r} 0 0 1 ${r} ${r}v${h-2*r}a${r} ${r} 0 0 1 ${-r} ${r}h${-(w-2*r)}a${r} ${r} 0 0 1 ${-r} ${-r}v${-(h-2*r)}a${r} ${r} 0 0 1 ${r} ${-r}z`;
}
function svgToPngBlob(svg, scale=3){
  return new Promise((resolve, reject)=>{
    const m = svg.match(/viewBox="0 0 ([\d.]+) ([\d.]+)"/);
    const W = +m[1], H = +m[2];
    const img = new Image();
    img.onload = ()=>{
      const cv = document.createElement('canvas');
      cv.width = Math.round(W * scale); cv.height = Math.round(H * scale);
      const ctx = cv.getContext('2d');
      ctx.drawImage(img, 0, 0, cv.width, cv.height);
      cv.toBlob(b => b ? resolve(b) : reject(new Error('png')), 'image/png');
    };
    img.onerror = reject;
    img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
  });
}
/* تباين الألوان */
function lum(hex){
  const v = hex.replace('#',''); const rgb = [0,2,4].map(i => parseInt(v.substr(i,2),16)/255).map(c => c <= .03928 ? c/12.92 : Math.pow((c+.055)/1.055, 2.4));
  return .2126*rgb[0] + .7152*rgb[1] + .0722*rgb[2];
}
function contrast(a, b){ const x = lum(a), y = lum(b); return (Math.max(x,y)+.05)/(Math.min(x,y)+.05); }

/* ============ واجهة الإنشاء ============ */
function renderTypes(){
  $('types').innerHTML = Object.entries(TYPES).map(([k,t]) =>
    `<button type="button" role="tab" class="type ${k === S.type ? 'on' : ''}" data-t="${k}" aria-selected="${k === S.type}"><svg class="ico"><use href="#t-${t.icon}"/></svg>${t.label}</button>`).join('');
}
function renderForm(){
  const t = TYPES[S.type], v = S.values[S.type] || {};
  let html = '', halfOpen = false;
  const close = ()=>{ if(halfOpen){ html += '</div>'; halfOpen = false; } };
  for(const f of t.fields){
    const id = `f_${f.k}`, val = v[f.k] ?? '';
    if(f.half && !halfOpen){ html += '<div class="row2">'; halfOpen = true; } else if(!f.half) close();
    if(f.type === 'select'){
      html += `<label class="field"><span>${f.l}</span><select class="input" id="${id}" data-k="${f.k}">${f.opts.map(([a,b]) => `<option value="${a}" ${val === a ? 'selected' : ''}>${b}</option>`).join('')}</select></label>`;
    }else if(f.type === 'check'){
      html += `<label class="check"><input type="checkbox" id="${id}" data-k="${f.k}" ${val ? 'checked' : ''}>${f.l}</label>`;
    }else if(f.type === 'textarea'){
      html += `<label class="field"><span>${f.l}</span><textarea class="input" id="${id}" data-k="${f.k}" placeholder="${esc(f.ph || '')}">${esc(val)}</textarea></label>`;
    }else if(f.type === 'button'){
      html += `<button type="button" class="btn btn-soft" data-act="${f.k}"><svg class="ico"><use href="#t-geo"/></svg>${f.l}</button>`;
    }else if(f.type === 'password'){
      html += `<label class="field"><span>${f.l}</span><div class="pw"><input class="input" type="password" id="${id}" data-k="${f.k}" value="${esc(val)}" autocomplete="off" dir="ltr"><button type="button" data-act="togglepw" aria-label="إظهار كلمة المرور"><svg class="ico"><use href="#i-eye"/></svg></button></div></label>`;
    }else{
      html += `<label class="field"><span>${f.l}</span><input class="input ${f.ltr ? 'ltr' : ''}" id="${id}" data-k="${f.k}" value="${esc(val)}" placeholder="${esc(f.ph || '')}" ${f.inputmode ? `inputmode="${f.inputmode}"` : ''} ${f.ltr ? 'dir="ltr"' : ''}>${f.help ? `<small>${f.help}</small>` : ''}</label>`;
    }
  }
  close();
  $('form').innerHTML = html;
}
function readValues(){
  const v = {};
  $('form').querySelectorAll('[data-k]').forEach(el => v[el.dataset.k] = el.type === 'checkbox' ? el.checked : el.value);
  S.values[S.type] = v;
  LS.set('qr_values', S.values);
  return v;
}
let _rt = 0;
function update(){
  cancelAnimationFrame(_rt);
  _rt = requestAnimationFrame(()=>{
    const v = readValues();
    const out = TYPES[S.type].build(v);
    const box = $('qrbox'), warn = $('warn');
    warn.hidden = true;
    if(!out || out.err){
      S.content = '';
      box.innerHTML = `<div class="empty"><svg class="ico"><use href="#t-${TYPES[S.type].icon}"/></svg><p>${out?.err ? esc(out.err) : 'املأ البيانات وسيظهر الرمز هنا مباشرة.'}</p></div>`;
      $('hint').textContent = ''; $('payload').hidden = true;
      setActions(false); return;
    }
    S.content = out;
    try{
      box.innerHTML = buildSvg(out, S.style, {rounded:true});
    }catch(e){
      box.innerHTML = `<div class="empty"><p>المحتوى طويل جداً لرمز واحد. اختصر النص.</p></div>`;
      S.content = ''; setActions(false); return;
    }
    box.classList.toggle('framed', S.style.frame || !!S.style.caption);
    const c = contrast(S.style.fg, S.style.bg);
    if(c < 3 || lum(S.style.fg) > lum(S.style.bg)){
      warn.hidden = false;
      warn.textContent = c < 3 ? 'التباين بين اللونين ضعيف، وقد لا تقرأ الكاميرا الرمز. اختر لوناً أغمق للرمز.' : 'الرمز أفتح من الخلفية؛ بعض الكاميرات لا تقرأ الألوان المعكوسة.';
    }
    $('hint').textContent = 'جرّبه بكاميرا الجوال قبل الطباعة.';
    $('payload').hidden = false; $('payload').textContent = out;
    setActions(true);
  });
}
function setActions(on){ ['shareBtn','pngBtn','svgBtn'].forEach(id => $(id).disabled = !on); }

$('types').addEventListener('click', e=>{
  const b = e.target.closest('[data-t]'); if(!b) return;
  S.type = b.dataset.t; LS.set('qr_type', S.type);
  renderTypes(); renderForm(); update();
  b.scrollIntoView({inline:'nearest', block:'nearest'});
});
$('form').addEventListener('input', update);
$('form').addEventListener('change', update);
$('form').addEventListener('click', e=>{
  const b = e.target.closest('[data-act]'); if(!b) return;
  if(b.dataset.act === 'togglepw'){
    const i = b.parentElement.querySelector('input'); i.type = i.type === 'password' ? 'text' : 'password';
  }else if(b.dataset.act === 'here'){
    if(!navigator.geolocation){ toast('المتصفح لا يدعم تحديد الموقع', true); return; }
    b.disabled = true;
    navigator.geolocation.getCurrentPosition(p=>{
      b.disabled = false;
      $('f_loc').value = `${p.coords.latitude.toFixed(6)}, ${p.coords.longitude.toFixed(6)}`; update();
    }, err=>{ b.disabled = false; toast(err.code === 1 ? 'لم تسمح باستخدام الموقع' : 'تعذر تحديد الموقع', true); }, {enableHighAccuracy:true, timeout:12000});
  }
});

/* ============ التخصيص ============ */
const FG = ['#11211F','#0F766E','#1D4ED8','#7C2D12','#6D28D9','#B91C1C'];
const BG = ['#FFFFFF','#F5F1E8','#ECFDF5','#EFF6FF','#FEF3C7'];
function swatches(el, list, key){
  el.innerHTML = list.map(c => `<button type="button" class="sw ${S.style[key].toLowerCase() === c.toLowerCase() ? 'on' : ''}" style="background:${c}" data-c="${c}" aria-label="لون ${c}"></button>`).join('')
    + `<label class="sw-pick" title="لون آخر"><input type="color" value="${S.style[key]}" data-pick="${key}" aria-label="اختيار لون آخر"></label>`;
}
function demo(kind){
  if(kind === 'dots') return '<svg class="demo" viewBox="0 0 18 18"><circle cx="4" cy="4" r="3"/><circle cx="14" cy="4" r="3"/><circle cx="4" cy="14" r="3"/><circle cx="14" cy="14" r="3"/></svg>';
  if(kind === 'rounded') return '<svg class="demo" viewBox="0 0 18 18"><rect x="1" y="1" width="7" height="7" rx="2.5"/><rect x="10" y="1" width="7" height="7" rx="2.5"/><rect x="1" y="10" width="7" height="7" rx="2.5"/><rect x="10" y="10" width="7" height="7" rx="2.5"/></svg>';
  return '<svg class="demo" viewBox="0 0 18 18"><rect x="1" y="1" width="7" height="7"/><rect x="10" y="1" width="7" height="7"/><rect x="1" y="10" width="7" height="7"/><rect x="10" y="10" width="7" height="7"/></svg>';
}
function renderCustom(){
  swatches($('fgSw'), FG, 'fg'); swatches($('bgSw'), BG, 'bg');
  $('dotChips').innerHTML = [['square','مربعة'],['rounded','ناعمة'],['dots','دائرية']].map(([k,l]) => `<button type="button" class="chip ${S.style.dots === k ? 'on' : ''}" data-dots="${k}">${demo(k)}${l}</button>`).join('');
  $('eyeChips').innerHTML = [['square','مربعة'],['rounded','ناعمة'],['circle','دائرية']].map(([k,l]) => `<button type="button" class="chip ${S.style.eyes === k ? 'on' : ''}" data-eyes="${k}">${l}</button>`).join('');
  $('caption').value = S.style.caption || '';
  $('frame').checked = !!S.style.frame;
  $('logoThumb').hidden = !S.style.logo; if(S.style.logo) $('logoThumb').src = S.style.logo;
  $('logoRemove').hidden = !S.style.logo;
  $('logoBtnTxt').textContent = S.style.logo ? 'تغيير الصورة' : 'اختيار صورة';
}
function saveStyle(){ LS.set('qr_style', S.style); renderCustom(); update(); }
$('custom').addEventListener('click', e=>{
  const sw = e.target.closest('[data-c]');
  if(sw){ const key = sw.parentElement.id === 'fgSw' ? 'fg' : 'bg'; S.style[key] = sw.dataset.c; return saveStyle(); }
  const d = e.target.closest('[data-dots]'); if(d){ S.style.dots = d.dataset.dots; return saveStyle(); }
  const y = e.target.closest('[data-eyes]'); if(y){ S.style.eyes = y.dataset.eyes; return saveStyle(); }
});
$('custom').addEventListener('input', e=>{
  if(e.target.dataset.pick){ S.style[e.target.dataset.pick] = e.target.value; LS.set('qr_style', S.style); update(); }
  if(e.target.id === 'caption'){ S.style.caption = e.target.value; LS.set('qr_style', S.style); update(); }
});
$('custom').addEventListener('change', e=>{
  if(e.target.dataset.pick) renderCustom();
  if(e.target.id === 'frame'){ S.style.frame = e.target.checked; saveStyle(); }
});
$('logoInput').addEventListener('change', async e=>{
  const f = e.target.files[0]; e.target.value = '';
  if(!f) return;
  try{ S.style.logo = await shrinkImage(f, 240); saveStyle(); toast('أُضيف الشعار. جرّب قراءة الرمز بالكاميرا.'); }
  catch(err){ toast('تعذر قراءة الصورة', true); }
});
$('logoRemove').addEventListener('click', ()=>{ S.style.logo = ''; saveStyle(); });
function shrinkImage(file, max){
  return new Promise((res, rej)=>{
    const img = new Image(), url = URL.createObjectURL(file);
    img.onload = ()=>{
      const s = Math.min(1, max / Math.max(img.width, img.height));
      const cv = document.createElement('canvas'); cv.width = Math.round(img.width*s); cv.height = Math.round(img.height*s);
      cv.getContext('2d').drawImage(img, 0, 0, cv.width, cv.height); URL.revokeObjectURL(url);
      res(cv.toDataURL('image/png'));
    };
    img.onerror = ()=>{ URL.revokeObjectURL(url); rej(); };
    img.src = url;
  });
}
/* كاميرا الآيفون تحفظ الصور بصيغة HEIC أحياناً؛ المتصفح يحولها تلقائياً عند الاختيار */

/* ============ التنزيل والمشاركة ============ */
function fileBase(){ const t = TYPES[S.type].title(S.values[S.type] || {}) || 'qr'; return 'QR-' + String(t).replace(/[\\/:*?"<>|\s]+/g, '-').slice(0, 40); }
function download(blob, name){
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name;
  document.body.appendChild(a); a.click(); a.remove(); setTimeout(()=> URL.revokeObjectURL(a.href), 4000);
}
function currentSvg(){ return buildSvg(S.content, S.style); }
$('pngBtn').addEventListener('click', async ()=>{
  if(!S.content) return;
  try{ download(await svgToPngBlob(currentSvg()), fileBase() + '.png'); addHistory(); toast('تم تنزيل الصورة'); }
  catch(e){ toast('تعذر إنشاء الصورة', true); }
});
$('svgBtn').addEventListener('click', ()=>{
  if(!S.content) return;
  download(new Blob([currentSvg()], {type:'image/svg+xml'}), fileBase() + '.svg'); addHistory(); toast('تم تنزيل ملف SVG');
});
$('shareBtn').addEventListener('click', async ()=>{
  if(!S.content) return;
  try{
    const blob = await svgToPngBlob(currentSvg());
    const file = new File([blob], fileBase() + '.png', {type:'image/png'});
    if(navigator.canShare && navigator.canShare({files:[file]})){
      await navigator.share({files:[file], title:'رمز QR'});
      addHistory();
    }else{ download(blob, file.name); addHistory(); toast('المشاركة غير مدعومة هنا، فنزّلنا الصورة'); }
  }catch(e){ if(e.name !== 'AbortError') toast('تعذرت المشاركة', true); }
});

/* ============ السجل ============ */
function addHistory(){
  const h = LS.get('qr_history', []);
  const item = { id:Date.now(), type:S.type, values:S.values[S.type], style:{...S.style, logo:S.style.logo ? S.style.logo : ''}, content:S.content, at:new Date().toISOString() };
  const filtered = h.filter(x => !(x.content === item.content && x.type === item.type));
  filtered.unshift(item);
  // الشعار قد يكون كبيراً؛ نحتفظ بآخر 20 فقط
  let list = filtered.slice(0, 20);
  try{ localStorage.setItem('qr_history', JSON.stringify(list)); }
  catch(e){ list = list.map(x => ({...x, style:{...x.style, logo:''}})); LS.set('qr_history', list); }
}
function renderHistory(){
  const h = LS.get('qr_history', []);
  $('histClear').hidden = !h.length;
  $('hist').innerHTML = h.length ? h.map(x => {
    let thumb = '';
    try{ thumb = buildSvg(x.content, {...x.style, caption:'', frame:false}); }catch(e){}
    const t = TYPES[x.type] || TYPES.text;
    const label = t.title(x.values || {}) || x.content;
    const d = new Date(x.at);
    return `<div class="h-item"><div class="h-thumb">${thumb}</div>
      <button type="button" class="h-main" data-open="${x.id}"><b>${esc(label)}</b><small>${t.label} · ${d.toLocaleDateString('ar-SA-u-ca-gregory-nu-latn', {day:'numeric', month:'long'})}</small></button>
      <button type="button" class="h-del" data-del="${x.id}" aria-label="حذف"><svg class="ico"><use href="#i-trash"/></svg></button></div>`;
  }).join('') : `<div class="empty"><svg class="ico"><use href="#i-clock"/></svg><p>لا يوجد شيء بعد. الرموز التي تنزّلها أو تشاركها تظهر هنا.</p></div>`;
}
$('hist').addEventListener('click', e=>{
  const o = e.target.closest('[data-open]'), d = e.target.closest('[data-del]');
  const h = LS.get('qr_history', []);
  if(d){ LS.set('qr_history', h.filter(x => x.id !== +d.dataset.del)); renderHistory(); return; }
  if(o){
    const x = h.find(i => i.id === +o.dataset.open); if(!x) return;
    S.type = x.type; S.values[x.type] = x.values; S.style = {...DEFAULT_STYLE, ...x.style};
    LS.set('qr_type', S.type); LS.set('qr_values', S.values); LS.set('qr_style', S.style);
    renderTypes(); renderForm(); renderCustom(); update(); setTab('make');
  }
});
$('histClear').addEventListener('click', ()=>{ if(confirmClear()){ LS.set('qr_history', []); renderHistory(); } });
function confirmClear(){ return window.confirm('مسح كل السجل من هذا الجهاز؟'); }

/* ============ القراءة ============ */
let stream = null, scanning = false, detector = null;
const JSQR_URL = 'https://cdn.jsdelivr.net/npm/jsqr@1.4.0/dist/jsQR.js';
function loadJsQR(){
  if(window.jsQR) return Promise.resolve();
  return new Promise((res, rej)=>{ const s = document.createElement('script'); s.src = JSQR_URL; s.onload = res; s.onerror = rej; document.head.appendChild(s); });
}
async function getDecoder(){
  if('BarcodeDetector' in window){
    try{ const f = await BarcodeDetector.getSupportedFormats(); if(f.includes('qr_code')){ detector = detector || new BarcodeDetector({formats:['qr_code']}); return 'native'; } }catch(e){}
  }
  await loadJsQR();
  return 'js';
}
async function decodeFrom(source, w, h){
  const kind = await getDecoder();
  if(kind === 'native'){
    const r = await detector.detect(source);
    return r[0]?.rawValue || null;
  }
  const cv = decodeFrom._cv || (decodeFrom._cv = document.createElement('canvas'));
  const scale = Math.min(1, 900 / Math.max(w, h));
  cv.width = Math.round(w*scale); cv.height = Math.round(h*scale);
  const ctx = cv.getContext('2d', {willReadFrequently:true});
  ctx.drawImage(source, 0, 0, cv.width, cv.height);
  const d = ctx.getImageData(0, 0, cv.width, cv.height);
  const r = jsQR(d.data, d.width, d.height, {inversionAttempts:'attemptBoth'});
  return r ? r.data : null;
}
async function startCam(){
  try{
    await getDecoder();
  }catch(e){ toast('تعذر تحميل قارئ الرموز. تحقق من الإنترنت.', true); return; }
  try{
    stream = await navigator.mediaDevices.getUserMedia({video:{facingMode:'environment'}, audio:false});
  }catch(e){ toast(e.name === 'NotAllowedError' ? 'لم تسمح باستخدام الكاميرا. فعّلها من إعدادات Safari.' : 'تعذر تشغيل الكاميرا', true); return; }
  const v = $('video'); v.srcObject = stream; await v.play().catch(()=>{});
  $('scanView').hidden = false; $('scanIdle').hidden = true; $('scanResult').hidden = true;
  $('camBtn').innerHTML = '<svg class="ico"><use href="#i-camera"/></svg>إيقاف الكاميرا';
  scanning = true; loop();
}
function stopCam(){
  scanning = false;
  stream?.getTracks().forEach(t => t.stop()); stream = null;
  $('scanView').hidden = true;
  $('camBtn').innerHTML = '<svg class="ico"><use href="#i-camera"/></svg>تشغيل الكاميرا';
}
async function loop(){
  if(!scanning) return;
  const v = $('video');
  if(v.readyState >= 2){
    try{
      const txt = await decodeFrom(v, v.videoWidth, v.videoHeight);
      if(txt){ stopCam(); navigator.vibrate?.(60); showResult(txt); return; }
    }catch(e){}
  }
  setTimeout(()=> requestAnimationFrame(loop), 120);
}
$('camBtn').addEventListener('click', ()=> scanning ? stopCam() : startCam());
$('scanFile').addEventListener('change', async e=>{
  const f = e.target.files[0]; e.target.value = ''; if(!f) return;
  stopCam();
  try{
    const img = await new Promise((res, rej)=>{ const i = new Image(); i.onload = ()=> res(i); i.onerror = rej; i.src = URL.createObjectURL(f); });
    const txt = await decodeFrom(img, img.naturalWidth, img.naturalHeight);
    if(txt) showResult(txt); else toast('لم نجد رمز QR واضحاً في الصورة', true);
  }catch(err){ toast('تعذرت قراءة الصورة. تحقق من الإنترنت.', true); }
});
function parseContent(t){
  if(/^WIFI:/i.test(t)){
    const get = k => { const m = t.match(new RegExp(`[:;]${k}:((?:\\\\.|[^;])*)`)); return m ? m[1].replace(/\\(.)/g, '$1') : ''; };
    return {kind:'واي فاي', rows:[['الشبكة', get('S'), true], ['كلمة المرور', get('P') || 'بدون', !!get('P')], ['الحماية', get('T') || '—']]};
  }
  if(/^BEGIN:VCARD/i.test(t)){
    const get = k => (t.match(new RegExp(`^${k}[^:\\n]*:(.*)$`, 'mi')) || [])[1] || '';
    return {kind:'جهة اتصال', rows:[['الاسم', get('FN')], ['الجوال', get('TEL'), true], ['البريد', get('EMAIL'), true], ['الجهة', get('ORG')]].filter(r => r[1]), vcard:true};
  }
  if(/^MECARD:/i.test(t)){
    const get = k => (t.match(new RegExp(`${k}:([^;]*)`)) || [])[1] || '';
    return {kind:'جهة اتصال', rows:[['الاسم', get('N')], ['الجوال', get('TEL'), true]].filter(r => r[1])};
  }
  if(/^tel:/i.test(t)) return {kind:'رقم هاتف', rows:[['الرقم', t.slice(4), true]], open:t, openLabel:'اتصال'};
  if(/^SMSTO:/i.test(t)){ const [, n, ...m] = t.split(':'); return {kind:'رسالة SMS', rows:[['الرقم', n, true], ['الرسالة', m.join(':')]], open:`sms:${n}${m.length ? '&body=' + encodeURIComponent(m.join(':')) : ''}`, openLabel:'فتح الرسائل'}; }
  if(/^mailto:/i.test(t)) return {kind:'بريد إلكتروني', rows:[['إلى', t.slice(7).split('?')[0], true]], open:t, openLabel:'فتح البريد'};
  if(/^https?:\/\//i.test(t)) return {kind:/wa\.me\//.test(t) ? 'واتساب' : /maps\.google|goo\.gl\/maps|maps\.apple/.test(t) ? 'موقع' : 'رابط', rows:[['الرابط', t, true]], open:t, openLabel:'فتح الرابط'};
  return {kind:'نص', rows:[['النص', t, true]]};
}
function showResult(text){
  const p = parseContent(text), box = $('scanResult');
  box.hidden = false; $('scanIdle').hidden = true;
  box.innerHTML = `<h3>${esc(p.kind)}</h3>
    <div>${p.rows.map(([k, v, c], i) => `<div class="kv"><span>${esc(k)}</span><b dir="auto">${esc(v)}</b>${c ? `<button type="button" class="copy" data-copy="${i}" aria-label="نسخ ${esc(k)}"><svg class="ico"><use href="#i-copy"/></svg></button>` : ''}</div>`).join('')}</div>
    <div class="scan-actions">
      ${p.open ? `<a class="btn btn-primary" href="${esc(p.open)}" target="_blank" rel="noopener">${esc(p.openLabel)}</a>` : ''}
      ${p.vcard ? `<button type="button" class="btn btn-primary" data-vcf>حفظ جهة الاتصال</button>` : ''}
      <button type="button" class="btn btn-soft" data-copy="all">نسخ المحتوى كاملاً</button>
      <button type="button" class="btn btn-line" data-again>قراءة رمز آخر</button>
    </div>`;
  box.onclick = async e=>{
    const c = e.target.closest('[data-copy]');
    if(c){ const val = c.dataset.copy === 'all' ? text : p.rows[+c.dataset.copy][1];
      try{ await navigator.clipboard.writeText(val); toast('تم النسخ'); }catch(err){ toast('تعذر النسخ', true); } }
    if(e.target.closest('[data-vcf]')) download(new Blob([text.replace(/\n/g, '\r\n')], {type:'text/vcard'}), 'contact.vcf');
    if(e.target.closest('[data-again]')) startCam();
  };
}

/* ============ التبويبات ============ */
function setTab(t){
  S.tab = t;
  document.querySelectorAll('.tabs button').forEach(b => b.classList.toggle('on', b.dataset.tab === t));
  $('tab-make').hidden = t !== 'make'; $('tab-scan').hidden = t !== 'scan'; $('tab-hist').hidden = t !== 'hist';
  if(t !== 'scan') stopCam();
  if(t === 'hist') renderHistory();
  if(t === 'scan'){ getDecoder().catch(()=>{}); }
}
document.querySelector('.tabs').addEventListener('click', e=>{ const b = e.target.closest('[data-tab]'); if(b) setTab(b.dataset.tab); });
document.addEventListener('visibilitychange', ()=>{ if(document.hidden) stopCam(); });

/* التشغيل */
renderTypes(); renderForm(); renderCustom(); update();
