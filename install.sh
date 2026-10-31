#!/usr/bin/env bash
# install.sh - set up the Graphite rice on a fresh Arch install (run as your user, not root).
#   ./install.sh                 every step, in order
#   ./install.sh configs system  only the named steps
# Steps: packages aur configs system services post. Safe to rerun.
# The reverse of bin/dotfiles-sync: keep the two file lists in step.
set -euo pipefail
D="$(cd "$(dirname "$0")" && pwd)"
C="$HOME/.config"
L="$HOME/.local/share"

[[ $EUID -ne 0 ]] || { echo "Run as your user, not root (sudo is used where needed)."; exit 1; }
[[ -f /etc/arch-release ]] || { echo "This is for Arch Linux."; exit 1; }

say() { printf '\n\033[1m==> %s\033[0m\n' "$*"; }
todo=()   # manual steps, printed at the end

packages() {
    say "Official packages (pkglist.txt)"
    # multilib for Steam's 32-bit packages; without it they'd be skipped below as "not in the repos"
    sudo sed -i '/^#\[multilib\]$/,+1 s/^#//' /etc/pacman.conf
    # skip names that left the repos, otherwise one missing package aborts the whole install
    mapfile -t avail < <(sudo pacman -Sy >/dev/null && comm -12 <(sort -u "$D/pkglist.txt") <(pacman -Slq | sort -u))
    missing=$(comm -23 <(sort -u "$D/pkglist.txt") <(printf '%s\n' "${avail[@]}"))
    [[ -n $missing ]] && echo "Not in the repos anymore, skipped: $(echo $missing)"
    sudo pacman -Syu --needed --noconfirm "${avail[@]}"
}

aur() {
    say "AUR packages (aurlist.txt)"
    sudo pacman -S --needed --noconfirm base-devel git
    local tmp; tmp=$(mktemp -d)
    while read -r pkg; do
        [[ -z $pkg ]] && continue
        pacman -Qq "$pkg" &>/dev/null && { echo "$pkg already installed"; continue; }
        # i3lock-color replaces i3lock; pacman's conflict prompt would answer "no" under --noconfirm
        [[ $pkg == i3lock-color ]] && pacman -Qq i3lock &>/dev/null && sudo pacman -Rdd --noconfirm i3lock
        git clone --depth 1 "https://aur.archlinux.org/$pkg.git" "$tmp/$pkg"
        (cd "$tmp/$pkg" && makepkg -si --needed --noconfirm) || echo "!! $pkg failed, install it by hand later"
    done < "$D/aurlist.txt"
    rm -rf "$tmp"
}

configs() {
    say "Config files"
    for dir in i3 polybar picom rofi dunst gtk-4.0 fastfetch btop zathura mpv gammastep fontconfig dircolors pipewire nano; do
        mkdir -p "$C/$dir"; cp -r "$D/$dir/." "$C/$dir/"
    done
    mkdir -p "$C/gtk-3.0" && cp "$D/gtk-3.0/settings.ini" "$D/gtk-3.0/gtk.css" "$C/gtk-3.0/"
    mkdir -p "$HOME/.local/bin" && cp "$D"/bin/* "$HOME/.local/bin/" && chmod +x "$HOME"/.local/bin/*
    mkdir -p "$C/xfce4/xfconf/xfce-perchannel-xml" "$L/xfce4/terminal/colorschemes"
    cp "$D/xfce4-terminal/xfce4-terminal.xml" "$C/xfce4/xfconf/xfce-perchannel-xml/"
    cp "$D/xfce4-terminal/graphite.theme" "$L/xfce4/terminal/colorschemes/"
    mkdir -p "$L/backgrounds" && cp "$D"/backgrounds/* "$L/backgrounds/"
    mkdir -p "$C/Thunar" && cp "$D/thunar/uca.xml" "$C/Thunar/"
    mkdir -p "$L/krita/color-schemes" && cp "$D"/krita/*.colors "$L/krita/color-schemes/"
    mkdir -p "$L/gtksourceview-4/styles" && cp "$D"/gtksourceview-4/*.xml "$L/gtksourceview-4/styles/"
    cp "$D/.bashrc" "$HOME/" && cp -r "$D/home/." "$HOME/"
    mkdir -p "$C/graphite-startpage" && cp "$D"/startpage/* "$C/graphite-startpage/"
    mkdir -p "$C/BraveSoftware/graphite-theme"
    cp "$D/brave/brave-origin-flags.conf" "$C/" && cp "$D/brave/graphite-theme/manifest.json" "$C/BraveSoftware/graphite-theme/"

    # browser/mail profiles only exist after the app's first start
    local p
    if p=$(ls -d "$C"/librewolf/librewolf/*.default-release 2>/dev/null | head -1) && [[ -n $p ]]; then
        cp "$D/librewolf/user.js" "$p/" && mkdir -p "$p/chrome" && cp "$D"/librewolf/chrome/*.css "$p/chrome/"
    else
        todo+=("Open LibreWolf once, close it, then run: ./install.sh configs")
    fi
    if p=$(ls -d "$C"/thunderbird/*.default-release 2>/dev/null | head -1) && [[ -n $p ]]; then
        cp "$D/thunderbird/user.js" "$p/" && mkdir -p "$p/chrome" && cp "$D"/thunderbird/chrome/*.css "$p/chrome/"
    else
        todo+=("Open Thunderbird once, close it, then run: ./install.sh configs")
    fi
}

system() {
    say "System files (sudo)"
    sudo install -Dm644 "$D/system/99-rice.conf" /etc/sysctl.d/99-rice.conf
    sudo install -Dm644 "$D/system/earlyoom" /etc/default/earlyoom
    sudo install -Dm644 "$D/system/zram-generator.conf" /etc/systemd/zram-generator.conf
    sudo install -Dm644 "$D/system/issue" /etc/issue
    # pacman: colors, Pac-Man progress bar, table view (edits in place, rerun-safe)
    sudo sed -i -e 's/^#Color$/Color\nILoveCandy/' -e 's/^#VerbosePkgLists$/VerbosePkgLists/' /etc/pacman.conf
    sudo install -Dm644 "$D/system/10-intel-primary.conf" /etc/X11/xorg.conf.d/10-intel-primary.conf
    # sudo shows * while typing the password; validated first, a broken sudoers file would lock out sudo
    sudo visudo -cf "$D/system/sudoers-pwfeedback" && sudo install -m 0440 "$D/system/sudoers-pwfeedback" /etc/sudoers.d/pwfeedback
    # Terminus on the TTY; the initramfs carries the console font (sd-vconsole hook), so rebuild it
    sudo install -Dm644 "$D/system/vconsole.conf" /etc/vconsole.conf && sudo mkinitcpio -P
    if [[ -d /boot/grub ]]; then   # no UUIDs in it, so it is safe on a new disk layout
        sudo install -Dm644 "$D/system/grub" /etc/default/grub
        sudo grub-mkconfig -o /boot/grub/grub.cfg
    else
        echo "No /boot/grub (another bootloader?), skipped system/grub"
    fi
}

services() {
    say "Services"
    sudo systemctl enable NetworkManager bluetooth earlyoom ananicy-cpp fstrim.timer paccache.timer cups.socket
    getent group gamemode >/dev/null && sudo usermod -aG gamemode "$USER"
}

post() {
    say "Finishing touches"
    xdg-user-dirs-update
    "$HOME/.local/bin/papirus-graphite" || echo "!! papirus-graphite failed (is papirus-icon-theme installed?)"
    gsettings set org.xfce.mousepad.preferences.view color-scheme graphite 2>/dev/null || true
    # same look for apps that read gsettings instead of gtk settings.ini (Flatpak, Electron, libadwaita)
    local g=org.gnome.desktop.interface
    gsettings set $g color-scheme prefer-dark && gsettings set $g accent-color slate &&
    gsettings set $g icon-theme Papirus-Dark-Graphite && gsettings set $g cursor-theme capitaine-cursors &&
    gsettings set $g font-name 'JetBrainsMono Nerd Font 8' && gsettings set $g monospace-font-name 'JetBrainsMono Nerd Font Mono 9' ||
        todo+=("gsettings failed (no session bus?): rerun ./install.sh post after logging into i3")
    todo+=("After logging into i3: i3-wallpaper   (sets the wallpaper and builds the lock screen image)")
    todo+=("After logging into i3: wpctl settings --save bluetooth.autoswitch-to-headset-profile false")
    todo+=("After logging into i3: xfconf-query -c ristretto -p /window/bgcolor-override -n -t bool -s true")
    todo+=("Start page / Brave theme: load from ~/.config/graphite-startpage and ~/.config/BraveSoftware/graphite-theme (see README, Add-ons)")
}

steps=("$@"); [[ ${#steps[@]} -eq 0 ]] && steps=(packages aur configs system services post)
for s in "${steps[@]}"; do
    [[ $s =~ ^(packages|aur|configs|system|services|post)$ ]] || { echo "Unknown step: $s"; exit 1; }
done
if [[ $# -eq 0 ]]; then
    echo "This installs packages and OVERWRITES your configs in ~/.config, ~/.local and /etc with the repo's."
    read -rp "Continue? [y/N] " ok; [[ $ok == [yY] ]] || exit 0
fi
for s in "${steps[@]}"; do "$s"; done

say "Done"
for t in "${todo[@]}"; do echo " - $t"; done
echo " - Reboot, log in on tty1: i3 starts by itself."
