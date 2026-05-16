/** 管理页内联脚本片段：Google Gemini「获取模型」弹窗（由 admin_ui 注入） */
export const ADMIN_MODELS_GOOGLE_SCRIPT = `
async function fetchModelsGoogle() {
    var loadingToast = document.createElement('div');
    loadingToast.className = 'toast toast-success';
    loadingToast.textContent = '正在获取 Gemini 模型列表...';
    document.body.appendChild(loadingToast);
    try {
        var res = await fetch('/admin/api/models/google', { headers: { 'X-Bridge-Token': G_TOKEN } });
        var data = await res.json();
        loadingToast.remove();
        if (data.error) { showToast(data.error, 'error'); return; }
        showModelsModalGoogle(data.models, data.source, data.total);
    } catch (e) {
        loadingToast.remove();
        showToast('获取模型列表失败: ' + (e.message || '未知错误'), 'error');
    }
}
function showModelsModalGoogle(models, source, total) {
    var modal = document.createElement('div');
    modal.className = 'modal-overlay';
    function esc(t) {
        if (t == null || t === '') return '';
        var d = document.createElement('div');
        d.textContent = String(t);
        return d.innerHTML;
    }
    var rows = models.map(function(m) {
        var inTok = m.inputTokenLimit != null ? String(m.inputTokenLimit.toLocaleString()) : '?';
        var outTok = m.outputTokenLimit != null ? String(m.outputTokenLimit.toLocaleString()) : '?';
        return '<div class="p-4 bg-slate-800/70 rounded-xl border border-slate-700/50">' +
            '<div class="flex justify-between items-start">' +
            '<div><div class="font-semibold text-blue-300">' + esc(m.displayName) + '</div>' +
            '<div class="text-xs text-gray-500 font-mono mt-1">' + esc(m.name) + '</div></div>' +
            '<span class="text-xs px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300">v' + esc(m.version) + '</span></div>' +
            '<div class="mt-3 text-xs text-gray-400 space-y-1">' +
            '<div class="flex gap-4 flex-wrap"><span>📥 输入: <strong class="text-gray-300">' + inTok + '</strong></span>' +
            '<span>📤 输出: <strong class="text-gray-300">' + outTok + '</strong></span></div>' +
            '<div class="text-gray-500">' + esc(m.description || '') + '</div></div></div>';
    }).join('');
    modal.innerHTML = '<div class="modal-content modal-content-models relative my-auto">' +
        '<button type="button" class="liu-m-tx absolute top-4 right-4 z-10 flex h-9 w-9 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-700 hover:text-white transition text-xl leading-none font-light" aria-label="关闭">×</button>' +
        '<div class="shrink-0 pr-12 mb-3"><div class="flex justify-between items-center gap-3">' +
        '<h3 class="text-lg font-semibold">Gemini 模型列表</h3>' +
        '<span class="text-xs text-gray-400 shrink-0">共 ' + String(total) + ' 个</span></div>' +
        '<p class="text-sm text-gray-400 mt-2">数据来源: ' + esc(source) + '</p></div>' +
        '<div class="flex-1 min-h-0 overflow-y-auto space-y-3 pr-1">' + rows + '</div>' +
        '<div class="shrink-0 pt-4 border-t border-slate-700/60 mt-3">' +
        '<button type="button" class="liu-m-fx w-full px-4 py-2.5 rounded-lg bg-slate-700 text-gray-300 hover:bg-slate-600 transition font-medium">关闭</button></div></div>';
    document.body.appendChild(modal);
    modal.querySelector('.liu-m-tx').addEventListener('click', function() { modal.remove(); });
    modal.querySelector('.liu-m-fx').addEventListener('click', function() { modal.remove(); });
}
`.trim();
