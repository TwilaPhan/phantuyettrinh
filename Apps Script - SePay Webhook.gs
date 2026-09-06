/* ============================================================
   SEPAY WEBHOOK — Tự động ghi nhận thanh toán + gửi email
   ============================================================
   Đây là bản SAO LƯU của code đã triển khai thực tế trong Apps
   Script (project "Untitled project", gắn với Google Sheet
   "Landing Page Collect") — dùng để đối chiếu / khôi phục khi cần,
   KHÔNG cần dán lại trừ khi Code.gs gốc bị mất.

   Đã deploy: Version 6 (06/09/2026)
   Webhook URL cấu hình bên SePay:
     https://script.google.com/macros/s/AKfycby8dlPcqSOfsbqdIYRVcLQYQt7PmWprUz9-DyMgQbz8ZtMoX37xOLfevoNq-kTcx3G9/exec?token=trinh2026sepay

   LƯU Ý: cột trong Sheet "Landing Page Collect" có tiêu đề bị lệch
   nhãn từ trước (cột E ghi "Thách Thức Tài Chính" nhưng thực chứa
   dữ liệu "goal", cột F ghi "Mục tiêu" nhưng thực chứa "message").
   Vì vậy code bên dưới lấy dữ liệu khách hàng theo ĐÚNG VỊ TRÍ CỘT
   cố định (0=Thời Gian,1=Họ và Tên,2=SĐT,3=Doanh nghiệp,4=Goal,
   5=Message) thay vì dò theo tên tiêu đề.
============================================================ */

// ============ CẤU HÌNH SEPAY ============
const SEPAY_TOKEN = 'trinh2026sepay';
const NOTIFY_EMAIL = 'coachtrinhphan@gmail.com';

function doPost(e) {
  try {
    var data = JSON.parse(e.postData.contents);

    // Webhook từ SePay luôn có 2 field này. Nếu thiếu -> request form đăng ký bình thường.
    if (data.transferAmount !== undefined && data.gateway !== undefined) {
      return handleSePayWebhook(e, data);
    }

    // ---- Form đăng ký bình thường (giữ nguyên logic gốc) ----
    var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();

    if (sheet.getLastRow() === 0) {
      sheet.appendRow(['Thời Gian', 'Họ và Tên', 'Số Điện Thoại', 'Doanh Nghiệp / Doanh Thu', 'Mục Tiêu Muốn Đạt Được', 'Thách Thức Tài Chính']);
    }

    // Tự thêm 3 cột phục vụ flow thanh toán nếu Sheet chưa có
    var headerRow = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    ['Mã Đơn Hàng', 'Số Tiền', 'Trạng Thái'].forEach(function(label) {
      if (headerRow.indexOf(label) === -1) {
        sheet.getRange(1, sheet.getLastColumn() + 1).setValue(label);
        headerRow.push(label);
      }
    });

    sheet.appendRow([
      new Date(),
      data.name || '',
      data.phone || '',
      data.company || '',
      data.goal || '',
      data.message || '',
      data.orderCode || '',
      data.amount || '',
      data.status || ''
    ]);

    return ContentService.createTextOutput(JSON.stringify({ result: 'success' }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({ result: 'error', error: String(error) }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function handleSePayWebhook(e, body) {
  // Xác thực token bí mật gắn trong URL Webhook (vì Apps Script không đọc được header)
  var tokenOk = (e.parameter && e.parameter.token) === SEPAY_TOKEN;
  if (!tokenOk) {
    return ContentService.createTextOutput(JSON.stringify({ success: false, error: 'unauthorized' }))
      .setMimeType(ContentService.MimeType.JSON);
  }

  // Chỉ xử lý tiền vào, bỏ qua tiền ra
  if (body.transferType !== 'in') {
    return ContentService.createTextOutput(JSON.stringify({ success: true, skipped: 'not-incoming' }))
      .setMimeType(ContentService.MimeType.JSON);
  }

  var content = String(body.content || body.description || '');
  var amountReceived = Number(body.transferAmount || 0);

  var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  var data = sheet.getDataRange().getValues();
  var headers = data[0];

  var colOrderCode = headers.indexOf('Mã Đơn Hàng');
  var colStatus = headers.indexOf('Trạng Thái');
  // Vị trí cột cố định (không dò theo tên tiêu đề — xem ghi chú ở đầu file)
  var colName = 1;
  var colPhone = 2;
  var colCompany = 3;
  var colGoal = 4;

  var matchedRow = -1;
  for (var i = 1; i < data.length; i++) {
    var rowOrderCode = String(data[i][colOrderCode] || '');
    var rowStatus = String(data[i][colStatus] || '');
    if (rowOrderCode && content.indexOf(rowOrderCode) !== -1 && rowStatus !== 'Đã thanh toán') {
      matchedRow = i;
      break;
    }
  }

  if (matchedRow === -1) {
    // Có tiền vào nhưng không khớp đơn nào đang chờ -> vẫn báo để tự kiểm tra thủ công
    MailApp.sendEmail({
      to: NOTIFY_EMAIL,
      subject: '[Chua khop don] Nhan tien ' + amountReceived.toLocaleString('vi-VN') + 'd',
      body: 'Nội dung chuyển khoản: ' + content +
        '\nSố tiền: ' + amountReceived.toLocaleString('vi-VN') + 'đ' +
        '\n\nVui lòng kiểm tra thủ công trong Google Sheet.'
    });
    return ContentService.createTextOutput(JSON.stringify({ success: true, matched: false }))
      .setMimeType(ContentService.MimeType.JSON);
  }

  // Đánh dấu đã thanh toán
  sheet.getRange(matchedRow + 1, colStatus + 1).setValue('Đã thanh toán');

  var rowData = data[matchedRow];
  var custName = rowData[colName] || '';
  var custPhone = rowData[colPhone] || '';
  var custCompany = rowData[colCompany] || '';
  var custGoal = rowData[colGoal] || '';
  var orderCode = rowData[colOrderCode];

  MailApp.sendEmail({
    to: NOTIFY_EMAIL,
    subject: '[Da thanh toan] ' + custName + ' - ' + amountReceived.toLocaleString('vi-VN') + 'd',
    body:
      'Có khách hàng vừa hoàn tất thanh toán đăng ký:\n\n' +
      'Họ tên: ' + custName + '\n' +
      'SĐT: ' + custPhone + '\n' +
      'Doanh nghiệp: ' + custCompany + '\n' +
      'Mục tiêu: ' + custGoal + '\n' +
      'Mã đơn hàng: ' + orderCode + '\n' +
      'Số tiền chuyển khoản: ' + amountReceived.toLocaleString('vi-VN') + 'đ\n' +
      'Nội dung CK thực tế: ' + content + '\n' +
      'Thời gian: ' + body.transactionDate
  });

  return ContentService.createTextOutput(JSON.stringify({ success: true, matched: true }))
    .setMimeType(ContentService.MimeType.JSON);
}
