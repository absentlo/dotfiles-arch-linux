#
# ~/.bashrc
#

# If not running interactively, don't do anything
[[ $- != *i* ]] && return

export PATH="$HOME/.local/bin:$PATH"

alias ls='ls --color=auto -F'
alias ll='ls -la'
alias grep='grep --color=auto'

# Graphite Minimal Prompt
PS1='\[\033[1;30m\][\[\033[1;37m\]\u@\h \W\[\033[1;30m\]]\$ \[\033[0m\]'

# Arch Linux & Dotfiles Aliases
alias update='sudo pacman -Syu'
alias cleanup='o=$(pacman -Qtdq) && sudo pacman -Rns $o || echo "No orphan packages"'
alias dotfiles='cd ~/dotfiles'

# Show minimalist system information on terminal launch
fastfetch
