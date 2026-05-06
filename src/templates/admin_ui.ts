export const ADMIN_HTML = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8"><title>LiuAIbridge Pro</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <style>
        body{background:#0f172a;color:#f8fafc;font-family:sans-serif;}
        .card{background:#1e293b;border:1px solid #334155;}
        .key-item:hover{background:#1e293b;}
        .status-on{color:#4ade80;} .status-off{color:#94a3b8;}
    </style>
</head>
<body class="p-4 md:p-10 min-h-screen">
    <div class="max-w-5xl mx-auto">
        <header class="flex justify-between items-center mb-10">
            <h1 class="text-2xl font-bold text-blue-400">LiuAIbridge Pro</h1>
            <button id="logout" class="hidden text-xs text-blue-500 underline">安全退出</button>
        </header>

        <div id="loginCard" class="card p-8 rounded-xl max-w-sm mx-auto shadow-2xl">
            <h2 class="text-lg font-bold mb-4 text-center">身份验证</h2>
            <input type="password" id="adminToken" placeholder="ADMIN_TOKEN" class="w-full p-2 rounded mb-4 bg-slate-900 border border-slate-700 text-center">
            <button onclick="login()" class="w-full bg-blue-600 p-2 rounded font-bold hover:bg-blue-500">登录后台</button>
        </div>

        <div id="main" class="hidden space-y-8">
            <!-- 动态渲染 -->
        </div>
    </div>

    <script>
        var SK="LIU_ADMIN_TOKEN"; var G_TOKEN=""; var G_CONF={};
        window.onload=function(){ var t=localStorage.getItem(SK); if(t){ document.getElementById('adminToken').value=t; login(); }};
        document.getElementById('logout').onclick=function(){ localStorage.removeItem(SK); location.reload(); };

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
            const main=document.getElementById('main'); main.classList.remove('hidden');
            main.innerHTML=['google','openai','anthropic'].map(s => \`
                <div class="card rounded-xl overflow-hidden border border-slate-700">
                    <div class="p-4 bg-slate-800/50 flex justify-between items-center border-b border-slate-700">
                        <h2 class="font-bold uppercase tracking-widest text-blue-300">\${s} 资产管理</h2>
                        <button onclick="addKey('\${s}')" class="bg-blue-600 px-3 py-1 rounded text-xs hover:bg-blue-500">+ 添加新 Key</button>
                    </div>
                    <div class="p-2 min-h-[100px]">
                        \${G_CONF[s].length===0?'<p class="text-center text-gray-600 py-10 text-sm">暂无数据</p>':G_CONF[s].map(k => \`
                            <div class="flex items-center justify-between p-3 border-b border-slate-800 last:border-0 text-sm key-item transition">
                                <div class="flex-1">
                                    <div class="font-bold text-gray-100">\${k.name}</div>
                                    <div class="font-mono text-xs text-gray-500 mt-1">\${k.key.substring(0,4)}... \${k.key.slice(-4)}</div>
                                </div>
                                <div class="flex items-center gap-6">
                                    <div class="text-center w-10"><p class="text-[8px] text-gray-500 uppercase">成功</p><b class="text-green-400 text-xs">\${k.successCount||0}</b></div>
                                    <div class="text-center w-10"><p class="text-[8px] text-gray-500 uppercase">失败</p><b class="text-rose-500 text-xs">\${k.failCount||0}</b></div>
                                    <div class="text-right w-24"><p class="text-[9px] text-gray-500 uppercase">最后活跃</p><span class="text-[9px]">\${k.last||'从未'}</span></div>
                                    <button onclick="toggleKey('\${s}','\${k.id}')" class="w-16 text-xs font-bold \${k.status==='enabled'?'text-green-400':'text-gray-500'}">
                                        \${k.status==='enabled'?'启用中':'已禁用'}
                                    </button>
                                    <button onclick="deleteKey('\${s}','\${k.id}')" class="text-xs text-rose-500 hover:bg-rose-900/20 px-2 py-1 rounded">删除</button>
                                </div>
                            </div>
                        \`).join('')}
                    </div>
                </div>
            \`).join('');
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
            const name = prompt("请为这个 Key 起一个别名 (例如: 个人免费号):", "Key Name");
            if (!name) return;

            const val = prompt("请输入 API Key 值 (" + s.toUpperCase() + "):");
            if (!val) return;

            G_CONF[s].push({id:crypto.randomUUID(), name:name, key:val, status:'enabled', count:0, last:'--'});
            sync(s);
        }

        function toggleKey(s,id){
            const k=G_CONF[s].find(x=>x.id===id);
            k.status=k.status==='enabled'?'disabled':'enabled';
            sync(s);
        }

        function deleteKey(s,id){
            if(!confirm('确定永久删除 Key ['+ G_CONF[s].find(x=>x.id===id).name +'] 吗?')) return;
            G_CONF[s]=G_CONF[s].filter(x=>x.id!==id);
            sync(s);
        }
    </script>
</body>
</html>
`;
