# Simple Minimalist Arch Linux

Basic settings & my first repoooo!!111!

A resource-efficient, dark graphite-themed i3wm setup built for Arch Linux. Optimized for minimal CPU and RAM usage.

![Graphite rice: start page, fastfetch, Thunar and btop](screenshots/workspace.png)

**Palette:** `#111111` background · `#1C1C1C` surface · `#3A3A3A` border · `#777777` / `#B8B8B8` accents · `#D8D8D8` text · `#C46A6A` urgent. Font: JetBrainsMono Nerd Font everywhere. Built for an i5-4570 / 8 GB / Radeon HD 8490.

## Gallery
![i3 tabbed layout: LibreWolf start page and Thunar as tabs, fastfetch and btop](screenshots/tabbed.png)

## System Specifications
- **OS**: Arch Linux
- **WM**: i3wm + autotiling (`sudo pacman -S autotiling`)
- **Bar**: Polybar
- **Compositor**: Picom
- **Launcher / Power Menu**: Rofi
- **Notifications**: Dunst
- **GTK Theme**: Materia-dark-compact / Adwaita-dark
- **Icon Theme**: Papirus-Dark with grey folders: run `papirus-graphite` once (and after Papirus updates), it builds `Papirus-Dark-Graphite` from symlinks, no root
- **Cursor**: Capitaine (`sudo pacman -S capitaine-cursors`)
- **Lock Screen**: i3lock-color ring and clock (`bin/i3-lock`), idle warning at 9 min, lock at 10
- **Terminal**: xfce4-terminal (Graphite scheme), fastfetch, btop (Graphite theme)
- **Browsers**: LibreWolf (userChrome.css), Brave Origin (theme), shared Graphite start page
- **Mail / PDF / Video / Editor**: Thunderbird, Zathura, mpv, Mousepad, all on the palette
- **Extras**: clipmenu text history (images copy and paste directly; image history cost ~117 MB each), rofi calc + emoji, gammastep night light, ananicy-cpp

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
| `Print` / `Shift + Print` | Full / area screenshot: saved, copied, preview |
| `$mod + Shift + v` | Clipboard history (text) |
| `$mod + .` | Emoji picker |
| `$mod + =` | Calculator (Enter copies) |
| `$mod + ,` / `$mod + Shift + ,` | Last notification / dismiss all |
| `$mod + Shift + a` | Accessibility: night light, do not disturb, keep awake |
| `$mod + `` ` `` | Drop-down terminal |
| Click CPU / RAM on the bar | btop |
| `$mod + Shift + r` | Restart i3 |

## Fresh install
Step-by-step commands: [INSTALL.md](INSTALL.md).

After a base Arch install (`archinstall` or by hand, with your user in `wheel`), log in on the TTY and run:

```
sudo pacman -S --needed git
git clone https://github.com/absentlo/dotfiles-arch-linux.git ~/dotfiles
cd ~/dotfiles && ./install.sh
```

It installs every package (`pkglist.txt`, `aurlist.txt`), copies all configs and system files to the places in the table below, enables the services and prints the few manual steps left (LibreWolf/Thunderbird need one first start, browser extensions need a click). Run single steps with `./install.sh configs` (also: `packages aur system services post`); rerunning is safe. `.xinitrc` sets 1600x900 @ 75 Hz on whichever port is connected; edit it for another monitor.

## Synchronization & Backup
Configurations are **copies**, not symlinks. After changing anything, run `dotfiles-sync` to copy the live files in and see what changed, then commit and push. Copy each folder back to its place:

| Repo folder | Goes to |
| :--- | :--- |
| `i3`, `polybar`, `picom`, `rofi`, `dunst`, `gtk-3.0`, `gtk-4.0`, `pipewire`, `fastfetch`, `btop`, `zathura`, `mpv`, `gammastep`, `fontconfig`, `dircolors`, `nano` | `~/.config/<same name>/` |
| `bin/` | `~/.local/bin/` |
| `backgrounds/` | `~/.local/share/backgrounds/` |
| `thunar/uca.xml` | `~/.config/Thunar/` (adds "Copy image to clipboard") |
| `gtksourceview-4/` | `~/.local/share/gtksourceview-4/styles/`, then `gsettings set org.xfce.mousepad.preferences.view color-scheme graphite` |
| `xfce4-terminal/xfce4-terminal.xml` | `~/.config/xfce4/xfconf/xfce-perchannel-xml/` |
| `xfce4-terminal/graphite.theme` | `~/.local/share/xfce4/terminal/colorschemes/` |
| `home/`, `.bashrc` | `~/` |
| `librewolf/user.js`, `librewolf/chrome/` | your LibreWolf profile folder (`~/.config/librewolf/librewolf/*.default-release/`), restart LibreWolf |
| `thunderbird/user.js` | your Thunderbird profile folder |
| `brave/brave-origin-flags.conf` | `~/.config/` (restart Brave) |
| `brave/graphite-theme/` | `~/.config/BraveSoftware/graphite-theme/`, then `brave://extensions` → Developer mode → Load unpacked |
| `startpage/` | `~/.config/graphite-startpage/`. Brave: `brave://extensions` → Load unpacked. LibreWolf: zip it to an `.xpi` and install from file (needs `xpinstall.signatures.required` = false in `about:config`), or `about:debugging` → Load Temporary Add-on |
| `system/99-rice.conf` | `/etc/sysctl.d/` (sudo) |
| `system/earlyoom` | `/etc/default/earlyoom` (sudo, then `systemctl enable --now earlyoom`) |
| `system/zram-generator.conf` | `/etc/systemd/` (sudo) |
| `system/grub` | `/etc/default/grub` (sudo, then `grub-mkconfig -o /boot/grub/grub.cfg`) |
| `system/issue` | `/etc/issue` (sudo): Graphite TTY login text |
| `system/10-intel-primary.conf` | `/etc/X11/xorg.conf.d/` (sudo): Intel iGPU as main GPU (monitor on the motherboard port) |
| `system/20-radeon-tearfree.conf` | `/etc/X11/xorg.conf.d/` (sudo): TearFree on the `radeon` driver |
| `system/99-rice-no-mei.conf` | `/etc/modprobe.d/` (sudo, then `mkinitcpio -P`): blacklists `mei`/`mei_me`, which fail to init on this machine; skip it on other hardware |
| (no fallback initramfs) | `install.sh system` sets `PRESETS=('default')` in `/etc/mkinitcpio.d/*.preset` |
| (pacman colors) | `install.sh system` turns on `Color`, `ILoveCandy` and `VerbosePkgLists` in `/etc/pacman.conf` |
| `system/sudoers-pwfeedback` | `/etc/sudoers.d/pwfeedback` (sudo, mode 0440): `*` while typing the sudo password |
| `system/vconsole.conf` | `/etc/vconsole.conf` (sudo, needs `terminus-font`, then `mkinitcpio -P`): Terminus TTY font |
| `krita/Graphite.colors` | `~/.local/share/krita/color-schemes/`, then Krita › Settings › Themes › Graphite |

## Wallpaper and lock screen image
The lock ring and clock need `i3lock-color` from the AUR (`git clone https://aur.archlinux.org/i3lock-color.git && cd i3lock-color && makepkg -si`, answer **y** to replace `i3lock`). Without it, `bin/i3-lock` falls back to plain i3lock. Cursor theme: `sudo pacman -S capitaine-cursors`.

`i3-wallpaper <image>` sets any image as the wallpaper and rebuilds the darkened lock screen copy (`Win + x`, auto-lock) at the current screen size. With no argument it uses the Graphite default, `backgrounds/graphite.png` (copy it to `~/.local/share/backgrounds/`). Run it once after a fresh install.

`i3-wallpaper --graphite photo.jpg` first converts any image to the rice grays (saved as `photo-graphite.png` in `~/.local/share/backgrounds/`).

Colored man pages need `sudo pacman -S man-db man-pages less`; `.bashrc` already sets the colors.

## Add-ons
`sudo pacman -S --needed rofi-calc rofi-emoji gammastep ananicy-cpp clipmenu`, then from the AUR (`git clone https://aur.archlinux.org/<name>.git && cd <name> && makepkg -si`): `cachyos-ananicy-rules-git`. Enable the priority daemon: `sudo systemctl enable --now ananicy-cpp`. Ristretto background: `xfconf-query -c ristretto -p /window/bgcolor-override -n -t bool -s true`.

## Bluetooth earbuds stay in music quality
Games/apps that open the mic would switch the earbuds to mono 16 kHz "headset" mode (sounds distorted). Turned off once with:

```
wpctl settings --save bluetooth.autoswitch-to-headset-profile false
```
