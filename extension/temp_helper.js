
function getVideoId() {
    const isMusic = window.location.hostname === 'music.youtube.com';
    if (isMusic) {
        // プレイヤーバーのリンクからID取得を試みる
        // ytmusic-player-bar .title-group a はタイトルリンク、もしくはサムネイルリンクなど
        // 通常 .title がリンクになっている
        const titleLink = document.querySelector('ytmusic-player-bar .title');
        // .title自体が<a>タグでない場合もあるので、その親や周辺を探すか、href属性を持つ要素を探す
        // 実機挙動: .subtitle (アーティスト名) ではなく .title の親などがリンクを持っているかも確認
        // 安全策として、ytmusic-player-bar内の a[href*="watch?v="] を探すのが確実
        const playerLink = document.querySelector('ytmusic-player-bar a[href*="watch?v="]');
        if (playerLink) {
            const url = new URL(playerLink.href);
            const v = url.searchParams.get('v');
            if (v) return v;
        }
    }

    // フォールバック or YouTube本家
    return new URLSearchParams(window.location.search).get('v');
}
