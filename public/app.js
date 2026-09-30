
(function(){
  "use strict";

  /* =====================================================
     1) MENU STICKY — Portal ke <body> saat stuck
  ===================================================== */
  const menuWrap    = document.getElementById('pbEltPageMenuWrap');
  const menuList    = document.getElementById('pbEltPageMenuList');
  const menuLinks   = document.querySelectorAll('.pb-elt-page-menu a');
  const sentinel    = document.getElementById('pbEltMenuSentinel');
  const arrowLeft   = document.getElementById('pbMenuArrowLeft');
  const arrowRight  = document.getElementById('pbMenuArrowRight');
  const placeholder = document.getElementById('pbEltMenuPlaceholder');
  const originalParent = menuWrap ? menuWrap.parentNode : null;

  const swipeOverlay = document.getElementById('pbMenuSwipeOverlay');
  function hideSwipeOverlay() {
    if(swipeOverlay && !swipeOverlay.classList.contains('hidden')){
      swipeOverlay.classList.add('hidden');
    }
  }
  if(swipeOverlay) swipeOverlay.addEventListener('click', hideSwipeOverlay);

  function updateArrowState(){
    if(!menuList || !arrowLeft || !arrowRight) return;
    const maxScroll = menuList.scrollWidth - menuList.clientWidth - 1;
    arrowLeft.disabled  = menuList.scrollLeft <= 0;
    arrowRight.disabled = menuList.scrollLeft >= maxScroll || maxScroll <= 0;
  }

  if(menuList){
    menuList.addEventListener('scroll', function() {
      updateArrowState();
      hideSwipeOverlay();
    }, {passive:true});
    window.addEventListener('resize', updateArrowState);
    updateArrowState();
  }

  if(arrowLeft) arrowLeft.addEventListener('click', function(){
    menuList.scrollBy({left:-160, behavior:'smooth'});
    hideSwipeOverlay();
  });
  if(arrowRight) arrowRight.addEventListener('click', function(){
    menuList.scrollBy({left:160, behavior:'smooth'});
    hideSwipeOverlay();
  });

  function engageStuck(){
    if(!menuWrap || menuWrap.classList.contains('is-stuck')) return;
    const h = menuWrap.offsetHeight;
    const spacing = window.getComputedStyle(menuWrap);
    placeholder.style.height = h + 'px';
    placeholder.style.marginTop = spacing.marginTop;
    placeholder.style.marginBottom = spacing.marginBottom;
    placeholder.style.display = 'block';
    originalParent.insertBefore(placeholder, menuWrap);
    document.body.appendChild(menuWrap);
    menuWrap.classList.add('is-stuck');
  }
  function disengageStuck(){
    if(!menuWrap || !menuWrap.classList.contains('is-stuck')) return;
    placeholder.parentNode.insertBefore(menuWrap, placeholder);
    placeholder.style.display = 'none';
    menuWrap.classList.remove('is-stuck');
  }

  function updateStuckFixed() {
    if(!sentinel || !menuWrap) return;
    const rect = sentinel.getBoundingClientRect();
    if(rect.top < 0) { engageStuck(); } else { disengageStuck(); }
  }
  window.addEventListener('scroll', updateStuckFixed, {passive:true});
  window.addEventListener('resize', updateStuckFixed, {passive:true});
  updateStuckFixed();

  function getMenuOffset(){ return menuWrap ? menuWrap.getBoundingClientRect().height : 80; }
  function scrollToElement(target){
    if(!target) return;
    const top = target.getBoundingClientRect().top + window.pageYOffset - getMenuOffset() - 10;
    window.scrollTo({top: Math.max(top,0), behavior:'smooth'});
  }

  let highlightTimer = null;
  function highlightCard(cardEl){
    if(!cardEl) return;
    if(highlightTimer){ clearTimeout(highlightTimer); }
    document.querySelectorAll('.pb-elt-ket-card.pb-card-highlight').forEach(function(el){
      el.classList.remove('pb-card-highlight');
    });
    cardEl.classList.add('pb-card-highlight');
    highlightTimer = setTimeout(function(){ cardEl.classList.remove('pb-card-highlight'); }, 1700);
  }

  menuLinks.forEach(function(link){
    link.addEventListener('click', function(e){
      e.preventDefault();
      hideSwipeOverlay();
      menuLinks.forEach(function(l){ l.classList.remove('is-active'); });
      link.classList.add('is-active');

      const cardId = link.getAttribute('data-card');
      if(cardId){
        const cardEl = document.querySelector('.pb-elt-ket-card[data-card-id="'+cardId+'"]');
        if(cardEl){ scrollToElement(cardEl); highlightCard(cardEl); }
        return;
      }
      const targetId = link.getAttribute('data-target');
      if(targetId){
        const el = document.getElementById(targetId);
        scrollToElement(el);
      }
    });
  });

  /* =====================================================
     2) SCROLL TO TOP BTN
  ===================================================== */
  const scrollTopBtn = document.getElementById('pbScrollTopBtn');
  window.addEventListener('scroll', function() {
    if (window.scrollY > 400) { scrollTopBtn.classList.add('visible'); }
    else { scrollTopBtn.classList.remove('visible'); }
  }, {passive:true});
  if(scrollTopBtn) {
    scrollTopBtn.addEventListener('click', function() {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }


})();

(function () {
  "use strict";

  const iframe = document.getElementById("pbScheduleIframe");
  const wrapper = document.getElementById("pbScheduleEmbed");
  const fullLink = document.getElementById("pbScheduleFullLink");
  if (!iframe || !wrapper || iframe.dataset.pbAutoHeight === "ready") return;
  iframe.dataset.pbAutoHeight = "ready";

  const EXTRA_SPACE = 4; // Ruang kecil untuk pembulatan piksel, bukan tambahan 30px.
  let lastHeight = 0;
  let gotHeight = false;
  let requestTimers = [];
  let fallbackTimer;
  let resizeTimer;

  function requestHeight() {
    if (iframe.isConnected && iframe.contentWindow) {
      iframe.contentWindow.postMessage({ type:"PB_ELT_REQUEST_HEIGHT" }, "*");
    }
  }

  function applyHeight(value) {
    const height = Number(value);
    if (!Number.isFinite(height) || height <= 0) return;

    const finalHeight = Math.ceil(height) + EXTRA_SPACE;
    if (finalHeight !== lastHeight) {
      // Inline !important mengalahkan height:500px !important dan aturan tema.
      iframe.style.setProperty("height", finalHeight + "px", "important");
      lastHeight = finalHeight;
    }

    // Wrapper memakai height:auto agar mengikuti tinggi iframe, termasuk saat mengecil.
    iframe.setAttribute("scrolling", "no");
    gotHeight = true;
    clearTimeout(fallbackTimer);
    if (fullLink) fullLink.hidden = true;
  }

  function isGoogleOrigin(origin) {
    try {
      const url = new URL(origin);
      return url.protocol === "https:" && (
        url.hostname === "script.google.com" ||
        url.hostname.endsWith(".googleusercontent.com")
      );
    } catch (_) { return false; }
  }

  window.addEventListener("message", function (event) {
    if (!iframe.isConnected || !isGoogleOrigin(event.origin)) return;
    if (!event.data || event.data.type !== "PB_ELT_HEIGHT") return;
    // Apps Script dapat mengirim dari iframe sandbox Google yang berada di dalam iframe utama.
    applyHeight(event.data.height);
  });

  function startRequests() {
    requestTimers.forEach(clearTimeout);
    requestTimers = [0, 200, 600, 1400, 3000, 6000, 10000, 16000].map(function (delay) {
      return setTimeout(requestHeight, delay);
    });
    clearTimeout(fallbackTimer);
    if (!gotHeight) {
      fallbackTimer = setTimeout(function () {
        // Tidak mengaktifkan scrollbar. Sediakan akses ke seluruh jadwal jika pengirim tinggi belum terpasang.
        if (!gotHeight && iframe.isConnected && fullLink) fullLink.hidden = false;
      }, 18000);
    }
  }

  function onWidthChange() {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(requestHeight, 150);
  }

  iframe.addEventListener("load", startRequests);
  window.addEventListener("resize", onWidthChange, { passive:true });

  if (typeof ResizeObserver !== "undefined") {
    let lastWidth = wrapper.getBoundingClientRect().width;
    const observer = new ResizeObserver(function (entries) {
      const width = entries[0].contentRect.width;
      if (Math.abs(width - lastWidth) > 1) {
        lastWidth = width;
        onWidthChange();
      }
    });
    observer.observe(wrapper);
  }

  // Meminta tinggi juga jika iframe selesai dimuat sebelum listener load dipasang.
  startRequests();
})();


  function openPaymentPopup(type) {
    const popup = document.getElementById("paymentPopup");
    const title = document.getElementById("popupTitle");
    const content = document.getElementById("popupContent");
    const daftarBtn = document.getElementById("popupDaftarBtn");

    if (type === "pusatbahasa") {
      content.innerHTML = `
        <p>
          Pendaftar melalui <strong>pusatbahasa.org</strong> membayar ke rekening
          <strong>BNI Pusat Bahasa FIB Unpad</strong>.
        </p>

        <p>
          Nomor Rekening:<br>
          <strong style="font-size: 18px;">9882340518242501</strong>
        </p>

        <small>
          Mohon melakukan konfirmasi setelah pembayaran melalui laman pendaftaran.
        </small>

        <p class="pb-elt-refund-note">
          <b>Catatan:</b> Setiap pembayaran melalui transfer tidak dapat direfund/dikembalikan dengan alasan apa pun.
        </p>
      `;

      daftarBtn.href = "https://pusatbahasa.org";
    }

    if (type === "unpad") {
      content.innerHTML = `
        <p>
          Pendaftar melalui <strong>pendaftaran.unpad.ac.id</strong> membayar
          melalui <strong>Nomor Pendaftaran/Tagihan</strong> pada laman
          pendaftaran masing-masing.
        </p>

        <p>
          Contoh Nomor Pendaftaran/Tagihan:<br>
          <strong style="font-size: 18px;">4042600</strong>
        </p>

        <small>
          Mohon memastikan Nomor Pendaftaran/Tagihan sesuai dengan yang muncul
          pada laman pendaftaran.
        </small>

        <p class="pb-elt-refund-note">
          <b>Catatan:</b> Setiap pembayaran melalui transfer tidak dapat direfund/dikembalikan dengan alasan apa pun.
        </p>
      `;

      daftarBtn.href = "https://pendaftaran.unpad.ac.id";
    }

    popup.classList.add("active");
  }

  function closePaymentPopup() {
    document.getElementById("paymentPopup").classList.remove("active");
  }

  document.getElementById("paymentPopup").addEventListener("click", function(e) {
    if (e.target === this) {
      closePaymentPopup();
    }
  });


  function eltOpenModal(){
    document.getElementById('eltCheckEmail').checked = false;
    document.getElementById('eltNextBtn1').disabled = true;
    document.getElementById('eltHint1').style.display = 'block';

    const nextBtn2 = document.getElementById('eltNextBtn2');
    const spamConfirm = document.getElementById('eltSpamConfirm');
    if(nextBtn2) nextBtn2.disabled = true;
    if(spamConfirm){
      spamConfirm.classList.remove('done');
      spamConfirm.textContent = 'Klik gambar folder Spam di atas untuk melanjutkan menghubungi kontak layanan cetak sertifikat.';
    }

    eltGoToStep(1);
    document.getElementById('eltModalOverlay').classList.add('active');
  }
  function eltCloseModal(){
    document.getElementById('eltModalOverlay').classList.remove('active');
  }
  function eltGoToStep(step){
    document.getElementById('eltPanel1').classList.toggle('active', step===1);
    document.getElementById('eltPanel2').classList.toggle('active', step===2);
    document.getElementById('eltPanel3').classList.toggle('active', step===3);
    document.getElementById('eltStepDot1').classList.toggle('done', step>=1);
    document.getElementById('eltStepDot2').classList.toggle('done', step>=2);
    document.getElementById('eltStepDot3').classList.toggle('done', step>=3);
  }
  function eltConfirmSpam(){
    const nextBtn2 = document.getElementById('eltNextBtn2');
    const spamConfirm = document.getElementById('eltSpamConfirm');

    if(nextBtn2) nextBtn2.disabled = false;
    if(spamConfirm){
      spamConfirm.classList.add('done');
      spamConfirm.textContent = 'Gambar folder Spam sudah diklik. Anda dapat melanjutkan ke kontak layanan cetak sertifikat.';
    }
  }

  function eltUpdateStep1(){
    const emailOk = document.getElementById('eltCheckEmail').checked;
    document.getElementById('eltNextBtn1').disabled = !emailOk;
    document.getElementById('eltHint1').style.display = emailOk ? 'none' : 'block';
  }
  document.getElementById('eltModalOverlay').addEventListener('click', function(e){
    if(e.target === this) eltCloseModal();
  });

  /* ===== Zoom (lightbox) untuk gambar folder Spam =====
     Klik/keyboard pada gambar membuka lightbox dan membuka kunci tombol Lanjut. */
  (function(){
    const shot = document.getElementById('eltSpamShot');
    const zoomOverlay = document.getElementById('eltZoomOverlay');
    const zoomImg = document.getElementById('eltZoomImg');
    const zoomClose = document.getElementById('eltZoomClose');
    const sourceImg = shot ? shot.querySelector('img') : null;

    function openZoom(){
      if(!sourceImg) return;
      eltConfirmSpam();
      zoomImg.src = sourceImg.src;
      zoomOverlay.classList.add('active');
    }
    function closeZoom(){
      zoomOverlay.classList.remove('active');
    }

    if(shot){
      shot.addEventListener('click', openZoom);
      shot.addEventListener('keydown', function(e){
        if(e.key === 'Enter' || e.key === ' '){ e.preventDefault(); openZoom(); }
      });
    }
    zoomClose.addEventListener('click', closeZoom);
    zoomOverlay.addEventListener('click', function(e){ if(e.target===zoomOverlay || e.target===zoomImg) closeZoom(); });

  })();


(function(){
  const main=document.getElementById('mainContent');
  const menu=document.getElementById('pbEltPageMenuWrap');
  const dialogs=['paymentPopup','eltModalOverlay','eltZoomOverlay'].map(id=>document.getElementById(id));
  const returns=new Map();
  let current=null;
  let savedOverflow='';
  function visibleControls(dialog){return Array.from(dialog.querySelectorAll('a[href],button:not([disabled]),input:not([disabled]),[tabindex="0"]')).filter(el=>el.getClientRects().length>0);}
  function sync(){
    const active=dialogs.filter(dialog=>dialog.classList.contains('active'));
    dialogs.forEach(dialog=>dialog.setAttribute('aria-hidden',dialog.classList.contains('active')?'false':'true'));
    const top=active.at(-1)||null;
    if(!current&&top){savedOverflow=document.body.style.overflow;document.body.style.overflow='hidden';}
    if(current&&!top)document.body.style.overflow=savedOverflow;
    main.inert=Boolean(top);menu.inert=Boolean(top);
    if(top!==current){
      const old=current;current=top;
      if(top&&!returns.has(top)){returns.set(top,document.activeElement);(visibleControls(top)[0]||top).focus();}
      if(old&&!active.includes(old)){
        const target=returns.get(old);returns.delete(old);
        if(target&&target.isConnected)target.focus({preventScroll:true});
      }
    }
  }
  dialogs.forEach(dialog=>{dialog.tabIndex=-1;new MutationObserver(sync).observe(dialog,{attributes:true,attributeFilter:['class']});});
  document.addEventListener('keydown',event=>{
    if(!current)return;
    if(event.key==='Escape'){event.preventDefault();current.classList.remove('active');return;}
    if(event.key!=='Tab')return;
    const controls=visibleControls(current),first=controls[0],last=controls.at(-1);
    if(!first){event.preventDefault();current.focus();return;}
    if(event.shiftKey&&(document.activeElement===first||!current.contains(document.activeElement))){event.preventDefault();last.focus();}
    else if(!event.shiftKey&&(document.activeElement===last||!current.contains(document.activeElement))){event.preventDefault();first.focus();}
  });
  const originalStep=window.eltGoToStep;
  window.eltGoToStep=function(step){
    if(step===2&&!document.getElementById('eltCheckEmail').checked)return;
    if(step===3&&document.getElementById('eltNextBtn2').disabled)return;
    originalStep(step);
    if(current===document.getElementById('eltModalOverlay'))(visibleControls(current)[0]||current).focus();
  };
  const links=Array.from(document.querySelectorAll('.pb-elt-page-menu a[href^="#"]'));
  links.forEach(link=>link.addEventListener('click',()=>{
    const target=document.querySelector(link.getAttribute('href'));
    if(target)history.replaceState(null,'',link.getAttribute('href'));
  }));
  const observer=new IntersectionObserver(entries=>{
    const visible=entries.filter(entry=>entry.isIntersecting).sort((a,b)=>a.boundingClientRect.top-b.boundingClientRect.top);
    if(!visible.length)return;
    const id=visible[0].target.id;
    links.forEach(link=>{
      const selected=link.getAttribute('href')==='#'+id;
      link.classList.toggle('is-active',selected);
      if(selected)link.setAttribute('aria-current','location');else link.removeAttribute('aria-current');
    });
  },{rootMargin:'-110px 0px -55% 0px',threshold:0});
  links.map(link=>document.querySelector(link.getAttribute('href'))).filter(Boolean).forEach(section=>observer.observe(section));
  const hint=document.getElementById('pbMenuSwipeOverlay');
  if(hint)setTimeout(()=>hint.classList.add('hidden'),4000);
})();
