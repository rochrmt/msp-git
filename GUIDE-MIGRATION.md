# Guide de migration MSP-GED v25 — Test puis bascule

Procédure complète : tester la nouvelle version sur un **serveur de test** avec les données de production, puis basculer la production sur `msp_ged-v25-git` si le test est concluant.

> **Principe** : le serveur de test reçoit une *copie* des données. La prod continue de tourner normalement pendant tout le test. La bascule finale se fait sur l'ancien serveur (données déjà en place = coupure ~5 min).

---

## PHASE 1 — Export des données depuis la prod

À exécuter sur l'**ancien serveur** (celui qui tourne actuellement).

```bash
cd /home/admin1/alfresco
```

> On se place dans le dossier du stack de production (celui qui contient `docker-compose.yml` et `data/`).

```bash
docker exec alfresco-postgres-1 pg_dump -U alfresco alfresco > /tmp/prod.sql
```

> Exporte toute la base PostgreSQL (utilisateurs, métadonnées, workflows, notifications) dans `/tmp/prod.sql`. La prod continue de tourner — le dump est cohérent même à chaud.

```bash
tar czf /tmp/alf-repo-data.tgz data/alf-repo-data
```

> Archive le **contentstore** (les fichiers binaires des documents) + le keystore de chiffrement. Indispensable : la base seule ne suffit pas, les nœuds pointent vers ces fichiers.

```bash
tar czf /tmp/le.tgz traefik/letsencrypt
```

> Archive les certificats Let's Encrypt existants (compte ACME + clés). Permet au serveur de test de servir `https://ged-msp.com` sans redemander de certificats.

```bash
scp /tmp/prod.sql /tmp/alf-repo-data.tgz /tmp/le.tgz root@<IP-NOUVEAU-SERVEUR>:/tmp/
```

> Transfère les 3 fichiers vers le nouveau serveur. Remplacer `<IP-NOUVEAU-SERVEUR>` par la vraie IP.

---

## PHASE 2 — Installation sur le serveur de test

À exécuter sur le **nouveau serveur**.

```bash
git clone https://github.com/rochrmt/msp-git.git msp_ged-v25-git
cd msp_ged-v25-git
```

> Récupère le projet complet (code + config + Traefik) depuis GitHub.

```bash
mkdir -p data traefik/letsencrypt
```

> Crée les dossiers qui recevront les données (absents du repo — gitignorés).

```bash
tar xzf /tmp/alf-repo-data.tgz -C data/
```

> Extrait le contentstore dans `data/alf-repo-data/`.

```bash
tar xzf /tmp/le.tgz -C traefik/
```

> Extrait les certificats dans `traefik/letsencrypt/` — Traefik les réutilisera directement.

```bash
nano .env
```

> Éditer les variables :

```ini
SERVER_NAME=ged-msp.com
PROTOCOL=https
SHARE_PORT=443
```

```bash
nano docker-compose.yml
```

> **Optionnel mais recommandé pour le test** : dans le service `alfresco`, remplacer la ligne `-Dmail.host=smtp.gmail.com` par :

```yaml
        -Dmail.host=localhost
```

> Coupe l'envoi réel d'emails. La prod actuelle n'envoie pas d'emails (pas de doublons possibles), mais la nouvelle version si : tout workflow de signature testé enverra de **vrais emails aux vrais utilisateurs** (ex. « Financier vous a assigné une tâche » à secretaire) pour des tâches qui n'existent qu'en test. Si tu testes uniquement avec des comptes dont tu contrôles les boîtes, tu peux laisser le SMTP actif.

```bash
docker compose build alfresco share
```

> Construit les images personnalisées (overrides Share, extension Alfresco). Aucune interruption — rien ne tourne encore.

```bash
docker compose up -d postgres
sleep 10
```

> Démarre uniquement PostgreSQL, attend 10 s qu'il soit prêt à recevoir le dump.

```bash
cat /tmp/prod.sql | docker exec -i msp_ged-v25-git-postgres-1 psql -U alfresco alfresco
```

> Injecte le dump de prod dans la base du serveur de test.

```bash
docker compose up -d
```

> Démarre toute la stack (postgres, alfresco, share, solr6, transform, content-app, traefik).

```bash
docker compose logs -f alfresco
```

> Suit le démarrage d'Alfresco (~2-4 min). Attendre `Server startup` puis **Ctrl+C** (le `-f` ne quitte pas Alfresco, juste l'affichage des logs).

```bash
curl -X POST http://localhost:8080/alfresco/service/msp-ged/reinstall-email-templates
```

> Réécrit les 5 templates email OOTB avec les versions MSP-GED françaises (idempotent, sans auth).

```bash
docker compose ps
```

> Vérifie que tous les conteneurs sont `Up` / `healthy`.

### Accès au test (fichier hosts local)

Sur **ta machine Windows** (PowerShell admin) :

```powershell
Add-Content "C:\Windows\System32\drivers\etc\hosts" "`n<IP-NOUVEAU-SERVEUR>`tged-msp.com"
```

> Force **ton** poste à résoudre `ged-msp.com` vers le serveur de test. Les autres utilisateurs restent sur la prod (DNS inchangé). Tester ensuite : login, dashboard, notifications, workflow de signature. Si le SMTP est coupé, vérifier que le workflow avance (pas que le mail arrive) ; si SMTP actif, vérifier le contenu des mails reçus.

### Si le test échoue

La prod n'est **pas touchée** — corriger, rebuild, retester. Aucune action requise côté prod.

---

## PHASE 3 — Bascule sur l'ancien serveur (production)

À exécuter sur l'**ancien serveur**, une fois le test validé. Coupure estimée : ~5-10 min.

```bash
cd /home/msp_ged-v25-git
git pull origin main
```

> Met à jour le dossier déjà présent sur le serveur (récupère notamment le compose avec Traefik).

```bash
cd /home/admin1/alfresco
docker exec alfresco-postgres-1 pg_dump -U alfresco alfresco > /tmp/backup_$(date +%F).sql
```

> **Backup de sécurité** avant toute bascule — dump de la base de prod daté du jour.

```bash
tar czf /tmp/backup_data_$(date +%F).tgz data/
```

> Backup complet des données (postgres + contentstore + solr).

```bash
docker compose down
```

> **Arrête la production.** Les utilisateurs sont coupés à partir d'ici.

```bash
cd /home/msp_ged-v25-git
cp -r /home/admin1/alfresco/traefik/letsencrypt traefik/
```

> Copie les certificats Let's Encrypt de la prod dans le nouveau stack (HTTPS immédiat, pas de nouvelle demande ACME).

```bash
ln -s /home/admin1/alfresco/data data
```

> **Le point clé** : le nouveau stack utilise directement les données de prod via un lien symbolique — aucune copie, aucune perte, bascule instantanée. Vérifier que `./data` n'existe pas déjà (`mv data data_old` si besoin).

```bash
nano .env
```

> Mêmes valeurs :

```ini
SERVER_NAME=ged-msp.com
PROTOCOL=https
SHARE_PORT=443
```

```bash
docker compose build alfresco share
docker compose up -d
```

> Build (si pas déjà fait) puis démarrage du nouveau stack sur les données de prod.

```bash
docker compose logs -f alfresco
```

> Attendre `Server startup` (~3-4 min), puis Ctrl+C.

```bash
curl -X POST http://localhost:8080/alfresco/service/msp-ged/reinstall-email-templates
```

> Réapplique les templates email MSP-GED dans la base de prod.

```bash
curl -s -o /dev/null -w "%{http_code}" http://localhost:8080/alfresco/api/-default-/public/alfresco/versions/1/probes/-ready-
```

> Doit retourner `200`.

### Purge des anciennes notifications

La base de prod contient les anciens enregistrements de notification créés en `cm:content` (visibles dans « Mes documents »). Lancer le script de purge `_purge_notifs.py` (présent dans le dossier de déploiement) ou supprimer manuellement les nœuds `notif-*` dans `Shared/Signature Notifications` et `Data Dictionary/Signature Notifications`.

### Vérifications finales

- [ ] `https://ged-msp.com/share` — login + dashboard (uniquement Mes tâches / Mes documents)
- [ ] Cloche de notifications — marquage lu + « Tout marquer lu » persistent après F5
- [ ] Workflow de signature : mail d'assignation « de la part de X », mail signé « X a signé »
- [ ] Pas de bouton « Aide » dans le menu utilisateur
- [ ] ACA accessible, logos MSP corrects
- [ ] Retirer la ligne du fichier `hosts` sur ta machine

---

## ROLLBACK — retour à l'ancienne version

Si un problème bloquant apparaît après la bascule :

```bash
cd /home/msp_ged-v25-git
docker compose down
```

> Arrête le nouveau stack (les données restent intactes dans `/home/admin1/alfresco/data`).

```bash
cd /home/admin1/alfresco
docker compose up -d
```

> Redémarre l'ancienne version — elle repart sur ses données. Les modifications écrites par la nouvelle version (modèle `sg:*`, workflow v9) sont additives et tolérées par l'ancienne.

> Les backups `/tmp/backup_*.sql` et `/tmp/backup_data_*.tgz` restent disponibles en dernier recours.

---

## Notes

- **Ne jamais copier `data/postgres-data` à chaud** (`cp` pendant que postgres tourne = base corrompue). Toujours `pg_dump` / restore. Sur le même serveur, le symlink évite complètement le problème.
- Les emails SMTP prod (`gedmsp@gmail.com`) doivent être actifs dans le stack de production. Sur le test : `-Dmail.host=localhost` recommandé pour éviter les vrais emails vers les utilisateurs (optionnel).
- Un seul Traefik peut écouter sur 80/443 par serveur — les deux stacks ne peuvent jamais tourner en même temps sur la même machine avec le compose de prod.
