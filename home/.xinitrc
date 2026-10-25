#!/bin/sh

xrandr --output DisplayPort-0 --mode 1600x900 --rate 74.89

# Identificar nuestra sesion grafica
export XDG_CURRENT_DESKTOP=i3
export XDG_SESSION_TYPE=x11
# Qt apps (polkit prompt etc.) follow the GTK3 dark theme
export QT_QPA_PLATFORMTHEME=gtk3

# Comunicar las variables graficas a D-Bus y systemd
dbus-update-activation-environment --systemd \
DISPLAY XAUTHORITY XDG_CURRENT_DESKTOP XDG_SESSION_TYPE QT_QPA_PLATFORMTHEME

# no 25 MB in-memory debug log; "i3-msg shmlog on" when debugging
exec i3 --shmlog-size=0
