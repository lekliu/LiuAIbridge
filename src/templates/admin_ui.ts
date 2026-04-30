export const ADMIN_HTML = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8"><title>LiuAIbridge Dashboard</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <style>body{background:#0f172a;color:#f8fafc;font-family:sans-serif;}.card-bg{background:#1e293b;border:1px solid #334155;}input,textarea{background:#0f172a!important;border:1px solid #334155!important;color:#f8fafc!important;}</style>
</head>
<body class="min-h-screen p-6 md:p-10">
    <div class="max-w-5xl mx-auto">
        <header class="flex justify-between items-center mb-10">
            <div><h1 class="text-3xl font-bold text-blue-400">LiuAIbridge</h1><p class="text-gray-500 text-xs mt-1">v1.3 控制面板</p></div>
            <div class="text-right text-xs"><span id="stText" class="text-gray-500">● 待授权</span><button id="logout" class="hidden ml-2 text-blue-500 underline">退出</button></div>
        </header>

        <div id="loginCard" class="card-bg p-8 rounded-2xl max-w-md mx-auto shadow-2xl">
            <h2 class="text-xl font-bold mb-6 text-center">管理员登录</h2>
            <input type="password" id="adminToken" placeholder="输入 ADMIN_TOKEN" class="w-full p-3 rounded mb-4 text-center outline-none focus:border-blue-500">
            <button id="loginBtn" class="w-full bg-blue-600 hover:bg-blue-500 py-3 rounded font-bold transition">确认登录</button>
        </div>

        <div id="mainGrid" class="hidden grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <!-- Google Gemini -->
            <div class="card-bg p-6 rounded-2xl flex flex-col shadow-lg">
                <div class="flex justify-between mb-4">
                    <div><h3 class="font-bold text-lg">Google Gemini</h3><code class="text-[10px] text-gray-500">/google/</code></div>
                    <div class="text-right"><div class="text-[10px] text-blue-400 font-bold uppercase">请求数</div><div id="count-google" class="text-xl font-mono">0</div></div>
                </div>
                <div class="bg-slate-900 p-3 rounded-lg mb-4 flex justify-between text-[10px]">
                    <span>Keys: <b id="key-google" class="text-emerald-400">0</b></span>
                    <span id="active-google" class="text-gray-500 text-[9px]">从未活跃</span>
                </div>
                <textarea id="input-google" rows="3" placeholder="API Keys..." class="w-full p-2 rounded text-[10px] mb-3 resize-none font-mono"></textarea>
                <button onclick="saveKey('google')" class="w-full bg-slate-700 hover:bg-blue-600 py-2 rounded text-xs">更新配置</button>
            </div>
            <!-- OpenAI -->
            <div class="card-bg p-6 rounded-2xl flex flex-col shadow-lg">
                <div class="flex justify-between mb-4">
                    <div><h3 class="font-bold text-lg">OpenAI</h3><code class="text-[10px] text-gray-500">/openai/</code></div>
                    <div class="text-right"><div class="text-[10px] text-blue-400 font-bold uppercase">请求数</div><div id="count-openai" class="text-xl font-mono">0</div></div>
                </div>
                <div class="bg-slate-900 p-3 rounded-lg mb-4 flex justify-between text-[10px]">
                    <span>Keys: <b id="key-openai" class="text-emerald-400">0</b></span>
                    <span id="active-openai" class="text-gray-500 text-[9px]">从未活跃</span>
                </div>
                <textarea id="input-openai" rows="3" placeholder="API Keys..." class="w-full p-2 rounded text-[10px] mb-3 resize-none font-mono"></textarea>
                <button onclick="saveKey('openai')" class="w-full bg-slate-700 hover:bg-blue-600 py-2 rounded text-xs">更新配置</button>
            </div>
            <!-- Anthropic -->
            <div class="card-bg p-6 rounded-2xl flex flex-col shadow-lg">
                <div class="flex justify-between mb-4">
                    <div><h3 class="font-bold text-lg">Anthropic</h3><code class="text-[10px] text-gray-500">/anthropic/</code></div>
                    <div class="text-right"><div class="text-[10px] text-blue-400 font-bold uppercase">请求数</div><div id="count-anthropic" class="text-xl font-mono">0</div></div>
                </div>
                <div class="bg-slate-900 p-3 rounded-lg mb-4 flex justify-between text-[10px]">
                    <span>Keys: <b id="key-anthropic" class="text-emerald-400">0</b></span>
                    <span id="active-anthropic" class="text-gray-500 text-[9px]">从未活跃</span>
                </div>
                <textarea id="input-anthropic" rows="3" placeholder="API Keys..." class="w-full p-2 rounded text-[10px] mb-3 resize-none font-mono"></textarea>
                <button onclick="saveKey('anthropic')" class="w-full bg-slate-700 hover:bg-blue-600 py-2 rounded text-xs">更新配置</button>
            </div>
        </div>
    </div>
    <script>
        var SK = "LIU_ADMIN_TOKEN";
        window.onload = function(){ var t=localStorage.getItem(SK); if(t){ document.getElementById('adminToken').value=t; refresh(t); } };
        document.getElementById('loginBtn').onclick = function(){ var t=document.getElementById('adminToken').value; refresh(t); };
        document.getElementById('logout').onclick = function(){ localStorage.removeItem(SK); location.reload(); };
        async function refresh(t){
            try {
                var res = await fetch('/admin/api/keys', { headers:{ 'X-Bridge-Token':t }});
                if(!res.ok) { localStorage.removeItem(SK); return alert('验证失败'); }
                var data = await res.json();
                localStorage.setItem(SK, t);
                document.getElementById('loginCard').style.display='none';
                document.getElementById('mainGrid').classList.remove('hidden');
                document.getElementById('logout').classList.remove('hidden');
                document.getElementById('stText').innerText='已连接云端'; document.getElementById('stText').className='text-green-400';
                ['google','openai','anthropic'].forEach(id => {
                    var info = data.keys[id] || { keyCount:0, count:"0", lastActive:'无' };
                    document.getElementById('count-'+id).innerText = info.count;
                    document.getElementById('key-'+id).innerText = info.keyCount;
                    document.getElementById('active-'+id).innerText = info.lastActive;
                });
            } catch(e){ alert('加载失败'); }
        }
        async function saveKey(id){
            var t = localStorage.getItem(SK);
            var v = document.getElementById('input-'+id).value;
            var res = await fetch('/admin/api/keys', {
                method:'POST',
                headers:{ 'X-Bridge-Token':t, 'Content-Type':'application/json' },
                body: JSON.stringify({ service:id, key:v })
            });
            if(res.ok){ alert('已保存'); refresh(t); }
        }
    </script>
</body>
</html>
`;