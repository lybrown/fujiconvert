0.1
---

First release

0.2
---

* Fix IDE Player
* Fix 4MB limit
* Use hardware calibration for PCM4+4 by default
  * Altirra-3.10-test28 now matches hardware
* Fix Artist field
* Fix Duration localStorage

0.2.1
-----

* Loop at end of audio
* Support for XEGS cartridges
* Simple dither

0.2.2
-----

* Added sinc resampling (super slow)
* Added SIC! cart support
* Added Preview wave file (always 8-bit regardless of method)

0.2.3
-----

* Fixed PCM4+4 initialization after pause/resume
* Removed CSS-animated progress bars that slowed down the browser
* Fixed 7800Hz on Firefox

0.2.4
-----

* Fixed issues found by Microsoft Edge

0.3
---

* [PDM] Replaced all occurrences of "PCM4+4" with "PDM"
* [PDM] Improved sound quality by restricting fine levels to values 1-X
* [PDM] Changed "A" key to toggle between settings optimized for
  linear/non-linear mixing (black background/white background)
* [PDM] Improved sound quality at very low volumes by adding small DC offset
  so that waveforms are centered in the fine level range. This avoids pops
  associated with coarse level transitions.
* [PDM] Added option to read old .pdm files for reconversion
* [PWM] Fixed pops by minimizing sample rate jitter
* [resampling] Improved resampling performance by precomputing coefficients
* [resampling] Moved resampling to WebWorker threads. Stereo channels are now
  resampled in parallel threads
* [resampling] Resampling effort changed to resampling window. Old "Ultra"
  setting is equivalent to resampling window of 1024. New 2048 option added.
* [resampling] Added WAV file parser to avoid resampling done by WebAudio
* [resampling] Skip resampling altogether if WAV sample rate approximately
  equals (+/-1Hz) Constrained Setting "freq"
* [mixing] Added auto-gain option to set gain to largest possible value that
  results in no clipping
* [conversion] Improved audio-to-Atari-media conversion performance
* [The!Cart] Disable The!Cart when OPTION is pressed during power up
* [The!Cart] Leave IRQs and NMIs enabled in splash screen
  http://atariage.com/forums/topic/279232-fujiconvert-01/page-7#entry4081580
* [cart] Add option to produce either .car or .raw file

0.3.1
-----

* Added PDM Presets:
  * PDM16 - Original full dynamic range method
  * PDM8 - Hardware Bit 3 mitigation? Avoids flipping bit 3 of the fine channel
  * PDM14+bump - Sounds good with Altirra 3.90. Eliminates pops due to volume 0
    on fine channel.
  * PDM8+bump - Maybe a way to simulate PDM8 in Altirra 3.90. Eliminates pops.
* Added Bump setting. Fine channel is allowed to play levels X through X+Y
  where X is Bump and Y is Fine Levels.

0.3.2
-----

* Added Coarse Levels setting
* Changed presets to:
  * 16 16 0 - Full dynamic range
  * 8 8 0 - Hardware bit 3 mitigation
  * 16 14 1 - Good for Altirra
  * 8 8 1 - Simulation of 8 8 0 in Altirra

0.3.3
-----

* Replaced "8 8 1" preset with "16 8 0" preset.
