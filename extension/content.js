// ▼▼▼ 正しいGASのURL（script.google.com...）を入れてください ▼▼▼
const GAS_API_URL = ""; 
// ▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲

let currentVideoId = "";

// 即座に初期化
initPanel();
checkUrlChange();

function checkUrlChange() {
  setInterval(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const videoId = urlParams.get('v');
    if (videoId && videoId !== currentVideoId) {
      currentVideoId = videoId;
      loadMemos(videoId);
    }
  }, 1000);
}

function initPanel() {
  if (document.getElementById('yt-memo-panel')) return;

  const body = document.body;

  // パネル本体（ヘッダーなし、シンプル版）
  const panel = document.createElement('div');
  panel.id = 'yt-memo-panel';
  panel.classList.add('hidden'); // 最初は隠す
  panel.innerHTML = `
    <div id="yt-memo-input-area">
      <textarea id="yt-memo-text" placeholder="メモを入力 (Enterで保存)"></textarea>
      <div id="yt-memo-status" style="font-size:11px; color:#666; text-align:right;">Ctrl + M で開閉</div>
    </div>
    <div id="yt-memo-list"></div>
  `;
  body.appendChild(panel);

  // トグルボタン（ペンのユニコードアイコン）
  const toggleBtn = document.createElement('div');
  toggleBtn.id = 'yt-memo-toggle';
  toggleBtn.innerHTML = "&#9998;"; // ✎ の文字コード
  
  // ボタンクリック時の動作
  toggleBtn.onclick = () => togglePanel();
  
  // パネルの直後にボタンを配置（CSSの隣接セレクタのため）
  panel.after(toggleBtn);

  // イベント設定
  setupEvents();
}

function togglePanel() {
  const panel = document.getElementById('yt-memo-panel');
  const textarea = document.getElementById('yt-memo-text');
  
  panel.classList.toggle('hidden');
  
  // 開いたときは入力欄にフォーカス
  if (!panel.classList.contains('hidden')) {
    textarea.focus();
  }
}

function setupEvents() {
  const textarea = document.getElementById('yt-memo-text');

  // ショートカットキー (Ctrl + M)
  document.addEventListener('keydown', (e) => {
    // Macの場合は Command+M も反応させたい場合: (e.ctrlKey || e.metaKey)
    if (e.ctrlKey && e.code === 'KeyM') {
      e.preventDefault(); // デフォルト動作無効化
      togglePanel();
    }
  });

  // Enterキーで送信
  textarea.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      saveMemo(textarea.value);
      textarea.value = '';
    }
  });
}

// --- 通信処理 ---

function saveMemo(text) {
  if (!text.trim()) return;
  const video = document.querySelector('video');
  const currentTime = video ? video.currentTime : 0;
  const targetTime = Math.max(0, Math.floor(currentTime - 5)); 
  const videoId = new URLSearchParams(window.location.search).get('v');
  const link = `https://www.youtube.com/watch?v=${videoId}&t=${targetTime}s`;
  const title = document.title.replace(" - YouTube", "");

  addMemoToList({
    timeDisplay: formatTime(targetTime),
    memo: text,
    targetTime: targetTime 
  }, true);

  const statusDiv = document.getElementById('yt-memo-status');
  const originalMsg = statusDiv.innerText;
  statusDiv.innerText = "保存中...";
  statusDiv.style.color = "#3ea6ff";
  
  fetch(GAS_API_URL, {
    method: 'POST',
    body: JSON.stringify({ memo: text, title: title, link: link })
  })
  .then(res => res.json())
  .then(() => {
    statusDiv.innerText = "保存完了";
    setTimeout(() => {
      statusDiv.innerText = "Ctrl + M で開閉";
      statusDiv.style.color = "#666";
    }, 2000);
  })
  .catch(err => {
    statusDiv.innerText = "エラー";
    statusDiv.style.color = "red";
    console.error(err);
  });
}

function loadMemos(videoId) {
  const listDiv = document.getElementById('yt-memo-list');
  listDiv.innerHTML = '<div style="text-align:center; color:#666; padding:20px;">読み込み中...</div>';

  fetch(`${GAS_API_URL}?videoId=${videoId}`)
    .then(res => res.json())
    .then(data => {
      listDiv.innerHTML = '';
      if (data.length === 0) {
         listDiv.innerHTML = '<div style="text-align:center; color:#444; padding:20px;">メモはありません</div>';
      }
      data.forEach(item => {
        const match = item.link.match(/t=(\d+)s/);
        item.targetTime = match ? parseInt(match[1]) : 0;
        addMemoToList(item);
      });
    })
    .catch(err => console.error(err));
}

function addMemoToList(item, prepend = false) {
  const listDiv = document.getElementById('yt-memo-list');
  const row = document.createElement('div');
  row.className = 'memo-item';
  row.innerHTML = `
    <div class="memo-time-btn">[${item.timeDisplay}]</div>
    <div class="memo-content">${item.memo}</div>
  `;
  row.querySelector('.memo-time-btn').onclick = () => {
    const video = document.querySelector('video');
    if (video) {
      video.currentTime = item.targetTime;
      video.play();
    }
  };
  if (prepend) {
    if(listDiv.querySelector('div')?.innerText === "メモはありません") listDiv.innerHTML = "";
    listDiv.insertBefore(row, listDiv.firstChild);
    listDiv.scrollTop = 0;
  } else {
    listDiv.appendChild(row);
  }
}

function formatTime(seconds) {
  const min = Math.floor(seconds / 60);
  const sec = seconds % 60;
  return `${min}:${sec.toString().padStart(2, '0')}`;
}