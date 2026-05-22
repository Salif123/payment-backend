#!/bin/bash
# EC2 Setup Script for Payment Collection App
set -e

echo "=========================================="
echo " Starting EC2 System Update & Install"
echo "=========================================="

echo "=== System Update ==="
sudo apt-get update && sudo apt-get upgrade -y

echo "=== Installing Node.js 20 ==="
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

echo "=== Installing PM2 globally ==="
sudo npm install pm2 -g

echo "=== Installing Nginx ==="
sudo apt-get install -y nginx

echo "=== Installing MySQL Server ==="
sudo apt-get install -y mysql-server

echo "=== Creating Nginx Config ==="
cat <<'EOF' | sudo tee /etc/nginx/sites-available/default
server {
    listen 80;
    server_name _;

    # Frontend Static Files
    location / {
        root /var/www/html;
        index index.html;
        try_files $uri $uri/ /index.html;
    }

    # Backend Express API Proxy
    location /api/ {
        proxy_pass http://127.0.0.1:3000/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
EOF

echo "=== Restarting Nginx ==="
sudo nginx -t
sudo systemctl restart nginx

echo "=== Configuring MySQL ==="
DB_PASS="rootpassword"
sudo mysql -e "ALTER USER 'root'@'localhost' IDENTIFIED WITH mysql_native_password BY '$DB_PASS';"
sudo mysql -u root -p"$DB_PASS" -e "FLUSH PRIVILEGES;"

echo "=== Creating /var/www directories and setting permissions ==="
sudo mkdir -p /var/www/payment-backend
sudo mkdir -p /var/www/html
sudo chown -R $USER:$USER /var/www/payment-backend
sudo chown -R $USER:$USER /var/www/html

echo "=== Creating backend default .env file ==="
cat <<EOF > /var/www/payment-backend/.env
PORT=3000
DB_HOST=127.0.0.1
DB_PORT=3306
DB_USER=root
DB_PASSWORD=$DB_PASS
DB_NAME=payment_collection
EOF

echo "=========================================="
echo " Setup complete!"
echo " MySQL password for root is set to: $DB_PASS"
echo " Nginx has been configured and restarted."
echo " Backend env has been written to /var/www/payment-backend/.env"
echo "=========================================="
