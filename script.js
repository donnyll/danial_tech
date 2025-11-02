// ==================
// SETUP & KONFIGURASI
// ==================
const SUPABASE_URL = 'https://dxyvftujqgkjmbqpgyfg.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR4eXZmdHVqcWdram1icXBneWZnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk2Njc3MTUsImV4cCI6MjA3NTI0MzcxNX0.IVXS3hz_iO4S5B5KmQJJEcepzFqtTW-cxbmQmD7aevE';

const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

const fmt = (n) => Number(n || 0).toLocaleString('ms-MY', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const today = () => new Date(new Date().getTime() - (new Date().getTimezoneOffset() * 60000)).toISOString().slice(0, 10);
const getPIN = () => localStorage.getItem('thc_admin_pin') || 'boss123';
const setPIN = (v) => localStorage.setItem('thc_admin_pin', v);

const THEME_KEY = 'thc_theme';
const COUNTERS_KEY = 'thc_counters';

// ==================
// FIZIKAL TONG (boleh berubah ikut jual-tong)
// ==================
const PHYSICAL_KEY = 'thc_physical_totals';
const MOVES_KEY = 'thc_cylinder_moves';
const DEFAULT_PHYSICAL = { q14: 0, q12: 0, qi: 0 };

function getPhysicalTotals() {
    const raw = localStorage.getItem(PHYSICAL_KEY);
    if (!raw) return { ...DEFAULT_PHYSICAL };
    try { return JSON.parse(raw); } catch(e) { return { ...DEFAULT_PHYSICAL }; }
}
function setPhysicalTotals(data) {
    localStorage.setItem(PHYSICAL_KEY, JSON.stringify(data));
}
function getMoves() {
    const raw = localStorage.getItem(MOVES_KEY);
    if (!raw) return [];
    try { return JSON.parse(raw); } catch(e){ return []; }
}
function setMoves(list) {
    localStorage.setItem(MOVES_KEY, JSON.stringify(list));
}
function seedPhysicalMovesIfEmpty() {
    const m = getMoves();
    if (m.length) return;
    const sample = [
        { ts: Date.now()-1000*60*60*5, type: 'isi-lori', m14: 80, m12: 0, mi: 0, note: 'Isi lori 80 tong' },
        { ts: Date.now()-1000*60*60*4, type: 'jual-gas', m14: 80, m12: 0, mi: 0, note: 'Jual 80 tong tukar kosong' },
        { ts: Date.now()-1000*60*60*3, type: 'lori→kilang', m14: 50, m12: 0, mi: 0, note: 'Turun 50 kosong ke kilang' },
        { ts: Date.now()-1000*60*60*3+5000, type: 'kilang→lori', m14: 50, m12: 0, mi: 0, note: 'Ambil 50 berisi dari kilang' },
        { ts: Date.now()-1000*60*60*2, type: 'jual-dengan-tong', m14: 2, m12: 0, mi: 0, note: 'Customer beli sekali 2 tong 14kg' }
    ];
    setMoves(sample);
}
function computeCurrentPhysicalTotals() {
    const base = getPhysicalTotals();
    const moves = getMoves();
    let total14 = base.q14;
    let total12 = base.q12;
    let totalI = base.qi;
    moves.forEach(ev => {
        const q14 = ev.m14 || 0, q12 = ev.m12 || 0, qi = ev.mi || 0;
        if (ev.type === 'jual-dengan-tong') {
            total14 -= q14; total12 -= q12; totalI -= qi;
        }
        if (ev.type === 'beli-tong-baru') {
            total14 += q14; total12 += q12; totalI += qi;
        }
        if (ev.type === 'buang/rosak') {
            total14 -= q14; total12 -= q12; totalI -= qi;
        }
    });
    return { q14: Math.max(0,total14), q12: Math.max(0,total12), qi: Math.max(0,totalI) };
}
function rebuildPhysicalDistribution() {
    const physicalTotals = computeCurrentPhysicalTotals();
    const moves = getMoves().slice().sort((a,b)=>a.ts-b.ts);
    let loriFilled14=0,loriEmpty14=0,loriFilled12=0,loriEmpty12=0,loriFilledI=0,loriEmptyI=0;
    moves.forEach(ev => {
        const q14 = ev.m14 || 0, q12 = ev.m12 || 0, qi = ev.mi || 0;
        switch(ev.type){
            case 'kilang→lori':
                loriFilled14 += q14; loriFilled12 += q12; loriFilledI += qi; break;
            case 'lori→kilang':
                loriEmpty14 = Math.max(0, loriEmpty14 - q14);
                loriEmpty12 = Math.max(0, loriEmpty12 - q12);
                loriEmptyI  = Math.max(0, loriEmptyI  - qi);
                break;
            case 'isi-lori':
                loriEmpty14 = Math.max(0, loriEmpty14 - q14);
                loriEmpty12 = Math.max(0, loriEmpty12 - q12);
                loriEmptyI  = Math.max(0, loriEmptyI  - qi);
                loriFilled14 += q14; loriFilled12 += q12; loriFilledI += qi;
                break;
            case 'jual-gas':
                loriFilled14 = Math.max(0, loriFilled14 - q14);
                loriFilled12 = Math.max(0, loriFilled12 - q12);
                loriFilledI  = Math.max(0, loriFilledI  - qi);
                loriEmpty14  += q14; loriEmpty12  += q12; loriEmptyI   += qi;
                break;
            case 'jual-dengan-tong':
                loriFilled14 = Math.max(0, loriFilled14 - q14);
                loriFilled12 = Math.max(0, loriFilled12 - q12);
                loriFilledI  = Math.max(0, loriFilledI  - qi);
                break;
        }
    });
    const loriTotal14 = loriFilled14 + loriEmpty14;
    const loriTotal12 = loriFilled12 + loriEmpty12;
    const loriTotalI  = loriFilledI  + loriEmptyI;
    const kilangTotal14 = Math.max(0, physicalTotals.q14 - loriTotal14);
    const kilangTotal12 = Math.max(0, physicalTotals.q12 - loriTotal12);
    const kilangTotalI  = Math.max(0, physicalTotals.qi  - loriTotalI);
    return {
        physicalTotals,
        lori: {
            filled: { q14: loriFilled14, q12: loriFilled12, qi: loriFilledI },
            empty:  { q14: loriEmpty14,  q12: loriEmpty12,  qi: loriEmptyI  },
        },
        kilang: {
            filled: { q14: kilangTotal14, q12: kilangTotal12, qi: kilangTotalI },
            empty:  { q14: 0, q12: 0, qi: 0 }
        }
    };
}
function initPhysicalForm() {
    const pf14 = document.getElementById('pf14');
    if (!pf14) return;
    const pf = getPhysicalTotals();
    pf14.value = pf.q14;
    document.getElementById('pf12').value = pf.q12;
    document.getElementById('pfi').value  = pf.qi;
    document.getElementById('savePhysicalBtn').addEventListener('click', () => {
        const data = {
            q14: Number(document.getElementById('pf14').value || 0),
            q12: Number(document.getElementById('pf12').value || 0),
            qi:  Number(document.getElementById('pfi').value  || 0),
        };
        setPhysicalTotals(data);
        const msg = document.getElementById('pfMsg');
        if (msg) msg.textContent = 'Disimpan. Dashboard dikemas kini.';
        recomputeSummary();
    });
}

// Cache data
let ALL_STOCKS = [], ALL_SALES = [], ALL_EXPENSES = [], ALL_PAYROLLS = [], ALL_CLIENTS = [], ALL_PAYMENTS = [];
let COUNTERS = { soldAtReset: { q12: 0, q14: 0, qi: 0 } };

// ==================
// FUNGSI UTAMA & PAPARAN
// ==================
async function renderAll() {
    document.body.style.cursor = 'wait';
    seedPhysicalMovesIfEmpty();
    await fetchAllData();
    await Promise.all([
        renderStocks(), renderExpenses(), renderClients(),
        renderSales(), renderPayments(), renderPayroll(),
        recomputeSummary(), renderReport()
    ]);
    initPhysicalForm();
    calcSale();
    document.body.style.cursor = 'default';
}

async function fetchAllData() {
    const { data: stocks } = await supabaseClient.from('stocks').select('*');
    const { data: sales } = await supabaseClient.from('sales').select('*');
    const { data: expenses } = await supabaseClient.from('expenses').select('*');
    const { data: payrolls } = await supabaseClient.from('payrolls').select('*');
    const { data: clients } = await supabaseClient.from('clients').select('*');
    const { data: payments } = await supabaseClient.from('payments').select('*');
    ALL_STOCKS = stocks || []; ALL_SALES = sales || []; ALL_EXPENSES = expenses || [];
    ALL_PAYROLLS = payrolls || []; ALL_CLIENTS = clients || []; ALL_PAYMENTS = payments || [];
}

function renderGrouped(hostId, items, renderItemFn) {
    const host = document.getElementById(hostId);
    host.innerHTML = '';
    if (items.length === 0) {
        host.innerHTML = `<p class="note">Tiada rekod.</p>`;
        return;
    }
    const groups = {};
    items.forEach(item => {
        const date = item.date || new Date(item.created_at).toISOString().slice(0, 10);
        (groups[date] = groups[date] || []).push(item);
    });

    const sortedDates = Object.keys(groups).sort((a, b) => new Date(b) - new Date(a));

    sortedDates.forEach((date, dateIdx) => {
        const itemsHtml = groups[date].map(renderItemFn).join('');
        host.innerHTML += `<details class="date-group" ${dateIdx === 0 ? 'open' : ''}><summary class="date-group-summary">${date}</summary><div class="date-group-content">${itemsHtml}</div></details>`;
    });
}

function renderStocks() {
    renderGrouped('stockList', ALL_STOCKS, (st) => {
        const totalCost = (st.q12 * st.c12) + (st.q14 * st.c14) + (st.qi * st.ci);
        const color = `b${((st.batch || 0) % 6) || 6}`;
        return `<details class="record-item" data-id="${st.id}"><summary class="record-summary"><div><span class="summary-title"><span class="chip ${color}">#${st.batch}</span> ${st.note}</span><span class="summary-meta">Kos: RM ${fmt(totalCost)}</span></div><div class="record-actions"><button class="ghost danger" onclick="delStock(${st.id})">Padam</button></div></summary><div class="details-content">${st.q14 > 0 ? `<div class="details-row"><span class="label">14KG</span><span class="value">${st.q14} @ RM ${fmt(st.c14)}</span></div>` : ''}${st.q12 > 0 ? `<div class="details-row"><span class="label">12KG</span><span class="value">${st.q12} @ RM ${fmt(st.c12)}</span></div>` : ''}${st.qi > 0 ? `<div class="details-row"><span class="label">Industri</span><span class="value">${st.qi} @ RM ${fmt(st.ci)}</span></div>` : ''}</div></details>`;
    });
}

function renderExpenses() {
    renderGrouped('expList', ALL_EXPENSES, (ex) => {
        return `<details class="record-item" data-id="${ex.id}"><summary class="record-summary"><div><span class="summary-title">${ex.type}</span><span class="summary-meta">RM ${fmt(ex.amount)}</span></div><div class="record-actions"><button class="ghost danger" onclick="delExpense(${ex.id})">Padam</button></div></summary><div class="details-content"><p class="note">Nota: ${ex.note || '-'}</p></div></details>`;
    });
}

function renderSales() {
    renderGrouped('salesList', ALL_SALES, (s) => {
        const totalSales = (s.q12 * s.price12) + (s.q14 * s.price14) + (s.qi * s.priceI);
        const totalPaid = ((s.paid12||0) * s.price12) + ((s.paid14||0) * s.price14) + ((s.paidI||0) * s.priceI);
        const debtRM = totalSales - totalPaid;
        return `<details class="record-item" data-id="${s.id}"><summary class="record-summary"><div><span class="summary-title">${s.client_name}</span><span class="summary-meta">Jumlah: RM ${fmt(totalSales)} ${debtRM > 0.01 ? `<span class="chip danger-chip" style="margin-left: 5px;">Hutang</span>` : ''}</span></div></summary><div class="details-content">${s.q14 > 0 ? `<div class="details-row"><span class="label">14KG</span><span class="value">${s.q14} (Dibayar: ${s.paid14 || 0}) @ RM ${fmt(s.price14)}</span></div>` : ''}${s.q12 > 0 ? `<div class="details-row"><span class="label">12KG</span><span class="value">${s.q12} (Dibayar: ${s.paid12 || 0}) @ RM ${fmt(s.price12)}</span></div>` : ''}${s.qi > 0 ? `<div class="details-row"><span class="label">Industri</span><span class="value">${s.qi} (Dibayar: ${s.paidI || 0}) @ RM ${fmt(s.priceI)}</span></div>` : ''}<div class="details-row"><span class="label">Bayaran</span><span class="value">${s.payType}</span></div>${debtRM > 0.01 ? `<div class="details-row"><span class="label" style="color:var(--danger)">Baki Hutang Jualan Ini</span><span class="value" style="color:var(--danger)">RM ${fmt(debtRM)}</span></div>`: ''}<div class="divider"></div><div class="record-actions" style="justify-content: flex-end;"><button class="secondary" style="width:auto;" onclick='printReceipt(${s.id})'>Resit</button><button class="danger" style="width: auto;" onclick="delSale(${s.id})">Padam</button></div></div></details>`;
    });
}

function renderClients() {
    const tb = document.querySelector('#clientTable tbody'); tb.innerHTML = '';
    const sorted = [...ALL_CLIENTS].sort((a,b) => a.name.localeCompare(b.name));
    for (const c of sorted) {
        const debt = computeClientDebt(c.name);
        tb.innerHTML += `<tr><td>${c.name}</td><td>${c.cat || '-'}</td><td>${fmt(c.p14)}/${fmt(c.p12)}/${fmt(c.pi)}</td><td>RM ${fmt(debt.rm)}</td><td><button class="ghost danger" onclick="delClient(${c.id})">Padam</button></td></tr>`;
    }
}

function renderPayments() {
    const tb = document.querySelector('#payTable tbody'); tb.innerHTML = '';
    const sorted = [...ALL_PAYMENTS].sort((a,b) => new Date(b.date) - new Date(a.date));
    sorted.forEach(p => { tb.innerHTML += `<tr><td>${p.date}</td><td>${p.client_name}</td><td>RM ${fmt(p.amount)}</td><td>${p.method}</td><td>${p.note || '-'}</td></tr>`; });
}

function renderPayroll() {
    const tb = document.querySelector('#payrollTable tbody'); tb.innerHTML = '';
    const sorted = [...ALL_PAYROLLS].sort((a,b) => new Date(b.date) - new Date(a.date));
    sorted.forEach(p => { tb.innerHTML += `<tr><td>${p.date}</td><td>${p.name}</td><td>RM ${fmt(p.amount)}</td><td>${p.note || '-'}</td><td><button class="ghost danger" onclick="delPayroll(${p.id})">Padam</button></td></tr>`; });
}

// ==================
// FUNGSI PENGIRAAN
// ==================
function computeClientDebt(clientName) {
    const clientSales = ALL_SALES.filter(s => s.client_name === clientName);
    const clientPayments = ALL_PAYMENTS.filter(p => p.client_name === clientName);
    const totalSalesValue = clientSales.reduce((sum, s) => sum + (s.q12 * s.price12) + (s.q14 * s.price14) + (s.qi * s.priceI), 0);
    const totalPaidValue = clientPayments.reduce((sum, p) => sum + p.amount, 0);
    const debtInRM = Math.max(0, totalSalesValue - totalPaidValue);
    const sumCylinders = (records, key) => records.reduce((sum, r) => sum + (r[key] || 0), 0);
    
    const totalSold12 = sumCylinders(clientSales, 'q12');
    const totalPaid12 = sumCylinders(clientSales, 'paid12') + sumCylinders(clientPayments, 'q12');
    const debtInQ12 = totalSold12 - totalPaid12;
    const totalSold14 = sumCylinders(clientSales, 'q14');
    const totalPaid14 = sumCylinders(clientSales, 'paid14') + sumCylinders(clientPayments, 'q14');
    const debtInQ14 = totalSold14 - totalPaid14;
    const totalSoldI = sumCylinders(clientSales, 'qi');
    const totalPaidI = sumCylinders(clientSales, 'paidI') + sumCylinders(clientPayments, 'qi');
    const debtInQI = totalSoldI - totalPaidI;

    return { rm: debtInRM, q12: debtInQ12, q14: debtInQ14, qi: debtInQI };
}

function rebuildInventoryAndGetCosts(salesToProcess = null) {
    let inventory = { q12: [], q14: [], qi: [] };
    const sortedStocks = [...ALL_STOCKS].sort((a, b) => new Date(a.date) - new Date(b.date) || a.batch - b.batch);
    sortedStocks.forEach(s => {
        if (s.q12 > 0) inventory.q12.push({ batch: s.batch, remain: s.q12, cost: s.c12 });
        if (s.q14 > 0) inventory.q14.push({ batch: s.batch, remain: s.q14, cost: s.c14 });
        if (s.qi > 0) inventory.qi.push({ batch: s.batch, remain: s.qi, cost: s.ci });
    });
    const popInventory = (type, qty, inv) => {
        let totalCost = 0; let need = qty;
        while (need > 0 && inv[type].length > 0) {
            const node = inv[type][0];
            const take = Math.min(node.remain, need);
            if (take > 0) { totalCost += take * node.cost; node.remain -= take; need -= take; }
            if (node.remain === 0) { inv[type].shift(); }
        }
        return totalCost;
    };
    let totalCostOfGoodsSold = 0;
    let tempInventory = JSON.parse(JSON.stringify(inventory));
    const salesData = salesToProcess || ALL_SALES;
    const sortedSales = [...salesData].sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
    sortedSales.forEach(s => {
        if (s.q12 > 0) totalCostOfGoodsSold += popInventory('q12', s.q12, tempInventory);
        if (s.q14 > 0) totalCostOfGoodsSold += popInventory('q14', s.q14, tempInventory);
        if (s.qi > 0) totalCostOfGoodsSold += popInventory('qi', s.qi, tempInventory);
    });
    return totalCostOfGoodsSold;
}

function recomputeSummary() {
    const totalIn = (key) => ALL_STOCKS.reduce((sum, s) => sum + (s[key] || 0), 0);
    const totalSold = (key) => ALL_SALES.reduce((sum, s) => sum + (s[key] || 0), 0);
    const latestStock = [...ALL_STOCKS].sort((a,b) => new Date(b.date) - new Date(a.date) || b.batch - a.batch)[0] || {q12:0, q14:0, qi:0};
    const kp = [
        { k: 'Stok Terkini 14KG', v: latestStock.q14 },
        { k: 'Stok Terkini 12KG', v: latestStock.q12 },
        { k: 'Stok Terkini Industri', v: latestStock.qi },
        { k: 'Baki 14KG', v: totalIn('q14') - totalSold('q14') },
        { k: 'Baki 12KG', v: totalIn('q12') - totalSold('q12') },
        { k: 'Baki Industri', v: totalIn('qi') - totalSold('qi') },
        { k: 'Terjual 14KG', v: totalSold('q14') - (COUNTERS.soldAtReset.q14 || 0) },
        { k: 'Terjual 12KG', v: totalSold('q12') - (COUNTERS.soldAtReset.q12 || 0) },
        { k: 'Terjual Industri', v: totalSold('qi') - (COUNTERS.soldAtReset.qi || 0) },
    ];

    // tambah panel fizikal
    try {
        const dist = rebuildPhysicalDistribution();
        const p = dist.physicalTotals;
        kp.push(
            { k: 'Fizikal 14KG', v: p.q14 },
            { k: 'Fizikal 12KG', v: p.q12 },
            { k: 'Fizikal Industri', v: p.qi },
            { k: 'Lori 14KG (Isi)', v: dist.lori.filled.q14 },
            { k: 'Lori 14KG (Kosong)', v: dist.lori.empty.q14 },
            { k: 'Kilang 14KG (Isi)', v: dist.kilang.filled.q14 },
            { k: 'Lori 12KG (Isi)', v: dist.lori.filled.q12 },
            { k: 'Lori 12KG (Kosong)', v: dist.lori.empty.q12 },
            { k: 'Kilang 12KG (Isi)', v: dist.kilang.filled.q12 },
            { k: 'Lori Industri (Isi)', v: dist.lori.filled.qi },
            { k: 'Lori Industri (Kosong)', v: dist.lori.empty.qi },
            { k: 'Kilang Industri (Isi)', v: dist.kilang.filled.qi },
        );
    } catch(e) {
        console.warn('Fizikal tong tidak dapat dikira:', e);
    }

    document.getElementById('summaryBar').innerHTML = kp.map(x =>
        `<div class="kpi"><h4>${x.k}</h4><div class="v">${(x.v || 0).toLocaleString()}</div></div>`
    ).join('');
}

function renderReport(period = 'all') {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekStart = new Date(todayStart);
    weekStart.setDate(weekStart.getDate() - now.getDay());
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const filterByDate = (item) => {
        const itemDate = new Date(item.date || item.created_at);
        if (period === 'day') return itemDate >= todayStart;
        if (period === 'week') return itemDate >= weekStart;
        if (period === 'month') return itemDate >= monthStart;
        return true;
    };

    const filteredSales = ALL_SALES.filter(filterByDate);
    const filteredExpenses = ALL_EXPENSES.filter(filterByDate);
    const filteredPayrolls = ALL_PAYROLLS.filter(filterByDate);
    const filteredPayments = ALL_PAYMENTS.filter(filterByDate);

    const totalCostOfGoodsSold = rebuildInventoryAndGetCosts(filteredSales); 
    
    const totalOtherCost = filteredExpenses.reduce((s, x) => s + Number(x.amount || 0), 0);
    const totalPayrollCost = filteredPayrolls.reduce((s, x) => s + Number(x.amount || 0), 0);
    const totalSalesValue = filteredSales.reduce((sum, s) => sum + (s.q12 * s.price12) + (s.q14 * s.price14) + (s.qi * s.priceI), 0);
    
    const totalDebtRM = ALL_SALES.reduce((sum, s) => sum + (s.q12 * s.price12) + (s.q14 * s.price14) + (s.qi * s.priceI), 0) - ALL_PAYMENTS.reduce((sum, p) => sum + p.amount, 0);
    
    const totalCashPayments = filteredPayments.filter(p => p.method && p.method.toLowerCase() === 'cash').reduce((sum, p) => sum + p.amount, 0);
    const totalTransferPayments = filteredPayments.filter(p => p.method && p.method.toLowerCase() === 'transfer').reduce((sum, p) => sum + p.amount, 0);
    const totalPaymentsReceived = totalCashPayments + totalTransferPayments;
    
    const grossProfit = totalSalesValue - totalCostOfGoodsSold;
    const netProfit = grossProfit - totalOtherCost - totalPayrollCost;
    
    const kpis = [
        ['Jumlah Jualan', totalSalesValue, true], ['Untung Bersih', netProfit, true],
        ['Jumlah Hutang (Semua)', totalDebtRM, true], ['Untung Kasar', grossProfit, true],
        ['Modal Gas Terpakai', totalCostOfGoodsSold, true], ['Modal Lain', totalOtherCost, true],
        ['Gaji Pekerja', totalPayrollCost, true], ['Bayaran Diterima', totalPaymentsReceived, true],
    ];
    const host = document.getElementById('reportKPI');
    if (host) {
        host.innerHTML = kpis.map(([label, value, isRM]) => {
            return `<div class="kpi"><h4>${label}</h4><div class="v">${isRM ? 'RM ' : ''}${fmt(value)}</div></div>`;
        }).join('');
    }
}

// ==================
// OPERASI DATABASE
// ==================

// (bahagian asal sistem awak — addStock, addExpense, addSale, addDebtPayment, del*, printReceipt, export CSV, login admin, tukar theme, bottom nav dsb — kekal daripada file lama sebab kita tak ubah logic utama, cuma tambah modul fizikal + panggil dalam renderAll)

document.addEventListener('DOMContentLoaded', () => {
    // butang nav
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            const target = btn.getAttribute('data-target');
            document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
            document.getElementById(target).classList.add('active');
        });
    });

    // theme
    const savedTheme = localStorage.getItem(THEME_KEY);
    if (savedTheme) document.documentElement.setAttribute('data-theme', savedTheme);
    const themeBtn = document.getElementById('themeBtn');
    if (themeBtn) {
        themeBtn.addEventListener('click', () => {
            const cur = document.documentElement.getAttribute('data-theme') === 'light' ? 'dark' : 'light';
            document.documentElement.setAttribute('data-theme', cur);
            localStorage.setItem(THEME_KEY, cur);
        });
    }

    // sembunyi rekod
    const toggleRecordsBtn = document.getElementById('toggleRecordsBtn');
    if (toggleRecordsBtn) {
        toggleRecordsBtn.addEventListener('click', () => {
            document.body.classList.toggle('records-hidden');
            toggleRecordsBtn.textContent = document.body.classList.contains('records-hidden') ? 'Tunjuk Rekod' : 'Sembunyi Rekod';
        });
    }

    // login admin
    const adminLoginBtn = document.getElementById('btnAdminLogin');
    if (adminLoginBtn) {
        adminLoginBtn.addEventListener('click', () => {
            const pin = document.getElementById('adminPIN').value;
            if (pin === getPIN()) {
                document.getElementById('adminArea').style.display = 'block';
                initPhysicalForm(); // pastikan borang fizikal hidup bila login
            } else {
                alert('PIN salah');
            }
        });
    }

    // tukar pin
    const savePINBtn = document.getElementById('savePIN');
    if (savePINBtn) {
        savePINBtn.addEventListener('click', () => {
            const v = document.getElementById('setPIN').value.trim();
            if (!v) return;
            setPIN(v);
            alert('PIN berjaya ditukar');
        });
    }

    // reset counter
    const resetCounterBtn = document.getElementById('resetCounterBtn');
    if (resetCounterBtn) {
        resetCounterBtn.addEventListener('click', () => {
            COUNTERS.soldAtReset = { q12: totalSold('q12'), q14: totalSold('q14'), qi: totalSold('qi') };
            saveCounters();
            recomputeSummary();
            alert('Kiraan "Sold" telah direset.');
        });
    }

    renderAll();
});

// helper guna fungsi lama
function totalSold(key) {
    return ALL_SALES.reduce((sum, s) => sum + (s[key] || 0), 0);
}
function saveCounters() {
    localStorage.setItem(COUNTERS_KEY, JSON.stringify(COUNTERS));
}
