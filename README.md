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
Configurations are **copies**, not symlinks. Copy each folder back to its place:

| Repo folder | Goes to |
| :--- | :--- |
| `i3`, `polybar`, `picom`, `rofi`, `dunst`, `gtk-3.0`, `gtk-4.0`, `pipewire` | `~/.config/<same name>/` |
| `bin/` | `~/.local/bin/` |
| `xfce4-terminal/xfce4-terminal.xml` | `~/.config/xfce4/xfconf/xfce-perchannel-xml/` |
| `xfce4-terminal/graphite.theme` | `~/.local/share/xfce4/terminal/colorschemes/` |
| `home/`, `.bashrc` | `~/` |
| `librewolf/user.js` | your LibreWolf profile folder |
| `system/99-rice.conf` | `/etc/sysctl.d/` (sudo) |
| `system/earlyoom` | `/etc/default/earlyoom` (sudo, then `systemctl enable --now earlyoom`) |
| `system/zram-generator.conf` | `/etc/systemd/` (sudo) |

## Lock screen image
`Win + x` and auto-lock use a darkened copy of the wallpaper. Recreate it after a fresh install (or a new wallpaper / screen size):

```
mkdir -p ~/.local/share/i3lock
ffmpeg -i /usr/share/backgrounds/archlinux/gritty.png -vf "scale=1600:900:force_original_aspect_ratio=increase,crop=1600:900,boxblur=12:2,eq=brightness=-0.25" -frames:v 1 ~/.local/share/i3lock/lock.png
```
