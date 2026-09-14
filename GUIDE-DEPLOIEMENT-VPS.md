# Guide de déploiement VPS — MSP-GED v25

## Avertissement

Ce document décrit la procédure exacte pour remplacer l'application actuelle sur le VPS (ged-msp.com) par la nouvelle version (`msp_ged-deploy-v25`), **sans perdre la base de données ni les documents**.

Lisez tout une fois avant de commencer.

---

## Informations VPS

- **Serveur** : ged-msp.com
- **Utilisateur SSH** : `tende`
- **Dossier actuel de l'appli** : `/home/admin1`
- **Contenu actuel du VPS** :
  ```
  /home/admin1/
  ├── 2alfresco/        (vide)
  ├── alfresco/         (Dockerfile + extension ancienne)
  ├── config/           (nginx)
  ├── data/             ← À GARDER (postgres + alf-repo + solr)
  ├── docker-compose.yml
  ├── logo-msp.ico
  ├── logo.png
  ├── logs/
  ├── msp_ged/          (variante)
  ├── search/
  ├── share/
  ├── start.sh
  ├── testing/
  └── traefik/
  ```

### ⚠️ Deux stacks tournent sur le VPS

Le VPS a **deux stacks Docker** qui tournent en parallèle :

| Conteneur Postgres | Stack | Dossier | Nœuds | Rôle |
|---|---|---|---|---|
| `alfresco-postgres-1` | `alfresco` | `/home/admin1/alfresco/` | **4802** | **Production** |
| `msp_ged-postgres-1` | `msp_ged` | `/home/admin1/msp_ged/` | 861 | Test |

**La production est `alfresco-postgres-1`** (4802 nœuds, 9 mois d'activité).

### Emplacement des données de production

Les données de production sont dans `/home/admin1/alfresco/data/` (confirmé via `docker inspect`) :

```
/home/admin1/alfresco/data/
├── postgres-data/     ← base de données PostgreSQL (4802 nœuds)
├── alf-repo-data/     ← fichiers/documents (contentstore)
└── solr-data/         ← index Solr
```

**Il faudra arrêter LES DEUX stacks** pour éviter les conflits de port.

---

## Peut-on mettre le nouveau dossier ailleurs que dans `/home` ?

**Oui, totalement.** Docker Compose utilise des **chemins relatifs** pour les volumes (ex: `./data/postgres-data`). Tant que le dossier `data/` (avec vos données de production) est à l'intérieur du nouveau dossier, l'appli fonctionnera.

Les seules contraintes sont :
1. **L'espace disque** — le dossier `data/` peut être volumineux (documents + index Solr)
2. **Les permissions** — l'utilisateur qui lance `docker compose` doit pouvoir lire/écrire dans le dossier
3. **Docker** — doit être installé et accessible

Exemples d'emplacements valides :
- `/home/admin1/msp_ged-deploy-v25/` (à côté de l'ancien)
- `/opt/msp_ged-deploy-v25/` (standard pour les apps)
- `/var/www/msp_ged-deploy-v25/`
- N'importe quel chemin avec assez d'espace

**Vérifiez l'espace avant de choisir** :
```bash
df -h /home
df -h /opt
du -sh /home/admin1/data/    # taille de vos données actuelles
```

---

## Ce que contient le dossier `msp_ged-deploy-v25`

```
msp_ged-deploy-v25/
├── .env                          ← versions + SERVER_NAME (À MODIFIER)
├── docker-compose.yml            ← stack complète (volumes logo inclus)
├── alfresco.svg                  ← logo MSP (blason)
├── alfresco-48.png               ← logo MSP petit format
├── alfresco.png                  ← logo MSP PNG
├── logo-msp.ico                  ← favicon MSP
├── logo.png                      ← logo ACA
├── start.sh                      ← script de démarrage (optionnel)
│
├── alfresco/
│   ├── Dockerfile                ← image Alfresco 25.2 + extension signature
│   └── extension/
│       ├── models/signature-content-model.xml          ← modèle sg:signature
│       ├── workflows/multi-signature.bpmn20.xml        ← workflow multi-signature
│       ├── bootstrap/signature-bootstrap-context.xml   ← dossier notifications
│       ├── messages/signature-messages.properties      ← i18n
│       └── templates/webscripts/
│           ├── org/alfresco/.../aos/                   ← webscripts AOS
│           └── org/msp-ged/
│               ├── signature-notifications.get.*        ← GET notifications
│               └── signature-notifications-read.post.*  ← POST marquer lu
│
├── share/
│   ├── Dockerfile                ← image Share 25.2 + logo + notifications
│   ├── web-extension/
│   │   ├── share-config-custom-dev.xml   ← formulaires workflow + config
│   │   └── signature-notifications-share.js  ← cloche + polling + partage
│   └── site-webscripts/
│       └── org/alfresco/components/head/resources.get.html.ftl  ← injection JS
│
├── search/
│   └── Dockerfile                ← image Solr 2.0.16
│
├── content-app/
│   ├── app.config.json           ← config ACA 7.0
│   ├── index.html                ← injection signature-notifications.js
│   └── signature-notifications.js  ← cloche ACA + interception partage
│
└── config/
    ├── nginx.conf                ← reverse proxy
    └── nginx.htpasswd            ← auth Solr
```

**IMPORTANT :** Les dossiers `data/` et `logs/` dans ce dossier (s'ils existent) sont des données de test locales. **Ne les transférez pas** — le VPS a déjà ses propres données dans `/home/admin1/data/`.

---

## Étape 0 — Préparation (sur votre PC)

### 0.1 Nettoyer le dossier avant transfert

Sur votre PC, supprimez les dossiers de test locaux pour alléger le transfert :

```powershell
# Dans PowerShell sur votre PC
cd "C:\Users\souma\Desktop\admin1-backup\admin1\msp_ged-deploy-v25"

# Supprimer les données de test locales (NE PAS faire ça sur le VPS)
Remove-Item -Recurse -Force data
Remove-Item -Recurse -Force logs
```

### 0.2 Créer une archive de transfert

```powershell
# Toujours sur votre PC
cd "C:\Users\souma\Desktop\admin1-backup\admin1"
tar czf msp_ged-deploy-v25.tar.gz msp_ged-deploy-v25
```

---

## Étape 1 — Sauvegarde de la production (SUR LE VPS, OBLIGATOIRE)

Connectez-vous au VPS en SSH et faites une sauvegarde complète **avant toute manipulation**.

```bash
# Se connecter au VPS
ssh tende@ged-msp.com

# Aller dans le dossier de l'appli actuelle
cd /home/admin1

# Vérifier l'espace disque disponible
df -h .
du -sh alfresco/data/

# 1. Sauvegarder la base de données de production
sudo docker exec alfresco-postgres-1 pg_dump -U alfresco alfresco > /tmp/backup_db_$(date +%F).sql

# 2. Sauvegarder les fichiers (contentstore) et l'index Solr
sudo tar czf /tmp/backup_alf-repo-data_$(date +%F).tgz alfresco/data/alf-repo-data
sudo tar czf /tmp/backup_postgres-data_$(date +%F).tgz alfresco/data/postgres-data
sudo tar czf /tmp/backup_solr-data_$(date +%F).tgz alfresco/data/solr-data  # si existe

# 3. Sauvegarde complète du dossier (pour rollback)
sudo cp -r /home/admin1 /tmp/admin1_backup_$(date +%F)

# Vérifier que les sauvegardes sont OK
ls -lh /tmp/backup_db_*.sql /tmp/backup_*.tgz
```

**Si les sauvegardes ne sont pas OK → STOP, ne continuez pas.**

---

## Étape 2 — Arrêter les applications actuelles

Il y a **deux stacks** qui tournent — il faut arrêter les deux pour libérer les ports (80, 5432, etc.).

```bash
# 2.1 Arrêter le stack principal (alfresco/)
cd /home/admin1
sudo docker compose down

# 2.2 Arrêter le stack secondaire (msp_ged/)
cd /home/admin1/msp_ged
sudo docker compose down

# 2.3 Vérifier qu'il ne reste rien qui tourne
sudo docker ps | grep -E 'alfresco|postgres|share|solr|content-app|proxy'
# → ne doit rien afficher

# S'il reste des conteneurs orphelins, les arrêter :
# sudo docker stop $(sudo docker ps -q)  # ATTENTION: arrête TOUS les conteneurs
```

---

## Étape 3 — Transférer le nouveau dossier sur le VPS

### 3.1 Depuis votre PC, envoyer l'archive

```powershell
# Sur votre PC
scp "C:\Users\souma\Desktop\admin1-backup\admin1\msp_ged-deploy-v25.tar.gz" tende@ged-msp.com:/tmp/
```

### 3.2 Sur le VPS, décompresser

```bash
# Sur le VPS — décompresser dans /home (à côté de l'ancien dossier)
cd /home
tar xzf /tmp/msp_ged-deploy-v25.tar.gz
cd /home/msp_ged-deploy-v25
ls -la
# → vous devez voir docker-compose.yml, .env, alfresco/, share/, etc.
```

> **Note** : Vous pouvez mettre le dossier ailleurs (ex: `/opt/msp_ged-deploy-v25`). Dans ce cas, adaptez les chemins dans les commandes suivantes. Docker Compose utilise des chemins relatifs, donc ça fonctionne n'importe où.

---

## Étape 4 — Déplacer les données de production

**C'est l'étape la plus critique.** Il faut copier les données existantes dans le nouveau dossier, SANS les écraser.

```bash
# Créer le dossier data dans le nouveau dossier
sudo mkdir -p /home/msp_ged-deploy-v25/data

# Copier les données de production depuis alfresco/data/ (COPIE, pas déplacement)
sudo cp -r /home/admin1/alfresco/data/postgres-data /home/msp_ged-deploy-v25/data/
sudo cp -r /home/admin1/alfresco/data/alf-repo-data /home/msp_ged-deploy-v25/data/
sudo cp -r /home/admin1/alfresco/data/solr-data /home/msp_ged-deploy-v25/data/    # si existe

# Vérifier que les données sont bien copiées
ls -la /home/msp_ged-deploy-v25/data/
# → doit montrer postgres-data, alf-repo-data, solr-data

# Vérifier les tailles (doivent être identiques à l'original)
sudo du -sh /home/msp_ged-deploy-v25/data/*
sudo du -sh /home/admin1/alfresco/data/*
# → les tailles doivent correspondre
```

---

## Étape 5 — Modifier la configuration pour le VPS

```bash
cd /home/msp_ged-deploy-v25

# 5.1 Modifier .env — changer localhost par ged-msp.com
sed -i 's/SERVER_NAME=localhost/SERVER_NAME=ged-msp.com/' .env

# Vérifier
cat .env
# → doit afficher SERVER_NAME=ged-msp.com
```

```bash
# 5.2 Modifier share-config-custom-dev.xml — URL du repository
sed -i 's|http://localhost:80/alfresco|http://ged-msp.com/alfresco|' share/web-extension/share-config-custom-dev.xml

# Vérifier
grep "repository-url" share/web-extension/share-config-custom-dev.xml
# → doit afficher http://ged-msp.com/alfresco
```

```bash
# 5.3 Modifier docker-compose.yml — CSRF (localhost → ged-msp.com)
sed -i 's|http://localhost:80/\.\*|http://ged-msp.com/.*|' docker-compose.yml
sed -i 's|http://localhost:80"|http://ged-msp.com"|' docker-compose.yml

# Vérifier
grep "CSRF" docker-compose.yml
# → doit afficher ged-msp.com
```

---

## Étape 6 — Construire les images

```bash
cd /home/msp_ged-deploy-v25

# Build des images personnalisées (peut prendre 5-15 minutes)
docker compose build alfresco share solr6

# Vérifier que les images sont créées
docker images | grep mspged
```

---

## Étape 7 — Démarrer la stack

```bash
cd /home/msp_ged-deploy-v25

# Démarrer tous les services
docker compose up -d

# Suivre le démarrage d'Alfresco (le plus long, ~3-5 minutes)
docker compose logs -f alfresco
```

Attendez de voir ce message dans les logs :
```
Alfresco Content Services started (Community). Current version: 25.2.0 ... schema 20,100.
```

Puis `Ctrl+C` pour quitter les logs.

```bash
# Vérifier que tous les conteneurs sont up
docker compose ps
# → tous doivent être "Up" ou "healthy"
```

---

## Étape 8 — Configurer les permissions du dossier partagé

```bash
# Donner à tous les utilisateurs le droit de déposer dans "Fichiers partagés"
# Remplacez <MOT_DE_PASSE_ADMIN> par le mot de passe admin Alfresco
curl -X PUT "http://localhost:8080/alfresco/api/-default-/public/alfresco/versions/1/nodes/-shared-" \
  -u admin:<MOT_DE_PASSE_ADMIN> \
  -H "Content-Type: application/json" \
  -d '{"permissions":{"isInheritanceEnabled":true,"locallySet":[{"authorityId":"GROUP_EVERYONE","name":"Contributor","accessStatus":"ALLOWED"}]}}'

# Vérifier la réponse → doit être 200 avec "locallySet" contenant "Contributor"
```

---

## Étape 9 — Vérifications finales

```bash
# 1. Alfresco répond
curl -s -o /dev/null -w "Alfresco: %{http_code}\n" http://localhost:8080/alfresco/api/-default-/public/alfresco/versions/1/probes/-ready-
# → doit afficher "Alfresco: 200"

# 2. Share répond
curl -s -o /dev/null -w "Share: %{http_code}\n" http://localhost:8080/share/page/
# → doit afficher "Share: 200"

# 3. ACA répond
curl -s -o /dev/null -w "ACA: %{http_code}\n" http://localhost:8080/
# → doit afficher "ACA: 200"

# 4. Workflow déployé
curl -s "http://localhost:8080/alfresco/api/-default-/public/alfresco/versions/1/process-definitions" -u admin:<MOT_DE_PASSE_ADMIN> | grep -o "multiSignatureWorkflow"
# → doit afficher "multiSignatureWorkflow"

# 5. Webscript notifications
curl -s -o /dev/null -w "Notifs: %{http_code}\n" "http://localhost:8080/alfresco/service/msp-ged/signature-notifications" -u admin:<MOT_DE_PASSE_ADMIN>
# → doit afficher "Notifs: 200"

# 6. Logo MSP sur Share
curl -s -o /dev/null -w "Logo: %{http_code} (taille: %{size_download})\n" http://ged-msp.com/share/res/themes/lightTheme/images/alfresco.svg
# → doit afficher "Logo: 200" avec une taille ~198000 bytes
```

Puis testez dans le navigateur :
- **Share** : `http://ged-msp.com/share` → login admin → vérifiez le logo MSP + cloche notifications
- **ACA** : `http://ged-msp.com/` → login → vérifiez le logo + partage

---

## Étape 10 — Sécurité (IMPORTANT)

### 10.1 Changer le mot de passe SMTP Gmail

Le mot de passe Gmail (`wgaqgmtwdfhlpdvq`) est exposé dans le `docker-compose.yml`. Il faut le révoquer et en créer un nouveau :

1. Allez sur https://myaccount.google.com/apppasswords (compte gedmsp@gmail.com)
2. Supprimez l'ancien mot de passe d'application
3. Créez-en un nouveau
4. Mettez à jour le `docker-compose.yml` :

```bash
cd /home/msp_ged-deploy-v25
nano docker-compose.yml
# Ligne ~89 : remplacez wgaqgmtwdfhlpdvq par le nouveau mot de passe
```

Puis redémarrez Alfresco :
```bash
docker compose up -d alfresco
```

### 10.2 Vérifier le mot de passe admin Alfresco

Le hash dans le `docker-compose.yml` ligne 54 (`alfresco_user_store.adminpassword`) doit correspondre au mot de passe admin de la production. Si vous ne le connaissez pas, laissez-le inchangé — il sera lu depuis la base de données existante.

---

## En cas de problème — Rollback

Si la nouvelle version ne fonctionne pas, revenez à l'ancienne :

```bash
# 1. Arrêter la nouvelle stack
cd /home/msp_ged-deploy-v25
docker compose down

# 2. Les données originales sont intactes (on a fait "cp", pas "mv")
# /home/admin1/data/ n'a pas été touché

# 3. Redémarrer l'ancienne stack
cd /home/admin1
docker compose up -d

# 4. Vérifier
docker compose ps
curl http://localhost:8080/alfresco/api/-default-/public/alfresco/versions/1/probes/-ready-
```

La base de données n'a **pas été modifiée** par la nouvelle version (Alfresco 25.2 = même version que la prod), donc l'ancienne stack redémarre sans problème.

---

## Résumé rapide (à copier-coller)

```bash
# === SAUVEGARDE ===
cd /home/admin1
sudo docker exec alfresco-postgres-1 pg_dump -U alfresco alfresco > /tmp/backup_db.sql
sudo tar czf /tmp/backup_data.tgz alfresco/data/
sudo cp -r /home/admin1 /tmp/admin1_backup

# === ARRÊT DES DEUX STACKS ===
cd /home/admin1 && sudo docker compose down
cd /home/admin1/msp_ged && sudo docker compose down
sudo docker ps | grep -E 'alfresco|postgres|share|solr'  # → doit être vide

# === INSTALLATION (après transfert de l'archive) ===
cd /home
sudo tar xzf /tmp/msp_ged-deploy-v25.tar.gz
sudo mkdir -p /home/msp_ged-deploy-v25/data
sudo cp -r /home/admin1/alfresco/data/* /home/msp_ged-deploy-v25/data/
cd /home/msp_ged-deploy-v25

# === CONFIG (automatique) ===
sudo sed -i 's/SERVER_NAME=localhost/SERVER_NAME=ged-msp.com/' .env
sudo sed -i 's|http://localhost:80/alfresco|http://ged-msp.com/alfresco|' share/web-extension/share-config-custom-dev.xml
sudo sed -i 's|http://localhost:80/\.\*|http://ged-msp.com/.*|' docker-compose.yml
sudo sed -i 's|http://localhost:80"|http://ged-msp.com"|' docker-compose.yml

# === BUILD + START ===
sudo docker compose build alfresco share solr6
sudo docker compose up -d
sudo docker compose logs -f alfresco    # attendre "Alfresco started" puis Ctrl+C

# === PERMISSIONS SHARED ===
curl -X PUT "http://localhost:8080/alfresco/api/-default-/public/alfresco/versions/1/nodes/-shared-" \
  -u admin:<MOT_DE_PASSE_ADMIN> -H "Content-Type: application/json" \
  -d '{"permissions":{"isInheritanceEnabled":true,"locallySet":[{"authorityId":"GROUP_EVERYONE","name":"Contributor","accessStatus":"ALLOWED"}]}}'

# === VÉRIFICATION ===
sudo docker compose ps
curl -s -o /dev/null -w "%{http_code}" http://localhost:8080/alfresco/api/-default-/public/alfresco/versions/1/probes/-ready-
# → 200
```

---

## Checklist finale

- [ ] Sauvegarde base de données faite
- [ ] Sauvegarde alf-repo-data faite
- [ ] Ancienne appli arrêtée
- [ ] Nouveau dossier transféré sur le VPS
- [ ] Données de production copiées dans le nouveau dossier
- [ ] `.env` modifié (SERVER_NAME=ged-msp.com)
- [ ] `share-config-custom-dev.xml` modifié (URL repository)
- [ ] `docker-compose.yml` CSRF modifié (localhost → ged-msp.com)
- [ ] Images buildées
- [ ] Stack démarrée
- [ ] Alfresco "started" dans les logs
- [ ] Tous les conteneurs "Up"
- [ ] Permissions Shared configurées (Contributor pour GROUP_EVERYONE)
- [ ] Logo MSP visible sur Share
- [ ] Logo MSP visible sur ACA
- [ ] Cloche notifications visible dans Share
- [ ] Cloche notifications visible dans ACA
- [ ] Workflow multi-signature disponible
- [ ] Bouton "Partager" copie dans Fichiers partagés
- [ ] Mot de passe Gmail SMTP changé
- [ ] Test de login avec un utilisateur normal
- [ ] Test de partage visible par un autre utilisateur
