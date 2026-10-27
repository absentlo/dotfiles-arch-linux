# Simple Minimalist Arch Linux

Basic settings & my first repoooo!!111!

A resource-efficient, dark graphite-themed i3wm setup built for Arch Linux. Optimized for minimal CPU and RAM usage.

## System Specifications
- **OS**: Arch Linux
- **WM**: i3wm + autotiling (`sudo pacman -S autotiling`)
- **Bar**: Polybar
- **Compositor**: Picom
- **Launcher / Power Menu**: Rofi
- **Notifications**: Dunst
- **GTK Theme**: Materia-dark-compact / Adwaita-dark
- **Icon Theme**: Papirus-Dark

## Keybindings Cheat Sheet

| Shortcut | Action |
| :--- | :--- |
| `$mod + Return` | Open Terminal |
| `$mod + d` | App Launcher (Rofi) |
| `$mod + Shift + p` | Power Menu |
| `$mod + Shift + f` | File Manager (Thunar) |
| `$mod + Shift + b` | Web Browser (Brave) |
| `$mod + x` | Lock Screen |
| `Alt + Tab` | Visual Window Switcher |
| `$mod + Tab` | Previous Workspace |
| `$mod + n` | Wi-Fi Menu |
| `$mod + b` | Bluetooth Menu |
| `$mod + m` | Media Player |
| `$mod + c` | Calendar |
| `$mod + Shift + h` | Shortcuts Help |
| `$mod + Shift + s` | Area Screenshot |
| `$mod + Shift + r` | Restart i3 |

## Synchronization & Backup
Configurations are **copies**, not symlinks. After changing anything, run `dotfiles-sync` to copy the live files in and see what changed, then commit and push. Copy each folder back to its place:

| Repo folder | Goes to |
| :--- | :--- |
| `i3`, `polybar`, `picom`, `rofi`, `dunst`, `gtk-3.0`, `gtk-4.0`, `pipewire`, `fastfetch`, `btop`, `zathura`, `mpv` | `~/.config/<same name>/` |
| `bin/` | `~/.local/bin/` |
| `xfce4-terminal/xfce4-terminal.xml` | `~/.config/xfce4/xfconf/xfce-perchannel-xml/` |
| `xfce4-terminal/graphite.theme` | `~/.local/share/xfce4/terminal/colorschemes/` |
| `home/`, `.bashrc` | `~/` |
| `librewolf/user.js`, `librewolf/chrome/` | your LibreWolf profile folder (`~/.config/librewolf/librewolf/*.default-release/`), restart LibreWolf |
| `thunderbird/user.js` | your Thunderbird profile folder |
| `brave/brave-origin-flags.conf` | `~/.config/` (restart Brave) |
| `brave/graphite-theme/` | `~/.config/BraveSoftware/graphite-theme/`, then `brave://extensions` → Developer mode → Load unpacked |
| `system/99-rice.conf` | `/etc/sysctl.d/` (sudo) |
| `system/earlyoom` | `/etc/default/earlyoom` (sudo, then `systemctl enable --now earlyoom`) |
| `system/zram-generator.conf` | `/etc/systemd/` (sudo) |
| `system/grub` | `/etc/default/grub` (sudo, then `grub-mkconfig -o /boot/grub/grub.cfg`) |

## Lock screen image
The lock ring and clock need `i3lock-color` from the AUR (`git clone https://aur.archlinux.org/i3lock-color.git && cd i3lock-color && makepkg -si`, answer **y** to replace `i3lock`). Without it, `bin/i3-lock` falls back to plain i3lock. Cursor theme: `sudo pacman -S capitaine-cursors`.

`Win + x` and auto-lock use a darkened copy of the wallpaper. Recreate it after a fresh install (or a new wallpaper / screen size):

```
mkdir -p ~/.local/share/i3lock
ffmpeg -i /usr/share/backgrounds/archlinux/gritty.png -vf "scale=1600:900:force_original_aspect_ratio=increase,crop=1600:900,boxblur=12:2,eq=brightness=-0.25" -frames:v 1 ~/.local/share/i3lock/lock.png
```

## Bluetooth earbuds stay in music quality
Games/apps that open the mic would switch the earbuds to mono 16 kHz "headset" mode (sounds distorted). Turned off once with:

```
wpctl settings --save bluetooth.autoswitch-to-headset-profile false
```
