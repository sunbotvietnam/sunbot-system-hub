const CFG = {
  PRODUCTS: 'PRODUCTS',
  ORDERS: 'ORDERS',
  SETTINGS: 'SETTINGS',
  RESERVATION_HOURS: 24
};

function doGet(e) {
  try {
    const action = (e && e.parameter && e.parameter.action) || 'siteData';
    if (action === 'siteData') return json_({ok:true, data:getSiteData()});
    return json_({ok:false, error:'Action không hợp lệ.'});
  } catch (err) {
    return json_({ok:false, error:String(err && err.message || err)});
  }
}

function doPost(e) {
  try {
    const body = JSON.parse((e && e.postData && e.postData.contents) || '{}');
    const action = body.action || 'submitOrder';
    if (action !== 'submitOrder') return json_({ok:false, error:'Action không hợp lệ.'});
    const payload = body.payload || body;
    return json_({ok:true, data:submitOrder(payload)});
  } catch (err) {
    return json_({ok:false, error:String(err && err.message || err)});
  }
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

function setupDatabase() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const products = ensureSheet_(ss, CFG.PRODUCTS, [
    'sku','name','price','quota','active'
  ]);
  const orders = ensureSheet_(ss, CFG.ORDERS, [
    'order_id','created_at','full_name','phone','cohort','sku','product_name','quantity','unit_price','total',
    'delivery_method','shipping_name','shipping_phone','shipping_address','note','order_status','payment_status','expires_at'
  ]);
  const settings = ensureSheet_(ss, CFG.SETTINGS, ['key','value']);

  if (products.getLastRow() < 2) {
    products.getRange(2,1,3,5).setValues([
      ['SET200','Set Kỷ Niệm 200',200000,200,true],
      ['SET500','Set Kỷ Niệm VIP 500',500000,100,true],
      ['BALL2026','Bóng Kỷ Niệm 2026',1000000,20,true]
    ]);
  }

  if (settings.getLastRow() < 2) {
    settings.getRange(2,1,9,2).setValues([
      ['reservation_hours',24],
      ['bank_account_name','Nguyễn Thị Thuý'],
      ['bank_name','Vietcombank Hà Nội'],
      ['bank_number','0021001140679'],
      ['transfer_note','Mã đơn + SĐT'],
      ['close_date','Đến khi đủ số lượng đặt trước'],
      ['pickup_note','Nhận tại sự kiện hoặc gửi theo địa chỉ đăng ký'],
      ['event_name','LHP League 10 Years'],
      ['event_years','2016–2026']
    ]);
  }

  styleSheet_(products);
  styleSheet_(orders);
  styleSheet_(settings);
  return 'Đã khởi tạo dữ liệu.';
}

function getSiteData() {
  expireReservations();
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const products = rowsToObjects_(ss.getSheetByName(CFG.PRODUCTS).getDataRange().getValues())
    .filter(r => String(r.active).toLowerCase() !== 'false')
    .map(p => ({
      sku: p.sku,
      name: p.name,
      price: Number(p.price),
      quota: Number(p.quota),
      ...inventoryFor_(p.sku, Number(p.quota))
    }));
  const settings = settingsObject_(ss.getSheetByName(CFG.SETTINGS));
  return {products, settings};
}

function submitOrder(payload) {
  const lock = LockService.getScriptLock();
  lock.waitLock(15000);
  try {
    expireReservations();
    validate_(payload);
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const productRows = rowsToObjects_(ss.getSheetByName(CFG.PRODUCTS).getDataRange().getValues());
    const product = productRows.find(r => r.sku === payload.sku && String(r.active).toLowerCase() !== 'false');
    if (!product) throw new Error('Vật phẩm hiện chưa mở nhận đặt.');

    const qty = Number(payload.quantity || 1);
    const quota = Number(product.quota || 0);
    const inv = inventoryFor_(payload.sku, quota);
    if (qty > inv.available) throw new Error('Số lượng còn lại không đủ. Vui lòng giảm số lượng.');

    const orderId = nextOrderId_();
    const created = new Date();
    const settings = settingsObject_(ss.getSheetByName(CFG.SETTINGS));
    const hours = Number(settings.reservation_hours || CFG.RESERVATION_HOURS);
    const expires = new Date(created.getTime() + hours * 3600000);
    const price = Number(product.price || 0);
    const total = price * qty;

    ss.getSheetByName(CFG.ORDERS).appendRow([
      orderId, created, payload.fullName.trim(), payload.phone.trim(), payload.cohort || '',
      payload.sku, product.name, qty, price, total, payload.deliveryMethod,
      payload.shippingName || '', payload.shippingPhone || '', payload.shippingAddress || '', payload.note || '',
      'RESERVED','PENDING',expires
    ]);

    return {
      ok: true,
      orderId,
      productName: product.name,
      quantity: qty,
      total,
      totalText: formatVnd_(total),
      expiresAt: Utilities.formatDate(expires, Session.getScriptTimeZone(), 'HH:mm · dd/MM/yyyy'),
      transferContent: `${orderId.replace(/-/g,'')} ${payload.phone.trim()}`,
      bankAccountName: settings.bank_account_name || '',
      bankName: settings.bank_name || '',
      bankNumber: settings.bank_number || ''
    };
  } finally {
    lock.releaseLock();
  }
}

function expireReservations() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(CFG.ORDERS);
  if (!sheet || sheet.getLastRow() < 2) return;
  const values = sheet.getDataRange().getValues();
  const headers = values[0];
  const orderStatus = headers.indexOf('order_status');
  const paymentStatus = headers.indexOf('payment_status');
  const expiresAt = headers.indexOf('expires_at');
  const now = new Date();
  let changed = false;
  for (let r=1; r<values.length; r++) {
    if (values[r][orderStatus] === 'RESERVED' && values[r][paymentStatus] === 'PENDING' && values[r][expiresAt] && new Date(values[r][expiresAt]) < now) {
      values[r][orderStatus] = 'EXPIRED';
      values[r][paymentStatus] = 'EXPIRED';
      changed = true;
    }
  }
  if (changed) sheet.getRange(2,1,values.length-1,headers.length).setValues(values.slice(1));
}

function inventoryFor_(sku, quota) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(CFG.ORDERS);
  if (!sheet || sheet.getLastRow() < 2) return {reserved:0, paid:0, available:quota};
  const rows = rowsToObjects_(sheet.getDataRange().getValues()).filter(r => r.sku === sku);
  let reserved = 0, paid = 0;
  rows.forEach(r => {
    const qty = Number(r.quantity || 0);
    if (r.payment_status === 'PAID') paid += qty;
    else if (r.order_status === 'RESERVED' && r.payment_status === 'PENDING') reserved += qty;
  });
  return {reserved, paid, available: Math.max(quota - reserved - paid, 0)};
}

function nextOrderId_() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(CFG.ORDERS);
  const n = Math.max(sheet.getLastRow(),1);
  return 'LHP-' + String(n).padStart(4,'0');
}

function validate_(p) {
  if (!p || !p.fullName || !p.phone || !p.sku || !p.deliveryMethod) throw new Error('Vui lòng điền đủ các trường bắt buộc.');
  if (!/^0\d{9,10}$/.test(String(p.phone).trim())) throw new Error('Số điện thoại chưa đúng định dạng.');
  if (Number(p.quantity || 0) < 1) throw new Error('Số lượng phải từ 1 trở lên.');
  if (p.deliveryMethod === 'SHIP' && (!p.shippingName || !p.shippingPhone || !p.shippingAddress)) throw new Error('Vui lòng nhập đủ thông tin nhận hàng.');
}

function settingsObject_(sheet) {
  const values = sheet.getDataRange().getValues();
  const obj = {};
  for (let i=1;i<values.length;i++) obj[values[i][0]] = values[i][1];
  return obj;
}

function rowsToObjects_(values) {
  if (!values || !values.length) return [];
  const headers = values[0].map(String);
  return values.slice(1).filter(r => r.some(v => v !== '')).map(row => {
    const obj = {};
    headers.forEach((h,i)=>obj[h]=row[i]);
    return obj;
  });
}

function ensureSheet_(ss, name, headers) {
  let sheet = ss.getSheetByName(name);
  if (!sheet) sheet = ss.insertSheet(name);
  if (sheet.getLastRow() === 0) sheet.getRange(1,1,1,headers.length).setValues([headers]);
  return sheet;
}

function styleSheet_(sheet) {
  const lastCol = sheet.getLastColumn();
  if (!lastCol) return;
  sheet.setFrozenRows(1);
  sheet.getRange(1,1,1,lastCol).setBackground('#7A1718').setFontColor('#FFFFFF').setFontWeight('bold');
  sheet.autoResizeColumns(1,lastCol);
}

function formatVnd_(n) {
  return Number(n || 0).toLocaleString('vi-VN') + 'đ';
}