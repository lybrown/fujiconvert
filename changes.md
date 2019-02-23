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

0.2.5
-----

* [PCM4+4] Improved sound quality by restricting low nybble to values 1-15
* [PWM] Fixed pops by minimizing sample rate jitter
* [resampling] Improved resampling performance by precomputing coefficients
* [resampling] Moved resampling to WebWorker threads. Stereo channels are now
  resampled in parallel threads
* [resampling] Bumped up quality of resampling effort choices, e.g. Ultra now
  uses 2048 sample window instead of 1024
* [resampling] Added WAV file parser to bypass WebAudio's low-quality
  resampling
* [resampling] Skip resampling if WAV sample rate exactly equals Constrained
  Setting "freq"
* [The!Cart] Disable The!Cart when OPTION is pressed during power up
* [The!Cart] Leave IRQs and NMIs enabled in splash screen
  http://atariage.com/forums/topic/279232-fujiconvert-01/page-7#entry4081580
