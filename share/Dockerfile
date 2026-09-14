ARG SHARE_TAG
FROM alfresco/alfresco-share:${SHARE_TAG}

ARG TOMCAT_DIR=/usr/local/tomcat

# Server data
ARG SERVER_NAME
ENV SERVER_NAME $SERVER_NAME
ARG HTTP_PORT
ENV HTTP_PORT $HTTP_PORT

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

# Override minimal du head resources (stock 25.2 + script signature)
COPY site-webscripts/ /usr/local/tomcat/shared/classes/alfresco/web-extension/site-webscripts/

# Asset JS servi via /share/res/components/header/signature-notifications-share.js
# ("/res/*" de Share resout depuis la racine du webapp, pas un dossier res/ physique)
COPY web-extension/signature-notifications-share.js /usr/local/tomcat/webapps/share/components/header/signature-notifications-share.js
