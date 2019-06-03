

ramdetect
  RAM

lo
hi
  PDM
  PCM

splash

play

init_sound

playloop

nextbank
  RAM
  Cart

nextsector
  IDE

nextsegment
  Emulator Stream


Detect end of audio
-------------------
    lda bank ; 3
    eor #<end ; 2
    sta diff ; 3

    lda bank+1 ; 3
    eor #>end ; 2
    sta diff+1 ; 3

    lda diff ; 3
    ora diff ; 3
    jeq done ; 3


play
====

RAM
Cart
    load bank,x

IDE
    load idebyte

Emulator Stream
    load stream,x



PWM
Covox
    Mono
        load sample
        store sample
        sync
    Stereo
        load sample
        store sample
        load sample
        store sample
        sync

PDM
    Mono
        load sample
        load hi
        store hi
        load lo
        store lo
        sync
    Stereo
        load sample
        load hi
        store hi
        load lo
        store lo
        load sample
        load hi
        store hi
        load lo
        store lo
        sync

PCM
    Mono
        load sample
        load hi
        store hi
        sync
        load lo
        store lo
        sync
    Stereo
        load sample
        load hi
        store hi
        sync
        load lo
        store lo
        sync



XEGS
    $8000-9FFF - bank determined by writing bank # to $D5XX
    $A000-BFFF - last bank
    starts in bank ??

    type 23 - 256K
    type 24 - 512K
    type 25 - 1M

MegaCart
    $8000-BFFF - bank determined by writing bank # to $D5XX
    Starts in bank 0

    type 26 - 16K
    type 27 - 32K
    type 28 - 64K
    type 29 - 128K
    type 30 - 256K
    type 31 - 512K
    type 32 - 1M
    type 64 - 2MB
    type 63 - 4MB - no bank 255


AtariMax
    $A000-BFFF - bank determined by writing any value to $D500+bank
    Starts in last bank

    type 41 - 128K
    type 42 - 1M

MegaMax
    $8000-BFFF - bank determined by accessing $D500+bank
    Starts in bank 0

    type 61 - 2M

SIC!
    $8000-BFFF - bank determined by writing $20+bank to $D500
    Starts in bank 0?

    type 54 - 128K
    type 55 - 256K
    type 56 - 512K

The!Cart
    $A000-BFFF - bank determined by writing bank word to $D5A0/1
    Starts in bank 0

    type 62 - 128MB
    type 65 - 32MB
    type 66 - 64MB
    
