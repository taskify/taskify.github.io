#!/bin/bash

git add -u
git commit -m "$1"
git push origin master
autossh -i /home/melvin/s/1404.pem ubuntu@54.165.169.126 "cd /var/www/taskify.org/ ; git pull origin master"


