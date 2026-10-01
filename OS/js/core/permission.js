document.getElementById('btn-grant').addEventListener('click', async () => {
  const status = document.getElementById('perm-status');
  status.textContent = (typeof t === 'function' ? t('perm_requesting') : null) || 'Đang yêu cầu quyền...';
  status.style.color = 'inherit';
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
    stream.getTracks().forEach(tr => tr.stop()); // Stop immediately
    status.style.color = '#10b981'; // green
    status.textContent = (typeof t === 'function' ? t('perm_granted_closing') : null) || 'Cấp quyền thành công! Tab này sẽ tự đóng sau 3 giây...';

    // Notify the background or sidebar if needed, but usually just closing is fine.
    setTimeout(() => window.close(), 3000);
  } catch (e) {
    status.style.color = '#ef4444'; // red
    const errPrefix = (typeof t === 'function' ? t('perm_error_prefix') : null) || 'Lỗi: ';
    status.textContent = errPrefix + (e && e.message ? e.message : String(e));
  }
});

