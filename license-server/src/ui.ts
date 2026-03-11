import { PLANS } from './types'

/**
 * 返回付款页 HTML，由 Workers 内联渲染，无需单独的前端构建。
 * 前端状态机：form → qrcode → success
 */
export function renderPage(productName: string): string {
  // 服务端套餐配置序列化后注入前端，保持单一数据源
  const plansJson = JSON.stringify(
    Object.fromEntries(
      Object.entries(PLANS).map(([k, v]) => [
        k,
        { name: v.name, price: v.price, durationDays: v.durationDays, features: v.features, badge: v.badge },
      ]),
    ),
  )

  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${productName} - 会员购买</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <script src="https://cdn.jsdelivr.net/npm/qrcode@1.5.4/build/qrcode.min.js"></script>
  <style>
    .plan-card { transition: border-color 0.15s, background-color 0.15s; }
    .plan-card.selected { border-color: #6366f1; background-color: #eef2ff; }
    .plan-card:not(.selected):hover { border-color: #a5b4fc; }
  </style>
</head>
<body class="bg-slate-50 min-h-screen py-10 px-4">

  <!-- 表单页 -->
  <div id="view-form" class="max-w-xl mx-auto">
    <div class="text-center mb-8">
      <h1 class="text-3xl font-bold text-gray-900">${productName}</h1>
      <p class="text-gray-500 mt-2 text-sm">解锁全部功能，开始你的音乐之旅</p>
    </div>

    <div class="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
      <div class="mb-5">
        <label class="block text-sm font-medium text-gray-700 mb-1.5">邮箱地址</label>
        <input id="email" type="email" placeholder="激活码将发送至此邮箱"
          class="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition">
      </div>

      <div class="mb-6">
        <label class="block text-sm font-medium text-gray-700 mb-1.5">
          设备 ID
          <span class="ml-1.5 text-xs text-gray-400 font-normal">在 App「设置 → 关于」中查看</span>
        </label>
        <input id="deviceId" type="text" placeholder="设备 Build ID，如 BP2A.250605.0250"
          maxlength="32"
          class="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm font-mono tracking-wider uppercase focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition"
          oninput="this.value = this.value.toUpperCase().replace(/[^A-Z0-9.]/g, '').slice(0, 32)">
      </div>

      <div class="mb-6">
        <label class="block text-sm font-medium text-gray-700 mb-3">选择套餐</label>
        <div id="plan-cards" class="space-y-3"></div>
      </div>

      <div id="error-msg" class="hidden mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600"></div>

      <button id="submit-btn" onclick="handleSubmit()"
        class="w-full py-3 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white font-semibold rounded-xl transition disabled:opacity-50 disabled:cursor-not-allowed">
        立即购买
      </button>

      <p class="mt-4 text-xs text-center text-gray-400">支持支付宝扫码付款 · 付款后自动发送激活码至邮箱</p>
    </div>
  </div>

  <!-- 二维码页 -->
  <div id="view-qrcode" class="hidden max-w-sm mx-auto">
    <div class="text-center mb-6">
      <h2 class="text-2xl font-bold text-gray-900">扫码付款</h2>
      <p class="text-gray-500 mt-1 text-sm">用支付宝扫描下方二维码完成支付</p>
    </div>

    <div class="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 text-center">
      <div class="mb-5">
        <p id="qr-plan-name" class="text-sm text-gray-500"></p>
        <p class="text-3xl font-bold text-gray-900 mt-1">¥<span id="qr-amount"></span></p>
      </div>

      <div class="flex justify-center mb-5">
        <canvas id="qrcode-canvas" class="rounded-lg border border-gray-100"></canvas>
      </div>

      <div class="flex items-center justify-center gap-2 text-sm text-gray-400">
        <svg class="animate-spin h-4 w-4 text-indigo-500" fill="none" viewBox="0 0 24 24">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
        </svg>
        等待付款中...
      </div>

      <button onclick="cancelPayment()" class="mt-6 text-sm text-gray-400 hover:text-gray-600 transition">
        ← 返回重新选择
      </button>
    </div>
  </div>

  <!-- 成功页 -->
  <div id="view-success" class="hidden max-w-lg mx-auto">
    <div class="text-center mb-6">
      <div class="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
        <svg class="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7"/>
        </svg>
      </div>
      <h2 class="text-2xl font-bold text-gray-900">购买成功！</h2>
      <p class="text-gray-500 mt-1 text-sm">激活码已同步发送至你的邮箱</p>
    </div>

    <div class="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
      <p class="text-sm text-gray-500 mb-3 text-center">你的激活码</p>
      <div class="bg-gray-50 border border-gray-200 rounded-xl p-5 text-center select-all">
        <code id="license-key" class="text-base font-mono font-bold text-gray-900 tracking-wider break-all leading-relaxed"></code>
      </div>

      <button id="copy-btn" onclick="copyLicense()"
        class="w-full mt-4 py-2.5 border border-indigo-200 text-indigo-600 hover:bg-indigo-50 font-medium rounded-xl transition text-sm">
        复制激活码
      </button>

      <div class="mt-6 p-4 bg-blue-50 rounded-xl">
        <p class="text-sm font-semibold text-blue-800 mb-2">如何激活？</p>
        <ol class="text-sm text-blue-700 space-y-1 list-decimal list-inside leading-relaxed">
          <li>打开 ${productName} App</li>
          <li>进入「设置 → 账号 → 输入激活码」</li>
          <li>粘贴激活码，点击激活</li>
        </ol>
      </div>
    </div>
  </div>

${buildScript(plansJson)}
</body>
</html>`
}

/** 前端脚本单独构建，避免在 TS 模板字符串中对 JS 模板字符串双重转义 */
function buildScript(plansJson: string): string {
  return (
    '<script>\n' +
    '  const PLANS = ' + plansJson + '\n' +
    '\n' +
    '  let selectedPlan = "yearly"\n' +
    '  let currentTradeNo = null\n' +
    '  let pollTimer = null\n' +
    '\n' +
    '  function initPlanCards() {\n' +
    '    const container = document.getElementById("plan-cards")\n' +
    '    Object.entries(PLANS).forEach(function([key, plan]) {\n' +
    '      const card = document.createElement("div")\n' +
    '      card.className = "plan-card border-2 rounded-xl p-5 cursor-pointer " + (key === selectedPlan ? "selected" : "border-gray-200")\n' +
    '      card.setAttribute("data-plan", key)\n' +
    '      card.onclick = function() { selectPlan(key) }\n' +
    '\n' +
    '      const badgeHtml = plan.badge\n' +
    '        ? \'<span class="text-xs bg-indigo-600 text-white px-2 py-0.5 rounded-full ml-2 align-middle">\' + plan.badge + "</span>"\n' +
    '        : ""\n' +
    '      const durationText = plan.durationDays ? plan.durationDays + " 天" : "永久有效"\n' +
    '      const checkIcon = \'<svg class="w-3.5 h-3.5 text-green-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"/></svg>\'\n' +
    '      const featuresHtml = plan.features.map(function(f) {\n' +
    '        return \'<li class="flex items-center text-xs text-gray-500 gap-1.5">\' + checkIcon + f + "</li>"\n' +
    '      }).join("")\n' +
    '\n' +
    '      card.innerHTML =\n' +
    '        \'<div class="flex justify-between items-start">\' +\n' +
    '          \'<div>\' +\n' +
    '            \'<span class="text-base font-semibold text-gray-900">\' + plan.name + "</span>" + badgeHtml +\n' +
    '            \'<p class="text-xs text-gray-400 mt-0.5">\' + durationText + "</p>" +\n' +
    '          "</div>" +\n' +
    '          \'<div class="text-2xl font-bold text-gray-900">¥\' + plan.price + "</div>" +\n' +
    '        "</div>" +\n' +
    '        \'<ul class="mt-3 space-y-1.5">\' + featuresHtml + "</ul>"\n' +
    '\n' +
    '      container.appendChild(card)\n' +
    '    })\n' +
    '  }\n' +
    '\n' +
    '  function selectPlan(plan) {\n' +
    '    selectedPlan = plan\n' +
    '    document.querySelectorAll(".plan-card").forEach(function(card) {\n' +
    '      const isSelected = card.getAttribute("data-plan") === plan\n' +
    '      card.classList.toggle("selected", isSelected)\n' +
    '      card.classList.toggle("border-gray-200", !isSelected)\n' +
    '    })\n' +
    '  }\n' +
    '\n' +
    '  function showView(name) {\n' +
    '    ["form", "qrcode", "success"].forEach(function(v) {\n' +
    '      document.getElementById("view-" + v).classList.toggle("hidden", v !== name)\n' +
    '    })\n' +
    '  }\n' +
    '\n' +
    '  function showError(msg) {\n' +
    '    const el = document.getElementById("error-msg")\n' +
    '    el.textContent = msg\n' +
    '    el.classList.remove("hidden")\n' +
    '  }\n' +
    '\n' +
    '  function hideError() {\n' +
    '    document.getElementById("error-msg").classList.add("hidden")\n' +
    '  }\n' +
    '\n' +
    '  async function handleSubmit() {\n' +
    '    hideError()\n' +
    '    const email = document.getElementById("email").value.trim()\n' +
    '    const deviceId = document.getElementById("deviceId").value.trim()\n' +
    '\n' +
    '    if (!email || !/^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/.test(email)) {\n' +
    '      showError("请输入正确的邮箱地址")\n' +
    '      return\n' +
    '    }\n' +
    '    if (!deviceId || !/^[A-Z0-9.]{4,32}$/.test(deviceId)) {\n' +
    '      showError("设备 ID 格式不正确，请在 App「设置 → 关于」中复制")\n' +
    '      return\n' +
    '    }\n' +
    '\n' +
    '    const btn = document.getElementById("submit-btn")\n' +
    '    btn.disabled = true\n' +
    '    btn.textContent = "处理中..."\n' +
    '\n' +
    '    try {\n' +
    '      const res = await fetch("/api/order/create", {\n' +
    '        method: "POST",\n' +
    '        headers: { "Content-Type": "application/json" },\n' +
    '        body: JSON.stringify({ email, deviceId, plan: selectedPlan }),\n' +
    '      })\n' +
    '      const data = await res.json()\n' +
    '      if (!data.ok) {\n' +
    '        showError(data.message || "创建订单失败，请稍后重试")\n' +
    '        return\n' +
    '      }\n' +
    '      currentTradeNo = data.tradeNo\n' +
    '      await showQRCode(data.qrCode)\n' +
    '      startPolling()\n' +
    '    } catch {\n' +
    '      showError("网络错误，请检查网络后重试")\n' +
    '    } finally {\n' +
    '      btn.disabled = false\n' +
    '      btn.textContent = "立即购买"\n' +
    '    }\n' +
    '  }\n' +
    '\n' +
    '  async function showQRCode(url) {\n' +
    '    const plan = PLANS[selectedPlan]\n' +
    '    document.getElementById("qr-plan-name").textContent = plan.name\n' +
    '    document.getElementById("qr-amount").textContent = plan.price\n' +
    '    showView("qrcode")\n' +
    '    await new Promise(function(resolve, reject) {\n' +
    '      QRCode.toCanvas(\n' +
    '        document.getElementById("qrcode-canvas"),\n' +
    '        url,\n' +
    '        { width: 220, margin: 2, color: { dark: "#111827", light: "#ffffff" } },\n' +
    '        function(err) { err ? reject(err) : resolve() },\n' +
    '      )\n' +
    '    })\n' +
    '  }\n' +
    '\n' +
    '  function startPolling() {\n' +
    '    if (pollTimer) clearInterval(pollTimer)\n' +
    '    pollTimer = setInterval(async function() {\n' +
    '      try {\n' +
    '        const res = await fetch("/api/order/status?tradeNo=" + currentTradeNo)\n' +
    '        const data = await res.json()\n' +
    '        if (data.status === "paid") {\n' +
    '          clearInterval(pollTimer)\n' +
    '          pollTimer = null\n' +
    '          showSuccess(data.licenseKey)\n' +
    '        }\n' +
    '      } catch {}\n' +
    '    }, 3000)\n' +
    '  }\n' +
    '\n' +
    '  function cancelPayment() {\n' +
    '    if (pollTimer) { clearInterval(pollTimer); pollTimer = null }\n' +
    '    currentTradeNo = null\n' +
    '    showView("form")\n' +
    '  }\n' +
    '\n' +
    '  function showSuccess(licenseKey) {\n' +
    '    document.getElementById("license-key").textContent = licenseKey\n' +
    '    showView("success")\n' +
    '  }\n' +
    '\n' +
    '  async function copyLicense() {\n' +
    '    const key = document.getElementById("license-key").textContent\n' +
    '    const btn = document.getElementById("copy-btn")\n' +
    '    try {\n' +
    '      await navigator.clipboard.writeText(key)\n' +
    '    } catch {\n' +
    '      const range = document.createRange()\n' +
    '      range.selectNode(document.getElementById("license-key"))\n' +
    '      window.getSelection().removeAllRanges()\n' +
    '      window.getSelection().addRange(range)\n' +
    '      document.execCommand("copy")\n' +
    '      window.getSelection().removeAllRanges()\n' +
    '    }\n' +
    '    btn.textContent = "✓ 已复制"\n' +
    '    setTimeout(function() { btn.textContent = "复制激活码" }, 2000)\n' +
    '  }\n' +
    '\n' +
    '  initPlanCards()\n' +
    '</script>'
  )
}
