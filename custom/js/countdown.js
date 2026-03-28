const CountdownTimer = (() => {

    let timer = null
    let cachedHoliday = null
    let dom = {}
    let styleInjected = false

    const config = {
        units: {
            day: { text: "今日", unit: "小时" },
            week: { text: "本周", unit: "天" },
            month: { text: "本月", unit: "天" },
            year: { text: "本年", unit: "天" }
        }
    }

    function initDOM() {
        dom = {
            eventName: document.getElementById("eventName"),
            eventDate: document.getElementById("eventDate"),
            daysUntil: document.getElementById("daysUntil"),
            countRight: document.getElementById("countRight")
        }
    }

    function isLeapYear(year) {
        return (year % 4 === 0 && year % 100 !== 0) || (year % 400 === 0)
    }

    function getCalculators(now) {

        return {

            day: () => {
                const hours = now.getHours()
                return {
                    remaining: 24 - hours,
                    percentage: (hours / 24) * 100
                }
            },

            week: () => {
                const day = now.getDay()
                const passed = day === 0 ? 6 : day - 1
                return {
                    remaining: 6 - passed,
                    percentage: ((passed + 1) / 7) * 100
                }
            },

            month: () => {
                const total = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()
                const passed = now.getDate() - 1
                return {
                    remaining: total - passed,
                    percentage: (passed / total) * 100
                }
            },

            year: () => {
                const year = now.getFullYear()
                const start = new Date(year, 0, 1)
                const total = isLeapYear(year) ? 366 : 365
                const passed = Math.floor((now - start) / 86400000)
                return {
                    remaining: total - passed,
                    percentage: (passed / total) * 100
                }
            }

        }
    }

    async function fetchHoliday(year) {

        const res = await fetch(`https://timor.tech/api/holiday/year/${year}/`)
        const data = await res.json()

        const holidays = []

        for (const key in data.holiday) {

            const h = data.holiday[key]

            if (h.holiday) {
                holidays.push({
                    name: h.name,
                    date: new Date(h.date)
                })
            }

        }

        holidays.sort((a, b) => a.date - b.date)

        return holidays
    }

    async function getNextHoliday() {

        if (cachedHoliday) return cachedHoliday

        const today = new Date()
        today.setHours(0,0,0,0)

        const year = today.getFullYear()

        const list = await fetchHoliday(year)

        for (const h of list) {

            const d = new Date(h.date)
            d.setHours(0,0,0,0)

            if (d >= today) {
                cachedHoliday = h
                return h
            }

        }

        const nextYearList = await fetchHoliday(year + 1)

        cachedHoliday = nextYearList[0]

        return cachedHoliday
    }

    function injectStyles() {

        if (styleInjected) return

        const styles = `
            .card-countdown .item-content { display:flex; }
            .cd-count-left { position:relative; display:flex; flex-direction:column; margin-right:.8rem; line-height:1.5; align-items:center; justify-content:center; }
            .cd-count-left .cd-text { font-size:14px; }
            .cd-count-left .cd-name { font-weight:bold; font-size:18px; }
            .cd-count-left .cd-time { font-size:30px; font-weight:bold; color:var(--anzhiyu-main); }
            .cd-count-left .cd-date { font-size:12px; opacity:.6; }
            .cd-count-left::after { content:""; position:absolute; right:-.8rem; width:2px; height:80%; background-color:var(--anzhiyu-main); opacity:.5; }

            .cd-count-right { flex:1; margin-left:.8rem; display:flex; flex-direction:column; justify-content:space-between; }
            .cd-count-item { display:flex; flex-direction:row; align-items:center; height:24px; }
            .cd-item-name { font-size:14px; margin-right:.8rem; white-space:nowrap; }

            .cd-item-progress { position:relative; display:flex; flex-direction:row; align-items:center; justify-content:space-between; height:100%; width:100%; border-radius:8px; background-color:var(--anzhiyu-background); overflow:hidden; }

            .cd-progress-bar { height:100%; border-radius:8px; background-color:var(--anzhiyu-main); }

            .cd-percentage, .cd-remaining { position:absolute; font-size:12px; margin:0 6px; transition:opacity .3s ease-in-out, transform .3s ease-in-out; }

            .cd-many { color:#fff; }

            .cd-remaining { opacity:0; transform:translateX(10px); }

            .card-countdown .item-content:hover .cd-remaining { transform:translateX(0); opacity:1; }

            .card-countdown .item-content:hover .cd-percentage { transform:translateX(-10px); opacity:0; }
        `

        const styleSheet = document.createElement("style")
        styleSheet.id = "countdown-style"
        styleSheet.textContent = styles
        document.head.appendChild(styleSheet)

        styleInjected = true
    }

    async function updateCountdown() {

        if (!dom.eventName) return

        try {

            const now = new Date()

            const target = await getNextHoliday()

            const today = new Date()
            today.setHours(0,0,0,0)

            const targetDate = new Date(target.date)
            targetDate.setHours(0,0,0,0)

            const days = Math.round((targetDate - today) / 86400000)

            dom.eventName.textContent = target.name
            dom.eventDate.textContent = targetDate.toLocaleDateString('zh-CN')
            dom.daysUntil.textContent = days

            const calculators = getCalculators(now)

            dom.countRight.innerHTML = Object.entries(config.units)
                .map(([key,{text,unit}])=>{

                    const {remaining,percentage} = calculators[key]()

                    return `
                    <div class="cd-count-item">
                        <div class="cd-item-name">${text}</div>
                        <div class="cd-item-progress">
                            <div class="cd-progress-bar" style="width:${percentage}%;opacity:${percentage/100}"></div>
                            <span class="cd-percentage ${percentage>=46?'cd-many':''}">${percentage.toFixed(2)}%</span>
                            <span class="cd-remaining ${percentage>=60?'cd-many':''}">
                            <span class="cd-tip">还剩</span>${remaining}<span class="cd-tip">${unit}</span>
                            </span>
                        </div>
                    </div>
                    `
                }).join('')

        } catch (e) {

            dom.eventName.textContent = "节日"
            dom.eventDate.textContent = "--"
            dom.daysUntil.textContent = "--"

        }

    }

    function start() {

        if (timer) clearInterval(timer)

        initDOM()

        injectStyles()

        updateCountdown()

        timer = setInterval(updateCountdown,600000)

    }

    document.addEventListener("DOMContentLoaded", start)
    document.addEventListener("pjax:complete", start)
    document.addEventListener("pjax:send", ()=> timer && clearInterval(timer))

    return { start }

})()