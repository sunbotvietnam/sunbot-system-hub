window.BILLING_BACKEND_URL = '';
window.BILLING_APP_VERSION = '2.1.1';

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

  if(typeof window.quantityDoc==='function'){
    const originalQuantityDoc=window.quantityDoc;
    window.quantityDoc=function(){
      return originalQuantityDoc().replace('<table class="print-table">',ruleNote()+'<table class="print-table">');
    };
  }
  if(typeof window.requestDoc==='function'){
    const originalRequestDoc=window.requestDoc;
    window.requestDoc=function(){
      return originalRequestDoc().replace('<table class="print-table">',ruleNote()+'<table class="print-table">');
    };
  }
});
