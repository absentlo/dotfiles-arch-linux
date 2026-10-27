#
# ~/.bashrc
#

# If not running interactively, don't do anything
[[ $- != *i* ]] && return

export PATH="$HOME/.local/bin:$PATH"

# Graphite colors for ls, grep and man pages (palette in ~/.config/dircolors/graphite)
[[ -f ~/.config/dircolors/graphite ]] && eval "$(dircolors -b ~/.config/dircolors/graphite)"
export GREP_COLORS='mt=1;38;2;201;178;124:fn=38;2;154;154;154:ln=38;2;90;90;90:bn=38;2;90;90;90:se=38;2;58;58;58'
# man pages (needs man-db + less): bold = yellow headings, underline = blue
export MANPAGER='less -R --use-color -Dd+y -Du+b'
export MANROFFOPT='-P -c'
alias ls='ls --color=auto -F'
alias ll='ls -la'
alias grep='grep --color=auto'

# Graphite Minimal Prompt
# Last command's exit code in red when it failed (set via PROMPT_COMMAND, no subshell)
__graphite_prompt() {
    local s=$? x=''
    (( s )) && x="\[\033[0;31m\]$s "
    PS1="$x\[\033[1;30m\][\[\033[1;37m\]\u@\h \W\[\033[1;30m\]]\$ \[\033[0m\]"
}
PROMPT_COMMAND=__graphite_prompt

# Arch Linux & Dotfiles Aliases
alias update='sudo pacman -Syu'
alias cleanup='o=$(pacman -Qtdq) && sudo pacman -Rns $o || echo "No orphan packages"'
alias dotfiles='cd ~/dotfiles'

# Show minimalist system information in terminal windows (not on the TTY before startx)
[[ -n $DISPLAY ]] && fastfetch
