# pactl move sink input

Simple CLI to move active Pulseaudio input to a different sink. Made to be used as a pop-up terminal in [i3wm](https://github.com/i3/i3).

## .i3/config example

```
...
# Node CLI app to quickly move a Pulseaudio input to a different sink. (e.g. from headphones to speakers)
# Change the default -title (add "-i3") so the window props don't affect editors, etc.
bindsym $mod+Ctrl+Shift+m exec terminal -title 'pactl-move-sink-input-i3' -e pactl-move-sink-input
for_window [title="pactl-move-sink-input-i3"] floating enable sticky enable border pixel 1
...
```