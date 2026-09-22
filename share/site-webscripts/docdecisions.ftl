<#if form.mode != "view">
<input type="hidden" id="${fieldHtmlId}" name="${field.name}" value="${field.value?html}" />
<div class="dd-head">Décision par document</div>
<div id="${fieldHtmlId}-dd" class="msp-doc-decisions"><span class="dd-loading">Chargement des documents…</span></div>
<style>
.dd-head{font-size:12px;font-weight:bold;color:#1c3a4d;margin:10px 0 4px}
.msp-doc-decisions{display:grid;gap:8px;margin:6px 0}
.dd-row{display:flex;align-items:center;gap:10px;padding:9px 12px;border:1px solid #d8e2ec;border-radius:8px;background:#fbfcfd}
.dd-name{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:12px;font-weight:bold;color:#1c3a4d}
.dd-choice{display:inline-flex;border:1px solid #c8d5dc;border-radius:15px;overflow:hidden}
.dd-choice label{display:inline-flex;align-items:center;gap:5px;padding:5px 12px;font-size:11px;font-weight:bold;color:#41606f;cursor:pointer;margin:0;background:#fff;user-select:none}
.dd-choice input{display:none}
.dd-choice label.dd-active{background:#1264a3;color:#fff}
.dd-choice label.dd-rej.dd-active{background:#cf222e;color:#fff}
.dd-choice label.dd-active span{color:#fff}
.dd-loading{color:#8595a1;font-size:11px;font-style:italic}
.dd-error{color:#9b2f2f;font-size:11px}
.dd-rejected-badge{display:inline-block;padding:4px 12px;border-radius:12px;background:#fdecec;color:#c0392b;font-size:11px;font-weight:bold}
.dd-row.dd-dead{opacity:.75;background:#fdf6f6;border-color:#eccccc}
</style>
<script type="text/javascript">
(function() {
   var fieldId = "${fieldHtmlId?js_string}";
   var decisions = {};
   var docs = [];

   function input() { return document.getElementById(fieldId); }
   function host() { return document.getElementById(fieldId + "-dd"); }

   function collectNodeRefs() {
      var hidden = document.querySelector('input[id$="_assoc_packageItems"]');
      var refs = [];
      var value = hidden && hidden.value ? hidden.value : "";
      var chunks = value.split(",");
      for (var i = 0; i < chunks.length; i++) {
         var r = chunks[i].replace(/^\s+|\s+$/g, "");
         if (r.indexOf("://") !== -1 && refs.indexOf(r) === -1) refs.push(r);
      }
      if (!refs.length) {
         var links = document.querySelectorAll('.object-finder a[href*="nodeRef="]');
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

   function write() {
      var el = input();
      if (el) {
         var parts = [];
         for (var k in decisions) {
            if (decisions.hasOwnProperty(k)) parts.push(k + "=" + decisions[k]);
         }
         el.value = parts.join(";");
      }
   }

   function anyRejected() {
      for (var k in decisions) { if (decisions[k] === "Reject") return true; }
      return false;
   }

   function render() {
      var h = host();
      if (!h) return;
      if (!docs.length) {
         h.innerHTML = '<span class="dd-loading">Aucun document joint.</span>';
         return;
      }
      h.innerHTML = "";
      for (var i = 0; i < docs.length; i++) {
         (function(doc, idx) {
            var row = document.createElement("div");
            row.className = "dd-row" + (doc.rejected ? " dd-dead" : "");
            var name = document.createElement("span");
            name.className = "dd-name";
            name.title = doc.name;
            name.textContent = doc.name;
            if (doc.rejected) {
               var badge = document.createElement("span");
               badge.className = "dd-rejected-badge";
               badge.textContent = "Déjà rejeté" + (doc.rejectedBy ? " par " + doc.rejectedBy : "");
               row.appendChild(name);
               row.appendChild(badge);
               h.appendChild(row);
               return;
            }
            var choice = document.createElement("span");
            choice.className = "dd-choice";
            var actions = [["Sign", "Signer", "dd-sign"], ["Reject", "Rejeter", "dd-rej"]];
            var labels = [];
            for (var a = 0; a < actions.length; a++) {
               (function(val, label, cls) {
                  var lab = document.createElement("label");
                  lab.className = cls;
                  var radio = document.createElement("input");
                  radio.type = "radio";
                  radio.name = fieldId + "-doc-" + idx;
                  radio.value = val;
                  radio.checked = decisions[doc.nodeRef] === val;
                  if (radio.checked) lab.className += " dd-active";
                  var select = function(ev) {
                     if (ev) { ev.preventDefault(); ev.stopPropagation(); }
                     decisions[doc.nodeRef] = val;
                     radio.checked = true;
                     for (var k = 0; k < labels.length; k++) {
                        var l = labels[k];
                        l.className = l.className.replace(/ ?dd-active/g, "");
                     }
                     lab.className += " dd-active";
                     write();
                  };
                  radio.addEventListener("change", function() { select(null); });
                  lab.addEventListener("click", select);
                  var txt = document.createElement("span");
                  txt.textContent = label;
                  lab.appendChild(radio);
                  lab.appendChild(txt);
                  labels.push(lab);
                  choice.appendChild(lab);
               })(actions[a][0], actions[a][1], actions[a][2]);
            }
            row.appendChild(name);
            row.appendChild(choice);
            h.appendChild(row);
         })(docs[i], i);
      }
   }

   function loadDocs() {
      var refs = collectNodeRefs();
      if (!refs.length) return false;
      var pending = refs.length;
      var found = [];
      refs.forEach(function(ref) {
         var id = ref.split("/").pop();
         var xhr = new XMLHttpRequest();
         xhr.open("GET", Alfresco.constants.URL_CONTEXT + "proxy/alfresco-api/-default-/public/alfresco/versions/1/nodes/" + id + "?include=properties", true);
         xhr.onreadystatechange = function() {
            if (xhr.readyState !== 4) return;
            var name = ref, props = {};
            try {
               var entry = JSON.parse(xhr.responseText).entry;
               name = entry.name;
               props = entry.properties || {};
            } catch (e) {}
            var status = "" + (props["sg:signatureStatus"] || "");
            var doc = { nodeRef: ref, name: name, rejected: status === "REJECTED", rejectedBy: props["sg:rejectedBy"] || "" };
            found.push(doc);
            if (!doc.rejected && decisions[ref] == null) decisions[ref] = "Sign";
            if (--pending === 0) { docs = found; render(); write(); }
         };
         xhr.send();
      });
      return true;
   }

   function bindSubmitGuard() {
      var form = host();
      while (form && form.tagName !== "FORM") form = form.parentNode;
      if (!form || form.getAttribute("data-dd-guard") === "true") return;
      form.setAttribute("data-dd-guard", "true");
      form.addEventListener("submit", function(ev) {
         if (!docs.length) return;
         var outcomeEl = form.querySelector('input[name$="signOutcome"]');
         var outcome = outcomeEl ? outcomeEl.value : "";
         if (anyRejected() && outcome !== "Reject") {
            ev.preventDefault();
            ev.stopPropagation();
            alert("Un ou plusieurs documents sont marqués « Rejeter » — utilisez le bouton « Rejeter » pour valider votre décision.");
         } else if (!anyRejected() && outcome === "Reject") {
            ev.preventDefault();
            ev.stopPropagation();
            alert("Aucun document n'est marqué « Rejeter » — utilisez le bouton « Signer » pour valider votre décision.");
         }
      }, true);
   }

   function init(attempt) {
      if (!host()) return;
      if (!loadDocs()) {
         if (attempt < 40) window.setTimeout(function() { init(attempt + 1); }, 500);
         return;
      }
      bindSubmitGuard();
   }

   if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", function() { init(0); });
   else init(0);
}());
</script>
<#else>
<div class="control viewmode"><div class="label">${field.label?html}:</div><div class="value">${field.value?html}</div></div>
</#if>
