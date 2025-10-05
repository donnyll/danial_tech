// ==================
// SETUP & KONFIGURASI
// ==================

// GANTIKAN DENGAN URL & KUNCI ANON SUPABASE ANDA!
const SUPABASE_URL = 'URL_PROJEK_ANDA_DI_SINI';
const SUPABASE_KEY = 'KUNCI_ANON_ANDA_DI_SINI';

// Sambungan ke Supabase
const supabase = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// Fungsi pembantu (helpers)
const fmt = (n) => Number(n || 0).toLocaleString('ms-MY', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const today = () => {
    const now = new Date();
    return new Date(now.getTime() - (now.getTimezoneOffset() * 60000)).toISOString().slice(0, 10);
};

// ==================
// FUNGSI PAPARAN (RENDERING)
// ==================

async function renderAll() {
    await renderStocks();
    await renderExpenses();
    await renderClients();
    await renderSales();
    // await recomputeSummary(); // Akan ditambah kemudian
}

async function renderStocks() {
    const host = document.getElementById('stockList');
    host.innerHTML = 'Memuatkan data stok...';

    const { data: stocks, error } = await supabase.from('stocks').select('*').order('date', { ascending: false });

    if (error) {
        host.innerHTML = '<p class="note">Gagal memuatkan data stok.</p>';
        console.error(error);
        return;
    }

    if (stocks.length === 0) {
        host.innerHTML = `<p class="note">Tiada rekod stok gas ditemui.</p>`;
        return;
    }

    host.innerHTML = '';
    stocks.forEach((st, idx) => {
        const totalCost = (st.q12 * st.c12) + (st.q14 * st.c14) + (st.qi * st.ci);
        const color = `b${((st.batch || 0) % 6) || 6}`;
        host.innerHTML += `
          <details data-id="${st.id}" ${idx === 0 ? 'open' : ''}>
            <summary>
              <div>
                <span class="summary-title"><span class="chip ${color}">#${st.batch}</span> ${st.date}</span>
                <span class="summary-meta">${st.note} · Kos: RM ${fmt(totalCost)}</span>
              </div>
              <div class="record-actions">
                <button class="ghost danger" onclick="delStock(${st.id})">Padam</button>
              </div>
            </summary>
            <div class="details-content">
              ${st.q14 > 0 ? `<div class="details-row"><span class="label">14KG</span><span class="value">${st.q14} tong @ RM ${fmt(st.c14)}</span></div>` : ''}
              ${st.q12 > 0 ? `<div class="details-row"><span class="label">12KG</span><span class="value">${st.q12} tong @ RM ${fmt(st.c12)}</span></div>` : ''}
              ${st.qi > 0 ? `<div class="details-row"><span class="label">Industri</span><span class="value">${st.qi} tong @ RM ${fmt(st.ci)}</span></div>` : ''}
            </div>
          </details>`;
    });
}

async function renderExpenses() {
    const host = document.getElementById('expList');
    host.innerHTML = 'Memuatkan data modal...';

    const { data: expenses, error } = await supabase.from('expenses').select('*').order('date', { ascending: false });
    
    if (error) {
        host.innerHTML = '<p class="note">Gagal memuatkan data modal.</p>';
        console.error(error);
        return;
    }

    if (expenses.length === 0) {
        host.innerHTML = `<p class="note">Tiada rekod modal lain ditemui.</p>`;
        return;
    }
    
    host.innerHTML = '';
    expenses.forEach((ex, idx) => {
        host.innerHTML += `
          <details data-id="${ex.id}" ${idx === 0 ? 'open' : ''}>
            <summary>
              <div>
                <span class="summary-title">${ex.date} · ${ex.type}</span>
                <span class="summary-meta">RM ${fmt(ex.amount)}</span>
              </div>
              <div class="record-actions">
                <button class="ghost danger" onclick="delExpense(${ex.id})">Padam</button>
              </div>
            </summary>
            <div class="details-content"><p class="note">Nota: ${ex.note || '-'}</p></div>
          </details>`;
    });
}

async function renderClients() {
    const tb = document.querySelector('#clientTable tbody');
    const dl = document.getElementById('clientList');
    tb.innerHTML = '';
    dl.innerHTML = '';

    const { data: clients, error } = await supabase.from('clients').select('*').order('name');
    
    if (error || !clients) return;

    clients.forEach(c => {
        tb.innerHTML += `
          <tr>
            <td>${c.name}</td><td>${c.cat || '-'}</td><td>${fmt(c.p14)}/${fmt(c.p12)}/${fmt(c.pi)}</td>
            <td><button class="ghost danger" onclick="delClient(${c.id})">Padam</button></td>
          </tr>`;
        dl.innerHTML += `<option value="${c.name}"></option>`;
    });
}

async function renderSales() {
    const host = document.getElementById('salesList');
    host.innerHTML = 'Memuatkan data jualan...';

    const { data: sales, error } = await supabase.from('sales').select('*').order('date', { ascending: false });

    if (error) {
        host.innerHTML = '<p class="note">Gagal memuatkan data jualan.</p>';
        console.error(error);
        return;
    }

    if (sales.length === 0) {
        host.innerHTML = `<p class="note">Tiada rekod jualan ditemui.</p>`;
        return;
    }
    
    host.innerHTML = '';
    sales.forEach((s, idx) => {
        const totalSales = (s.q12 * s.price12) + (s.q14 * s.price14) + (s.qi * s.priceI);
        host.innerHTML += `
          <details ${idx === 0 ? 'open' : ''}>
            <summary>
                <div>
                    <span class="summary-title">${s.client_name} · ${s.date}</span>
                    <span class="summary-meta">Jumlah: RM ${fmt(totalSales)} ${s.payType === 'Hutang' ? `<span class="chip danger-chip" style="margin-left: 5px;">Hutang</span>` : ''}</span>
                </div>
            </summary>
            <div class="details-content">
                ${s.q14 > 0 ? `<div class="details-row"><span class="label">14KG</span><span class="value">${s.q14} @ RM ${fmt(s.price14)}</span></div>` : ''}
                ${s.q12 > 0 ? `<div class="details-row"><span class="label">12KG</span><span class="value">${s.q12} @ RM ${fmt(s.price12)}</span></div>` : ''}
                ${s.qi > 0 ? `<div class="details-row"><span class="label">Industri</span><span class="value">${s.qi} @ RM ${fmt(s.priceI)}</span></div>` : ''}
                <div class="details-row"><span class="label">Bayaran</span><span class="value">${s.payType}</span></div>
                <div class="divider" style="margin: 8px 0;"></div>
                <div class="record-actions" style="justify-content: flex-end;">
                    <button class="danger" style="width: auto;" onclick="delSale(${s.id})">Padam</button>
                </div>
            </div>
          </details>`;
    });
}

// ==================
// FUNGSI AKSI (ACTIONS)
// ==================

async function addStock() {
    const newStock = {
        date: document.getElementById('stDate').value || today(),
        note: document.getElementById('stNote').value,
        q14: +document.getElementById('stQ14').value || 0,
        c14: +document.getElementById('stC14').value || 0,
        q12: +document.getElementById('stQ12').value || 0,
        c12: +document.getElementById('stC12').value || 0,
        qi: +document.getElementById('stQI').value || 0,
        ci: +document.getElementById('stCI').value || 0,
        batch: Date.now() // Guna timestamp sebagai batch unik
    };

    if (!newStock.note) { alert('Nota wajib diisi.'); return; }
    
    const { error } = await supabase.from('stocks').insert([newStock]);
    if (error) {
        alert('Gagal menambah stok!');
        console.error(error);
    } else {
        alert('Stok berjaya ditambah!');
        renderStocks(); // Muat semula senarai stok
        ['stNote', 'stQ14', 'stC14', 'stQ12', 'stC12', 'stQI', 'stCI'].forEach(id => document.getElementById(id).value = '0');
        document.getElementById('stNote').value = '';
    }
}

async function delStock(id) {
    if (!confirm('Anda pasti mahu padam rekod stok ini?')) return;
    const { error } = await supabase.from('stocks').delete().eq('id', id);
    if (error) alert('Gagal memadam stok.');
    else renderStocks();
}

async function addExpense() {
    const newExpense = {
        date: document.getElementById('exDate').value || today(),
        type: document.getElementById('exType').value,
        amount: +document.getElementById('exAmt').value || 0,
        note: document.getElementById('exNote').value
    };

    if (newExpense.amount <= 0) { alert('Sila masukkan jumlah.'); return; }

    const { error } = await supabase.from('expenses').insert([newExpense]);
    if (error) {
        alert('Gagal menambah modal!');
        console.error(error);
    } else {
        alert('Modal berjaya ditambah!');
        renderExpenses();
        document.getElementById('exAmt').value = '';
        document.getElementById('exNote').value = '';
    }
}

async function delExpense(id) {
    if (!confirm('Anda pasti mahu padam rekod modal ini?')) return;
    const { error } = await supabase.from('expenses').delete().eq('id', id);
    if (error) alert('Gagal memadam modal.');
    else renderExpenses();
}

async function addClient() {
    const newClient = {
        name: document.getElementById('clName').value,
        cat: document.getElementById('clCat').value,
        p14: +document.getElementById('clP14').value || 0,
        p12: +document.getElementById('clP12').value || 0,
        pi: +document.getElementById('clPI').value || 0
    };
    
    if (!newClient.name) { alert('Nama pelanggan wajib diisi.'); return; }

    const { error } = await supabase.from('clients').insert([newClient]);
    if (error) {
        alert('Gagal menambah pelanggan!');
        console.error(error);
    } else {
        alert('Pelanggan berjaya ditambah!');
        renderClients();
        ['clName', 'clCat', 'clP14', 'clP12', 'clPI'].forEach(id => document.getElementById(id).value = '');
    }
}

async function delClient(id) {
    if (!confirm('Anda pasti mahu padam pelanggan ini? Rekod jualan sedia ada tidak akan terjejas.')) return;
    const { error } = await supabase.from('clients').delete().eq('id', id);
    if (error) alert('Gagal memadam pelanggan.');
    else renderClients();
}

async function addSale() {
    const clientName = document.getElementById('slClient').value;
    if (!clientName) { alert('Sila pilih pelanggan.'); return; }

    // Dapatkan harga pelanggan dari database
    const { data: clientData, error: clientError } = await supabase
        .from('clients')
        .select('p12, p14, pi')
        .eq('name', clientName)
        .single();

    if (clientError || !clientData) { alert('Pelanggan tidak ditemui atau ralat. Sila pilih dari senarai.'); return; }

    const newSale = {
        date: document.getElementById('slDate').value || today(),
        client_name: clientName,
        q14: +document.getElementById('slQ14').value || 0,
        q12: +document.getElementById('slQ12').value || 0,
        qi: +document.getElementById('slQI').value || 0,
        price14: clientData.p14,
        price12: clientData.p12,
        priceI: clientData.pi,
        payType: document.getElementById('slPayType').value,
        remark: document.getElementById('slRemark').value
    };

    if (newSale.q12 + newSale.q14 + newSale.qi <= 0) { alert('Sila masukkan sekurang-kurangnya satu tong.'); return; }

    const { error } = await supabase.from('sales').insert([newSale]);
    if (error) {
        alert('Gagal merekod jualan!');
        console.error(error);
    } else {
        alert('Jualan berjaya direkod!');
        renderSales();
        ['slClient', 'slQ14', 'slQ12', 'slQI', 'slRemark'].forEach(id => document.getElementById(id).value = '');
    }
}

async function delSale(id) {
    if (!confirm('Anda pasti mahu padam rekod jualan ini?')) return;
    const { error } = await supabase.from('sales').delete().eq('id', id);
    if (error) alert('Gagal memadam jualan.');
    else renderSales();
}


// ==================
// SETUP PERMULAAN (INITIALIZATION)
// ==================

function setupUIListeners() {
    // Navigasi Bawah
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
    document.getElementById('btnRefreshClients').addEventListener('click', renderClients);

    // Tetapan tarikh hari ini
    document.getElementById('stDate').value = today();
    document.getElementById('exDate').value = today();
    document.getElementById('slDate').value = today();
}

// Fungsi utama yang dipanggil apabila laman dimuatkan
document.addEventListener('DOMContentLoaded', () => {
    setupUIListeners();
    renderAll();
});