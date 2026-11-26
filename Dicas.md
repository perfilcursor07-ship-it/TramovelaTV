https://github.com/perfilcursor07-ship-it/TramovelaTV
PC: c:\wamp64\www\Novelas
Servidor: /home/tramovelatv/htdocs/www.tramovelatv.online
Env: apps/api/.env

PC — puxar
git pull origin main
npm install
npm run migrate

PC — subir
git add .
git commit -m "feat: sua mensagem aqui"
git push origin main

Servidor
su - tramovelatv
cd ~/htdocs/www.tramovelatv.online
git pull origin main
npm install
npm run build
npm run migrate
pm2 restart tramovelatv
pm2 save
