window.BILLING_BACKEND_URL = '';
window.BILLING_APP_VERSION = '2.1.2';

window.addEventListener('load',()=>{
  const fmt=n=>(Number(n)||0).toLocaleString('vi-VN')+' đồng';
  const ruleNote=()=>{
    const full=Array.isArray(rules)?rules.find(r=>r.source==='full'):null;
    const reductions=Array.isArray(rules)?rules.filter(r=>r.source!=='full'):[];
    const tuitionText=full
      ? `${fmt(full.tuition)}/trẻ/tháng + dịch vụ bổ sung ${fmt(full.service)}/trẻ/tháng = ${fmt((Number(full.tuition)||0)+(Number(full.service)||0))}/trẻ/tháng.`
      : 'Theo quy tắc áp dụng của trường.';
    const reductionText=reductions.length
      ? reductions.map(r=>`${r.name}: học phí ${fmt(r.tuition)} + dịch vụ bổ sung ${fmt(r.service)} = ${fmt((Number(r.tuition)||0)+(Number(r.service)||0))}/trẻ`).join('; ')+'.'
      : 'Không có quy tắc giảm trừ riêng.';
    return `<div style="margin:0 0 10px;font-size:10.5px;line-height:1.5;color:#374151"><div><b>Đơn vị tính:</b> Trẻ/tháng</div><div><b>Học phí:</b> ${tuitionText}</div><div><b>Giảm trừ:</b> ${reductionText}</div></div>`;
  };

  /* Chân trang thống nhất cho toàn bộ hồ sơ */
  if(typeof window.footer==='function'){
    window.footer=function(type){
      return `<div class="footer"><span>Kiro Việt Nam - Hồ sơ thanh toán</span><span>${refCode(type)}</span></div>`;
    };
  }

  if(typeof window.quantityDoc==='function'){
    const originalQuantityDoc=window.quantityDoc;
    window.quantityDoc=function(){
      let html=originalQuantityDoc();
      const school=currentSchool||{name:'Chưa chọn trường'};
      /* Dưới tiêu đề chỉ hiển thị tháng/năm */
      html=html.replace(/(<h1>BẢNG XÁC ĐỊNH KHỐI LƯỢNG - SỐ LƯỢNG<\/h1>)<p>.*?<\/p>/,`$1<p>${monthText($('billMonth').value)}</p>`);
      /* Phần thông tin đầu bảng: Đơn vị là tên trường */
      html=html.replace('<table class="meta-table"><tr><td>Đơn vị tính</td><td>Trẻ</td></tr>',`<table class="meta-table"><tr><td>Đơn vị</td><td>${esc(school.name)}</td></tr>`);
      /* Ghi ngắn gọn quy tắc tính trước bảng */
      html=html.replace('<table class="print-table">',ruleNote()+'<table class="print-table">');
      /* Không yêu cầu nhà trường ký/đóng dấu; giữ chữ ký nhà cung cấp */
      html=html.replace(/<div class="signature"><div><strong>ĐẠI DIỆN NHÀ TRƯỜNG<\/strong><em>\(Ký, đóng dấu\)<\/em><\/div><div>(.*?)<\/div><\/div>/,`<div class="signature" style="grid-template-columns:1fr"><div style="width:50%;margin-left:auto">$1</div></div>`);
      return html;
    };
  }

  if(typeof window.requestDoc==='function'){
    const originalRequestDoc=window.requestDoc;
    window.requestDoc=function(){
      let html=originalRequestDoc();
      html=html.replace('<table class="print-table">',ruleNote()+'<table class="print-table">');
      /* Không yêu cầu nhà trường ký/đóng dấu; giữ chữ ký nhà cung cấp */
      html=html.replace(/<div class="signature"><div><strong>ĐẠI DIỆN NHÀ TRƯỜNG<\/strong><em>\(Ký, đóng dấu\)<\/em><\/div><div>(.*?)<\/div><\/div>/,`<div class="signature" style="grid-template-columns:1fr"><div style="width:50%;margin-left:auto">$1</div></div>`);
      return html;
    };
  }

  if(typeof renderDocs==='function') renderDocs();
});
