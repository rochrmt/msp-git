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
    done
