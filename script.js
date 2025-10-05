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

// Cache data untuk mengurangkan panggilan ke Supabase
let ALL_STOCKS = [];
let ALL_SALES = [];
let ALL_EXPENSES = [];
let ALL_PAYROLLS = [];
let ALL_CLIENTS = [];
let ALL_PAYMENTS = [];

// ==================
// FUNGSI UTAMA PAPARAN (RENDERING)
// ==================

async function renderAll() {
    // 1. Muat turun semua data dari Supabase sekali gus
    await fetchAllData();

    // 2. Gunakan data yang telah dimuat turun untuk render semua bahagian
    // Ini lebih pantas kerana tidak perlu query database berulang kali
    await Promise.all([
        renderStocks(),
        renderExpenses(),
        renderClients(),
        renderSales(),
        renderPayments(),
        renderPayroll(),
        recomputeSummary(),
        renderReport()
    ]);
}

async function fetchAllData() {
    const { data: stocks, error: e1 } = await supabaseClient.from('stocks').select('*');
    const { data: sales, error: e2 } = await supabaseClient.from('sales').select('*');
    const { data: expenses, error: e3 } = await supabaseClient.from('expenses').select('*');
    const { data: payrolls, error: e4 } = await supabaseClient.from('payrolls').select('*');
    const { data: clients, error: e5 } = await supabaseClient.from('clients').select('*');
    const { data: payments, error: e6 } = await supabaseClient.from('payments').select('*');

    if (e1 || e2 || e3 || e4 || e5 || e6) {
        console.error(e1 || e2 || e3 || e4 || e5 || e6);
        alert('Gagal memuat turun data dari server. Sila muat semula halaman.');
        return;
    }

    ALL_STOCKS = stocks || [];
    ALL_SALES = sales || [];
    ALL_EXPENSES = expenses || [];
    ALL_PAYROLLS = payrolls || [];
    ALL_CLIENTS = clients || [];
    ALL_PAYMENTS = payments || [];
}


// ==================
// FUNGSI PAPARAN SPESIFIK
// ==================

function renderStocks() {
    const host = document.getElementById('stockList');
    host.innerHTML = '';
    const sortedStocks = [...ALL_STOCKS].sort((a, b) => new Date(b.date) - new Date(a.date));

    if (sortedStocks.length === 0) { host.innerHTML = `<p class="note">Tiada rekod stok ditemui.</p>`; return; }
    
    sortedStocks.forEach((st, idx) => {
        const totalCost = (st.q12 * st.c12) + (st.q14 * st.c14) + (st.qi * st.ci);
        const color = `b${((st.batch || 0) % 6) || 6}`;
        host.innerHTML += `<details data-id="${st.id}" ${idx === 0 ? 'open' : ''}><summary><div><span class="summary-title"><span class="chip ${color}">#${st.batch}</span> ${st.date}</span><span class="summary-meta">${st.note} · Kos: RM ${fmt(totalCost)}</span></div><div class="record-actions"><button class="ghost danger" onclick="delStock(${st.id})">Padam</button></div></summary><div class="details-content">${st.q14 > 0 ? `<div class="details-row"><span class="label">14KG</span><span class="value">${st.q14} @ RM ${fmt(st.c14)}</span></div>` : ''}${st.q12 > 0 ? `<div class="details-row"><span class="label">12KG</span><span class="value">${st.q12} @ RM ${fmt(st.c12)}</span></div>` : ''}${st.qi > 0 ? `<div class="details-row"><span class="label">Industri</span><span class="value">${st.qi} @ RM ${fmt(st.ci)}</span></div>` : ''}</div></details>`;
    });
}

function renderExpenses() {
    const host = document.getElementById('expList');
    host.innerHTML = '';
    const sortedExpenses = [...ALL_EXPENSES].sort((a,b) => new Date(b.date) - new Date(a.date));

    if (sortedExpenses.length === 0) { host.innerHTML = `<p class="note">Tiada rekod modal lain ditemui.</p>`; return; }
    
    sortedExpenses.forEach((ex, idx) => {
        host.innerHTML += `<details data-id="${ex.id}" ${idx === 0 ? 'open' : ''}><summary><div><span class="summary-title">${ex.date} · ${ex.type}</span><span class="summary-meta">RM ${fmt(ex.amount)}</span></div><div class="record-actions"><button class="ghost danger" onclick="delExpense(${ex.id})">Padam</button></div></summary><div class="details-content"><p class="note">Nota: ${ex.note || '-'}</p></div></details>`;
    });
}

async function renderClients() {
    const tb = document.querySelector('#clientTable tbody');
    const dl = document.getElementById('clientList');
    const debtDl = document.getElementById('debtClientList');
    tb.innerHTML = ''; dl.innerHTML = ''; debtDl.innerHTML = '';
    
    const sortedClients = [...ALL_CLIENTS].sort((a,b) => a.name.localeCompare(b.name));

    for (const c of sortedClients) {
        const debt = computeClientDebt(c.name);
        tb.innerHTML += `<tr><td>${c.name}</td><td>${c.cat || '-'}</td><td>${fmt(c.p14)}/${fmt(c.p12)}/${fmt(c.pi)}</td><td>RM ${fmt(debt)}</td><td><button class="ghost danger" onclick="delClient(${c.id})">Padam</button></td></tr>`;
        dl.innerHTML += `<option value="${c.name}"></option>`;
        if (debt > 0) {
            debtDl.innerHTML += `<option value="${c.name}"></option>`;
        }
    }
}

function renderSales() {
    const host = document.getElementById('salesList');
    host.innerHTML = '';
    const sortedSales = [...ALL_SALES].sort((a,b) => new Date(b.created_at) - new Date(a.created_at));

    if (sortedSales.length === 0) { host.innerHTML = `<p class="note">Tiada rekod jualan ditemui.</p>`; return; }
    
    sortedSales.forEach((s, idx) => {
        const totalSales = (s.q12 * s.price12) + (s.q14 * s.price14) + (s.qi * s.priceI);
        host.innerHTML += `<details ${idx === 0 ? 'open' : ''}><summary><div><span class="summary-title">${s.client_name} · ${s.date}</span><span class="summary-meta">Jumlah: RM ${fmt(totalSales)} ${s.payType === 'Hutang' ? `<span class="chip danger-chip" style="margin-left: 5px;">Hutang</span>` : ''}</span></div></summary><div class="details-content">${s.q14 > 0 ? `<div class="details-row"><span class="label">14KG</span><span class="value">${s.q14} @ RM ${fmt(s.price14)}</span></div>` : ''}${s.q12 > 0 ? `<div class="details-row"><span class="label">12KG</span><span class="value">${s.q12} @ RM ${fmt(s.price12)}</span></div>` : ''}${s.qi > 0 ? `<div class="details-row"><span class="label">Industri</span><span class="value">${s.qi} @ RM ${fmt(s.priceI)}</span></div>` : ''}<div class="details-row"><span class="label">Bayaran</span><span class="value">${s.payType}</span></div><div class="divider"></div><div class="record-actions" style="justify-content: flex-end;"><button class="danger" style="width: auto;" onclick="delSale(${s.id})">Padam</button></div></div></details>`;
    });
}

function renderPayments() {
    const tb = document.querySelector('#payTable tbody');
    tb.innerHTML = '';
    const sortedPayments = [...ALL_PAYMENTS].sort((a,b) => new Date(b.date) - new Date(a.date));

    sortedPayments.forEach(p => {
        tb.innerHTML += `<tr><td>${p.date}</td><td>${p.client_name}</td><td>RM ${fmt(p.amount)}</td><td>${p.method}</td><td>${p.note || '-'}</td></tr>`;
    });
}

function renderPayroll() {
    const tb = document.querySelector('#payrollTable tbody');
    tb.innerHTML = '';
    const sortedPayrolls = [...ALL_PAYROLLS].sort((a,b) => new Date(b.date) - new Date(a.date));

    sortedPayrolls.forEach(p => {
        tb.innerHTML += `<tr><td>${p.date}</td><td>${p.name}</td><td>RM ${fmt(p.amount)}</td><td>${p.note || '-'}</td><td><button class="ghost danger" onclick="delPayroll(${p.id})">Padam</button></td></tr>`;
    });
}

// ==================
// FUNGSI PENGIRAAN (CALCULATIONS)
// ==================

function computeClientDebt(clientName) {
    const clientSales = ALL_SALES.filter(s => s.client_name === clientName);
    const clientPayments = ALL_PAYMENTS.filter(p => p.client_name === clientName);

    const totalSales = clientSales.reduce((sum, s) => sum + (s.q12 * s.price12) + (s.q14 * s.price14) + (s.qi * s.priceI), 0);
    const totalPayments = clientPayments.reduce((sum, p) => sum + p.amount, 0);

    return Math.max(0, totalSales - totalPayments);
}

function rebuildInventoryAndGetCosts() {
    let inventory = { k12: [], k14: [], ki: [] };
    const sortedStocks = [...ALL_STOCKS].sort((a, b) => new Date(a.date) - new Date(b.date) || a.batch - b.batch);

    sortedStocks.forEach(s => {
        if (s.q12 > 0) inventory.k12.push({ batch: s.batch, remain: s.q12, cost: s.c12 });
        if (s.q14 > 0) inventory.k14.push({ batch: s.batch, remain: s.q14, cost: s.c14 });
        if (s.qi > 0) inventory.ki.push({ batch: s.batch, remain: s.qi, cost: s.ci });
    });

    const popInventory = (type, qty) => {
        let totalCost = 0;
        let need = qty;
        while (need > 0 && inventory[type].length > 0) {
            const node = inventory[type][0];
            const take = Math.min(node.remain, need);
            if (take > 0) {
                totalCost += take * node.cost;
                node.remain -= take;
                need -= take;
            }
            if (node.remain === 0) {
                inventory[type].shift();
            }
        }
        return totalCost;
    };

    let totalCostOfGoodsSold = 0;
    const sortedSales = [...ALL_SALES].sort((a, b) => new Date(a.date) - new Date(b.date) || new Date(a.created_at) - new Date(b.created_at));

    sortedSales.forEach(s => {
        if (s.q12 > 0) totalCostOfGoodsSold += popInventory('k12', s.q12);
        if (s.q14 > 0) totalCostOfGoodsSold += popInventory('k14', s.q14);
        if (s.qi > 0) totalCostOfGoodsSold += popInventory('ki', s.qi);
    });

    return totalCostOfGoodsSold;
}

function recomputeSummary() {
    const totalIn = (key) => ALL_STOCKS.reduce((sum, s) => sum + (s[key] || 0), 0);
    const totalSold = (key) => ALL_SALES.reduce((sum, s) => sum + (s[key] || 0), 0);
    
    const kp = [
        { k: 'Baki 14KG', v: totalIn('q14') - totalSold('q14') },
        { k: 'Baki 12KG', v: totalIn('q12') - totalSold('q12') },
        { k: 'Baki Industri', v: totalIn('qi') - totalSold('qi') },
        { k: 'Terjual 14KG', v: totalSold('q14') },
        { k: 'Terjual 12KG', v: totalSold('q12') },
    ];

    document.getElementById('summaryBar').innerHTML = kp.map(x => `<div class="kpi"><h4>${x.k}</h4><div class="v">${(x.v || 0).toLocaleString()}</div></div>`).join('');
}

function renderReport() {
    const totalCostOfGoodsSold = rebuildInventoryAndGetCosts();
    const totalOtherCost = ALL_EXPENSES.reduce((s, x) => s + Number(x.amount || 0), 0);
    const totalPayrollCost = ALL_PAYROLLS.reduce((s, x) => s + Number(x.amount || 0), 0);
    const totalSalesRM = ALL_SALES.reduce((s, x) => s + (x.q12 * x.price12) + (x.q14 * x.price14) + (x.qi * x.priceI), 0);
    const totalPaymentsRM = ALL_PAYMENTS.reduce((s, x) => s + Number(x.amount || 0), 0);
    const totalDebtRM = totalSalesRM - totalPaymentsRM;
    const grossProfit = totalSalesRM - totalCostOfGoodsSold;
    const netProfit = grossProfit - totalOtherCost - totalPayrollCost;

    const kpis = [
        ['Jumlah Jualan', totalSalesRM, true],
        ['Untung Bersih', netProfit, true],
        ['Jumlah Hutang', totalDebtRM, true],
        ['Untung Kasar', grossProfit, true],
        ['Modal Gas Terpakai', totalCostOfGoodsSold, true],
        ['Modal Lain', totalOtherCost, true],
        ['Gaji Dibayar', totalPayrollCost, true],
        ['Bayaran Diterima', totalPaymentsRM, true],
    ];

    document.getElementById('reportKPI').innerHTML = kpis.map(([label, value, isCurrency]) => {
        return `<div class="kpi" style="background: var(--surface-2);"><h4>${label}</h4><div class="v">${isCurrency ? `RM ${fmt(value)}` : (value || 0).toLocaleString()}</div></div>`;
    }).join('');
}

// ==================
// FUNGSI AKSI (ACTIONS)
// ==================

async function addStock() { /* ... (kod sama seperti sebelum ini) ... */ }
async function delStock(id) { /* ... (kod sama seperti sebelum ini) ... */ }
async function addExpense() { /* ... (kod sama seperti sebelum ini) ... */ }
async function delExpense(id) { /* ... (kod sama seperti sebelum ini) ... */ }
async function addClient() { /* ... (kod sama seperti sebelum ini) ... */ }
async function delClient(id) { /* ... (kod sama seperti sebelum ini) ... */ }
async function addSale() { /* ... (kod sama seperti sebelum ini) ... */ }
async function delSale(id) { /* ... (kod sama seperti sebelum ini) ... */ }
async function addDebtPayment() { /* ... (kod sama seperti sebelum ini) ... */ }

// Kod penuh untuk fungsi-fungsi di atas
async function addStock() {
    const newStock = { date: document.getElementById('stDate').value || today(), note: document.getElementById('stNote').value, q14: +document.getElementById('stQ14').value || 0, c14: +document.getElementById('stC14').value || 0, q12: +document.getElementById('stQ12').value || 0, c12: +document.getElementById('stC12').value || 0, qi: +document.getElementById('stQI').value || 0, ci: +document.getElementById('stCI').value || 0, batch: Date.now() };
    if (!newStock.note) { alert('Nota wajib diisi.'); return; }
    const { error } = await supabaseClient.from('stocks').insert([newStock]);
    if (error) { alert('Gagal menambah stok!'); console.error(error); } 
    else { alert('Stok berjaya ditambah!'); document.getElementById('addStockForm').reset(); document.getElementById('stDate').value = today(); renderAll(); }
}
async function delStock(id) { if (!confirm('Anda pasti?')) return; const { error } = await supabaseClient.from('stocks').delete().eq('id', id); if (error) alert('Gagal padam.'); else renderAll(); }

async function addExpense() {
    const newExpense = { date: document.getElementById('exDate').value || today(), type: document.getElementById('exType').value, amount: +document.getElementById('exAmt').value || 0, note: document.getElementById('exNote').value };
    if (newExpense.amount <= 0) { alert('Sila masukkan jumlah.'); return; }
    const { error } = await supabaseClient.from('expenses').insert([newExpense]);
    if (error) { alert('Gagal menambah modal!'); console.error(error); }
    else { alert('Modal berjaya ditambah!'); document.getElementById('addExpenseForm').reset(); document.getElementById('exDate').value = today(); renderAll(); }
}
async function delExpense(id) { if (!confirm('Anda pasti?')) return; const { error } = await supabaseClient.from('expenses').delete().eq('id', id); if (error) alert('Gagal padam.'); else renderAll(); }

async function addClient() {
    const newClient = { name: document.getElementById('clName').value, cat: document.getElementById('clCat').value, p14: +document.getElementById('clP14').value || 0, p12: +document.getElementById('clP12').value || 0, pi: +document.getElementById('clPI').value || 0 };
    if (!newClient.name) { alert('Nama pelanggan wajib diisi.'); return; }
    const { error } = await supabaseClient.from('clients').insert([newClient]);
    if (error) { alert('Gagal menambah pelanggan!'); console.error(error); }
    else { alert('Pelanggan berjaya ditambah!'); document.getElementById('addClientForm').reset(); renderAll(); }
}
async function delClient(id) { if (!confirm('Anda pasti?')) return; const { error } = await supabaseClient.from('clients').delete().eq('id', id); if (error) alert('Gagal padam.'); else renderAll(); }

async function addSale() {
    const clientName = document.getElementById('slClient').value;
    if (!clientName) { alert('Sila pilih pelanggan.'); return; }
    const clientData = ALL_CLIENTS.find(c => c.name === clientName);
    if (!clientData) { alert('Pelanggan tidak ditemui.'); return; }

    const newSale = { date: document.getElementById('slDate').value || today(), client_name: clientName, q14: +document.getElementById('slQ14').value || 0, q12: +document.getElementById('slQ12').value || 0, qi: +document.getElementById('slQI').value || 0, price14: clientData.p14, price12: clientData.p12, priceI: clientData.pi, payType: document.getElementById('slPayType').value, remark: document.getElementById('slRemark').value };
    if (newSale.q12 + newSale.q14 + newSale.qi <= 0) { alert('Sila masukkan sekurang-kurangnya satu tong.'); return; }
    
    // Jika bukan hutang, rekod terus dalam payments
    if(newSale.payType !== 'Hutang') {
        const amount = (newSale.q12 * newSale.price12) + (newSale.q14 * newSale.price14) + (newSale.qi * newSale.priceI);
        await supabaseClient.from('payments').insert([{ date: newSale.date, client_name: newSale.client_name, amount: amount, method: newSale.payType, note: `Bayaran jualan ${newSale.remark}` }]);
    }
    
    const { error } = await supabaseClient.from('sales').insert([newSale]);
    if (error) { alert('Gagal merekod jualan!'); console.error(error); }
    else { alert('Jualan berjaya direkod!'); document.getElementById('addSaleForm').reset(); document.getElementById('slDate').value = today(); renderAll(); }
}
async function delSale(id) { if (!confirm('Anda pasti?')) return; const { error } = await supabaseClient.from('sales').delete().eq('id', id); if (error) alert('Gagal padam.'); else renderAll(); }

async function addDebtPayment() {
    const clientName = document.getElementById('debtClient').value;
    if (!clientName) { alert('Sila pilih pelanggan.'); return; }
    const clientData = ALL_CLIENTS.find(c => c.name === clientName);
    if (!clientData) { alert('Pelanggan tidak ditemui.'); return; }
    const q14 = +document.getElementById('payQ14').value || 0; const q12 = +document.getElementById('payQ12').value || 0; const qi = +document.getElementById('payQI').value || 0;
    const amount = (q14 * clientData.p14) + (q12 * clientData.p12) + (qi * clientData.pi);
    if (amount <= 0) { alert('Sila masukkan sekurang-kurangnya satu tong yang dibayar.'); return; }
    const newPayment = { date: today(), client_name: clientName, q14, q12, qi, amount, method: document.getElementById('debtMethod').value, note: document.getElementById('payNote').value };
    const { error } = await supabaseClient.from('payments').insert([newPayment]);
    if (error) { alert('Gagal merekod bayaran!'); console.error(error); } 
    else { alert('Bayaran hutang berjaya direkod!'); document.getElementById('payDebtForm').reset(); document.getElementById('debtInfo').innerHTML = 'Pilih pelanggan untuk lihat baki hutang.'; renderAll(); }
}

async function addPayroll() {
    const newPayroll = { date: document.getElementById('pgDate').value || today(), name: document.getElementById('pgName').value, amount: +document.getElementById('pgAmt').value || 0, note: document.getElementById('pgNote').value };
    if(newPayroll.amount <= 0) { alert('Sila masukkan jumlah gaji.'); return; }
    if(!newPayroll.name) { alert('Sila masukkan nama pekerja.'); return; }
    const { error } = await supabaseClient.from('payrolls').insert([newPayroll]);
    if (error) { alert('Gagal menambah rekod gaji!'); console.error(error); }
    else { alert('Rekod gaji berjaya ditambah!'); document.getElementById('addPayrollForm').reset(); document.getElementById('pgDate').value = today(); renderAll(); }
}
async function delPayroll(id) { if (!confirm('Anda pasti?')) return; const { error } = await supabaseClient.from('payrolls').delete().eq('id', id); if (error) alert('Gagal padam.'); else renderAll(); }

async function deleteAllData() {
    if (prompt('AWAS! Ini akan memadam SEMUA data (stok, jualan, pelanggan, dll). Taip "PADAM SEMUA" untuk sahkan.') !== 'PADAM SEMUA') {
        alert('Operasi dibatalkan.');
        return;
    }
    try {
        await supabaseClient.from('stocks').delete().gt('id', 0);
        await supabaseClient.from('sales').delete().gt('id', 0);
        await supabaseClient.from('expenses').delete().gt('id', 0);
        await supabaseClient.from('payrolls').delete().gt('id', 0);
        await supabaseClient.from('payments').delete().gt('id', 0);
        await supabaseClient.from('clients').delete().gt('id', 0);
        alert('Semua data telah berjaya dipadam.');
        renderAll();
    } catch (error) {
        alert('Gagal memadam semua data.');
        console.error(error);
    }
}

// ==================
// SETUP PERMULAAN (INITIALIZATION)
// ==================
function setupUIListeners() {
    // Navigasi
    const navBtns = document.querySelectorAll('.nav-btn');
    const views = document.querySelectorAll('.view');
    navBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            navBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            views.forEach(v => v.classList.remove('active'));
            document.getElementById(`view-${btn.dataset.view}`).classList.add('active');
            window.scrollTo(0, 0);
        });
    });

    // Butang Aksi
    document.getElementById('addStock').addEventListener('click', addStock);
    document.getElementById('addExpense').addEventListener('click', addExpense);
    document.getElementById('addClient').addEventListener('click', addClient);
    document.getElementById('addSale').addEventListener('click', addSale);
    document.getElementById('btnRefreshClients').addEventListener('click', renderAll);
    document.getElementById('btnPayDebt').addEventListener('click', addDebtPayment);
    document.getElementById('addPayroll').addEventListener('click', addPayroll);
    document.getElementById('savePIN').addEventListener('click', () => {
        const newPin = document.getElementById('setPIN').value;
        if (newPin) { setPIN(newPin); alert('PIN baru telah disimpan.'); }
        else { alert('PIN tidak boleh kosong.'); }
    });
    document.getElementById('deleteAllDataBtn').addEventListener('click', deleteAllData);

    // Input Events
    document.getElementById('debtClient').addEventListener('input', (e) => {
        const clientName = e.target.value;
        const debtInfo = document.getElementById('debtInfo');
        if (!clientName) { debtInfo.innerHTML = 'Pilih pelanggan untuk lihat baki hutang.'; return; }
        const debt = computeClientDebt(clientName);
        debtInfo.innerHTML = `Baki hutang semasa: <b>RM ${fmt(debt)}</b>`;
    });
    ['slClient', 'slQ14', 'slQ12', 'slQI'].forEach(id => {
        document.getElementById(id).addEventListener('input', () => {
            const client = ALL_CLIENTS.find(c => c.name === document.getElementById('slClient').value);
            if(!client) { document.getElementById('slCalc').innerHTML = 'Pilih pelanggan yang sah.'; return; }
            const q14 = +document.getElementById('slQ14').value || 0;
            const q12 = +document.getElementById('slQ12').value || 0;
            const qi = +document.getElementById('slQI').value || 0;
            const total = (q14 * client.p14) + (q12 * client.p12) + (qi * client.pi);
            document.getElementById('slCalc').innerHTML = `Anggaran Jumlah Jualan: <b>RM ${fmt(total)}</b>`;
        });
    });

    // Admin Login
    document.getElementById('btnAdminLogin').addEventListener('click', () => {
        if (document.getElementById('adminPIN').value === getPIN()) {
            document.getElementById('adminLogin').style.display = 'none';
            document.getElementById('adminArea').style.display = 'block';
        } else {
            alert('PIN salah');
        }
    });

    // Tarikh
    ['stDate', 'exDate', 'slDate', 'pgDate'].forEach(id => {
        if(document.getElementById(id)) document.getElementById(id).value = today();
    });
    
    // Tema
    const themeBtn = document.getElementById('themeBtn');
    const currentTheme = localStorage.getItem('thc_theme') || 'dark';
    document.documentElement.setAttribute('data-theme', currentTheme);
    themeBtn.onclick = () => {
        const newTheme = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
        document.documentElement.setAttribute('data-theme', newTheme);
        localStorage.setItem('thc_theme', newTheme);
    };
}

document.addEventListener('DOMContentLoaded', () => {
    setupUIListeners();
    renderAll();
});