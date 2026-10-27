#
# ~/.bash_profile
#

[[ -f ~/.bashrc ]] && . ~/.bashrc

# Iniciar i3 automaticamente al acceder por TTY1
if [[ -z "${DISPLAY:-}" && "$(tty)" == "/dev/tty1" ]]; then
    # X's startup messages go to a log instead of flashing on the console (Arch Wiki: xinit)
    mkdir -p ~/.local/share/xorg
    exec startx -- -keeptty > ~/.local/share/xorg/startx.log 2>&1
fi
