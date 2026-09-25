const DB_KEY="cc_db_v3";
const seed={
  settings:{business:"Café Criollo",rate:850,lastRateUpdate:null,rateSource:"Manual",currency:"USD"},
  products:[
    {id:1,name:"Aceite 250",price:1.02,cost:.72,stock:18,min:5,cat:"Aceites",barcode:"759123450001",image:""},
    {id:2,name:"Aceite Pampa 500",price:1.76,cost:1.20,stock:12,min:4,cat:"Aceites",barcode:"759123450002",image:""},
    {id:3,name:"Arroz Tradicional",price:1.95,cost:1.35,stock:22,min:6,cat:"Granos",barcode:"759123450003",image:""},
    {id:4,name:"Atún",price:2.10,cost:1.55,stock:9,min:4,cat:"Enlatados",barcode:"759123450004",image:""},
    {id:5,name:"Detergente Alive",price:1.51,cost:1.05,stock:4,min:5,cat:"Limpieza",barcode:"759123450005",image:""},
    {id:6,name:"Harina P.A.N.",price:2.50,cost:1.80,stock:15,min:5,cat:"Harinas",barcode:"759123450006",image:""}
  ],
  customers:[],suppliers:[],sales:[],expenses:[],purchases:[],payments:[],cash:{opened:false,opening:0,openedAt:null,closedAt:null,closing:0},audit:[]
};
let db=load();
let state={screen:"caja",q:"",cat:"Todos",cart:[],customerId:null,discount:0,editing:null};

function load(){
  try{return {...seed,...JSON.parse(localStorage.getItem(DB_KEY)||"{}")};}
  catch(e){return JSON.parse(JSON.stringify(seed))}
}
function save(){localStorage.setItem(DB_KEY,JSON.stringify(db))}
function id(){return Date.now()+Math.floor(Math.random()*999)}
function $$(s){return document.querySelector(s)}
function esc(s){return String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]))}
function money(n){return "$"+Number(n||0).toFixed(2)}
function bs(n){return "Bs. "+(Number(n||0)*Number(db.settings.rate||0)).toLocaleString("es-VE",{minimumFractionDigits:2,maximumFractionDigits:2})}
function now(){return new Date().toISOString()}
function toast(t){let x=document.createElement("div");x.className="toast";x.textContent=t;document.body.append(x);setTimeout(()=>x.remove(),2400)}
function log(action,detail=""){db.audit.push({date:now(),action,detail});if(db.audit.length>500)db.audit.shift();save()}
function img(p){return p.image?'<img src="'+esc(p.image)+'" onerror="this.remove()">':'<span class="fallback">🛍️</span>'}
function stock(p){return p.stock<=0?'<span class="stock out">Agotado</span>':p.stock<=p.min?'<span class="stock low">'+p.stock+" disponibles</span>":'<span class="stock">Libre</span>'}
function header(){return '<header class="top"><div><div class="brand">Café Criollo</div><small class="muted">'+(navigator.onLine?"● Online":"● Offline")+' · '+esc(db.settings.rateSource)+' · '+db.settings.rate+' Bs/$</small></div><button class="icon-btn" onclick="settings()">⚙️</button></header>'}
function search(){return '<div class="searchbar">⌕<input id="q" value="'+esc(state.q)+'" placeholder="Buscar producto..."><button onclick="onlineSearch()">🌐</button><button onclick="barcode()">▣</button></div>'}
function chips(){let cs=["Todos",...new Set(db.products.map(p=>p.cat))];return '<div class="tabs">'+cs.map(c=>'<button class="chip '+(state.cat===c?"on":"")+'" onclick="cat('+JSON.stringify(c)+')">'+esc(c)+'</button>').join("")+"</div>"}
function card(p){return '<article class="card"><div class="photo">'+img(p)+'</div><div class="card-body"><div class="name">'+esc(p.name)+'</div>'+stock(p)+'<div class="price">'+money(p.price)+'</div><div class="secondary">'+bs(p.price)+'</div></div><button class="add" onclick="add('+p.id+')">+</button></article>'}
function caja(){
  let ps=db.products.filter(p=>(state.cat==="Todos"||p.cat===state.cat)&&((p.name+" "+(p.barcode||"")).toLowerCase().includes(state.q.toLowerCase())));
  let low=db.products.filter(p=>p.stock<=p.min&&p.stock>0).length;
  return search()+(low?'<div class="notice">⚠️ '+low+' productos con stock bajo · <button onclick="go(\'inventario\')">Revisar</button></div>':"")+chips()+'<main class="grid">'+(ps.length?ps.map(card).join(""):'<div class="empty">No hay coincidencias.</div>')+'</main><button class="fab" onclick="go(\'carrito\')">🛒 '+state.cart.reduce((a,i)=>a+i.qty,0)+"</button>";
}
function carrito(){
  let sub=state.cart.reduce((a,i)=>a+i.price*i.qty,0),discount=Math.min(sub,Math.max(0,state.discount||0)),total=sub-discount;
  return '<section class="section"><div class="section-head"><h2>Venta actual</h2><button class="small-btn" onclick="customerPick()">👤 '+(state.customerId?(db.customers.find(c=>c.id===state.customerId)?.name||"Cliente"):"Cliente")+'</button></div>'+
  (state.cart.length?state.cart.map(i=>'<div class="cart-item"><div class="grow"><b>'+esc(i.name)+'</b><div class="muted">'+money(i.price)+' · '+bs(i.price)+'</div></div><div class="qty"><button onclick="qty('+i.id+',-1)">−</button><b>'+i.qty+'</b><button onclick="qty('+i.id+',1)">+</button></div><b>'+money(i.price*i.qty)+'</b></div>').join(""):'<div class="empty">El carrito está vacío.</div>')+
  '<div class="total-box"><div class="total-line"><span>Subtotal</span><b>'+money(sub)+'</b></div><div class="total-line"><span>Descuento</span><button class="small-btn" onclick="discount()">− '+money(discount)+'</button></div><div class="total-line"><span>Total Bs.</span><b>'+bs(total)+'</b></div><div class="total-line total"><span>Total</span><span>'+money(total)+'</span></div></div>'+
  '<div class="actions" style="margin-top:14px"><button class="btn primary" onclick="checkout()">Cobrar</button><button class="btn" onclick="discount()">Descuento</button><button class="btn" onclick="state.cart=[];render()">Vaciar</button></div></section>';
}
function inventario(){
  return '<section class="section"><div class="section-head"><h2>Inventario</h2><button class="btn primary" onclick="edit()">+ Producto</button></div><div class="online">● Inventario local · sincronización preparada</div><div class="list" style="margin-top:14px">'+db.products.map(p=>'<div class="row"><div class="photo mini">'+img(p)+'</div><div class="grow"><b>'+esc(p.name)+'</b><br><small>'+esc(p.cat)+' · Stock '+p.stock+' · Mín. '+p.min+'</small></div><b>'+money(p.price)+'</b><button class="small-btn" onclick="edit('+p.id+')">Editar</button></div>').join("")+'</div></section>';
}
function clientes(){
  return '<section class="section"><div class="section-head"><h2>Clientes</h2><button class="btn primary" onclick="customerEdit()">+ Cliente</button></div><div class="list">'+(db.customers.length?db.customers.map(c=>{let debt=db.sales.filter(s=>s.customerId===c.id&&s.fiado).reduce((a,s)=>a+s.balance,0);return '<div class="row"><div class="grow"><b>'+esc(c.name)+'</b><br><small>'+esc(c.phone||"Sin teléfono")+' · '+(debt>0?'<span class="debt">Debe '+money(debt)+'</span>':"Cuenta al día")+'</small></div><button class="small-btn" onclick="customerEdit('+c.id+')">Editar</button>'+(debt>0?'<button class="small-btn" onclick="abono('+c.id+')">Abono</button>':"")+'</div>'}).join(""):'<div class="empty">No hay clientes.</div>')+'</div></section>';
}
function proveedores(){
  return '<section class="section"><div class="section-head"><h2>Proveedores</h2><button class="btn primary" onclick="supplierEdit()">+ Proveedor</button></div><div class="list">'+(db.suppliers.length?db.suppliers.map(s=>'<div class="row"><div class="grow"><b>'+esc(s.name)+'</b><br><small>'+esc(s.phone||"")+' · '+esc(s.note||"")+'</small></div><button class="small-btn" onclick="purchase('+s.id+')">+ Compra</button><button class="small-btn" onclick="supplierEdit('+s.id+')">Editar</button></div>').join(""):'<div class="empty">Registra tus proveedores para controlar compras y cuentas por pagar.</div>')+'</div></section>';
}
function compras(){
  return '<section class="section"><div class="section-head"><h2>Compras</h2><button class="btn primary" onclick="purchase()">+ Compra</button></div><div class="stat-grid"><div class="stat"><small>Compras</small><b>'+db.purchases.length+'</b></div><div class="stat"><small>Total</small><b>'+money(db.purchases.reduce((a,p)=>a+p.total,0))+'</b></div></div><h3>Historial</h3><div class="list">'+db.purchases.slice(-20).reverse().map(p=>'<div class="row"><div class="grow"><b>'+esc(p.supplierName)+'</b><br><small>'+new Date(p.date).toLocaleString("es-VE")+' · '+esc(p.status||"Registrada")+'</small></div><b>'+money(p.total)+'</b></div>').join("")+'</div></section>';
}
function gastos(){
  let total=db.expenses.reduce((a,e)=>a+e.amount,0);
  return '<section class="section"><div class="section-head"><h2>Gastos</h2><button class="btn primary" onclick="expenseEdit()">+ Gasto</button></div><div class="stat-grid"><div class="stat"><small>Acumulado</small><b>'+money(total)+'</b></div><div class="stat"><small>Movimientos</small><b>'+db.expenses.length+'</b></div></div><div class="list" style="margin-top:15px">'+db.expenses.slice(-20).reverse().map(e=>'<div class="row"><div class="grow"><b>'+esc(e.category)+'</b><br><small>'+esc(e.note||"")+' · '+new Date(e.date).toLocaleDateString("es-VE")+'</small></div><b>'+money(e.amount)+'</b></div>').join("")+'</div></section>';
}
function reportes(){
  let today=new Date().toISOString().slice(0,10), ss=db.sales.filter(s=>s.date.slice(0,10)===today),rev=ss.reduce((a,s)=>a+s.total,0),profit=ss.reduce((a,s)=>a+s.profit,0),exp=db.expenses.filter(e=>e.date.slice(0,10)===today).reduce((a,e)=>a+e.amount,0);
  let units=ss.reduce((a,s)=>a+s.items.reduce((x,i)=>x+i.qty,0),0),pending=db.sales.reduce((a,s)=>a+(s.balance||0),0);
  return '<section class="section"><h2>Reportes</h2><div class="stat-grid"><div class="stat"><small>Ventas hoy</small><b>'+money(rev)+'</b></div><div class="stat"><small>Ganancia estimada</small><b>'+money(profit)+'</b></div><div class="stat"><small>Unidades</small><b>'+units+'</b></div><div class="stat"><small>Gastos hoy</small><b>'+money(exp)+'</b></div></div><div class="notice">💳 Por cobrar: <b>'+money(pending)+'</b> · Inventario: <b>'+money(db.products.reduce((a,p)=>a+p.stock*p.cost,0))+'</b> al costo.</div><h3>Últimas ventas</h3><div class="list">'+db.sales.slice(-10).reverse().map(s=>'<div class="row"><div class="grow"><b>Recibo #'+String(s.number).padStart(5,"0")+'</b><br><small>'+new Date(s.date).toLocaleString("es-VE")+' · '+esc(s.payment)+'</small></div><b>'+money(s.total)+'</b></div>').join("")+'</div></section>';
}
function perfil(){
  return '<section class="section"><h2>Perfil y herramientas</h2><div class="list">'+
  menu("👥","Clientes","Cuentas, fiado y abonos","clientes")+
  menu("🏭","Proveedores","Compras y cuentas por pagar","proveedores")+
  menu("🛒","Compras","Entradas de inventario","compras")+
  menu("💸","Gastos","Control de gastos y salidas","gastos")+
  menu("🌐","Catálogo","Vista pública del inventario","catalogo")+
  menu("💰","Caja","Apertura, movimientos y cierre","caja-admin")+
  menu("🖨️","Impresora térmica","Configurar Bluetooth LE / prueba","printer")+
  menu("📦","Respaldo","Exportar/importar datos","backup")+
  menu("⚙️","Configuración","Tasa, negocio y preferencias","settings")+
  '<div class="row"><div class="grow"><b>Modo</b><br><small>'+ (navigator.onLine?"Internet disponible":"Sin Internet · los datos siguen locales")+'</small></div></div></div></section>';
}
function menu(icon,title,sub,target){return '<button class="menu-row" onclick="go(\''+target+'\')"><span class="menu-icon">'+icon+'</span><span class="grow"><b>'+title+'</b><small>'+sub+'</small></span><b>›</b></button>'}
function cajaAdmin(){
  let sales=db.sales.filter(s=>s.date.slice(0,10)===new Date().toISOString().slice(0,10)).reduce((a,s)=>a+s.total,0),exp=db.expenses.filter(e=>e.date.slice(0,10)===new Date().toISOString().slice(0,10)).reduce((a,e)=>a+e.amount,0);
  return '<section class="section"><h2>Caja</h2><div class="stat-grid"><div class="stat"><small>Estado</small><b>'+(db.cash.opened?"Abierta":"Cerrada")+'</b></div><div class="stat"><small>Ventas</small><b>'+money(sales)+'</b></div></div>'+(db.cash.opened?'<div class="notice">Apertura: '+money(db.cash.opening)+' · Esperado: '+money(db.cash.opening+sales-exp)+'</div><div class="actions"><button class="btn primary" onclick="cashMove()">Entrada/Salida</button><button class="btn" onclick="closeCash()">Cerrar caja</button></div>':'<button class="btn primary" onclick="openCash()">Abrir caja</button>')+'<h3>Movimientos</h3><div class="list">'+db.expenses.slice(-8).reverse().map(e=>'<div class="row"><div class="grow">'+esc(e.category)+'</div><b>'+money(e.amount)+'</b></div>').join("")+'</div></section>';
}
function catalogo(){
  return '<section class="section"><div class="section-head"><h2>Catálogo</h2><button class="small-btn" onclick="shareCatalog()">Compartir</button></div><p class="muted">Productos disponibles y precios actuales. Los cambios de inventario se reflejan automáticamente.</p><div class="grid">'+db.products.filter(p=>p.stock>0).map(card).join("")+'</div></section>';
}
function backup(){
  return '<section class="section"><h2>Respaldo y datos</h2><div class="notice">Los datos actuales se guardan localmente en el teléfono. Exporta periódicamente un respaldo.</div><div class="actions"><button class="btn primary" onclick="exportData()">⬇️ Exportar JSON</button><button class="btn" onclick="exportCSV()">📊 Exportar CSV</button><button class="btn" onclick="importData()">⬆️ Importar JSON</button></div><h3>Auditoría reciente</h3><div class="list">'+db.audit.slice(-12).reverse().map(a=>'<div class="row"><div class="grow"><b>'+esc(a.action)+'</b><br><small>'+new Date(a.date).toLocaleString("es-VE")+' · '+esc(a.detail)+'</small></div></div>').join("")+'</div></section>';
}
function bottom(){return '<nav class="bottom">'+[[ "caja","🧾","Caja"],["inventario","▣","Inventario"],["reportes","▥","Reportes"],["perfil","♙","Más"]].map(n=>'<button class="nav '+(state.screen===n[0]?"active":"")+'" onclick="go(\''+n[0]+'\')"><span>'+n[1]+'</span>'+n[2]+'</button>').join("")+"</nav>"}
function render(){
  let body={caja,inventario,clientes,proveedores,compras,gastos,reportes,perfil,catalogo,"caja-admin":cajaAdmin,printer:printer,backup:backup,settings:settingsView}[state.screen]||caja;
  $("#app").innerHTML='<div class="app">'+header()+body()+bottom()+"</div>";
  let q=$("#q");if(q){q.oninput=e=>{state.q=e.target.value;render()};q.focus();q.setSelectionRange(q.value.length,q.value.length)}
}
function go(s){state.screen=s;render()}
function cat(c){state.cat=c;render()}
function add(pid){let p=db.products.find(x=>x.id===pid);if(!p||p.stock<=0)return toast("Producto agotado");let i=state.cart.find(x=>x.id===pid);if(i)i.qty++;else state.cart.push({...p,qty:1});render()}
function qty(pid,d){let i=state.cart.find(x=>x.id===pid);if(!i)return;i.qty+=d;if(i.qty<1)state.cart=state.cart.filter(x=>x.id!==pid);render()}
function modal(html){let x=document.createElement("div");x.className="modal-wrap";x.innerHTML='<div class="modal">'+html+"</div>";document.body.append(x)}
function close(){document.querySelector(".modal-wrap")?.remove()}
function edit(pid){
  let p=pid?db.products.find(x=>x.id===pid):{id:id(),name:"",price:0,cost:0,stock:0,min:5,cat:"General",barcode:"",image:""};
  state.editing=p;
  modal('<h2>'+(pid?"Editar producto":"Nuevo producto")+'</h2>'+field("Nombre","n",p.name)+field("Código de barras","bc",p.barcode)+field("Precio USD","pr",p.price,"number")+field("Costo USD","co",p.cost,"number")+field("Stock","st",p.stock,"number")+field("Stock mínimo","mi",p.min,"number")+field("Categoría","ca",p.cat)+field("URL de foto","im",p.image)+'<div class="actions"><button class="btn primary" onclick="saveProduct()">Guardar</button><button class="btn" onclick="close()">Cancelar</button></div>');
}
function field(label,key,val,type="text"){return '<div class="field"><label>'+label+'</label><input id="'+key+'" type="'+type+'" value="'+esc(val)+'"></div>'}
function saveProduct(){
  let p=state.editing; Object.assign(p,{name:$("#n").value.trim()||"Producto",barcode:$("#bc").value.trim(),price:Number($("#pr").value)||0,cost:Number($("#co").value)||0,stock:Number($("#st").value)||0,min:Number($("#mi").value)||0,cat:$("#ca").value.trim()||"General",image:$("#im").value.trim()});
  if(!db.products.some(x=>x.id===p.id))db.products.push(p);save();log("Producto actualizado",p.name);close();render();toast("Producto guardado");
}
async function onlineSearch(){
  let q=prompt("Producto a buscar en Internet:",state.q||"Harina P.A.N.");if(!q)return;toast("Consultando productos online…");
  try{let u="https://world.openfoodfacts.org/cgi/search.pl?search_terms="+encodeURIComponent(q)+"&search_simple=1&action=process&json=1&page_size=10&fields=code,product_name,brands,image_front_url,quantity,categories";
    let d=await (await fetch(u)).json();window.results=d.products||[];
    modal('<h2>Resultados online</h2><div class="list">'+(window.results.length?window.results.map((p,i)=>'<div class="row"><div class="photo mini">'+(p.image_front_url?'<img src="'+esc(p.image_front_url)+'">':'🛍️')+'</div><div class="grow"><b>'+esc(p.product_name||"Sin nombre")+'</b><br><small>'+esc(p.brands||"")+' '+esc(p.quantity||"")+'<br>'+esc(p.code||"")+'</small></div><button class="small-btn" onclick="useOnline('+i+')">Usar</button></div>').join(""):'<div class="empty">No encontré coincidencias.</div>')+'</div><button class="btn" onclick="close()">Cerrar</button>');
  }catch(e){toast("Sin conexión para búsqueda online.")}
}
function useOnline(i){let p=window.results[i];db.products.push({id:id(),name:p.product_name||"Producto",price:0,cost:0,stock:0,min:3,cat:(p.categories||"General").split(",")[0].trim(),image:p.image_front_url||"",barcode:p.code||""});save();log("Producto importado",p.product_name||"");close();go("inventario")}
async function barcode(){
  if("BarcodeDetector" in window){
    toast("Lector de cámara disponible en este dispositivo; si no aparece, escribe el código.");
  }
  const code=prompt("Código de barras:","");
  if(code)findBarcode(code);
}
function findBarcode(code){let p=db.products.find(x=>x.barcode===code);if(p){state.q=p.name;state.cat="Todos";go("caja");add(p.id)}else{state.q=code;go("inventario");toast("Código no registrado. Puedes crear el producto.")}
}
function discount(){let sub=state.cart.reduce((a,i)=>a+i.price*i.qty,0),v=prompt("Descuento en USD:",state.discount||0);if(v!==null)state.discount=Math.min(sub,Math.max(0,Number(v)||0));render()}
function customerPick(){modal('<h2>Cliente</h2><div class="list">'+('<button class="row menu-row" onclick="selectCustomer(null)"><b>Consumidor final</b></button>')+db.customers.map(c=>'<button class="row menu-row" onclick="selectCustomer('+c.id+')"><div class="grow"><b>'+esc(c.name)+'</b><small>'+esc(c.phone||"")+'</small></div></button>').join("")+'</div><button class="btn" onclick="customerEdit();">+ Nuevo cliente</button>')}
function selectCustomer(cid){state.customerId=cid;close();render()}
function checkout(){
  if(!state.cart.length)return toast("Agrega productos");
  let sub=state.cart.reduce((a,i)=>a+i.price*i.qty,0),discount=Math.min(sub,state.discount||0),total=sub-discount;
  modal('<h2>Finalizar venta</h2><div class="notice">Total: <b>'+money(total)+'</b> · '+bs(total)+'</div>'+field("Método de pago","pay","Efectivo")+field("Monto recibido USD","received",total,"number")+'<div class="field"><label>Fiado</label><select id="fiado"><option value="no">No</option><option value="si">Sí</option></select></div><div class="actions"><button class="btn primary" onclick="finishSale('+total+','+discount+')">Confirmar cobro</button><button class="btn" onclick="close()">Cancelar</button></div>');
}
function finishSale(total,discount){
  let pay=$("#pay").value.trim()||"Efectivo",received=Number($("#received").value)||0,fiado=$("#fiado").value==="si";
  if(fiado&&!state.customerId)return toast("Selecciona un cliente para fiar");
  let balance=Math.max(0,total-received),items=state.cart.map(i=>({productId:i.id,name:i.name,qty:i.qty,price:i.price,cost:i.cost}));
  state.cart.forEach(i=>{let p=db.products.find(x=>x.id===i.id);if(p)p.stock=Math.max(0,p.stock-i.qty)});
  let sale={id:id(),number:db.sales.length+1,date:now(),payment:pay,total,subtotal:total+discount,discount,received,balance:fiado?balance:0,fiado,customerId:state.customerId,rate:db.settings.rate,items,profit:items.reduce((a,i)=>a+(i.price-i.cost)*i.qty,0)-discount};
  db.sales.push(sale);save();log("Venta registrada","Recibo #"+sale.number);state.cart=[];state.discount=0;close();receipt(sale);
}
function receipt(s){
  modal('<div class="receipt"><div class="center"><div class="logo-receipt">CAFÉ CRIOLLO</div><div>RECIBO #'+String(s.number).padStart(5,"0")+'</div><div>'+new Date(s.date).toLocaleString("es-VE")+'</div><div>PAGO: '+esc(s.payment)+'</div></div><hr><table><tr><th>CANT</th><th>PRODUCTO</th><th>PRECIO</th></tr>'+s.items.map(i=>'<tr><td>'+i.qty+'</td><td>'+esc(i.name)+'</td><td>'+money(i.price*i.qty)+'</td></tr>').join("")+'</table><hr><div>ARTÍCULOS: '+s.items.reduce((a,i)=>a+i.qty,0)+'</div><div>SUBTOTAL: '+money(s.subtotal)+'</div><div>DESCUENTO: −'+money(s.discount)+'</div><div class="big">TOTAL: '+money(s.total)+'</div><div class="big">'+bs(s.total)+'</div><div>Tasa usada: '+s.rate+'</div><div class="center thanks">¡Gracias por su compra!</div></div><div class="actions" style="margin-top:12px"><button class="btn primary" onclick="printTicket()">🖨️ Imprimir</button><button class="btn" onclick="shareReceipt()">📄 Compartir</button><button class="btn" onclick="close()">Cerrar</button></div>');
  window.receiptData=s;
}
function printTicket(){window.print();toast("Se abrió la impresión del comprobante.")}
async function shareReceipt(){
  let s=window.receiptData,t="CAFÉ CRIOLLO\\nRecibo #"+s.number+"\\nTotal "+money(s.total)+"\\n"+bs(s.total);
  if(navigator.share)try{await navigator.share({title:"Recibo Café Criollo",text:t})}catch(e){}
  else{await navigator.clipboard?.writeText(t);toast("Comprobante copiado.")}
}
function customerEdit(cid){
  let c=cid?db.customers.find(x=>x.id===cid):{id:id(),name:"",phone:"",address:"",note:""};
  modal('<h2>'+ (cid?"Editar cliente":"Nuevo cliente")+'</h2>'+field("Nombre","cn",c.name)+field("Teléfono","cp",c.phone)+field("Dirección","cad",c.address)+field("Nota","cno",c.note)+'<div class="actions"><button class="btn primary" onclick="saveCustomer('+c.id+','+(!cid)+')">Guardar</button><button class="btn" onclick="close()">Cancelar</button></div>');
  window.tmpCustomer=c;
}
function saveCustomer(cid,isNew){let c=window.tmpCustomer;Object.assign(c,{name:$("#cn").value.trim()||"Cliente",phone:$("#cp").value.trim(),address:$("#cad").value.trim(),note:$("#cno").value.trim()});if(isNew)db.customers.push(c);save();log("Cliente actualizado",c.name);close();state.screen="clientes";render()}
function abono(cid){let c=db.customers.find(x=>x.id===cid),debt=db.sales.filter(s=>s.customerId===cid&&s.fiado).reduce((a,s)=>a+s.balance,0),v=prompt("Abono para "+c.name+" (debe "+money(debt)+"):",debt);v=Number(v);if(!v||v<=0)return;let left=v;db.sales.filter(s=>s.customerId===cid&&s.balance>0).forEach(s=>{let p=Math.min(s.balance,left);s.balance-=p;left-=p;if(left<=0)return});db.payments.push({id:id(),customerId:cid,amount:v,date:now(),type:"Abono"});save();log("Abono registrado",c.name+" "+money(v));render();toast("Abono registrado")}
function supplierEdit(sid){
  let s=sid?db.suppliers.find(x=>x.id===sid):{id:id(),name:"",phone:"",note:""};
  modal('<h2>'+ (sid?"Editar proveedor":"Nuevo proveedor")+'</h2>'+field("Nombre","sn",s.name)+field("Teléfono","sp",s.phone)+field("Nota","so",s.note)+'<div class="actions"><button class="btn primary" onclick="saveSupplier('+s.id+','+(!sid)+')">Guardar</button><button class="btn" onclick="close()">Cancelar</button></div>');
  window.tmpSupplier=s;
}
function saveSupplier(idv,isNew){let s=window.tmpSupplier;Object.assign(s,{name:$("#sn").value.trim()||"Proveedor",phone:$("#sp").value.trim(),note:$("#so").value.trim()});if(isNew)db.suppliers.push(s);save();log("Proveedor actualizado",s.name);close();go("proveedores")}
function purchase(sid){
  if(!db.suppliers.length&&!sid)return supplierEdit();
  let opts=db.suppliers.map(s=>'<option value="'+s.id+'">'+esc(s.name)+'</option>').join("");
  let prod=db.products.map(p=>'<option value="'+p.id+'">'+esc(p.name)+'</option>').join("");
  modal('<h2>Registrar compra</h2><div class="field"><label>Proveedor</label><select id="ps">'+opts+'</select></div><div class="field"><label>Producto</label><select id="pp">'+prod+'</select></div>'+field("Cantidad","pq",1,"number")+field("Costo unitario USD","pc",0,"number")+field("Pago realizado USD","ppay",0,"number")+'<div class="actions"><button class="btn primary" onclick="savePurchase()">Registrar</button><button class="btn" onclick="close()">Cancelar</button></div>');
}
function savePurchase(){
  let s=db.suppliers.find(x=>x.id===Number($("#ps").value)),p=db.products.find(x=>x.id===Number($("#pp").value)),q=Number($("#pq").value)||0,c=Number($("#pc").value)||0,pay=Number($("#ppay").value)||0;if(!s||!p||q<=0)return toast("Completa los datos");
  p.stock+=q;if(c>0)p.cost=c;let total=q*c;db.purchases.push({id:id(),date:now(),supplierId:s.id,supplierName:s.name,total,paid:pay,balance:Math.max(0,total-pay),items:[{productId:p.id,qty:q,cost:c}]});save();log("Compra registrada",s.name+" · "+p.name);close();go("compras");toast("Compra registrada e inventario actualizado")}
function expenseEdit(){
  modal('<h2>Nuevo gasto</h2>'+field("Categoría","ec","Operativo")+field("Monto USD","ea",0,"number")+field("Nota","en","")+'<div class="actions"><button class="btn primary" onclick="saveExpense()">Guardar</button><button class="btn" onclick="close()">Cancelar</button></div>');
}
function saveExpense(){let amount=Number($("#ea").value)||0;if(amount<=0)return toast("Indica un monto");db.expenses.push({id:id(),date:now(),category:$("#ec").value.trim()||"Operativo",amount,note:$("#en").value.trim()});save();log("Gasto registrado",money(amount));close();go("gastos")}
function openCash(){let v=Number(prompt("Monto inicial de caja USD:","0"));if(v<0||isNaN(v))return;db.cash={opened:true,opening:v,openedAt:now(),closedAt:null,closing:0};save();log("Caja abierta",money(v));render()}
function cashMove(){let type=prompt("Tipo: Entrada o Salida","Entrada"),v=Number(prompt("Monto USD:","0"));if(!v||v<0)return;db.expenses.push({id:id(),date:now(),category:"Caja "+type,amount:type.toLowerCase().startsWith("sal")?-v:v,note:"Movimiento manual"});save();log("Movimiento de caja",type+" "+money(v));render()}
function closeCash(){let v=Number(prompt("Efectivo real al cierre USD:","0"));if(isNaN(v))return;db.cash.closing=v;db.cash.closedAt=now();db.cash.opened=false;save();log("Caja cerrada",money(v));toast("Caja cerrada");render()}
async function updateRate(){
  toast("Consultando tasa BCV…");
  let urls=["https://www.bcv.org.ve/","https://www.bcv.org.ve/estadisticas/mercado-cambiario"];
  for(let u of urls)try{let t=await (await fetch(u,{cache:"no-store"})).text();let m=t.match(/(?:USD|D[oó]lar)[\\s\\S]{0,500}?([0-9]{2,4}[.,][0-9]{2,6})/i);if(m){let r=Number(m[1].replace(/\\./g,"").replace(",","."));if(r>0){db.settings.rate=r;db.settings.lastRateUpdate=now();db.settings.rateSource="BCV";save();log("Tasa actualizada","BCV "+r);render();return}}}catch(e){}
  toast("BCV no respondió desde la app; se conserva la última tasa válida.")
}
function settingsView(){
  return '<section class="section"><h2>Configuración</h2>'+field("Negocio","bn",db.settings.business)+field("Tasa USD/Bs","br",db.settings.rate,"number")+'<div class="notice">Última actualización: '+(db.settings.lastRateUpdate?new Date(db.settings.lastRateUpdate).toLocaleString("es-VE"):"No registrada")+' · Fuente: '+esc(db.settings.rateSource)+'</div><div class="actions"><button class="btn primary" onclick="saveSettings()">Guardar</button><button class="btn" onclick="updateRate()">Actualizar BCV</button></div></section>';
}
function settings(){go("settings")}
function saveSettings(){db.settings.business=$("#bn").value.trim()||"Café Criollo";db.settings.rate=Number($("#br").value)||db.settings.rate;db.settings.rateSource="Manual";save();log("Configuración actualizada");go("perfil")}
async function printer(){
  modal('<h2>Impresora térmica</h2><p class="muted">Soporte BLE para impresoras compatibles con ESC/POS. El modelo debe exponer un servicio/característica de escritura BLE; Bluetooth clásico/SPP requiere un transporte nativo específico.</p><div class="actions"><button class="btn primary" onclick="connectPrinter()">🔵 Buscar impresora BLE</button><button class="btn" onclick="printTicket()">🖨️ Prueba de impresión</button><button class="btn" onclick="close()">Cerrar</button></div>');
}
async function connectPrinter(){
  try{
    let B=window.BleClient||window.Capacitor?.Plugins?.BluetoothLe;if(!B?.requestDevice)return toast("El puente BLE no está disponible en esta compilación.");
    await B.initialize?.({androidNeverForLocation:true});let d=await B.requestDevice({namePrefix:"",optionalServices:[]});window.printerDevice=d;toast("Impresora seleccionada: "+(d.name||d.deviceId));
  }catch(e){toast("No se pudo seleccionar la impresora BLE.")}
}
function shareCatalog(){let text=db.products.filter(p=>p.stock>0).map(p=>p.name+" — "+money(p.price)+" / "+bs(p.price)).join("\\n");if(navigator.share)navigator.share({title:"Catálogo Café Criollo",text});else{navigator.clipboard?.writeText(text);toast("Catálogo copiado")}}
function exportData(){let b=new Blob([JSON.stringify(db,null,2)],{type:"application/json"}),u=URL.createObjectURL(b),a=document.createElement("a");a.href=u;a.download="cafe-criollo-backup-"+new Date().toISOString().slice(0,10)+".json";a.click();URL.revokeObjectURL(u);log("Respaldo exportado")}
function exportCSV(){let rows=["Producto,Categoria,Stock,Precio USD,Costo USD,Barcode",...db.products.map(p=>[p.name,p.cat,p.stock,p.price,p.cost,p.barcode].map(v=>'"'+String(v??"").replace(/"/g,'""')+'"').join(","))],b=new Blob([rows.join("\\n")],{type:"text/csv"}),u=URL.createObjectURL(b),a=document.createElement("a");a.href=u;a.download="inventario-cafe-criollo.csv";a.click();URL.revokeObjectURL(u)}
function importData(){let i=document.createElement("input");i.type="file";i.accept=".json";i.onchange=async()=>{let f=i.files[0];if(!f)return;try{let d=JSON.parse(await f.text());if(!d.products||!d.sales)return toast("Respaldo inválido");db={...seed,...d};save();render();toast("Respaldo importado")}catch(e){toast("No pude leer el respaldo")}};i.click()}
window.go=go;window.cat=cat;window.add=add;window.selectCustomer=selectCustomer;window.qty=qty;window.edit=edit;window.saveProduct=saveProduct;window.onlineSearch=onlineSearch;window.useOnline=useOnline;window.barcode=barcode;window.discount=discount;window.customerPick=customerPick;window.checkout=checkout;window.finishSale=finishSale;window.printTicket=printTicket;window.shareReceipt=shareReceipt;window.customerEdit=customerEdit;window.saveCustomer=saveCustomer;window.abono=abono;window.supplierEdit=supplierEdit;window.saveSupplier=saveSupplier;window.purchase=purchase;window.savePurchase=savePurchase;window.expenseEdit=expenseEdit;window.saveExpense=saveExpense;window.openCash=openCash;window.cashMove=cashMove;window.closeCash=closeCash;window.settings=settings;window.saveSettings=saveSettings;window.updateRate=updateRate;window.printer=printer;window.connectPrinter=connectPrinter;window.shareCatalog=shareCatalog;window.exportData=exportData;window.exportCSV=exportCSV;window.importData=importData;window.close=close;
render();
if(navigator.onLine)setTimeout(updateRate,1200);
