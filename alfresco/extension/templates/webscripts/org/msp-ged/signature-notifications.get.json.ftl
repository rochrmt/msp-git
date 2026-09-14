{
    "timestamp": ${timestamp?c},
    "notifications": [
        <#list notifications as n>
        {
            "nodeId": "${n.nodeId?json_string}",
            "eventType": "${n.eventType?json_string}",
            "documentName": "${n.documentName?json_string}",
            "signerName": "${n.signerName?json_string}",
            "recipient": "${n.recipient?json_string}",
            "workflowId": "${n.workflowId?json_string}",
            "documentNodeRef": "${n.documentNodeRef?json_string}",
            "taskId": "${n.taskId?json_string}",
            "read": ${n.read?string("true","false")},
            "notificationDate": ${n.notificationDate?c}
        }<#if n_has_next>,</#if>
        </#list>
    ]
}
