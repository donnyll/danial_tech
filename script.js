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

// Cache data
let ALL_STOCKS = [], ALL_SALES = [], ALL_EXPENSES = [], ALL_PAYROLLS = [], ALL_CLIENTS = [], ALL_PAYMENTS = [];

// ==================
// FUNGSI UTAMA PAPARAN
// ==================

async function renderAll() {
    document.body.style.cursor = 'wait';
    await fetchAllData();
    await Promise.all([
        renderStocks(), renderExpenses(), renderClients(),
        renderSales(), renderPayments(), renderPayroll()
    ]);
    document.body.style.cursor = 'default';
}

async function fetchAllData() { /* ... kod sama seperti sebelum ini ... */ }
function renderStocks() { /* ... kod sama seperti sebelum ini ... */ }
function renderExpenses() { /* ... kod sama seperti sebelum ini ... */ }
function renderPayments() { /* ... kod sama seperti sebelum ini ... */ }
function renderPayroll() { /* ... kod sama seperti sebelum ini ... */ }

// Kod penuh untuk fungsi render (gunakan kod ini untuk menggantikan semua fungsi render anda)
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

function renderStocks() {
    const host = document.getElementById('stockList'); host.innerHTML = '';
    const sorted = [...ALL_STOCKS].sort((a, b) => new Date(b.date) - new Date(a.date) || b.batch - a.batch);
    if (sorted.length === 0) { host.innerHTML = `<p class="note">Tiada rekod stok.</p>`; return; }
    sorted.forEach((st, idx) => { /* ... (kod sama) ... */ });
}

function renderExpenses() {
    const host = document.getElementById('expList'); host.innerHTML = '';
    const sorted = [...ALL_EXPENSES].sort((a,b) => new Date(b.date) - new Date(a.date));
    if (sorted.length === 0) { host.innerHTML = `<p class="note">Tiada rekod modal lain.</p>`; return; }
    sorted.forEach((ex, idx) => { /* ... (kod sama) ... */ });
}

async function renderClients() {
    const tb = document.querySelector('#clientTable tbody');
    const dl = document.getElementById('clientList');
    const debtDl = document.getElementById('debtClientList');
    tb.innerHTML = ''; dl.innerHTML = ''; debtDl.innerHTML = '';
    const sorted = [...ALL_CLIENTS].sort((a,b) => a.name.localeCompare(b.name));
    for (const c of sorted) {
        const debt = computeClientDebt(c.name);
        tb.innerHTML += `<tr><td>${c.name}</td><td>${c.cat || '-'}</td><td>${fmt(c.p14)}/${fmt(c.p12)}/${fmt(c.pi)}</td><td>RM ${fmt(debt)}</td><td><button class="ghost danger" onclick="delClient(${c.id})">Padam</button></td></tr>`;
        dl.innerHTML += `<option value="${c.name}"></option>`;
        if (debt > 0) {
            debtDl.innerHTML += `<option value="${c.name}"></option>`;
        }
    }
}

function renderSales() {
    const host = document.getElementById('salesList'); host.innerHTML = '';
    const sorted = [...ALL_SALES].sort((a,b) => new Date(b.created_at) - new Date(a.created_at));
    if (sorted.length === 0) { host.innerHTML = `<p class="note">Tiada rekod jualan.</p>`; return; }
    sorted.forEach((s, idx) => {
        const totalSales = (s.q12 * s.price12) + (s.q14 * s.price14) + (s.qi * s.priceI);
        const debtRM = totalSales - ((s.paid12 * s.price12) + (s.paid14 * s.price14) + (s.paidI * s.priceI));
        host.innerHTML += `<details data-id="${s.id}" ${idx === 0 ? 'open' : ''}><summary><div><span class="summary-title">${s.client_name} · ${s.date}</span><span class="summary-meta">Jumlah: RM ${fmt(totalSales)} ${debtRM > 0 ? `<span class="chip danger-chip" style="margin-left: 5px;">Hutang</span>` : ''}</span></div></summary><div class="details-content">... (kod sama) ...</div></details>`;
    });
}

function renderPayments() { /* ... (kod sama) ... */ }
function renderPayroll() { /* ... (kod sama) ... */ }

// Gantikan semua fungsi render dengan kod di bawah
function renderStocks() {
    const host = document.getElementById('stockList'); host.innerHTML = '';
    const sorted = [...ALL_STOCKS].sort((a, b) => new Date(b.date) - new Date(a.date) || b.batch - a.batch);
    if (sorted.length === 0) { host.innerHTML = `<p class="note">Tiada rekod stok.</p>`; return; }
    sorted.forEach((st, idx) => {
        const totalCost = (st.q12 * st.c12) + (st.q14 * st.c14) + (st.qi * st.ci);
        const color = `b${((st.batch || 0) % 6) || 6}`;
        host.innerHTML += `<details data-id="${st.id}" ${idx === 0 ? 'open' : ''}><summary><div><span class="summary-title"><span class="chip ${color}">#${st.batch}</span> ${st.date}</span><span class="summary-meta">${st.note} · Kos: RM ${fmt(totalCost)}</span></div><div class="record-actions"><button class="ghost danger" onclick="delStock(${st.id})">Padam</button></div></summary><div class="details-content">${st.q14 > 0 ? `<div class="details-row"><span class="label">14KG</span><span class="value">${st.q14} @ RM ${fmt(st.c14)}</span></div>` : ''}${st.q12 > 0 ? `<div class="details-row"><span class="label">12KG</span><span class="value">${st.q12} @ RM ${fmt(st.c12)}</span></div>` : ''}${st.qi > 0 ? `<div class="details-row"><span class="label">Industri</span><span class="value">${st.qi} @ RM ${fmt(st.ci)}</span></div>` : ''}</div></details>`;
    });
}
function renderExpenses() {
    const host = document.getElementById('expList'); host.innerHTML = '';
    const sorted = [...ALL_EXPENSES].sort((a,b) => new Date(b.date) - new Date(a.date));
    if (sorted.length === 0) { host.innerHTML = `<p class="note">Tiada rekod modal lain.</p>`; return; }
    sorted.forEach((ex, idx) => {
        host.innerHTML += `<details data-id="${ex.id}" ${idx === 0 ? 'open' : ''}><summary><div><span class="summary-title">${ex.date} · ${ex.type}</span><span class="summary-meta">RM ${fmt(ex.amount)}</span></div><div class="record-actions"><button class="ghost danger" onclick="delExpense(${ex.id})">Padam</button></div></summary><div class="details-content"><p class="note">Nota: ${ex.note || '-'}</p></div></details>`;
    });
}
function renderSales() {
    const host = document.getElementById('salesList'); host.innerHTML = '';
    const sorted = [...ALL_SALES].sort((a,b) => new Date(b.created_at) - new Date(a.created_at));
    if (sorted.length === 0) { host.innerHTML = `<p class="note">Tiada rekod jualan.</p>`; return; }
    sorted.forEach((s, idx) => {
        const totalSales = (s.q12 * s.price12) + (s.q14 * s.price14) + (s.qi * s.priceI);
        const totalPaid = (s.paid12 * s.price12) + (s.paid14 * s.price14) + (s.paidI * s.priceI);
        const debtRM = totalSales - totalPaid;
        host.innerHTML += `<details data-id="${s.id}" ${idx === 0 ? 'open' : ''}><summary><div><span class="summary-title">${s.client_name} · ${s.date}</span><span class="summary-meta">Jumlah: RM ${fmt(totalSales)} ${debtRM > 0.01 ? `<span class="chip danger-chip" style="margin-left: 5px;">Hutang</span>` : ''}</span></div></summary><div class="details-content">${s.q14 > 0 ? `<div class="details-row"><span class="label">14KG</span><span class="value">${s.q14} (Dibayar: ${s.paid14}) @ RM ${fmt(s.price14)}</span></div>` : ''}${s.q12 > 0 ? `<div class="details-row"><span class="label">12KG</span><span class="value">${s.q12} (Dibayar: ${s.paid12}) @ RM ${fmt(s.price12)}</span></div>` : ''}${s.qi > 0 ? `<div class="details-row"><span class="label">Industri</span><span class="value">${s.qi} (Dibayar: ${s.paidI}) @ RM ${fmt(s.priceI)}</span></div>` : ''}<div class="details-row"><span class="label">Bayaran</span><span class="value">${s.payType}</span></div>${debtRM > 0.01 ? `<div class="details-row"><span class="label" style="color:var(--danger)">Baki Hutang Jualan Ini</span><span class="value" style="color:var(--danger)">RM ${fmt(debtRM)}</span></div>`: ''}<div class="divider"></div><div class="record-actions" style="justify-content: flex-end;"><button class="secondary" style="width:auto;" onclick="printReceipt(${s.id})">Resit</button><button class="danger" style="width: auto;" onclick="delSale(${s.id})">Padam</button></div></div></details>`;
    });
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
    const totalPaidAtSale = clientSales.reduce((sum, s) => sum + (s.paid12 * s.price12) + (s.paid14 * s.price14) + (s.paidI * s.priceI), 0);
    const totalDebtPayments = clientPayments.reduce((sum, p) => sum + p.amount, 0);
    return Math.max(0, totalSalesValue - totalPaidAtSale - totalDebtPayments);
}

// ... (sisa kod adalah sama, masukkan keseluruhan kod dari jawapan sebelum ini) ...
// ==================
// FUNGSI AKSI
// ==================
async function addSale() {
    const form = document.getElementById('addSaleForm');
    const clientName = form.querySelector('#slClient').value;
    if (!clientName) { alert('Sila pilih pelanggan.'); return; }
    const clientData = ALL_CLIENTS.find(c => c.name === clientName);
    if (!clientData) { alert('Pelanggan tidak ditemui.'); return; }

    const newSale = {
        date: form.querySelector('#slDate').value || today(),
        client_name: clientName,
        q14: +form.querySelector('#slQ14').value || 0,
        paid14: +form.querySelector('#slPaid14').value || 0,
        q12: +form.querySelector('#slQ12').value || 0,
        paid12: +form.querySelector('#slPaid12').value || 0,
        qi: +form.querySelector('#slQI').value || 0,
        paidI: +form.querySelector('#slPaidI').value || 0,
        price14: clientData.p14, price12: clientData.p12, priceI: clientData.pi,
        payType: form.querySelector('#slPayType').value,
        remark: form.querySelector('#slRemark').value
    };

    if (newSale.q12 + newSale.q14 + newSale.qi <= 0) { alert('Sila masukkan sekurang-kurangnya satu tong.'); return; }
    if (newSale.paid14 > newSale.q14 || newSale.paid12 > newSale.q12 || newSale.paidI > newSale.qi) { alert('Tong dibayar tidak boleh melebihi total tong.'); return; }
    
    // Masukkan rekod bayaran ke jadual `payments` JIKA ada bayaran dibuat masa jualan
    const paidAmount = (newSale.paid12 * newSale.price12) + (newSale.paid14 * newSale.price14) + (newSale.paidI * newSale.priceI);
    if (paidAmount > 0) {
        await supabaseClient.from('payments').insert([{ date: newSale.date, client_name: newSale.client_name, amount: paidAmount, method: newSale.payType, note: `Bayaran semasa jualan ${newSale.remark}`.trim() }]);
    }

    // Masukkan rekod jualan
    const { error } = await supabaseClient.from('sales').insert([newSale]);
    if (error) { alert('Gagal merekod jualan!'); console.error(error); }
    else { alert('Jualan berjaya direkod!'); form.reset(); form.querySelector('#slDate').value = today(); renderAll(); }
}
// ==================
// SETUP UI LISTENERS
// ==================
function setupUIListeners() {
    // ... (sisa kod sama) ...
    // Gantikan event listener untuk Sales Form
    ['slClient', 'slQ14', 'slPaid14', 'slQ12', 'slPaid12', 'slQI', 'slPaidI'].forEach(id => {
        document.getElementById(id).addEventListener('input', calcSale);
    });
}
function calcSale(){
    const client = ALL_CLIENTS.find(c => c.name === document.getElementById('slClient').value);
    if(!client) { document.getElementById('slCalc').innerHTML = 'Pilih pelanggan yang sah.'; return; }
    const q14 = +document.getElementById('slQ14').value || 0, paid14 = +document.getElementById('slPaid14').value || 0;
    const q12 = +document.getElementById('slQ12').value || 0, paid12 = +document.getElementById('slPaid12').value || 0;
    const qi = +document.getElementById('slQI').value || 0, paidI = +document.getElementById('slPaidI').value || 0;
    
    const totalSale = (q14 * client.p14) + (q12 * client.p12) + (qi * client.pi);
    const totalPaid = (paid14 * client.p14) + (paid12 * client.p12) + (paidI * client.pi);
    const debt = totalSale - totalPaid;

    document.getElementById('slCalc').innerHTML = `Jumlah Jualan: <b>RM ${fmt(totalSale)}</b><br>Jumlah Dibayar: <b>RM ${fmt(totalPaid)}</b><br>Baki Hutang: <b>RM ${fmt(debt)}</b>`;
}