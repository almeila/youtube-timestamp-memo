let currentVideoId = "";
let observer = null;

// 1. 読み込み完了時に実行
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', startObserver);
} else {
    startObserver();
}

function startObserver() {
    // 初回実行
    main();

    // 2. 強力な監視 (MutationObserver)
    // 画面の中身(body)が書き換わったら、すかさず main() を呼ぶ
    observer = new MutationObserver(() => {
        main();
    });
    observer.observe(document.body, { childList: true, subtree: true });
}

function main() {
  // URLから動画IDを取得
  const urlParams = new URLSearchParams(window.location.search);
  const videoId = urlParams.get('v');

  // 動画ページでない場合
  if (!videoId) {
    const panel = document.getElementById('yt-memo-panel');
    const toggleBtn = document.getElementById('yt-memo-toggle');
    // パネルがあれば隠す（トップページなどで邪魔にならないように）
    if (panel && !panel.classList.contains('hidden')) panel.classList.add('hidden');
    if (toggleBtn) toggleBtn.style.display = 'none';
    return;
  }

  // --- ここから動画ページ用の処理 ---

  // パネルが消えていたら（Youtubeの画面遷移で消されたら）即座に再生成
  if (!document.getElementById('yt-memo-panel')) {
    initPanel();
  } else {
    // 存在する場合、トグルボタンを表示状態にする
    const toggleBtn = document.getElementById('yt-memo-toggle');
    if (toggleBtn && toggleBtn.style.display === 'none') {
        toggleBtn.style.display = 'flex';
    }
  }

  // 動画が変わったことを検知してデータを読み込む
  if (videoId !== currentVideoId) {
    currentVideoId = videoId;
    loadMemos(videoId);
  }
}

function initPanel() {
  if (document.getElementById('yt-memo-panel')) return;

  const body = document.body;
  const panel = document.createElement('div');
  panel.id = 'yt-memo-panel';
  panel.classList.add('hidden');

  panel.innerHTML = `
    <div id="yt-memo-header">
      <span>Youtube Memo</span>
      <span id="yt-memo-close">×</span>
    </div>

    <div id="yt-memo-input-area">
      <textarea id="yt-memo-text" placeholder="メモを入力 (Enterで保存)"></textarea>
      
      <div class="yt-memo-footer">
        <a id="yt-memo-sheet-link" class="disabled" target="_blank">シートを開く</a>
        <span id="yt-memo-status">Ctrl + M で開閉</span>
      </div>
    </div>

    <div id="yt-memo-list"></div>
  `;

  body.appendChild(panel);

  const toggleBtn = document.createElement('div');
  toggleBtn.id = 'yt-memo-toggle';
  toggleBtn.innerHTML = "&#9998;";
  toggleBtn.onclick = () => togglePanel();
  body.appendChild(toggleBtn);

  document.getElementById('yt-memo-close').onclick = () => {
    panel.classList.add('hidden');
  };

  setupEvents();
}

function togglePanel() {
  const panel = document.getElementById('yt-memo-panel');
  const textarea = document.getElementById('yt-memo-text');
  if (!panel) { initPanel(); return; }
  
  panel.classList.toggle('hidden');
  if (!panel.classList.contains('hidden')) textarea.focus();
}

function setupEvents() {
  const textarea = document.getElementById('yt-memo-text');
  if(!textarea) return;

  // documentへのイベントは重複登録しないように一度削除してから登録するか、
  // 下記のようにフラグ管理するのが理想ですが、簡易的にonkeydownプロパティ上書きで対応
  document.onkeydown = (e) => {
    // 動画ページ以外では反応させない
    if (!window.location.href.includes('watch?v=')) return;
    if (e.ctrlKey && e.code === 'KeyM') {
      e.preventDefault();
      togglePanel();
    }
  };

  textarea.onkeydown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      saveMemo(textarea.value);
      textarea.value = '';
    }
  };
}

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
  const originalMsg = "Ctrl + M で開閉";
  
  statusDiv.innerText = "保存中...";
  statusDiv.style.color = "#3ea6ff";

  if (typeof GAS_API_URL === 'undefined') {
    statusDiv.innerText = "設定エラー";
    statusDiv.style.color = "red";
    return;
  }

  fetch(GAS_API_URL, {
    method: 'POST',
    body: JSON.stringify({ memo: text, title: title, link: link })
  })
  .then(res => res.json())
  .then(() => {
    statusDiv.innerText = "保存完了";
    setTimeout(() => { 
      statusDiv.innerText = originalMsg; 
      statusDiv.style.color = "#aaa";
    }, 2000);
  })
  .catch(err => {
    console.error(err);
    statusDiv.innerText = "エラー";
    statusDiv.style.color = "red";
  });
}

function loadMemos(videoId) {
  const listDiv = document.getElementById('yt-memo-list');
  // MutationObserverが速すぎて要素生成前に呼ばれる可能性があるのでガード
  if (!listDiv) return;

  listDiv.innerHTML = '<div style="text-align:center; color:#666; padding:20px;">読み込み中...</div>';

  const linkBtn = document.getElementById('yt-memo-sheet-link');
  if (linkBtn) {
      linkBtn.removeAttribute('href');
      linkBtn.classList.add('disabled');
  }

  if (typeof GAS_API_URL === 'undefined') {
    listDiv.innerHTML = '<div style="color:red; text-align:center;">URL設定エラー</div>';
    return;
  }

  fetch(`${GAS_API_URL}?videoId=${videoId}`)
    .then(res => res.json())
    .then(data => {
      if (data.sheetUrl && linkBtn) {
        linkBtn.href = data.sheetUrl;
        linkBtn.classList.remove('disabled');
      }

      let memos = [];
      if (Array.isArray(data)) memos = data;
      else if (data.memos) memos = data.memos;
      
      const currentListDiv = document.getElementById('yt-memo-list');
      if (!currentListDiv) return;

      currentListDiv.innerHTML = '';
      if (memos.length === 0) {
         currentListDiv.innerHTML = '<div style="text-align:center; color:#444; padding:20px;">メモはありません</div>';
      }
      memos.forEach(item => {
        const match = item.link.match(/t=(\d+)s/);
        item.targetTime = match ? parseInt(match[1]) : 0;
        addMemoToList(item);
      });
    })
    .catch(err => {
      console.error(err);
      listDiv.innerHTML = '<div style="color:red; text-align:center;">通信エラー</div>';
    });
}

function addMemoToList(item, prepend = false) {
  const listDiv = document.getElementById('yt-memo-list');
  if (!listDiv) return;
  const row = document.createElement('div');
  row.className = 'memo-item';
  row.innerHTML = `<div class="memo-time-btn">[${item.timeDisplay}]</div><div class="memo-content">${item.memo}</div>`;
  row.querySelector('.memo-time-btn').onclick = () => {
    const video = document.querySelector('video');
    if (video) { video.currentTime = item.targetTime; video.play(); }
  };
  if (prepend) {
    if(listDiv.querySelector('div')?.innerText === "メモはありません") listDiv.innerHTML = "";
    listDiv.insertBefore(row, listDiv.firstChild);
  } else {
    listDiv.appendChild(row);
  }
}

function formatTime(seconds) {
  const min = Math.floor(seconds / 60);
  const sec = seconds % 60;
  return `${min}:${sec.toString().padStart(2, '0')}`;
}