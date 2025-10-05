// ==================
// SETUP & KONFIGURASI
// ==================
const SUPABASE_URL = 'https://dxyvftujqgkjmbqpgyfg.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR4eXZmdHVqcWdram1icXBneWZnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk2Njc3MTUsImV4cCI6MjA3NTI0MzcxNX0.IVXS3hz_iO4S5B5KmQJJEcepzFqtTW-cxbmQmD7aevE';

const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

const fmt = (n) => Number(n || 0).toLocaleString('ms-MY', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const today = () => new Date(new Date().getTime() - (new Date().getTimezoneOffset() * 60000)).toISOString().slice(0, 10);

// ==================
// FUNGSI PAPARAN (RENDERING)
// ==================

async function renderAll() {
    await Promise.all([
        renderStocks(),
        renderExpenses(),
        renderClients(),
        renderSales(),
        renderPayroll(),
        renderReport(),
        recomputeSummary()
    ]);
}

async function recomputeSummary() {
    const { data: stocks, error: stockError } = await supabaseClient.from('stocks').select('q12, q14, qi');
    const { data: sales, error: salesError } = await supabaseClient.from('sales').select('q12, q14, qi');

    if (stockError || salesError) return;

    const totalIn = (key) => stocks.reduce((sum, s) => sum + (s[key] || 0), 0);
    const totalSold = (key) => sales.reduce((sum, s) => sum + (s[key] || 0), 0);
    
    const kp = [
        { k: 'Baki 14KG', v: totalIn('q14') - totalSold('q14') },
        { k: 'Baki 12KG', v: totalIn('q12') - totalSold('q12') },
        { k: 'Baki Industri', v: totalIn('qi') - totalSold('qi') },
        { k: 'Terjual 14KG', v: totalSold('q14') },
        { k: 'Terjual 12KG', v: totalSold('q12') },
    ];

    document.getElementById('summaryBar').innerHTML = kp.map(x => `
    <div class="kpi"><h4>${x.k}</h4><div class="v">${(x.v || 0).toLocaleString()}</div></div>`).join('');
}

async function renderStocks() {
    const host = document.getElementById('stockList');
    host.innerHTML = 'Memuatkan data stok...';
    const { data: stocks, error } = await supabaseClient.from('stocks').select('*').order('date', { ascending: false });
    if (error) { host.innerHTML = '<p class="note">Gagal memuatkan data stok.</p>'; console.error(error); return; }
    if (stocks.length === 0) { host.innerHTML = `<p class="note">Tiada rekod stok gas ditemui.</p>`; return; }
    host.innerHTML = '';
    stocks.forEach((st, idx) => {
        const totalCost = (st.q12 * st.c12) + (st.q14 * st.c14) + (st.qi * st.ci);
        const color = `b${((st.batch || 0) % 6) || 6}`;
        host.innerHTML += `<details data-id="${st.id}" ${idx === 0 ? 'open' : ''}><summary><div><span class="summary-title"><span class="chip ${color}">#${st.batch}</span> ${st.date}</span><span class="summary-meta">${st.note} · Kos: RM ${fmt(totalCost)}</span></div><div class="record-actions"><button class="ghost danger" onclick="delStock(${st.id})">Padam</button></div></summary><div class="details-content">${st.q14 > 0 ? `<div class="details-row"><span class="label">14KG</span><span class="value">${st.q14} tong @ RM ${fmt(st.c14)}</span></div>` : ''}${st.q12 > 0 ? `<div class="details-row"><span class="label">12KG</span><span class="value">${st.q12} tong @ RM ${fmt(st.c12)}</span></div>` : ''}${st.qi > 0 ? `<div class="details-row"><span class="label">Industri</span><span class="value">${st.qi} tong @ RM ${fmt(st.ci)}</span></div>` : ''}</div></details>`;
    });
}

async function renderExpenses() {
    const host = document.getElementById('expList');
    host.innerHTML = 'Memuatkan data modal...';
    const { data: expenses, error } = await supabaseClient.from('expenses').select('*').order('date', { ascending: false });
    if (error) { host.innerHTML = '<p class="note">Gagal memuatkan data modal.</p>'; console.error(error); return; }
    if (expenses.length === 0) { host.innerHTML = `<p class="note">Tiada rekod modal lain ditemui.</p>`; return; }
    host.innerHTML = '';
    expenses.forEach((ex, idx) => {
        host.innerHTML += `<details data-id="${ex.id}" ${idx === 0 ? 'open' : ''}><summary><div><span class="summary-title">${ex.date} · ${ex.type}</span><span class="summary-meta">RM ${fmt(ex.amount)}</span></div><div class="record-actions"><button class="ghost danger" onclick="delExpense(${ex.id})">Padam</button></div></summary><div class="details-content"><p class="note">Nota: ${ex.note || '-'}</p></div></details>`;
    });
}

async function renderClients() {
    const tb = document.querySelector('#clientTable tbody');
    const dl = document.getElementById('clientList');
    tb.innerHTML = ''; dl.innerHTML = '';
    const { data: clients, error } = await supabaseClient.from('clients').select('*').order('name');
    if (error || !clients) return;
    clients.forEach(c => {
        tb.innerHTML += `<tr><td>${c.name}</td><td>${c.cat || '-'}</td><td>${fmt(c.p14)}/${fmt(c.p12)}/${fmt(c.pi)}</td><td><button class="ghost danger" onclick="delClient(${c.id})">Padam</button></td></tr>`;
        dl.innerHTML += `<option value="${c.name}"></option>`;
    });
}

async function renderSales() {
    const host = document.getElementById('salesList');
    host.innerHTML = 'Memuatkan data jualan...';
    const { data: sales, error } = await supabaseClient.from('sales').select('*').order('created_at', { ascending: false });
    if (error) { host.innerHTML = '<p class="note">Gagal memuatkan data jualan.</p>'; console.error(error); return; }
    if (sales.length === 0) { host.innerHTML = `<p class="note">Tiada rekod jualan ditemui.</p>`; return; }
    host.innerHTML = '';
    sales.forEach((s, idx) => {
        const totalSales = (s.q12 * s.price12) + (s.q14 * s.price14) + (s.qi * s.priceI);
        host.innerHTML += `<details ${idx === 0 ? 'open' : ''}><summary><div><span class="summary-title">${s.client_name} · ${s.date}</span><span class="summary-meta">Jumlah: RM ${fmt(totalSales)} ${s.payType === 'Hutang' ? `<span class="chip danger-chip" style="margin-left: 5px;">Hutang</span>` : ''}</span></div></summary><div class="details-content">${s.q14 > 0 ? `<div class="details-row"><span class="label">14KG</span><span class="value">${s.q14} @ RM ${fmt(s.price14)}</span></div>` : ''}${s.q12 > 0 ? `<div class="details-row"><span class="label">12KG</span><span class="value">${s.q12} @ RM ${fmt(s.price12)}</span></div>` : ''}${s.qi > 0 ? `<div class="details-row"><span class="label">Industri</span><span class="value">${s.qi} @ RM ${fmt(s.priceI)}</span></div>` : ''}<div class="details-row"><span class="label">Bayaran</span><span class="value">${s.payType}</span></div><div class="divider"></div><div class="record-actions" style="justify-content: flex-end;"><button class="danger" style="width: auto;" onclick="delSale(${s.id})">Padam</button></div></div></details>`;
    });
}

async function renderPayroll() {
    const tb = document.querySelector('#payrollTable tbody');
    tb.innerHTML = '';
    // Anda perlu cipta jadual 'payrolls' di Supabase dahulu
    // const { data: payrolls, error } = await supabaseClient.from('payrolls').select('*').order('date', { ascending: false });
    // if (error || !payrolls) return;
    // payrolls.forEach(p => {
    //     tb.innerHTML += `<tr><td>${p.date}</td><td>${p.name}</td><td>${fmt(p.amount)}</td><td>${p.note || '-'}</td><td><button class="ghost danger" onclick="delPayroll(${p.id})">Padam</button></td></tr>`;
    // });
}

async function renderReport() {
    // Fungsi ini memerlukan logik yang lebih kompleks untuk mengira semula berdasarkan data dari Supabase
    // Buat masa ini, kita biarkan kosong.
    document.getElementById('reportKPI').innerHTML = '<p class="note">Bahagian laporan akan ditambah kemudian.</p>';
}

// ==================
// FUNGSI AKSI (ACTIONS)
// ==================

async function addStock() {
    const newStock = { date: document.getElementById('stDate').value || today(), note: document.getElementById('stNote').value, q14: +document.getElementById('stQ14').value || 0, c14: +document.getElementById('stC14').value || 0, q12: +document.getElementById('stQ12').value || 0, c12: +document.getElementById('stC12').value || 0, qi: +document.getElementById('stQI').value || 0, ci: +document.getElementById('stCI').value || 0, batch: Date.now() };
    if (!newStock.note) { alert('Nota wajib diisi.'); return; }
    const { error } = await supabaseClient.from('stocks').insert([newStock]);
    if (error) { alert('Gagal menambah stok!'); console.error(error); } 
    else { alert('Stok berjaya ditambah!'); renderAll(); document.getElementById('addStockForm').reset(); }
}
async function delStock(id) { if (!confirm('Anda pasti?')) return; const { error } = await supabaseClient.from('stocks').delete().eq('id', id); if (error) alert('Gagal padam.'); else renderAll(); }
async function addExpense() {
    const newExpense = { date: document.getElementById('exDate').value || today(), type: document.getElementById('exType').value, amount: +document.getElementById('exAmt').value || 0, note: document.getElementById('exNote').value };
    if (newExpense.amount <= 0) { alert('Sila masukkan jumlah.'); return; }
    const { error } = await supabaseClient.from('expenses').insert([newExpense]);
    if (error) { alert('Gagal menambah modal!'); console.error(error); }
    else { alert('Modal berjaya ditambah!'); renderAll(); document.getElementById('addExpenseForm').reset(); }
}
async function delExpense(id) { if (!confirm('Anda pasti?')) return; const { error } = await supabaseClient.from('expenses').delete().eq('id', id); if (error) alert('Gagal padam.'); else renderAll(); }
async function addClient() {
    const newClient = { name: document.getElementById('clName').value, cat: document.getElementById('clCat').value, p14: +document.getElementById('clP14').value || 0, p12: +document.getElementById('clP12').value || 0, pi: +document.getElementById('clPI').value || 0 };
    if (!newClient.name) { alert('Nama pelanggan wajib diisi.'); return; }
    const { error } = await supabaseClient.from('clients').insert([newClient]);
    if (error) { alert('Gagal menambah pelanggan!'); console.error(error); }
    else { alert('Pelanggan berjaya ditambah!'); renderAll(); document.getElementById('addClientForm').reset(); }
}
async function delClient(id) { if (!confirm('Anda pasti?')) return; const { error } = await supabaseClient.from('clients').delete().eq('id', id); if (error) alert('Gagal padam.'); else renderAll(); }
async function addSale() {
    const clientName = document.getElementById('slClient').value;
    if (!clientName) { alert('Sila pilih pelanggan.'); return; }
    const { data: clientData, error: clientError } = await supabaseClient.from('clients').select('p12, p14, pi').eq('name', clientName).single();
    if (clientError || !clientData) { alert('Pelanggan tidak ditemui.'); return; }
    const newSale = { date: document.getElementById('slDate').value || today(), client_name: clientName, q14: +document.getElementById('slQ14').value || 0, q12: +document.getElementById('slQ12').value || 0, qi: +document.getElementById('slQI').value || 0, price14: clientData.p14, price12: clientData.p12, priceI: clientData.pi, payType: document.getElementById('slPayType').value, remark: document.getElementById('slRemark').value };
    if (newSale.q12 + newSale.q14 + newSale.qi <= 0) { alert('Sila masukkan sekurang-kurangnya satu tong.'); return; }
    const { error } = await supabaseClient.from('sales').insert([newSale]);
    if (error) { alert('Gagal merekod jualan!'); console.error(error); }
    else { alert('Jualan berjaya direkod!'); renderAll(); document.getElementById('addSaleForm').reset(); }
}
async function delSale(id) { if (!confirm('Anda pasti?')) return; const { error } = await supabaseClient.from('sales').delete().eq('id', id); if (error) alert('Gagal padam.'); else renderAll(); }

async function addPayroll() {
    // Anda perlu cipta jadual 'payrolls' dan borang HTML yang sepadan
    // const newPayroll = { date: document.getElementById('pgDate').value || today(), name: document.getElementById('pgName').value, amount: +document.getElementById('pgAmt').value || 0, note: document.getElementById('pgNote').value };
    // if(newPayroll.amount <= 0) { alert('Sila masukkan jumlah gaji.'); return; }
    // const { error } = await supabaseClient.from('payrolls').insert([newPayroll]);
    // if (error) alert('Gagal!'); else { alert('Berjaya!'); renderAll(); }
}

// ==================
// SETUP PERMULAAN (INITIALIZATION)
// ==================
function setupUIListeners() {
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

    document.getElementById('addStock').addEventListener('click', addStock);
    document.getElementById('addExpense').addEventListener('click', addExpense);
    document.getElementById('addClient').addEventListener('click', addClient);
    document.getElementById('addSale').addEventListener('click', addSale);
    document.getElementById('btnRefreshClients').addEventListener('click', renderClients);
    document.getElementById('addPayroll').addEventListener('click', addPayroll);

    document.getElementById('btnAdminLogin').addEventListener('click', () => {
        if (document.getElementById('adminPIN').value === 'boss123') {
            document.getElementById('adminLogin').style.display = 'none';
            document.getElementById('adminArea').style.display = 'block';
        } else {
            alert('PIN salah');
        }
    });

    ['stDate', 'exDate', 'slDate', 'pgDate'].forEach(id => {
        if(document.getElementById(id)) document.getElementById(id).value = today();
    });
    
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