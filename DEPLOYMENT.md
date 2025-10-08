# Déploiement Docker sur VPS CentOS 7

Ce guide détaille le déploiement du bot ISSA Takaful sur un VPS CentOS 7 en utilisant Docker.

## Prérequis

### Sur votre machine locale
- Node.js 20+
- Git
- Accès SSH au VPS

### Sur le VPS (CentOS 7)
- Docker
- Docker Compose
- Nginx (optionnel pour reverse proxy)
- Accès root

## Installation des prérequis sur le VPS

### 1. Se connecter au VPS

```bash
ssh root@194.163.132.186
```

### 2. Installer Docker sur CentOS 7

```bash
# Mise à jour du système
yum update -y

# Installer les dépendances
yum install -y yum-utils device-mapper-persistent-data lvm2

# Ajouter le dépôt Docker
yum-config-manager --add-repo https://download.docker.com/linux/centos/docker-ce.repo

# Installer Docker
yum install -y docker-ce docker-ce-cli containerd.io

# Démarrer et activer Docker
systemctl start docker
systemctl enable docker

# Vérifier l'installation
docker --version
```

### 3. Installer Docker Compose

```bash
# Télécharger Docker Compose
curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose

# Rendre exécutable
chmod +x /usr/local/bin/docker-compose

# Créer un lien symbolique
ln -s /usr/local/bin/docker-compose /usr/bin/docker-compose

# Vérifier l'installation
docker-compose --version
```

### 4. Créer le répertoire de déploiement

```bash
mkdir -p /var/www/html/issa
cd /var/www/html/issa
```

## Configuration initiale

### 1. Créer le fichier .env sur le VPS

```bash
cd /var/www/html/issa
nano .env
```

Copier le contenu de `.env.example` et configurer les variables :

```env
# Server Configuration
NODE_ENV=production
PORT=3000

# WhatsApp Business API
WHATSAPP_API_URL=https://graph.facebook.com/v17.0
WHATSAPP_PHONE_NUMBER_ID=your_phone_number_id
WHATSAPP_ACCESS_TOKEN=your_access_token
WEBHOOK_VERIFY_TOKEN=your_verify_token

# AI Provider (openai or deepseek)
AI_PROVIDER=deepseek
OPENAI_API_KEY=your_openai_key
DEEPSEEK_API_KEY=your_deepseek_key

# Database
DB_PATH=/app/data/issa.db

# Logging
LOG_LEVEL=info
```

### 2. Installer Nginx (optionnel mais recommandé)

```bash
yum install -y nginx

# Démarrer et activer Nginx
systemctl start nginx
systemctl enable nginx
```

### 3. Configurer Nginx

```bash
# Copier la configuration
cp /var/www/html/issa/current/nginx.conf /etc/nginx/conf.d/issa.conf

# Éditer et remplacer your-domain.com par votre domaine
nano /etc/nginx/conf.d/issa.conf

# Tester la configuration
nginx -t

# Recharger Nginx
systemctl reload nginx
```

### 4. Configurer le pare-feu (si actif)

```bash
# Autoriser HTTP et HTTPS
firewall-cmd --permanent --add-service=http
firewall-cmd --permanent --add-service=https
firewall-cmd --reload
```

## Déploiement

### Méthode 1 : Script de déploiement automatique (Recommandé)

Sur votre machine locale :

```bash
# Rendre le script exécutable
chmod +x deploy.sh

# Lancer le déploiement
./deploy.sh
```

Le script va :
1. Compiler le projet localement
2. Créer une archive de déploiement
3. L'envoyer sur le VPS
4. Déployer et démarrer les conteneurs Docker

### Méthode 2 : Déploiement manuel

```bash
# Sur votre machine locale
npm run build
scp -r dist package*.json Dockerfile docker-compose.yml .dockerignore root@194.163.132.186:/var/www/html/issa/

# Sur le VPS
ssh root@194.163.132.186
cd /var/www/html/issa

# Créer les répertoires persistants
mkdir -p data logs

# Lier le fichier .env
ln -sf /var/www/html/issa/.env .env

# Construire et démarrer
docker-compose up -d --build

# Vérifier les logs
docker-compose logs -f
```

## Commandes de gestion

### Voir les logs

```bash
cd /var/www/html/issa/current
docker-compose logs -f
```

### Redémarrer l'application

```bash
cd /var/www/html/issa/current
docker-compose restart
```

### Arrêter l'application

```bash
cd /var/www/html/issa/current
docker-compose down
```

### Démarrer l'application

```bash
cd /var/www/html/issa/current
docker-compose up -d
```

### Reconstruire l'image

```bash
cd /var/www/html/issa/current
docker-compose up -d --build
```

### Voir l'état des conteneurs

```bash
docker-compose ps
docker ps
```

### Accéder au shell du conteneur

```bash
docker-compose exec issa-bot sh
```

### Nettoyer les anciennes images

```bash
docker system prune -a
```

## Initialisation de la base de données

Après le premier déploiement :

```bash
# Accéder au conteneur
docker-compose exec issa-bot sh

# Initialiser la base de données
npm run init-knowledge

# Quitter le conteneur
exit
```

## Sauvegarde et restauration

### Sauvegarder la base de données

```bash
cd /var/www/html/issa
tar -czf backup_$(date +%Y%m%d_%H%M%S).tar.gz data/
```

### Restaurer une sauvegarde

```bash
cd /var/www/html/issa
tar -xzf backup_YYYYMMDD_HHMMSS.tar.gz
docker-compose restart
```

## Surveillance

### Health check

```bash
curl http://localhost:3000/health
```

### Vérifier l'utilisation des ressources

```bash
docker stats
```

### Surveiller les logs en temps réel

```bash
cd /var/www/html/issa/current
docker-compose logs -f --tail=100
```

## SSL/TLS avec Let's Encrypt (Recommandé pour production)

```bash
# Installer Certbot
yum install -y certbot python2-certbot-nginx

# Obtenir un certificat
certbot --nginx -d your-domain.com -d www.your-domain.com

# Le certificat sera renouvelé automatiquement
```

Décommenter ensuite la section SSL dans `nginx.conf`.

## Dépannage

### Le conteneur ne démarre pas

```bash
docker-compose logs issa-bot
docker inspect issa-bot
```

### Problème de permissions

```bash
chown -R 1001:1001 /var/www/html/issa/data
chown -R 1001:1001 /var/www/html/issa/logs
```

### Réinitialiser complètement

```bash
cd /var/www/html/issa/current
docker-compose down -v
docker-compose up -d --build
```

### Vérifier la connectivité réseau

```bash
docker-compose exec issa-bot sh
ping google.com
curl https://api.openai.com
```

## Mise à jour

Pour mettre à jour l'application :

```bash
# Sur votre machine locale
./deploy.sh
```

Le script sauvegarde automatiquement l'ancienne version dans un dossier `backup_*`.

## Surveillance de production

### Configurer les logs rotatifs

```bash
nano /etc/logrotate.d/issa
```

Ajouter :

```
/var/www/html/issa/logs/*.log {
    daily
    rotate 7
    compress
    delaycompress
    notifempty
    create 0644 1001 1001
    sharedscripts
    postrotate
        docker-compose -f /var/www/html/issa/current/docker-compose.yml restart
    endscript
}
```

## Notes importantes

1. **CentOS 7** est assez ancien, mais Docker permet d'utiliser Node.js 20 sans problème
2. Le conteneur tourne avec un utilisateur non-root (UID 1001) pour la sécurité
3. Les données (DB et logs) sont persistées via des volumes Docker
4. Le health check vérifie automatiquement l'état de l'application
5. Les limites de ressources sont configurées pour éviter la surconsommation

## Support

En cas de problème :
- Vérifier les logs : `docker-compose logs -f`
- Vérifier l'état : `docker-compose ps`
- Vérifier les ressources : `docker stats`
- Redémarrer : `docker-compose restart`
