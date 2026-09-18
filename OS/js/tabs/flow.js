// ---------------------------------------------------------------------------
// ScholarFlow module: OS/js/tabs/flow.js
// V3.5: 1-to-1 Direct P2P, Clean UI, QR Code Sharing, Google Drive Intermediary
// ---------------------------------------------------------------------------
function initFlowTab() {
  if (typeof Peer === "undefined") {
    console.error("PeerJS not loaded");
    return;
  }

  const safeStorage = {
    get(key) {
      try { return window.localStorage ? window.localStorage.getItem(key) : null; } catch(e) { return null; }
    },
    set(key, val) {
      try { if (window.localStorage) window.localStorage.setItem(key, val); } catch(e) {}
    },
    remove(key) {
      try { if (window.localStorage) window.localStorage.removeItem(key); } catch(e) {}
    }
  };

  let peer = null;
  let myId = null;
  let myName = safeStorage.get("flow_name") || "";
  let activeConn = null;
  let pendingConnection = null;
  let currentFile = null;
  let receivingFiles = {};
  let currentQrValue = "";

  let chatHistory = [];
  try {
    chatHistory = JSON.parse(safeStorage.get("flow_chat_history") || "[]");
  } catch (e) {
    chatHistory = [];
  }

  // UI Elements
  const elIdleUI = document.getElementById("flow-idle-ui");
  const elChatUI = document.getElementById("flow-chat-ui");
  const elMyId = document.getElementById("flow-my-id");
  const elPartnerInput = document.getElementById("flow-partner-input");
  const elNameInput = document.getElementById("flow-name-input");
  const elDriveInput = document.getElementById("flow-drive-input");

  const elRemoteId = document.getElementById("flow-remote-id");
  const elMessages = document.getElementById("flow-messages");
  const elTextInput = document.getElementById("flow-text-input");
  const elFileInput = document.getElementById("flow-file-input");

  const elIncomingModal = document.getElementById("flow-incoming-modal");
  const elIncomingName = document.getElementById("flow-incoming-name");

  const elPinnedDrive = document.getElementById("flow-pinned-drive");
  const elPinnedDriveLink = document.getElementById("flow-pinned-drive-link");

  // QR Modal Elements
  const elQrModal = document.getElementById("flow-qr-modal");
  const elQrCanvas = document.getElementById("flow-qr-canvas");
  const elQrTitle = document.getElementById("flow-qr-modal-title");
  const elQrDesc = document.getElementById("flow-qr-modal-desc");
  const btnQrClose = document.getElementById("btn-flow-qr-close");
  const btnQrCopy = document.getElementById("btn-flow-qr-copy-val");
  const btnOpenQR = document.getElementById("btn-flow-qr");

  if (elNameInput) elNameInput.value = myName;

  function saveHistory() {
    safeStorage.set("flow_chat_history", JSON.stringify(chatHistory));
  }

  function renderHistory() {
    if (!elMessages) return;
    elMessages.innerHTML = "";
    chatHistory.forEach((msg) => {
      appendMessageHTML(msg);
    });
    scrollToBottom();
  }

  function scrollToBottom() {
    setTimeout(() => {
      if (elMessages) elMessages.scrollTop = elMessages.scrollHeight;
    }, 50);
  }

  function appendSystemMessage(text) {
    const msg = { type: "system", text: text, time: Date.now() };
    chatHistory.push(msg);
    saveHistory();
    appendMessageHTML(msg);
    scrollToBottom();
  }

  function appendUserMessage(senderName, text, isMe) {
    const msg = { type: "chat", sender: senderName, text: text, isMe: isMe, time: Date.now() };
    chatHistory.push(msg);
    saveHistory();
    appendMessageHTML(msg);
    scrollToBottom();
  }

  function appendFileMessage(senderName, fileName, fileSize, isMe, fileId) {
    const msg = { type: "file", sender: senderName, fileName, fileSize, isMe, time: Date.now() };
    chatHistory.push(msg);
    saveHistory();
    renderFileHTML(senderName, fileName, fileSize, isMe, fileId);
    scrollToBottom();
  }

  // --- Google Drive Link Helpers ---
  function extractGoogleDriveInfo(url) {
    const fileMatch = url.match(/(?:drive\.google\.com\/(?:file\/d\/|open\?id=)|docs\.google\.com\/(?:document|spreadsheets|presentation)\/d\/)([a-zA-Z0-9_-]+)/);
    if (fileMatch) {
      const fileId = fileMatch[1];
      return {
        type: "file",
        fileId: fileId,
        directUrl: "https://drive.google.com/uc?export=download&id=" + fileId,
        viewUrl: url
      };
    }
    const folderMatch = url.match(/drive\.google\.com\/drive\/folders\/([a-zA-Z0-9_-]+)/);
    if (folderMatch) {
      return {
        type: "folder",
        folderId: folderMatch[1],
        viewUrl: url
      };
    }
    return null;
  }

  function renderDriveCard(driveInfo) {
    const card = document.createElement("div");
    card.className = "flow-drive-card";
    card.style.cssText = "background: rgba(15, 23, 42, 0.7); border: 1px solid rgba(56, 189, 248, 0.3); border-radius: 10px; padding: 10px; margin-top: 6px; display: flex; flex-direction: column; gap: 6px;";

    const header = document.createElement("div");
    header.style.cssText = "display: flex; align-items: center; gap: 6px; font-size: 11.5px; font-weight: 700; color: #38bdf8;";
    const icon = document.createElement("span");
    icon.textContent = "☁️";
    header.appendChild(icon);
    const title = document.createElement("span");
    title.textContent = " GOOGLE DRIVE (LƯU TRỮ TRUNG GIAN)";
    header.appendChild(title);
    card.appendChild(header);

    if (driveInfo.type === "file") {
      const desc = document.createElement("div");
      desc.style.cssText = "font-size: 11px; color: #94a3b8; word-break: break-all;";
      desc.textContent = "Mã tệp: " + driveInfo.fileId;
      card.appendChild(desc);

      const btnRow = document.createElement("div");
      btnRow.style.cssText = "display: flex; gap: 6px; margin-top: 4px; flex-wrap: wrap;";

      const directBtn = document.createElement("a");
      directBtn.href = driveInfo.directUrl;
      directBtn.target = "_blank";
      directBtn.download = "";
      directBtn.className = "flow-btn-primary";
      directBtn.style.cssText = "font-size: 11.5px; padding: 6px 12px; text-decoration: none; border-radius: 6px; display: inline-flex; align-items: center; gap: 4px;";
      directBtn.textContent = "⬇️ Tải trực tiếp về máy";
      btnRow.appendChild(directBtn);

      const viewBtn = document.createElement("a");
      viewBtn.href = driveInfo.viewUrl;
      viewBtn.target = "_blank";
      viewBtn.className = "flow-btn-secondary";
      viewBtn.style.cssText = "font-size: 11px; padding: 6px 10px; text-decoration: none; border-radius: 6px;";
      viewBtn.textContent = "↗️ Mở Drive";
      btnRow.appendChild(viewBtn);

      card.appendChild(btnRow);
    } else if (driveInfo.type === "folder") {
      const desc = document.createElement("div");
      desc.style.cssText = "font-size: 11px; color: #94a3b8;";
      desc.textContent = "Thư mục lưu trữ chia sẻ chung";
      card.appendChild(desc);

      const btnRow = document.createElement("div");
      btnRow.style.cssText = "display: flex; gap: 6px; margin-top: 4px;";

      const viewBtn = document.createElement("a");
      viewBtn.href = driveInfo.viewUrl;
      viewBtn.target = "_blank";
      viewBtn.className = "flow-btn-primary";
      viewBtn.style.cssText = "font-size: 11.5px; padding: 6px 12px; text-decoration: none; border-radius: 6px; display: inline-flex; align-items: center; gap: 4px;";
      viewBtn.textContent = "↗️ Mở Thư mục trên Drive";
      btnRow.appendChild(viewBtn);

      card.appendChild(btnRow);
    }
    return card;
  }

  // --- Message HTML Rendering ---
  function appendMessageHTML(msg) {
    const div = document.createElement("div");
    if (msg.type === "system") {
      div.className = "flow-system-badge";
      div.textContent = msg.text;
    } else if (msg.type === "chat") {
      div.className = msg.isMe ? "flow-bubble me" : "flow-bubble remote";
      const sender = document.createElement("div");
      sender.className = "flow-bubble-sender";
      sender.textContent = msg.isMe ? "Tôi" : msg.sender;
      div.appendChild(sender);

      const span = document.createElement("span");
      const urlRegex = /(https?:\/\/[^\s]+)/g;
      let detectedDriveInfo = null;

      if (urlRegex.test(msg.text)) {
        const parts = msg.text.split(urlRegex);
        parts.forEach((part) => {
          if (urlRegex.test(part)) {
            const driveInfo = extractGoogleDriveInfo(part);
            if (driveInfo) detectedDriveInfo = driveInfo;

            const a = document.createElement("a");
            a.href = part;
            a.target = "_blank";
            a.textContent = part;
            a.style.color = msg.isMe ? "#fff" : "#38bdf8";
            a.style.textDecoration = "underline";
            span.appendChild(a);
          } else {
            span.appendChild(document.createTextNode(part));
          }
        });
      } else {
        span.textContent = msg.text;
      }
      div.appendChild(span);

      if (detectedDriveInfo) {
        div.appendChild(renderDriveCard(detectedDriveInfo));
      }
    } else if (msg.type === "file") {
      div.className = msg.isMe ? "flow-bubble me" : "flow-bubble remote";
      const sender = document.createElement("div");
      sender.className = "flow-bubble-sender";
      sender.textContent = msg.isMe ? "Tôi" : msg.sender;
      div.appendChild(sender);

      const card = document.createElement("div");
      card.className = "flow-file-card";
      const info = document.createElement("div");
      info.className = "flow-file-info";

      const icon = document.createElement("div");
      icon.className = "flow-file-icon";
      icon.textContent = "📁";
      info.appendChild(icon);

      const meta = document.createElement("div");
      meta.className = "flow-file-meta";
      const name = document.createElement("div");
      name.className = "flow-file-name";
      name.textContent = msg.fileName;
      name.title = msg.fileName;
      meta.appendChild(name);

      const size = document.createElement("div");
      size.className = "flow-file-size";
      const sizeKB = Math.round(msg.fileSize / 1024);
      size.textContent = (sizeKB > 1024 ? (sizeKB / 1024).toFixed(1) + " MB" : sizeKB + " KB") + " • Đã gửi thành công";
      meta.appendChild(size);

      info.appendChild(meta);
      card.appendChild(info);
      div.appendChild(card);
    }
    elMessages.appendChild(div);
  }

  function renderFileHTML(senderName, fileName, fileSize, isMe, fileId) {
    const div = document.createElement("div");
    div.className = isMe ? "flow-bubble me" : "flow-bubble remote";
    div.id = "file-msg-" + fileId;

    const sender = document.createElement("div");
    sender.className = "flow-bubble-sender";
    sender.textContent = isMe ? "Tôi" : senderName;
    div.appendChild(sender);

    const card = document.createElement("div");
    card.className = "flow-file-card";

    const info = document.createElement("div");
    info.className = "flow-file-info";

    const icon = document.createElement("div");
    icon.className = "flow-file-icon";
    icon.textContent = "📁";
    info.appendChild(icon);

    const meta = document.createElement("div");
    meta.className = "flow-file-meta";

    const name = document.createElement("div");
    name.className = "flow-file-name";
    name.textContent = fileName;
    name.title = fileName;
    meta.appendChild(name);

    const size = document.createElement("div");
    size.className = "flow-file-size";
    size.id = "file-status-" + fileId;
    const sizeKB = Math.round(fileSize / 1024);
    size.textContent = (sizeKB > 1024 ? (sizeKB / 1024).toFixed(1) + " MB" : sizeKB + " KB") + " • Đang truyền...";
    meta.appendChild(size);

    info.appendChild(meta);
    card.appendChild(info);

    const wrap = document.createElement("div");
    wrap.className = "flow-progress-bar-wrap";

    const prog = document.createElement("div");
    prog.id = "prog-" + fileId;
    prog.className = "flow-progress-bar";
    wrap.appendChild(prog);
    card.appendChild(wrap);

    div.appendChild(card);
    elMessages.appendChild(div);
  }

  // --- 1-to-1 Connection State Management ---
  function updateUIState() {
    if (activeConn && activeConn.open) {
      if (elIdleUI) elIdleUI.style.display = "none";
      if (elChatUI) elChatUI.style.display = "flex";
      if (elNameInput) elNameInput.disabled = true;

      myName = (elNameInput ? elNameInput.value.trim() : "") || "Guest";
      safeStorage.set("flow_name", myName);

      const partnerName = activeConn.metadata?.senderName || activeConn.peer;
      if (elRemoteId) elRemoteId.textContent = partnerName;
    } else {
      if (elIdleUI) elIdleUI.style.display = "flex";
      if (elChatUI) elChatUI.style.display = "none";
      if (elNameInput) elNameInput.disabled = false;
    }
  }

  function initPeer(forceNew = false) {
    let savedId = safeStorage.get("flow_peer_id");
    if (forceNew || !savedId) {
      peer = new Peer();
    } else {
      peer = new Peer(savedId);
    }

    let initTimeout = setTimeout(() => {
      if (elMyId && elMyId.textContent === "Đang khởi tạo...") {
        console.warn("PeerJS timeout, creating fresh ID...");
        safeStorage.remove("flow_peer_id");
        try { peer.destroy(); } catch (e) {}
        initPeer(true);
      }
    }, 5000);

    peer.on("open", (id) => {
      clearTimeout(initTimeout);
      myId = id;
      if (elMyId) elMyId.textContent = id;
      safeStorage.set("flow_peer_id", id);
    });

    peer.on("connection", (c) => {
      pendingConnection = c;
      const remoteName = c.metadata?.senderName || c.peer;
      if (elIncomingName) elIncomingName.textContent = remoteName;
      if (elIncomingModal) elIncomingModal.style.display = "flex";

      c.on("data", (data) => handleData(data, c));
      c.on("close", () => {
        if (activeConn === c) {
          activeConn = null;
          appendSystemMessage(`${remoteName} đã ngắt kết nối.`);
          updateUIState();
        }
      });
      c.on("error", (err) => {
        console.error("Connection error:", err);
      });
    });

    peer.on("error", (err) => {
      console.error("PeerJS error:", err);
      if (err.type === "unavailable-id" && savedId) {
        safeStorage.remove("flow_peer_id");
        initPeer(true);
      } else {
        appendSystemMessage(`Lưu ý kết nối: ${err.type}`);
      }
    });
  }

  function handleData(data, c) {
    const senderName = c.metadata?.senderName || c.peer;
    if (data.type === "handshake_accept") {
      appendSystemMessage(`${senderName} đã chấp nhận kết nối.`);
      activeConn = c;
      updateUIState();
    } else if (data.type === "handshake_reject") {
      alert(`${senderName} đã từ chối kết nối.`);
      c.close();
      activeConn = null;
      updateUIState();
    } else if (data.type === "chat") {
      appendUserMessage(senderName, data.text, false);
    } else if (data.type === "drive_link") {
      if (elPinnedDrive && elPinnedDriveLink) {
        elPinnedDrive.style.display = "flex";
        elPinnedDriveLink.href = data.url;
        elPinnedDriveLink.textContent = "🔗 " + data.url;
      }
      appendSystemMessage(`${senderName} đã ghim link Google Drive.`);
    } else if (data.type === "file_start") {
      receivingFiles[data.fileId] = {
        name: data.fileName,
        size: data.fileSize,
        chunks: [],
        receivedSize: 0,
        senderName: senderName
      };
      appendFileMessage(senderName, data.fileName, data.fileSize, false, data.fileId);
      c.send({ type: "chunk_ack", fileId: data.fileId });
    } else if (data.type === "file_chunk") {
      const rf = receivingFiles[data.fileId];
      if (!rf) return;
      rf.chunks.push(data.chunk);
      rf.receivedSize += data.chunk.byteLength;

      const prog = document.getElementById("prog-" + data.fileId);
      if (prog) prog.style.width = (rf.receivedSize / rf.size * 100) + "%";

      if (rf.receivedSize >= rf.size) {
        const blob = new Blob(rf.chunks);
        const url = URL.createObjectURL(blob);

        const statusEl = document.getElementById("file-status-" + data.fileId);
        if (statusEl) {
          statusEl.textContent = "Đã nhận xong • Sẵn sàng tải";
        }

        const cardEl = document.getElementById("file-msg-" + data.fileId);
        if (cardEl) {
          const dlBtn = document.createElement("button");
          dlBtn.className = "flow-btn-primary";
          dlBtn.style.cssText = "margin-top: 8px; font-size: 11.5px; padding: 5px 12px; cursor: pointer; border-radius: 6px; display: inline-flex; align-items: center; gap: 5px; width: fit-content;";
          dlBtn.textContent = "⬇️ Tải về";
          dlBtn.onclick = () => {
            const a = document.createElement("a");
            a.href = url;
            a.download = rf.name;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
          };
          cardEl.appendChild(dlBtn);
        }

        appendSystemMessage(`Tệp tin "${rf.name}" đã sẵn sàng để tải về.`);
        delete receivingFiles[data.fileId];
      } else {
        c.send({ type: "chunk_ack", fileId: data.fileId });
      }
    } else if (data.type === "chunk_ack") {
      sendNextChunk(data.fileId, c);
    }
  }

  // --- Handshake Actions ---
  const btnAccept = document.getElementById("btn-flow-accept");
  if (btnAccept) {
    btnAccept.addEventListener("click", () => {
      if (pendingConnection) {
        if (activeConn) {
          try { activeConn.close(); } catch (e) {}
        }
        pendingConnection.send({ type: "handshake_accept" });
        activeConn = pendingConnection;
        if (elIncomingModal) elIncomingModal.style.display = "none";
        appendSystemMessage(`Bạn đã kết nối trực tiếp với ${pendingConnection.metadata?.senderName || pendingConnection.peer}`);
        updateUIState();

        if (elDriveInput && elDriveInput.value) {
          pendingConnection.send({ type: "drive_link", url: elDriveInput.value });
        }
        pendingConnection = null;
      }
    });
  }

  const btnReject = document.getElementById("btn-flow-reject");
  if (btnReject) {
    btnReject.addEventListener("click", () => {
      if (pendingConnection) {
        pendingConnection.send({ type: "handshake_reject" });
        pendingConnection.close();
        if (elIncomingModal) elIncomingModal.style.display = "none";
        pendingConnection = null;
      }
    });
  }

  // --- Connect / Disconnect ---
  const btnConnect = document.getElementById("btn-flow-connect");
  if (btnConnect) {
    btnConnect.addEventListener("click", () => {
      myName = (elNameInput ? elNameInput.value.trim() : "") || "Guest";
      safeStorage.set("flow_name", myName);

      const partnerId = elPartnerInput ? elPartnerInput.value.trim() : "";
      if (!partnerId) return;
      if (partnerId === myId) {
        alert("Không thể tự kết nối với chính mình.");
        return;
      }

      if (elNameInput) elNameInput.disabled = true;

      const c = peer.connect(partnerId, { metadata: { senderName: myName } });
      appendSystemMessage(`Đang yêu cầu kết nối tới ${partnerId}... (Chờ đối phương chấp nhận)`);

      c.on("data", (data) => handleData(data, c));
      c.on("close", () => {
        if (activeConn === c) {
          activeConn = null;
          updateUIState();
        }
      });
      c.on("error", (err) => {
        alert("Lỗi kết nối: " + (err.message || err));
      });
    });
  }

  const btnDisconnect = document.getElementById("btn-flow-disconnect");
  if (btnDisconnect) {
    btnDisconnect.addEventListener("click", () => {
      if (activeConn) {
        try { activeConn.close(); } catch (e) {}
        activeConn = null;
      }
      updateUIState();
      appendSystemMessage("Đã ngắt kết nối trò chuyện.");
    });
  }

  // --- Send Chat & Files ---
  const btnSend = document.getElementById("btn-flow-send");
  if (btnSend) btnSend.addEventListener("click", sendMessage);

  if (elTextInput) {
    elTextInput.addEventListener("keypress", (e) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        sendMessage();
      }
    });
  }

  function sendMessage() {
    if (!activeConn || !activeConn.open) {
      alert("Chưa có kết nối nào đang mở!");
      return;
    }

    const text = elTextInput ? elTextInput.value.trim() : "";
    if (!text && !currentFile) return;

    if (text) {
      activeConn.send({ type: "chat", text: text });
      appendUserMessage(myName, text, true);
      if (elTextInput) elTextInput.value = "";
    }

    if (currentFile) {
      const fileId = Date.now().toString();
      appendFileMessage(myName, currentFile.name, currentFile.size, true, fileId);

      activeConn.sendingFile = {
        file: currentFile,
        offset: 0,
        chunkSize: 256 * 1024
      };
      activeConn.send({ type: "file_start", fileName: currentFile.name, fileSize: currentFile.size, fileId: fileId });
      clearFilePreview();
    }
  }

  function sendNextChunk(fileId, c) {
    if (!c || !c.sendingFile) return;
    const { file, offset, chunkSize } = c.sendingFile;
    const slice = file.slice(offset, offset + chunkSize);
    slice.arrayBuffer().then((buffer) => {
      c.send({ type: "file_chunk", fileId: fileId, chunk: buffer });
      c.sendingFile.offset += buffer.byteLength;

      const prog = document.getElementById("prog-" + fileId);
      if (prog) prog.style.width = (c.sendingFile.offset / file.size * 100) + "%";

      if (c.sendingFile.offset >= file.size) {
        delete c.sendingFile;
        const statusEl = document.getElementById("file-status-" + fileId);
        if (statusEl) {
          statusEl.textContent = "Đã gửi thành công ✔";
        }
      }
    });
  }

  // --- Drive Pinned Link ---
  const btnSetDrive = document.getElementById("btn-flow-set-drive");
  if (btnSetDrive) {
    btnSetDrive.addEventListener("click", () => {
      const link = elDriveInput ? elDriveInput.value.trim() : "";
      if (link) {
        if (elPinnedDrive && elPinnedDriveLink) {
          elPinnedDrive.style.display = "flex";
          elPinnedDriveLink.href = link;
          elPinnedDriveLink.textContent = "🔗 " + link;
        }
        if (activeConn && activeConn.open) {
          activeConn.send({ type: "drive_link", url: link });
        }
        appendSystemMessage("Đã ghim link Google Drive vào phòng chat.");
      }
    });
  }

  // --- File Drag & Drop & Attach ---
  const elFilePreview = document.getElementById("flow-file-preview");
  const elFileName = document.getElementById("flow-file-name");

  if (elFileInput) {
    elFileInput.addEventListener("change", () => {
      if (elFileInput.files.length > 0) {
        currentFile = elFileInput.files[0];
        if (elFileName) elFileName.textContent = currentFile.name;
        if (elFilePreview) elFilePreview.style.display = "flex";
      }
    });
  }

  const btnFileClear = document.getElementById("flow-file-clear");
  if (btnFileClear) btnFileClear.addEventListener("click", clearFilePreview);

  function clearFilePreview() {
    currentFile = null;
    if (elFileInput) elFileInput.value = "";
    if (elFilePreview) elFilePreview.style.display = "none";
  }

  if (elMessages) {
    elMessages.addEventListener("dragover", (e) => {
      e.preventDefault();
      elMessages.style.border = "2px dashed var(--primary)";
    });
    elMessages.addEventListener("dragleave", (e) => {
      e.preventDefault();
      elMessages.style.border = "none";
    });
    elMessages.addEventListener("drop", (e) => {
      e.preventDefault();
      elMessages.style.border = "none";
      if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
        currentFile = e.dataTransfer.files[0];
        if (elFileName) elFileName.textContent = currentFile.name;
        if (elFilePreview) elFilePreview.style.display = "flex";
      }
    });
  }
  // --- Utility Actions ---
  const btnCopy = document.getElementById("btn-flow-copy");
  if (btnCopy) {
    btnCopy.addEventListener("click", () => {
      if (myId) navigator.clipboard.writeText(myId);
    });
  }

  const btnRefresh = document.getElementById("btn-flow-refresh");
  if (btnRefresh) {
    btnRefresh.addEventListener("click", () => {
      initPeer(true);
    });
  }

  const btnPopout = document.getElementById("btn-flow-popout");
  if (btnPopout) {
    btnPopout.addEventListener("click", () => {
      if (typeof chrome !== "undefined" && chrome.tabs) {
        chrome.tabs.create({ url: chrome.runtime.getURL("OS/html/sidebar.html?tab=flow") });
      }
    });
  }

  const btnClear = document.getElementById("btn-flow-clear");
  if (btnClear) {
    btnClear.addEventListener("click", () => {
      chatHistory = [];
      saveHistory();
      renderHistory();
    });
  }

  const btnExport = document.getElementById("btn-flow-export");
  if (btnExport) {
    btnExport.addEventListener("click", () => {
      let txt = "ScholarFlow Chat History (1-to-1 P2P)\n\n";
      chatHistory.forEach((m) => {
        let time = new Date(m.time).toLocaleString();
        if (m.type === "system") txt += `[${time}] SYSTEM: ${m.text}\n`;
        else if (m.type === "chat") txt += `[${time}] ${m.isMe ? "Tôi" : m.sender}: ${m.text}\n`;
        else if (m.type === "file") txt += `[${time}] ${m.isMe ? "Tôi" : m.sender} gửi file: ${m.fileName}\n`;
      });
      const blob = new Blob([txt], { type: "text/plain" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "Chat_History.txt";
      a.click();
    });
  }

  // Start initialization
  renderHistory();
  initPeer();
}

// Auto-init logic
if (typeof window.initFlowTab === "undefined") {
  window.initFlowTab = initFlowTab;
}
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initFlowTab);
} else {
  initFlowTab();
}
