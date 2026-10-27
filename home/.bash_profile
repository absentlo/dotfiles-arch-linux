#
# ~/.bash_profile
#

[[ -f ~/.bashrc ]] && . ~/.bashrc

# Graphite palette on the Linux console (same 16 colors as the terminal theme)
if [[ "$TERM" == linux ]]; then
    i=0
    for c in 111111 C46A6A 8FA876 C9B27C 7A98B8 A58AB5 7FAFAF D8D8D8 \
             5A5A5A D98A8A A9C28F E0CB94 9BB5D1 BFA6CC 9CC8C8 F2F2F2; do
        printf '\e]P%X%s' "$i" "$c"; ((i++))
    done
    clear
fi

# Iniciar i3 automaticamente al acceder por TTY1
if [[ -z "${DISPLAY:-}" && "$(tty)" == "/dev/tty1" ]]; then
    exec startx
fi
