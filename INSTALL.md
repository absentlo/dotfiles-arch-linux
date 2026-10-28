# Reinstall guide

Commands to rebuild this setup on a fresh Arch install, in order.

## 1. Base Arch install
Boot the Arch ISO and run:

```
archinstall
```

Pick: **Minimal** profile, **GRUB** bootloader, **NetworkManager** for networking, and create your user with **sudo (wheel)**. Reboot and log in on the TTY.

No internet over Wi-Fi? Connect first:

```
nmcli device wifi connect "<network>" password "<password>"
```

## 2. Get the dotfiles and run the installer

```
sudo pacman -S --needed git
git clone https://github.com/absentlo/dotfiles-arch-linux.git ~/dotfiles
cd ~/dotfiles && ./install.sh
```

Answer `y` to the prompt. It takes a while (packages + AUR builds). Then:

```
reboot
```

Log in on **tty1** and i3 starts by itself.

## 3. Inside i3, run once

```
i3-wallpaper
wpctl settings --save bluetooth.autoswitch-to-headset-profile false
xfconf-query -c ristretto -p /window/bgcolor-override -n -t bool -s true
```

## 4. Browsers and mail
Open **LibreWolf** and **Thunderbird** once each, close them, then:

```
cd ~/dotfiles && ./install.sh configs
```

Restart them to load the theme.

- **Start page in LibreWolf:** `about:debugging` → This LibreWolf → Load Temporary Add-on → pick `~/.config/graphite-startpage/manifest.json`. Permanent install: see the `startpage/` row in README.
- **Brave theme:** `brave://extensions` → Developer mode → Load unpacked → `~/.config/BraveSoftware/graphite-theme`.

## Run only one part
Each step can be run alone and rerun safely:

| Command | Does |
| :--- | :--- |
| `./install.sh packages` | Official packages from `pkglist.txt` |
| `./install.sh aur` | AUR packages from `aurlist.txt` |
| `./install.sh configs` | Copy all configs to `~/.config`, `~/.local`, `~` |
| `./install.sh system` | `/etc` files and GRUB (sudo) |
| `./install.sh services` | Enable NetworkManager, bluetooth, earlyoom, ananicy, timers |
| `./install.sh post` | Gray Papirus folders, Mousepad theme, user folders |

## Different hardware?
`~/.xinitrc` sets this monitor (`DisplayPort-0`, 1600x900 @ 75 Hz). See your output name with `xrandr` and edit that line.

## Keeping it up to date
After changing anything on the running system:

```
dotfiles-sync
cd ~/dotfiles && git commit -am "describe the change" && git push
```

`dotfiles-sync` also refreshes the package lists, so new packages end up in the installer.
