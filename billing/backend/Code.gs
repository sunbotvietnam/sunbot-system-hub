const BILLING_SPREADSHEET_ID = '1xgXFFHKZxWQFRyExeMqcDYFGUxYzxooSBLu0xUvTi3w';
const HUB_ACCESS_BACKEND = 'https://script.google.com/macros/s/AKfycbw32BGSXwFVOpRCknx5hn8-k2m5ZXox26_y2mnZKVWL0JKHCv_Qtly5JiY0FS9e87kU/exec';

function doGet(){return json_({ok:true,service:'Sunbot Billing API',version:'1.0'});}
function doPost(e){
  try{
    const p=JSON.parse((e&&e.postData&&e.postData.contents)||'{}');
    const identity=verifyBillingAccess_(p.token);
    switch(String(p.action||'')){
      case 'getBillingSchools': return json_({ok:true,schools:getBillingSchools_(),identity:identity});
      case 'getBillingPolicy': return json_({ok:true,policy:getBillingPolicy_(p.schoolCode),identity:identity});
      case 'saveBillingCase': return json_(saveBillingCase_(p.case,p.billing,identity));
      case 'listBillingCases': return json_({ok:true,cases:listBillingCases_(p.schoolCode,p.month),identity:identity});
      default: return json_({ok:false,message:'Action không hợp lệ.'});
    }
  }catch(err){return json_({ok:false,message:err.message||String(err)});}
}
function json_(obj){return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);}
function ss_(){return SpreadsheetApp.openById(BILLING_SPREADSHEET_ID);}
function values_(name){const sh=ss_().getSheetByName(name);if(!sh)throw new Error('Thiếu sheet '+name);const v=sh.getDataRange().getValues();if(!v.length)return[];const h=v.shift().map(String);return v.filter(r=>r.some(x=>String(x).trim()!=='' )).map(r=>Object.fromEntries(h.map((k,i)=>[k,r[i]])));}
function truthy_(v){return v===true||String(v).toUpperCase()==='TRUE'||String(v)==='1';}
function verifyBillingAccess_(token){
  if(!token)throw new Error('Thiếu phiên đăng nhập Sunbot. Hãy mở Billing từ Sunbot System Hub.');
  const res=UrlFetchApp.fetch(HUB_ACCESS_BACKEND,{method:'post',contentType:'text/plain;charset=utf-8',payload:JSON.stringify({action:'hubPermissions',token:token}),muteHttpExceptions:true});
  const data=JSON.parse(res.getContentText()||'{}');
  if(!data.ok)throw new Error(data.message||'Phiên đăng nhập không hợp lệ.');
  const apps=Array.isArray(data.apps)?data.apps:[];
  const allowed=apps.some(a=>String(a.id||a.app_id||'').toLowerCase()==='billing'||String(a.n||a.ten_ung_dung||'').toLowerCase().includes('billing'));
  if(!allowed)throw new Error('Tài khoản chưa được cấp quyền Sunbot Billing OS.');
  return data.identity||{};
}
function getBillingSchools_(){
  const configs=values_('BILLING_CONFIG').filter(r=>truthy_(r.active));
  return configs.map(r=>({
    code:String(r.billing_school_id||''),accountId:String(r.account_id||''),name:String(r.ten_truong||''),address:String(r.dia_chi||''),mst:String(r.mst||''),active:true,
    serviceName:String(r.service_name||'Chương trình Lập trình tư duy cùng Sunbot'),commission:Number(r.commission_value||0),commissionMode:String(r.commission_mode||'net_tuition'),showBank:truthy_(r.show_bank_default),
    fullTuition:Number(r.full_tuition||0),fullService:Number(r.full_service||0),halfTuition:Number(r.half_tuition||0),teacherHalfTuition:Number(r.teacher_half_tuition||0)
  }));
}
function getBillingPolicy_(schoolCode){
  const custom=values_('BILLING_POLICY').filter(r=>String(r.billing_school_id)===String(schoolCode)&&truthy_(r.active));
  if(custom.length)return custom.sort((a,b)=>Number(a.priority||0)-Number(b.priority||0));
  const s=getBillingSchools_().find(x=>x.code===schoolCode);if(!s)return[];
  return [
    {rule_code:'FULL_MONTH',rule_name:'Học đủ tháng',quantity_source:'full',tuition_unit:s.fullTuition,service_unit:s.fullService,priority:10,active:true},
    {rule_code:'HALF_MONTH',rule_name:'Học 1/2 tháng',quantity_source:'half_non_teacher',tuition_unit:s.halfTuition||Math.round(s.fullTuition/2),service_unit:s.fullService,priority:20,active:true},
    {rule_code:'TEACHER_CHILD_HALF',rule_name:'Con giáo viên học 1/2 tháng',quantity_source:'teacherHalf',tuition_unit:s.teacherHalfTuition||Math.round(s.fullTuition/4),service_unit:s.fullService,priority:30,active:true}
  ];
}
function saveBillingCase_(c,b,identity){
  if(!c||!c.schoolCode||!c.billMonth)throw new Error('Thiếu trường hoặc kỳ thanh toán.');
  const sh=ss_().getSheetByName('BILLING_CASES');const lineSh=ss_().getSheetByName('BILLING_LINES');
  const now=new Date();const caseId='BILL-'+c.schoolCode+'-'+String(c.billMonth).replace('-','')+'-V'+String(c.version||1).padStart(2,'0');
  if(sh.getLastRow()===0)sh.appendRow(['case_id','billing_school_id','bill_month','version','status','document_date','service_name','total_tuition','total_service','total_adjustment','total_final','commission','created_by','created_at','payload_json']);
  sh.appendRow([caseId,c.schoolCode,c.billMonth,c.version||1,'DRAFT',c.docDate||'',c.serviceName||'',Number(b&&b.tuition||0),Number(b&&b.service||0),Number(b&&b.adjust||0),Number(b&&b.final||0),Number(b&&b.commission||0),String(identity.uid||identity.name||''),now,JSON.stringify(c)]);
  if(lineSh.getLastRow()===0)lineSh.appendRow(['case_id','line_type','class_name','size','full_month','half_month','absent','teacher_half','description','amount','created_at']);
  (c.rows||[]).forEach(r=>lineSh.appendRow([caseId,'QUANTITY',r.cls||'',r.size||0,r.full||0,r.half||0,r.absent||0,r.teacherHalf||0,r.note||'',0,now]));
  (c.adjustments||[]).forEach(a=>lineSh.appendRow([caseId,'ADJUSTMENT','',0,0,0,0,0,a.text||'',Number(a.sign||-1)*Number(a.amount||0),now]));
  return {ok:true,caseId:caseId};
}
function listBillingCases_(schoolCode,month){return values_('BILLING_CASES').filter(r=>(!schoolCode||String(r.billing_school_id)===String(schoolCode))&&(!month||String(r.bill_month)===String(month))).slice(-100).reverse();}
