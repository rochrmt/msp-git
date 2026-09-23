ARG SHARE_TAG
FROM alfresco/alfresco-share:${SHARE_TAG}

ARG TOMCAT_DIR=/usr/local/tomcat

# Server data
ARG SERVER_NAME
ENV SERVER_NAME $SERVER_NAME
ARG HTTP_PORT
ENV HTTP_PORT $HTTP_PORT
ARG PROTOCOL=http
ENV PROTOCOL $PROTOCOL
ARG SHARE_PORT=80
ENV SHARE_PORT $SHARE_PORT

# Install modules and addons
RUN mkdir -p /usr/local/tomcat/amps
COPY modules/amps /usr/local/tomcat/amps
COPY modules/jars /usr/local/tomcat/webapps/share/WEB-INF/lib

RUN java -jar /usr/local/tomcat/alfresco-mmt/alfresco-mmt*.jar install \
    /usr/local/tomcat/amps /usr/local/tomcat/webapps/share -directory -nobackup -force

# Increase default cacheMaxSize
RUN sed -i "s|<Context>|<Context>\n<Resources cacheMaxSize=\"51200\"/> |g" /usr/local/tomcat/conf/context.xml

# web-extension complet : share-config-custom-dev.xml, site-webscripts (extensions Surf), site-data (module)
COPY web-extension/ /usr/local/tomcat/shared/classes/alfresco/web-extension/

# Substitution des variables dans share-config-custom-dev.xml
RUN sed -i "s|\${PROTOCOL}|${PROTOCOL}|g; s|\${SERVER_NAME}|${SERVER_NAME}|g; s|\${SHARE_PORT}|${SHARE_PORT}|g" \
    /usr/local/tomcat/shared/classes/alfresco/web-extension/share-config-custom-dev.xml

# Override minimal du head resources (stock 25.2 + script signature)
COPY site-webscripts/ /usr/local/tomcat/shared/classes/alfresco/web-extension/site-webscripts/

# Override classpath de share-header.lib.js : le webscript header l'importe via
# "classpath:/alfresco/site-webscripts/..." (classloader), PAS via la registry Surf
# (web-extension/). Il doit donc exister au vrai chemin classpath pour etre pris en compte.
COPY site-webscripts/org/alfresco/share/imports/share-header.lib.js \
     /usr/local/tomcat/shared/classes/alfresco/site-webscripts/org/alfresco/share/imports/share-header.lib.js
# On ecrase aussi la version embarquee dans le WAR (ordre de delegation classloader incertain)
COPY site-webscripts/org/alfresco/share/imports/share-header.lib.js \
     /usr/local/tomcat/webapps/share/WEB-INF/classes/alfresco/site-webscripts/org/alfresco/share/imports/share-header.lib.js

# Labels du header (menu Taches > "Signatures que j'ai initiees") : bundles
# classpath resolus via le meme mecanisme que share-header.lib.js
COPY site-webscripts/org/alfresco/share/imports/share-header.lib.properties \
     site-webscripts/org/alfresco/share/imports/share-header.lib_fr.properties \
     site-webscripts/org/alfresco/share/imports/share-header.lib_en.properties \
     /usr/local/tomcat/shared/classes/alfresco/site-webscripts/org/alfresco/share/imports/
COPY site-webscripts/org/alfresco/share/imports/share-header.lib.properties \
     site-webscripts/org/alfresco/share/imports/share-header.lib_fr.properties \
     site-webscripts/org/alfresco/share/imports/share-header.lib_en.properties \
     /usr/local/tomcat/webapps/share/WEB-INF/classes/alfresco/site-webscripts/org/alfresco/share/imports/

# Bundles de messages MSP-GED (workflow -> signature) : la resolution msg() des
# webscripts passe par le classpath du webapp (WEB-INF/classes), pas par la
# registry Surf. On ecrase les versions embarquees dans le WAR.
COPY site-webscripts/org/alfresco/components/workflow/ \
     /usr/local/tomcat/webapps/share/WEB-INF/classes/alfresco/site-webscripts/org/alfresco/components/workflow/

# Asset JS servi via /share/res/components/header/signature-notifications-share.js
# ("/res/*" de Share resout depuis la racine du webapp, pas un dossier res/ physique)
COPY web-extension/signature-notifications-share.js /usr/local/tomcat/webapps/share/components/header/signature-notifications-share.js
COPY web-extension/signature-proof-share.js /usr/local/tomcat/webapps/share/components/header/signature-proof-share.js
COPY web-extension/msp-dashboard.js /usr/local/tomcat/webapps/share/components/dashboard/msp-dashboard.js
COPY web-extension/msp-dashboard.css /usr/local/tomcat/webapps/share/components/dashboard/msp-dashboard.css

# Branding MSP-GED : remplacer "Alfresco" par "MSP-GED" dans tous les fichiers de messages
RUN for f in /usr/local/tomcat/webapps/share/WEB-INF/classes/alfresco/messages/slingshot*.properties; do \
      sed -i 's/app.name=Alfresco Share/app.name=MSP-GED/' "$f"; \
      sed -i 's/app.tagline=Alfresco Content Services/app.tagline=Gestion Electronique de Documents/' "$f"; \
      sed -i 's/app.community=Alfresco Community Edition/app.community=Ministere de la Sante et de la Population/' "$f"; \
      sed -i 's/label.copyright=.*/label.copyright=\&copy; 2025 MSP-GED. Tous droits r\&eacute;serv\&eacute;s./' "$f"; \
      sed -i 's/page.title=Alfresco/page.title=MSP-GED/' "$f"; \
      sed -i 's|<a href="http://www.alfresco.com">Alfresco Software</a> Inc.|MSP-GED|g' "$f"; \
      sed -i "s/Alfresco Content Services may not be available/MSP-GED may not be available/" "$f"; \
      sed -i 's/^page.startWorkflow.title=.*/page.startWorkflow.title=Initier des signatures/' "$f"; \
      sed -i 's/^page.startWorkflow.description=.*/page.startWorkflow.description=Initier une nouvelle demande de signature/' "$f"; \
      sed -i "s/^page.myWorkflows.title=.*/page.myWorkflows.title=Signatures que j'ai initi\\\\u00e9es/" "$f"; \
      sed -i "s/^page.myWorkflows.description=.*/page.myWorkflows.description=Signatures que j'ai initi\\\\u00e9es/" "$f"; \
      sed -i "s/^header.my-workflows.label=.*/header.my-workflows.label=Signatures que j'ai initi\\\\u00e9es/" "$f"; \
      sed -i "s/^header.my-workflows.description=.*/header.my-workflows.description=Signatures que j'ai initi\\\\u00e9es/" "$f"; \
      sed -i "s/^message.loginautherror=.*/message.loginautherror=Vos informations d'authentification sont incorrectes ou le service est momentan\\\\u00e9ment indisponible./" "$f"; \
    done
