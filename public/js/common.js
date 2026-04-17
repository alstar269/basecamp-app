// 공통 유틸리티

export const api = {
  async request(path, { method = 'GET', body, token } = {}) {
    const headers = { 'Content-Type': 'application/json' }
    if (token) headers['Authorization'] = `Bearer ${token}`
    const res = await fetch(path, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined
    })
    const ct = res.headers.get('content-type') || ''
    const data = ct.includes('application/json') ? await res.json() : await res.text()
    if (!res.ok) throw Object.assign(new Error(data?.error || 'request_failed'), { status: res.status, data })
    return data
  }
}

export const session = {
  set(kind, token) { localStorage.setItem(`basecamp.${kind}.token`, token) },
  get(kind) { return localStorage.getItem(`basecamp.${kind}.token`) },
  clear(kind) { localStorage.removeItem(`basecamp.${kind}.token`) }
}

export function openHotlineModal() {
  const html = `
    <div class="modal-backdrop" id="sos-modal">
      <div class="modal">
        <h2>🆘 지금 도움이 필요해요</h2>
        <p class="body" style="color: var(--neutral-700); margin-bottom: 8px;">지금 많이 힘들지? 혼자 감당하지 않아도 돼. 아래 전문 상담사가 24시간 기다리고 있어.</p>
        <div class="hotline-list">
          <a class="hotline" href="tel:1388"><div><span class="num">1388</span> 청소년전화</div><div class="desc">24시간 청소년 상담</div></a>
          <a class="hotline" href="tel:1393"><div><span class="num">1393</span> 자살예방상담</div><div class="desc">24시간 자살예방</div></a>
          <a class="hotline" href="tel:1577-0199"><div><span class="num">1577-0199</span> 정신건강</div><div class="desc">위기상담</div></a>
          <a class="hotline" href="tel:1366"><div><span class="num">1366</span> 여성긴급전화</div><div class="desc">가정폭력·성폭력</div></a>
        </div>
        <button class="btn btn-outline btn-sm" onclick="document.getElementById('sos-modal').remove()">닫기</button>
      </div>
    </div>
  `
  document.body.insertAdjacentHTML('beforeend', html)
}

export function toast(text, type = 'info') {
  const div = document.createElement('div')
  div.style.cssText = `position: fixed; top: 16px; left: 50%; transform: translateX(-50%); background: ${type === 'error' ? 'var(--danger)' : 'var(--neutral-900)'}; color: white; padding: 10px 16px; border-radius: 10px; z-index: 200; font-size: 14px; box-shadow: var(--shadow-lg);`
  div.textContent = text
  document.body.appendChild(div)
  setTimeout(() => div.remove(), 2500)
}
