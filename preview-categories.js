/* Preview experience. Catalog, availability and order calculations remain in app.js. */
(() => {
  const icons = {
    back:'<path d="m14 6-6 6 6 6"/>',
    arrow:'<path d="M5 12h14m-6-6 6 6-6 6"/>',
    search:'<circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 5 5"/>',
    menu:'<rect x="3" y="3" width="7" height="7" rx="2"/><rect x="14" y="3" width="7" height="7" rx="2"/><rect x="3" y="14" width="7" height="7" rx="2"/><rect x="14" y="14" width="7" height="7" rx="2"/>',
    bag:'<path d="M5 7h14l1 14H4L5 7Z"/><path d="M9 8V6a3 3 0 0 1 6 0v2"/>',
    moon:'<path d="M20 14.5A8.5 8.5 0 0 1 9.5 4 8.5 8.5 0 1 0 20 14.5Z"/>',
    sun:'<circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1.5 1.5m11 11L19 19M5 19l1.5-1.5m11-11L19 5"/>',
    info:'<circle cx="12" cy="12" r="9"/><path d="M12 11v6m0-10v.1"/>',
    minus:'<path d="M5 12h14"/>',
    plus:'<path d="M12 5v14M5 12h14"/>',
    check:'<path d="m5 12 4 4L19 6"/>',
    clock:'<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    card:'<rect x="3" y="5" width="18" height="14" rx="3"/><path d="M3 10h18M7 15h3"/>'
  };
  const svg = name => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.65" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${icons[name] || icons.arrow}</svg>`;
  const esc = escapeHtml;
  const money = value => '$' + value.toFixed(2);
  const categoryOf = item => item.cat === 'Matcha' ? 'Bebidas Frías' : item.cat;
  const presentation = {
    'Bebidas Calientes':{title:'Bebidas calientes',short:'Calientes',note:'Espresso, leche y chocolate.',img:'miniaturas/bc-catpuccino.jpg',tone:'warm'},
    'Bebidas Frías':{title:'Bebidas frías',short:'Frías',note:'Café con hielo, matcha y algo fresco.',img:'assets/portada-bebidas-frias.jpeg',tone:'cool'},
    'Snack Dulce':{title:'Algo dulce',short:'Dulce',note:'Un antojo para acompañar tu café.',img:'assets/galleta.jpeg',tone:'sweet'},
    'Snack Sal':{title:'Algo salado',short:'Salado',note:'Hojaldre, queso y papas crocantes.',img:'assets/image-b46285ee20adcc24.jpg',tone:'savory'}
  };
  const categories = () => [...new Set(visibleCats().map(c => c === 'Matcha' ? 'Bebidas Frías' : c))];
  const meta = c => presentation[c] || {title:c,short:c,note:'Hecho en Clowder.',img:catalog().find(i=>categoryOf(i)===c)?.img};
  const catalog = () => MENU.filter(i=> !HIDDEN_ITEM_IDS.includes(i.id) && !HIDDEN_CATS.includes(i.cat) && isWithinAvailability(i));
  const normalize = text => text.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'');
  const state = {screen:'home',cat:'Bebidas Calientes',query:'',itemId:null,returnTo:'category',draft:null};
  let depth = 0;
  let toastTimer;
  const main = document.getElementById('menu');
  const legacyHeader = document.querySelector('.sticky-top');
  legacyHeader.hidden = true;
  const shell = document.createElement('div');
  shell.className = 'experience-header';
  shell.innerHTML = `<div class="experience-header-inner"><div id="experienceIdentity"></div><div class="experience-tools"><button class="icon-button" data-action="theme" id="experienceTheme" aria-label="Cambiar tema"></button><button class="icon-button" data-action="info" aria-label="Información y ayuda">${svg('info')}</button></div></div>`;
  legacyHeader.before(shell);
  const navigation = document.createElement('nav');
  navigation.className = 'experience-nav';
  navigation.setAttribute('aria-label','Navegación principal');
  navigation.innerHTML = `<div><button data-action="home" data-dest="home">${svg('menu')}<span>Explorar</span></button><button data-action="search" data-dest="search">${svg('search')}<span>Buscar</span></button><button data-action="cart" data-dest="cart">${svg('bag')}<span>Mi pedido</span><b class="order-count" hidden></b><small class="order-amount"></small></button></div>`;
  document.body.append(navigation);
  const toast = document.createElement('div');
  toast.className = 'experience-toast'; toast.setAttribute('role','status');toast.setAttribute('aria-live','polite');
  document.body.append(toast);
  const logo = () => `<span class="cat-mark"><img src="assets/clowder-gatito-dia.png" data-logo-day="assets/clowder-gatito-dia.png" data-logo-night="assets/clowder-gatito-noche.png" alt="Clowder"></span>`;
  const panels = {cart:'overlay',help:'guideOverlay',payments:'paymentsOverlay',hours:'hoursOverlay',big:'bigOrderOverlay'};
  const titles = {home:'Clowder · Beta',category:'El menú',search:'Buscar',detail:'Tu elección',cart:'Mi pedido',info:'En Clowder',help:'Cómo pedir',payments:'Transferencias',hours:'Horarios',big:'Pedidos grandes'};
  function notify(message){toast.innerHTML=svg('check')+`<span>${esc(message)}</span>`;toast.classList.add('visible');clearTimeout(toastTimer);toastTimer=setTimeout(()=>toast.classList.remove('visible'),2200);}
  function syncTheme(){
    const light=document.body.classList.contains('light-theme');
    const button=document.getElementById('experienceTheme');
    button.innerHTML=svg(light?'moon':'sun');button.setAttribute('aria-label',light?'Cambiar a modo noche':'Cambiar a modo día');
    document.querySelectorAll('img[data-logo-day]').forEach(img=>{const src=light?img.dataset.logoDay:img.dataset.logoNight;if(img.getAttribute('src')!==src)img.src=src;});
  }
  function syncChrome(){
    document.body.dataset.screen=state.screen;
    const back = state.screen === 'detail' || state.screen === 'category' || state.screen === 'info' || Boolean(panels[state.screen]);
    document.getElementById('experienceIdentity').innerHTML = back
      ? `<button class="back-button" data-action="back" aria-label="Volver">${svg('back')}</button><span class="header-context">${esc(titles[state.screen])}</span>`
      : `${logo()}<span class="header-context">${esc(titles[state.screen])}</span>`;
    const active=state.screen==='cart'||(state.screen==='detail'&&state.returnTo==='cart')?'cart':state.screen==='search'||(state.screen==='detail'&&state.returnTo==='search')?'search':'home';
    navigation.querySelectorAll('[data-dest]').forEach(b=>{const selected=b.dataset.dest===active;b.classList.toggle('active',selected);if(selected)b.setAttribute('aria-current','page');else b.removeAttribute('aria-current');});
    syncTheme();syncOrder();
  }
  function snapshot(){return {screen:state.screen,cat:state.cat,query:state.query,itemId:state.itemId,returnTo:state.returnTo};}
  function go(screen,changes={}){
    if(screen===state.screen && Object.entries(changes).every(([key,value])=>state[key]===value)){window.scrollTo({top:0,behavior:'instant'});return;}
    history.replaceState({clowderPreview:true,depth,...snapshot(),scroll:scrollY},'');
    Object.assign(state,changes,{screen});
    depth++;history.pushState({clowderPreview:true,depth,...snapshot()},'',`#${screen}`);
    renderMenu();window.scrollTo({top:0,behavior:'instant'});
    main.querySelector('h1')?.focus({preventScroll:true});
  }
  function back(){if(depth>0)history.back();else go('home');}
  window.addEventListener('popstate',e=>{if(e.state?.clowderPreview){depth=e.state.depth;Object.assign(state,e.state);if(state.screen==='detail')prepareDraft(state.itemId);renderMenu();requestAnimationFrame(()=>window.scrollTo({top:e.state.scroll||0,behavior:'instant'}));}else{depth=0;state.screen='home';renderMenu();}});
  history.scrollRestoration='manual';
  history.replaceState({clowderPreview:true,depth:0,...snapshot()},'',location.pathname+location.search+'#home');
  function productSet(cat,query=''){
    const words=normalize(query).trim().split(/\s+/).filter(Boolean);
    const rows=catalog().filter(i=>(!cat||categoryOf(i)===cat)&&words.every(w=>normalize([i.name,i.classic,i.desc,i.flavor,meta(categoryOf(i)).title,/espresso|americano|cappuccino|mocaccino|catpuccino|moccatto|ice latte/i.test([i.name,i.classic,i.desc].join(' '))?'café':''].filter(Boolean).join(' ')).includes(w)));
    const groups=new Set();
    return rows.filter(i=>{if(!i.group)return true;if(groups.has(i.group))return false;groups.add(i.group);return true;}).sort((a,b)=>(Number(Boolean(b.featured))-Number(Boolean(a.featured)))||((a.order??999)-(b.order??999))||a.price-b.price);
  }
  function productCard(item){
    const variants=item.group?catalog().filter(i=>i.group===item.group):[item];
    const available=variants.find(i=>!i.soldOut&&!i.comingSoon);
    if(available && (item.soldOut || item.comingSoon))item=available;
    const count=variants.reduce((n,i)=>n+(cart[i.id]?.qty||0),0);
    const status=!available?(item.comingSoon?'Próximamente':'Agotado'):'';
    const name=item.group?GROUP_NAMES[item.group]||item.name:item.name;
    const prices=variants.filter(i=>i.price>0).map(i=>i.price);
    const fromPrice=prices.length?Math.min(...prices):item.price;
    const selected=variants.filter(i=>cart[i.id]?.qty);
    const controls=selected.map(i=>`<div class="selected-line"><span>${variants.length>1?esc(i.flavor||i.name):'En tu pedido'}</span><div class="list-stepper" role="group" aria-label="Cantidad de ${esc(i.name)} ${esc(i.flavor||'')}"><button data-action="remove-one" data-id="${esc(i.id)}" aria-label="Quitar una unidad de ${esc(i.name)} ${esc(i.flavor||'')}">${svg('minus')}</button><output aria-label="Cantidad">${cart[i.id].qty}</output><button data-action="add" data-id="${esc(i.id)}" aria-label="Agregar otra unidad de ${esc(i.name)} ${esc(i.flavor||'')}" ${!canAddItem(i.id)||cart[i.id].qty>=itemQuantityLimit(i)?'disabled':''}>${svg('plus')}</button></div></div>`).join('');
    return `<article class="menu-product${count?' is-added':''}" data-product="${esc(item.id)}"><button class="product-photo" data-action="product" data-id="${esc(item.id)}" aria-label="Ver ${esc(name)}">${item.img?`<img src="${esc(item.img)}" alt="" loading="lazy" decoding="async">`:logo()}</button><div class="product-content"><button class="product-title" data-action="product" data-id="${esc(item.id)}">${esc(name)}</button><p>${esc(item.classic||item.desc||meta(categoryOf(item)).short)}</p><div class="product-purchase"><span class="product-price">${variants.length>1?'Desde ':''}${money(fromPrice)}</span>${status?`<span class="availability">${status}</span>`:count&&variants.length===1?'':`<button class="quick-add" data-action="${variants.length>1?'product':'add'}" data-id="${esc(item.id)}" aria-label="${variants.length>1?'Elegir':'Agregar'} ${esc(name)}">${svg('plus')}<span>${variants.length>1?'Elegir':'Agregar'}</span></button>`}</div><button class="product-customize" data-action="product" data-id="${esc(item.id)}">${status?'Ver detalles':count?'Cambiar opciones':'Ver detalles y opciones'} ${svg('arrow')}</button></div>${count?`<div class="product-selection">${controls}</div>`:''}</article>`;
  }
  function categoryBanner(cat){
    const banners=(CAT_BANNERS[cat]||[]).filter(b=>(b.day==null||b.day===new Date().getDay())&&(!b.productId||catalog().some(i=>i.id===b.productId&&!i.soldOut&&!i.comingSoon)));
    const b=banners[0];if(!b)return '';
    return `<details class="quiet-banner"><summary><span class="banner-label">De la casa</span><span class="banner-caption">${esc(b.alt)}</span><span class="banner-expand" aria-hidden="true">+</span></summary><div class="banner-art"><img src="${esc(b.img)}" alt="${esc(b.alt)}" loading="lazy" decoding="async">${b.productId?`<button data-action="product" data-id="${esc(b.productId)}">Ver este antojo ${svg('arrow')}</button>`:''}</div></details>`;
  }

  function categoryRail(){return `<nav class="category-rail" aria-label="Cambiar de categoría">${categories().map(c=>`<button data-action="category" data-cat="${esc(c)}" data-tone="${esc(meta(c).tone||'warm')}" ${c===state.cat?'aria-current="page"':''}>${esc(meta(c).short)}</button>`).join('')}</nav>`;}
  function home(){
    return `<section class="menu-welcome"><span class="eyebrow">QUÉ GUSTO TENERTE AQUÍ</span><h1 tabindex="-1">Tu próxima<br><span>pausa favorita.</span></h1><p>Mira el menú a tu ritmo. Si algo te antoja, agrégalo a tu pedido.</p><button class="welcome-help" data-action="help">¿Es tu primera vez? Te guiamos ${svg('arrow')}</button></section><div class="category-grid">${categories().map((cat,index)=>{const p=meta(cat);return `<button class="category-tile" data-tone="${p.tone||'warm'}" data-action="category" data-cat="${esc(cat)}"><span class="category-photo"><img src="${esc(p.img||'assets/clowder-gatito-dia.png')}" alt="" decoding="async"></span><span class="category-label"><strong>${esc(p.title)}</strong>${svg('arrow')}</span></button>`;}).join('')}</div><button class="discover-search" data-action="search">${svg('search')}<span>¿Ya sabes lo que quieres?<strong>Búscalo aquí</strong></span>${svg('arrow')}</button><footer class="experience-signature">Café y mucha personalidad.<span>Clowder Coffee House</span></footer>`;
  }
  function category(){const p=meta(state.cat);const products=productSet(state.cat);return `${categoryRail()}<section class="category-folder" data-tone="${p.tone||'warm'}"><div class="section-heading"><div><h1 tabindex="-1">${esc(p.title)}</h1><p>${esc(p.note)}</p></div><span class="product-count">${products.length}<small>opciones</small></span></div><div class="product-list">${products.map(productCard).join('')}</div>${categoryBanner(state.cat)}</section>`;}
  function searchResults(){
    const products=productSet(null,state.query);
    return `<p class="search-summary" role="status">${state.query?`${products.length} resultado${products.length===1?'':'s'}`:'Todo el menú, a tu alcance.'}</p>${products.length?`<div class="product-list">${products.map(productCard).join('')}</div>`:`<div class="quiet-empty"><h2>No encontramos ese antojo.</h2><p>Prueba con “café”, “matcha” o “galleta”.</p><button data-action="clear-search">Ver todo el menú</button></div>`}`;
  }
  function search(){return `<div class="section-heading"><div><span class="eyebrow">VE DIRECTO A TU FAVORITO</span><h1 tabindex="-1">¿Qué buscas?</h1></div></div><label class="menu-search">${svg('search')}<input id="menuSearch" type="search" placeholder="Café, matcha, algo dulce…" value="${esc(state.query)}" aria-label="Buscar en todo el menú" autocomplete="off"><button data-action="clear-search" aria-label="Limpiar búsqueda">×</button></label><div id="searchResults">${searchResults()}</div>`;}
  function prepareDraft(id){const existing=cart[id];state.itemId=id;state.draft={qty:existing?.qty||1,milk:existing?.milk||'',syrup:existing?.syrup||'',scoop:existing?.scoop||'',note:existing?.note||''};}
  function openProduct(id){const item=catalog().find(i=>i.id===id);if(!item)return;const returnTo=['search','cart'].includes(state.screen)?state.screen:'category';state.cat=categoryOf(item);prepareDraft(id);go('detail',{returnTo});}
  function draftUnit(){const i=MENU.find(p=>p.id===state.itemId),d=state.draft;return Math.round((i.price+(d.milk?0.5:0)+(d.syrup?0.5:0)+(d.scoop?0.75:0))*100)/100;}
  function choices(label,key,options){return `<fieldset class="product-options"><legend>${label}</legend><div>${options.map(o=>`<button type="button" data-action="option" data-key="${key}" data-value="${esc(o.value)}" aria-pressed="${state.draft[key]===o.value}"><span>${esc(o.label)}</span>${o.cost?`<small>+${money(o.cost)}</small>`:''}</button>`).join('')}</div></fieldset>`;}
  function detail(){
    const item=catalog().find(i=>i.id===state.itemId);
    if(!item)return `<div class="quiet-empty"><h1 tabindex="-1">Esta opción ya no está disponible.</h1><button data-action="home">Volver al menú</button></div>`;
    const d=state.draft;const existing=cart[item.id];const variants=item.group?catalog().filter(i=>i.group===item.group):[];
    const available=!item.soldOut&&!item.comingSoon;
    return `<div class="product-detail"><div class="detail-photo">${item.img?`<img src="${esc(d.scoop&&item.imgScoop?item.imgScoop:item.img)}" alt="${esc(item.name)}">`:logo()}<span class="detail-category">${esc(meta(categoryOf(item)).short)}</span></div><div class="detail-heading"><span class="eyebrow">${esc(item.classic||'PREPARADO EN CLOWDER')}</span><h1 tabindex="-1">${esc(item.name)}</h1><p>${esc(item.desc)}</p><span class="detail-base-price">${money(item.price)}</span><p class="choice-explainer">Precio base. Los extras muestran su costo; abajo verás el total antes de agregar.</p></div>${item.processTag?`<p class="detail-note">${esc(item.processTag)}</p>`:''}${variants.length>1?`<fieldset class="product-options"><legend>Elige tu favorito</legend><div>${variants.map(i=>`<button data-action="variant" data-id="${esc(i.id)}" aria-pressed="${i.id===item.id}"><span>${esc(i.flavor)}</span><small>${i.soldOut?'Agotado':i.comingSoon?'Próximamente':money(i.price)}</small></button>`).join('')}</div></fieldset>`:''}${available?`${item.milk?choices('Tu leche','milk',[{value:'',label:'Deslactosada'},{value:'almendra',label:'Almendra casera',cost:.5}]):''}${item.syrupOption?choices('Un toque extra','syrup',[{value:'',label:'Sin sirope'},...item.syrupOption.map(value=>({value,label:SYRUP_LABELS[value],cost:.5}))]):''}${item.scoop?choices('¿Con helado?','scoop',[{value:'',label:'Sin helado'},{value:'si',label:'Vainilla Madagascar',cost:.75}]):''}<label class="detail-instructions">¿Alguna indicación? (opcional)<textarea data-detail-note maxlength="500" rows="2" placeholder="Tu nota para la preparación…">${esc(d.note)}</textarea></label><div class="detail-order"><div class="detail-stepper"><button data-action="quantity" data-delta="-1" aria-label="Disminuir cantidad" ${d.qty<=1?'disabled':''}>−</button><output>${d.qty}</output><button data-action="quantity" data-delta="1" aria-label="Aumentar cantidad" ${d.qty>=itemQuantityLimit(item)?'disabled':''}>+</button></div><button class="primary-action" data-action="save-product">${existing?'Actualizar':'Agregar'} <span>· ${money(draftUnit()*d.qty)}</span></button></div>${existing?`<p class="detail-update-note">Actualiza las ${existing.qty} unidad${existing.qty===1?'':'es'} de este producto en tu pedido.</p>`:''}`:`<div class="unavailable-detail">${item.comingSoon?'Próximamente en el menú.':'Este producto está agotado por hoy.'}</div>`}</div>`;
  }
  function info(){return `<div class="section-heading"><div><span class="eyebrow">TODO A MANO</span><h1 tabindex="-1">En Clowder.</h1><p>Los detalles para disfrutar tu pausa.</p></div></div><div class="info-links">${[['help','info','Cómo pedir','De tu elección a WhatsApp.'],['hours','clock','Horarios','Consulta cuándo estamos atendiendo.'],['payments','card','Transferencias','Cuentas y datos para tu pago.']].map(([action,icon,title,note])=>`<button data-action="${action}">${svg(icon)}<span><strong>${title}</strong><small>${note}</small></span>${svg('arrow')}</button>`).join('')}</div>`;}
  renderMenu=function(){
    document.querySelectorAll('.overlay.open').forEach(el=>el.classList.remove('open'));
    const panel=panels[state.screen];main.hidden=Boolean(panel);
    if(panel){document.getElementById(panel).classList.add('open');}
    else main.innerHTML=({home,category,search,detail,info}[state.screen]||home)();
    syncChrome();
  };
  const originalUpdateBars=updateBars;
  function syncOrder(){
    const count=cartCount();const badge=navigation.querySelector('.order-count');badge.textContent=count;badge.hidden=!count;
    navigation.querySelector('.order-amount').textContent=count?money(grandTotal()):'';
    navigation.querySelector('[data-dest="cart"]').setAttribute('aria-label',count?`Mi pedido, ${count} productos, ${money(grandTotal())}`:'Mi pedido');
    document.body.classList.toggle('order-empty',count===0);
    if(!count)document.getElementById('cartList').innerHTML=`<div class="quiet-empty order-empty-state">${logo()}<h2>Tu pausa empieza<br>con una elección.</h2><p>Tu pedido te espera aquí.</p><button class="primary-action" data-action="home">Explorar el menú ${svg('arrow')}</button></div>`;
    else document.querySelectorAll('#cartList .cart-row').forEach((row,index)=>{if(!row.querySelector('.edit-product')){const id=Object.keys(cart)[index];const b=document.createElement('button');b.className='edit-product';b.dataset.action='edit-product';b.dataset.id=id;b.textContent='Personalizar';row.querySelector('.info').append(b);}});
  }
  updateBars=function(){originalUpdateBars();syncOrder();};
  function quickAdd(id){
    const before=cartCount();changeQty(id,1);
    if(cartCount()>before){notify(`${MENU.find(i=>i.id===id).name} en tu pedido`);if(!panels[state.screen]){const region=state.screen==='search'?document.getElementById('searchResults'):main;const scroll=scrollY;if(state.screen==='search')region.innerHTML=searchResults();else renderMenu();window.scrollTo({top:scroll,behavior:'instant'});}}
  }
  function saveProduct(){
    const id=state.itemId,item=catalog().find(i=>i.id===id);if(!item||!canAddItem(id))return;
    const d=state.draft;const existing=Boolean(cart[id]);
    cart[id]={qty:Math.max(1,Math.min(itemQuantityLimit(item),d.qty)),milk:item.milk?d.milk:'',syrup:item.syrupOption?.includes(d.syrup)?d.syrup:'',scoop:item.scoop&&ICE_CREAM_AVAILABLE?d.scoop:'',note:d.note.trim().slice(0,500)};
    updateBars();notify(existing?'Tu elección está actualizada':'Agregado a tu pedido');back();
  }
  document.addEventListener('click',e=>{
    const button=e.target.closest('[data-action]');if(!button)return;
    const {action,id,cat,key,value}=button.dataset;
    if(action==='theme'){toggleTheme();syncTheme();}
    else if(action==='back')back();
    else if(action==='home')go('home');
    else if(action==='category')go('category',{cat});
    else if(action==='search'){go('search');document.getElementById('menuSearch')?.focus();}
    else if(action==='clear-search'){state.query='';document.getElementById('menuSearch').value='';document.getElementById('searchResults').innerHTML=searchResults();document.getElementById('menuSearch').focus();}
    else if(action==='product'||action==='edit-product')openProduct(id);
    else if(action==='add')quickAdd(id);
    else if(action==='remove-one'){const y=scrollY;const name=MENU.find(i=>i.id===id)?.name;changeQty(id,-1);renderMenu();window.scrollTo({top:y,behavior:'instant'});notify(cart[id]?`${name}: ${cart[id].qty} en tu pedido`:`${name} eliminado del pedido`);(main.querySelector(`[data-action="remove-one"][data-id="${id}"]`)||main.querySelector(`[data-action="add"][data-id="${id}"]`))?.focus({preventScroll:true});}
    else if(action==='option'){state.draft[key]=value;const y=scrollY;renderMenu();window.scrollTo({top:y,behavior:'instant'});}
    else if(action==='variant'){prepareDraft(id);renderMenu();}
    else if(action==='quantity'){state.draft.qty=Math.min(itemQuantityLimit(MENU.find(i=>i.id===state.itemId)),Math.max(1,state.draft.qty+Number(button.dataset.delta)));const y=scrollY;renderMenu();window.scrollTo({top:y,behavior:'instant'});}
    else if(action==='save-product')saveProduct();
    else if(action==='payments')openPayments();
    else if(action==='hours')openHours('Horarios de atención','');
    else if(action==='help')openGuide();
    else if(action==='cart')openCart();
    else if(action==='info')go('info');
  });
  document.addEventListener('input',e=>{if(e.target.id==='menuSearch'){state.query=e.target.value;document.getElementById('searchResults').innerHTML=searchResults();}else if(e.target.matches('[data-detail-note]'))state.draft.note=e.target.value;});
  document.addEventListener('keydown',e=>{if(e.key==='Escape'&&state.screen!=='home'){e.preventDefault();e.stopImmediatePropagation();back();}},true);
  selectCat=c=>go('category',{cat:c==='Matcha'?'Bebidas Frías':c});
  expandCats=()=>go('home');
  openCart=()=>go('cart');closeCart=back;
  openGuide=()=>go('help');closeGuide=back;
  openPayments=()=>{renderBanks();document.getElementById('bankDetails').classList.remove('open');go('payments');};closePayments=back;
  const legacyHours=openHours;openHours=(...args)=>{legacyHours(...args);go('hours');};closeHours=back;
  openBigOrder=()=>go('big');closeBigOrder=back;
  sendOrder=async()=>notify('Beta de pruebas: aquí no se envían pedidos.');
  document.querySelector('#guideOverlay .drawer').innerHTML=`<div class="panel-title"><span class="eyebrow">BIENVENIDO A CLOWDER</span><h1>Mira, elige y disfruta.</h1><p class="guide-intro">Puedes recorrer el menú sin comprar. Agregar algo al pedido no envía un mensaje ni realiza un cobro.</p></div><ol class="simple-guide"><li><strong>Encuentra algo que te guste</strong><p>Toca Bebidas calientes, Bebidas frías, Algo dulce o Algo salado. En Buscar puedes escribir un nombre o un ingrediente, como café o matcha.</p></li><li><strong>Mira el precio y elige</strong><p>Toca la foto o “Ver detalles y opciones” para conocer el producto. Si tiene opciones, elige tu leche, sabor o extras. Cada extra indica cuánto cuesta.</p><p>“Agregar” pone el producto en tu pedido. Si aparece “Elegir”, primero escoge el sabor o tamaño.</p></li><li><strong>Cambia lo que necesites</strong><p>“En tu pedido” te muestra lo que ya agregaste. Usa + para sumar y − para quitar; al llegar a cero se elimina. “Cambiar opciones” te permite ajustar tu elección.</p></li><li><strong>Revisa Mi pedido</strong><p>El botón de abajo muestra tu total. Revisa los productos, escribe tu nombre y elige si es para servir, para llevar o delivery, cuando esté disponible.</p><p>Elige efectivo o transferencia. Si pagas en efectivo, indica con cuánto vas a pagar para calcular tu cambio, o toca “Pago exacto”. Para delivery, completa la dirección que se solicita.</p></li><li><strong>Envía el mensaje en WhatsApp</strong><p>En el menú oficial, “Enviar pedido por WhatsApp” abre un mensaje con tu pedido. Revisa ese mensaje y toca Enviar dentro de WhatsApp: abrirlo no lo envía automáticamente.</p><p class="guide-beta">Esta es una beta de pruebas: puedes explorar y armar un pedido, pero aquí no se envía ni se cobra.</p></li></ol><details class="guide-question"><summary>¿Puedo volver a mirar el menú?</summary><p>Sí. Toca Explorar o Buscar abajo. Tu pedido se conserva en este navegador mientras sigues mirando.</p></details><button class="primary-action" data-action="home">Ver el menú ${svg('arrow')}</button>`;

  Object.entries(panels).forEach(([screen,id])=>{
    if(screen==='help')return;
    const drawer=document.querySelector(`#${id} .drawer`);const heading=document.createElement('div');heading.className='panel-title';heading.innerHTML=`<span class="eyebrow">${screen==='cart'?'TU MOMENTO, LISTO PARA ARMAR':'CLOWDER COFFEE HOUSE'}</span><h1>${titles[screen]}</h1>${screen==='cart'?'<p class="guide-intro">Revisa tus cantidades y el total. Puedes seguir mirando el menú y volver aquí cuando quieras.</p><button class="welcome-help" data-action="help">¿Cómo termino mi pedido?</button>':''}`;drawer.prepend(heading);
  });
  new MutationObserver(syncTheme).observe(document.body,{attributes:true,attributeFilter:['class']});
  updateBars();renderMenu();
})();
