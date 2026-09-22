<#include "/org/alfresco/components/form/controls/workflow/packageitems.ftl" />
<#if form.mode == "create">${field.setMandatory(true)!}</#if>
<style>
.msp-package-upload{margin:14px 0 4px;padding:16px;border:1px solid #d7e3ea;border-radius:9px;background:#f7fafc;font-family:Arial,sans-serif}.msp-package-upload-head{display:flex;align-items:center;justify-content:space-between;gap:16px}.msp-package-upload-copy{display:flex;align-items:center;gap:11px}.msp-package-upload-icon{display:inline-flex;align-items:center;justify-content:center;width:38px;height:38px;border-radius:9px;background:#e5f1f8;color:#1264a3}.msp-package-upload-icon svg{width:21px;height:21px;fill:currentColor}.msp-package-upload-title{display:block;color:#203744;font-size:13px;font-weight:bold}.msp-package-upload-help{display:block;margin-top:3px;color:#70838f;font-size:11px}.msp-package-upload-button{min-height:34px;padding:0 14px;border:0;border-radius:6px;background:#1264a3;color:#fff;font-size:11px;font-weight:bold;cursor:pointer;white-space:nowrap}.msp-package-upload-button:hover,.msp-package-upload-button:focus{background:#0a4d80}.msp-package-upload-button:disabled{cursor:wait;opacity:.65}.msp-package-upload-message{display:none;margin-top:12px;padding:8px 10px;border-radius:6px;font-size:11px}.msp-package-upload-message.info{display:block;background:#e9f4fb;color:#205c7d}.msp-package-upload-message.success{display:block;background:#e7f6ed;color:#23683f}.msp-package-upload-message.error{display:block;background:#fdecec;color:#9b2f2f}.msp-package-upload-list{display:grid;gap:7px;margin-top:10px}.msp-package-upload-row{display:grid;grid-template-columns:minmax(130px,1fr) minmax(120px,180px);gap:12px;align-items:center;padding:9px 10px;border:1px solid #e1e9ed;border-radius:7px;background:#fff}.msp-package-upload-name{overflow:hidden;color:#304c5d;font-size:11px;font-weight:bold;text-overflow:ellipsis;white-space:nowrap}.msp-package-upload-state{display:block;margin-top:3px;color:#7b8b95;font-size:9px;font-weight:normal}.msp-package-upload-progress{height:5px;overflow:hidden;border-radius:4px;background:#e8eef1}.msp-package-upload-progress span{display:block;height:100%;width:0;background:#1264a3;transition:width .2s}.msp-package-upload-row.success{border-color:#9fd6b5}.msp-package-upload-row.success .msp-package-upload-progress span{background:#2e9e5b}.msp-package-upload-row.error{border-color:#f0b7b7}.msp-package-upload-row.error .msp-package-upload-progress span{background:#d64545}
.msp-doc-preview{margin:16px 0 4px;border:1px solid #d7e3ea;border-radius:9px;background:#fff;font-family:Arial,sans-serif;overflow:hidden}.msp-doc-preview-head{display:flex;align-items:center;gap:8px;flex-wrap:wrap;padding:10px 12px;background:#f7fafc;border-bottom:1px solid #e1e9ed}.msp-doc-preview-title{color:#203744;font-size:13px;font-weight:bold;margin-right:auto}.msp-doc-preview-tab{padding:5px 10px;border:1px solid #c8d5dc;border-radius:15px;background:#fff;color:#41606f;font-size:11px;font-weight:bold;cursor:pointer;max-width:220px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.msp-doc-preview-tab:hover{border-color:#1264a3;color:#1264a3}.msp-doc-preview-tab.active{background:#1264a3;border-color:#1264a3;color:#fff}.msp-doc-preview-frame{display:block;width:100%;height:480px;border:0;background:#f2f5f7}.msp-doc-preview-note{display:none;padding:14px 12px;color:#70838f;font-size:11px;text-align:center}.msp-doc-preview-actions{display:flex;gap:14px;padding:8px 12px;border-top:1px solid #e1e9ed;background:#fbfdfe}.msp-doc-preview-actions a{color:#1264a3;font-size:11px;font-weight:bold;text-decoration:none}.msp-doc-preview-actions a:hover{text-decoration:underline}
</style>
<#if form.mode == "create" && field.disabled == false>
<div id="${controlId?html}-msp-upload" class="msp-package-upload">
   <div class="msp-package-upload-head">
      <div class="msp-package-upload-copy">
         <span class="msp-package-upload-icon"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2a1 1 0 0 1 .7.3l4 4a1 1 0 0 1-1.4 1.4L13 5.4V15a1 1 0 1 1-2 0V5.4L8.7 7.7a1 1 0 0 1-1.4-1.4l4-4A1 1 0 0 1 12 2ZM5 13a1 1 0 0 1 1 1v5h12v-5a1 1 0 1 1 2 0v5a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-5a1 1 0 0 1 1-1Z"/></svg></span>
         <span><span class="msp-package-upload-title">Téléverser depuis l'ordinateur</span><span class="msp-package-upload-help">Un ou plusieurs documents seront enregistrés dans Mes fichiers puis ajoutés au workflow.</span></span>
      </div>
      <button id="${controlId?html}-msp-upload-button" class="msp-package-upload-button" type="button">Choisir et téléverser</button>
      <input id="${controlId?html}-msp-files" type="file" name="-" multiple style="display:none" />
   </div>
   <div id="${controlId?html}-msp-message" class="msp-package-upload-message" role="status" aria-live="polite"></div>
   <div id="${controlId?html}-msp-list" class="msp-package-upload-list"></div>
</div>
<script type="text/javascript">
(function() {
   var rootId = "${controlId?js_string}";
   var fieldId = "${fieldHtmlId?js_string}";
   var uploadUrl = Alfresco.constants.URL_CONTEXT + "proxy/alfresco-api/-default-/public/alfresco/versions/1/nodes/-my-/children?autoRename=true";

   function csrfToken() {
      var match = document.cookie.match(/Alfresco-CSRFToken=([^;]+)/);
      return match ? decodeURIComponent(match[1]) : "";
   }

   function parentForm(element) {
      var current = element;
      while (current && current.tagName !== "FORM") current = current.parentNode;
      return current;
   }

   function setBusy(busy) {
      var button = document.getElementById(rootId + "-msp-upload-button");
      var form = parentForm(button);
      if (button) {
         button.disabled = busy;
         button.textContent = busy ? "Téléversement en cours…" : "Choisir et téléverser";
      }
      if (form) {
         var submits = form.querySelectorAll("button[type=submit],input[type=submit]");
         for (var i = 0; i < submits.length; i++) submits[i].disabled = busy;
      }
   }

   function showMessage(type, text) {
      var message = document.getElementById(rootId + "-msp-message");
      message.className = "msp-package-upload-message " + type;
      message.textContent = text;
   }

   function createRow(file) {
      var row = document.createElement("div");
      row.className = "msp-package-upload-row";
      var details = document.createElement("div");
      var name = document.createElement("span");
      name.className = "msp-package-upload-name";
      name.textContent = file.name;
      var state = document.createElement("span");
      state.className = "msp-package-upload-state";
      state.textContent = "En attente";
      details.appendChild(name);
      details.appendChild(state);
      var progress = document.createElement("div");
      progress.className = "msp-package-upload-progress";
      progress.appendChild(document.createElement("span"));
      row.appendChild(details);
      row.appendChild(progress);
      document.getElementById(rootId + "-msp-list").appendChild(row);
      return { row: row, name: name, state: state, progress: progress.firstChild };
   }

   function updateRow(view, type, state, percent) {
      view.row.className = "msp-package-upload-row" + (type ? " " + type : "");
      view.state.textContent = state;
      view.progress.style.width = Math.max(0, Math.min(100, percent || 0)) + "%";
   }

   function uploadFile(file, view, done) {
      var data = new FormData();
      data.append("filedata", file, file.name);
      data.append("name", file.name);
      data.append("nodeType", "cm:content");
      var token = csrfToken();
      var xhr = new XMLHttpRequest();
      xhr.open("POST", uploadUrl + (token ? "&Alfresco-CSRFToken=" + encodeURIComponent(token) : ""), true);
      xhr.withCredentials = true;
      if (token) xhr.setRequestHeader("Alfresco-CSRFToken", token);
      xhr.upload.onprogress = function(event) {
         if (event.lengthComputable) updateRow(view, "", "Téléversement " + Math.round(event.loaded * 100 / event.total) + "%", event.loaded * 100 / event.total);
      };
      xhr.onreadystatechange = function() {
         if (xhr.readyState !== 4) return;
         if (xhr.status === 200 || xhr.status === 201) {
            try {
               var response = JSON.parse(xhr.responseText);
               var entry = response.entry;
               view.name.textContent = entry.name || file.name;
               updateRow(view, "success", "Téléversé, ajout au formulaire…", 100);
               done(null, { nodeRef: "workspace://SpacesStore/" + entry.id, view: view });
               return;
            } catch (e) {}
         }
         var reason = "Échec du téléversement";
         try {
            var error = JSON.parse(xhr.responseText);
            reason = error.error.briefSummary || reason;
         } catch (e) {}
         updateRow(view, "error", reason, 100);
         done(new Error(reason));
      };
      xhr.onerror = function() {
         updateRow(view, "error", "Erreur réseau", 100);
         done(new Error("Erreur réseau"));
      };
      updateRow(view, "", "Téléversement 0%", 0);
      xhr.send(data);
   }

   function waitForPicker(attempt, done) {
      var picker = Alfresco.util.ComponentManager.get(rootId);
      if (picker && picker.isReady) {
         done(picker);
      } else if (attempt < 40) {
         window.setTimeout(function() { waitForPicker(attempt + 1, done); }, 250);
      } else {
         done(null);
      }
   }

   function waitForSelection(nodeRefs, views, attempt) {
      var field = document.getElementById(fieldId);
      var value = field ? field.value : "";
      var complete = true;
      for (var i = 0; i < nodeRefs.length; i++) {
         if (value.indexOf(nodeRefs[i]) === -1) complete = false;
      }
      if (!complete && attempt < 40) {
         window.setTimeout(function() { waitForSelection(nodeRefs, views, attempt + 1); }, 250);
         return;
      }
      if (complete) {
         for (var j = 0; j < views.length; j++) updateRow(views[j], "success", "Prêt à être signé", 100);
         showMessage("success", nodeRefs.length + (nodeRefs.length > 1 ? " documents ont été ajoutés au workflow." : " document a été ajouté au workflow."));
      } else {
         for (var k = 0; k < views.length; k++) updateRow(views[k], "error", "Téléversé dans Mes fichiers, mais non associé", 100);
         showMessage("error", "Les documents ont été téléversés, mais leur ajout au formulaire n'a pas abouti. Vous pouvez les sélectionner depuis la bibliothèque.");
      }
      setBusy(false);
   }

   function attachDocuments(uploaded) {
      var nodeRefs = [];
      var views = [];
      for (var i = 0; i < uploaded.length; i++) {
         nodeRefs.push(uploaded[i].nodeRef);
         views.push(uploaded[i].view);
      }
      waitForPicker(0, function(picker) {
         if (!picker) {
            for (var i = 0; i < views.length; i++) updateRow(views[i], "error", "Sélecteur indisponible", 100);
            showMessage("error", "Les documents sont dans Mes fichiers. Sélectionnez-les depuis la bibliothèque pour poursuivre.");
            setBusy(false);
            return;
         }
         var selected = picker.getSelectedItems ? picker.getSelectedItems() : [];
         for (var j = 0; j < nodeRefs.length; j++) {
            if (selected.indexOf(nodeRefs[j]) === -1) selected.push(nodeRefs[j]);
         }
         try {
            // ObjectFinder attend une chaine CSV (options.selectedValue est decoupee via split(","))
            picker.selectItems(selected.join(","));
         } catch (e) {
            for (var k = 0; k < views.length; k++) updateRow(views[k], "error", "Téléversé dans Mes fichiers, mais non associé", 100);
            showMessage("error", "Les documents ont été téléversés, mais leur ajout au formulaire n'a pas abouti. Vous pouvez les sélectionner depuis la bibliothèque.");
            setBusy(false);
            return;
         }
         waitForSelection(nodeRefs, views, 0);
      });
   }

   function uploadFiles(files) {
      var queue = [];
      for (var i = 0; i < files.length; i++) queue.push({ file: files[i], view: createRow(files[i]) });
      if (!queue.length) return;
      setBusy(true);
      showMessage("info", "Téléversement de " + queue.length + (queue.length > 1 ? " documents…" : " document…"));
      var uploaded = [];
      var failures = 0;
      function next(index) {
         if (index >= queue.length) {
            if (uploaded.length) attachDocuments(uploaded);
            else {
               showMessage("error", "Aucun document n'a pu être téléversé.");
               setBusy(false);
            }
            return;
         }
         uploadFile(queue[index].file, queue[index].view, function(error, result) {
            if (error) failures++;
            else uploaded.push(result);
            next(index + 1);
         });
      }
      next(0);
   }

   function init() {
      var button = document.getElementById(rootId + "-msp-upload-button");
      var input = document.getElementById(rootId + "-msp-files");
      if (!button || !input || button.getAttribute("data-msp-ready") === "true") return;
      button.setAttribute("data-msp-ready", "true");
      button.addEventListener("click", function() { input.click(); });
      input.addEventListener("change", function() {
         uploadFiles(input.files || []);
         input.value = "";
      });
   }

   if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
   else window.setTimeout(init, 0);
}());
</script>
</#if>
<div id="${controlId?html}-msp-preview" class="msp-doc-preview" style="display:none">
   <div class="msp-doc-preview-head">
      <span class="msp-doc-preview-title">Aperçu des documents</span>
      <span id="${controlId?html}-msp-preview-tabs"></span>
   </div>
   <iframe id="${controlId?html}-msp-preview-frame" class="msp-doc-preview-frame" title="Aperçu du document"></iframe>
   <div id="${controlId?html}-msp-preview-note" class="msp-doc-preview-note">L'aperçu de ce document n'est pas encore disponible. Réessayez dans quelques secondes ou ouvrez-le dans un nouvel onglet.</div>
   <div class="msp-doc-preview-actions">
      <a id="${controlId?html}-msp-preview-open" href="#" target="_blank" rel="noopener">Ouvrir dans un nouvel onglet</a>
      <a id="${controlId?html}-msp-preview-dl" href="#">Télécharger</a>
   </div>
</div>
<script type="text/javascript">
(function() {
   var rootId = "${controlId?js_string}";
   var fieldId = "${(fieldHtmlId!"")?js_string}";
   var proxyApi = Alfresco.constants.URL_CONTEXT + "proxy/alfresco-api/-default-/public/alfresco/versions/1/nodes/";
   var proxyWs = Alfresco.constants.PROXY_URI + "api/node/";
   var state = { items: [], current: -1, attempts: 0, timer: null };

   function el(suffix) { return document.getElementById(rootId + "-msp-preview" + (suffix ? "-" + suffix : "")); }

   function nodeId(nodeRef) {
      var parts = String(nodeRef).split("/");
      return parts[parts.length - 1];
   }

   function collectNodeRefs() {
      var refs = [];
      var field = document.getElementById(fieldId);
      var value = field && field.value ? field.value : "";
      var chunks = value.split(",");
      for (var i = 0; i < chunks.length; i++) {
         var r = chunks[i].replace(/^\s+|\s+$/g, "");
         if (r.indexOf("://") !== -1) refs.push(r);
      }
      if (!refs.length) {
         var host = document.getElementById(rootId) || document;
         var links = host.querySelectorAll('a[href*="nodeRef="]');
         for (var j = 0; j < links.length; j++) {
            var m = links[j].href.match(/nodeRef=([^&#]+)/);
            if (m) {
               var ref = decodeURIComponent(m[1]);
               if (refs.indexOf(ref) === -1) refs.push(ref);
            }
         }
      }
      return refs;
   }

   function thumbnailName(mimeType) {
      return mimeType && mimeType.indexOf("image/") === 0 ? "imgpreview" : "pdf";
   }

   function expectedType(mimeType) {
      return thumbnailName(mimeType) === "imgpreview" ? "image/" : "application/pdf";
   }

   function thumbnailUrl(nodeRef, mimeType) {
      return proxyWs + String(nodeRef).replace(/:\/\//g, "/") + "/content/thumbnails/" + thumbnailName(mimeType) + "?c=queue&ph=true&lastModified=" + new Date().getTime();
   }

   function showNote(show) {
      var note = el("note");
      var frame = el("frame");
      note.style.display = show ? "block" : "none";
      frame.style.display = show ? "none" : "block";
   }

   function setLinks(item) {
      el("open").href = Alfresco.constants.URL_PAGECONTEXT + "document-details?nodeRef=" + encodeURIComponent(item.nodeRef);
      el("dl").href = proxyWs + String(item.nodeRef).replace(/:\/\//g, "/") + "/content?a=true";
   }

   function loadIntoFrame(item) {
      var frame = el("frame");
      var url = thumbnailUrl(item.nodeRef, item.mimeType);
      var expected = expectedType(item.mimeType);
      setLinks(item);
      state.attempts = 0;
      var tick = function() {
         var check = new XMLHttpRequest();
         check.open("GET", thumbnailUrl(item.nodeRef, item.mimeType), true);
         check.onreadystatechange = function() {
            if (check.readyState !== 4) return;
            if (state.items[state.current] !== item) return;
            var type = check.getResponseHeader("Content-Type") || "";
            if (check.status === 200 && type.indexOf(expected) === 0) {
               showNote(false);
               frame.src = url;
            } else if (state.attempts++ < 15) {
               showNote(true);
               state.timer = window.setTimeout(tick, 4000);
            } else {
               showNote(true);
            }
         };
         check.send();
      };
      tick();
   }

   function selectItem(index) {
      if (state.timer) { window.clearTimeout(state.timer); state.timer = null; }
      state.current = index;
      var tabs = el("tabs").getElementsByTagName("button");
      for (var i = 0; i < tabs.length; i++) tabs[i].className = "msp-doc-preview-tab" + (i === index ? " active" : "");
      loadIntoFrame(state.items[index]);
   }

   function renderTabs() {
      var host = el("tabs");
      host.innerHTML = "";
      for (var i = 0; i < state.items.length; i++) {
         (function(index) {
            var tab = document.createElement("button");
            tab.type = "button";
            tab.className = "msp-doc-preview-tab";
            tab.textContent = state.items[index].name || state.items[index].nodeRef;
            tab.title = tab.textContent;
            tab.addEventListener("click", function() { selectItem(index); });
            host.appendChild(tab);
         })(i);
      }
   }

   function fetchMeta(nodeRef, done) {
      var xhr = new XMLHttpRequest();
      xhr.open("GET", proxyApi + nodeId(nodeRef) + "?fields=name,content", true);
      xhr.onreadystatechange = function() {
         if (xhr.readyState !== 4) return;
         try {
            var entry = JSON.parse(xhr.responseText).entry;
            done({ nodeRef: nodeRef, name: entry.name, mimeType: entry.content ? entry.content.mimeType : "" });
         } catch (e) { done({ nodeRef: nodeRef, name: nodeRef, mimeType: "" }); }
      };
      xhr.onerror = function() { done(null); };
      xhr.send();
   }

   function refresh() {
      var wrap = el();
      if (!wrap) return;
      var refs = collectNodeRefs();
      var known = {};
      for (var i = 0; i < state.items.length; i++) known[state.items[i].nodeRef] = state.items[i];
      var missing = [];
      for (var j = 0; j < refs.length; j++) {
         if (!known[refs[j]]) missing.push(refs[j]);
      }
      state.items = state.items.filter(function(item) { return refs.indexOf(item.nodeRef) !== -1; });
      if (state.current >= state.items.length) state.current = -1;
      if (!missing.length) {
         if (state.items.length) {
            wrap.style.display = "block";
            if (state.current < 0) { renderTabs(); selectItem(0); }
         } else {
            wrap.style.display = "none";
         }
         return;
      }
      var pending = missing.length;
      for (var m = 0; m < missing.length; m++) {
         (function(ref) {
            fetchMeta(ref, function(meta) {
               if (meta) state.items.push(meta);
               if (--pending === 0) {
                  wrap.style.display = state.items.length ? "block" : "none";
                  if (state.items.length) {
                     renderTabs();
                     selectItem(state.current >= 0 ? Math.min(state.current, state.items.length - 1) : 0);
                  }
               }
            });
         })(missing[m]);
      }
   }

   function init() {
      if (!el() || el().getAttribute("data-msp-ready") === "true") return;
      el().setAttribute("data-msp-ready", "true");
      refresh();
      window.setInterval(refresh, 1500);
   }

   if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
   else window.setTimeout(init, 0);
}());
</script>
