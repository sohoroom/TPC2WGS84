/**
 * Proj4js 坐標定義
 */
proj4.defs("TWD67_TM2", "+proj=tmerc +lat_0=0 +lon_0=121 +k=0.9999 +x_0=250000 +y_0=0 +ellps=aust_SA +towgs84=-752,-358,-179,-0.0000011698,0.0000018398,0.0000009822,0.00002329 +units=m +no_defs");
proj4.defs("WGS84", "+proj=longlat +datum=WGS84 +no_defs");

// 電力格網基準表 (保持原樣)
const gridTable = {
    A:[170000,2750000], B:[250000,2750000], C:[330000,2750000],
    D:[170000,2700000], E:[250000,2700000], F:[330000,2700000],
    G:[170000,2650000], H:[250000,2650000],
    J:[90000,2600000],  K:[170000,2600000], L:[250000,2600000],
    M:[90000,2550000],  N:[170000,2550000], O:[250000,2550000],
    P:[90000,2500000],  Q:[170000,2500000], R:[250000,2500000],
    T:[170000,2450000], U:[250000,2450000],
    V:[170000,2400000], W:[250000,2400000],
    X:[275000,2614000], Y:[275000,2564000]
};

/**
 * 核心轉換功能 (完全遵循原始程式碼算法)
 */
function powerToTM2(grid) {
    grid = grid.trim().toUpperCase();

    // 校驗格式
    if (!/^[A-Z][0-9]{4}[A-Z]{2}[0-9]{2,4}$/.test(grid)) {
        throw "格式錯誤 (例如: K1278EA38)";
    }

    let base = gridTable[grid[0]];
    if (!base) throw "無效的區域代號";

    // --- 完全還原原始程式碼的變數邏輯 ---
    let x = base[0];
    let y = base[1];

    let n1 = Number(grid.substring(1, 3)); 
    let n2 = Number(grid.substring(3, 5)); 

    if (isNaN(n1) || isNaN(n2)) throw "數字部分錯誤";

    // 關鍵修正：還原原始程式碼的偏移加法
    x += n1 * 800; 
    y += n2 * 500;

    // Ly, Lx 百公尺字母轉數字
    x += (grid.charCodeAt(5) - 65) * 100; // 第6碼 Lx
    y += (grid.charCodeAt(6) - 65) * 100; // 第7碼 Ly

    // 十公尺與一公尺位處理
    let t5x = 0;
    let t5y = 0;

    if (grid.length === 9) {
        // 9碼邏輯：還原原本直接讀取第8, 9碼作十位
        t5x = Number(grid[7]) * 10;
        t5y = Number(grid[8]) * 10;
    } else if (grid.length === 11) {
        // 11碼邏輯：處理交叉的一公尺位
        // 索引 7=X十, 8=Y十, 9=X一, 10=Y一
        t5x = (Number(grid[7]) * 10) + Number(grid[9]);
        t5y = (Number(grid[8]) * 10) + Number(grid[10]);
    }

    if (isNaN(t5x) || isNaN(t5y)) throw "細格座標錯誤";

    return [x + t5x, y + t5y];
}

// ==========================================
// UI 控制 (與 HTML 元素對接)
// ==========================================
const inputEl = document.getElementById("tpc-input");
const charCountEl = document.getElementById("char-count");
const btnConvertEl = document.getElementById("btn-convert");
const statusEl = document.getElementById("status-text");
const resultAreaEl = document.getElementById("result-area");
const coordsOutputEl = document.getElementById("coords-output");
const mapLinkAreaEl = document.getElementById("map-link-area");

// 更新字數計數 (UI 顯示上限 11 碼)
inputEl.addEventListener("input", function() {
    charCountEl.textContent = `${this.value.length}/11`;
});

function handleConvert() {
    const inputVal = inputEl.value.trim();
    statusEl.textContent = "正在計算...";
    statusEl.className = "status-msg status-idle";
    resultAreaEl.style.display = "none";

    if (!inputVal) {
        statusEl.textContent = "請輸入座標";
        return;
    }

    // 延時增加互動感
    setTimeout(() => {
        try {
            const tm2Coords = powerToTM2(inputVal);
            const wgs84Coords = proj4("TWD67_TM2", "WGS84", tm2Coords);

            const lon = wgs84Coords[0].toFixed(7);
            const lat = wgs84Coords[1].toFixed(7);

            // 顯示結果
            coordsOutputEl.innerHTML = `經度: ${lon}<br>緯度: ${lat}`;
            // 修正 Google Maps 連結格式，直接定位
            mapLinkAreaEl.innerHTML = `<a href="https://www.google.com/maps?q=${lat},${lon}" target="_blank" class="map-link">🌐 在 Google 地圖查看</a>`;
            
            resultAreaEl.style.display = "block";
            statusEl.textContent = "轉換完成 OK.";
            statusEl.className = "status-msg status-success";
            
            // 平滑滾動至結果
            resultAreaEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });

        } catch (error) {
            statusEl.textContent = `❌ ${error}`;
            statusEl.className = "status-msg status-error";
        }
    }, 300);
}

// 事件綁定
btnConvertEl.addEventListener("click", handleConvert);
inputEl.addEventListener("keypress", (e) => { 
    if (e.key === "Enter") handleConvert(); 
});

// 在 script.js 最下方加入此更新邏輯
const btnRefresh = document.getElementById('btn-refresh');

if (btnRefresh) {
    btnRefresh.addEventListener('click', async () => {
        const confirmUpdate = confirm("是否要強制清除快取並重新載入？\n(這將更新網頁至最新版本)");
        
        if (confirmUpdate) {
            // 1. 註銷所有 Service Workers
            if ('serviceWorker' in navigator) {
                const registrations = await navigator.serviceWorker.getRegistrations();
                for (let registration of registrations) {
                    await registration.unregister();
                }
            }

            // 2. 刪除所有 Cache Storage
            if ('caches' in window) {
                const cacheNames = await caches.keys();
                for (let cacheName of cacheNames) {
                    await caches.delete(cacheName);
                }
            }

            // 3. 強制重新整理 (忽略瀏覽器快取)
            window.location.reload(true);
        }
    });
}

// 範例按鈕
document.querySelectorAll(".btn-example").forEach(btn => {
    btn.addEventListener("click", function() {
        inputEl.value = this.dataset.code;
        inputEl.dispatchEvent(new Event('input'));
        handleConvert();
    });
});