/* ============================================================================
 * ScholarFlow — Centralized Enterprise Error Management System (core/errors.js)
 * ----------------------------------------------------------------------------
 * Single Source of Truth for Error Codes, Diagnostics & Structured Handling.
 * Every system error carries a unique deterministic code: SF-<DOMAIN>-<CODE>.
 * ============================================================================ */

(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    var exp = factory();
    root.SF_ERROR_REGISTRY = exp.SF_ERROR_REGISTRY;
    root.ScholarError = exp.ScholarError;
    root.SF_createError = exp.SF_createError;
    root.SF_handleError = exp.SF_handleError;
    root.SF_logError = exp.SF_logError;
    root.SF_showToast = exp.SF_showToast;
    root.SF_getDiagnosticSnapshot = exp.SF_getDiagnosticSnapshot;
    root.SF_clearErrorHistory = exp.SF_clearErrorHistory;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  /* --------------------------------------------------------------------------
   * 1. ERROR REGISTRY — DICTIONARY OF ALL SYSTEM ERRORS
   * -------------------------------------------------------------------------- */
  var SF_ERROR_REGISTRY = {
    /* ── [CORE & STORAGE: 001 - 099] ── */
    'SF-CORE-001': {
      name: 'ERR_STORAGE_QUOTA_EXCEEDED',
      domain: 'CORE',
      level: 'CRITICAL',
      message: 'Bộ nhớ cục bộ tiện ích đã đầy hoặc vượt quá hạn mức cho phép.',
      action: 'Vui lòng dọn dẹp các bản nháp cũ, lịch sử trích dẫn hoặc xuất dữ liệu để giải phóng bộ nhớ.'
    },
    'SF-CORE-002': {
      name: 'ERR_STORAGE_READ_FAILED',
      domain: 'CORE',
      level: 'ERROR',
      message: 'Không thể đọc dữ liệu từ chrome.storage cục bộ.',
      action: 'Kiểm tra quyền lưu trữ của tiện ích hoặc khởi động lại trình duyệt.'
    },
    'SF-CORE-003': {
      name: 'ERR_STORAGE_WRITE_FAILED',
      domain: 'CORE',
      level: 'ERROR',
      message: 'Không thể ghi dữ liệu mới vào chrome.storage.',
      action: 'Thao tác lưu tạm thời thất bại, vui lòng thử lại sau vài giây.'
    },
    'SF-CORE-004': {
      name: 'ERR_STATE_CORRUPTED',
      domain: 'CORE',
      level: 'ERROR',
      message: 'Dữ liệu cấu hình phiên làm việc bị sai lệch hoặc không hợp lệ.',
      action: 'Hệ thống sẽ tự động khôi phục về trạng thái an toàn mặc định.'
    },

    /* ── [CITATION & BIBLIOGRAPHY: 101 - 199] ── */
    'SF-CITE-101': {
      name: 'ERR_DOI_INVALID_FORMAT',
      domain: 'CITATION',
      level: 'WARN',
      message: 'Mã định danh DOI không đúng định dạng chuẩn (10.xxxx/...).',
      action: 'Vui lòng kiểm tra lại tiền tố 10.xxxx và chuỗi DOI được cung cấp.'
    },
    'SF-CITE-102': {
      name: 'ERR_CROSSREF_TIMEOUT',
      domain: 'CITATION',
      level: 'ERROR',
      message: 'Hết thời gian kết nối tới máy chủ Crossref / OpenAlex.',
      action: 'Máy chủ dữ liệu học thuật quốc tế đang quá tải, vui lòng thử lại sau giây lát.'
    },
    'SF-CITE-103': {
      name: 'ERR_BIBTEX_SYNTAX_ERROR',
      domain: 'CITATION',
      level: 'ERROR',
      message: 'Cú pháp BibTeX không hợp lệ hoặc thiếu ngoặc đóng/mở.',
      action: 'Kiểm tra lại cấu trúc @article{..., entrykey và các trường bắt buộc.'
    },
    'SF-CITE-104': {
      name: 'ERR_METADATA_EXTRACTION_FAILED',
      domain: 'CITATION',
      level: 'WARN',
      message: 'Không thể trích xuất metadata học thuật từ trang web hiện tại.',
      action: 'Trang web không chứa thẻ meta Highwire Press hoặc Dublin Core, vui lòng nhập thủ công.'
    },
    'SF-CITE-105': {
      name: 'ERR_DUPLICATE_ENTRY',
      domain: 'CITATION',
      level: 'INFO',
      message: 'Tài liệu trích dẫn này đã tồn tại trong danh mục lưu trữ.',
      action: 'Hệ thống đã cập nhật bản ghi hiện có thay vì tạo bản trùng lặp.'
    },

    /* ── [AI & STREAMING ASSISTANT: 201 - 299] ── */
    'SF-AI-201': {
      name: 'ERR_AI_API_KEY_MISSING',
      domain: 'AI',
      level: 'ERROR',
      message: 'Chưa cấu hình API Key cho nhà cung cấp AI đã chọn.',
      action: 'Vui lòng mở Cài đặt AI (bánh răng) và nhập khóa API của bạn.'
    },
    'SF-AI-202': {
      name: 'ERR_AI_STREAM_ABORTED',
      domain: 'AI',
      level: 'WARN',
      message: 'Luồng dữ liệu phản hồi từ AI bị ngắt quãng đột ngột.',
      action: 'Kiểm tra lại đường truyền Internet hoặc hạn mức token của tài khoản.'
    },
    'SF-AI-203': {
      name: 'ERR_AI_RATE_LIMIT_EXCEEDED',
      domain: 'AI',
      level: 'WARN',
      message: 'Vượt quá giới hạn số lượng yêu cầu (Rate Limit - 429).',
      action: 'Vui lòng đợi 30 giây trước khi gửi prompt tiếp theo.'
    },
    'SF-AI-204': {
      name: 'ERR_AI_CONTEXT_TOO_LARGE',
      domain: 'AI',
      level: 'WARN',
      message: 'Đoạn văn bản bôi đen hoặc tài liệu vượt quá kích thước ngữ cảnh cho phép.',
      action: 'Vui lòng thu nhỏ vùng chọn văn bản hoặc tắt bớt các tùy chọn ngữ cảnh trang.'
    },

    /* ── [FLOW & P2P MESH: 301 - 399] ── */
    'SF-FLOW-301': {
      name: 'ERR_WEBRTC_SIGNAL_FAILED',
      domain: 'FLOW',
      level: 'ERROR',
      message: 'Không thể thiết lập kết nối ngang hàng P2P (ICE negotiation failed).',
      action: 'Kiểm tra mã Peer ID của đối tác hoặc kiểm tra tường lửa mạng LAN/NAT.'
    },
    'SF-FLOW-302': {
      name: 'ERR_FLOW_PEER_OFFLINE',
      domain: 'FLOW',
      level: 'WARN',
      message: 'Thiết bị đối tác không phản hồi hoặc đã đóng kết nối.',
      action: 'Yêu cầu bạn bè mở lại tab Flow và xác nhận mã kết nối.'
    },
    'SF-FLOW-303': {
      name: 'ERR_FLOW_PACKET_CORRUPTED',
      domain: 'FLOW',
      level: 'ERROR',
      message: 'Gói tin mã hóa nhận được qua WebRTC bị hỏng hoặc sai checksum.',
      action: 'Gói tin đã bị từ chối tự động để đảm bảo an toàn dữ liệu.'
    },

    /* ── [CALENDAR & SCHEDULE: 401 - 499] ── */
    'SF-CAL-401': {
      name: 'ERR_CAL_ICS_FETCH_FAILED',
      domain: 'CALENDAR',
      level: 'ERROR',
      message: 'Không thể tải tệp lịch ICS từ đường dẫn đã đăng ký.',
      action: 'Kiểm tra lại tính khả dụng của URL iCalendar hoặc sự cố kết nối mạng.'
    },
    'SF-CAL-402': {
      name: 'ERR_CAL_ICS_PARSE_FAILED',
      domain: 'CALENDAR',
      level: 'ERROR',
      message: 'Nội dung tệp lịch iCalendar bị sai định dạng chuẩn RFC 5545.',
      action: 'Tệp lịch không chứa thẻ VEVENT hoặc mốc thời gian DTSTART/DTEND bị lỗi.'
    },
    'SF-CAL-403': {
      name: 'ERR_CAL_EVENT_OVERLAP',
      domain: 'CALENDAR',
      level: 'WARN',
      message: 'Sự kiện mới bị trùng giờ với một sự kiện đã có trong lịch học.',
      action: 'Bạn có thể xem lại khung giờ trên lịch tuần để phân bổ thời gian hợp lý.'
    },

    /* ── [USERSCRIPTS STUDIO: 501 - 599] ── */
    'SF-US-501': {
      name: 'ERR_USERSCRIPT_META_MISSING',
      domain: 'USERSCRIPTS',
      level: 'ERROR',
      message: 'Script không chứa khối chú thích siêu dữ liệu // ==UserScript==.',
      action: 'Đảm bảo script có đầy đủ khối header @name và @match.'
    },
    'SF-US-502': {
      name: 'ERR_USERSCRIPT_SANDBOX_VIOLATION',
      domain: 'USERSCRIPTS',
      level: 'CRITICAL',
      message: 'Script cố gắng thực thi API không được cấp quyền trong thẻ @grant.',
      action: 'Hệ thống đã chặn thực thi để bảo vệ an toàn trình duyệt của bạn.'
    },
    'SF-US-503': {
      name: 'ERR_USERSCRIPT_SYNTAX_ERROR',
      domain: 'USERSCRIPTS',
      level: 'ERROR',
      message: 'Mã nguồn JavaScript của Userscript bị lỗi cú pháp.',
      action: 'Mở trình soạn thảo Studio để kiểm tra dòng code báo lỗi.'
    },

    /* ── [THEME & UI TOKENS: 601 - 699] ── */
    'SF-THEME-601': {
      name: 'ERR_THEME_INVALID_ACCENT',
      domain: 'THEME',
      level: 'WARN',
      message: 'Chủ đề màu được yêu cầu không nằm trong danh mục hỗ trợ.',
      action: 'Hệ thống tự động sử dụng màu CYAN mặc định.'
    },
    'SF-THEME-602': {
      name: 'ERR_THEME_TOKEN_MISSING',
      domain: 'THEME',
      level: 'WARN',
      message: 'Thiếu biến Design Token hệ thống trong stylesheet.',
      action: 'Tự động kế thừa từ :root để đảm bảo giao diện không bị gián đoạn.'
    },

    /* ── [I18N & LOCALIZATION: 701 - 799] ── */
    'SF-I18N-701': {
      name: 'ERR_I18N_KEY_NOT_FOUND',
      domain: 'I18N',
      level: 'WARN',
      message: 'Khóa ngôn ngữ giao diện không tìm thấy trong tệp từ điển hiện tại.',
      action: 'Hệ thống tự động hiển thị khóa gốc hoặc chuyển sang ngôn ngữ tiếng Anh.'
    },

    /* ── [SECURITY & PRIVACY: 801 - 899] ── */
    'SF-SEC-801': {
      name: 'ERR_SEC_PATTERN_INVALID',
      domain: 'SECURITY',
      level: 'ERROR',
      message: 'Biểu thức chính quy (Regex) quét dữ liệu nhạy cảm không hợp lệ.',
      action: 'Kiểm tra lại cú pháp regex trong cấu hình che thông tin.'
    },
    'SF-SEC-802': {
      name: 'ERR_SEC_EXTERNAL_BLOCKED',
      domain: 'SECURITY',
      level: 'WARN',
      message: 'Yêu cầu kết nối mạng ngoài bị chặn do không thuộc danh sách an toàn.',
      action: 'ScholarFlow cam kết bảo mật 100% cục bộ và ngăn chặn mọi yêu cầu mạng khả nghi.'
    }
  };

  /* --------------------------------------------------------------------------
   * 2. CUSTOM ERROR CLASS — SCHOLAR ERROR
   * -------------------------------------------------------------------------- */
  function ScholarError(code, context, originalError) {
    var def = SF_ERROR_REGISTRY[code] || {
      name: 'ERR_UNKNOWN',
      domain: 'GENERAL',
      level: 'ERROR',
      message: typeof code === 'string' ? code : 'Lỗi hệ thống không xác định.',
      action: 'Vui lòng kiểm tra lại thao tác vừa thực hiện.'
    };

    var msg = '[' + code + '] ' + def.message;
    var instance = new Error(msg);
    Object.setPrototypeOf(instance, ScholarError.prototype);

    instance.code = code;
    instance.name = def.name;
    instance.domain = def.domain;
    instance.level = def.level;
    instance.userMessage = def.message;
    instance.action = def.action;
    instance.context = context || null;
    instance.originalError = originalError || null;
    instance.timestamp = Date.now();

    // Record error in diagnostics ring buffer
    _recordErrorToDiagnostics(instance);

    return instance;
  }
  ScholarError.prototype = Object.create(Error.prototype);
  ScholarError.prototype.constructor = ScholarError;

  /* --------------------------------------------------------------------------
   * 3. DIAGNOSTICS & TELEMETRY RING BUFFER (MAX 50 EVENTS)
   * -------------------------------------------------------------------------- */
  var _diagnosticsLog = [];
  var MAX_LOG_SIZE = 50;

  function _recordErrorToDiagnostics(err) {
    try {
      _diagnosticsLog.unshift({
        code: err.code,
        name: err.name,
        domain: err.domain,
        level: err.level,
        message: err.userMessage,
        action: err.action,
        context: err.context,
        timestamp: err.timestamp || Date.now(),
        stack: err.stack ? err.stack.split('\n').slice(0, 3).join('\n') : null
      });
      if (_diagnosticsLog.length > MAX_LOG_SIZE) {
        _diagnosticsLog.pop();
      }
    } catch (_) {}
  }

  function SF_getDiagnosticSnapshot() {
    return {
      version: '2.5.6',
      timestamp: new Date().toISOString(),
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'Node.js',
      errorCount: _diagnosticsLog.length,
      recentErrors: JSON.parse(JSON.stringify(_diagnosticsLog))
    };
  }

  function SF_clearErrorHistory() {
    _diagnosticsLog = [];
  }

  /* --------------------------------------------------------------------------
   * 4. PUBLIC HELPER APIS
   * -------------------------------------------------------------------------- */
  function SF_createError(code, context, originalError) {
    return new ScholarError(code, context, originalError);
  }

  function SF_showToast(message, type, duration) {
    type = type || 'info';
    duration = duration || 3500;

    if (typeof document === 'undefined') return;

    var container = document.getElementById('notify');
    if (!container) {
      container = document.createElement('div');
      container.id = 'notify';
      container.className = 'notify';
      document.body.appendChild(container);
    }

    container.className = 'notify notify-' + type;
    container.textContent = message;

    requestAnimationFrame(function () {
      container.classList.add('show');
    });

    if (container._toastTimer) clearTimeout(container._toastTimer);
    container._toastTimer = setTimeout(function () {
      container.classList.remove('show');
    }, duration);
  }

  function SF_handleError(error, context) {
    var errObj;
    if (error instanceof ScholarError) {
      errObj = error;
    } else if (typeof error === 'string' && SF_ERROR_REGISTRY[error]) {
      errObj = new ScholarError(error, context);
    } else {
      errObj = new ScholarError('SF-CORE-004', context, error);
    }

    // Console logging with distinct enterprise styling
    console.groupCollapsed('%c[ScholarFlow Error: ' + errObj.code + '] ' + errObj.name, 'color: #f43f5e; font-weight: bold;');
    console.error('Message:', errObj.userMessage);
    console.warn('Action Guide:', errObj.action);
    if (errObj.context) console.info('Context:', errObj.context);
    if (errObj.originalError) console.error('Original Error:', errObj.originalError);
    if (errObj.stack) console.debug('Stack Trace:', errObj.stack);
    console.groupEnd();

    // Display formatted user toast with error code
    var displayMsg = '[' + errObj.code + '] ' + errObj.userMessage;
    SF_showToast(displayMsg, errObj.level === 'WARN' ? 'warning' : 'error');

    return errObj;
  }

  function SF_logError(error, module) {
    var code = (error && error.code) ? error.code : 'SF-GEN-000';
    console.error('[ScholarFlow:' + (module || 'Module') + '][' + code + ']', error);
  }

  return {
    SF_ERROR_REGISTRY: SF_ERROR_REGISTRY,
    ScholarError: ScholarError,
    SF_createError: SF_createError,
    SF_handleError: SF_handleError,
    SF_logError: SF_logError,
    SF_showToast: SF_showToast,
    SF_getDiagnosticSnapshot: SF_getDiagnosticSnapshot,
    SF_clearErrorHistory: SF_clearErrorHistory
  };
});
