window.BILLING_BACKEND_URL = '';
window.BILLING_APP_VERSION = '2.1.4';

window.addEventListener('load',()=>{
  const fmt=n=>(Number(n)||0).toLocaleString('vi-VN')+' đồng';

  /* ===== Chính sách chuẩn =====
     - Học đủ tháng: 100% học phí + 100% DV bổ sung
     - Học 1/2 tháng: 50% học phí + 100% DV bổ sung
     - Con GV đủ tháng: 50% học phí + 100% DV bổ sung
     - Con GV 1/2 tháng: 25% học phí + 100% DV bổ sung
     Con giáo viên là tập con của nhóm đủ tháng / 1/2 tháng, không cộng thêm vào sĩ số.
  */
  window.makeRules=function(s){
    const tuition=Number(s?.fullTuition)||0;
    const service=Number(s?.fullService)||0;
    return [
      {code:'FULL_MONTH',name:'Học đủ tháng',source:'full_non_teacher',tuition,service},
      {code:'HALF_MONTH',name:'Học 1/2 tháng',source:'half_non_teacher',tuition:Math.round(tuition/2),service},
      {code:'TEACHER_CHILD_FULL',name:'Con giáo viên học đủ tháng',source:'teacherFull',tuition:Math.round(tuition/2),service},
      {code:'TEACHER_CHILD_HALF',name:'Con giáo viên học 1/2 tháng',source:'teacherHalf',tuition:Math.round(tuition/4),service}
    ];
  };

  window.qtyFor=function(rule){
    const t=rows.reduce((a,r)=>{
      a.full+=Number(r.full)||0;
      a.half+=Number(r.half)||0;
      a.teacherFull+=Number(r.teacherFull)||0;
      a.teacherHalf+=Number(r.teacherHalf)||0;
      return a;
    },{full:0,half:0,teacherFull:0,teacherHalf:0});
    if(rule.source==='full_non_teacher') return Math.max(0,t.full-t.teacherFull);
    if(rule.source==='half_non_teacher') return Math.max(0,t.half-t.teacherHalf);
    if(rule.source==='teacherFull') return t.teacherFull;
    if(rule.source==='teacherHalf') return t.teacherHalf;
    if(rule.source==='full') return t.full;
    return Number(rule.manualQty)||0;
  };

  window.amountRow=function(r){
    let sum=0;
    for(const p of rules){
      let q=0;
      if(p.source==='full_non_teacher') q=Math.max(0,(Number(r.full)||0)-(Number(r.teacherFull)||0));
      else if(p.source==='half_non_teacher') q=Math.max(0,(Number(r.half)||0)-(Number(r.teacherHalf)||0));
      else if(p.source==='teacherFull') q=Number(r.teacherFull)||0;
      else if(p.source==='teacherHalf') q=Number(r.teacherHalf)||0;
      else if(p.source==='full') q=Number(r.full)||0;
      sum+=q*((Number(p.tuition)||0)+(Number(p.service)||0));
    }
    return sum;
  };

  window.addRow=function(r={cls:'',size:0,full:0,half:0,absent:0,teacherFull:0,teacherHalf:0,note:''}){
    rows.push({...r,teacherFull:Number(r.teacherFull)||0,teacherHalf:Number(r.teacherHalf)||0});
    renderRows();
  };

  window.renderRows=function(){
    $('quantityBody').innerHTML=rows.map((r,i)=>{
      if(r.teacherFull===undefined) r.teacherFull=0;
      if(r.teacherHalf===undefined) r.teacherHalf=0;
      return `<tr>
        <td><input data-r="${i}" data-k="cls" value="${esc(r.cls)}"></td>
        <td><input type="number" min="0" data-r="${i}" data-k="size" value="${Number(r.size)||0}"></td>
        <td><input type="number" min="0" data-r="${i}" data-k="full" value="${Number(r.full)||0}"></td>
        <td><input type="number" min="0" data-r="${i}" data-k="half" value="${Number(r.half)||0}"></td>
        <td><input type="number" min="0" data-r="${i}" data-k="absent" value="${Number(r.absent)||0}"></td>
        <td><input type="number" min="0" data-r="${i}" data-k="teacherFull" value="${Number(r.teacherFull)||0}"></td>
        <td><input type="number" min="0" data-r="${i}" data-k="teacherHalf" value="${Number(r.teacherHalf)||0}"></td>
        <td><input data-r="${i}" data-k="note" value="${esc(r.note)}"></td>
        <td><button class="btn danger" data-delrow="${i}">Xóa</button></td>
      </tr>`;
    }).join('');
    calculate();
  };

  window.validateRows=function(){
    const errs=[];
    rows.forEach((r,i)=>{
      const label=r.cls||'Dòng '+(i+1);
      if((Number(r.full)||0)+(Number(r.half)||0)+(Number(r.absent)||0)!==(Number(r.size)||0)) errs.push(`${label}: sĩ số không cân.`);
      if((Number(r.teacherFull)||0)>(Number(r.full)||0)) errs.push(`${label}: con giáo viên đủ tháng vượt số trẻ học đủ tháng.`);
      if((Number(r.teacherHalf)||0)>(Number(r.half)||0)) errs.push(`${label}: con giáo viên 1/2 tháng vượt số trẻ học 1/2 tháng.`);
    });
    const b=$('validationBox');
    b.className='validation '+(errs.length?'bad':'ok');
    b.textContent=errs.length?errs.join(' '):'Dữ liệu hợp lệ: tất cả các lớp đã cân sĩ số; nhóm con giáo viên là tập con đúng của nhóm học tương ứng.';
    return !errs.length;
  };

  window.renderRules=function(){
    $('policyBody').innerHTML=rules.map((r,i)=>`<tr>
      <td><input data-rule="${i}" data-k="name" value="${esc(r.name)}"></td>
      <td><select data-rule="${i}" data-k="source">
        <option value="full_non_teacher" ${r.source==='full_non_teacher'?'selected':''}>Đủ tháng, không gồm con GV</option>
        <option value="half_non_teacher" ${r.source==='half_non_teacher'?'selected':''}>1/2 tháng, không gồm con GV</option>
        <option value="teacherFull" ${r.source==='teacherFull'?'selected':''}>Con GV đủ tháng</option>
        <option value="teacherHalf" ${r.source==='teacherHalf'?'selected':''}>Con GV 1/2 tháng</option>
        <option value="manual" ${r.source==='manual'?'selected':''}>Nhập tay</option>
      </select>${r.source==='manual'?`<input type="number" min="0" data-rule="${i}" data-k="manualQty" value="${r.manualQty||0}">`:''}</td>
      <td><input type="number" min="0" data-rule="${i}" data-k="tuition" value="${Number(r.tuition)||0}"></td>
      <td><input type="number" min="0" data-rule="${i}" data-k="service" value="${Number(r.service)||0}"></td>
      <td><button class="btn danger" data-delrule="${i}">Xóa</button></td>
    </tr>`).join('');
  };

  window.parseRaw=function(){
    const raw=$('rawInput').value.trim();
    if(!raw) return alert('Chưa có dữ liệu để chuyển.');
    const lines=raw.split(/\r?\n/).map(x=>x.trim()).filter(Boolean);
    const out=[];
    for(const line of lines){
      if(/lớp.*sĩ số/i.test(line)) continue;
      const p=line.includes('|')?line.split('|'):line.split('\t');
      if(p.length<6) continue;
      const vals=p.map(x=>x.trim());
      const num=v=>Number(String(v??'').replace(/[^0-9.-]/g,''))||0;
      if(vals.length>=8){
        out.push({cls:vals[0],size:num(vals[1]),full:num(vals[2]),half:num(vals[3]),absent:num(vals[4]),teacherFull:num(vals[5]),teacherHalf:num(vals[6]),note:vals.slice(7).join(' | ')});
      }else{
        out.push({cls:vals[0],size:num(vals[1]),full:num(vals[2]),half:num(vals[3]),absent:num(vals[4]),teacherFull:0,teacherHalf:num(vals[5]),note:vals.slice(6).join(' | ')});
      }
    }
    if(!out.length) return alert('Không nhận ra bảng. Hãy dùng định dạng có dấu | hoặc TSV theo mẫu hiển thị trên app.');
    rows=out;renderRows();validateRows();calculate();goStep(2);
  };

  window.demo=function(){
    if(!schools.some(s=>s.code==='MNB')) return;
    $('schoolSelect').value='MNB';selectSchool('MNB');$('billMonth').value='2026-08';
    rows=[
      {cls:'A1',size:21,full:21,half:0,absent:0,teacherFull:0,teacherHalf:0,note:'Phiếu ghi có 1 con cô; chưa đủ căn cứ xác định chính sách/nhóm học'},
      {cls:'A2',size:12,full:11,half:1,absent:0,teacherFull:0,teacherHalf:0,note:'Dương Minh Đăng học 1/2 tháng'},
      {cls:'A3',size:1,full:1,half:0,absent:0,teacherFull:0,teacherHalf:0,note:''},
      {cls:'B1',size:13,full:13,half:0,absent:0,teacherFull:0,teacherHalf:0,note:''},
      {cls:'B2',size:17,full:17,half:0,absent:0,teacherFull:0,teacherHalf:0,note:''}
    ];
    renderRows();validateRows();calculate();renderDocs();
  };

  const prompt=document.querySelector('.prompt-box');
  if(prompt) prompt.innerHTML='<b>Định dạng khuyến nghị từ ChatGPT / NotebookLM</b><br>Lớp | Sĩ số | Học đủ tháng | Học 1/2 tháng | Nghỉ cả tháng | Con GV đủ tháng | Con GV 1/2 tháng | Ghi chú';
  const qHead=document.querySelector('#panel2 .data-table thead tr');
  if(qHead) qHead.innerHTML='<th>Lớp</th><th>Sĩ số</th><th>Đủ tháng</th><th>1/2 tháng</th><th>Nghỉ</th><th>Con GV đủ tháng</th><th>Con GV 1/2</th><th>Ghi chú</th><th></th>';
  const lead=document.querySelector('#panel2 .lead');
  if(lead) lead.textContent='Mỗi lớp phải cân: sĩ số = học đủ tháng + học 1/2 tháng + nghỉ cả tháng. Con giáo viên là tập con của nhóm học tương ứng, không được cộng thêm vào sĩ số.';
  if($('demoBtn')) $('demoBtn').textContent='Nạp ví dụ Mầm non B T8/2026';

  if($('parseBtn')) $('parseBtn').onclick=parseRaw;
  if($('demoBtn')) $('demoBtn').onclick=demo;
  if($('validateBtn')) $('validateBtn').onclick=validateRows;

  if(currentSchool){rules=makeRules(currentSchool);renderRules();renderRows();validateRows();calculate();}
  else {renderRows();renderRules();}

  const ruleNote=()=>{
    const normalFull=Array.isArray(rules)?rules.find(r=>r.source==='full_non_teacher'||r.source==='full'):null;
    const tuitionText=normalFull
      ? `${fmt(normalFull.tuition)}/trẻ/tháng + dịch vụ bổ sung ${fmt(normalFull.service)}/trẻ/tháng = ${fmt((Number(normalFull.tuition)||0)+(Number(normalFull.service)||0))}/trẻ/tháng.`
      : 'Theo quy tắc áp dụng của trường.';

    const reductions=Array.isArray(rules)
      ? rules.filter(r=>!['full_non_teacher','full'].includes(r.source)&&r.source!=='manual'&&qtyFor(r)>0)
      : [];

    const reductionLine=reductions.length
      ? `<div><b>Giảm trừ:</b> ${reductions.map(r=>`${r.name}: học phí ${fmt(r.tuition)} + dịch vụ bổ sung ${fmt(r.service)} = ${fmt((Number(r.tuition)||0)+(Number(r.service)||0))}/trẻ`).join('; ')}.</div>`
      : '';

    return `<div style="margin:0 0 10px;font-size:10.5px;line-height:1.5;color:#374151"><div><b>Đơn vị tính:</b> Trẻ/tháng</div><div><b>Học phí:</b> ${tuitionText}</div>${reductionLine}</div>`;
  };

  if(typeof window.footer==='function'){
    window.footer=function(type){return `<div class="footer"><span>Kiro Việt Nam - Hồ sơ thanh toán</span><span>${refCode(type)}</span></div>`;};
  }

  if(typeof window.quantityDoc==='function'){
    const originalQuantityDoc=window.quantityDoc;
    window.quantityDoc=function(){
      let html=originalQuantityDoc();
      const school=currentSchool||{name:'Chưa chọn trường'};
      html=html.replace(/(<h1>BẢNG XÁC ĐỊNH KHỐI LƯỢNG - SỐ LƯỢNG<\/h1>)<p>.*?<\/p>/,`$1<p>${monthText($('billMonth').value)}</p>`);
      html=html.replace('<table class="meta-table"><tr><td>Đơn vị tính</td><td>Trẻ</td></tr>',`<table class="meta-table"><tr><td>Đơn vị</td><td>${esc(school.name)}</td></tr>`);
      html=html.replace('<table class="print-table">',ruleNote()+'<table class="print-table">');
      html=html.replace(/<div class="signature"><div><strong>ĐẠI DIỆN NHÀ TRƯỜNG<\/strong><em>\(Ký, đóng dấu\)<\/em><\/div><div>(.*?)<\/div><\/div>/,`<div class="signature" style="grid-template-columns:1fr"><div style="width:50%;margin-left:auto">$1</div></div>`);
      return html;
    };
  }

  if(typeof window.requestDoc==='function'){
    const originalRequestDoc=window.requestDoc;
    window.requestDoc=function(){
      let html=originalRequestDoc();
      html=html.replace('<table class="print-table">',ruleNote()+'<table class="print-table">');
      html=html.replace(/<div class="signature"><div><strong>ĐẠI DIỆN NHÀ TRƯỜNG<\/strong><em>\(Ký, đóng dấu\)<\/em><\/div><div>(.*?)<\/div><\/div>/,`<div class="signature" style="grid-template-columns:1fr"><div style="width:50%;margin-left:auto">$1</div></div>`);
      return html;
    };
  }

  if(typeof renderDocs==='function') renderDocs();
});