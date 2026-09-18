(() => {
  const CHUNK_SIZE = 256 * 1024; // 256KB chunks
  let peer = null;
  let conn = null;
  let currentCall = null;
  let localStream = null;
  let pendingConnection = null;
  let selectedFile = null;

  // File chunking state
  let fileChunks = [];
  let fileInfo = null;
  let fileProgressEl = null;
  let sendingFile = false;

  // DOM Elements
  let elConnectUi, elChatUi, elMyId, elPartnerInput, elBtnConnect, elRemoteId, elMessages;
  let elTextInput, elBtnSend, elFileInput, elFileClear, elFilePreview, elFileName, elBtnCopy;
  let elIncomingModal, elIncomingId, elBtnAccept, elBtnReject;
  let elBtnRefresh, elBtnCallAudio, elBtnCallVideo, elCallUi, elRemoteVideo, elBtnMute, elBtnVideoToggle, elBtnEndCall;

  let initialized = false;

  function initElements() {
    elConnectUi = document.getElementById('flow-connect-ui');
    elChatUi = document.getElementById('flow-chat-ui');
    elMyId = document.getElementById('flow-my-id');
    elPartnerInput = document.getElementById('flow-partner-input');
    elBtnConnect = document.getElementById('btn-flow-connect');
    elRemoteId = document.getElementById('flow-remote-id');
    elMessages = document.getElementById('flow-messages');
    elTextInput = document.getElementById('flow-text-input');
    elBtnSend = document.getElementById('btn-flow-send');
    elFileInput = document.getElementById('flow-file-input');
    elFileClear = document.getElementById('flow-file-clear');
    elFilePreview = document.getElementById('flow-file-preview');
    elFileName = document.getElementById('flow-file-name');
    elBtnCopy = document.getElementById('btn-flow-copy');

    // New V2 Elements
    elBtnRefresh = document.getElementById('btn-flow-refresh');
    elBtnCallAudio = document.getElementById('btn-flow-call-audio');
    elBtnCallVideo = document.getElementById('btn-flow-call-video');
    elCallUi = document.getElementById('flow-call-ui');
    elRemoteVideo = document.getElementById('flow-remote-video');
    elBtnMute = document.getElementById('btn-flow-mute');
    elBtnVideoToggle = document.getElementById('btn-flow-video-toggle');
    elBtnEndCall = document.getElementById('btn-flow-end-call');

    // Create incoming modal dynamically if not exists
    elIncomingModal = document.getElementById('flow-incoming-modal');
    if (!elIncomingModal) {
      elIncomingModal = document.createElement('div');
      elIncomingModal.id = 'flow-incoming-modal';
      elIncomingModal.className = 'flow-modal';
      elIncomingModal.style.display = 'none';

      const content = document.createElement('div');
      content.className = 'flow-modal-content';

      const h4 = document.createElement('h4');
      h4.setAttribute('data-i18n', 'flow_incoming_req');
      h4.textContent = 'Yêu cầu kết nối';

      const p = document.createElement('p');
      const strong = document.createElement('strong');
      strong.id = 'flow-incoming-id';
      const span = document.createElement('span');
      span.setAttribute('data-i18n', 'flow_wants_connect');
      span.textContent = ' muốn kết nối.';
      p.appendChild(strong);
      p.appendChild(span);

      const btnRow = document.createElement('div');
      btnRow.style.display = 'flex';
      btnRow.style.gap = '8px';
      btnRow.style.marginTop = '16px';

      const btnAccept = document.createElement('button');
      btnAccept.id = 'btn-flow-accept';
      btnAccept.className = 'modern-btn primary';
      btnAccept.style.flex = '1';
      btnAccept.setAttribute('data-i18n', 'flow_accept');
      btnAccept.textContent = 'Chấp nhận';

      const btnReject = document.createElement('button');
      btnReject.id = 'btn-flow-reject';
      btnReject.className = 'modern-btn danger';
      btnReject.style.flex = '1';
      btnReject.setAttribute('data-i18n', 'flow_reject');
      btnReject.textContent = 'Từ chối';

      btnRow.appendChild(btnAccept);
      btnRow.appendChild(btnReject);
      content.appendChild(h4);
      content.appendChild(p);
      content.appendChild(btnRow);
      elIncomingModal.appendChild(content);

      const wrapper = document.querySelector('.flow-wrapper');
      if (wrapper) wrapper.appendChild(elIncomingModal);
    }
    elIncomingId = document.getElementById('flow-incoming-id');
    elBtnAccept = document.getElementById('btn-flow-accept');
    elBtnReject = document.getElementById('btn-flow-reject');

    // Wire up buttons for V1+V2
    elBtnCopy.addEventListener('click', () => {
      navigator.clipboard.writeText(elMyId.textContent);
    });

    elBtnRefresh.addEventListener('click', () => {
      if (peer) peer.destroy();
      localStorage.removeItem('flow_peer_id');
      initPeer(true);
    });

    elBtnConnect.addEventListener('click', connectToPartner);
    elPartnerInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') connectToPartner();
    });

    document.getElementById('btn-flow-disconnect')?.addEventListener('click', disconnect);

    elBtnSend.addEventListener('click', sendMessage);
    elTextInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendMessage();
      }
    });

    elFileInput.addEventListener('change', handleFileSelect);
    elFileClear.addEventListener('click', clearFile);
    elBtnAccept.addEventListener('click', acceptConnection);
    elBtnReject.addEventListener('click', rejectConnection);

    // Call controls
    elBtnCallAudio.addEventListener('click', () => startCall(false));
    elBtnCallVideo.addEventListener('click', () => startCall(true));
    elBtnEndCall.addEventListener('click', endCall);
    elBtnMute.addEventListener('click', toggleMute);
    elBtnVideoToggle.addEventListener('click', toggleVideo);
  }

  function initFlow() {
    if (initialized) return;
    initElements();
    initPeer(false);
    initialized = true;
  }

  function initPeer(forceNew) {
    if (typeof Peer === 'undefined') return;

    let savedId = forceNew ? null : localStorage.getItem('flow_peer_id');

    try {
      peer = savedId ? new Peer(savedId) : new Peer();

      peer.on('open', (id) => {
        localStorage.setItem('flow_peer_id', id);
        elMyId.textContent = id;
      });

      peer.on('connection', handleIncomingConnection);
      peer.on('call', handleIncomingCall);

      peer.on('error', (err) => {
        console.error('PeerJS error:', err);
        if (err.type === 'unavailable-id' && savedId) {
          localStorage.removeItem('flow_peer_id');
          initPeer(true); // Fallback to random if taken
        } else {
          appendSystemMessage('Lỗi: ' + err.type);
        }
      });
    } catch (e) {
      console.error(e);
      elMyId.textContent = "Error initializing WebRTC";
    }
  }

  // CONNECTION MANAGEMENT
  function handleIncomingConnection(incomingConn) {
    if (conn && conn.open) {
      incomingConn.on('open', () => {
        incomingConn.send({ type: 'reject', reason: 'busy' });
        setTimeout(() => incomingConn.close(), 500);
      });
      return;
    }
    pendingConnection = incomingConn;
    elIncomingId.textContent = incomingConn.peer;
    elIncomingModal.style.display = 'flex';
  }

  function acceptConnection() {
    if (!pendingConnection) return;
    elIncomingModal.style.display = 'none';
    setupConnection(pendingConnection);
    pendingConnection = null;
  }

  function rejectConnection() {
    if (!pendingConnection) return;
    elIncomingModal.style.display = 'none';
    pendingConnection.on('open', () => {
      pendingConnection.send({ type: 'reject', reason: 'user_rejected' });
      setTimeout(() => pendingConnection.close(), 500);
    });
    pendingConnection = null;
  }

  function connectToPartner() {
    const partnerId = elPartnerInput.value.trim();
    if (!partnerId || partnerId === peer.id) return;

    elBtnConnect.disabled = true;
    const outgoingConn = peer.connect(partnerId, { reliable: true });

    outgoingConn.on('open', () => setupConnection(outgoingConn));
    outgoingConn.on('error', (err) => {
      alert('Không kết nối được: ' + err);
      elBtnConnect.disabled = false;
    });
  }

  function setupConnection(c) {
    conn = c;
    elConnectUi.style.display = 'none';
    elChatUi.style.display = 'flex';
    elRemoteId.textContent = conn.peer;
    elBtnConnect.disabled = false;
    elMessages.textContent = '';

    appendSystemMessage('Đã kết nối với ' + conn.peer);

    conn.on('data', handleData);
    conn.on('close', () => {
      appendSystemMessage('Đối tác đã ngắt kết nối.');
      endCall();
      setTimeout(disconnect, 2000);
    });
  }

  function disconnect() {
    if (conn) { conn.close(); conn = null; }
    endCall();
    elConnectUi.style.display = 'flex';
    elChatUi.style.display = 'none';
    clearFile();
    elTextInput.value = '';
  }

  // DATA CHANNELS
  function handleData(data) {
    if (data.type === 'reject') {
      alert('Đối tác đã từ chối.');
      disconnect();
    } else if (data.type === 'text') {
      appendMessage(data.content, 'peer');
    } else if (data.type === 'file_start') {
      fileInfo = data.info;
      fileChunks = [];
      fileProgressEl = appendSystemMessage('Đang nhận file: ' + fileInfo.name + '...');
      appendProgressBar(fileProgressEl);
      conn.send({ type: 'chunk_ack' }); // Request first chunk
    } else if (data.type === 'file_chunk') {
      fileChunks.push(data.chunk);
      updateProgressBar(fileProgressEl, (fileChunks.length * CHUNK_SIZE / fileInfo.size) * 100);
      conn.send({ type: 'chunk_ack' }); // Request next chunk
    } else if (data.type === 'file_end') {
      updateProgressBar(fileProgressEl, 100);
      assembleFile();
    } else if (data.type === 'chunk_ack') {
      sendNextChunk();
    }
  }

  // UI HELPERS
  function appendMessage(text, senderCls) {
    const div = document.createElement('div');
    div.className = 'flow-msg ' + senderCls;
    div.textContent = text;
    elMessages.appendChild(div);
    elMessages.scrollTop = elMessages.scrollHeight;
  }

  function appendSystemMessage(text) {
    const div = document.createElement('div');
    div.className = 'flow-msg system';
    div.textContent = text;
    elMessages.appendChild(div);
    elMessages.scrollTop = elMessages.scrollHeight;
    return div;
  }

  function appendProgressBar(container) {
    const bar = document.createElement('div');
    bar.className = 'flow-progress-bar';
    const fill = document.createElement('div');
    fill.className = 'flow-progress-fill';
    bar.appendChild(fill);

    const txt = document.createElement('div');
    txt.className = 'flow-progress-text';
    txt.textContent = '0%';

    container.appendChild(bar);
    container.appendChild(txt);
  }

  function updateProgressBar(container, percent) {
    if (!container) return;
    const p = Math.min(100, Math.round(percent));
    const fill = container.querySelector('.flow-progress-fill');
    const txt = container.querySelector('.flow-progress-text');
    if (fill) fill.style.width = p + '%';
    if (txt) txt.textContent = p + '%';
  }

  // SENDING
  function sendMessage() {
    if (!conn || !conn.open) return;
    const text = elTextInput.value.trim();
    if (text) {
      conn.send({ type: 'text', content: text });
      appendMessage(text, 'self');
      elTextInput.value = '';
    }
    if (selectedFile && !sendingFile) {
      startSendingFile(selectedFile);
    }
  }

  function handleFileSelect(e) {
    const file = e.target.files[0];
    if (file) {
      selectedFile = file;
      elFileName.textContent = file.name;
      elFilePreview.style.display = 'flex';
    }
  }

  function clearFile() {
    selectedFile = null;
    elFileInput.value = '';
    elFilePreview.style.display = 'none';
  }

  // FILE CHUNKING
  let currentSendFile = null;
  let currentSendOffset = 0;
  function startSendingFile(file) {
    sendingFile = true;
    currentSendFile = file;
    currentSendOffset = 0;

    fileProgressEl = appendSystemMessage('Đang gửi: ' + file.name + '...');
    appendProgressBar(fileProgressEl);

    conn.send({
      type: 'file_start',
      info: { name: file.name, type: file.type, size: file.size }
    });
    clearFile();
    // Do NOT call sendNextChunk here. Wait for 'chunk_ack' from receiver!
  }

  function sendNextChunk() {
    if (!currentSendFile || !conn || !conn.open) return;

    if (currentSendOffset >= currentSendFile.size) {
      conn.send({ type: 'file_end' });
      updateProgressBar(fileProgressEl, 100);
      appendMessage('Đã gửi xong: ' + currentSendFile.name, 'self');
      sendingFile = false;
      currentSendFile = null;
      return;
    }

    const reader = new FileReader();
    const slice = currentSendFile.slice(currentSendOffset, currentSendOffset + CHUNK_SIZE);

    reader.onload = (e) => {
      conn.send({ type: 'file_chunk', chunk: e.target.result });
      currentSendOffset += CHUNK_SIZE;
      updateProgressBar(fileProgressEl, (currentSendOffset / currentSendFile.size) * 100);
    };
    reader.readAsArrayBuffer(slice);
  }

  function assembleFile() {
    const blob = new Blob(fileChunks, { type: fileInfo.type });
    const url = URL.createObjectURL(blob);

    const div = document.createElement('a');
    div.className = 'flow-msg-file peer';
    div.href = url;
    div.download = fileInfo.name;

    // SVG File icon
    const svgNS = 'http' + '://www.w3.org/2000/svg';
    const svg = document.createElementNS(svgNS, 'svg');
    svg.setAttribute('width', '20'); svg.setAttribute('height', '20'); svg.setAttribute('viewBox', '0 0 24 24');
    svg.setAttribute('fill', 'none'); svg.setAttribute('stroke', 'currentColor'); svg.setAttribute('stroke-width', '2');
    const path = document.createElementNS(svgNS, 'path'); path.setAttribute('d', 'M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4');
    const polyline = document.createElementNS(svgNS, 'polyline'); polyline.setAttribute('points', '7 10 12 15 17 10');
    const line = document.createElementNS(svgNS, 'line'); line.setAttribute('x1', '12'); line.setAttribute('y1', '15'); line.setAttribute('x2', '12'); line.setAttribute('y2', '3');
    svg.appendChild(path); svg.appendChild(polyline); svg.appendChild(line);

    const divContainer = document.createElement('div');
    const titleDiv = document.createElement('div');
    titleDiv.style.fontWeight = '600';
    titleDiv.textContent = fileInfo.name;
    const sizeDiv = document.createElement('div');
    sizeDiv.style.fontSize = '11px';
    sizeDiv.style.opacity = '0.8';
    sizeDiv.textContent = (fileInfo.size / 1024 / 1024).toFixed(2) + ' MB';

    divContainer.appendChild(titleDiv);
    divContainer.appendChild(sizeDiv);
    div.appendChild(svg);
    div.appendChild(divContainer);

    elMessages.appendChild(div);
    elMessages.scrollTop = elMessages.scrollHeight;

    // Send ACK to unblock sender
    conn.send({ type: 'chunk_ack' });

    fileChunks = [];
    fileInfo = null;
  }

  // CALLING (Audio/Video)
  async function startCall(videoEnabled) {
    if (!conn) return;
    try {
      localStream = await navigator.mediaDevices.getUserMedia({ video: videoEnabled, audio: true });
      const call = peer.call(conn.peer, localStream);
      setupCall(call, localStream);
    } catch (e) {
      handleMediaError(e);
    }
  }

  function handleIncomingCall(call) {
    if (confirm("Cuộc gọi đến từ " + call.peer + ". Chấp nhận?")) {
      navigator.mediaDevices.getUserMedia({ video: true, audio: true })
        .then(stream => {
          localStream = stream;
          call.answer(stream);
          setupCall(call, stream);
        })
        .catch(err => {
          // Fallback to audio only if video fails
          navigator.mediaDevices.getUserMedia({ video: false, audio: true })
            .then(stream => {
              localStream = stream;
              call.answer(stream);
              setupCall(call, stream);
            }).catch(e => {
              call.close();
              handleMediaError(e);
            });
        });
    } else {
      call.close();
    }
  }

  function handleMediaError(e) {
    const msg = e.message ? e.message.toLowerCase() : '';
    if (msg.includes('dismissed') || e.name === 'NotAllowedError' || e.name === 'PermissionDeniedError') {
      // Browsers often block permission prompts inside Side Panels
      if (typeof chrome !== 'undefined' && chrome.tabs) {
        chrome.tabs.create({ url: chrome.runtime.getURL('OS/html/permission.html') });
      } else {
        alert("Vui lòng cấp quyền Camera/Micro trong cài đặt trình duyệt!");
      }
    } else if (e.name === 'NotFoundError' || msg.includes('requested device not found')) {
      alert("Không tìm thấy Camera hoặc Micro trên máy của bạn (chưa cắm thiết bị hoặc bị hỏng).");
    } else {
      alert("Không thể truy cập Camera/Micro: " + e.message);
    }
  }

  function setupCall(call, stream) {
    currentCall = call;
    elCallUi.style.display = 'block';

    call.on('stream', remoteStream => {
      elRemoteVideo.srcObject = remoteStream;
    });

    call.on('close', () => {
      endCall();
    });
  }

  function endCall() {
    if (currentCall) {
      currentCall.close();
      currentCall = null;
    }
    if (localStream) {
      localStream.getTracks().forEach(t => t.stop());
      localStream = null;
    }
    elCallUi.style.display = 'none';
    elRemoteVideo.srcObject = null;
  }

  function toggleMute() {
    if (localStream) {
      const audioTrack = localStream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        elBtnMute.style.opacity = audioTrack.enabled ? '1' : '0.5';
      }
    }
  }

  function toggleVideo() {
    if (localStream) {
      const videoTrack = localStream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        elBtnVideoToggle.style.opacity = videoTrack.enabled ? '1' : '0.5';
      }
    }
  }

  // Init Hook
  const navObserver = new MutationObserver(() => {
    const tab = document.getElementById('tab-flow');
    if (tab && tab.classList.contains('active')) initFlow();
  });

  window.addEventListener('DOMContentLoaded', () => {
    const tab = document.getElementById('tab-flow');
    if (tab) {
      navObserver.observe(tab, { attributes: true, attributeFilter: ['class'] });
      if (tab.classList.contains('active')) initFlow();
    }
  });

})();
