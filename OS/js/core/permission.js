document.getElementById('btn-grant').addEventListener('click', async () => {
  const status = document.getElementById('perm-status');
  status.textContent = 'Đang yêu cầu quyền...';
  status.style.color = 'inherit';
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
    stream.getTracks().forEach(t => t.stop()); // Stop immediately
    status.style.color = '#10b981'; // green
    status.textContent = 'Cấp quyền thành công! Tab này sẽ tự đóng sau 3 giây...';
    
    // Notify the background or sidebar if needed, but usually just closing is fine.
    setTimeout(() => window.close(), 3000);
  } catch (e) {
    status.style.color = '#ef4444'; // red
    status.textContent = 'Lỗi: ' + e.message;
  }
});
