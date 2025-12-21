let currentVideoId = "";

// 1. 即座に実行
main();

// 2. YouTubeの画面遷移イベントを監視（これがSPA対策のキモです）
document.addEventListener("yt-navigate-finish", main);
document.addEventListener("yt-page-data-updated", main);

// 3. 定期監視（念のためのバックアップ）
setInterval(main, 1000);

function main() {
  const urlParams = new URLSearchParams(window.location.search);
  const videoId = urlParams.get('v');

  // 動画ページじゃないなら何もしない
  if (!videoId) {
    const panel = document.getElementById('yt-memo-panel');
    const btn = document.getElementById('yt-memo-toggle');
    if (panel) panel.classList.add('hidden'); // 邪魔なら隠す
    if (btn) btn.style.display = 'none';      // ボタンも隠す
    return;
  }

  // パネルが存在しない（Youtubeに消された）なら再生成
  if (!document.getElementById('yt-memo-panel')) {
    initPanel();
  } else {
    // 存在する場合、ボタンを表示状態に戻す
    const btn = document.getElementById('yt-memo-toggle');
    if (btn) btn.style.display = 'flex';
  }

  // URLが変わっていたらデータを再ロード
  if (videoId !== currentVideoId) {
    currentVideoId = videoId;
    loadMemos(videoId);
  }
}

function initPanel() {
  // すでにあったら作らない
  if (document.getElementById('yt-memo-panel')) return;

  const body = document.body;

  // パネル本体
  const panel = document.createElement('div');
  panel.id = 'yt-memo-panel';
  panel.classList.add('hidden'); 
  panel.innerHTML = `
    <div id="yt-memo-input-area">
      <textarea id="yt-memo-text" placeholder="メモを入力 (Enterで保存)"></textarea>
      <div id="yt-memo-status" style="font-size:11px; color:#666; text-align:right;">Ctrl + M で開閉</div>
    </div>
    <div id="yt-memo-list"></div>
  `;
  body.appendChild(panel);

  // トグルボタン
  const toggleBtn = document.createElement('div');
  toggleBtn.id = 'yt-memo-toggle';
  toggleBtn.innerHTML = "&#9998;";
  toggleBtn.onclick = () => togglePanel();
  
  // パネル要素の後ろではなく、bodyに直接追加する（Youtubeの書き換えに強くするため）
  body.appendChild(toggleBtn);

  // イベント設定
  setupEvents();
}

function togglePanel() {
  const panel = document.getElementById('yt-memo-panel');
  const textarea = document.getElementById('yt-memo-text');
  
  // パネルがない場合は作り直す（念のため）
  if (!panel) {
    initPanel();
    return;
  }
  
  panel.classList.toggle('hidden');
  
  if (!panel.classList.contains('hidden')) {
    textarea.focus();
  }
}

function setupEvents() {
  // 重複登録を防ぐため、古いリスナーを考慮するか、documentに対して1回だけ設定するのが理想ですが
  // 簡易的に、ここでは要素が存在する場合のみ設定します。
  const textarea = document.getElementById('yt-memo-text');
  if(!textarea) return;

  // 以前のリスナーが残る問題を防ぐため、onkeydownプロパティを使用（上書きされる）
  // ※より厳密にするなら addEventListener ですが、簡易実装としてこれで十分です
  
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

// --- 通信処理（前回と同じ） ---

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
  // パネルが再生成された直後だと取得できないことがあるためチェック
  if (!listDiv) return; 

  listDiv.innerHTML = '<div style="text-align:center; color:#666; padding:20px;">読み込み中...</div>';

  fetch(`${GAS_API_URL}?videoId=${videoId}`)
    .then(res => res.json())
    .then(data => {
      // 非同期処理中に画面遷移して要素が消えている場合のエラー回避
      const currentListDiv = document.getElementById('yt-memo-list');
      if (!currentListDiv) return;

      currentListDiv.innerHTML = '';
      if (data.length === 0) {
         currentListDiv.innerHTML = '<div style="text-align:center; color:#444; padding:20px;">メモはありません</div>';
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
  if (!listDiv) return;

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