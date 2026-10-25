#!/usr/bin/env bash
pkill -x polybar
while pgrep -x polybar >/dev/null; do sleep 0.1; done
polybar main >/dev/null 2>&1 &
