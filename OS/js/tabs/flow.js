(() => {
  let peer = null;
  let conn = null;
  let isInitialized = false;

  const CHUNK_SIZE = 64 * 1024; // 64KB for manual chunking if needed, but we'll try native Blob first.

  // UI Elements
  let elMyId, elPartnerInput, elBtnConnect, elBtnCopy;
  let elConnectUi, elChatUi;
  let elRemoteId, elBtnDisconnect;
  let elMessages;
  let elTextInput, elBtnSend;
  let elFileInput, elFilePreview, elFileName, elFileClear;
  let elIncomingModal, elIncomingId, elBtnAccept, elBtnReject;

  let pendingConnection = null;
  let selectedFile = null;

  function initFlow() {
    if (isInitialized) return;
    
    elMyId = document.getElementById('flow-my-id');
    elPartnerInput = document.getElementById('flow-partner-input');
    elBtnConnect = document.getElementById('btn-flow-connect');
    elBtnCopy = document.getElementById('btn-flow-copy');
    elConnectUi = document.getElementById('flow-connect-ui');
    elChatUi = document.getElementById('flow-chat-ui');
    elRemoteId = document.getElementById('flow-remote-id');
    elBtnDisconnect = document.getElementById('btn-flow-disconnect');
    elMessages = document.getElementById('flow-messages');
    elTextInput = document.getElementById('flow-text-input');
    elBtnSend = document.getElementById('btn-flow-send');
    elFileInput = document.getElementById('flow-file-input');
    elFilePreview = document.getElementById('flow-file-preview');
    elFileName = document.getElementById('flow-file-name');
    elFileClear = document.getElementById('flow-file-clear');
    elIncomingModal = document.getElementById('flow-incoming-modal');
    elIncomingId = document.getElementById('flow-incoming-id');
    elBtnAccept = document.getElementById('btn-flow-accept');
    elBtnReject = document.getElementById('btn-flow-reject');

    if (!elMyId) return; // Not in DOM

    isInitialized = true;
    setupPeer();
    bindEvents();
  }

  function setupPeer() {
    try {
      // Create a random ID or let PeerJS assign one
      const id = 'sf-' + Math.random().toString(36).substr(2, 6);
      peer = new Peer(id, {
        debug: 2
      });

      peer.on('open', (id) => {
        elMyId.textContent = id;
      });

      peer.on('connection', (incomingConn) => {
        // Handle incoming connection
        handleIncomingConnection(incomingConn);
      });

      peer.on('error', (err) => {
        console.error('PeerJS error:', err);
        appendSystemMessage('Lỗi kết nối: ' + err.type);
      });
    } catch (e) {
      console.error(e);
      elMyId.textContent = "Error initializing WebRTC";
    }
  }

  function handleIncomingConnection(incomingConn) {
    if (conn && conn.open) {
      // Already connected, reject new ones
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
    
    outgoingConn.on('open', () => {
      setupConnection(outgoingConn);
    });
    
    outgoingConn.on('error', (err) => {
      alert('Không thể kết nối: ' + err);
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

    conn.on('data', (data) => {
      if (data.type === 'reject') {
        alert('Đối tác đã từ chối kết nối.');
        disconnect();
        return;
      }
      if (data.type === 'text') {
        appendMessage(data.content, 'peer');
      } else if (data.type === 'file') {
        receiveFile(data);
      }
    });

    conn.on('close', () => {
      appendSystemMessage('Đối tác đã ngắt kết nối.');
      setTimeout(disconnect, 2000);
    });
  }

  function disconnect() {
    if (conn) {
      conn.close();
      conn = null;
    }
    elConnectUi.style.display = 'flex';
    elChatUi.style.display = 'none';
    clearFile();
    elTextInput.value = '';
  }

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
  }

  function sendMessage() {
    if (!conn || !conn.open) return;
    
    const text = elTextInput.value.trim();
    if (text) {
      conn.send({ type: 'text', content: text });
      appendMessage(text, 'self');
      elTextInput.value = '';
    }

    if (selectedFile) {
      sendFile(selectedFile);
    }
  }

  function sendFile(file) {
    appendSystemMessage('Đang gửi file: ' + file.name + '...');
    const blob = new Blob([file], { type: file.type });
    
    // For V1, we use direct blob send via PeerJS. 
    // Works well for < 100MB. For larger, chunking is needed.
    conn.send({
      type: 'file',
      filetype: file.type,
      filename: file.name,
      filesize: file.size,
      content: blob
    });
    
    appendMessage('📁 Gửi: ' + file.name, 'self');
    clearFile();
  }

  function receiveFile(data) {
    appendSystemMessage('Đã nhận file: ' + data.filename);
    const blob = new Blob([data.content], { type: data.filetype });
    const url = URL.createObjectURL(blob);
    
    const div = document.createElement('a');
    div.className = 'flow-msg-file peer';
    div.href = url;
    div.download = data.filename;
    
    // Build DOM elements safely
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
    titleDiv.textContent = data.filename;
    const sizeDiv = document.createElement('div');
    sizeDiv.style.fontSize = '11px';
    sizeDiv.style.opacity = '0.8';
    sizeDiv.textContent = (data.filesize / 1024 / 1024).toFixed(2) + ' MB';
    divContainer.appendChild(titleDiv);
    divContainer.appendChild(sizeDiv);
    
    div.appendChild(svg);
    div.appendChild(divContainer);
    
    elMessages.appendChild(div);
    elMessages.scrollTop = elMessages.scrollHeight;
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

  function bindEvents() {
    elBtnCopy.addEventListener('click', () => {
      navigator.clipboard.writeText(elMyId.textContent);
      const original = elBtnCopy.textContent;
      elBtnCopy.textContent = '✓';
      setTimeout(() => elBtnCopy.textContent = original, 2000);
    });

    elBtnConnect.addEventListener('click', connectToPartner);
    elPartnerInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') connectToPartner();
    });

    elBtnDisconnect.addEventListener('click', disconnect);
    
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
  }

  // Bind to Tab Switcher in ScholarFlow
  // When user clicks the Flow tab, initialize if not done
  const navObserver = new MutationObserver(() => {
    const tab = document.getElementById('tab-flow');
    if (tab && tab.classList.contains('active')) {
      initFlow();
    }
  });
  
  window.addEventListener('DOMContentLoaded', () => {
    const tab = document.getElementById('tab-flow');
    if (tab) {
      navObserver.observe(tab, { attributes: true, attributeFilter: ['class'] });
      // If already active on load
      if (tab.classList.contains('active')) initFlow();
    }
  });

})();
