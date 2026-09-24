document.addEventListener("DOMContentLoaded", () => {
  const btnScratchpad = document.getElementById("btn-toggle-scratchpad");
  const btnHighlighter = document.getElementById("btn-toggle-highlighter");
  
  let hlActive = false;

  if (btnHighlighter) {
    btnHighlighter.addEventListener("click", () => {
      hlActive = !hlActive;
      
      // Update button UI
      if (hlActive) {
        btnHighlighter.classList.remove("success");
        btnHighlighter.classList.add("danger");
        btnHighlighter.textContent = typeof window.tContent === "function" ? window.tContent("highlighter_btn_off") : "Tắt Highlighter";
      } else {
        btnHighlighter.classList.remove("danger");
        btnHighlighter.classList.add("success");
        btnHighlighter.textContent = typeof window.tContent === "function" ? window.tContent("highlighter_btn_on") : "Bật Highlighter";
      }

      // Send message to active tab
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs[0]) {
          chrome.tabs.sendMessage(tabs[0].id, { command: "toggleHighlighter", active: hlActive }, (response) => {
            if (chrome.runtime.lastError) {
              console.error("Highlighter: " + chrome.runtime.lastError.message);
              // Handle error: usually means content script is not injected
            } else {
              console.log("Highlighter toggled:", response);
            }
          });
        }
      });
    });
  }
});
