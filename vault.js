/* THE VAULT v3 — Full featured personal finance app */

var KEYS={transactions:"vault_transactions",budgets:"vault_budgets",pots:"vault_pots",bills:"vault_bills",assets:"vault_assets",accounts:"vault_accounts",billPaid:"vault_bill_paid"};
var DEFAULT_CATS=["Housing","Food & Drink","Transport","Entertainment","Health","Shopping","Utilities","Work","Education","Takeout/Delivery","Groceries","Gas","Other"];
var PIE_COLORS=["#00ffc8","#ff5555","#9d7fff","#ffb703","#3ddc84","#00aaff","#ff7700","#ff55aa","#55ffee","#aaff55","#ff9955","#aa55ff"];
var AUTO_CATS=[
  [/walmart|kroger|meijer|aldi|whole foods|trader joe|safeway|publix|food lion|heb |winn.dixie|sprouts|market|grocery|deli/i,"Groceries"],
  [/mcdonald|burger king|wendy|taco bell|chick.fil|popeye|pizza|domino|papa john|subway|chipotle|panera|sonic|kfc|five guys|doordash|grubhub|ubereats|delivery/i,"Takeout/Delivery"],
  [/shell|bp |exxon|chevron|mobil|speedway|marathon|circle k|wawa|kwik|casey|sunoco|valero|gas|fuel/i,"Gas"],
  [/netflix|hulu|spotify|disney|hbo|amazon prime|youtube|apple tv|peacock|paramount|entertainment|cinema|theater|movie/i,"Entertainment"],
  [/amazon|target|ebay|etsy|best buy|home depot|lowes|ikea|costco|sams club|tj maxx|marshalls|ross |shopping/i,"Shopping"],
  [/electric|water bill|internet|att |verizon|t-mobile|comcast|spectrum|xfinity|utility/i,"Utilities"],
  [/rent|mortgage|hoa|apartment/i,"Housing"],
  [/uber|lyft|transit|bus |train |metro|parking|toll|auto loan|car payment/i,"Transport"],
  [/doctor|hospital|pharmacy|cvs|walgreen|rite aid|dental|vision|health|medical|clinic/i,"Health"],
  [/payroll|salary|direct deposit|ach deposit/i,"Work"],
  [/transfer|xfer/i,"Transfer"]
];
function autoCategory(desc){if(!desc)return"";for(var i=0;i<AUTO_CATS.length;i++){if(AUTO_CATS[i][0].test(desc))return AUTO_CATS[i][1];}return"";}

/* State */
var transactions=load(KEYS.transactions,[]);
var budgets=load(KEYS.budgets,[]);
var pots=load(KEYS.pots,[]);
var bills=load(KEYS.bills,[]);
var assets=load(KEYS.assets,[]);
var accounts=load(KEYS.accounts,[]);
var billPaid=load(KEYS.billPaid,{});

var viewMode="month",activeView="overview",editingId=null,activeAcct="all";
var txPage=1,TX_PER_PAGE=10;
var now=new Date(),viewYear=now.getFullYear(),viewMonth=now.getMonth();
var potFundMode="add",potFundId=null;

function load(k,fb){try{return JSON.parse(localStorage.getItem(k))||fb;}catch(e){return fb;}}
function save(k,d){localStorage.setItem(k,JSON.stringify(d));}
function uid(){return Date.now().toString(36)+Math.random().toString(36).slice(2,6);}
var MONTHS=["January","February","March","April","May","June","July","August","September","October","November","December"];
var MONTHS_SHORT=["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
function fmt(n){var neg=n<0;return(neg?"-$":"$")+Math.abs(n).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g,",");}
function fmtDate(s){if(!s)return"";var d=new Date(s+"T00:00:00");return MONTHS_SHORT[d.getMonth()]+" "+d.getDate()+", "+d.getFullYear();}
function todayStr(){var d=new Date();return d.getFullYear()+"-"+pad(d.getMonth()+1)+"-"+pad(d.getDate());}
function pad(n){return n<10?"0"+n:""+n;}
function esc(s){return(s||"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");}
function capitalize(s){return s?s.charAt(0).toUpperCase()+s.slice(1):"";}
function getAccount(id){return accounts.find(function(a){return a.id===id;});}
function acctName(id){var a=getAccount(id);return a?a.name:"Unassigned";}
function acctColor(id){var a=getAccount(id);return a?a.color:"#888";}

function filteredTx(){
  var list=transactions;
  if(activeAcct!=="all")list=list.filter(function(t){return t.accountId===activeAcct;});
  if(viewMode==="month")list=list.filter(function(t){var d=new Date(t.date+"T00:00:00");return d.getFullYear()===viewYear&&d.getMonth()===viewMonth;});
  return list;
}
function getTotals(txList){
  var inc=0,exp=0;
  txList.forEach(function(t){if(t.type==="income")inc+=parseFloat(t.amount)||0;if(t.type==="expense")exp+=parseFloat(t.amount)||0;});
  return{income:inc,expense:exp,net:inc-exp};
}
function catSpend(catName){return filteredTx().filter(function(t){return t.type==="expense"&&t.category===catName;}).reduce(function(s,t){return s+(parseFloat(t.amount)||0);},0);}

/* Navigation */
document.querySelectorAll(".nav-item").forEach(function(b){b.addEventListener("click",function(){switchView(this.dataset.view);closeSidebar();});});
document.querySelectorAll("[data-goto]").forEach(function(b){b.addEventListener("click",function(){switchView(this.dataset.goto);});});
document.getElementById("menuToggle").addEventListener("click",function(){
  toggleSidebar();
});
document.getElementById("sidebarOverlay").addEventListener("click",function(){
  closeSidebar();
});
function toggleSidebar(){
  var sb=document.getElementById("sidebar");
  var open=sb.classList.toggle("open");
  document.getElementById("sidebarOverlay").classList.toggle("active",open);
  document.getElementById("menuToggle").setAttribute("aria-expanded",open?"true":"false");
  document.getElementById("menuToggle").textContent=open?"✕":"☰";
}
function closeSidebar(){
  document.getElementById("sidebar").classList.remove("open");
  document.getElementById("sidebarOverlay").classList.remove("active");
  document.getElementById("menuToggle").setAttribute("aria-expanded","false");
  document.getElementById("menuToggle").textContent="☰";
}

function switchView(name){
  activeView=name;txPage=1;
  document.querySelectorAll(".nav-item").forEach(function(b){b.classList.toggle("active",b.dataset.view===name);b.setAttribute("aria-current",b.dataset.view===name?"page":"false");});
  document.querySelectorAll(".view").forEach(function(v){v.classList.toggle("active",v.id==="view-"+name);});
  var titles={overview:"Overview",transactions:"Transactions",accounts:"Accounts",budgets:"Budgets",pots:"Saving Pots",bills:"Bills & Recurring"};
  document.getElementById("topbarTitle").textContent=titles[name]||name;
  renderView(name);
  // Move focus to main content area
  var firstFocusable=document.querySelector("#view-"+name+" button, #view-"+name+" input, #view-"+name+" select, #view-"+name+" a[href]");
  if(firstFocusable)setTimeout(function(){firstFocusable.focus();},100);
}

/* Month controls */
function updateMonthLabel(){document.getElementById("monthLabel").textContent=MONTHS[viewMonth]+" "+viewYear;}
document.getElementById("prevMonth").addEventListener("click",function(){viewMonth--;if(viewMonth<0){viewMonth=11;viewYear--;}updateMonthLabel();txPage=1;renderActive();});
document.getElementById("nextMonth").addEventListener("click",function(){viewMonth++;if(viewMonth>11){viewMonth=0;viewYear++;}updateMonthLabel();txPage=1;renderActive();});
document.getElementById("filterMonth").addEventListener("click",function(){
  viewMode="month";txPage=1;
  this.classList.add("active");this.setAttribute("aria-pressed","true");
  document.getElementById("filterAll").classList.remove("active");document.getElementById("filterAll").setAttribute("aria-pressed","false");
  document.getElementById("prevMonth").style.visibility="";document.getElementById("nextMonth").style.visibility="";document.getElementById("monthLabel").style.visibility="";
  renderActive();
});
document.getElementById("filterAll").addEventListener("click",function(){
  viewMode="all";txPage=1;
  this.classList.add("active");this.setAttribute("aria-pressed","true");
  document.getElementById("filterMonth").classList.remove("active");document.getElementById("filterMonth").setAttribute("aria-pressed","false");
  document.getElementById("prevMonth").style.visibility="hidden";document.getElementById("nextMonth").style.visibility="hidden";document.getElementById("monthLabel").style.visibility="hidden";
  renderActive();
});

/* Account filter */
function populateAcctFilter(){
  var sel=document.getElementById("acctFilter"),cur=sel.value;
  sel.innerHTML='<option value="all">All Accounts</option>'+accounts.map(function(a){return'<option value="'+a.id+'">'+esc(a.name)+'</option>';}).join("");
  sel.value=cur;
}
document.getElementById("acctFilter").addEventListener("change",function(){activeAcct=this.value;txPage=1;renderActive();});
function renderActive(){renderView(activeView);}

/* Keyboard trap for modals */
function trapFocus(modal){
  var focusable=modal.querySelectorAll('button,input,select,textarea,a[href],[tabindex]:not([tabindex="-1"])');
  var first=focusable[0],last=focusable[focusable.length-1];
  modal.addEventListener("keydown",function(e){
    if(e.key==="Tab"){
      if(e.shiftKey){if(document.activeElement===first){e.preventDefault();last.focus();}}
      else{if(document.activeElement===last){e.preventDefault();first.focus();}}
    }
    if(e.key==="Escape"){modal.classList.add("hidden");document.getElementById("addTxBtn")&&document.getElementById("addTxBtn").focus();}
  });
}

/* CSV Export */
document.getElementById("exportBtn").addEventListener("click",function(){
  var rows=[["Date","Description","Type","Category","Account","Amount","Notes"]];
  (viewMode==="all"?transactions:filteredTx()).forEach(function(t){
    rows.push([t.date,'"'+(t.description||"").replace(/"/g,'""')+'"',t.type,t.category||"",acctName(t.accountId),t.amount,'"'+(t.notes||"")+'"']);
  });
  var a=document.createElement("a");a.href="data:text/csv;charset=utf-8,"+encodeURIComponent(rows.map(function(r){return r.join(",");}).join("\n"));a.download="vault-export.csv";a.click();
});

/* CSV Template */
document.getElementById("templateBtn").addEventListener("click",function(){
  var csv=["date,description,type,category,amount,notes","2026-03-01,Salary,income,Work,3000.00,Monthly salary","2026-03-02,Rent,expense,Housing,1200.00,","2026-03-03,Walmart,expense,Groceries,85.50,","2026-03-04,Netflix,expense,Entertainment,15.99,","2026-03-05,Transfer to Savings,transfer,,200.00,"].join("\n");
  var a=document.createElement("a");a.href="data:text/csv;charset=utf-8,"+encodeURIComponent(csv);a.download="vault-template.csv";a.click();
});

/* Import: account picker */
function pickAccount(){
  return new Promise(function(resolve){
    var sel=document.getElementById("importAcctSel");
    sel.innerHTML=accounts.map(function(a){return'<option value="'+a.id+'">'+esc(a.name)+'</option>';}).join("");
    if(accounts.length===0){resolve("");return;}
    var modal=document.getElementById("importAcctModal");
    modal.classList.remove("hidden");trapFocus(modal);
    sel.focus();
    document.getElementById("importAcctConfirm").onclick=function(){modal.classList.add("hidden");resolve(sel.value);};
  });
}

function switchToTransactions(){
  viewMode="all";
  document.getElementById("filterAll").classList.add("active");document.getElementById("filterAll").setAttribute("aria-pressed","true");
  document.getElementById("filterMonth").classList.remove("active");document.getElementById("filterMonth").setAttribute("aria-pressed","false");
  document.getElementById("prevMonth").style.visibility="hidden";document.getElementById("nextMonth").style.visibility="hidden";document.getElementById("monthLabel").style.visibility="hidden";
  txPage=1;switchView("transactions");
}

/* CSV Import */
document.getElementById("csvImportBtn").addEventListener("click",function(){document.getElementById("importFile").click();});
document.getElementById("importFile").addEventListener("change",function(e){
  var file=e.target.files[0];if(!file)return;
  var reader=new FileReader();
  reader.onload=function(ev){
    pickAccount().then(function(acctId){
      var allLines=ev.target.result.split(/\r?\n/);
      var headerIdx=-1;
      for(var h=0;h<Math.min(allLines.length,20);h++){var lo=allLines[h].toLowerCase();if(lo.indexOf("date")>=0&&lo.indexOf("amount")>=0){headerIdx=h;break;}}
      if(headerIdx<0){for(var h=0;h<allLines.length;h++){if(allLines[h].trim()){headerIdx=h;break;}}}
      var lines=allLines.slice(headerIdx).filter(function(l){return l.trim();});
      if(lines.length<2){alert("Could not find transaction data.");return;}
      var header=parseCSVLine(lines[0]).map(function(h){return h.toLowerCase().replace(/"/g,"").trim();});
      var colDate=findCol(header,["date","trans date","transaction date","posted date"]);
      var colDesc=findCol(header,["description","memo","narrative","payee","details","transaction"]);
      var colType=findCol(header,["type","transaction type"]);
      var colCat=findCol(header,["category","cat"]);
      var colAmt=findCol(header,["amount","transaction amount"]);
      var colDeb=findCol(header,["debit","withdrawal","dr"]);
      var colCrd=findCol(header,["credit","deposit","cr"]);
      var colNote=findCol(header,["notes","note","comment"]);
      if(colDate<0)colDate=0;if(colDesc<0)colDesc=1;
      var imported=0,skipped=0;
      for(var i=1;i<lines.length;i++){
        var cols=parseCSVLine(lines[i]);if(!cols||cols.length<2)continue;
        var dateStr=normalizeDate((cols[colDate]||"").trim());if(!dateStr)continue;
        var rawDesc=colDesc>=0?(cols[colDesc]||"").trim():"";
        if(/beginning balance|ending balance|total credit|total debit|opening balance/i.test(rawDesc))continue;
        var desc=rawDesc||"Transaction";
        var amount,type;
        if(colAmt>=0){
          var raw=(cols[colAmt]||"").replace(/[$, "]/g,"");amount=parseFloat(raw);
          if(isNaN(amount)||amount===0){skipped++;continue;}
          if(amount<0){type=/transfer|xfer/i.test(desc)?"transfer":"expense";amount=Math.abs(amount);}
          else{type=/transfer|xfer/i.test(desc)?"transfer":guessIncomeExpense(desc);}
        }else if(colDeb>=0||colCrd>=0){
          var deb=parseFloat((cols[colDeb]||"").replace(/[$, "]/g,""))||0;
          var crd=parseFloat((cols[colCrd]||"").replace(/[$, "]/g,""))||0;
          if(deb>0){amount=deb;type="expense";}else if(crd>0){amount=crd;type="income";}else{skipped++;continue;}
        }else{skipped++;continue;}
        if(colType>=0){var rt=(cols[colType]||"").toLowerCase().trim();if(rt==="income"||rt==="credit"||rt==="deposit")type="income";else if(rt==="expense"||rt==="debit"||rt==="purchase")type="expense";else if(rt==="transfer")type="transfer";}
        var cat=colCat>=0?(cols[colCat]||"").trim():"";if(!cat)cat=autoCategory(desc);
        var note=colNote>=0?(cols[colNote]||"").trim():"";
        var isDup=transactions.some(function(t){return t.date===dateStr&&t.description===desc&&parseFloat(t.amount)===amount&&t.accountId===acctId;});
        if(isDup){skipped++;continue;}
        transactions.unshift({id:uid(),type:type,description:desc,amount:amount,date:dateStr,category:cat,notes:note,accountId:acctId});
        imported++;
      }
      save(KEYS.transactions,transactions);switchToTransactions();
      alert("Import complete!\n"+imported+" imported, "+skipped+" skipped.");
    });
  };
  reader.readAsText(file);e.target.value="";
});

/* PDF Import */
var pdfParsedRows=[];
document.getElementById("pdfImportBtn").addEventListener("click",function(){document.getElementById("importPdfFile").click();});
document.getElementById("importPdfFile").addEventListener("change",function(e){
  var file=e.target.files[0];if(!file)return;
  pickAccount().then(function(acctId){
    var modal=document.getElementById("pdfModal");
    modal.classList.remove("hidden");trapFocus(modal);
    document.getElementById("pdfStatus").textContent="Reading PDF…";document.getElementById("pdfStatus").className="pdf-status loading";
    document.getElementById("pdfPreview").innerHTML="";document.getElementById("pdfSelectRow").style.display="none";document.getElementById("pdfFooter").style.display="none";document.getElementById("pdfTip").textContent="";pdfParsedRows=[];
    var reader=new FileReader();
    reader.onload=function(ev){
      var arr=new Uint8Array(ev.target.result);
      if(typeof pdfjsLib==="undefined"){showPdfError("PDF.js failed to load.");return;}
      pdfjsLib.getDocument({data:arr}).promise.then(function(pdf){
        var pp=[];for(var p=1;p<=pdf.numPages;p++){pp.push(pdf.getPage(p).then(function(pg){return pg.getTextContent().then(function(tc){return tc.items.map(function(i){return i.str;}).join(" ");});}));}
        Promise.all(pp).then(function(pages){parsePdfText(pages.join("\n"),acctId);});
      }).catch(function(err){showPdfError("Could not read PDF: "+err.message);});
    };
    reader.readAsArrayBuffer(file);
  });
  e.target.value="";
});
function parsePdfText(text,acctId){
  var rows=[];var lines=text.split(/[\n\r]/).map(function(l){return l.trim();}).filter(function(l){return l.length>3;});
  var skip=/^(page|account|statement|balance date|description|amount|total|opening|closing|beginning|ending|available|transaction history)/i;
  var dps=[/\d{4}-\d{2}-\d{2}/,/\d{1,2}\/\d{1,2}\/\d{2,4}/,/\d{1,2}-\d{1,2}-\d{4}/,/(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\.?\s+\d{1,2},?\s+\d{4}/i];
  lines.forEach(function(line){
    if(line.length<8||skip.test(line))return;
    var dateStr=null,dateRaw=null;
    for(var i=0;i<dps.length;i++){var m=line.match(dps[i]);if(m){dateRaw=m[0];dateStr=normalizeDate(m[0]);break;}}
    if(!dateStr)return;
    var amts=line.match(/[-+]?\$?\s*[0-9,]+\.[0-9]{2}/g);if(!amts)return;
    var raw=amts[amts.length-1].replace(/[$,\s]/g,""),amount=parseFloat(raw);if(isNaN(amount)||amount===0)return;
    var desc=line.replace(dateRaw,"").replace(amts[amts.length-1],"").replace(/\s+/g," ").trim();
    if(!desc||desc.length<2)desc="Transaction";if(desc.length>60)desc=desc.substring(0,60);
    var isExp=amount<0||/debit|purchase|payment|pos |withdrawal|fee|charge/i.test(line);
    var cat=autoCategory(desc);
    rows.push({date:dateStr,description:desc,type:isExp?"expense":"income",amount:Math.abs(amount),category:cat,accountId:acctId,raw:line});
  });
  pdfParsedRows=rows;
  if(rows.length===0){showPdfError("No transactions detected. PDF may be image-based. Try CSV download from your bank.");document.getElementById("pdfTip").textContent="Tip: Most banks offer CSV export under Account Activity or Statements.";return;}
  document.getElementById("pdfStatus").textContent=rows.length+" transactions found. Review before importing:";document.getElementById("pdfStatus").className="pdf-status success";
  document.getElementById("pdfFoundCount").textContent=rows.length+" rows";document.getElementById("pdfSelectRow").style.display="flex";document.getElementById("pdfFooter").style.display="flex";
  document.getElementById("pdfPreview").innerHTML=rows.map(function(r,i){
    var color=r.type==="income"?"var(--green)":"var(--red)";var sign=r.type==="income"?"+":"-";
    return'<div class="pdf-tx-row" role="listitem">'+
      '<input type="checkbox" class="pdf-chk" data-i="'+i+'" checked aria-label="Include '+esc(r.description)+'"/>'+
      '<span class="pdf-tx-date">'+r.date+'</span>'+
      '<span class="pdf-tx-desc" title="'+esc(r.raw)+'">'+esc(r.description)+'</span>'+
      '<span class="pdf-tx-type"><select class="pdf-type-sel" data-i="'+i+'" aria-label="Transaction type">'+
        '<option value="expense"'+(r.type==="expense"?" selected":"")+'>Expense</option>'+
        '<option value="income"'+(r.type==="income"?" selected":"")+'>Income</option>'+
        '<option value="transfer"'+(r.type==="transfer"?" selected":"")+'>Transfer</option>'+
      '</select></span>'+
      '<span class="pdf-tx-amt" style="color:'+color+'">'+sign+'$'+r.amount.toFixed(2)+'</span>'+
    '</div>';
  }).join("");
  document.getElementById("pdfTip").textContent="Tip: Hover a row to see original PDF text.";
}
function showPdfError(msg){document.getElementById("pdfStatus").textContent=msg;document.getElementById("pdfStatus").className="pdf-status error";document.getElementById("pdfFooter").style.display="none";}
document.getElementById("pdfSelectAll").addEventListener("click",function(){document.querySelectorAll(".pdf-chk").forEach(function(c){c.checked=true;});});
document.getElementById("pdfSelectNone").addEventListener("click",function(){document.querySelectorAll(".pdf-chk").forEach(function(c){c.checked=false;});});
document.getElementById("pdfImportBtn").addEventListener("click",function(){
  var imported=0,skipped=0;
  document.querySelectorAll(".pdf-chk").forEach(function(chk){
    if(!chk.checked)return;var i=parseInt(chk.dataset.i),row=pdfParsedRows[i];if(!row)return;
    var sel=document.querySelector('.pdf-type-sel[data-i="'+i+'"]');var type=sel?sel.value:row.type;
    var isDup=transactions.some(function(t){return t.date===row.date&&t.description===row.description&&parseFloat(t.amount)===row.amount&&t.accountId===row.accountId;});
    if(isDup){skipped++;return;}
    transactions.unshift({id:uid(),type:type,description:row.description,amount:row.amount,date:row.date,category:row.category||"",notes:"",accountId:row.accountId});imported++;
  });
  save(KEYS.transactions,transactions);document.getElementById("pdfModal").classList.add("hidden");switchToTransactions();
  alert("PDF Import complete!\n"+imported+" imported, "+skipped+" skipped.");
});
document.getElementById("pdfModalClose").addEventListener("click",function(){document.getElementById("pdfModal").classList.add("hidden");});
document.getElementById("pdfCancelBtn").addEventListener("click",function(){document.getElementById("pdfModal").classList.add("hidden");});
document.getElementById("pdfModal").addEventListener("click",function(e){if(e.target===this)this.classList.add("hidden");});

/* Charts */
function drawBarChart(){
  var canvas=document.getElementById("mainChart");if(!canvas)return;
  var months=parseInt(document.getElementById("chartRange").value)||6;
  canvas.width=canvas.offsetWidth||500;canvas.height=200;
  var ctx=canvas.getContext("2d");ctx.clearRect(0,0,canvas.width,canvas.height);
  var data=[];
  for(var i=months-1;i>=0;i--){
    var d=new Date(viewYear,viewMonth-i,1),y=d.getFullYear(),m=d.getMonth();
    var slice=transactions.filter(function(t){if(activeAcct!=="all"&&t.accountId!==activeAcct)return false;var td=new Date(t.date+"T00:00:00");return td.getFullYear()===y&&td.getMonth()===m;});
    var tot=getTotals(slice);data.push({label:MONTHS_SHORT[m],income:tot.income,expense:tot.expense});
  }
  var maxVal=Math.max.apply(null,data.map(function(d){return Math.max(d.income,d.expense);}))||100;
  var W=canvas.width,H=canvas.height,padL=52,padR=16,padT=20,padB=28,chartW=W-padL-padR,chartH=H-padT-padB,groupW=chartW/data.length,barW=Math.min(groupW*0.3,26);
  ctx.strokeStyle="rgba(0,255,200,0.06)";ctx.lineWidth=1;
  for(var g=0;g<=4;g++){var yy=padT+chartH-(chartH*(g/4));ctx.beginPath();ctx.moveTo(padL,yy);ctx.lineTo(W-padR,yy);ctx.stroke();ctx.fillStyle="rgba(200,224,216,0.3)";ctx.font="9px Share Tech Mono,monospace";ctx.textAlign="right";ctx.fillText("$"+Math.round(maxVal*(g/4)).toLocaleString(),padL-5,yy+4);}
  data.forEach(function(d,i){var cx=padL+i*groupW+groupW/2;
    if(d.income>0){var ih=(d.income/maxVal)*chartH,ig=ctx.createLinearGradient(0,padT+chartH-ih,0,padT+chartH);ig.addColorStop(0,"rgba(61,220,132,0.85)");ig.addColorStop(1,"rgba(61,220,132,0.2)");ctx.fillStyle=ig;ctx.fillRect(cx-barW-2,padT+chartH-ih,barW,ih);}
    if(d.expense>0){var eh=(d.expense/maxVal)*chartH,eg=ctx.createLinearGradient(0,padT+chartH-eh,0,padT+chartH);eg.addColorStop(0,"rgba(255,85,85,0.85)");eg.addColorStop(1,"rgba(255,85,85,0.2)");ctx.fillStyle=eg;ctx.fillRect(cx+2,padT+chartH-eh,barW,eh);}
    ctx.fillStyle="rgba(200,224,216,0.4)";ctx.font="9px Share Tech Mono,monospace";ctx.textAlign="center";ctx.fillText(d.label,cx,H-6);
  });
  ctx.fillStyle="rgba(61,220,132,0.8)";ctx.fillRect(padL,4,10,8);ctx.fillStyle="rgba(200,224,216,0.5)";ctx.font="9px Share Tech Mono,monospace";ctx.textAlign="left";ctx.fillText("Income",padL+14,12);
  ctx.fillStyle="rgba(255,85,85,0.8)";ctx.fillRect(padL+68,4,10,8);ctx.fillStyle="rgba(200,224,216,0.5)";ctx.fillText("Expenses",padL+82,12);
}
function drawPieChart(){
  var tx=filteredTx().filter(function(t){return t.type==="expense";});
  var catMap={};tx.forEach(function(t){var cat=t.category||"Other";catMap[cat]=(catMap[cat]||0)+(parseFloat(t.amount)||0);});
  var entries=Object.keys(catMap).map(function(k){return{name:k,val:catMap[k]};}).sort(function(a,b){return b.val-a.val;});
  var total=entries.reduce(function(s,e){return s+e.val;},0);
  var canvas=document.getElementById("pieChart");if(!canvas)return;
  var ctx=canvas.getContext("2d");canvas.width=200;canvas.height=200;ctx.clearRect(0,0,200,200);
  if(entries.length===0||total===0){ctx.fillStyle="rgba(255,255,255,0.05)";ctx.beginPath();ctx.arc(100,100,80,0,Math.PI*2);ctx.fill();ctx.fillStyle="rgba(200,224,216,0.3)";ctx.font="11px Share Tech Mono,monospace";ctx.textAlign="center";ctx.fillText("No data",100,104);document.getElementById("pieLegend").innerHTML="";return;}
  var start=-Math.PI/2;
  entries.forEach(function(e,i){var slice=(e.val/total)*Math.PI*2,color=PIE_COLORS[i%PIE_COLORS.length];ctx.beginPath();ctx.moveTo(100,100);ctx.arc(100,100,85,start,start+slice);ctx.closePath();ctx.fillStyle=color;ctx.fill();ctx.strokeStyle="rgba(4,10,16,0.8)";ctx.lineWidth=2;ctx.stroke();start+=slice;});
  ctx.beginPath();ctx.arc(100,100,42,0,Math.PI*2);ctx.fillStyle="#070f16";ctx.fill();
  ctx.fillStyle="rgba(200,224,216,0.6)";ctx.font="bold 11px Share Tech Mono,monospace";ctx.textAlign="center";ctx.fillText(fmt(total),100,101);
  ctx.fillStyle="rgba(200,224,216,0.3)";ctx.font="8px Share Tech Mono,monospace";ctx.fillText("SPENT",100,113);
  document.getElementById("pieLegend").innerHTML=entries.slice(0,8).map(function(e,i){
    var pct=((e.val/total)*100).toFixed(1),color=PIE_COLORS[i%PIE_COLORS.length];
    return'<div class="pie-legend-item"><div class="pie-dot" style="background:'+color+'"></div><span class="pie-name">'+esc(e.name)+'</span><span class="pie-pct">'+pct+'%</span></div>';
  }).join("");
}
function renderTopMerchants(){
  var tx=filteredTx().filter(function(t){return t.type==="expense";});
  var map={};tx.forEach(function(t){var key=(t.description||"Unknown").split(" ").slice(0,3).join(" ");map[key]=(map[key]||0)+(parseFloat(t.amount)||0);});
  var entries=Object.keys(map).map(function(k){return{name:k,val:map[k]};}).sort(function(a,b){return b.val-a.val;}).slice(0,8);
  var maxVal=entries.length>0?entries[0].val:1;
  var el=document.getElementById("topMerchants");
  if(entries.length===0){el.innerHTML='<div class="empty-state">No expense data</div>';return;}
  el.innerHTML=entries.map(function(e,i){var pct=(e.val/maxVal)*100;return'<div class="merchant-item"><span class="merchant-rank">'+(i+1)+'</span><span class="merchant-name">'+esc(e.name)+'</span><div class="merchant-bar-wrap"><div class="merchant-bar" style="width:'+pct+'%"></div></div><span class="merchant-amt">'+fmt(e.val)+'</span></div>';}).join("");
}
document.getElementById("chartRange").addEventListener("change",function(){drawBarChart();drawPieChart();});
window.addEventListener("resize",function(){if(activeView==="overview"){drawBarChart();drawPieChart();}});

/* Overview */
function renderOverview(){
  // Account summary cards
  var row=document.getElementById("acctSummaryRow");
  var allTot=getTotals(filteredTx());
  var cards=[{id:"all",name:"All Accounts",color:"#00ffc8",icon:"⚖",bal:allTot.net,inc:allTot.income,exp:allTot.expense}];
  accounts.forEach(function(a){
    var txs=transactions.filter(function(t){if(t.accountId!==a.id)return false;if(viewMode==="month"){var d=new Date(t.date+"T00:00:00");return d.getFullYear()===viewYear&&d.getMonth()===viewMonth;}return true;});
    var tot=getTotals(txs);cards.push({id:a.id,name:a.name,color:a.color,icon:"🏦",bal:tot.net,inc:tot.income,exp:tot.expense,owner:a.owner});
  });
  row.innerHTML=cards.map(function(c){
    var balColor=c.id==="all"?"var(--teal)":c.bal<0?"var(--red)":"var(--green)";
    return'<button class="acct-sum-card" style="border-color:'+c.color+'33" onclick="setActiveAcct(\''+c.id+'\')" aria-label="'+esc(c.name)+' balance '+fmt(c.bal)+'" tabindex="0">'+
      '<div style="position:absolute;top:0;left:0;right:0;height:2px;background:'+c.color+'"></div>'+
      '<div class="acct-sum-icon" style="background:'+c.color+'22;color:'+c.color+'" aria-hidden="true">'+c.icon+'</div>'+
      '<div><div class="acct-sum-label">'+esc(c.name)+(c.owner?" · "+esc(c.owner):"")+'</div><div class="acct-sum-bal" style="color:'+balColor+'">'+fmt(c.bal)+'</div></div>'+
    '</button>';
  }).join("");
  setTimeout(function(){drawBarChart();drawPieChart();renderTopMerchants();},50);
  // Recent
  var recent=filteredTx().slice().sort(function(a,b){return b.date.localeCompare(a.date);}).slice(0,8);
  var recEl=document.getElementById("recentTx");
  if(recent.length===0){recEl.innerHTML='<div class="empty-state">No transactions yet</div>';}
  else{recEl.innerHTML=recent.map(function(t){var color=t.type==="income"?"var(--green)":t.type==="expense"?"var(--red)":"var(--violet)";var sign=t.type==="income"?"+":t.type==="expense"?"-":"";var aColor=acctColor(t.accountId);return'<div class="tx-mini"><div class="tx-mini-dot" style="background:'+color+'"></div><div style="flex:1;min-width:0"><div class="tx-mini-desc">'+esc(t.description)+'</div><div style="font-family:var(--font-mono);font-size:0.55rem;color:'+aColor+'">'+esc(acctName(t.accountId))+'</div></div><div class="tx-mini-date">'+fmtDate(t.date)+'</div><div class="tx-mini-amt" style="color:'+color+'">'+sign+'$'+parseFloat(t.amount).toFixed(2)+'</div></div>';}).join("");}
  // Budget mini
  var bmi=document.getElementById("budgetMini");
  if(budgets.length===0){bmi.innerHTML='<div class="empty-state">No budgets set</div>';}
  else{bmi.innerHTML=budgets.slice(0,5).map(function(b){var spent=catSpend(b.name),pct=b.limit>0?Math.min((spent/b.limit)*100,100):0;var color=pct>=90?"var(--red)":pct>=70?"var(--amber)":(b.color||"var(--teal)");return'<div class="budget-mini-item"><div class="bmi-name">'+esc(b.name)+'</div><div class="bmi-track"><div class="bmi-fill" style="width:'+pct+'%;background:'+color+'"></div></div><div class="bmi-pct">'+fmt(spent)+' / '+fmt(b.limit)+'</div></div>';}).join("");}
  // Bills mini
  var billed=document.getElementById("billsMini");
  var upcoming=getDueSoon(bills,4);
  if(upcoming.length===0){billed.innerHTML='<div class="empty-state">No bills tracked</div>';}
  else{billed.innerHTML=upcoming.map(function(b){return billHTML(b,true);}).join("");billed.querySelectorAll(".bill-item[data-id]").forEach(function(el){el.addEventListener("click",function(){openBillModal(this.dataset.id);});});}
}

function setActiveAcct(id){activeAcct=id;document.getElementById("acctFilter").value=id;renderActive();}

/* Accounts */
function renderAccounts(){
  var allBal=0,allInc=0,allExp=0;
  accounts.forEach(function(a){var tot=acctBalance(a.id);allBal+=tot.net;allInc+=tot.income;allExp+=tot.expense;});
  document.getElementById("householdRow").innerHTML=
    '<div class="household-stat"><div class="household-label">Total Balance</div><div class="household-val" style="color:var(--teal)">'+fmt(allBal)+'</div></div>'+
    '<div class="household-divider"></div>'+
    '<div class="household-stat"><div class="household-label">Total Income</div><div class="household-val" style="color:var(--green)">'+fmt(allInc)+'</div></div>'+
    '<div class="household-divider"></div>'+
    '<div class="household-stat"><div class="household-label">Total Expenses</div><div class="household-val" style="color:var(--red)">'+fmt(allExp)+'</div></div>'+
    '<div class="household-divider"></div>'+
    '<div class="household-stat"><div class="household-label">Accounts</div><div class="household-val" style="color:var(--muted)">'+accounts.length+'</div></div>';
  var grid=document.getElementById("accountsGrid");
  if(accounts.length===0){grid.innerHTML='<div class="empty-state">No accounts yet. Add one to get started!</div>';return;}
  grid.innerHTML=accounts.map(function(a){
    var tot=acctBalance(a.id),txCount=transactions.filter(function(t){return t.accountId===a.id;}).length;
    var balColor=tot.net<0?"var(--red)":"var(--teal)";
    return'<div class="acct-card" data-id="'+a.id+'" style="border-color:'+a.color+'33" tabindex="0" role="button" aria-label="Edit '+esc(a.name)+' account">'+
      '<div style="position:absolute;top:0;left:0;right:0;height:3px;background:'+a.color+'"></div>'+
      '<div class="acct-card-header"><div class="acct-name" style="color:'+a.color+'">'+esc(a.name)+'</div><div class="acct-type">'+esc(a.type)+'</div></div>'+
      '<div class="acct-owner">'+esc(a.owner||"")+'</div>'+
      '<div class="acct-balance" style="color:'+balColor+'">'+fmt(tot.net)+'</div>'+
      '<div class="acct-stats">'+
        '<div class="acct-stat"><div class="acct-stat-label">Income</div><div class="acct-stat-val" style="color:var(--green)">'+fmt(tot.income)+'</div></div>'+
        '<div class="acct-stat"><div class="acct-stat-label">Expenses</div><div class="acct-stat-val" style="color:var(--red)">'+fmt(tot.expense)+'</div></div>'+
        '<div class="acct-stat"><div class="acct-stat-label">Transactions</div><div class="acct-stat-val">'+txCount+'</div></div>'+
      '</div>'+
    '</div>';
  }).join("");
  document.querySelectorAll(".acct-card[data-id]").forEach(function(el){
    el.addEventListener("click",function(){openAccountModal(this.dataset.id);});
    el.addEventListener("keydown",function(e){if(e.key==="Enter"||e.key===" "){e.preventDefault();openAccountModal(this.dataset.id);}});
  });
}
function acctBalance(id){var txs=transactions.filter(function(t){return t.accountId===id;});return getTotals(txs);}

/* Transactions with pagination */
function renderTransactions(){
  populateCatSelects();populateTxAcctFilter();
  var type=document.getElementById("txFilterType").value;
  var cat=document.getElementById("txFilterCat").value;
  var acct=document.getElementById("txFilterAcct").value;
  var sort=document.getElementById("txSort").value;
  var search=(document.getElementById("txSearch").value||"").toLowerCase();
  var list=filteredTx().filter(function(t){
    if(type!=="all"&&t.type!==type)return false;
    if(cat!=="all"&&t.category!==cat)return false;
    if(acct!=="all"&&t.accountId!==acct)return false;
    if(search&&!(t.description||"").toLowerCase().includes(search)&&!(t.category||"").toLowerCase().includes(search)&&!(t.notes||"").toLowerCase().includes(search))return false;
    return true;
  });
  list.sort(function(a,b){if(sort==="newest")return b.date.localeCompare(a.date);if(sort==="oldest")return a.date.localeCompare(b.date);if(sort==="highest")return parseFloat(b.amount)-parseFloat(a.amount);if(sort==="lowest")return parseFloat(a.amount)-parseFloat(b.amount);return 0;});
  var total=list.length,pages=Math.ceil(total/TX_PER_PAGE)||1;
  if(txPage>pages)txPage=pages;
  var start=(txPage-1)*TX_PER_PAGE,pageList=list.slice(start,start+TX_PER_PAGE);
  document.getElementById("txCount").textContent=total+" transaction"+(total!==1?"s":"")+" · page "+txPage+" of "+pages;
  var el=document.getElementById("txList");
  if(pageList.length===0){el.innerHTML='<div class="empty-state">No transactions found</div>';}
  else{
    el.innerHTML=pageList.map(function(t){
      var sign=t.type==="income"?"+":t.type==="expense"?"-":"~";var aColor=acctColor(t.accountId);
      return'<div class="tx-item '+t.type+'" data-id="'+t.id+'" tabindex="0" role="button" aria-label="'+esc(t.description)+' '+sign+'$'+parseFloat(t.amount).toFixed(2)+'">'+
        '<div class="tx-dot"></div>'+
        '<div class="tx-body"><div class="tx-desc">'+esc(t.description)+'</div>'+
        '<div class="tx-sub"><span>'+fmtDate(t.date)+'</span><span class="tx-cat" style="border-color:'+aColor+'44;color:'+aColor+'">'+esc(acctName(t.accountId))+'</span>'+(t.category?'<span class="tx-cat">'+esc(t.category)+'</span>':'')+(t.notes?'<span>'+esc(t.notes)+'</span>':'')+'</div></div>'+
        '<div class="tx-amount">'+sign+'$'+parseFloat(t.amount).toFixed(2)+'</div>'+
      '</div>';
    }).join("");
    document.querySelectorAll(".tx-item[data-id]").forEach(function(el){
      el.addEventListener("click",function(){openTxModal(this.dataset.id);});
      el.addEventListener("keydown",function(e){if(e.key==="Enter"||e.key===" "){e.preventDefault();openTxModal(this.dataset.id);}});
    });
  }
  // Pagination
  var pg=document.getElementById("txPagination");
  if(pages<=1){pg.innerHTML="";return;}
  var html='<button class="page-btn" id="pgPrev" aria-label="Previous page"'+(txPage===1?" disabled":"")+'>‹</button>';
  var start2=Math.max(1,txPage-2),end2=Math.min(pages,txPage+2);
  if(start2>1)html+='<button class="page-btn" data-p="1" aria-label="Page 1">1</button>'+(start2>2?'<span class="page-info">…</span>':"");
  for(var p=start2;p<=end2;p++)html+='<button class="page-btn'+(p===txPage?" active":"")+'" data-p="'+p+'" aria-label="Page '+p+'" '+(p===txPage?'aria-current="page"':"")+'>'+p+'</button>';
  if(end2<pages)html+=(end2<pages-1?'<span class="page-info">…</span>':"")+'<button class="page-btn" data-p="'+pages+'" aria-label="Page '+pages+'">'+pages+'</button>';
  html+='<button class="page-btn" id="pgNext" aria-label="Next page"'+(txPage===pages?" disabled":"")+'>›</button>';
  pg.innerHTML=html;
  pg.querySelectorAll(".page-btn[data-p]").forEach(function(b){b.addEventListener("click",function(){txPage=parseInt(this.dataset.p);renderTransactions();});});
  var prev=document.getElementById("pgPrev"),next=document.getElementById("pgNext");
  if(prev)prev.addEventListener("click",function(){if(txPage>1){txPage--;renderTransactions();}});
  if(next)next.addEventListener("click",function(){if(txPage<pages){txPage++;renderTransactions();}});
}

/* Budgets — with latest 3 transactions per category */
function renderBudgets(){
  var el=document.getElementById("budgetGrid");
  if(budgets.length===0){el.innerHTML='<div class="empty-state">No budget categories yet. Click "+ Add Budget" to create one.</div>';return;}
  el.innerHTML=budgets.map(function(b){
    var spent=catSpend(b.name),pct=b.limit>0?Math.min((spent/b.limit)*100,100).toFixed(0):0;
    var color=parseInt(pct)>=90?"#ff5555":parseInt(pct)>=70?"#ffb703":(b.color||"#00ffc8");
    // Latest 3 transactions for this category
    var catTxs=filteredTx().filter(function(t){return t.type==="expense"&&t.category===b.name;}).sort(function(a,c){return c.date.localeCompare(a.date);}).slice(0,3);
    var txRows=catTxs.length===0?'<div style="font-family:var(--font-mono);font-size:0.65rem;color:var(--muted);text-align:center;padding:0.5rem">No transactions</div>':
      catTxs.map(function(t){return'<div class="bc-tx-row"><span class="bc-tx-date">'+fmtDate(t.date)+'</span><span class="bc-tx-desc">'+esc(t.description)+'</span><span class="bc-tx-amt">-$'+parseFloat(t.amount).toFixed(2)+'</span></div>';}).join("");
    return'<div class="budget-card" data-id="'+b.id+'" tabindex="0" role="button" aria-label="Edit '+esc(b.name)+' budget">'+
      '<div class="bc-header"><div class="bc-name" style="color:'+b.color+'">'+esc(b.name)+'</div><div class="bc-limit">Limit: '+fmt(b.limit)+'</div></div>'+
      '<div class="bc-track"><div class="bc-fill" style="width:'+pct+'%;background:'+color+'"></div></div>'+
      '<div class="bc-foot"><span>Spent: '+fmt(spent)+'</span><span style="color:'+color+'">'+pct+'%</span><span>Left: '+fmt(Math.max(b.limit-spent,0))+'</span></div>'+
      '<div class="bc-tx-list" aria-label="Latest transactions for '+esc(b.name)+'">'+txRows+'</div>'+
    '</div>';
  }).join("");
  document.querySelectorAll(".budget-card[data-id]").forEach(function(el){
    el.addEventListener("click",function(){openBudgetModal(this.dataset.id);});
    el.addEventListener("keydown",function(e){if(e.key==="Enter"||e.key===" "){e.preventDefault();openBudgetModal(this.dataset.id);}});
  });
}

/* Saving Pots — add/withdraw */
function renderPots(){
  var el=document.getElementById("potsGrid");
  if(pots.length===0){el.innerHTML='<div class="empty-state">No saving pots yet. Click "+ Add Pot" to create one.</div>';return;}
  el.innerHTML=pots.map(function(g){
    var pct=g.target>0?Math.min((g.saved/g.target)*100,100):0;var color=g.color||"#9d7fff";
    return'<div class="goal-card" style="border-color:'+color+'33">'+
      '<div class="gc-header"><div class="gc-name" style="color:'+color+'">'+esc(g.name)+'</div></div>'+
      '<div class="gc-date">'+(g.targetDate?"Target: "+fmtDate(g.targetDate):"No target date")+'</div>'+
      '<div class="gc-track" role="progressbar" aria-valuenow="'+pct.toFixed(0)+'" aria-valuemin="0" aria-valuemax="100" aria-label="'+esc(g.name)+' savings progress"><div class="gc-fill" style="width:'+pct.toFixed(0)+'%;background:'+color+'"></div></div>'+
      '<div class="gc-foot"><span class="gc-saved">'+fmt(g.saved)+'</span><span class="gc-pct" style="color:'+color+'">'+pct.toFixed(0)+'%</span><span class="gc-target">of '+fmt(g.target)+'</span></div>'+
      '<div class="gc-actions">'+
        '<button class="gc-btn gc-btn-add" data-id="'+g.id+'" data-mode="add" tabindex="0" aria-label="Add money to '+esc(g.name)+'">+ Add</button>'+
        '<button class="gc-btn gc-btn-withdraw" data-id="'+g.id+'" data-mode="withdraw" tabindex="0" aria-label="Withdraw from '+esc(g.name)+'" '+(g.saved<=0?"disabled":"")+'>− Withdraw</button>'+
        '<button class="gc-btn gc-btn-edit" data-id="'+g.id+'" data-mode="edit" tabindex="0" aria-label="Edit '+esc(g.name)+'">Edit</button>'+
      '</div>'+
    '</div>';
  }).join("");
  document.querySelectorAll(".gc-btn[data-id]").forEach(function(btn){
    btn.addEventListener("click",function(){
      var id=this.dataset.id,mode=this.dataset.mode;
      if(mode==="edit"){openPotModal(id);}
      else{openPotFund(id,mode);}
    });
  });
}

function openPotFund(id,mode){
  potFundMode=mode;potFundId=id;
  var pot=pots.find(function(p){return p.id===id;});if(!pot)return;
  var modal=document.getElementById("potFundModal");
  document.getElementById("potFundTitle").textContent=(mode==="add"?"Add Money to ":"Withdraw from ")+pot.name;
  document.getElementById("potFundAmount").value="";
  document.getElementById("potFundErr").textContent="";
  document.getElementById("potFundInfo").textContent=mode==="add"
    ?"Current balance: "+fmt(pot.saved)+" | Target: "+fmt(pot.target)
    :"Current balance: "+fmt(pot.saved)+" (max withdrawal)";
  modal.classList.remove("hidden");trapFocus(modal);
  document.getElementById("potFundAmount").focus();
}

document.getElementById("potFundConfirm").addEventListener("click",function(){
  var amt=parseFloat(document.getElementById("potFundAmount").value);
  var errEl=document.getElementById("potFundErr");
  if(isNaN(amt)||amt<=0){errEl.textContent="Please enter a valid amount greater than zero.";document.getElementById("potFundAmount").classList.add("error");document.getElementById("potFundAmount").focus();return;}
  var pot=pots.find(function(p){return p.id===potFundId;});if(!pot)return;
  if(potFundMode==="withdraw"&&amt>pot.saved){errEl.textContent="Cannot withdraw more than the current balance of "+fmt(pot.saved)+".";document.getElementById("potFundAmount").classList.add("error");document.getElementById("potFundAmount").focus();return;}
  pot.saved=potFundMode==="add"?pot.saved+amt:pot.saved-amt;
  save(KEYS.pots,pots);document.getElementById("potFundModal").classList.add("hidden");renderActive();
});
document.getElementById("potFundClose").addEventListener("click",function(){document.getElementById("potFundModal").classList.add("hidden");});
document.getElementById("potFundCancel").addEventListener("click",function(){document.getElementById("potFundModal").classList.add("hidden");});
document.getElementById("potFundModal").addEventListener("click",function(e){if(e.target===this)this.classList.add("hidden");});
document.getElementById("potFundAmount").addEventListener("input",function(){this.classList.remove("error");document.getElementById("potFundErr").textContent="";});

/* Bills — with paid status and search/sort */
function daysUntilDue(b){var today=new Date();today.setHours(0,0,0,0);var due=new Date(today.getFullYear(),today.getMonth(),b.dueDay);if(due<today)due.setMonth(due.getMonth()+1);return Math.round((due-today)/(1000*60*60*24));}
function getDueSoon(bl,limit){return bl.slice().sort(function(a,b){return daysUntilDue(a)-daysUntilDue(b);}).slice(0,limit||bl.length);}

function billPaidKey(billId){var d=new Date();return billId+"-"+d.getFullYear()+"-"+pad(d.getMonth()+1);}
function isBillPaid(billId){return!!billPaid[billPaidKey(billId)];}
function toggleBillPaid(billId){var k=billPaidKey(billId);billPaid[k]=!billPaid[k];save(KEYS.billPaid,billPaid);renderBills();}

function billHTML(b,mini){
  var days=daysUntilDue(b);
  var paid=isBillPaid(b.id);
  var cls=paid?"ok":days<=3?"overdue":days<=7?"soon":"ok";
  var label=paid?"✓ Paid":days===0?"Due Today":days<0?"Overdue":days===1?"Tomorrow":"In "+days+"d";
  return'<div class="bill-item" data-id="'+b.id+'" tabindex="0" role="button" aria-label="'+esc(b.name)+(paid?" (paid)":"")+'" style="opacity:'+(paid?0.6:1)+'">'+
    '<div class="bill-dot" style="background:'+(b.color||"var(--red)")+'"></div>'+
    '<div class="bill-body"><div class="bill-name">'+esc(b.name)+'</div><div class="bill-meta">'+capitalize(b.frequency||"monthly")+(b.category?" · "+esc(b.category):"")+'</div></div>'+
    '<div class="bill-amt">'+fmt(b.amount)+'</div>'+
    '<div class="bill-due '+cls+'">'+label+'</div>'+
    (!mini?'<button class="bill-paid-btn '+(paid?"paid":"unpaid")+'" data-id="'+b.id+'" aria-label="'+(paid?"Mark as unpaid":"Mark as paid")+'" tabindex="0" onclick="event.stopPropagation();toggleBillPaid(\''+b.id+'\');">'+(paid?"Paid ✓":"Mark Paid")+'</button>':"")+
  '</div>';
}

function renderBills(){
  var search=(document.getElementById("billSearch").value||"").toLowerCase();
  var sort=document.getElementById("billSort").value;
  var list=bills.filter(function(b){return!search||(b.name||"").toLowerCase().includes(search);});
  list.sort(function(a,b2){
    if(sort==="due")return daysUntilDue(a)-daysUntilDue(b2);
    if(sort==="name")return(a.name||"").localeCompare(b2.name||"");
    if(sort==="amount")return parseFloat(b2.amount)-parseFloat(a.amount);
    return 0;
  });
  var el=document.getElementById("billsList");
  if(list.length===0){el.innerHTML='<div class="empty-state">'+(search?"No bills match your search.":"No bills tracked yet.")+'</div>';return;}
  el.innerHTML=list.map(function(b){return billHTML(b,false);}).join("");
  document.querySelectorAll("#billsList .bill-item[data-id]").forEach(function(el){
    el.addEventListener("click",function(){openBillModal(this.dataset.id);});
    el.addEventListener("keydown",function(e){if(e.key==="Enter"||e.key===" "){e.preventDefault();openBillModal(this.dataset.id);}});
  });
}

document.getElementById("billSearch").addEventListener("input",renderBills);
document.getElementById("billSort").addEventListener("change",renderBills);

function renderView(name){
  if(name==="overview")    renderOverview();
  if(name==="transactions")renderTransactions();
  if(name==="accounts")    renderAccounts();
  if(name==="budgets")     renderBudgets();
  if(name==="pots")        renderPots();
  if(name==="bills")       renderBills();
}

/* ── MODALS ── */

/* Validation helper */
function validateField(inputId,errorId,msg){
  var el=document.getElementById(inputId),err=document.getElementById(errorId);
  var val=(el.value||"").trim();
  if(!val||val==="0"||parseFloat(val)<=0&&el.type==="number"){
    err.textContent=msg;el.classList.add("error");el.focus();return false;
  }
  err.textContent="";el.classList.remove("error");return true;
}
function clearErrors(ids){ids.forEach(function(id){var el=document.getElementById(id);if(el){el.textContent="";var inp=document.getElementById(id.replace("Err",""));if(inp)inp.classList.remove("error");}});}

/* Transaction Modal */
var txType="expense";
document.getElementById("addTxBtn").addEventListener("click",function(){openTxModal(null);});
function openTxModal(id){
  editingId=id;clearErrors(["txDescErr","txAmountErr","txDateErr"]);
  populateCatSelect(document.getElementById("txCat"));populateTxAcctSelect(document.getElementById("txAcct"));
  if(id){
    var t=transactions.find(function(x){return x.id===id;});if(!t)return;
    document.getElementById("txModalTitle").textContent="Edit Transaction";document.getElementById("txDelete").classList.remove("hidden");
    setTxType(t.type);document.getElementById("txDesc").value=t.description||"";document.getElementById("txAmount").value=t.amount||"";document.getElementById("txDate").value=t.date||todayStr();document.getElementById("txCat").value=t.category||"";document.getElementById("txNotes").value=t.notes||"";document.getElementById("txAcct").value=t.accountId||"";
  }else{
    document.getElementById("txModalTitle").textContent="Add Transaction";document.getElementById("txDelete").classList.add("hidden");
    setTxType("expense");document.getElementById("txDesc").value="";document.getElementById("txAmount").value="";document.getElementById("txDate").value=todayStr();document.getElementById("txCat").value="";document.getElementById("txNotes").value="";
    if(activeAcct!=="all")document.getElementById("txAcct").value=activeAcct;
  }
  var modal=document.getElementById("txModal");modal.classList.remove("hidden");trapFocus(modal);document.getElementById("txDesc").focus();
}
function setTxType(type){txType=type;document.querySelectorAll("#txTypeTabs .type-tab").forEach(function(b){b.classList.toggle("active",b.dataset.type===type);b.setAttribute("aria-selected",b.dataset.type===type?"true":"false");b.setAttribute("tabindex",b.dataset.type===type?"0":"-1");});}
document.querySelectorAll("#txTypeTabs .type-tab").forEach(function(b){
  b.addEventListener("click",function(){setTxType(this.dataset.type);});
  b.addEventListener("keydown",function(e){
    var tabs=Array.from(document.querySelectorAll("#txTypeTabs .type-tab"));var idx=tabs.indexOf(this);
    if(e.key==="ArrowRight"){tabs[(idx+1)%tabs.length].focus();setTxType(tabs[(idx+1)%tabs.length].dataset.type);}
    if(e.key==="ArrowLeft"){tabs[(idx-1+tabs.length)%tabs.length].focus();setTxType(tabs[(idx-1+tabs.length)%tabs.length].dataset.type);}
  });
});
document.getElementById("txModalClose").addEventListener("click",function(){document.getElementById("txModal").classList.add("hidden");});
document.getElementById("txModal").addEventListener("click",function(e){if(e.target===this)this.classList.add("hidden");});
document.getElementById("txSave").addEventListener("click",function(){
  var ok=true;
  if(!validateField("txDesc","txDescErr","Description is required."))ok=false;
  if(!document.getElementById("txAmount").value||parseFloat(document.getElementById("txAmount").value)<=0){document.getElementById("txAmountErr").textContent="Please enter a valid amount.";document.getElementById("txAmount").classList.add("error");if(ok)document.getElementById("txAmount").focus();ok=false;}else{document.getElementById("txAmountErr").textContent="";document.getElementById("txAmount").classList.remove("error");}
  if(!document.getElementById("txDate").value){document.getElementById("txDateErr").textContent="Date is required.";document.getElementById("txDate").classList.add("error");if(ok)document.getElementById("txDate").focus();ok=false;}else{document.getElementById("txDateErr").textContent="";document.getElementById("txDate").classList.remove("error");}
  if(!ok)return;
  var desc=document.getElementById("txDesc").value.trim(),amount=parseFloat(document.getElementById("txAmount").value),date=document.getElementById("txDate").value;
  var cat=document.getElementById("txCat").value||autoCategory(desc),notes=document.getElementById("txNotes").value.trim(),acctId=document.getElementById("txAcct").value;
  if(editingId){var idx=transactions.findIndex(function(x){return x.id===editingId;});if(idx>=0)transactions[idx]={id:editingId,type:txType,description:desc,amount:amount,date:date,category:cat,notes:notes,accountId:acctId};}
  else{transactions.unshift({id:uid(),type:txType,description:desc,amount:amount,date:date,category:cat,notes:notes,accountId:acctId});}
  save(KEYS.transactions,transactions);document.getElementById("txModal").classList.add("hidden");renderActive();
});
document.getElementById("txDelete").addEventListener("click",function(){
  if(!confirm("Delete this transaction?"))return;
  transactions=transactions.filter(function(x){return x.id!==editingId;});save(KEYS.transactions,transactions);document.getElementById("txModal").classList.add("hidden");renderActive();
});

/* Account Modal */
document.getElementById("addAccountBtn").addEventListener("click",function(){openAccountModal(null);});
function openAccountModal(id){
  editingId=id;clearErrors(["accountNameErr"]);
  if(id){var a=accounts.find(function(x){return x.id===id;});if(!a)return;document.getElementById("accountModalTitle").textContent="Edit Account";document.getElementById("accountName").value=a.name||"";document.getElementById("accountType").value=a.type||"checking";document.getElementById("accountOwner").value=a.owner||"";document.getElementById("accountColor").value=a.color||"#00ffc8";document.getElementById("accountDelete").classList.remove("hidden");}
  else{document.getElementById("accountModalTitle").textContent="Add Account";document.getElementById("accountName").value="";document.getElementById("accountType").value="checking";document.getElementById("accountOwner").value="";document.getElementById("accountColor").value="#00ffc8";document.getElementById("accountDelete").classList.add("hidden");}
  var modal=document.getElementById("accountModal");modal.classList.remove("hidden");trapFocus(modal);document.getElementById("accountName").focus();
}
document.getElementById("accountModalClose").addEventListener("click",function(){document.getElementById("accountModal").classList.add("hidden");});
document.getElementById("accountModal").addEventListener("click",function(e){if(e.target===this)this.classList.add("hidden");});
document.getElementById("accountSave").addEventListener("click",function(){
  if(!validateField("accountName","accountNameErr","Account name is required."))return;
  var name=document.getElementById("accountName").value.trim(),type=document.getElementById("accountType").value,owner=document.getElementById("accountOwner").value.trim(),color=document.getElementById("accountColor").value;
  if(editingId){var idx=accounts.findIndex(function(x){return x.id===editingId;});if(idx>=0)accounts[idx]={id:editingId,name:name,type:type,owner:owner,color:color};}
  else{accounts.push({id:uid(),name:name,type:type,owner:owner,color:color});}
  save(KEYS.accounts,accounts);document.getElementById("accountModal").classList.add("hidden");populateAcctFilter();populateTxAcctFilter();renderActive();
});
document.getElementById("accountDelete").addEventListener("click",function(){
  if(!confirm("Delete this account? Transactions will remain but lose account assignment."))return;
  accounts=accounts.filter(function(x){return x.id!==editingId;});save(KEYS.accounts,accounts);document.getElementById("accountModal").classList.add("hidden");populateAcctFilter();populateTxAcctFilter();renderActive();
});

/* Budget Modal */
document.getElementById("addBudgetBtn").addEventListener("click",function(){openBudgetModal(null);});
function openBudgetModal(id){
  editingId=id;clearErrors(["budgetNameErr","budgetLimitErr"]);
  if(id){var b=budgets.find(function(x){return x.id===id;});if(!b)return;document.getElementById("budgetName").value=b.name||"";document.getElementById("budgetLimit").value=b.limit||"";document.getElementById("budgetColor").value=b.color||"#00ffc8";document.getElementById("budgetDelete").classList.remove("hidden");}
  else{document.getElementById("budgetName").value="";document.getElementById("budgetLimit").value="";document.getElementById("budgetColor").value="#00ffc8";document.getElementById("budgetDelete").classList.add("hidden");}
  var modal=document.getElementById("budgetModal");modal.classList.remove("hidden");trapFocus(modal);document.getElementById("budgetName").focus();
}
document.getElementById("budgetModalClose").addEventListener("click",function(){document.getElementById("budgetModal").classList.add("hidden");});
document.getElementById("budgetModal").addEventListener("click",function(e){if(e.target===this)this.classList.add("hidden");});
document.getElementById("budgetSave").addEventListener("click",function(){
  var ok=validateField("budgetName","budgetNameErr","Category name is required.");
  if(!document.getElementById("budgetLimit").value||parseFloat(document.getElementById("budgetLimit").value)<0){document.getElementById("budgetLimitErr").textContent="Please enter a valid limit.";document.getElementById("budgetLimit").classList.add("error");if(ok)document.getElementById("budgetLimit").focus();ok=false;}else{document.getElementById("budgetLimitErr").textContent="";document.getElementById("budgetLimit").classList.remove("error");}
  if(!ok)return;
  var name=document.getElementById("budgetName").value.trim(),limit=parseFloat(document.getElementById("budgetLimit").value),color=document.getElementById("budgetColor").value;
  if(editingId){var idx=budgets.findIndex(function(x){return x.id===editingId;});if(idx>=0)budgets[idx]={id:editingId,name:name,limit:limit,color:color};}
  else{budgets.push({id:uid(),name:name,limit:limit,color:color});}
  save(KEYS.budgets,budgets);document.getElementById("budgetModal").classList.add("hidden");populateCatSelects();renderActive();
});
document.getElementById("budgetDelete").addEventListener("click",function(){
  if(!confirm("Delete this budget?"))return;
  budgets=budgets.filter(function(x){return x.id!==editingId;});save(KEYS.budgets,budgets);document.getElementById("budgetModal").classList.add("hidden");renderActive();
});

/* Pot Modal */
document.getElementById("addPotBtn").addEventListener("click",function(){openPotModal(null);});
function openPotModal(id){
  editingId=id;clearErrors(["potNameErr","potTargetErr"]);
  if(id){var g=pots.find(function(x){return x.id===id;});if(!g)return;document.getElementById("potName").value=g.name||"";document.getElementById("potTarget").value=g.target||"";document.getElementById("potSaved").value=g.saved||"";document.getElementById("potDate").value=g.targetDate||"";document.getElementById("potColor").value=g.color||"#9d7fff";document.getElementById("potDelete").classList.remove("hidden");}
  else{document.getElementById("potName").value="";document.getElementById("potTarget").value="";document.getElementById("potSaved").value="";document.getElementById("potDate").value="";document.getElementById("potColor").value="#9d7fff";document.getElementById("potDelete").classList.add("hidden");}
  var modal=document.getElementById("potModal");modal.classList.remove("hidden");trapFocus(modal);document.getElementById("potName").focus();
}
document.getElementById("potModalClose").addEventListener("click",function(){document.getElementById("potModal").classList.add("hidden");});
document.getElementById("potModal").addEventListener("click",function(e){if(e.target===this)this.classList.add("hidden");});
document.getElementById("potSave").addEventListener("click",function(){
  var ok=validateField("potName","potNameErr","Pot name is required.");
  if(!document.getElementById("potTarget").value||parseFloat(document.getElementById("potTarget").value)<=0){document.getElementById("potTargetErr").textContent="Please enter a target amount.";document.getElementById("potTarget").classList.add("error");if(ok)document.getElementById("potTarget").focus();ok=false;}else{document.getElementById("potTargetErr").textContent="";document.getElementById("potTarget").classList.remove("error");}
  if(!ok)return;
  var name=document.getElementById("potName").value.trim(),target=parseFloat(document.getElementById("potTarget").value),saved=parseFloat(document.getElementById("potSaved").value)||0,date=document.getElementById("potDate").value,color=document.getElementById("potColor").value;
  if(editingId){var idx=pots.findIndex(function(x){return x.id===editingId;});if(idx>=0)pots[idx]={id:editingId,name:name,target:target,saved:saved,targetDate:date,color:color};}
  else{pots.push({id:uid(),name:name,target:target,saved:saved,targetDate:date,color:color});}
  save(KEYS.pots,pots);document.getElementById("potModal").classList.add("hidden");renderActive();
});
document.getElementById("potDelete").addEventListener("click",function(){
  if(!confirm("Delete this saving pot?"))return;
  pots=pots.filter(function(x){return x.id!==editingId;});save(KEYS.pots,pots);document.getElementById("potModal").classList.add("hidden");renderActive();
});

/* Bill Modal */
document.getElementById("addBillBtn").addEventListener("click",function(){openBillModal(null);});
function openBillModal(id){
  editingId=id;clearErrors(["billNameErr","billAmountErr","billDueErr"]);populateCatSelect(document.getElementById("billCat"));
  if(id){var b=bills.find(function(x){return x.id===id;});if(!b)return;document.getElementById("billName").value=b.name||"";document.getElementById("billAmount").value=b.amount||"";document.getElementById("billDue").value=b.dueDay||1;document.getElementById("billFreq").value=b.frequency||"monthly";document.getElementById("billCat").value=b.category||"";document.getElementById("billDelete").classList.remove("hidden");}
  else{document.getElementById("billName").value="";document.getElementById("billAmount").value="";document.getElementById("billDue").value="";document.getElementById("billFreq").value="monthly";document.getElementById("billDelete").classList.add("hidden");}
  var modal=document.getElementById("billModal");modal.classList.remove("hidden");trapFocus(modal);document.getElementById("billName").focus();
}
document.getElementById("billModalClose").addEventListener("click",function(){document.getElementById("billModal").classList.add("hidden");});
document.getElementById("billModal").addEventListener("click",function(e){if(e.target===this)this.classList.add("hidden");});
document.getElementById("billSave").addEventListener("click",function(){
  var ok=validateField("billName","billNameErr","Bill name is required.");
  if(!document.getElementById("billAmount").value||parseFloat(document.getElementById("billAmount").value)<=0){document.getElementById("billAmountErr").textContent="Please enter a valid amount.";document.getElementById("billAmount").classList.add("error");if(ok)document.getElementById("billAmount").focus();ok=false;}else{document.getElementById("billAmountErr").textContent="";document.getElementById("billAmount").classList.remove("error");}
  var dueVal=parseInt(document.getElementById("billDue").value);
  if(!document.getElementById("billDue").value||dueVal<1||dueVal>31){document.getElementById("billDueErr").textContent="Enter a day between 1 and 31.";document.getElementById("billDue").classList.add("error");if(ok)document.getElementById("billDue").focus();ok=false;}else{document.getElementById("billDueErr").textContent="";document.getElementById("billDue").classList.remove("error");}
  if(!ok)return;
  var name=document.getElementById("billName").value.trim(),amount=parseFloat(document.getElementById("billAmount").value),dueDay=parseInt(document.getElementById("billDue").value),freq=document.getElementById("billFreq").value,cat=document.getElementById("billCat").value;
  var colors=["#ff5555","#ffb703","#9d7fff","#00ffc8","#3ddc84"],color=colors[Math.floor(Math.random()*colors.length)];
  if(editingId){var idx=bills.findIndex(function(x){return x.id===editingId;});if(idx>=0)bills[idx]={id:editingId,name:name,amount:amount,dueDay:dueDay,frequency:freq,category:cat,color:bills[idx].color||color};}
  else{bills.push({id:uid(),name:name,amount:amount,dueDay:dueDay,frequency:freq,category:cat,color:color});}
  save(KEYS.bills,bills);document.getElementById("billModal").classList.add("hidden");renderActive();
});
document.getElementById("billDelete").addEventListener("click",function(){
  if(!confirm("Delete this bill?"))return;
  bills=bills.filter(function(x){return x.id!==editingId;});save(KEYS.bills,bills);document.getElementById("billModal").classList.add("hidden");renderActive();
});

/* Filter listeners */
["txFilterType","txFilterCat","txFilterAcct","txSort"].forEach(function(id){document.getElementById(id).addEventListener("change",function(){txPage=1;renderTransactions();});});
document.getElementById("txSearch").addEventListener("input",function(){txPage=1;renderTransactions();});

/* Category helpers */
function allCats(){var names=DEFAULT_CATS.slice();budgets.forEach(function(b){if(names.indexOf(b.name)<0)names.push(b.name);});return names;}
function populateCatSelect(sel){var cur=sel.value;sel.innerHTML='<option value="">Uncategorized</option>'+allCats().map(function(c){return'<option value="'+c+'">'+c+'</option>';}).join("");sel.value=cur;}
function populateCatSelects(){populateCatSelect(document.getElementById("txCat"));var fc=document.getElementById("txFilterCat"),cur=fc.value;fc.innerHTML='<option value="all">All Categories</option>'+allCats().map(function(c){return'<option value="'+c+'">'+c+'</option>';}).join("");fc.value=cur;}
function populateTxAcctSelect(sel){var cur=sel.value;sel.innerHTML='<option value="">No Account</option>'+accounts.map(function(a){return'<option value="'+a.id+'">'+esc(a.name)+'</option>';}).join("");sel.value=cur;}
function populateTxAcctFilter(){var sel=document.getElementById("txFilterAcct"),cur=sel.value;sel.innerHTML='<option value="all">All Accounts</option>'+accounts.map(function(a){return'<option value="'+a.id+'">'+esc(a.name)+'</option>';}).join("");sel.value=cur;}

/* CSV helpers */
function parseCSVLine(line){var result=[],cur="",inQuote=false;for(var i=0;i<line.length;i++){var ch=line[i];if(ch==='"'){inQuote=!inQuote;}else if(ch===","&&!inQuote){result.push(cur.trim());cur="";}else cur+=ch;}result.push(cur.trim());return result;}
function findCol(header,names){for(var i=0;i<names.length;i++){var idx=header.indexOf(names[i]);if(idx>=0)return idx;for(var j=0;j<header.length;j++){if(header[j].indexOf(names[i])>=0)return j;}}return -1;}
function guessIncomeExpense(desc){if(/salary|payroll|direct deposit|refund|interest|dividend|deposit|income|payment received/i.test(desc))return"income";return"expense";}
function normalizeDate(raw){
  if(!raw)return null;raw=raw.replace(/"/g,"").trim();
  if(/^\d{4}-\d{2}-\d{2}$/.test(raw))return raw;
  var m=raw.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);if(m){var yr=m[3].length===2?"20"+m[3]:m[3];return yr+"-"+pad(parseInt(m[1]))+"-"+pad(parseInt(m[2]));}
  var m2=raw.match(/^(\d{1,2})-(\d{1,2})-(\d{4})$/);if(m2)return m2[3]+"-"+pad(parseInt(m2[1]))+"-"+pad(parseInt(m2[2]));
  var d=new Date(raw);if(!isNaN(d))return d.getFullYear()+"-"+pad(d.getMonth()+1)+"-"+pad(d.getDate());
  return null;
}

/* Global keyboard shortcuts */
document.addEventListener("keydown",function(e){
  if(e.key==="Escape"){document.querySelectorAll(".modal-overlay:not(.hidden)").forEach(function(m){m.classList.add("hidden");});}
});

/* Shake animation */
var ss=document.createElement("style");
ss.textContent="@keyframes shake{0%,100%{transform:translateX(0)}20%,60%{transform:translateX(-6px)}40%,80%{transform:translateX(6px)}}";
document.head.appendChild(ss);

/* Boot */
updateMonthLabel();
populateAcctFilter();
populateCatSelects();
renderView("overview");
