// ═══════════════════════════════════════════
// DATABASE
// ═══════════════════════════════════════════
let db = { invoices:[], receipts:[], customers:[], quotations:[], leads:[], inventory:[], inventory_movements:[], suppliers:[] };

async function initDB() {
    const serverData = await DbClient.loadAll();
    if (serverData) {
        db = { ...db, ...serverData };
        Object.keys(db).forEach(k => { try { localStorage.setItem('optech_' + k, JSON.stringify(db[k]||[])); } catch {} });
    } else {
        db = {
            invoices:            JSON.parse(localStorage.getItem('optech_invoices'))            || [],
            receipts:            JSON.parse(localStorage.getItem('optech_receipts'))            || [],
            customers:           JSON.parse(localStorage.getItem('optech_customers'))           || [],
            quotations:          JSON.parse(localStorage.getItem('optech_quotations'))          || [],
            leads:               JSON.parse(localStorage.getItem('optech_leads'))               || [],
            inventory:           JSON.parse(localStorage.getItem('optech_inventory'))           || [],
            inventory_movements: JSON.parse(localStorage.getItem('optech_inventory_movements')) || [],
            suppliers:           JSON.parse(localStorage.getItem('optech_suppliers'))           || []
        };
    }
}
function saveDB(k){ db[k]=db[k]||[]; DbClient.saveCollection(k, db[k]); }

function getPin(){ return localStorage.getItem('optech_pin')||'1234'; }
function setPin(p){ localStorage.setItem('optech_pin',p); }
let authUnlocked = false;

// ═══════════════════════════════════════════
// PRINT HELPER
// ═══════════════════════════════════════════
(function(){
    const s=document.createElement('style');
    s.textContent=`@media print{body>*{display:none!important}#modal-print-area{display:block!important}.no-print-in-modal{display:none!important}*{-webkit-print-color-adjust:exact!important;print-color-adjust:exact!important}@page{margin:0}}#modal-print-area{display:none}`;
    document.head.appendChild(s);
    const d=document.createElement('div'); d.id='modal-print-area'; document.body.appendChild(d);
})();
function printModal(cardId){ document.getElementById('modal-print-area').innerHTML=document.getElementById(cardId).outerHTML; window.print(); }

// ═══════════════════════════════════════════
// DARK MODE
// ═══════════════════════════════════════════
function toggleDarkMode(){ const d=document.body.classList.toggle('dark-mode'); localStorage.setItem('optech_dark',d?'1':'0'); }
function applyDarkMode(){ if(localStorage.getItem('optech_dark')==='1') document.body.classList.add('dark-mode'); }

// ═══════════════════════════════════════════
// NAVIGATION
// ═══════════════════════════════════════════
function showSection(section){
    const c=document.getElementById('view-container');
    document.querySelectorAll('.nav-item').forEach(el=>el.classList.remove('active'));
    event?.currentTarget?.classList?.add('active');
    switch(section){
        case 'dashboard':  renderDashboard(c);  break;
        case 'invoices':   renderInvoices(c);   break;
        case 'receipts':   renderReceipts(c);   break;
        case 'customers':  renderCustomers(c);  break;
        case 'quotations': renderQuotations(c); break;
        case 'inventory':  renderInventory(c);  break;
        case 'suppliers':  renderSuppliers(c);  break;
        case 'reports':    renderReports(c);    break;
        case 'auth':       renderAuth(c);       break;
        case 'crm':        window.location.href='CRM.html'; break;
        default:           renderDashboard(c);
    }
}

// ═══════════════════════════════════════════
// MODAL SHELL
// ═══════════════════════════════════════════
function openModalShell(html){
    let o=document.getElementById('app-modal-overlay');
    if(!o){
        o=document.createElement('div'); o.id='app-modal-overlay';
        o.style.cssText='position:fixed;inset:0;background:rgba(0,0,0,.65);display:flex;align-items:flex-start;justify-content:center;z-index:9999;overflow-y:auto;padding:30px 20px;';
        o.addEventListener('mousedown',e=>{if(e.target===o)closeModalShell();});
        document.body.appendChild(o);
    }
    o.innerHTML=html; o.style.display='flex'; document.body.style.overflow='hidden';
}
function closeModalShell(){ const o=document.getElementById('app-modal-overlay'); if(o){o.style.display='none';o.innerHTML='';} document.body.style.overflow=''; }

// ═══════════════════════════════════════════
// STYLE HELPERS
// ═══════════════════════════════════════════
const B  = bg=>`background:${bg};color:white;border:none;padding:10px 20px;border-radius:6px;cursor:pointer;font-size:13px;font-weight:600;box-shadow:0 2px 8px rgba(0,0,0,.2);`;
const FLD= w =>`display:block;width:${w};border:none;background:transparent;padding:4px 0;font-size:14px;outline:none;border-bottom:1px dashed #ccc;font-family:inherit;`;
const TH = ()=>'background:#1A4325;color:#fff;padding:9px 8px;text-align:center;font-size:12px;';
const TD = ()=>'border-bottom:1px solid #eee;padding:7px 6px;';
function metaRow(id,val,label){ return `<div style="display:flex;gap:12px;margin-bottom:5px;justify-content:flex-end;align-items:center;"><input id="${id}" type="text" value="${val}" style="width:140px;border:1px solid #ddd;padding:3px 6px;border-radius:4px;text-align:center;font-size:13px;font-family:inherit;"><label style="font-weight:700;color:#1A4325;width:110px;text-align:right;font-size:13px;">${label}</label></div>`; }
function tRow(l,v){ return `<div style="display:flex;justify-content:space-between;align-items:center;padding:4px 0;border-bottom:1px solid #eee;font-size:13px;">${v}<span>${l}</span></div>`; }
function tRowCb(cbId,label,val,checked,fn){ fn=fn||'invCalc()'; return `<div class="no-print-in-modal" style="display:flex;justify-content:space-between;align-items:center;padding:4px 0;border-bottom:1px solid #eee;font-size:13px;">${val}<label style="display:flex;align-items:center;gap:4px;cursor:pointer;"><input type="checkbox" id="${cbId}" ${checked?'checked':''} onchange="${fn}"> ${label}</label></div>`; }
const numInput=(id,val,cb)=>`<input type="number" id="${id}" value="${val}" oninput="${cb}" style="width:65px;border:1px solid #eee;padding:3px;text-align:center;font-size:13px;">`;

// ═══════════════════════════════════════════
// ██  INVOICE MODAL
// ═══════════════════════════════════════════
let invNum=parseInt(localStorage.getItem('lastInvoiceNum'))||1502268;
function openInvoiceModal(existing){
    if(!existing){invNum++;localStorage.setItem('lastInvoiceNum',invNum);}
    const rec=existing||{}, t=new Date(), fmt=d=>String(d.getDate()).padStart(2,'0')+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+d.getFullYear();
    const items=rec._items||[{desc:'',qty:1,price:0}];
    openModalShell(`<div style="position:relative;width:100%;max-width:900px;margin:auto;">
      <button onclick="closeModalShell()" class="no-print-in-modal" style="position:fixed;top:15px;right:15px;z-index:10001;background:white;border:none;border-radius:50%;width:38px;height:38px;font-size:20px;cursor:pointer;box-shadow:0 2px 10px rgba(0,0,0,.3);line-height:1;">×</button>
      <div class="no-print-in-modal" style="display:flex;justify-content:center;gap:10px;margin-bottom:16px;flex-wrap:wrap;">
        <button onclick="invAddRow()" style="${B('#4CAF50')}">+ Add Item</button>
        <button onclick="invRemoveRow()" style="${B('#f44336')}">− Remove</button>
        <button onclick="invSaveAndPrint()" style="${B('#1A4325')}">Print & Save</button>
        <button onclick="invSaveOnly(this)" style="${B('#e65100')}">Save Only</button>
      </div>
      <div id="invoice-modal-card" style="background:#fff;border:1px solid #ccc;box-shadow:0 0 20px rgba(0,0,0,.15);font-family:'Segoe UI',Tahoma,sans-serif;color:#333;overflow:hidden;">
        <div style="height:8px;background:linear-gradient(to right,#0b2414,#4CAF50);"></div>
        <div style="padding:15px 40px;display:grid;grid-template-columns:1fr auto 1fr;align-items:center;border-bottom:1px solid #eee;">
          <div><div style="color:#1A4325;font-size:21px;font-weight:700;margin-bottom:4px;">Optech IT Solutions</div><div style="font-size:12px;color:#666;line-height:1.6;">21/2 Oriana Mall, El Mokattam<br>Mokattam • 11693 • Cairo<br>+20 1121450646 • info@optech-eg.com</div></div>
          <div style="text-align:center;"><div style="color:#1A4325;letter-spacing:4px;font-size:32px;font-weight:700;">INVOICE</div></div>
          <div style="text-align:right;"><img src="optech-green-dot copy 2.png" alt="" style="width:80px;height:auto;" onerror="this.style.display='none'"></div>
        </div>
        <div style="padding:15px 40px;display:flex;justify-content:space-between;background:#fcfcfc;">
          <div><div style="color:#1A4325;font-size:14px;font-weight:700;margin-bottom:8px;border-bottom:2px solid #2E7D32;display:inline-block;padding-bottom:2px;">Bill to / فاتورة إلى</div>
            <input id="inv-client" type="text" value="${rec.client||''}" placeholder="Client Name" style="${FLD('280px')}font-weight:700;">
            <input id="inv-phone"  type="text" value="${rec.phone||''}"  placeholder="Phone" style="${FLD('280px')}margin-top:4px;"></div>
          <div style="text-align:right;">${metaRow('inv-no',rec.id||String(invNum).padStart(9,'0'),'Invoice No')}${metaRow('inv-date',rec.date||fmt(t),'Invoice Date')}${metaRow('inv-due',rec.due||'','Due Date')}</div>
        </div>
        <table id="inv-items" style="width:calc(100% - 80px);margin:10px 40px;border-collapse:collapse;"><thead><tr><th style="${TH()}width:50%">Description / البيان</th><th style="${TH()}width:10%">Qty</th><th style="${TH()}width:20%">Unit Price</th><th style="${TH()}width:20%">Amount</th></tr></thead><tbody>${items.map(it=>invRowHTML(it.desc,it.qty,it.price)).join('')}</tbody></table>
        <div style="padding:10px 40px;display:flex;justify-content:space-between;">
          <div style="width:55%;"><div style="color:#1A4325;font-weight:700;font-size:13px;margin-bottom:8px;">Terms & Conditions</div><div id="inv-terms">${(rec._terms||['ضمان 3 سنوات من تاريخ التسليم/التركيب.','في حالة الاستبدال أو الاسترجاع يرجى الاحتفاظ بهذه الوثيقة.','الضمان لا يشمل الكسر أو مشاكل التركيب الخاطئ بمعرفة العميل.','الضمان لا يشمل العطب نتيجة مشكلة فنية كهربائية أخرى بالجهاز.']).map(t=>invTermLine(t)).join('')}</div><div class="no-print-in-modal" style="margin-top:5px;"><button onclick="invAddTerm()" style="background:#D6F0E0;border:1px solid #2E7D32;color:#1A4325;padding:2px 8px;border-radius:4px;cursor:pointer;font-size:10px;font-weight:700;">+ Add Term</button></div></div>
          <div style="width:35%;">${tRow('Subtotal','<span id="inv-sub">0.00</span>')}<div id="inv-tax-row" class="no-print-in-modal" style="display:${rec._tax!==false?'flex':'none'};justify-content:space-between;align-items:center;padding:4px 0;border-bottom:1px solid #eee;font-size:13px;"><span id="inv-tax">0.00</span><label style="display:flex;align-items:center;gap:4px;cursor:pointer;"><input type="checkbox" id="inv-tax-cb" ${rec._tax!==false?'checked':''} onchange="invCalc()"> VAT (14%)</label></div>${tRow('Shipping',numInput('inv-ship',rec._ship||0,'invCalc()'))}${tRowCb('inv-inst-cb','Installation',numInput('inv-inst',rec._instVal||0,'invCalc()'),rec._inst!==false)}${tRowCb('inv-disc-cb','Discount',numInput('inv-disc',rec._discVal||0,'invCalc()'),rec._disc===true)}<div style="display:flex;justify-content:space-between;align-items:center;background:#D6F0E0;padding:8px;margin-top:5px;font-weight:700;font-size:15px;color:#1A4325;"><span id="inv-grand">EGP 0.00</span><span>TOTAL / الإجمالي</span></div><div style="display:flex;justify-content:space-between;align-items:center;padding:6px 0;border-top:2px solid #ccc;margin-top:8px;font-size:13px;">${numInput('inv-paid',rec._paid||0,'invCalc()')}<span style="font-weight:600;color:#2E7D32;">Paid / المدفوع</span></div><div style="display:flex;justify-content:space-between;align-items:center;background:#fff8e1;padding:8px;margin-top:2px;font-weight:700;font-size:14px;"><span id="inv-balance" style="color:#e65100;">EGP 0.00</span><span style="color:#e65100;">Balance Due / المتبقي</span></div><div style="display:flex;justify-content:space-between;align-items:center;padding:6px 0;border-top:1px dashed #ddd;margin-top:4px;font-size:12px;"><input type="text" id="inv-next-pay" value="${rec._nextPayment||''}" placeholder="Date / Amount" style="width:130px;border:1px solid #ddd;padding:3px 6px;border-radius:4px;text-align:center;font-size:12px;font-family:inherit;"><span style="color:#888;">Next Payment</span></div></div>
        </div>
        <div style="padding:10px 40px 28px;text-align:center;display:flex;flex-direction:column;align-items:center;"><div style="position:relative;width:220px;padding-top:16px;"><img src="Signature.png" alt="" style="width:150px;height:auto;margin-bottom:-10px;position:relative;z-index:1;" onerror="this.style.display='none'"><div style="border-top:2px solid #1A4325;width:100%;padding-top:5px;font-weight:700;font-size:13px;">Authorized Signature</div></div></div>
      </div></div>`);
    ['inv-inst-cb','inv-disc-cb'].forEach(id=>{const el=document.getElementById(id);if(el)el.onchange=invCalc;});
    invCalc();
}
function invRowHTML(desc,qty,price){ const inS=`width:100%;border:none;padding:5px;font-size:13px;background:#f9f9f9;border-radius:3px;font-family:inherit;`; return `<tr><td style="${TD()}"><input type="text" class="inv-desc" value="${(desc||'').replace(/"/g,'&quot;')}" placeholder="Product description..." style="${inS}text-align:right;"></td><td style="${TD()}"><input type="number" class="inv-qty" value="${qty||1}" oninput="invCalc()" style="${inS}text-align:center;"></td><td style="${TD()}"><input type="number" class="inv-price" value="${price||0}" oninput="invCalc()" style="${inS}text-align:center;"></td><td class="inv-total-cell" style="${TD()}font-weight:700;text-align:center;font-size:14px;">0.00</td></tr>`; }
function invTermLine(text){ return `<div style="display:flex;align-items:center;gap:4px;margin-bottom:2px;"><button class="no-print-in-modal" onclick="this.parentElement.remove()" style="background:none;border:none;color:#f44336;cursor:pointer;font-size:13px;padding:0 2px;">×</button><span style="color:#999;">•</span><input type="text" value="${(text||'').replace(/"/g,'&quot;')}" style="border:none;background:transparent;width:100%;font-size:11px;color:#555;padding:2px;font-family:inherit;outline:none;"></div>`; }
function invAddRow(){document.querySelector('#inv-items tbody').insertAdjacentHTML('beforeend',invRowHTML('',1,0));}
function invRemoveRow(){const r=document.querySelectorAll('#inv-items tbody tr');if(r.length>1){r[r.length-1].remove();invCalc();}}
function invAddTerm(){document.getElementById('inv-terms').insertAdjacentHTML('beforeend',invTermLine(''));}
function invCalc(){let sub=0;document.querySelectorAll('#inv-items tbody tr').forEach(r=>{const q=parseFloat(r.querySelector('.inv-qty')?.value)||0,p=parseFloat(r.querySelector('.inv-price')?.value)||0,v=q*p;const c=r.querySelector('.inv-total-cell');if(c)c.textContent=v.toLocaleString(undefined,{minimumFractionDigits:2});sub+=v;});const g=id=>document.getElementById(id);const taxCb=g('inv-tax-cb');const taxChecked=taxCb?.checked||false;const tax=taxChecked?sub*0.14:0,inst=g('inv-inst-cb')?.checked?(parseFloat(g('inv-inst')?.value)||0):0,disc=g('inv-disc-cb')?.checked?(parseFloat(g('inv-disc')?.value)||0):0,ship=parseFloat(g('inv-ship')?.value)||0,tot=sub+tax+ship+inst-disc,paid=parseFloat(g('inv-paid')?.value)||0,balance=tot-paid,f=n=>n.toLocaleString(undefined,{minimumFractionDigits:2});if(g('inv-sub'))g('inv-sub').textContent=f(sub);if(g('inv-tax'))g('inv-tax').textContent=f(tax);if(g('inv-grand'))g('inv-grand').textContent='EGP '+f(tot);const taxRow=g('inv-tax-row');if(taxRow)taxRow.style.display=taxChecked?'flex':'none';if(g('inv-balance')){g('inv-balance').textContent='EGP '+f(balance);g('inv-balance').style.color=balance<=0?'#2E7D32':'#e65100';}}
function invCollect(){const raw=document.getElementById('inv-grand')?.textContent||'0';const items=[];document.querySelectorAll('#inv-items tbody tr').forEach(r=>{items.push({desc:r.querySelector('.inv-desc')?.value||'',qty:parseFloat(r.querySelector('.inv-qty')?.value)||0,price:parseFloat(r.querySelector('.inv-price')?.value)||0});});const terms=[];document.querySelectorAll('#inv-terms input[type=text]').forEach(i=>{if(i.value.trim())terms.push(i.value.trim());});const g=id=>document.getElementById(id);return{id:g('inv-no')?.value||String(invNum).padStart(9,'0'),client:g('inv-client')?.value||'Unknown',phone:g('inv-phone')?.value||'',date:g('inv-date')?.value||'',due:g('inv-due')?.value||'',total:parseFloat(raw.replace('EGP ','').replace(/,/g,''))||0,_items:items,_tax:g('inv-tax-cb')?.checked!==false,_ship:parseFloat(g('inv-ship')?.value)||0,_inst:g('inv-inst-cb')?.checked!==false,_instVal:parseFloat(g('inv-inst')?.value)||0,_disc:g('inv-disc-cb')?.checked===true,_discVal:parseFloat(g('inv-disc')?.value)||0,_paid:parseFloat(g('inv-paid')?.value)||0,_nextPayment:g('inv-next-pay')?.value||'',_terms:terms};}
function _pushInvoice(rec){const i=db.invoices.findIndex(x=>x.id===rec.id);if(i>=0)db.invoices[i]=rec;else db.invoices.push(rec);saveDB('invoices');_refreshView();}
function invSaveOnly(btn){_pushInvoice(invCollect());if(btn){btn.textContent='Saved!';btn.style.background='#2E7D32';setTimeout(()=>{btn.textContent='Save Only';btn.style.background='#e65100';},2000);}}
function invSaveAndPrint(){
    const rec=invCollect();
    _pushInvoice(rec);
    localStorage.setItem('currentInvoiceId', rec.id);
    
    // Store the current invoice data for printing
    localStorage.setItem('printInvoiceData', JSON.stringify(rec));
    
    // Create a hidden iframe and load the invoice for direct printing
    const iframe = document.createElement('iframe');
    iframe.style.display = 'none';
    iframe.src = 'INVOICE.html?id=' + rec.id + '&print=true';
    document.body.appendChild(iframe);
    
    // When the iframe loads, trigger print
    iframe.onload = function() {
        setTimeout(() => {
            iframe.contentWindow.print();
            // Remove iframe after printing
            setTimeout(() => {
                document.body.removeChild(iframe);
            }, 1000);
        }, 500);
    };
}

function printInvoiceDirect(invoiceId) {
    const invoice = db.invoices.find(inv => inv.id === invoiceId);
    if (!invoice) {
        alert('Invoice not found!');
        return;
    }
    
    // Store invoice data for printing
    localStorage.setItem('printInvoiceData', JSON.stringify(invoice));
    
    // Create a hidden iframe and load the invoice
    const iframe = document.createElement('iframe');
    iframe.style.display = 'none';
    iframe.src = 'INVOICE.html?id=' + invoiceId + '&print=true';
    document.body.appendChild(iframe);
    
    // When the iframe loads, trigger print
    iframe.onload = function() {
        setTimeout(() => {
            iframe.contentWindow.print();
            // Remove iframe after printing
            setTimeout(() => {
                document.body.removeChild(iframe);
            }, 1000);
        }, 500);
    };
}

function printInvoiceInline(invoiceId) {
    console.log('printInvoiceInline called with ID:', invoiceId);
    const invoice = db.invoices.find(inv => inv.id === invoiceId);
    console.log('Found invoice:', invoice);
    if (!invoice) {
        alert('Invoice not found!');
        return;
    }
    
    // Generate invoice HTML directly
    const itemsHTML = invoice._items.map(item => `
        <tr>
            <td><input type="text" value="${item.desc || ''}" readonly style="width:100%;border:none;background:transparent;padding:5px;font-size:13px;"></td>
            <td><input type="number" value="${item.qty || 1}" readonly style="width:100%;border:none;background:transparent;padding:5px;font-size:13px;text-align:center;"></td>
            <td><input type="number" value="${item.price || 0}" readonly style="width:100%;border:none;background:transparent;padding:5px;font-size:13px;text-align:center;"></td>
            <td style="padding:5px;text-align:center;font-weight:700;">${((item.qty || 1) * (item.price || 0)).toFixed(2)}</td>
        </tr>
    `).join('');
    
    const invoiceHTML = `
        <!DOCTYPE html>
        <html lang="ar" dir="rtl">
        <head>
            <meta charset="UTF-8">
            <title>${invoice.client}_Invoice_${invoice.id}_${invoice.date}</title>
            <style>
                body { font-family: 'Segoe UI', Tahoma, sans-serif; margin: 0; padding: 20px; background: #e0e0e0; }
                .invoice-card { 
                    background: #fff; 
                    width: 850px; 
                    margin: 0 auto; 
                    border: 1px solid #ccc;
                    box-shadow: 0 0 15px rgba(0,0,0,0.1);
                    padding: 20px;
                }
                .header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; }
                .company-info h2 { color: #1A4325; margin: 0; }
                .invoice-title { text-align: center; font-size: 24px; font-weight: bold; color: #1A4325; }
                .invoice-details { display: flex; justify-content: space-between; margin-bottom: 20px; }
                .bill-to h3 { color: #1A4325; margin-bottom: 10px; }
                .meta-data { text-align: right; }
                .meta-row { margin-bottom: 10px; }
                .meta-row input { border: none; background: transparent; font-size: 14px; font-weight: bold; }
                .items-table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
                .items-table th { background: #1A4325; color: white; padding: 10px; text-align: center; border: 1px solid #ccc; }
                .items-table td { padding: 10px; border: 1px solid #ccc; }
                .totals { text-align: right; margin-top: 20px; }
                .total-row { display: flex; justify-content: space-between; margin-bottom: 5px; }
                .grand-total { font-weight: bold; font-size: 18px; color: #1A4325; }
                @media print {
                    body { margin: 0; padding: 0; background: #fff; }
                    .invoice-card { box-shadow: none; border: none; }
                }
            </style>
        </head>
        <body>
            <div class="invoice-card">
                <div class="header">
                    <div class="company-info">
                        <h2>Optech IT Solutions</h2>
                        <p>21/2 Oriana Mall, El Mokattam<br>Mokattam • 11693 • Cairo<br>+20 1121450646 • info@optech-eg.com</p>
                    </div>
                    <div class="invoice-title">INVOICE</div>
                </div>
                
                <div class="invoice-details">
                    <div class="bill-to">
                        <h3>Bill to / فاتورة إلى</h3>
                        <div>${invoice.client}</div>
                        <div>${invoice.phone || ''}</div>
                    </div>
                    <div class="meta-data">
                        <div class="meta-row">
                            <input type="text" value="${invoice.id}" readonly>
                            <label>Invoice No</label>
                        </div>
                        <div class="meta-row">
                            <input type="text" value="${invoice.date}" readonly>
                            <label>Invoice Date</label>
                        </div>
                        <div class="meta-row">
                            <input type="text" value="${invoice.due || ''}" readonly>
                            <label>Due Date</label>
                        </div>
                    </div>
                </div>
                
                <table class="items-table">
                    <thead>
                        <tr>
                            <th>Description / البيان</th>
                            <th>Quantity</th>
                            <th>Unit Price</th>
                            <th>Amount</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${itemsHTML}
                    </tbody>
                </table>
                
                <div class="totals">
                    <div class="total-row">
                        <span>Sub Total</span>
                        <span>${invoice.total ? invoice.total.toLocaleString() : '0.00'}</span>
                    </div>
                    <div class="total-row grand-total">
                        <span>Grand Total</span>
                        <span>EGP ${invoice.total ? invoice.total.toLocaleString() : '0.00'}</span>
                    </div>
                </div>
            </div>
        </body>
        </html>
    `;
    
    // Create print modal
    const modalContent = `
        <div id="invoice-print-modal" style="position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.8);z-index:9999;display:flex;align-items:center;justify-content:center;">
            <div style="background:white;width:95%;max-width:1000px;height:95%;overflow:auto;border-radius:8px;box-shadow:0 0 20px rgba(0,0,0,0.3);position:relative;">
                <div style="position:absolute;top:10px;right:10px;z-index:10000;">
                    <button onclick="document.getElementById('invoice-print-modal').remove()" style="background:#c62828;color:white;border:none;padding:10px 20px;border-radius:4px;cursor:pointer;font-size:14px;">✕ Close</button>
                    <button onclick="printInvoiceContent()" style="background:#1A4325;color:white;border:none;padding:10px 20px;border-radius:4px;cursor:pointer;font-size:14px;margin-left:10px;">🖨️ Print</button>
                </div>
                <div id="invoice-content" style="padding:20px;">
                    ${invoiceHTML}
                </div>
            </div>
        </div>
    `;
    
    // Add print function
    window.printInvoiceContent = function() {
        const content = document.getElementById('invoice-content').innerHTML;
        const printWindow = window.open('', '_blank');
        printWindow.document.write(content);
        printWindow.document.close();
        printWindow.print();
    };
    
    // Add to page
    document.body.insertAdjacentHTML('beforeend', modalContent);
}

// ═══════════════════════════════════════════
// ██  RECEIPT MODAL
// ═══════════════════════════════════════════
let recNum=parseInt(localStorage.getItem('lastReceiptNum'))||26040;
function openReceiptModal(existing){
    if(!existing){recNum++;localStorage.setItem('lastReceiptNum',recNum);}
    const rec=existing||{},t=new Date(),pad=n=>String(n).padStart(2,'0');
    const dd=rec.date?rec.date.split('/')[0]:pad(t.getDate()),mm=rec.date?rec.date.split('/')[1]:pad(t.getMonth()+1),yy=rec.date?rec.date.split('/')[2]:t.getFullYear();
    const refNo=rec.id||String(recNum).padStart(6,'0');
    const DI=w=>`border:1px solid #ccc;background:#fff;width:${w};height:32px;text-align:center;font-size:16px;font-family:inherit;outline:none;padding:0 4px;`;
    openModalShell(`<div style="position:relative;width:100%;max-width:880px;margin:auto;">
      <button onclick="closeModalShell()" class="no-print-in-modal" style="position:fixed;top:15px;right:15px;z-index:10001;background:white;border:none;border-radius:50%;width:38px;height:38px;font-size:20px;cursor:pointer;box-shadow:0 2px 10px rgba(0,0,0,.3);line-height:1;">×</button>
      <div class="no-print-in-modal" style="display:flex;justify-content:center;gap:10px;margin-bottom:16px;">
        <button onclick="recSaveAndPrint()" style="${B('#1A4325')}">Print & Save</button>
        <button onclick="recSaveOnly(this)" style="${B('#e65100')}">Save Only</button>
      </div>
      <div id="receipt-modal-card" style="background:#fff;border:1px solid #999;box-shadow:0 0 20px rgba(0,0,0,.15);font-family:'Segoe UI',Roboto,sans-serif;overflow:hidden;">
        <div style="display:flex;align-items:stretch;border-bottom:2px solid #1A4325;"><div style="background:#1A4325;width:150px;padding:18px;display:flex;align-items:center;justify-content:center;"><img src="optech-green-dot copy.png" alt="" style="width:100%;height:auto;" onerror="this.style.display='none'"></div><div style="flex:1;text-align:center;padding:22px;background:#fff;"><div style="font-family:'Times New Roman',serif;color:#1A4325;font-size:44px;text-transform:uppercase;letter-spacing:2px;font-weight:700;line-height:1;">Cash Receipt</div><div style="color:#555;font-size:14px;margin-top:8px;letter-spacing:1px;">Ref No: <strong>${refNo}</strong></div></div></div>
        <div style="padding:36px 50px;display:flex;flex-direction:column;gap:22px;">
          <div style="display:flex;align-items:center;gap:15px;"><span style="font-family:'Times New Roman',serif;font-size:17px;font-weight:700;color:#1A4325;min-width:160px;">Date of Issue:</span><div style="display:flex;align-items:center;gap:8px;font-weight:700;"><input id="rec-d" type="text" value="${dd}" style="${DI('52px')}"> / <input id="rec-m" type="text" value="${mm}" style="${DI('52px')}"> / <input id="rec-y" type="text" value="${yy}" style="${DI('78px')}"></div></div>
          ${recFld('Received From:','rec-from',rec.from||'','rtl')}
          <div style="display:flex;gap:36px;">${recFld('Phone:','rec-phone',rec.phone||'','',true)}${recFld('Email:','rec-email',rec.email||'','',true)}</div>
          <div style="display:flex;gap:36px;">${recFld('Amount:','rec-amount',rec.amount||'','',true)}${recFld('Payment Method:','rec-method',rec.method||'','',true)}</div>
          ${recFld('Description:','rec-desc',rec.desc||'','rtl')}
        </div>
        <div style="display:flex;justify-content:space-between;margin:5px 50px 45px;"><div><span style="font-family:'Times New Roman',serif;font-size:17px;font-weight:700;color:#1A4325;display:block;">Authorized Signature</span><div style="border-top:1px solid #000;width:200px;margin-top:38px;text-align:center;font-size:13px;padding-top:5px;">Receiver Name</div></div><div><span style="font-family:'Times New Roman',serif;font-size:17px;font-weight:700;color:#1A4325;display:block;text-align:center;">Official Stamp</span><div style="border:1px dashed #ccc;width:110px;height:110px;margin:8px auto;border-radius:50%;"></div></div></div>
        <div style="display:flex;height:14px;width:100%;"><div style="background:#0b2414;flex:1;"></div><div style="background:#1A4325;flex:1;"></div><div style="background:#2E7D32;flex:1;"></div><div style="background:#4CAF50;flex:1;"></div></div>
      </div></div>`);
}
function recFld(label,id,val,dir,flex){ return `<div style="display:flex;align-items:center;gap:15px;${flex?'flex:1;':''}"><span style="font-family:'Times New Roman',serif;font-size:17px;font-weight:700;color:#1A4325;white-space:nowrap;">${label}</span><input id="${id}" type="text" value="${(val||'').replace(/"/g,'&quot;')}" dir="${dir||''}" style="flex:1;background:transparent;border:none;border-bottom:1.5px solid #ccc;height:34px;padding:0 8px;font-size:17px;outline:none;font-family:inherit;${dir==='rtl'?'text-align:right;':''}"></div>`; }
function recCollect(){ const g=id=>document.getElementById(id); return{id:document.getElementById('receipt-modal-card')?.querySelector('strong')?.textContent||String(recNum).padStart(6,'0'),from:g('rec-from')?.value||'Unknown',phone:g('rec-phone')?.value||'',email:g('rec-email')?.value||'',amount:g('rec-amount')?.value||'0',method:g('rec-method')?.value||'',desc:g('rec-desc')?.value||'',date:`${g('rec-d')?.value||''}/${g('rec-m')?.value||''}/${g('rec-y')?.value||''}`}; }
function _pushReceipt(rec){const i=db.receipts.findIndex(x=>x.id===rec.id);if(i>=0)db.receipts[i]=rec;else db.receipts.push(rec);saveDB('receipts');_refreshView();}
function recSaveOnly(btn){_pushReceipt(recCollect());if(btn){btn.textContent='Saved!';btn.style.background='#2E7D32';setTimeout(()=>{btn.textContent='Save Only';btn.style.background='#e65100';},2000);}}
function recSaveAndPrint(){
    const rec=recCollect();
    _pushReceipt(rec);
    
    // Store the receipt data for printing
    localStorage.setItem('printReceiptData', JSON.stringify(rec));
    
    // Create a hidden iframe and load the receipt for direct printing
    const iframe = document.createElement('iframe');
    iframe.style.display = 'none';
    iframe.src = 'Cash-Recipt.html?id=' + rec.id + '&print=true';
    document.body.appendChild(iframe);
    
    // When the iframe loads, trigger print
    iframe.onload = function() {
        setTimeout(() => {
            iframe.contentWindow.print();
            // Remove iframe after printing
            setTimeout(() => {
                document.body.removeChild(iframe);
            }, 1000);
        }, 500);
    };
}

// ═══════════════════════════════════════════
// ██  QUOTATION MODAL
// ═══════════════════════════════════════════
let qNum=parseInt(localStorage.getItem('lastQuotationNum'))||260001;
function openQuotationModal(existing){
    if(!existing){qNum++;localStorage.setItem('lastQuotationNum',qNum);}
    const rec=existing||{},t=new Date(),fmt=d=>String(d.getDate()).padStart(2,'0')+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+d.getFullYear();
    const vDate=new Date(t);vDate.setDate(vDate.getDate()+7);
    const items=rec._items||[{desc:'',spec:'',imgBase64:'',qty:1,price:0}];
    openModalShell(`<div style="position:relative;width:100%;max-width:960px;margin:auto;">
      <button onclick="closeModalShell()" class="no-print-in-modal" style="position:fixed;top:15px;right:15px;z-index:10001;background:white;border:none;border-radius:50%;width:38px;height:38px;font-size:20px;cursor:pointer;box-shadow:0 2px 10px rgba(0,0,0,.3);line-height:1;">×</button>
      <div class="no-print-in-modal" style="display:flex;justify-content:center;gap:10px;margin-bottom:16px;flex-wrap:wrap;"><button onclick="qAddRow()" style="${B('#4CAF50')}">+ Add Item</button><button onclick="qRemoveRow()" style="${B('#f44336')}">− Remove Item</button><button onclick="qSaveAndPrint()" style="${B('#1A4325')}">Print & Save</button><button onclick="qSaveOnly(this)" style="${B('#e65100')}">Save Only</button></div>
      <div id="quotation-modal-card" style="background:#fff;border:1px solid #ccc;box-shadow:0 0 20px rgba(0,0,0,.15);font-family:'Segoe UI',Tahoma,sans-serif;color:#333;overflow:hidden;">
        <div style="height:8px;background:linear-gradient(to right,#0b2414,#4CAF50);"></div>
        <div style="padding:14px 36px;display:grid;grid-template-columns:1fr auto 1fr;align-items:center;border-bottom:1px solid #eee;"><div><div style="color:#1A4325;font-size:20px;font-weight:700;margin-bottom:4px;">Optech IT Solutions</div><div style="font-size:12px;color:#666;line-height:1.6;">21/2 Oriana Mall, El Mokattam<br>Mokattam • 11693 • Cairo<br>+20 1121450646 • info@optech-eg.com</div></div><div style="text-align:center;"><div style="color:#1A4325;letter-spacing:3px;font-size:30px;font-weight:700;">QUOTATION</div><div style="color:#888;font-size:11px;letter-spacing:1px;margin-top:3px;">PRICE OFFER / عرض سعر</div></div><div style="text-align:right;"><img src="optech-green-dot copy 2.png" alt="" style="width:80px;height:auto;" onerror="this.style.display='none'"></div></div>
        <div style="background:#D6F0E0;padding:7px 36px;display:flex;justify-content:space-between;align-items:center;border-bottom:1px solid #c8e6c9;"><span style="font-size:12px;color:#1A4325;font-weight:600;">Valid Until:</span><input id="q-valid" type="text" value="${rec.validUntil||fmt(vDate)}" style="border:1px solid #a5d6a7;border-radius:4px;padding:3px 8px;font-size:12px;color:#1A4325;font-weight:600;background:white;outline:none;font-family:inherit;"><span style="font-size:11px;color:#2E7D32;">Subject to stock availability</span></div>
        <div style="padding:14px 36px;display:flex;justify-content:space-between;background:#fcfcfc;"><div><div style="color:#1A4325;font-size:14px;font-weight:700;margin-bottom:7px;border-bottom:2px solid #2E7D32;display:inline-block;padding-bottom:2px;">Quote To / مقدم إلى</div><input id="q-client" type="text" value="${rec.client||''}" placeholder="Client Name" style="${FLD('260px')}font-weight:700;"><input id="q-phone" type="text" value="${rec.phone||''}" placeholder="Phone" style="${FLD('260px')}margin-top:4px;"><input id="q-email" type="email" value="${rec.email||''}" placeholder="Email" style="${FLD('260px')}margin-top:4px;"></div><div style="text-align:right;">${metaRow('q-no',rec.id||'QUO-'+String(qNum).padStart(6,'0'),'Quotation No')}${metaRow('q-date',rec.date||fmt(t),'Issue Date')}${metaRow('q-by',rec.preparedBy||'','Prepared By')}</div></div>
        <table id="q-items" style="width:calc(100% - 72px);margin:8px 36px;border-collapse:collapse;"><thead><tr><th style="${TH()}width:70px;">Image</th><th style="${TH()}width:32%;">Description / البيان</th><th style="${TH()}width:22%;">Specifications</th><th style="${TH()}width:7%;">Qty</th><th style="${TH()}width:13%;">Unit Price</th><th style="${TH()}width:13%;">Amount</th><th class="no-print-in-modal" style="${TH()}width:30px;"></th></tr></thead><tbody>${items.map(it=>qRowHTML(it)).join('')}</tbody></table>
        <div style="padding:10px 36px;display:flex;justify-content:space-between;"><div style="width:54%;"><div style="color:#1A4325;font-weight:700;font-size:13px;margin-bottom:7px;">Terms & Conditions / شروط وأحكام</div><div id="q-terms">${(rec._terms||['الأسعار صالحة لمدة 7 أيام من تاريخ العرض.','الأسعار شاملة ضريبة القيمة المضافة 14%.','يُعتبر هذا العرض ملغياً في حالة تغيُّر سعر الصرف بأكثر من 5%.','ضمان الأجهزة وفق الشروط المعتمدة من الموزع الرسمي.']).map(tt=>qTermLine(tt)).join('')}</div><div class="no-print-in-modal" style="margin-top:5px;"><button onclick="qAddTerm()" style="background:#D6F0E0;border:1px solid #2E7D32;color:#1A4325;padding:2px 8px;border-radius:4px;cursor:pointer;font-size:10px;font-weight:700;">+ Add Term</button></div></div>
        <div style="width:36%;">${tRow('Subtotal','<span id="q-sub">0.00</span>')}${tRowCb('q-tax-cb','VAT (14%)','<span id="q-tax">0.00</span>',rec._tax!==false,'qCalc()')}${tRow('Shipping',`<input type="number" id="q-ship" value="${rec._ship||0}" oninput="qCalc()" style="width:60px;border:1px solid #eee;padding:3px;text-align:center;font-size:12px;">`)}${tRowCb('q-inst-cb','Installation',`<input type="number" id="q-inst" value="${rec._instVal||0}" oninput="qCalc()" style="width:60px;border:1px solid #eee;padding:3px;text-align:center;font-size:12px;">`,rec._inst!==false,'qCalc()')}${tRowCb('q-disc-cb','Discount',`<input type="number" id="q-disc" value="${rec._discVal||0}" oninput="qCalc()" style="width:60px;border:1px solid #eee;padding:3px;text-align:center;font-size:12px;">`,rec._disc===true,'qCalc()')}<div style="display:flex;justify-content:space-between;align-items:center;background:#D6F0E0;padding:8px;margin-top:5px;font-weight:700;font-size:15px;color:#1A4325;"><span id="q-grand">EGP 0.00</span><span>TOTAL / الإجمالي</span></div></div></div>
        <div style="padding:8px 36px 22px;text-align:center;display:flex;flex-direction:column;align-items:center;"><div style="position:relative;width:200px;padding-top:14px;"><img src="Signature.png" alt="" style="width:140px;height:auto;margin-bottom:-10px;position:relative;z-index:1;" onerror="this.style.display='none'"><div style="border-top:2px solid #1A4325;width:100%;padding-top:4px;font-weight:700;font-size:12px;">Authorized Signature</div></div></div>
        <div style="text-align:center;padding:6px 36px 16px;font-size:11px;color:#999;border-top:1px solid #eee;">Thank you for considering OPTECH IT Solutions — info@optech-eg.com | +20 1121450646</div>
      </div></div>`);
    ['q-tax-cb','q-inst-cb','q-disc-cb'].forEach(id=>{const el=document.getElementById(id);if(el)el.onchange=qCalc;});
    qCalc();
}
function qRowHTML(it){it=it||{};const inS=`width:100%;border:none;padding:5px;font-size:12px;background:#f9f9f9;border-radius:3px;font-family:inherit;`;const imgPrev=it.imgBase64?`<img src="${it.imgBase64}" style="width:120px;height:100px;object-fit:cover;border-radius:3px;display:block;margin-bottom:4px;">`:'<div style="width:120px;height:100px;border:2px dashed #ddd;border-radius:3px;display:flex;align-items:center;justify-content:center;font-size:9px;color:#aaa;text-align:center;margin-bottom:4px;">No image</div>';return `<tr class="q-item-row"><td style="${TD()}text-align:center;vertical-align:top;padding:6px;"><div class="q-img-preview">${imgPrev}</div><label class="no-print-in-modal" style="cursor:pointer;"><span style="font-size:10px;color:#1A4325;text-decoration:underline;">Upload</span><input type="file" accept="image/*" class="q-img-input" onchange="qHandleImage(this)" style="display:none;"></label><input type="hidden" class="q-img-data" value="${it.imgBase64||''}"></td><td style="${TD()}vertical-align:top;"><input type="text" class="q-desc" value="${(it.desc||'').replace(/"/g,'&quot;')}" placeholder="Product name..." style="${inS}text-align:right;"></td><td style="${TD()}vertical-align:top;"><textarea class="q-spec" placeholder="Specifications..." rows="2" style="${inS}resize:vertical;min-height:40px;text-align:right;">${it.spec||''}</textarea></td><td style="${TD()}vertical-align:top;"><input type="number" class="q-qty" value="${it.qty||1}" oninput="qCalc()" style="${inS}text-align:center;"></td><td style="${TD()}vertical-align:top;"><input type="number" class="q-price" value="${it.price||0}" oninput="qCalc()" style="${inS}text-align:center;"></td><td class="q-total-cell" style="${TD()}font-weight:700;text-align:center;font-size:13px;vertical-align:top;padding-top:12px;">0.00</td><td class="no-print-in-modal" style="${TD()}text-align:center;vertical-align:top;"><button onclick="this.closest('tr').remove();qCalc();" style="background:none;border:none;color:#f44336;cursor:pointer;font-size:18px;line-height:1;padding:4px;">×</button></td></tr>`;}
function qHandleImage(input){const row=input.closest('tr.q-item-row');if(!row||!input.files[0])return;const reader=new FileReader();reader.onload=e=>{const img=new Image();img.onload=()=>{const canvas=document.createElement('canvas');const maxW=400,maxH=300;let w=img.width,h=img.height;if(w>maxW){h=Math.round(h*maxW/w);w=maxW;}if(h>maxH){w=Math.round(w*maxH/h);h=maxH;}canvas.width=w;canvas.height=h;canvas.getContext('2d').drawImage(img,0,0,w,h);const small=canvas.toDataURL('image/jpeg',0.7);row.querySelector('.q-img-data').value=small;row.querySelector('.q-img-preview').innerHTML=`<img src="${small}" style="width:120px;height:100px;object-fit:cover;border-radius:3px;display:block;margin-bottom:4px;">`;};img.src=e.target.result;};reader.readAsDataURL(input.files[0]);}
function qDeleteImage(btn){const row=btn.closest('tr.q-item-row');if(!row)return;row.querySelector('.q-img-data').value='';row.querySelector('.q-img-preview').innerHTML='<div style="width:120px;height:100px;border:2px dashed #ddd;border-radius:3px;display:flex;align-items:center;justify-content:center;font-size:9px;color:#aaa;text-align:center;margin-bottom:4px;">No image</div>';}
function qTermLine(text){return `<div style="display:flex;align-items:center;gap:4px;margin-bottom:2px;"><button class="no-print-in-modal" onclick="this.parentElement.remove()" style="background:none;border:none;color:#f44336;cursor:pointer;font-size:13px;padding:0 2px;">×</button><span style="color:#999;">•</span><input type="text" value="${(text||'').replace(/"/g,'&quot;')}" style="border:none;background:transparent;width:100%;font-size:11px;color:#555;padding:2px;font-family:inherit;outline:none;"></div>`;}
function qAddRow(){document.querySelector('#q-items tbody').insertAdjacentHTML('beforeend',qRowHTML({}));qCalc();}
function qRemoveRow(){const r=document.querySelectorAll('#q-items tbody tr');if(r.length>1){r[r.length-1].remove();qCalc();}}
function qAddTerm(){document.getElementById('q-terms').insertAdjacentHTML('beforeend',qTermLine(''));}
function qCalc(){let sub=0;document.querySelectorAll('#q-items tbody tr').forEach(r=>{const q=parseFloat(r.querySelector('.q-qty')?.value)||0,p=parseFloat(r.querySelector('.q-price')?.value)||0,v=q*p;const c=r.querySelector('.q-total-cell');if(c)c.textContent=v.toLocaleString(undefined,{minimumFractionDigits:2});sub+=v;});const g=id=>document.getElementById(id),tax=g('q-tax-cb')?.checked?sub*0.14:0,inst=g('q-inst-cb')?.checked?(parseFloat(g('q-inst')?.value)||0):0,disc=g('q-disc-cb')?.checked?(parseFloat(g('q-disc')?.value)||0):0,ship=parseFloat(g('q-ship')?.value)||0,tot=sub+tax+ship+inst-disc,f=n=>n.toLocaleString(undefined,{minimumFractionDigits:2});if(g('q-sub'))g('q-sub').textContent=f(sub);if(g('q-tax'))g('q-tax').textContent=f(tax);if(g('q-grand'))g('q-grand').textContent='EGP '+f(tot);}
function qCollect(){const raw=document.getElementById('q-grand')?.textContent||'0';const items=[];document.querySelectorAll('#q-items tbody tr').forEach(r=>{items.push({desc:r.querySelector('.q-desc')?.value||'',spec:r.querySelector('.q-spec')?.value||'',imgBase64:r.querySelector('.q-img-data')?.value||'',qty:parseFloat(r.querySelector('.q-qty')?.value)||0,price:parseFloat(r.querySelector('.q-price')?.value)||0});});const terms=[];document.querySelectorAll('#q-terms input[type=text]').forEach(i=>{if(i.value.trim())terms.push(i.value.trim());});const g=id=>document.getElementById(id);return{id:g('q-no')?.value||'QUO-'+String(qNum).padStart(6,'0'),client:g('q-client')?.value||'Unknown',phone:g('q-phone')?.value||'',email:g('q-email')?.value||'',date:g('q-date')?.value||'',validUntil:g('q-valid')?.value||'',preparedBy:g('q-by')?.value||'',total:parseFloat(raw.replace('EGP ','').replace(/,/g,''))||0,status:'pending',_items:items,_tax:g('q-tax-cb')?.checked!==false,_ship:parseFloat(g('q-ship')?.value)||0,_inst:g('q-inst-cb')?.checked!==false,_instVal:parseFloat(g('q-inst')?.value)||0,_disc:g('q-disc-cb')?.checked===true,_discVal:parseFloat(g('q-disc')?.value)||0,_terms:terms};}
function _pushQuotation(rec){const i=db.quotations.findIndex(x=>x.id===rec.id);if(i>=0)db.quotations[i]=rec;else db.quotations.push(rec);saveDB('quotations');_refreshView();}
function qSaveOnly(btn){_pushQuotation(qCollect());if(btn){btn.textContent='Saved!';btn.style.background='#2E7D32';setTimeout(()=>{btn.textContent='Save Only';btn.style.background='#e65100';},2000);}}
function qSaveAndPrint(){
    const rec=qCollect();
    _pushQuotation(rec);
    
    // Store the quotation data for printing
    localStorage.setItem('printQuotationData', JSON.stringify(rec));
    
    // Create a hidden iframe and load the quotation for direct printing
    const iframe = document.createElement('iframe');
    iframe.style.display = 'none';
    iframe.src = 'QUOTATION.html?id=' + rec.id + '&print=true';
    document.body.appendChild(iframe);
    
    // When the iframe loads, trigger print
    iframe.onload = function() {
        setTimeout(() => {
            iframe.contentWindow.print();
            // Remove iframe after printing
            setTimeout(() => {
                document.body.removeChild(iframe);
            }, 1000);
        }, 500);
    };
}

// ═══════════════════════════════════════════
// LIVE VIEW REFRESH
// ═══════════════════════════════════════════
function _refreshView(){
    const c=document.getElementById('view-container');if(!c)return;
    if(c.querySelector('canvas#mainChart')) renderDashboard(c);
    else if(c.innerHTML.includes('Invoice Management')) renderInvoices(c);
    else if(c.innerHTML.includes('Cash Receipts'))      renderReceipts(c);
    else if(c.innerHTML.includes('عروض الأسعار'))       renderQuotations(c);
    else if(c.innerHTML.includes('inv-search'))         renderInventory(c);
}

// ═══════════════════════════════════════════
// DASHBOARD
// ═══════════════════════════════════════════
function renderDashboard(container){
    const ts=db.invoices.reduce((s,i)=>s+(parseFloat(i.total)||0),0);
    const tr=db.receipts.reduce((s,r)=>s+(parseFloat(r.amount)||0),0);
    const lowStock=(db.inventory||[]).filter(i=>(i.currentStock||0)<=(i.minStock||0)&&i.minStock>0).length;
    container.innerHTML=`
        <div style="margin-bottom:24px;display:flex;justify-content:space-between;align-items:center;">
            <div><h1 style="color:var(--primary-green);font-size:26px;">Dashboard</h1><p style="color:var(--text-muted,#888);font-size:14px;">OPTECH IT Solutions — Activity Summary</p></div>
            <div style="font-size:12px;color:#888;background:var(--card-bg,white);padding:6px 12px;border-radius:6px;box-shadow:0 1px 4px rgba(0,0,0,.06);">${DbClient.IS_SERVER?'🟢 Server Mode':'🟡 Local Mode'}</div>
        </div>
        <div class="stats-grid">
            <div class="stat-card"><h3>Total Sales</h3><p>EGP ${ts.toLocaleString()}</p></div>
            <div class="stat-card"><h3>Cash Collected</h3><p>EGP ${tr.toLocaleString()}</p></div>
            <div class="stat-card"><h3>Invoices</h3><p>${db.invoices.length}</p></div>
            <div class="stat-card"><h3>Quotations</h3><p>${db.quotations.length}</p></div>
            <div class="stat-card" style="border-right-color:#ffa000;"><h3>Customers</h3><p>${db.customers.length}</p></div>
            <div class="stat-card" style="border-right-color:#1565C0;"><h3>CRM Leads</h3><p>${(db.leads||[]).length}</p></div>
            <div class="stat-card" style="border-right-color:#6a1b9a;"><h3>Inventory Items</h3><p>${(db.inventory||[]).length}</p></div>
            ${lowStock>0?`<div class="stat-card" style="border-right-color:#c62828;"><h3>⚠ Low Stock</h3><p style="color:#c62828;">${lowStock}</p></div>`:''}
        </div>
        <div style="display:grid;grid-template-columns:2fr 1fr;gap:20px;">
            <div style="background:var(--card-bg,white);padding:20px;border-radius:8px;box-shadow:0 2px 10px rgba(0,0,0,.05);">
                <h3 style="margin-bottom:14px;">Recent Invoices</h3>
                <table class="data-table"><thead><tr><th>No.</th><th>Client</th><th>Date</th><th>Total</th></tr></thead>
                <tbody>${db.invoices.slice(-5).reverse().map(inv=>`<tr><td>${inv.id}</td><td>${inv.client}</td><td>${inv.date}</td><td>${parseFloat(inv.total).toLocaleString()} EGP</td></tr>`).join('')||'<tr><td colspan="4" style="text-align:center;color:#aaa;padding:20px;">No invoices yet</td></tr>'}</tbody></table>
            </div>
            <div style="background:var(--card-bg,white);padding:20px;border-radius:8px;text-align:center;box-shadow:0 2px 10px rgba(0,0,0,.05);">
                <h3 style="margin-bottom:14px;">Operations Split</h3>
                <canvas id="mainChart" height="200"></canvas>
            </div>
        </div>`;
    initChart();
}

// ═══════════════════════════════════════════
// QUOTATIONS PAGE
// ═══════════════════════════════════════════
const STATUS_LABELS={pending:'Pending',approved:'Approved',rejected:'Rejected',converted:'Converted'};
const STATUS_COLORS={pending:'#888',approved:'#2E7D32',rejected:'#c62828',converted:'#1565C0'};
function renderInvoices(container){container.innerHTML=`<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px;"><h1>Invoice Management</h1><button class="btn-primary" onclick="openInvoiceModal()">+ New Invoice</button></div><table class="data-table"><thead><tr><th>#</th><th>Client</th><th>Date</th><th>Total</th><th>Actions</th></tr></thead><tbody>${db.invoices.map(inv=>`<tr><td>${inv.id}</td><td>${inv.client}</td><td>${inv.date}</td><td>${parseFloat(inv.total).toLocaleString()} EGP</td><td style="display:flex;gap:6px;"><button style="background:#1565C0;color:white;border:none;padding:5px 10px;border-radius:4px;cursor:pointer;font-size:12px;" onclick="openInvoiceModal(db.invoices.find(x=>x.id==='${inv.id}'))">View / Edit</button><button style="background:#4CAF50;color:white;border:none;padding:5px 10px;border-radius:4px;cursor:pointer;font-size:12px;" onclick="printInvoiceDirect('${inv.id}')">Print</button><button style="background:#c62828;color:white;border:none;padding:5px 10px;border-radius:4px;cursor:pointer;font-size:12px;" onclick="setTimeout(() => deleteRecord('invoices','${inv.id}'), 0)">Delete</button></td></tr>`).join('')||'<tr><td colspan="5" style="text-align:center;padding:30px;color:#aaa;">Click "+ New Invoice" to get started</td></tr>'}</tbody></table>`;}
function renderQuotations(container){container.innerHTML=`<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px;"><h1>Quotations / \u0639\u0631\u0648\u0636 \u0627\u0644\u0623\u0633\u0639\u0627\u0631</h1><button class="btn-primary" onclick="openQuotationModal()">+ New Quotation</button></div><table class="data-table"><thead><tr><th>#</th><th>Client</th><th>Date</th><th>Valid Until</th><th>Total</th><th>Status</th><th>Actions</th></tr></thead><tbody>${db.quotations.map(q=>`<tr><td>${q.id}</td><td>${q.client}</td><td>${q.date}</td><td>${q.validUntil||'—'}</td><td>${parseFloat(q.total||0).toLocaleString()} EGP</td><td><select onchange="updateQuotationStatus('${q.id}',this.value)" style="border:1px solid #ddd;padding:3px 8px;border-radius:4px;font-size:12px;font-weight:600;color:${STATUS_COLORS[q.status||'pending']};">${Object.keys(STATUS_LABELS).map(k=>`<option value="${k}" ${q.status===k?'selected':''}>${STATUS_LABELS[k]}</option>`).join('')}</select></td><td style="display:flex;gap:6px;"><button style="background:#1565C0;color:white;border:none;padding:5px 10px;border-radius:4px;cursor:pointer;font-size:12px;" onclick="openQuotationModal(db.quotations.find(x=>x.id==='${q.id}'))">View / Edit</button><button style="background:#c62828;color:white;border:none;padding:5px 10px;border-radius:4px;cursor:pointer;font-size:12px;" onclick="deleteRecord('quotations','${q.id}')">Delete</button></td></tr>`).join('')||'<tr><td colspan="7" style="text-align:center;padding:30px;color:#aaa;">No quotations yet</td></tr>'}</tbody></table>`;}
function updateQuotationStatus(id,status){const q=db.quotations.find(x=>x.id===id);if(q){q.status=status;saveDB('quotations');}}

function renderReceipts(container){container.innerHTML=`<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px;"><h1>Cash Receipts</h1><button class="btn-primary" onclick="openReceiptModal()">+ New Receipt</button></div><table class="data-table"><thead><tr><th>Ref No.</th><th>Received From</th><th>Amount</th><th>Date</th><th>Actions</th></tr></thead><tbody>${db.receipts.map(rec=>`<tr><td>${rec.id}</td><td>${rec.from}</td><td>${rec.amount}</td><td>${rec.date}</td><td style="display:flex;gap:6px;"><button style="background:#1565C0;color:white;border:none;padding:5px 10px;border-radius:4px;cursor:pointer;font-size:12px;" onclick="openReceiptModal(db.receipts.find(x=>x.id==='${rec.id}'))">View / Edit</button><button style="background:#c62828;color:white;border:none;padding:5px 10px;border-radius:4px;cursor:pointer;font-size:12px;" onclick="deleteRecord('receipts','${rec.id}')">Delete</button></td></tr>`).join('')||'<tr><td colspan="5" style="text-align:center;padding:30px;color:#aaa;">No receipts yet</td></tr>'}</tbody></table>`;}

// ... (rest of the code remains the same)
function renderCustomers(container){container.innerHTML=`<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px;"><h1>Customer Database</h1><div style="display:flex;gap:8px;"><button style="background:white;color:var(--primary-green);border:1.5px solid var(--primary-green);padding:10px 16px;border-radius:5px;cursor:pointer;font-size:13px;font-weight:600;" onclick="exportCustomersCSV()">⬇ Export CSV</button><button class="btn-primary" onclick="showAddCustomerForm()">+ Add Customer</button></div></div><div id="customer-form-area"></div><table class="data-table" id="customers-table"><thead><tr><th>#</th><th>Name</th><th>Phone</th><th>Email</th><th>Company</th><th>City</th><th>Actions</th></tr></thead><tbody>${renderCustomerRows()}</tbody></table>`;}
function renderCustomerRows(){if(!db.customers.length)return'<tr><td colspan="7" style="text-align:center;padding:30px;color:#aaa;">No customers yet</td></tr>';return db.customers.map((c,i)=>`<tr><td>${i+1}</td><td>${c.name}</td><td>${c.phone||'—'}</td><td>${c.email||'—'}</td><td>${c.company||'—'}</td><td>${c.city||'—'}</td><td><button style="background:#c62828;color:white;border:none;padding:5px 10px;border-radius:4px;cursor:pointer;font-size:12px;" onclick="deleteCustomer(${i})">Delete</button></td></tr>`).join('');}
function showAddCustomerForm(){document.getElementById('customer-form-area').innerHTML=`<div style="background:var(--card-bg,white);padding:22px;border-radius:8px;margin-bottom:18px;box-shadow:0 2px 10px rgba(0,0,0,.07);"><h3 style="margin-bottom:14px;color:var(--primary-green);">New Customer</h3><div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:14px;">${[['c-name','Full Name *'],['c-phone','Phone'],['c-email','Email'],['c-company','Company'],['c-city','City'],['c-notes','Notes']].map(([id,lbl])=>`<div><label style="font-size:12px;color:#666;">${lbl}</label><input id="${id}" type="text" style="width:100%;border:1px solid #ddd;padding:8px;border-radius:4px;margin-top:3px;"></div>`).join('')}</div><div style="margin-top:14px;display:flex;gap:10px;"><button class="btn-primary" onclick="saveCustomer()">Save Customer</button><button style="background:white;border:1px solid #ccc;padding:10px 18px;border-radius:4px;cursor:pointer;" onclick="document.getElementById('customer-form-area').innerHTML=''">Cancel</button></div></div>`;}
function saveCustomer(){const name=document.getElementById('c-name').value.trim();if(!name){alert('Name is required');return;}db.customers.push({name,phone:document.getElementById('c-phone').value,email:document.getElementById('c-email').value,company:document.getElementById('c-company').value,city:document.getElementById('c-city').value,notes:document.getElementById('c-notes').value,created:new Date().toLocaleDateString()});saveDB('customers');document.querySelector('#customers-table tbody').innerHTML=renderCustomerRows();document.getElementById('customer-form-area').innerHTML='';}
function deleteCustomer(i){if(!confirm('Delete this customer?'))return;db.customers.splice(i,1);saveDB('customers');document.querySelector('#customers-table tbody').innerHTML=renderCustomerRows();}
function exportCustomersCSV(){const rows=[['#','Full Name','Phone','Email','Company','City','Notes','Created'],...db.customers.map((c,i)=>[i+1,c.name,c.phone||'',c.email||'',c.company||'',c.city||'',c.notes||'',c.created||''])];const csv=rows.map(r=>r.map(v=>`"${String(v).replace(/"/g,'""')}"`).join(',')).join('\n');const a=document.createElement('a');a.href=URL.createObjectURL(new Blob(['\uFEFF'+csv],{type:'text/csv;charset=utf-8'}));a.download=`optech_customers_${new Date().toISOString().slice(0,10)}.csv`;a.click();}

// ═══════════════════════════════════════════
// ██  SUPPLIERS
// ═══════════════════════════════════════════
function renderSuppliers(container){
    container.innerHTML=`
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px;">
        <h1>🏭 Suppliers / الموردون</h1>
        <div style="display:flex;gap:8px;">
            <button style="background:white;color:var(--primary-green);border:1.5px solid var(--primary-green);padding:10px 16px;border-radius:5px;cursor:pointer;font-size:13px;font-weight:600;" onclick="exportSuppliersCSV()">⬇ Export CSV</button>
            <button class="btn-primary" onclick="openSupplierModal()">+ Add Supplier</button>
        </div>
    </div>
    <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(320px,1fr));gap:16px;" id="suppliers-grid">
        ${renderSupplierCards()}
    </div>`;
}
function renderSupplierCards(){
    if(!db.suppliers||!db.suppliers.length) return `<div style="grid-column:1/-1;text-align:center;padding:40px;color:#aaa;background:var(--card-bg,white);border-radius:8px;">No suppliers yet — click "+ Add Supplier" to start</div>`;
    return db.suppliers.map(s=>`
        <div style="background:var(--card-bg,white);border-radius:10px;padding:20px;box-shadow:0 2px 10px rgba(0,0,0,.06);border-left:4px solid #1A4325;">
            <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:12px;">
                <div>
                    <div style="font-size:16px;font-weight:700;color:var(--primary-green);">${s.name}</div>
                    <div style="font-size:12px;color:#888;margin-top:2px;">${s.category||'General Supplier'}</div>
                </div>
                <div style="display:flex;gap:5px;">
                    <button style="background:#1565C0;color:white;border:none;padding:4px 10px;border-radius:4px;cursor:pointer;font-size:11px;" onclick="openSupplierModal('${s.id}')">Edit</button>
                    <button style="background:#c62828;color:white;border:none;padding:4px 8px;border-radius:4px;cursor:pointer;font-size:11px;" onclick="deleteSupplier('${s.id}')">×</button>
                </div>
            </div>
            ${s.contactPerson?`<div style="font-size:13px;margin-bottom:4px;">👤 ${s.contactPerson}</div>`:''}
            ${s.phone?`<div style="font-size:13px;margin-bottom:4px;">📞 ${s.phone}</div>`:''}
            ${s.email?`<div style="font-size:13px;margin-bottom:4px;">📧 ${s.email}</div>`:''}
            ${s.paymentTerms?`<div style="font-size:12px;color:#888;margin-top:6px;background:#f5f5f5;padding:4px 8px;border-radius:4px;">💳 ${s.paymentTerms}</div>`:''}
            ${s.products?`<div style="font-size:11px;color:#666;margin-top:6px;">Products: ${s.products}</div>`:''}
            ${s.rating?`<div style="margin-top:8px;font-size:13px;">${'★'.repeat(s.rating)+'☆'.repeat(5-s.rating)}</div>`:''}
        </div>`).join('');
}
function openSupplierModal(id){
    const s=id?db.suppliers.find(x=>x.id===id):{};
    openModalShell(`<div style="background:white;border-radius:12px;padding:28px;max-width:560px;width:100%;margin:auto;box-shadow:0 20px 60px rgba(0,0,0,.2);">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px;"><h3 style="font-size:17px;color:#1A4325;">${id?'Edit Supplier':'New Supplier'}</h3><button onclick="closeModalShell()" style="background:none;border:none;font-size:22px;cursor:pointer;color:#aaa;">×</button></div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;">
            ${[['s-name','Supplier Name *','text',s.name||''],['s-category','Category','text',s.category||''],['s-contact','Contact Person','text',s.contactPerson||''],['s-phone','Phone','text',s.phone||''],['s-email','Email','email',s.email||''],['s-address','Address','text',s.address||''],['s-terms','Payment Terms','text',s.paymentTerms||''],['s-products','Products Supplied','text',s.products||'']].map(([fid,lbl,type,val])=>`<div style="${fid==='s-products'||fid==='s-address'?'grid-column:1/-1':''}"><label style="font-size:11px;color:#666;font-weight:700;text-transform:uppercase;display:block;margin-bottom:4px;">${lbl}</label><input id="${fid}" type="${type}" value="${(val||'').replace(/"/g,'&quot;')}" style="width:100%;border:1.5px solid #ddd;padding:8px 10px;border-radius:7px;font-size:14px;outline:none;font-family:inherit;"></div>`).join('')}
            <div><label style="font-size:11px;color:#666;font-weight:700;text-transform:uppercase;display:block;margin-bottom:4px;">Rating</label><select id="s-rating" style="width:100%;border:1.5px solid #ddd;padding:8px 10px;border-radius:7px;font-size:14px;outline:none;"><option value="">—</option>${[1,2,3,4,5].map(n=>`<option value="${n}" ${s.rating==n?'selected':''}>${'★'.repeat(n)}</option>`).join('')}</select></div>
            <div><label style="font-size:11px;color:#666;font-weight:700;text-transform:uppercase;display:block;margin-bottom:4px;">Notes</label><input id="s-notes" type="text" value="${(s.notes||'').replace(/"/g,'&quot;')}" style="width:100%;border:1.5px solid #ddd;padding:8px 10px;border-radius:7px;font-size:14px;outline:none;"></div>
        </div>
        <div style="display:flex;gap:10px;justify-content:flex-end;margin-top:20px;">
            <button onclick="closeModalShell()" style="background:white;border:1.5px solid #ddd;padding:10px 20px;border-radius:7px;cursor:pointer;font-size:13px;">Cancel</button>
            <button onclick="saveSupplier('${id||''}')" style="background:#1A4325;color:white;border:none;padding:10px 24px;border-radius:7px;cursor:pointer;font-size:13px;font-weight:700;">Save Supplier</button>
        </div>
    </div>`);
}
function saveSupplier(id){
    const name=document.getElementById('s-name').value.trim();if(!name){alert('Supplier name required');return;}
    const rec={id:id||Date.now().toString(),name,category:document.getElementById('s-category').value,contactPerson:document.getElementById('s-contact').value,phone:document.getElementById('s-phone').value,email:document.getElementById('s-email').value,address:document.getElementById('s-address').value,paymentTerms:document.getElementById('s-terms').value,products:document.getElementById('s-products').value,rating:parseInt(document.getElementById('s-rating').value)||0,notes:document.getElementById('s-notes').value,created:id?(db.suppliers.find(x=>x.id===id)?.created||new Date().toLocaleDateString()):new Date().toLocaleDateString()};
    if(!db.suppliers) db.suppliers=[];
    if(id){const i=db.suppliers.findIndex(x=>x.id===id);if(i>=0)db.suppliers[i]=rec;}else db.suppliers.push(rec);
    saveDB('suppliers');closeModalShell();
    document.getElementById('suppliers-grid').innerHTML=renderSupplierCards();
}
function deleteSupplier(id){if(!confirm('Delete this supplier?'))return;db.suppliers=db.suppliers.filter(s=>s.id!==id);saveDB('suppliers');document.getElementById('suppliers-grid').innerHTML=renderSupplierCards();}
function exportSuppliersCSV(){const rows=[['#','Name','Category','Contact','Phone','Email','Payment Terms','Products','Rating','Notes'],...(db.suppliers||[]).map((s,i)=>[i+1,s.name,s.category||'',s.contactPerson||'',s.phone||'',s.email||'',s.paymentTerms||'',s.products||'',s.rating||'',s.notes||''])];const csv=rows.map(r=>r.map(v=>`"${String(v).replace(/"/g,'""')}"`).join(',')).join('\n');const a=document.createElement('a');a.href=URL.createObjectURL(new Blob(['\uFEFF'+csv],{type:'text/csv;charset=utf-8'}));a.download=`optech_suppliers_${new Date().toISOString().slice(0,10)}.csv`;a.click();}

// ═══════════════════════════════════════════
// ██  INVENTORY
// ═══════════════════════════════════════════
let invTab='items';
function renderInventory(container){
    db.inventory=db.inventory||[];
    db.inventory_movements=db.inventory_movements||[];
    const lowStockItems=(db.inventory||[]).filter(i=>(i.currentStock||0)<=(i.minStock||0)&&i.minStock>0);
    const totalValue=(db.inventory||[]).reduce((s,i)=>s+((i.currentStock||0)*(i.costPrice||0)),0);
    container.innerHTML=`
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px;">
        <h1>📦 Inventory / المخزون</h1>
        <div style="display:flex;gap:8px;" id="inv-top-actions"></div>
    </div>
    <div class="stats-grid" style="margin-bottom:20px;">
        <div class="stat-card"><h3>Total Items</h3><p>${db.inventory.length}</p></div>
        <div class="stat-card" style="border-right-color:#1565C0;"><h3>Stock Value</h3><p>EGP ${Math.round(totalValue).toLocaleString()}</p></div>
        <div class="stat-card" style="border-right-color:#c62828;"><h3>Low Stock</h3><p style="color:${lowStockItems.length?'#c62828':'inherit'}">${lowStockItems.length}</p></div>
        <div class="stat-card" style="border-right-color:#ffa000;"><h3>Movements</h3><p>${db.inventory_movements.length}</p></div>
    </div>
    <!-- Tabs -->
    <div style="display:flex;gap:4px;background:var(--card-bg,white);border-radius:8px;padding:5px;width:fit-content;margin-bottom:18px;box-shadow:0 2px 8px rgba(0,0,0,.05);">
        <button id="itab-items"    onclick="switchInvTab('items')"     style="${invTabStyle('items'   )}">Items</button>
        <button id="itab-movements" onclick="switchInvTab('movements')" style="${invTabStyle('movements')}">Stock Movements</button>
        <button id="itab-lowstock"  onclick="switchInvTab('lowstock')"  style="${invTabStyle('lowstock' )}">⚠ Low Stock (${lowStockItems.length})</button>
    </div>
    <div id="inv-content"></div>`;
    renderInvTab();
    updateInvTopActions();
}
function invTabStyle(t){return invTab===t?`background:#1A4325;color:white;border:none;padding:9px 20px;border-radius:6px;cursor:pointer;font-size:14px;font-weight:600;`:`background:transparent;border:none;padding:9px 20px;border-radius:6px;cursor:pointer;font-size:14px;font-weight:500;color:#6b8073;`;}
function switchInvTab(t){invTab=t;document.querySelectorAll('[id^=itab-]').forEach(b=>{const isActive=b.id==='itab-'+t;b.style.background=isActive?'#1A4325':'transparent';b.style.color=isActive?'white':'#6b8073';b.style.fontWeight=isActive?'600':'500';});renderInvTab();updateInvTopActions();}
function updateInvTopActions(){const el=document.getElementById('inv-top-actions');if(!el)return;if(invTab==='items'){el.innerHTML=`<button style="background:white;color:var(--primary-green);border:1.5px solid var(--primary-green);padding:10px 16px;border-radius:5px;cursor:pointer;font-size:13px;font-weight:600;" onclick="exportInvCSV()">⬇ Export CSV</button><button class="btn-primary" onclick="openItemModal()">+ Add Item</button>`;}else if(invTab==='movements'){el.innerHTML=`<button class="btn-primary" onclick="openMovementModal()">+ Record Movement</button>`;}else{el.innerHTML='';}}
function renderInvTab(){
    const el=document.getElementById('inv-content'); if(!el)return;
    if(invTab==='items')     el.innerHTML=renderItemsTable();
    if(invTab==='movements') el.innerHTML=renderMovementsTable();
    if(invTab==='lowstock')  el.innerHTML=renderLowStockTable();
}
function renderItemsTable(){
    if(!db.inventory.length) return `<div style="text-align:center;padding:40px;background:var(--card-bg,white);border-radius:8px;color:#aaa;">No items yet — click "+ Add Item" to build your inventory</div>`;
    const rows=db.inventory.map(it=>{
        const stockColor=(it.currentStock||0)<=(it.minStock||0)&&it.minStock>0?'#c62828':(it.currentStock||0)<=it.minStock*1.5?'#e65100':'#2E7D32';
        return `<tr>
            <td><strong>${it.sku||'—'}</strong></td>
            <td>${it.name}<div style="font-size:11px;color:#888;">${it.category||''}</div></td>
            <td>${it.unit||'pcs'}</td>
            <td style="font-weight:700;color:${stockColor};">${it.currentStock||0}</td>
            <td>${it.minStock||0}</td>
            <td>EGP ${(it.costPrice||0).toLocaleString()}</td>
            <td>EGP ${(it.salePrice||0).toLocaleString()}</td>
            <td>${it.location||'—'}</td>
            <td style="white-space:nowrap;display:flex;gap:4px;">
                <button style="background:#2E7D32;color:white;border:none;padding:4px 8px;border-radius:4px;cursor:pointer;font-size:11px;" onclick="openMovementModal('${it.id}','in')">+ In</button>
                <button style="background:#e65100;color:white;border:none;padding:4px 8px;border-radius:4px;cursor:pointer;font-size:11px;" onclick="openMovementModal('${it.id}','out')">− Out</button>
                <button style="background:#1565C0;color:white;border:none;padding:4px 8px;border-radius:4px;cursor:pointer;font-size:11px;" onclick="openItemModal('${it.id}')">Edit</button>
                <button style="background:#c62828;color:white;border:none;padding:4px 8px;border-radius:4px;cursor:pointer;font-size:11px;" onclick="deleteItem('${it.id}')">×</button>
            </td>
        </tr>`;
    }).join('');
    return `<div style="overflow-x:auto;"><table class="data-table"><thead><tr><th>SKU</th><th>Item Name</th><th>Unit</th><th>In Stock</th><th>Min Stock</th><th>Cost Price</th><th>Sale Price</th><th>Location</th><th>Actions</th></tr></thead><tbody>${rows}</tbody></table></div><input id="inv-search" type="text" placeholder="🔍 Search items…" oninput="filterInv(this.value)" style="margin-top:10px;border:1.5px solid #ddd;padding:8px 12px;border-radius:7px;font-size:13px;outline:none;width:260px;">`;
}
function filterInv(q){const t=document.querySelector('#inv-content table tbody');if(!t)return;const rows=db.inventory.filter(it=>(it.name+it.sku+it.category).toLowerCase().includes(q.toLowerCase()));t.innerHTML=rows.map(it=>{const stockColor=(it.currentStock||0)<=(it.minStock||0)&&it.minStock>0?'#c62828':'#2E7D32';return`<tr><td><strong>${it.sku||'—'}</strong></td><td>${it.name}<div style="font-size:11px;color:#888;">${it.category||''}</div></td><td>${it.unit||'pcs'}</td><td style="font-weight:700;color:${stockColor};">${it.currentStock||0}</td><td>${it.minStock||0}</td><td>EGP ${(it.costPrice||0).toLocaleString()}</td><td>EGP ${(it.salePrice||0).toLocaleString()}</td><td>${it.location||'—'}</td><td style="white-space:nowrap;display:flex;gap:4px;"><button style="background:#2E7D32;color:white;border:none;padding:4px 8px;border-radius:4px;cursor:pointer;font-size:11px;" onclick="openMovementModal('${it.id}','in')">+ In</button><button style="background:#e65100;color:white;border:none;padding:4px 8px;border-radius:4px;cursor:pointer;font-size:11px;" onclick="openMovementModal('${it.id}','out')">− Out</button><button style="background:#1565C0;color:white;border:none;padding:4px 8px;border-radius:4px;cursor:pointer;font-size:11px;" onclick="openItemModal('${it.id}')">Edit</button><button style="background:#c62828;color:white;border:none;padding:4px 8px;border-radius:4px;cursor:pointer;font-size:11px;" onclick="deleteItem('${it.id}')">×</button></td></tr>`;}).join('');}
function renderMovementsTable(){
    const mov=db.inventory_movements.slice().reverse();
    if(!mov.length)return`<div style="text-align:center;padding:40px;background:var(--card-bg,white);border-radius:8px;color:#aaa;">No movements recorded yet</div>`;
    return`<div style="overflow-x:auto;"><table class="data-table"><thead><tr><th>Date</th><th>Item</th><th>Type</th><th>Qty</th><th>Reference</th><th>Reason</th><th>Notes</th><th>User</th></tr></thead><tbody>${mov.map(m=>{const typeStyle=m.type==='in'?'background:#e8f5e9;color:#2E7D32;':m.type==='out'?'background:#ffebee;color:#c62828;':'background:#fff8e1;color:#e65100;';return`<tr><td>${m.date||''}</td><td><strong>${m.itemName||'—'}</strong></td><td><span style="${typeStyle}padding:2px 8px;border-radius:4px;font-size:11px;font-weight:700;">${m.type==='in'?'STOCK IN':m.type==='out'?'STOCK OUT':'ADJUSTMENT'}</span></td><td style="font-weight:700;">${m.type==='out'?'-':'+'} ${m.quantity||0}</td><td>${m.reference||'—'}</td><td>${m.reason||'—'}</td><td>${m.notes||'—'}</td><td>${m.user||'—'}</td></tr>`;}).join('')}</tbody></table></div>`;
}
function renderLowStockTable(){
    const items=(db.inventory||[]).filter(i=>(i.currentStock||0)<=(i.minStock||0)&&i.minStock>0).sort((a,b)=>(a.currentStock||0)-(b.currentStock||0));
    if(!items.length)return`<div style="text-align:center;padding:40px;background:var(--card-bg,white);border-radius:8px;color:#2E7D32;font-size:16px;">✅ All items are well stocked!</div>`;
    return`<div style="background:var(--card-bg,white);border-radius:8px;overflow:hidden;"><div style="padding:14px 18px;background:#ffebee;border-bottom:1px solid #ffcdd2;font-weight:700;color:#c62828;">⚠ ${items.length} item(s) below minimum stock level</div><table class="data-table"><thead><tr><th>SKU</th><th>Item</th><th>Current Stock</th><th>Minimum Stock</th><th>Shortage</th><th>Actions</th></tr></thead><tbody>${items.map(it=>`<tr><td>${it.sku||'—'}</td><td><strong>${it.name}</strong><div style="font-size:11px;color:#888;">${it.category||''}</div></td><td style="font-weight:700;color:#c62828;">${it.currentStock||0} ${it.unit||'pcs'}</td><td>${it.minStock} ${it.unit||'pcs'}</td><td style="color:#c62828;font-weight:700;">-${(it.minStock-(it.currentStock||0))}</td><td><button style="background:#2E7D32;color:white;border:none;padding:5px 10px;border-radius:4px;cursor:pointer;font-size:12px;" onclick="openMovementModal('${it.id}','in')">+ Restock</button></td></tr>`).join('')}</tbody></table></div>`;
}

function openItemModal(id){
    const it=id?db.inventory.find(x=>x.id===id):{};
    const cats=(db.inventory||[]).map(i=>i.category).filter((v,i,a)=>v&&a.indexOf(v)===i);
    openModalShell(`<div style="background:white;border-radius:12px;padding:28px;max-width:600px;width:100%;margin:auto;box-shadow:0 20px 60px rgba(0,0,0,.2);">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px;"><h3 style="font-size:17px;color:#1A4325;">${id?'Edit Item':'New Inventory Item'}</h3><button onclick="closeModalShell()" style="background:none;border:none;font-size:22px;cursor:pointer;color:#aaa;">×</button></div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;">
            ${[['it-sku','SKU / Item Code','text',it.sku||''],['it-name','Item Name *','text',it.name||''],['it-category','Category','text',it.category||''],['it-unit','Unit (pcs/kg/m...)','text',it.unit||'pcs'],['it-cost','Cost Price (EGP)','number',it.costPrice||0],['it-sale','Sale Price (EGP)','number',it.salePrice||0],['it-current','Current Stock','number',it.currentStock||0],['it-min','Minimum Stock Level','number',it.minStock||0],['it-location','Storage Location','text',it.location||''],['it-supplier','Supplier','text',it.supplier||'']].map(([fid,lbl,type,val])=>`<div><label style="font-size:11px;color:#666;font-weight:700;text-transform:uppercase;display:block;margin-bottom:4px;">${lbl}</label><input id="${fid}" type="${type}" value="${String(val).replace(/"/g,'&quot;')}" style="width:100%;border:1.5px solid #ddd;padding:8px 10px;border-radius:7px;font-size:14px;outline:none;font-family:inherit;"></div>`).join('')}
            <div style="grid-column:1/-1"><label style="font-size:11px;color:#666;font-weight:700;text-transform:uppercase;display:block;margin-bottom:4px;">Description</label><textarea id="it-desc" style="width:100%;border:1.5px solid #ddd;padding:8px 10px;border-radius:7px;font-size:14px;outline:none;font-family:inherit;resize:vertical;min-height:60px;">${it.description||''}</textarea></div>
        </div>
        <div style="display:flex;gap:10px;justify-content:flex-end;margin-top:20px;">
            <button onclick="closeModalShell()" style="background:white;border:1.5px solid #ddd;padding:10px 20px;border-radius:7px;cursor:pointer;font-size:13px;">Cancel</button>
            <button onclick="saveItem('${id||''}')" style="background:#1A4325;color:white;border:none;padding:10px 24px;border-radius:7px;cursor:pointer;font-size:13px;font-weight:700;">Save Item</button>
        </div>
    </div>`);
}
function saveItem(id){
    const name=document.getElementById('it-name').value.trim();if(!name){alert('Item name required');return;}
    const g=x=>document.getElementById(x)?.value;
    const rec={id:id||Date.now().toString(),sku:g('it-sku'),name,category:g('it-category'),unit:g('it-unit')||'pcs',costPrice:parseFloat(g('it-cost'))||0,salePrice:parseFloat(g('it-sale'))||0,currentStock:parseFloat(g('it-current'))||0,minStock:parseFloat(g('it-min'))||0,location:g('it-location'),supplier:g('it-supplier'),description:g('it-desc'),created:id?(db.inventory.find(x=>x.id===id)?.created||new Date().toLocaleDateString()):new Date().toLocaleDateString()};
    if(!db.inventory)db.inventory=[];
    if(id){const i=db.inventory.findIndex(x=>x.id===id);if(i>=0)db.inventory[i]=rec;}else db.inventory.push(rec);
    saveDB('inventory');closeModalShell();renderInvTab();updateInvTopActions();_refreshView();
}
function deleteItem(id){if(!confirm('Delete this item?'))return;db.inventory=db.inventory.filter(x=>x.id!==id);saveDB('inventory');renderInvTab();_refreshView();}

function openMovementModal(itemId,preType){
    const items=(db.inventory||[]).map(i=>`<option value="${i.id}" ${i.id===itemId?'selected':''}>${i.sku?i.sku+' — ':''} ${i.name} (Stock: ${i.currentStock||0})</option>`).join('');
    openModalShell(`<div style="background:white;border-radius:12px;padding:28px;max-width:500px;width:100%;margin:auto;box-shadow:0 20px 60px rgba(0,0,0,.2);">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px;"><h3 style="font-size:17px;color:#1A4325;">Record Stock Movement</h3><button onclick="closeModalShell()" style="background:none;border:none;font-size:22px;cursor:pointer;color:#aaa;">×</button></div>
        <div style="display:flex;flex-direction:column;gap:14px;">
            <div><label style="font-size:11px;color:#666;font-weight:700;text-transform:uppercase;display:block;margin-bottom:4px;">Item *</label><select id="mov-item" style="width:100%;border:1.5px solid #ddd;padding:9px 10px;border-radius:7px;font-size:14px;outline:none;">${items||'<option>No items — add items first</option>'}</select></div>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;">
                <div><label style="font-size:11px;color:#666;font-weight:700;text-transform:uppercase;display:block;margin-bottom:4px;">Type *</label><select id="mov-type" style="width:100%;border:1.5px solid #ddd;padding:9px 10px;border-radius:7px;font-size:14px;outline:none;"><option value="in" ${preType==='in'?'selected':''}>Stock In (Receive)</option><option value="out" ${preType==='out'?'selected':''}>Stock Out (Issue)</option><option value="adjustment">Adjustment</option></select></div>
                <div><label style="font-size:11px;color:#666;font-weight:700;text-transform:uppercase;display:block;margin-bottom:4px;">Quantity *</label><input id="mov-qty" type="number" min="1" value="1" style="width:100%;border:1.5px solid #ddd;padding:9px 10px;border-radius:7px;font-size:14px;outline:none;"></div>
            </div>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;">
                <div><label style="font-size:11px;color:#666;font-weight:700;text-transform:uppercase;display:block;margin-bottom:4px;">Date</label><input id="mov-date" type="date" value="${new Date().toISOString().slice(0,10)}" style="width:100%;border:1.5px solid #ddd;padding:9px 10px;border-radius:7px;font-size:14px;outline:none;"></div>
                <div><label style="font-size:11px;color:#666;font-weight:700;text-transform:uppercase;display:block;margin-bottom:4px;">Reference No.</label><input id="mov-ref" type="text" placeholder="PO/Invoice no." style="width:100%;border:1.5px solid #ddd;padding:9px 10px;border-radius:7px;font-size:14px;outline:none;"></div>
            </div>
            <div><label style="font-size:11px;color:#666;font-weight:700;text-transform:uppercase;display:block;margin-bottom:4px;">Reason</label><input id="mov-reason" type="text" placeholder="Purchase / Sale / Damage / Return…" style="width:100%;border:1.5px solid #ddd;padding:9px 10px;border-radius:7px;font-size:14px;outline:none;"></div>
            <div><label style="font-size:11px;color:#666;font-weight:700;text-transform:uppercase;display:block;margin-bottom:4px;">Notes</label><input id="mov-notes" type="text" style="width:100%;border:1.5px solid #ddd;padding:9px 10px;border-radius:7px;font-size:14px;outline:none;"></div>
        </div>
        <div style="display:flex;gap:10px;justify-content:flex-end;margin-top:22px;">
            <button onclick="closeModalShell()" style="background:white;border:1.5px solid #ddd;padding:10px 20px;border-radius:7px;cursor:pointer;font-size:13px;">Cancel</button>
            <button onclick="saveMovement()" style="background:#1A4325;color:white;border:none;padding:10px 24px;border-radius:7px;cursor:pointer;font-size:13px;font-weight:700;">Record Movement</button>
        </div>
    </div>`);
}
function saveMovement(){
    const itemId=document.getElementById('mov-item').value;
    const type=document.getElementById('mov-type').value;
    const qty=parseFloat(document.getElementById('mov-qty').value)||0;
    if(!itemId||!qty){alert('Please select an item and enter quantity');return;}
    const item=db.inventory.find(x=>x.id===itemId);
    if(!item){alert('Item not found');return;}
    // Update stock
    if(type==='in')         item.currentStock=(item.currentStock||0)+qty;
    else if(type==='out')   item.currentStock=Math.max(0,(item.currentStock||0)-qty);
    else item.currentStock=qty; // adjustment = set to
    const mov={id:Date.now().toString(),itemId,itemName:item.name,itemSku:item.sku,type,quantity:qty,date:document.getElementById('mov-date').value,reference:document.getElementById('mov-ref').value,reason:document.getElementById('mov-reason').value,notes:document.getElementById('mov-notes').value,user:DbClient.getCurrentUser()?.name||'System',stockAfter:item.currentStock,created:new Date().toISOString()};
    if(!db.inventory_movements)db.inventory_movements=[];
    db.inventory_movements.push(mov);
    saveDB('inventory'); saveDB('inventory_movements');
    closeModalShell(); renderInvTab(); updateInvTopActions(); _refreshView();
}
function exportInvCSV(){const rows=[['SKU','Name','Category','Unit','Current Stock','Min Stock','Cost Price','Sale Price','Location','Supplier'],...(db.inventory||[]).map(i=>[i.sku||'',i.name,i.category||'',i.unit||'pcs',i.currentStock||0,i.minStock||0,i.costPrice||0,i.salePrice||0,i.location||'',i.supplier||''])];const csv=rows.map(r=>r.map(v=>`"${String(v).replace(/"/g,'""')}"`).join(',')).join('\n');const a=document.createElement('a');a.href=URL.createObjectURL(new Blob(['\uFEFF'+csv],{type:'text/csv;charset=utf-8'}));a.download=`optech_inventory_${new Date().toISOString().slice(0,10)}.csv`;a.click();}

// ═══════════════════════════════════════════
// REPORTS
// ═══════════════════════════════════════════
function renderReports(container){
    const months=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    const byMonth=new Array(12).fill(0);
    db.invoices.forEach(inv=>{const p=(inv.date||'').split('-');if(p.length===3)byMonth[parseInt(p[1])-1]+=parseFloat(inv.total)||0;});
    const ts=db.invoices.reduce((s,i)=>s+(parseFloat(i.total)||0),0),tr=db.receipts.reduce((s,r)=>s+(parseFloat(r.amount)||0),0);
    container.innerHTML=`<h1 style="margin-bottom:20px;">Reports & Analytics</h1>
        <div class="stats-grid" style="margin-bottom:22px;">
            <div class="stat-card"><h3>Total Revenue</h3><p>EGP ${ts.toLocaleString()}</p></div>
            <div class="stat-card" style="border-right-color:#1565C0;"><h3>Collected</h3><p>EGP ${tr.toLocaleString()}</p></div>
            <div class="stat-card" style="border-right-color:#c62828;"><h3>Outstanding</h3><p>EGP ${(ts-tr).toLocaleString()}</p></div>
            <div class="stat-card" style="border-right-color:#ffa000;"><h3>Avg Invoice</h3><p>EGP ${db.invoices.length?Math.round(ts/db.invoices.length).toLocaleString():0}</p></div>
        </div>
        <div style="display:grid;grid-template-columns:2fr 1fr;gap:20px;">
            <div style="background:var(--card-bg,white);padding:22px;border-radius:8px;box-shadow:0 2px 10px rgba(0,0,0,.05);"><h3 style="margin-bottom:14px;">Monthly Sales (EGP)</h3><canvas id="salesChart" height="100"></canvas></div>
            <div style="background:var(--card-bg,white);padding:22px;border-radius:8px;box-shadow:0 2px 10px rgba(0,0,0,.05);"><h3 style="margin-bottom:14px;">Document Types</h3><canvas id="typeChart" height="200"></canvas></div>
        </div>
        <div style="background:var(--card-bg,white);padding:22px;border-radius:8px;margin-top:20px;box-shadow:0 2px 10px rgba(0,0,0,.05);">
            <h3 style="margin-bottom:14px;">Top Customers by Revenue</h3>
            <table class="data-table"><thead><tr><th>Customer</th><th>Invoices</th><th>Total Revenue</th></tr></thead>
            <tbody>${getTopCustomers().map(c=>`<tr><td>${c.name}</td><td>${c.count}</td><td>${c.total.toLocaleString()} EGP</td></tr>`).join('')||'<tr><td colspan="3" style="text-align:center;padding:20px;color:#aaa;">No data</td></tr>'}</tbody></table>
        </div>`;
    new Chart(document.getElementById('salesChart'),{type:'bar',data:{labels:months,datasets:[{label:'Sales EGP',data:byMonth,backgroundColor:'#2E7D32',borderRadius:4}]},options:{plugins:{legend:{display:false}},scales:{y:{beginAtZero:true}}}});
    new Chart(document.getElementById('typeChart'),{type:'pie',data:{labels:['Invoices','Receipts','Quotations','Leads'],datasets:[{data:[db.invoices.length||0,db.receipts.length||0,db.quotations.length||0,(db.leads||[]).length||0],backgroundColor:['#1A4325','#4CAF50','#ffa000','#1565C0'],borderWidth:0}]},options:{plugins:{legend:{position:'bottom'}}}});
}
function getTopCustomers(){const m={};db.invoices.forEach(inv=>{if(!inv.client)return;if(!m[inv.client])m[inv.client]={name:inv.client,count:0,total:0};m[inv.client].count++;m[inv.client].total+=parseFloat(inv.total)||0;});return Object.values(m).sort((a,b)=>b.total-a.total).slice(0,10);}

// ═══════════════════════════════════════════
// AUTHORIZATION & USER MANAGEMENT
// ═══════════════════════════════════════════
let pinBuffer='';
async function renderAuth(container){
    container.innerHTML=`<div style="display:flex;align-items:center;gap:10px;margin-bottom:22px;"><h1>🔐 Admin Panel</h1><div id="auth-server-badge"></div></div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:20px;">
      <!-- PIN Panel -->
      <div style="background:var(--card-bg,white);border-radius:10px;padding:28px;box-shadow:0 2px 12px rgba(0,0,0,.07);">
        <div style="text-align:center;margin-bottom:18px;"><div style="font-size:12px;color:#888;text-transform:uppercase;letter-spacing:1px;margin-bottom:6px;">System Access</div>
        <div style="display:inline-flex;align-items:center;gap:6px;background:${authUnlocked?'#e8f5e9':'#ffebee'};color:${authUnlocked?'#2E7D32':'#c62828'};padding:6px 16px;border-radius:20px;font-weight:700;font-size:13px;"><span style="width:8px;height:8px;border-radius:50%;background:${authUnlocked?'#2E7D32':'#c62828'};display:inline-block;"></span>${authUnlocked?'UNLOCKED':'LOCKED'}</div></div>
        <div style="text-align:center;margin-bottom:12px;"><span style="font-size:11px;color:#666;background:#f5f5f5;padding:3px 8px;border-radius:4px;">Default PIN: 1234</span></div>
        <div id="pin-dots" style="display:flex;justify-content:center;gap:14px;margin:18px 0;">${[0,1,2,3].map(i=>`<div id="pin-dot-${i}" style="width:16px;height:16px;border-radius:50%;border:2px solid #ccc;background:white;transition:.15s;"></div>`).join('')}</div>
        <div id="pin-msg" style="text-align:center;font-size:13px;min-height:18px;margin-bottom:12px;"></div>
        <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px;max-width:210px;margin:0 auto;">${[1,2,3,4,5,6,7,8,9,'','0','⌫'].map(d=>`<button onclick="pinPress('${d}')" style="background:${d===''?'transparent':'#f5f5f5'};border:${d===''?'none':'1px solid #e0e0e0'};border-radius:8px;padding:14px;font-size:18px;font-weight:600;cursor:${d===''?'default':'pointer'};color:#333;transition:.15s;" ${d===''?'disabled':''}>${d}</button>`).join('')}</div>
        <div style="display:flex;gap:10px;margin-top:18px;justify-content:center;">
          <button onclick="pinSubmit()" style="background:#1A4325;color:white;border:none;padding:10px 28px;border-radius:6px;cursor:pointer;font-weight:700;font-size:14px;">Unlock</button>
          ${authUnlocked?`<button onclick="pinLock()" style="background:#c62828;color:white;border:none;padding:10px 20px;border-radius:6px;cursor:pointer;font-weight:600;font-size:14px;">Lock</button>`:''}
        </div>
      </div>
      <!-- Data + PIN change -->
      <div style="display:flex;flex-direction:column;gap:16px;">
        <div style="background:var(--card-bg,white);border-radius:10px;padding:24px;box-shadow:0 2px 12px rgba(0,0,0,.07);">
          <h3 style="margin-bottom:14px;font-size:15px;">Data Management</h3>
          <div style="display:flex;flex-direction:column;gap:10px;">
            <button onclick="exportAllData()" style="background:#1A4325;color:white;border:none;padding:12px 16px;border-radius:6px;cursor:pointer;text-align:left;font-size:13px;font-weight:600;">Export All Data (JSON)</button>
            <label><div style="background:#1A4325;color:white;padding:12px 16px;border-radius:6px;cursor:pointer;text-align:left;font-size:13px;font-weight:600;">Import Data (JSON)<input type="file" accept=".json" onchange="importData(event)" style="display:none;"></div></label>
            <button onclick="clearAllData()" style="background:#c62828;color:white;border:none;padding:12px 16px;border-radius:6px;cursor:pointer;text-align:left;font-size:13px;font-weight:600;">Clear All Data</button>
          </div>
        </div>
        ${authUnlocked?`
        <div style="background:var(--card-bg,white);border-radius:10px;padding:24px;box-shadow:0 2px 12px rgba(0,0,0,.07);">
          <h3 style="margin-bottom:14px;font-size:15px;">Change PIN</h3>
          ${pinField('cp-current','Current PIN')}${pinField('cp-new','New PIN (4 digits)')}${pinField('cp-confirm','Confirm New PIN')}
          <button onclick="changePin()" style="background:#1A4325;color:white;border:none;padding:10px 22px;border-radius:6px;cursor:pointer;font-weight:700;font-size:13px;margin-top:8px;">Update PIN</button>
          <div id="cp-msg" style="font-size:12px;margin-top:8px;min-height:16px;"></div>
        </div>`:`<div style="background:var(--card-bg,white);border-radius:10px;padding:24px;box-shadow:0 2px 12px rgba(0,0,0,.07);opacity:.5;"><h3 style="font-size:15px;">Change PIN</h3><p style="font-size:13px;color:#aaa;margin-top:8px;">Unlock to change PIN.</p></div>`}
      </div>
    </div>

    <!-- USER MANAGEMENT -->
    <div style="background:var(--card-bg,white);padding:24px;border-radius:10px;margin-top:20px;box-shadow:0 2px 12px rgba(0,0,0,.07);">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;">
            <h3 style="font-size:15px;">User Management</h3>
            ${authUnlocked?`<button class="btn-primary" onclick="openUserModal()" style="font-size:13px;padding:8px 16px;">+ Add User</button>`:'<span style="font-size:12px;color:#aaa;">Unlock to manage users</span>'}
        </div>
        <div id="users-list-area"><div style="text-align:center;padding:20px;color:#aaa;">Loading users…</div></div>
    </div>

    <!-- DB SUMMARY -->
    <div style="background:var(--card-bg,white);padding:22px;border-radius:10px;margin-top:20px;box-shadow:0 2px 12px rgba(0,0,0,.07);">
      <h3 style="margin-bottom:14px;font-size:15px;">Database Summary <span style="font-size:11px;background:${DbClient.IS_SERVER?'#e8f5e9':'#fff8e1'};color:${DbClient.IS_SERVER?'#2E7D32':'#e65100'};padding:2px 8px;border-radius:10px;margin-left:8px;">${DbClient.IS_SERVER?'Server Mode — db.json (shared)':'Local Mode — localStorage only'}</span></h3>
      <table class="data-table"><thead><tr><th>Collection</th><th>Records</th><th>Storage</th></tr></thead>
      <tbody>${['invoices','receipts','quotations','customers','leads','inventory','inventory_movements','suppliers'].map(k=>`<tr><td>${k.charAt(0).toUpperCase()+k.slice(1).replace('_',' ')}</td><td>${(db[k]||[]).length}</td><td>${(JSON.stringify(db[k]||[]).length/1024).toFixed(2)} KB</td></tr>`).join('')}</tbody></table>
    </div>

    <!-- TODAY'S ACTIVITIES -->
    <div style="background:var(--card-bg,white);padding:22px;border-radius:10px;margin-top:20px;box-shadow:0 2px 12px rgba(0,0,0,.07);">
      <h3 style="margin-bottom:14px;font-size:15px;">📅 Today's Activities</h3>
      <div id="today-activities" style="max-height:300px;overflow-y:auto;">
        <div style="text-align:center;padding:20px;color:#aaa;font-size:13px;">Loading today's activities...</div>
      </div>
    </div>`;

    // Show server badge
    const badge = document.getElementById('auth-server-badge');
    if(badge) badge.innerHTML = DbClient.IS_SERVER ? '<span style="background:#e8f5e9;color:#2E7D32;padding:4px 12px;border-radius:12px;font-size:12px;font-weight:600;">🟢 Server Connected</span>' : '<span style="background:#fff8e1;color:#e65100;padding:4px 12px;border-radius:12px;font-size:12px;font-weight:600;">🟡 Local Mode</span>';

    // Load users
    loadUsersTable();
    // Load today's activities
    loadTodayActivities();
}

function loadTodayActivities(){
    const el=document.getElementById('today-activities');if(!el)return;
    
    const today = new Date().toISOString().slice(0,10);
    const activities = db.activities || [];
    const todayActivities = activities.filter(a => a.date && a.date.startsWith(today));
    
    if(todayActivities.length === 0){
        el.innerHTML = '<div style="text-align:center;padding:20px;color:#aaa;font-size:13px;">No activities recorded for today.</div>';
        return;
    }
    
    const activityIcons = {
        invoice: '📄',
        receipt: '💰', 
        quotation: '📜',
        customer: '👥',
        supplier: '🏭',
        inventory: '📦',
        user: '👤',
        login: '🔐'
    };
    
    el.innerHTML = `
        <div style="display:flex;flex-direction:column;gap:8px;">
            ${todayActivities.map(activity => `
                <div style="display:flex;align-items:center;gap:10px;padding:10px;background:#f8f9fa;border-radius:6px;border-left:3px solid #1A4325;">
                    <div style="font-size:18px;flex-shrink:0;">${activityIcons[activity.type] || '📋'}</div>
                    <div style="flex:1;">
                        <div style="font-weight:600;font-size:13px;color:#333;">${activity.description || 'No description'}</div>
                        <div style="font-size:11px;color:#666;">${activity.time || activity.date || ''}</div>
                    </div>
                    <div style="font-size:11px;color:#888;background:#e9ecef;padding:2px 6px;border-radius:3px;text-transform:uppercase;">${activity.type || 'general'}</div>
                </div>
            `).join('')}
        </div>
    `;
}

async function loadUsersTable(){
    const el=document.getElementById('users-list-area');if(!el)return;
    if(!DbClient.IS_SERVER){el.innerHTML='<p style="color:#aaa;font-size:13px;text-align:center;padding:20px;">User management requires server mode (node server.js)</p>';return;}
    const users=await DbClient.getUsers();
    if(!users.length){el.innerHTML='<p style="color:#aaa;font-size:13px;text-align:center;padding:20px;">No users found.</p>';return;}
    const roleColor={admin:'#1A4325',manager:'#1565C0',user:'#888'};
    el.innerHTML=`<table class="data-table"><thead><tr><th>#</th><th>Name</th><th>Username</th><th>Role</th><th>Status</th><th>Last Login</th><th>Created</th>${authUnlocked?'<th>Actions</th>':''}</tr></thead><tbody>
        ${users.map((u,i)=>`<tr>
            <td>${i+1}</td>
            <td><strong>${u.name||u.username}</strong></td>
            <td style="font-family:monospace;font-size:12px;">${u.username}</td>
            <td><span style="background:${roleColor[u.role]||'#888'}22;color:${roleColor[u.role]||'#888'};padding:2px 10px;border-radius:10px;font-size:11px;font-weight:700;text-transform:uppercase;">${u.role||'user'}</span></td>
            <td><span style="color:${u.active!==false?'#2E7D32':'#c62828'};font-weight:600;">${u.active!==false?'Active':'Disabled'}</span></td>
            <td style="font-size:12px;color:#888;">${u.lastLogin||'Never'}</td>
            <td style="font-size:12px;color:#888;">${u.created||'—'}</td>
            ${authUnlocked?`<td style="white-space:nowrap;display:flex;gap:5px;"><button style="background:#1565C0;color:white;border:none;padding:4px 10px;border-radius:4px;cursor:pointer;font-size:11px;" onclick="openUserModal('${u.id}','${u.username}','${u.name||''}','${u.role||'user'}','${u.active!==false}')">Edit</button>${u.id!=='1'?`<button style="background:#c62828;color:white;border:none;padding:4px 8px;border-radius:4px;cursor:pointer;font-size:11px;" onclick="doDeleteUser('${u.id}')">Del</button>`:''}</td>`:''}</tr>`).join('')}
    </tbody></table>`;
}

function openUserModal(id,username,name,role,active){
    openModalShell(`<div style="background:white;border-radius:12px;padding:28px;max-width:460px;width:100%;margin:auto;box-shadow:0 20px 60px rgba(0,0,0,.2);">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px;"><h3 style="font-size:17px;color:#1A4325;">${id?'Edit User':'New User'}</h3><button onclick="closeModalShell()" style="background:none;border:none;font-size:22px;cursor:pointer;color:#aaa;">×</button></div>
        <div style="display:flex;flex-direction:column;gap:14px;">
            <div><label style="font-size:11px;color:#666;font-weight:700;text-transform:uppercase;display:block;margin-bottom:4px;">Full Name</label><input id="u-name" type="text" value="${name||''}" style="width:100%;border:1.5px solid #ddd;padding:9px 10px;border-radius:7px;font-size:14px;outline:none;"></div>
            <div><label style="font-size:11px;color:#666;font-weight:700;text-transform:uppercase;display:block;margin-bottom:4px;">Username *</label><input id="u-username" type="text" value="${username||''}" ${id==='1'?'readonly style="background:#f5f5f5;"':''} style="width:100%;border:1.5px solid #ddd;padding:9px 10px;border-radius:7px;font-size:14px;outline:none;"></div>
            <div><label style="font-size:11px;color:#666;font-weight:700;text-transform:uppercase;display:block;margin-bottom:4px;">${id?'New Password (leave blank to keep)':'Password *'}</label><div style="position:relative;"><input id="u-password" type="password" placeholder="${id?'••••••• (unchanged)':'Enter password'}" style="width:100%;border:1.5px solid #ddd;padding:9px 38px 9px 10px;border-radius:7px;font-size:14px;outline:none;"><button type="button" onclick="const el=document.getElementById('u-password');el.type=el.type==='password'?'text':'password'" style="position:absolute;right:10px;top:50%;transform:translateY(-50%);background:none;border:none;cursor:pointer;color:#aaa;font-size:15px;">👁</button></div></div>
            <div><label style="font-size:11px;color:#666;font-weight:700;text-transform:uppercase;display:block;margin-bottom:4px;">Role</label><select id="u-role" style="width:100%;border:1.5px solid #ddd;padding:9px 10px;border-radius:7px;font-size:14px;outline:none;"><option value="admin" ${role==='admin'?'selected':''}>Admin (full access)</option><option value="manager" ${role==='manager'?'selected':''}>Manager</option><option value="user" ${(!role||role==='user')?'selected':''}>User (read/create)</option></select></div>
            ${id?`<div><label style="font-size:11px;color:#666;font-weight:700;text-transform:uppercase;display:block;margin-bottom:4px;">Status</label><select id="u-active" style="width:100%;border:1.5px solid #ddd;padding:9px 10px;border-radius:7px;font-size:14px;outline:none;"><option value="true" ${active!=='false'?'selected':''}>Active</option><option value="false" ${active==='false'?'selected':''}>Disabled</option></select></div>`:''}
        </div>
        <div style="display:flex;gap:10px;justify-content:flex-end;margin-top:20px;">
            <button onclick="closeModalShell()" style="background:white;border:1.5px solid #ddd;padding:10px 20px;border-radius:7px;cursor:pointer;font-size:13px;">Cancel</button>
            <button onclick="saveUser('${id||''}')" style="background:#1A4325;color:white;border:none;padding:10px 24px;border-radius:7px;cursor:pointer;font-size:13px;font-weight:700;">${id?'Update':'Create User'}</button>
        </div>
    </div>`);
}
async function saveUser(id){
    const uname=document.getElementById('u-username').value.trim();
    if(!uname){alert('Username required');return;}
    const pwd=document.getElementById('u-password').value;
    if(!id&&!pwd){alert('Password required for new user');return;}
    const payload={username:uname,name:document.getElementById('u-name').value,role:document.getElementById('u-role').value};
    if(pwd) payload.password=pwd;
    if(id&&document.getElementById('u-active')) payload.active=document.getElementById('u-active').value==='true';
    const result=id?await DbClient.updateUser(id,payload):await DbClient.createUser(payload);
    if(result.ok){
        logActivity('user', id ? `Updated user: ${uname}` : `Created new user: ${uname}`);
        closeModalShell();loadUsersTable();
    }else{alert('Error: '+(result.error||'Unknown'));}
}
async function doDeleteUser(id){
    if(!confirm('Delete this user? This cannot be undone.'))return;
    const r=await DbClient.deleteUser(id);
    if(r.ok){
        logActivity('user', `Deleted user with ID: ${id}`);
        loadUsersTable();
    }else alert('Error: '+(r.error||'Unknown'));
}

function pinField(id,lbl){return `<div style="margin-bottom:10px;"><label style="font-size:12px;color:#888;display:block;margin-bottom:4px;">${lbl}</label><div style="position:relative;"><input id="${id}" type="password" maxlength="4" inputmode="numeric" style="width:100%;border:1.5px solid #ddd;border-radius:6px;padding:9px 38px 9px 12px;font-size:18px;letter-spacing:8px;outline:none;font-family:inherit;"><button type="button" onmousedown="togglePinVis('${id}')" onmouseup="togglePinVis('${id}')" style="position:absolute;right:8px;top:50%;transform:translateY(-50%);background:none;border:none;cursor:pointer;font-size:16px;color:#aaa;">👁</button></div></div>`;}
function togglePinVis(id){const el=document.getElementById(id);if(el)el.type=el.type==='password'?'text':'password';}
function pinPress(d){if(d==='⌫')pinBuffer=pinBuffer.slice(0,-1);else if(d!==''&&pinBuffer.length<4)pinBuffer+=String(d);updatePinDots();}
function updatePinDots(){for(let i=0;i<4;i++){const dot=document.getElementById('pin-dot-'+i);if(dot){dot.style.background=i<pinBuffer.length?'#1A4325':'white';dot.style.borderColor=i<pinBuffer.length?'#1A4325':'#ccc';}}if(pinBuffer.length===4)setTimeout(pinSubmit,120);}
function pinSubmit(){const msg=document.getElementById('pin-msg');if(pinBuffer===getPin()){authUnlocked=true;if(msg){msg.style.color='#2E7D32';msg.textContent='Access granted.';}pinBuffer='';setTimeout(()=>renderAuth(document.getElementById('view-container')),600);}else{if(msg){msg.style.color='#c62828';msg.textContent='Incorrect PIN. Try again.';}pinBuffer='';updatePinDots();const dots=document.querySelectorAll('[id^=pin-dot-]');dots.forEach(d=>{d.style.background='#c62828';d.style.borderColor='#c62828';});setTimeout(()=>{dots.forEach(d=>{d.style.background='white';d.style.borderColor='#ccc';});},600);}}
function pinLock(){authUnlocked=false;pinBuffer='';renderAuth(document.getElementById('view-container'));}
function changePin(){const cur=document.getElementById('cp-current').value,nw=document.getElementById('cp-new').value,conf=document.getElementById('cp-confirm').value,msg=document.getElementById('cp-msg');if(cur!==getPin()){msg.style.color='#c62828';msg.textContent='Current PIN is incorrect.';return;}if(!/^\d{4}$/.test(nw)){msg.style.color='#c62828';msg.textContent='New PIN must be exactly 4 digits.';return;}if(nw!==conf){msg.style.color='#c62828';msg.textContent='PIN confirmation does not match.';return;}setPin(nw);msg.style.color='#2E7D32';msg.textContent='PIN changed successfully.';document.getElementById('cp-current').value='';document.getElementById('cp-new').value='';document.getElementById('cp-confirm').value='';}
function exportAllData(){const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([JSON.stringify(db,null,2)],{type:'application/json'}));a.download=`optech_backup_${new Date().toISOString().slice(0,10)}.json`;a.click();}
function importData(e){const f=e.target.files[0];if(!f)return;const r=new FileReader();r.onload=ev=>{try{const d=JSON.parse(ev.target.result);['invoices','receipts','quotations','customers','leads','inventory','inventory_movements','suppliers'].forEach(k=>{if(d[k]){db[k]=d[k];saveDB(k);}});alert('Imported successfully!');showSection('auth');}catch{alert('Invalid JSON file.');}};r.readAsText(f);}
function clearAllData(){if(!confirm('Delete ALL data permanently?'))return;if(!confirm('Final warning — this cannot be undone.'))return;['invoices','receipts','quotations','customers','leads','inventory','inventory_movements','suppliers'].forEach(k=>{db[k]=[];localStorage.removeItem('optech_'+k);DbClient.saveCollection(k,[]);});showSection('dashboard');}

// ═══════════════════════════════════════════
// SHARED UTILS
// ═══════════════════════════════════════════
function deleteRecord(collection,id){
    console.log('deleteRecord called with collection:', collection, 'id:', id);
    if(!confirm('Delete this record?'))return;
    
    try {
        db[collection]=db[collection].filter(r=>r.id!==id);
        saveDB(collection);
        logActivity('delete', `Deleted record from ${collection}`);
        _refreshView();
        console.log('Record deleted successfully');
    } catch (error) {
        console.error('Error deleting record:', error);
        alert('Error deleting record: ' + error.message);
    }
}
function exportData(){exportAllData();}

function logActivity(type, description){
    const now = new Date();
    const activity = {
        id: Date.now().toString(),
        type: type,
        description: description,
        date: now.toISOString().slice(0,10),
        time: now.toTimeString().slice(0,5),
        user: DbClient.getCurrentUser()?.username || 'unknown'
    };
    
    if(!db.activities) db.activities = [];
    db.activities.unshift(activity); // Add to beginning
    
    // Keep only last 100 activities to prevent bloat
    if(db.activities.length > 100) {
        db.activities = db.activities.slice(0, 100);
    }
    
    saveDB('activities');
}

// ═══════════════════════════════════════════
// BOOT
// ═══════════════════════════════════════════
window.onload = async () => {
    applyDarkMode();
    await initDB();
    showSection('dashboard');
};
