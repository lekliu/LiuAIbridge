import { ADMIN_MODELS_SCRIPTS_BUNDLE } from "./admin_models_scripts_bundle";

export const ADMIN_HTML = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8"><title>LiuAIbridge Pro</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
    <style>
        body {
            background: linear-gradient(135deg, #0f172a 0%, #1e1b4b 50%, #0f172a 100%);
            color: #f8fafc;
            font-family: 'Inter', system-ui, sans-serif;
            min-height: 100vh;
        }
        .card {
            background: rgba(30, 41, 59, 0.8);
            backdrop-filter: blur(10px);
            border: 1px solid rgba(148, 163, 184, 0.2);
            box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
            transition: transform 0.3s ease, box-shadow 0.3s ease;
        }
        .card:hover {
            transform: translateY(-2px);
        }
        .btn-primary {
            background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%);
            transition: all 0.3s ease;
        }
        .btn-primary:hover {
            transform: scale(1.02);
            box-shadow: 0 10px 25px rgba(59, 130, 246, 0.4);
        }
        .services-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
            gap: 1.5rem;
        }
        .status-badge {
            padding: 2px 8px;
            border-radius: 9999px;
            font-size: 10px;
            font-weight: 600;
        }
        .status-enabled {
            background: rgba(16, 185, 129, 0.2);
            color: #34d399;
        }
        .status-disabled {
            background: rgba(148, 163, 184, 0.2);
            color: #94a3b8;
        }
        .modal-overlay {
            position: fixed;
            inset: 0;
            background: rgba(0, 0, 0, 0.7);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 1000;
            padding: 1rem;
            box-sizing: border-box;
            overflow-y: auto;
        }
        .modal-content {
            background: #1e293b;
            padding: 2rem;
            border-radius: 1rem;
            max-width: 400px;
            width: 90%;
        }
        /* 模型列表弹窗：限制整体高度，避免 flex 居中时顶/底被裁出视口 */
        .modal-content-models {
            max-width: 650px;
            max-height: min(92vh, 880px);
            display: flex;
            flex-direction: column;
            overflow: hidden;
        }
        .toast {
            position: fixed;
            bottom: 2rem;
            right: 2rem;
            padding: 1rem 1.5rem;
            border-radius: 0.5rem;
            font-weight: 500;
            z-index: 1001;
            animation: slideIn 0.3s ease;
        }
        .toast-success {
            background: rgba(16, 185, 129, 0.9);
        }
        .toast-error {
            background: rgba(239, 68, 68, 0.9);
        }
        @keyframes slideIn {
            from {
                transform: translateX(100%);
                opacity: 0;
            }
            to {
                transform: translateX(0);
                opacity: 1;
            }
        }
        .key-item {
            transition: background 0.2s ease;
        }
        .key-item:hover {
            background: rgba(148, 163, 184, 0.1);
        }
        .stats-row {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 1rem;
        }
        .stat-card {
            background: rgba(148, 163, 184, 0.1);
            padding: 1rem;
            border-radius: 0.5rem;
            text-align: center;
        }
        .stat-value {
            font-size: 1.5rem;
            font-weight: 700;
            color: #3b82f6;
        }
        .stat-label {
            font-size: 0.75rem;
            color: #94a3b8;
            margin-top: 0.25rem;
        }
    </style>
</head>
<body class="p-4 md:p-10 min-h-screen">
    <div class="max-w-6xl mx-auto">
        <header class="flex justify-between items-center mb-8">
            <div class="flex items-center gap-3">
                <div class="w-10 h-10 rounded-xl bg-gradient(135deg, #3b82f6, #8b5cf6) flex items-center justify-center font-bold text-white">L</div>
                <div>
                    <h1 class="text-2xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">LiuAIbridge Pro</h1>
                    <p class="text-xs text-gray-500">AI API Edge Gateway</p>
                </div>
            </div>
            <button id="logout" class="hidden text-sm text-blue-400 hover:text-blue-300 flex items-center gap-2">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"></path>
                </svg>
                安全退出
            </button>
        </header>

        <div id="loginCard" class="card p-8 rounded-2xl max-w-sm mx-auto">
            <div class="text-center mb-6">
                <div class="w-16 h-16 mx-auto rounded-2xl bg-gradient(135deg, #3b82f6, #8b5cf6) flex items-center justify-center mb-4">
                    <svg class="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path>
                    </svg>
                </div>
                <h2 class="text-xl font-bold">身份验证</h2>
                <p class="text-sm text-gray-500 mt-1">请输入管理员令牌</p>
            </div>
            <input type="password" id="adminToken" placeholder="ADMIN_TOKEN" 
                   class="w-full px-4 py-3 rounded-xl bg-slate-800 border border-slate-700 text-center focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition">
            <button onclick="login()" class="btn-primary w-full py-3 rounded-xl font-semibold text-white mt-4">登录后台</button>
        </div>

        <div id="main" class="hidden space-y-6">
            <div class="stats-row">
                <div class="stat-card" id="statTotal">
                    <div class="stat-value">0</div>
                    <div class="stat-label">总请求</div>
                </div>
                <div class="stat-card" id="statSuccess">
                    <div class="stat-value text-green-400">0</div>
                    <div class="stat-label">成功</div>
                </div>
                <div class="stat-card" id="statFail">
                    <div class="stat-value text-red-400">0</div>
                    <div class="stat-label">失败</div>
                </div>
            </div>
            <div class="services-grid" id="servicesContainer"></div>
        </div>
    </div>

    <script>
        var SK="LIU_ADMIN_TOKEN"; var G_TOKEN=""; var G_CONF={};
        
        window.onload=function(){ 
            var t=localStorage.getItem(SK); 
            if(t){ document.getElementById('adminToken').value=t; login(); } 
        };
        
        document.getElementById('logout').onclick=function(){ 
            localStorage.removeItem(SK); 
            location.reload(); 
        };

        async function login(){
            G_TOKEN=document.getElementById('adminToken').value;
            try{
                const res=await fetch('/admin/api/keys',{headers:{'X-Bridge-Token':G_TOKEN}});
                if(!res.ok) return alert('验证失败');
                const data=await res.json();
                G_CONF=data.config;
                localStorage.setItem(SK, G_TOKEN);
                render();
            }catch(e){alert('服务器连接失败');}
        }

        function render(){
            document.getElementById('loginCard').classList.add('hidden');
            document.getElementById('logout').classList.remove('hidden');
            document.getElementById('main').classList.remove('hidden');
            
            updateStats();
            
            const container = document.getElementById('servicesContainer');
            container.innerHTML = ['google','openai','anthropic'].map(s => \`
                <div class="card rounded-2xl overflow-hidden">
                    <div class="p-5 bg-slate-800/50 border-b border-slate-700 flex justify-between items-center">
                        <div class="flex items-center gap-3">
                            <div class="w-8 h-8 rounded-lg flex items-center justify-center \${getServiceColor(s)}">
                                <span class="text-xs font-bold">\${s.charAt(0).toUpperCase()}</span>
                            </div>
                            <h2 class="font-semibold capitalize tracking-wide text-blue-300">\${s} 资产管理</h2>
                        </div>
                        <div class="flex gap-2 flex-wrap justify-end">
                            \${s === 'google' ? '<button type="button" onclick="fetchModelsGoogle()" class="text-xs bg-purple-600 px-3 py-1.5 rounded-lg hover:bg-purple-500 transition text-white font-medium">📋 Gemini 模型</button>' : ''}
                            \${s === 'openai' ? '<button type="button" onclick="fetchModelsOpenAI()" class="text-xs bg-emerald-600 px-3 py-1.5 rounded-lg hover:bg-emerald-500 transition text-white font-medium">📋 OpenAI 模型</button>' : ''}
                            \${s === 'anthropic' ? '<button type="button" onclick="fetchModelsAnthropic()" class="text-xs bg-violet-600 px-3 py-1.5 rounded-lg hover:bg-violet-500 transition text-white font-medium">📋 Anthropic 模型</button>' : ''}
                            <button onclick="addKey('\${s}')" class="btn-primary px-4 py-1.5 rounded-lg text-sm font-medium text-white">
                                + 添加 Key
                            </button>
                        </div>
                    </div>
                    <div class="p-4">
                        \${G_CONF[s]?.length === 0 ? 
                            '<div class="text-center py-8 text-gray-500 text-sm">暂无 API Key，请点击上方按钮添加</div>' : 
                            G_CONF[s].map(k => \`
                                <div class="key-item flex items-center justify-between p-3 rounded-xl mb-2 last:mb-0">
                                    <div class="flex-1 min-w-0">
                                        <div class="font-medium text-gray-100 truncate">\${k.name}</div>
                                        <div class="font-mono text-xs text-gray-500 mt-0.5">\${k.key.substring(0,4)}...\${k.key.slice(-4)}</div>
                                    </div>
                                    <div class="flex items-center gap-4 ml-4">
                                        <span class="status-badge \${k.status === 'enabled' ? 'status-enabled' : 'status-disabled'}">
                                            \${k.status === 'enabled' ? '启用' : '禁用'}
                                        </span>
                                        <div class="text-right w-16">
                                            <div class="text-xs text-gray-500">成功</div>
                                            <div class="text-sm font-semibold text-green-400">\${k.successCount||0}</div>
                                        </div>
                                        <div class="text-right w-16">
                                            <div class="text-xs text-gray-500">失败</div>
                                            <div class="text-sm font-semibold text-red-400">\${k.failCount||0}</div>
                                        </div>
                                        <div class="text-right w-16">
                                            <div class="text-xs text-gray-500">最后活跃</div>
                                            <div class="text-xs text-gray-400">\${k.last||'从未'}</div>
                                        </div>
                                        <button onclick="toggleKey('\${s}','\${k.id}')" class="text-xs font-medium text-blue-400 hover:text-blue-300 px-2 py-1 rounded">切换</button>
                                        <button onclick="deleteKey('\${s}','\${k.id}')" class="text-xs font-medium text-red-400 hover:text-red-300 px-2 py-1 rounded">删除</button>
                                    </div>
                                </div>
                            \`).join('')
                        }
                    </div>
                </div>
            \`).join('');
        }

        function getServiceColor(service) {
            const colors = {
                google: 'bg-blue-500/20 text-blue-400',
                openai: 'bg-green-500/20 text-green-400',
                anthropic: 'bg-purple-500/20 text-purple-400'
            };
            return colors[service] || 'bg-gray-500/20 text-gray-400';
        }

        function updateStats() {
            let total = 0, success = 0, fail = 0;
            Object.values(G_CONF).forEach(service => {
                if (service) {
                    service.forEach(key => {
                        success += key.successCount || 0;
                        fail += key.failCount || 0;
                    });
                }
            });
            total = success + fail;
            document.getElementById('statTotal').querySelector('.stat-value').textContent = total;
            document.getElementById('statSuccess').querySelector('.stat-value').textContent = success;
            document.getElementById('statFail').querySelector('.stat-value').textContent = fail;
        }

        async function sync(s){
            await fetch('/admin/api/keys',{
                method:'POST',
                headers:{'X-Bridge-Token':G_TOKEN,'Content-Type':'application/json'},
                body: JSON.stringify({service:s, data:G_CONF[s]})
            });
            render();
        }

        function addKey(s){
            showAddKeyModal(s);
        }

        function showAddKeyModal(service) {
            const modal = document.createElement('div');
            modal.className = 'modal-overlay';
            modal.innerHTML = \`
                <div class="modal-content">
                    <h3 class="text-lg font-semibold mb-4">添加 \${service.toUpperCase()} API Key</h3>
                    <div class="space-y-4">
                        <div>
                            <label class="block text-sm text-gray-400 mb-1.5">别名</label>
                            <input type="text" id="newKeyName" placeholder="例如: 个人免费号" 
                                   class="w-full px-3 py-2.5 rounded-lg bg-slate-800 border border-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition text-white placeholder-gray-500">
                        </div>
                        <div>
                            <label class="block text-sm text-gray-400 mb-1.5">API Key</label>
                            <input type="text" id="newKeyValue" placeholder="输入 API Key" 
                                   class="w-full px-3 py-2.5 rounded-lg bg-slate-800 border border-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition text-white placeholder-gray-500 font-mono text-sm">
                        </div>
                    </div>
                    <div class="flex gap-3 mt-5">
                        <button class="flex-1 px-4 py-2.5 rounded-lg bg-slate-700 text-gray-300 hover:bg-slate-600 transition font-medium" 
                                onclick="this.closest('.modal-overlay').remove()">取消</button>
                        <button class="flex-1 px-4 py-2.5 rounded-lg btn-primary text-white hover:bg-blue-600 transition font-medium" 
                                onclick="confirmAddKey('\${service}')">确认添加</button>
                    </div>
                </div>
            \`;
            document.body.appendChild(modal);
            document.getElementById('newKeyName').focus();
        }

        function confirmAddKey(service) {
            const name = document.getElementById('newKeyName').value.trim();
            const val = document.getElementById('newKeyValue').value.trim();
            
            if (!name) {
                alert('请输入别名');
                document.getElementById('newKeyName').focus();
                return;
            }
            
            if (!val) {
                alert('请输入 API Key');
                document.getElementById('newKeyValue').focus();
                return;
            }
            
            G_CONF[service].push({id:crypto.randomUUID(), name:name, key:val, status:'enabled', successCount:0, failCount:0, last:'--'});
            document.querySelector('.modal-overlay').remove();
            sync(service);
            showToast('Key 添加成功', 'success');
        }

        function toggleKey(s,id){
            const k=G_CONF[s].find(x=>x.id===id);
            k.status=k.status==='enabled'?'disabled':'enabled';
            sync(s);
        }

        function deleteKey(s,id){
            const key = G_CONF[s].find(x => x.id === id);
            showModal('确认删除', \`确定要删除 Key「\${key.name}」吗？此操作不可撤销。\`, () => {
                G_CONF[s] = G_CONF[s].filter(x => x.id !== id);
                sync(s);
                showToast('Key 已删除', 'success');
            });
        }

        function showModal(title, content, onConfirm) {
            const modal = document.createElement('div');
            modal.className = 'modal-overlay';
            modal.innerHTML = \`
                <div class="modal-content">
                    <h3 class="text-lg font-semibold mb-2">\${title}</h3>
                    <p class="text-gray-400 mb-4">\${content}</p>
                    <div class="flex gap-3">
                        <button class="flex-1 px-4 py-2 rounded-lg bg-slate-700 text-gray-300 hover:bg-slate-600 transition" 
                                onclick="this.closest('.modal-overlay').remove()">取消</button>
                        <button class="flex-1 px-4 py-2 rounded-lg bg-red-500 text-white hover:bg-red-600 transition confirm-btn">确认</button>
                    </div>
                </div>
            \`;
            document.body.appendChild(modal);
            modal.querySelector('.confirm-btn').onclick = function() {
                modal.remove();
                onConfirm();
            };
        }

        function showToast(message, type = 'success') {
            const toast = document.createElement('div');
            toast.className = \`toast toast-\${type}\`;
            toast.textContent = message;
            document.body.appendChild(toast);
            setTimeout(() => toast.remove(), 3000);
        }

        ${ADMIN_MODELS_SCRIPTS_BUNDLE}
    </script>
</body>
</html>
`;