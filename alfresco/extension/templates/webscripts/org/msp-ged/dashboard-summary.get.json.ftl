{
    "user": {
        "userName": "${userName?json_string}",
        "firstName": "${firstName?json_string}",
        "lastName": "${lastName?json_string}"
    },
    "counts": {
        "activeTasks": ${activeTasks?c},
        "completedTasks": ${completedTasks?c},
        "sites": ${sites?c},
        "sharedDocuments": ${sharedDocuments?c},
        "recentUploads": ${recentUploads?c}
    },
    "recentDocuments": [
        <#list recentDocuments as document>
        {
            "name": "${document.name?json_string}",
            "nodeRef": "${document.nodeRef?json_string}",
            "location": "${document.location?json_string}",
            "createdAt": ${document.createdAt?c},
            "modifiedAt": ${document.modifiedAt?c},
            "mimetype": "${document.mimetype?json_string}",
            "size": ${document.size?c}
        }<#if document_has_next>,</#if>
        </#list>
    ],
    "generatedAt": ${generatedAt?c}
}
