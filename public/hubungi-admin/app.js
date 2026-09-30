(function(){
  "use strict";


  function isMobileView(){ return window.matchMedia('(max-width:800px)').matches; }
  function setPbwaAppHeight(){
    var viewport = window.visualViewport;
    var height = viewport ? viewport.height : window.innerHeight;
    var top = viewport ? viewport.offsetTop : 0;
    document.documentElement.style.setProperty('--pbwa-app-height', Math.floor(height) + 'px');
    document.documentElement.style.setProperty('--pbwa-viewport-top', Math.floor(top) + 'px');
    document.documentElement.style.setProperty('--pbwa-keyboard-offset', '0px');
  }
  setPbwaAppHeight();
  window.addEventListener('resize', setPbwaAppHeight, {passive:true});
  if(window.visualViewport){
    window.visualViewport.addEventListener('resize', function(){ setPbwaAppHeight(); setTimeout(scrollBottom, 90); }, {passive:true});
    window.visualViewport.addEventListener('scroll', setPbwaAppHeight, {passive:true});
  }

  var KB_URL = "https://script.google.com/macros/s/AKfycbw8BDr4YckHvK_dpwVYSHEzeQc1ngOXqb_zfHC5twSl9wbR6ltJa48wpkrUGdaC9F-0dw/exec";
  var INSTAGRAM_URL = "https://www.instagram.com/unpadpusatbahasa";
  var ELT_PAGE_URL = "/";
  var LOGO_URL = "/assets/pusat-bahasa-icon.png";

  var body = document.getElementById("pbwa2Body");
  var input = document.getElementById("pbwa2Input");
  var send = document.getElementById("pbwa2Send");
  var statusEl = document.getElementById("pbwa2Status");
  var chatList = document.getElementById("pbwa2ChatList");
  var search = document.getElementById("pbwa2Search");
  var profile = document.getElementById("pbwa2Profile");
  var main = document.querySelector(".pbwa2-main");

  var kbState = "loading";
  var mainMenu = [];
  var intents = [];
  var started = false;
  var chatVersion = 0;

  function esc(s){
    var d = document.createElement("div");
    d.textContent = String(s == null ? "" : s);
    return d.innerHTML;
  }
  function decodeEntities(s){
    var txt = document.createElement("textarea");
    txt.innerHTML = String(s == null ? "" : s);
    return txt.value;
  }
  function normalize(s){
    return String(s || "")
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[?.,!;:()\[\]{}"']/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }
  function timeNow(){
    var d = new Date(), h = d.getHours(), m = d.getMinutes();
    return (h < 10 ? "0" : "") + h + ":" + (m < 10 ? "0" : "") + m;
  }
  function scrollBottom(){ if(body) body.scrollTop = body.scrollHeight; }

  function safeLink(value){
    try {
      var url = new URL(value, window.location.origin);
      if(!/^(https?:|mailto:|tel:)$/.test(url.protocol)) return null;
      if(url.hostname === 'pusatbahasa.fib.unpad.ac.id'){
        if(/^\/elt\/?$/.test(url.pathname)) return '/';
        if(/^\/hubungi-admin\/?$/.test(url.pathname)) return '/hubungi-admin/';
      }
      return url.href;
    } catch(e){ return null; }
  }

  function linkifyPlain(text){
    var wrap = document.createElement('div');
    var pattern = /https?:\/\/[^\s<>]+/g;
    var position = 0;
    var match;
    while((match = pattern.exec(text))){
      wrap.appendChild(document.createTextNode(text.slice(position, match.index)));
      var link = document.createElement('a');
      link.textContent = match[0];
      link.href = safeLink(match[0]);
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      wrap.appendChild(link);
      position = pattern.lastIndex;
    }
    wrap.appendChild(document.createTextNode(text.slice(position)));
    return wrap.innerHTML.replace(/\n/g, '<br>');
  }

  function sanitizeAdminHtml(value){
    var raw = decodeEntities(value).replace(/\\n/g, '\n');
    if(!/<\s*(br|a|b|strong|i|em|u|p|div|span|ul|ol|li|img)\b/i.test(raw)) return linkifyPlain(raw);
    var template = document.createElement('template');
    template.innerHTML = raw;
    template.content.querySelectorAll('script,style,iframe,object,embed,form,svg,math,link,meta').forEach(function(el){ el.remove(); });
    var allowed = ['BR','A','B','STRONG','I','EM','U','P','DIV','SPAN','UL','OL','LI','IMG'];
    template.content.querySelectorAll('*').forEach(function(el){
      if(allowed.indexOf(el.tagName) === -1){ el.replaceWith.apply(el, Array.from(el.childNodes)); return; }
      var href = el.getAttribute('href');
      var src = el.getAttribute('src');
      var alt = el.getAttribute('alt') || 'Ilustrasi panduan';
      Array.from(el.attributes).forEach(function(attr){ el.removeAttribute(attr.name); });
      if(el.tagName === 'A'){
        var url = safeLink(href || '');
        if(url){ el.setAttribute('href',url); el.setAttribute('target','_blank'); el.setAttribute('rel','noopener noreferrer'); }
      }
      if(el.tagName === 'IMG'){
        try {
          var image = new URL(src || '', window.location.origin);
          if(!/^(https?:)$/.test(image.protocol)) { el.remove(); return; }
          el.src = image.href;
          el.alt = alt;
          el.loading = 'lazy';
        } catch(e){ el.remove(); }
      }
    });
    return template.innerHTML.replace(/\n/g,'<br>');
  }

  function splitKeywords(v){
    return String(v || "")
      .split(/[,;|\n]+/)
      .map(function(x){ return normalize(x); })
      .filter(Boolean);
  }
  function parseBool(v){ return /^(true|ya|yes|1|tampil)$/i.test(String(v || "").trim()); }

  function normalizeKB(data){
    var result = { menu: [], intents: [] };

    if(data && Array.isArray(data.menu) && Array.isArray(data.intents)){
      result.menu = data.menu.filter(Boolean).map(String);
      result.intents = data.intents.map(function(i){
        var label = i.label || i.menu || i["Label Menu"] || "";
        var chips = i.chips || i.recommendations || i["Rekomendasi Klik"] || [];
        if(!Array.isArray(chips)) chips = String(chips || "").split(/[,;|]+/).map(function(x){ return x.trim(); }).filter(Boolean);
        var keywords = (i.keywords || i["Kata Kunci"] || i["Kata Kunci Peserta"] || []);
        if(!Array.isArray(keywords)) keywords = splitKeywords(keywords);
        keywords = keywords.map(normalize).filter(Boolean);
        if(label) keywords.push(normalize(label));
        return { label:String(label), keywords:keywords, answer:String(i.answer || i["Jawaban"] || ""), chips:chips };
      }).filter(function(i){ return i.keywords.length && i.answer; });
      return result;
    }

    var rows = [];
    if(Array.isArray(data)) rows = data;
    else if(data && Array.isArray(data.rows)) rows = data.rows;
    else if(data && Array.isArray(data.data)) rows = data.data;

    rows.forEach(function(r){
      var label = r["Label Menu"] || r.label || r.menu || r[0] || "";
      var kw = r["Kata Kunci"] || r.keywords || r["Kata Kunci Peserta"] || r[1] || "";
      var ans = r["Jawaban"] || r.answer || r[2] || "";
      var rec = r["Rekomendasi Klik"] || r.chips || r[3] || "";
      var tampil = r["Tampil di Menu Utama"] || r.tampil || r[4] || "";
      var chips = Array.isArray(rec) ? rec : String(rec || "").split(/[,;|]+/).map(function(x){ return x.trim(); }).filter(Boolean);
      var keywords = splitKeywords(kw);
      if(label) keywords.push(normalize(label));
      if(ans && keywords.length) result.intents.push({ label:String(label), keywords:keywords, answer:String(ans), chips:chips });
      if(label && parseBool(tampil) && result.menu.indexOf(String(label)) === -1) result.menu.push(String(label));
    });
    return result;
  }

  function buildChatList(){
    if(!chatList) return;
    var seed = mainMenu.length ? mainMenu : ["Jadwal & Kuota Ujian", "Cara Bayar", "Kartu Peserta/Email Konfirmasi", "Hasil & Sertifikat", "Kendala Ujian", "Kontak Admin/Helpdesk"];
    chatList.innerHTML = "";

    var first = document.createElement("button");
    first.type = "button";
    first.className = "pbwa2-chatitem active";
    first.innerHTML = '<div class="pbwa2-chatitem-avatar"><img src="' + LOGO_URL + '" alt="Logo"></div>' +
      '<div class="pbwa2-chatitem-main"><div class="pbwa2-chatitem-top"><div class="pbwa2-chatitem-name">Admin Pusat Bahasa</div><div class="pbwa2-chatitem-time">' + timeNow() + '</div></div>' +
      '<div class="pbwa2-chatitem-msg">Layanan informasi ELT & TKBI <span class="pbwa2-badge">1</span></div></div>';
    first.addEventListener("click", function(){ sendUserText("Halo admin"); });
    chatList.appendChild(first);

    seed.forEach(function(name){
      var item = document.createElement("button");
      item.type = "button";
      item.className = "pbwa2-chatitem";
      item.innerHTML = '<div class="pbwa2-chatitem-avatar">' + esc(String(name).charAt(0) || "?") + '</div>' +
        '<div class="pbwa2-chatitem-main"><div class="pbwa2-chatitem-top"><div class="pbwa2-chatitem-name">' + esc(name) + '</div><div class="pbwa2-chatitem-time">Info</div></div>' +
        '<div class="pbwa2-chatitem-msg">Klik untuk bertanya topik ini</div></div>';
      item.addEventListener("click", function(){ sendUserText(name); });
      chatList.appendChild(item);
    });
  }

  function addDate(){
    var el = document.createElement("div");
    el.className = "pbwa2-date";
    el.textContent = "HARI INI";
    body.appendChild(el);
  }

  function addMessage(text, who){
    if(!body) return;
    var row = document.createElement("div");
    row.className = "pbwa2-row " + (who === "user" ? "out" : "in");
    var bubble = document.createElement("div");
    bubble.className = "pbwa2-bubble";
    var content = who === "bot" ? sanitizeAdminHtml(text) : esc(text).replace(/\n/g, "<br>");
    bubble.innerHTML = content + '<span class="pbwa2-meta">' + timeNow() + (who === "user" ? '<span class="pbwa2-ticks">✓✓</span>' : '') + '</span>';
    row.appendChild(bubble);
    body.appendChild(row);
    scrollBottom();
  }

  function addChips(list){
    if(!body || !list || !list.length) return;
    var wrap = document.createElement("div");
    wrap.className = "pbwa2-chips";
    list.forEach(function(label){
      var chip = document.createElement("button");
      chip.type = "button";
      chip.className = "pbwa2-chip";
      chip.textContent = label;
      chip.addEventListener("click", function(){ wrap.remove(); sendUserText(label); });
      wrap.appendChild(chip);
    });
    body.appendChild(wrap);
    scrollBottom();
  }

  function typing(cb, delay){
    if(statusEl) statusEl.textContent = "mengetik...";
    var row = document.createElement("div");
    row.className = "pbwa2-row in";
    var version = chatVersion;
    row.innerHTML = '<div class="pbwa2-typing"><span></span><span></span><span></span></div>';
    body.appendChild(row);
    scrollBottom();
    setTimeout(function(){
      row.remove();
      if(version !== chatVersion) return;
      if(statusEl) statusEl.textContent = kbState === "ready" ? "tersambung" : (kbState === "error" ? "belum terhubung" : "menghubungkan...");
      if(cb) cb();
    }, delay || 650);
  }

  function findAnswer(q){
    var text = normalize(q);
    if(!text) return null;
    var best = null;
    var bestScore = 0;

    intents.forEach(function(intent){
      var score = 0;
      intent.keywords.forEach(function(k){
        if(!k) return;
        if(text === k) score += 10;
        else if(text.indexOf(k) !== -1) score += Math.max(4, k.split(" ").length * 2);
        else {
          var parts = k.split(" ").filter(function(x){ return x.length >= 4; });
          var hit = parts.filter(function(p){ return text.indexOf(p) !== -1; }).length;
          if(parts.length && hit >= Math.ceil(parts.length * .75)) score += hit;
        }
      });
      if(score > bestScore){ bestScore = score; best = intent; }
    });

    return bestScore > 0 ? best : null;
  }

  function sendUserText(text){
    text = String(text || "").trim();
    if(!text) return;
    var cmd = normalize(text);
    if(cmd === "restart" || cmd === "mulai ulang" || cmd === "ulang" || cmd === "new chat"){
      resetChat(true);
      if(input) input.value = "";
      return;
    }
    if(cmd === "hapus pesan" || cmd === "hapus chat" || cmd === "clear" || cmd === "clear chat"){
      clearMessages();
      if(input) input.value = "";
      return;
    }
    addMessage(text, "user");
    if(input) input.value = "";

    typing(function(){
      if(kbState === "loading"){
        addMessage("Sebentar ya kak, layanan informasi sedang disiapkan.", "bot");
        return;
      }
      if(kbState === "error"){
        addMessage("Maaf kak, layanan informasi belum tersambung. Silakan hubungi DM Instagram @unpadpusatbahasa:<br><a href=\"" + INSTAGRAM_URL + "\">" + INSTAGRAM_URL + "</a>", "bot");
        return;
      }

      var match = findAnswer(text);
      if(match){
        addMessage(match.answer, "bot");
        if(isMobileView()) addChips(match.chips.length ? match.chips : mainMenu);
      } else {
        addMessage(isMobileView() ? "Maaf kak, saya belum menemukan jawaban yang sesuai 🙏<br>Silakan pilih topik di bawah ini, ketik ulang pertanyaan, atau hubungi DM Instagram @unpadpusatbahasa:<br><a href=\"" + INSTAGRAM_URL + "\">" + INSTAGRAM_URL + "</a>" : "Maaf kak, saya belum menemukan jawaban yang sesuai 🙏<br>Silakan pilih topik pada sidebar kiri, ketik ulang pertanyaan, atau hubungi DM Instagram @unpadpusatbahasa:<br><a href=\"" + INSTAGRAM_URL + "\">" + INSTAGRAM_URL + "</a>", "bot");
        if(isMobileView()) setTimeout(function(){ addChips(mainMenu); }, 180);
      }
    }, 520 + Math.random() * 520);
  }

  function resetChat(silent){
    chatVersion++;
    if(body) body.innerHTML = "";
    started = false;
    startWelcome();
  }

  function clearMessages(){
    chatVersion++;
    if(body) body.innerHTML = "";
    started = false;
    addDate();
    addMessage("Pesan sudah dibersihkan. Silakan mulai pertanyaan baru ya kak.", "bot");
    if(isMobileView()) setTimeout(function(){ addChips(mainMenu); }, 160);
  }

  function startWelcome(){
    if(started || !body) return;
    started = true;
    addDate();
    addMessage("Halo! 👋 Selamat datang di layanan tanya-jawab ELT-TKBI Pusat Bahasa FIB Unpad.", "bot");
    typing(function(){
      if(kbState === "ready"){
        addMessage(isMobileView() ? "Ada yang bisa dibantu? Silakan ketik pertanyaan Anda, atau pilih topik di bawah ini." : "Ada yang bisa dibantu? Silakan ketik pertanyaan Anda, atau pilih topik pada sidebar kiri.", "bot");
        if(isMobileView()) setTimeout(function(){ addChips(mainMenu); }, 180);
      } else if(kbState === "loading"){
        addMessage("Sedang menyiapkan layanan informasi...", "bot");
      } else {
        addMessage("Maaf kak, layanan informasi belum tersambung. Silakan hubungi DM Instagram @unpadpusatbahasa:<br><a href=\"" + INSTAGRAM_URL + "\">" + INSTAGRAM_URL + "</a>", "bot");
      }
    }, 450);
  }

  function loadKB(){
    if(statusEl) statusEl.textContent = "menghubungkan...";
    var controller = new AbortController();
    var timeout = setTimeout(function(){ controller.abort(); }, 15000);
    fetch(KB_URL, { method:"GET", cache:"no-store", signal:controller.signal })
      .then(function(res){ if(!res.ok) throw new Error("HTTP " + res.status); return res.json(); })
      .then(function(data){
        var parsed = normalizeKB(data);
        if(!parsed.intents.length) throw new Error("Format data kosong/tidak sesuai");
        intents = parsed.intents;
        mainMenu = parsed.menu.length ? parsed.menu : Array.from(new Set(parsed.intents.map(function(i){ return i.label; }).filter(Boolean))).slice(0, 12);
        kbState = "ready";
        if(statusEl) statusEl.textContent = "tersambung";

        buildChatList();
        if(started){
          addMessage(isMobileView() ? "Layanan siap. Silakan lanjutkan pertanyaan Anda, atau pilih topik di bawah ini." : "Layanan siap. Silakan lanjutkan pertanyaan Anda.", "bot");
          if(isMobileView()) setTimeout(function(){ addChips(mainMenu); }, 180);
        }
      })
      .catch(function(err){
        console.warn("Gagal memuat database chatbot:", err);
        kbState = "error";
        if(statusEl) statusEl.textContent = "belum terhubung";
        buildChatList();
        if(started) addMessage('Layanan informasi belum tersambung. Silakan coba muat ulang halaman atau hubungi <a href="' + INSTAGRAM_URL + '">DM Instagram @unpadpusatbahasa</a>.', 'bot');
      })
      .finally(function(){ clearTimeout(timeout); });
  }

  function openProfile(){
    if(profile){ profile.classList.add("open"); profile.inert = false; profile.setAttribute("aria-hidden","false"); }
    document.getElementById("pbwa2ProfileName").setAttribute("aria-expanded","true");
    if(main) main.classList.add("profile-open");
    setTimeout(scrollBottom, 280);
  }
  function closeProfile(){
    if(profile){ profile.classList.remove("open"); profile.inert = true; profile.setAttribute("aria-hidden","true"); }
    document.getElementById("pbwa2ProfileName").setAttribute("aria-expanded","false");
    if(main) main.classList.remove("profile-open");
  }
  function goBack(){
    window.location.href = ELT_PAGE_URL;
  }

  if(send) send.addEventListener("click", function(){ sendUserText(input && input.value); });
  if(input) input.addEventListener("keydown", function(e){ if(e.key === "Enter"){ e.preventDefault(); sendUserText(input.value); } });
  if(search) search.addEventListener("input", function(){
    var q = normalize(search.value);
    Array.prototype.forEach.call(chatList ? chatList.children : [], function(item){
      item.style.display = normalize(item.textContent).indexOf(q) !== -1 ? "flex" : "none";
    });
  });

  ["pbwa2ProfileLogo", "pbwa2ProfileName"].forEach(function(id){
    var el = document.getElementById(id);
    if(el) el.addEventListener("click", openProfile);
  });
  document.addEventListener("keydown", function(e){ if(e.key === "Escape" && profile.classList.contains("open")){ closeProfile(); document.getElementById("pbwa2ProfileName").focus(); } });
  var profileClose = document.getElementById("pbwa2ProfileClose");
  if(profileClose) profileClose.addEventListener("click", closeProfile);

  var backBtn = document.getElementById("pbwa2Back");
  var closeBtn = document.getElementById("pbwa2Close");
  if(backBtn) backBtn.addEventListener("click", goBack);
  if(closeBtn) closeBtn.addEventListener("click", goBack);

  ["pbwa2NewChat", "pbwa2ResetTop"].forEach(function(id){
    var el = document.getElementById(id);
    if(el) el.addEventListener("click", function(){ resetChat(true); });
  });
  var clearBtn = document.getElementById("pbwa2ClearChat");
  if(clearBtn) clearBtn.addEventListener("click", clearMessages);

  buildChatList();
  loadKB();
  setTimeout(startWelcome, 250);
})();
