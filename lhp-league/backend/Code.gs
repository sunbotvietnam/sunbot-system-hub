const SPREADSHEET_ID = '1Zdkx5uSRLyo90UGNu4_JTB4F8TvuGzq6gvnys97Vx-8';
const SHEETS = { orders:'ORDERS', products:'PRODUCTS', settings:'SETTINGS' };

function doGet(e) {
  const p = e && e.parameter ? e.parameter : {};
  const callback = String(p.callback || 'lhpInventoryCallback');
  if (!/^[A-Za-z_$][0-9A-Za-z_$\.]*$/.test(callback)) {
    return ContentService.createTextOutput('/* invalid callback */').setMimeType(ContentService.MimeType.JAVASCRIPT);
  }
  expireReservations_();
  const data = { ok:true, inventory:getInventory_(), ts:new Date().toISOString() };
  return ContentService.createTextOutput(callback + '(' + JSON.stringify(data) + ');')
    .setMimeType(ContentService.MimeType.JAVASCRIPT);
}

function doPost(e) {
  const lock = LockService.getScriptLock();
  lock.waitLock(15000);
  let result;
  try {
    expireReservations_();
    const p = e.parameter || {};
    const payload = {
      fullName:String(p.fullName || '').trim(),
      phone:String(p.phone || '').trim(),
      cohort:String(p.cohort || '').trim(),
      sku:String(p.sku || '').trim(),
      quantity:Number(p.quantity || 1),
      deliveryMethod:String(p.deliveryMethod || 'PICKUP'),
      shippingName:String(p.shippingName || '').trim(),
      shippingPhone:String(p.shippingPhone || '').trim(),
      shippingAddress:String(p.shippingAddress || '').trim(),
      note:String(p.note || '').trim()
    };
    validate_(payload);
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const products = rowsToObjects_(ss.getSheetByName(SHEETS.products).getDataRange().getValues());
    const product = products.find(x => String(x.sku) === payload.sku && (x.active === true || String(x.active).toUpperCase() === 'TRUE'));
    if (!product) throw new Error('Sản phẩm hiện chưa mở đặt.');

    const inv = getInventory_();
    const current = inv[payload.sku];
    if (!current || current.available < payload.quantity) throw new Error('Số lượng còn lại không đủ.');

    const settings = settings_();
    const orderId = nextOrderId_();
    const now = new Date();
    const hours = Number(settings.reservation_hours || 24);
    const expiresAt = new Date(now.getTime() + hours*3600000);
    const unitPrice = Number(product.price || 0);
    const total = unitPrice * payload.quantity;

    ss.getSheetByName(SHEETS.orders).appendRow([
      orderId, now, payload.fullName, payload.phone, payload.cohort, payload.sku,
      product.name, payload.quantity, unitPrice, total, payload.deliveryMethod,
      payload.shippingName, payload.shippingPhone, payload.shippingAddress,
      'RESERVED','PENDING',expiresAt,payload.note
    ]);

    result = {
      ok:true, orderId, productName:product.name, quantity:payload.quantity,
      total, totalText:formatVnd_(total),
      expiresAt:Utilities.formatDate(expiresAt,'Asia/Ho_Chi_Minh','HH:mm dd/MM/yyyy'),
      transferContent:(payload.phone + ' ' + orderId).replace(/\s+/g,' '),
      inventory:getInventory_()
    };
  } catch (err) {
    result = { ok:false, message:err && err.message ? err.message : String(err) };
  } finally {
    lock.releaseLock();
  }
  const safe = JSON.stringify(result).replace(/</g,'\\u003c');
  return HtmlService.createHtmlOutput('<!doctype html><meta charset="utf-8"><script>parent.postMessage(' + safe + ', "*");<\/script>');
}

function getInventory_() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const products = rowsToObjects_(ss.getSheetByName(SHEETS.products).getDataRange().getValues());
  const ordersSheet = ss.getSheetByName(SHEETS.orders);
  const orders = ordersSheet.getLastRow() > 1 ? rowsToObjects_(ordersSheet.getDataRange().getValues()) : [];
  const out = {};
  products.forEach(p => {
    const sku=String(p.sku), quota=Number(p.quota || 0);
    let reserved=0, paid=0;
    orders.filter(o=>String(o.sku)===sku).forEach(o=>{
      const q=Number(o.quantity||0), os=String(o.order_status||''), ps=String(o.payment_status||'');
      if(os==='RESERVED' && ps==='PENDING') reserved += q;
      if(os==='CONFIRMED' || ps==='PAID') paid += q;
    });
    out[sku]={quota,reserved,paid,available:Math.max(quota-reserved-paid,0)};
  });
  return out;
}

function expireReservations_() {
  const ss=SpreadsheetApp.openById(SPREADSHEET_ID);
  const sh=ss.getSheetByName(SHEETS.orders);
  if(!sh || sh.getLastRow()<2) return;
  const values=sh.getDataRange().getValues(), headers=values[0];
  const oi=headers.indexOf('order_status'), pi=headers.indexOf('payment_status'), ei=headers.indexOf('expires_at');
  if(oi<0||pi<0||ei<0) return;
  const now=new Date(); let dirty=false;
  for(let r=1;r<values.length;r++){
    if(values[r][oi]==='RESERVED' && values[r][pi]==='PENDING' && values[r][ei] && new Date(values[r][ei])<now){
      values[r][oi]='EXPIRED'; values[r][pi]='EXPIRED'; dirty=true;
    }
  }
  if(dirty) sh.getRange(2,1,values.length-1,headers.length).setValues(values.slice(1));
}

function nextOrderId_() {
  const sh=SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(SHEETS.orders);
  return 'LHP-' + String(Math.max(sh.getLastRow(),1)).padStart(4,'0');
}
function settings_(){
  const rows=rowsToObjects_(SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(SHEETS.settings).getDataRange().getValues());
  return rows.reduce((a,r)=>(a[String(r.key)]=r.value,a),{});
}
function validate_(p){
  if(!p.fullName||!p.phone||!p.sku) throw new Error('Vui lòng nhập đủ họ tên, số điện thoại và sản phẩm.');
  if(!/^0\d{9,10}$/.test(p.phone)) throw new Error('Số điện thoại chưa đúng định dạng.');
  if(!Number.isFinite(p.quantity)||p.quantity<1) throw new Error('Số lượng không hợp lệ.');
  if(p.deliveryMethod==='SHIP' && (!p.shippingName||!p.shippingPhone||!p.shippingAddress)) throw new Error('Vui lòng nhập đủ thông tin nhận hàng.');
}
function rowsToObjects_(v){const h=v[0].map(String);return v.slice(1).map(r=>Object.fromEntries(h.map((x,i)=>[x,r[i]])));}
function formatVnd_(n){return Number(n||0).toLocaleString('vi-VN')+'đ';}
