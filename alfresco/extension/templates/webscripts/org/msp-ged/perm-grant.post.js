// Accorde la permission Editor a l'assignee sur les documents du package d'une tache.
function main() {
   var taskId = args.taskId;
   if (taskId == null || taskId.length == 0) {
      status.code = 400;
      status.message = "taskId requis";
      model.result = "{\"error\":\"taskId requis\"}";
      return;
   }
   var task = workflow.getTask(taskId);
   if (task == null) {
      status.code = 404;
      status.message = "Tache introuvable: " + taskId;
      model.result = "{\"error\":\"Tache introuvable\"}";
      return;
   }
   var assignee = null;
   var props = task.getProperties();
   var assigneeNode = props["bpm_assignee"] != null ? props["bpm_assignee"] : props["bpm:assignee"];
   if (assigneeNode != null) {
      assignee = assigneeNode.properties["cm:userName"];
   }
   var items = null;
   try {
      items = task.getPackageResources();
   } catch (e1) {
      items = null;
   }
   // Normalisation : getPackageResources peut renvoyer un noeud, un tableau JS ou une List
   var list = [];
   if (items != null) {
      if (items instanceof Array) {
         list = items;
      } else if (items.nodeRef != null) {
         list = [items];
      } else {
         try {
            for (var k = 0; k < items.size(); k++) list.push(items.get(k));
         } catch (e2) {}
      }
   }
   var granted = [];
   if (assignee != null && list.length > 0) {
      for (var i = 0; i < list.length; i++) {
         var doc = list[i];
         if (doc != null) {
            doc.setPermission("Editor", assignee);
            granted.push(doc.name);
         }
      }
   } else {
      // Fallback : package children via la propriete bpm_package
      var pkg = props["bpm_package"] != null ? props["bpm_package"] : props["bpm:package"];
      if (pkg != null && assignee != null) {
         var children = pkg.children;
         for (var j = 0; j < children.length; j++) {
            var d2 = children[j];
            if (d2 != null) {
               d2.setPermission("Editor", assignee);
               granted.push(d2.name);
            }
         }
      }
   }
   model.result = jsonUtils.toJSONString({
      taskId: taskId,
      assignee: assignee,
      items: list.length,
      granted: granted
   });
}
main();
